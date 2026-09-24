import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type EntityType = 'event' | 'participant' | 'payment' | 'expense' | 'directory';
export type SyncAction = 'create' | 'update' | 'delete' | 'settle' | 'import' | 'reload' | 'settle_toggle' | 'attendance_toggle';

export interface RealtimeChangePayload {
  eventId?: string;
  entityType: EntityType;
  action: SyncAction;
  timestamp?: number;
  originClientId?: string;
  participantId?: string;
  expenseId?: string;
  subFamilyName?: string;
  data?: any;
}

export interface SyncEngineStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  isCloudReady: boolean;
  channelStatus: 'SUBSCRIBED' | 'CONNECTING' | 'CLOSED' | 'ERROR' | 'OFFLINE';
}

const CLIENT_ID = `client_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

class RealtimeSyncEngine {
  private isConnected = true;
  private isSyncing = false;
  private channelStatus: SyncEngineStatus['channelStatus'] = 'CONNECTING';
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;

  // Suscripciones de red y ciclo de vida
  private netInfoSubscription: NetInfoSubscription | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  // Canal persistente de Supabase Realtime
  private realtimeChannel: RealtimeChannel | null = null;
  private reconnectTimer: any = null;

  // Canal de difusión multi-pestaña Web (Laptop)
  private webBroadcastChannel: any = null;

  // Bus de oyentes internos (In-Memory Pub/Sub)
  private eventListeners: Map<string, Set<() => void>> = new Map();
  private eventsListListeners: Set<() => void> = new Set();
  private directoryListeners: Set<() => void> = new Set();
  private statusListeners: Set<(status: SyncEngineStatus) => void> = new Set();

  constructor() {
    this.initWebBroadcastChannel();
    this.initAppStateListener();
    this.initRealtimeChannel();
  }

  /**
   * Inicializa BroadcastChannel en navegadores web (Laptop multi-tab).
   */
  private initWebBroadcastChannel(): void {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).BroadcastChannel !== 'undefined') {
        this.webBroadcastChannel = new (window as any).BroadcastChannel('chapapp_local_realtime');
        this.webBroadcastChannel.onmessage = (event: MessageEvent) => {
          if (event && event.data) {
            this.handleIncomingPayload(event.data, true);
          }
        };
      }
    } catch (err) {
      console.warn('[SyncEngine] Web BroadcastChannel no disponible:', err);
    }
  }

  /**
   * Monitorea el ciclo de vida de la app (React Native en iPad / móvil).
   * Al regresar a primer plano ('active'), verifica la conexión y refresca los datos.
   */
  private initAppStateListener(): void {
    try {
      if (AppState && typeof AppState.addEventListener === 'function') {
        const sub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            this.handleAppForeground();
          }
        });
        this.appStateSubscription = sub;
      }
    } catch {}

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', () => {
        this.handleAppForeground();
      });
    }
  }

  private handleAppForeground(): void {
    if (this.channelStatus !== 'SUBSCRIBED' && isSupabaseConfigured) {
      this.initRealtimeChannel();
    }
    this.refreshAllActiveSubscribers();
  }

  /**
   * Configura el canal global persistente de Supabase Realtime.
   */
  public initRealtimeChannel(): void {
    if (!isSupabaseConfigured) {
      this.channelStatus = 'OFFLINE';
      this.notifyStatusListeners();
      return;
    }

    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }

    this.channelStatus = 'CONNECTING';
    this.notifyStatusListeners();

    try {
      const channel = supabase.channel('chapapp_realtime_global', {
        config: {
          broadcast: { self: false },
        },
      });

      // 1. Escuchar cambios de PostgreSQL (CDC) para todas las entidades
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          (payload: any) => {
            console.log('[Supabase Realtime CDC] 📢 Cambio en tabla events:', payload.eventType, payload.new?.id || payload.old?.id);
            const eventId = payload.new?.id || payload.old?.id;
            this.handleIncomingPayload({
              eventId,
              entityType: 'event',
              action: 'update',
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'participants' },
          (payload: any) => {
            console.log('[Supabase Realtime CDC] 📢 Cambio en tabla participants:', payload.eventType, payload.new?.id || payload.old?.id);
            const eventId = payload.new?.event_id || payload.old?.event_id;
            this.handleIncomingPayload({
              eventId,
              entityType: 'participant',
              action: 'update',
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses' },
          (payload: any) => {
            console.log('[Supabase Realtime CDC] 📢 Cambio en tabla expenses:', payload.eventType, payload.new?.id || payload.old?.id);
            const eventId = payload.new?.event_id || payload.old?.event_id;
            this.handleIncomingPayload({
              eventId,
              entityType: 'expense',
              action: 'update',
            });
          }
        );

      // 2. Escuchar mensajes P2P WebSocket en tiempo real (Broadcast < 50ms)
      channel.on('broadcast', { event: 'db_sync' }, (res: any) => {
        if (res && res.payload) {
          console.log('[Supabase Realtime Broadcast] ⚡ Mensaje recibido cross-device:', res.payload.entityType, res.payload.action);
          this.handleIncomingPayload(res.payload);
        }
      });

      // 3. Suscribirse y monitorear estado del WebSocket
      channel.subscribe((status: string, err?: Error) => {
        console.log(`[Supabase Realtime] 📡 Estado de conexión: "${status}"`, err ? err.message : '');
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] ✅ Suscrito exitosamente al canal global de Supabase.');
          this.channelStatus = 'SUBSCRIBED';
          this.lastSyncTime = new Date().toISOString();
          this.lastError = null;
        } else if (status === 'CLOSED') {
          console.warn('[Supabase Realtime] ⚠️ Canal cerrado. Programando reconexión...');
          this.channelStatus = 'CLOSED';
          this.scheduleReconnect();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const errMsg = err?.message || `Error en canal Supabase Realtime: ${status}`;
          console.error('[Supabase Realtime] ❌ Error en canal:', errMsg);
          this.channelStatus = 'ERROR';
          this.lastError = errMsg;
          this.scheduleReconnect();
        }
        this.notifyStatusListeners();
      });

      this.realtimeChannel = channel;
    } catch (err: any) {
      console.error('[SyncEngine] ❌ Excepción al inicializar canal Realtime:', err);
      this.channelStatus = 'ERROR';
      this.lastError = err?.message || 'Error inicializando Realtime';
      this.notifyStatusListeners();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isConnected && isSupabaseConfigured) {
        this.initRealtimeChannel();
      }
    }, 4000);
  }

  private handleIncomingPayload(payload: RealtimeChangePayload, isFromWebLocal = false): void {
    if (!payload) return;

    if (payload.originClientId && payload.originClientId === CLIENT_ID) {
      return;
    }

    this.notifySubscribers(payload);
  }

  private notifySubscribers(payload: RealtimeChangePayload): void {
    const { eventId, entityType } = payload;

    // 1. Notificar observadores del listado global de eventos (refrescar métricas y listado ante cualquier cambio)
    this.eventsListListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[SyncEngine] Error en listener de eventos:', err);
      }
    });

    // 2. Notificar observadores del evento específico
    if (eventId) {
      this.eventListeners.forEach((listeners, registeredKey) => {
        if (
          registeredKey === eventId ||
          registeredKey.toLowerCase() === eventId.toLowerCase()
        ) {
          listeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.error(`[SyncEngine] Error en listener del evento ${registeredKey}:`, err);
            }
          });
        }
      });
    } else if (entityType === 'participant' || entityType === 'expense' || entityType === 'payment') {
      this.eventListeners.forEach((listeners) => {
        listeners.forEach((listener) => {
          try {
            listener();
          } catch {}
        });
      });
    }

    // 3. Notificar observadores del Directorio Global
    if (entityType === 'directory') {
      this.directoryListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          console.error('[SyncEngine] Error en listener de directorio:', err);
        }
      });
    }
  }

  /**
   * Dispara una notificación de cambio hacia todas las capas:
   * 1. Bus local en memoria (inmediato < 1ms)
   * 2. BroadcastChannel Web (multi-tab en Laptop)
   * 3. Supabase Realtime WebSocket (iPad / Laptop en < 50ms)
   */
  public broadcastChange(payload: Omit<RealtimeChangePayload, 'originClientId' | 'timestamp'>): void {
    const fullPayload: RealtimeChangePayload = {
      ...payload,
      originClientId: CLIENT_ID,
      timestamp: Date.now(),
    };

    // 1. Notificar observadores locales de inmediato
    this.notifySubscribers(fullPayload);

    // 2. Enviar a otras pestañas web en la Laptop
    try {
      if (this.webBroadcastChannel) {
        this.webBroadcastChannel.postMessage(fullPayload);
      }
    } catch {}

    // 3. Transmitir por WebSocket de Supabase hacia los demás dispositivos
    try {
      if (this.realtimeChannel && isSupabaseConfigured) {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'db_sync',
          payload: fullPayload,
        });
      }
    } catch (err) {
      console.warn('[SyncEngine] Error enviando broadcast Realtime:', err);
    }
  }

  public refreshAllActiveSubscribers(): void {
    this.eventsListListeners.forEach((l) => {
      try { l(); } catch {}
    });
    this.eventListeners.forEach((set) => {
      set.forEach((l) => {
        try { l(); } catch {}
      });
    });
    this.directoryListeners.forEach((l) => {
      try { l(); } catch {}
    });
  }

  public subscribeToEvent(eventId: string, onUpdate: () => void): () => void {
    if (!eventId) return () => {};

    const key = eventId.trim();
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, new Set());
    }
    const set = this.eventListeners.get(key)!;
    set.add(onUpdate);

    if (this.channelStatus !== 'SUBSCRIBED' && isSupabaseConfigured) {
      this.initRealtimeChannel();
    }

    return () => {
      set.delete(onUpdate);
      if (set.size === 0) {
        this.eventListeners.delete(key);
      }
    };
  }

  public subscribeToEventsList(onUpdate: () => void): () => void {
    this.eventsListListeners.add(onUpdate);

    if (this.channelStatus !== 'SUBSCRIBED' && isSupabaseConfigured) {
      this.initRealtimeChannel();
    }

    return () => {
      this.eventsListListeners.delete(onUpdate);
    };
  }

  public subscribeToDirectory(onUpdate: () => void): () => void {
    this.directoryListeners.add(onUpdate);

    if (this.channelStatus !== 'SUBSCRIBED' && isSupabaseConfigured) {
      this.initRealtimeChannel();
    }

    return () => {
      this.directoryListeners.delete(onUpdate);
    };
  }

  public subscribeToStatus(listener: (status: SyncEngineStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): SyncEngineStatus {
    return {
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      syncError: this.lastError,
      isCloudReady: isSupabaseConfigured,
      channelStatus: this.channelStatus,
    };
  }

  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch {}
    });
  }

  public startSyncListener(): void {
    if (this.netInfoSubscription) return;

    this.netInfoSubscription = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasDisconnected = !this.isConnected && isOnline;
      this.isConnected = isOnline;
      this.notifyStatusListeners();

      if (wasDisconnected && isSupabaseConfigured) {
        this.initRealtimeChannel();
        this.refreshAllActiveSubscribers();
      }
    });

    NetInfo.fetch().then((state) => {
      this.isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.notifyStatusListeners();
    });
  }

  public stopSyncListener(): void {
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
      this.netInfoSubscription = null;
    }
  }

  public async checkCloudConnection(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: true, message: 'Sync in progress' };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notifyStatusListeners();

    try {
      if (!isSupabaseConfigured) {
        this.lastSyncTime = new Date().toISOString();
        return { success: true, message: 'Offline mode' };
      }

      const { error } = await supabase.from('events').select('id').limit(1);
      if (error) {
        throw error;
      }

      this.initRealtimeChannel();
      this.refreshAllActiveSubscribers();

      this.lastSyncTime = new Date().toISOString();
      return { success: true, message: 'Conectado a Supabase Cloud' };
    } catch (error: any) {
      const errorMsg = error?.message || 'Error de conexión con Supabase';
      this.lastError = errorMsg;
      return { success: false, message: errorMsg };
    } finally {
      this.isSyncing = false;
      this.notifyStatusListeners();
    }
  }
}

export const syncEngine = new RealtimeSyncEngine();

export const useSyncEngine = () => {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    syncEngine.startSyncListener();

    const unsubscribe = syncEngine.subscribeToStatus((newStatus) => {
      if (mountedRef.current) {
        setStatus(newStatus);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => {
    return syncEngine.checkCloudConnection();
  }, []);

  return {
    ...status,
    triggerSync,
  };
};
