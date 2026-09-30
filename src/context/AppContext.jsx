/**
 * ChapApp - Contexto Global de Estado React
 * Gestión centralizada de Eventos, Tema Claro/Oscuro, Navegación, Modales y Alertas
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  getAllEvents, 
  getEventById, 
  getGlobalDirectory,
  subscribeToEventsListRealtime 
} from '../services/database.js';
import { CONFIG } from '../config/config.js';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // 1. Estado del Tema (Dark / Light)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return CONFIG.APP.DEFAULT_THEME;
  });

  // Aplicar data-theme al documento HTML cuando cambie
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(CONFIG.APP.STORAGE_KEYS.THEME, theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // 2. Estado de Eventos y Selección
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSyncPulse, setLiveSyncPulse] = useState(false);

  const activeEventRef = useRef(activeEvent);
  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  // 3. Estado de Navegación del Dashboard
  const [activeDashboardTab, setActiveDashboardTab] = useState('summary');
  const [selectedSubFamily, setSelectedSubFamily] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 4. Directorio Global
  const [directory, setDirectory] = useState([]);

  // 5. Sistema de Notificaciones Toast
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 6. Sistema Centralizado de Modales
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState({});

  const openModal = useCallback((modalName, props = {}) => {
    setActiveModal(modalName);
    setModalProps(props);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalProps({});
  }, []);

  // Cargar eventos iniciales desde Supabase o Caché local
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const allEvents = await getAllEvents();
      setEvents(allEvents || []);
      const dir = getGlobalDirectory();
      setDirectory(dir || []);

      // Si la URL tiene un hash con ID de evento (ej. #/event/123)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash.startsWith('#/event/')) {
          const eventId = hash.replace('#/event/', '').split('?')[0];
          const found = (allEvents || []).find((e) => e.id === eventId);
          if (found) {
            setActiveEvent(found);
          }
        }
      }
    } catch (err) {
      console.warn('[AppProvider] Error cargando eventos iniciales:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Suscripción Realtime a Supabase con pulso visual y actualización reactiva
  useEffect(() => {
    const unsubscribe = subscribeToEventsListRealtime(async () => {
      console.log('[AppProvider] Cambio detectado en Supabase Realtime, actualizando...');
      setLiveSyncPulse(true);
      setTimeout(() => setLiveSyncPulse(false), 2500);

      // Refrescar lista de eventos y directorio
      await loadInitialData();

      // Si hay un evento abierto en este dispositivo, refrescar su detalle
      if (activeEventRef.current?.id) {
        try {
          const refreshed = await getEventById(activeEventRef.current.id);
          if (refreshed) {
            setActiveEvent(refreshed);
          }
        } catch (err) {
          console.warn('[AppProvider] Error refrescando evento activo en Realtime:', err);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadInitialData]);

  // Sincronización manual en la nube
  const syncCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const allEvents = await getAllEvents();
      if (allEvents) {
        setEvents(allEvents);
        if (activeEvent) {
          const updatedActive = allEvents.find((e) => e.id === activeEvent.id);
          if (updatedActive) setActiveEvent(updatedActive);
        }
      }
      showToast('Sincronización con Supabase Cloud completada', 'success');
    } catch (err) {
      console.error('Error sincronizando con Supabase:', err);
      showToast('Error de sincronización con la nube', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [activeEvent, showToast]);

  // Seleccionar o deseleccionar evento activo
  const selectEvent = useCallback(async (eventId) => {
    if (!eventId) {
      setActiveEvent(null);
      if (typeof window !== 'undefined') window.location.hash = '#/';
      return;
    }

    try {
      const ev = await getEventById(eventId);
      if (ev) {
        setActiveEvent(ev);
        setActiveDashboardTab('summary');
        if (typeof window !== 'undefined') window.location.hash = `#/event/${eventId}`;
      }
    } catch (err) {
      console.error('Error seleccionando evento:', err);
    }
  }, []);

  // Refrescar evento activo tras cambios (gasto, participante, etc.)
  const refreshActiveEvent = useCallback(async () => {
    if (!activeEvent) return;
    try {
      const refreshed = await getEventById(activeEvent.id);
      const allEvents = await getAllEvents();
      if (refreshed) setActiveEvent(refreshed);
      if (allEvents) setEvents(allEvents);
    } catch (err) {
      console.error('Error refrescando evento activo:', err);
    }
  }, [activeEvent]);

  const value = {
    theme,
    toggleTheme,
    events,
    setEvents,
    activeEvent,
    setActiveEvent,
    selectEvent,
    refreshActiveEvent,
    loading,
    isSyncing,
    liveSyncPulse,
    syncCloud,
    activeDashboardTab,
    setActiveDashboardTab,
    selectedSubFamily,
    setSelectedSubFamily,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    directory,
    setDirectory,
    toasts,
    showToast,
    removeToast,
    activeModal,
    modalProps,
    openModal,
    closeModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};

export default AppContext;
