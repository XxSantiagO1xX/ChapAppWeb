/**
 * ChapApp - Contexto Global de Estado React
 * Gestión centralizada de Eventos, Tema Claro/Oscuro, Navegación, Modales y Alertas
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  getAllEvents, 
  getEventById, 
  getGlobalDirectory,
  fetchGlobalDirectoryFromSupabase,
  getAllFamilyGroups,
  updateFamilyGroup,
  createFamilyGroup,
  subscribeToEventsListRealtime 
} from '../services/database.js';
import { 
  getCurrentUser, 
  login as authLogin, 
  logout as authLogout, 
  initAuthUsers 
} from '../services/authService.js';
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


  // 2. Estado de Autenticación Hermética y Sesión
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    initAuthUsers().catch((e) => console.warn('[AppProvider] Error sembrando usuarios:', e));
  }, []);

  const loginUser = useCallback(async (username, password) => {
    const user = await authLogin(username, password);
    setCurrentUser(user);
    return user;
  }, []);

  const logoutUser = useCallback(() => {
    authLogout();
    setCurrentUser(null);
  }, []);

  // 3. Estado de Eventos y Selección
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSyncPulse, setLiveSyncPulse] = useState(false);

  const activeEventRef = useRef(activeEvent);
  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  // 3. Estado de Navegación Global y Dashboard
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#/directory') return 'directory';
      if (hash.startsWith('#/event/')) return 'dashboard';
    }
    return 'events';
  });
  const [activeDashboardTab, setActiveDashboardTab] = useState('summary');
  const [selectedSubFamily, setSelectedSubFamily] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // 4. Directorio Global y Jerarquía Familiar (Modelo Híbrido)
  const [directory, setDirectory] = useState([]);
  const [familyGroups, setFamilyGroups] = useState([]);

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

  // Refrescar solo grupos familiares
  const refreshFamilyGroups = useCallback(async () => {
    try {
      const groups = await getAllFamilyGroups();
      setFamilyGroups(groups || []);
      return groups;
    } catch (e) {
      console.warn('[AppContext] Error refrescando family_groups:', e);
      return [];
    }
  }, []);

  // Cambiar estatus de independencia de un grupo familiar
  const updateFamilyGroupIndependence = useCallback(async (groupId, es_independiente) => {
    try {
      const updated = await updateFamilyGroup(groupId, { es_independiente });
      if (updated) {
        setFamilyGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, es_independiente } : g)));
        showToast(
          es_independiente 
            ? 'Núcleo independizado: generará su propio corte y ticket individual' 
            : 'Núcleo dependiente: se consolidará en el corte de su rama principal',
          'success'
        );
        // Si hay evento activo, forzar refresco para recalcular tickets inmediatamente
        if (activeEventRef.current?.id) {
          const refreshed = await getEventById(activeEventRef.current.id);
          if (refreshed) setActiveEvent(refreshed);
        }
      }
    } catch (err) {
      console.error('Error toggling family group independence:', err);
      showToast('Error al actualizar independencia del grupo', 'error');
    }
  }, [showToast]);

  // Cargar eventos iniciales desde Supabase o Caché local
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const allEvents = await getAllEvents();
      setEvents(allEvents || []);
      const dir = await fetchGlobalDirectoryFromSupabase();
      setDirectory(dir || []);
      const groups = await getAllFamilyGroups();
      setFamilyGroups(groups || []);

      // Si la URL tiene un hash específico
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash === '#/directory') {
          setCurrentView('directory');
        } else if (hash.startsWith('#/event/')) {
          const eventId = hash.replace('#/event/', '').split('?')[0];
          const found = (allEvents || []).find((e) => e.id === eventId);
          if (found) {
            setActiveEvent(found);
            setCurrentView('dashboard');
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

  // Manejar navegación por historial del navegador (hashchange)
  useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      if (hash === '#/directory') {
        setCurrentView('directory');
      } else if (hash.startsWith('#/event/')) {
        const eventId = hash.replace('#/event/', '').split('?')[0];
        if (activeEventRef.current?.id !== eventId) {
          getEventById(eventId).then((ev) => {
            if (ev) setActiveEvent(ev);
          });
        }
        setCurrentView('dashboard');
      } else if (hash === '#/' || !hash) {
        if (!activeEventRef.current) {
          setCurrentView('events');
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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
      setCurrentView('events');
      if (typeof window !== 'undefined') window.location.hash = '#/';
      return;
    }

    try {
      const ev = await getEventById(eventId);
      if (ev) {
        setActiveEvent(ev);
        setActiveDashboardTab('summary');
        setIsSidebarCollapsed(true);
        setCurrentView('dashboard');
        if (typeof window !== 'undefined') window.location.hash = `#/event/${eventId}`;
      }
    } catch (err) {
      console.error('Error seleccionando evento:', err);
    }
  }, []);

  // Navegación centralizada entre vistas (events, dashboard, directory)
  const navigateToView = useCallback((viewName, params = {}) => {
    if (viewName === 'directory') {
      setCurrentView('directory');
      if (typeof window !== 'undefined') window.location.hash = '#/directory';
    } else if (viewName === 'dashboard') {
      const targetId = params.eventId || activeEventRef.current?.id;
      if (targetId) {
        selectEvent(targetId);
      } else {
        setCurrentView('events');
      }
    } else {
      // 'events'
      setCurrentView('events');
      if (params.clearActiveEvent !== false) {
        setActiveEvent(null);
        if (typeof window !== 'undefined') window.location.hash = '#/';
      }
    }
  }, [selectEvent]);

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
    currentUser,
    loginUser,
    logoutUser,
    currentView,
    setCurrentView,
    navigateToView,
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
    familyGroups,
    setFamilyGroups,
    refreshFamilyGroups,
    updateFamilyGroupIndependence,
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
