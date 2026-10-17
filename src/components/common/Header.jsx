/**
 * ChapApp - Header Flotante Liquid Glass Capsule (Navbar)
 * Inspirado en diseño Lumina (Dark) y Cápsula Aurora (Light)
 * Logo familiar protagónico al centro, dock de utilidades y cero saturación
 */

import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { calculateEventTotals } from '../../utils/calculations.js';
import { generateEventReportPlainText } from '../../utils/reports.js';
import { openExecutivePrintReport } from '../../utils/pdfReport.js';

export const Header = () => {
  const { 
    theme, 
    toggleTheme, 
    activeEvent, 
    selectEvent, 
    currentView, 
    navigateToView, 
    isSyncing, 
    syncCloud, 
    liveSyncPulse, 
    openModal, 
    currentUser,
    familyGroups
  } = useApp();
  const isDark = theme === 'dark';

  const eventTotals = useMemo(() => {
    if (!activeEvent) return null;
    return calculateEventTotals(activeEvent, null, familyGroups);
  }, [activeEvent, familyGroups]);

  const daysCount = useMemo(() => {
    if (!activeEvent) return 0;
    return Array.isArray(activeEvent.availableDays) && activeEvent.availableDays.length > 0
      ? activeEvent.availableDays.length
      : 4;
  }, [activeEvent]);

  const handleCenterClick = () => {
    if (currentView === 'directory' && activeEvent) {
      navigateToView('dashboard');
    } else {
      selectEvent(null);
      navigateToView('events');
    }
  };

  const handleQuickWhatsAppShare = () => {
    if (!activeEvent || !eventTotals) return;
    const text = generateEventReportPlainText(activeEvent, eventTotals);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleQuickPdfExport = () => {
    if (!activeEvent || !eventTotals) return;
    openExecutivePrintReport(activeEvent, eventTotals);
  };

  const headerStatusClass =
    activeEvent && currentView !== 'directory'
      ? activeEvent.isArchived
        ? 'header-event-inactive'
        : 'header-event-active'
      : '';

  return (
    <header className={`app-header floating-navbar-capsule ${headerStatusClass}`}>
      {/* ============================================================== */}
      {/* ZONA IZQUIERDA: Contexto o Menú de Navegación                 */}
      {/* ============================================================== */}
      <div className="navbar-zone-left">
        {currentView === 'directory' ? (
          <div className="navbar-context-group">
            <button
              type="button"
              onClick={() => navigateToView(activeEvent ? 'dashboard' : 'events')}
              className="navbar-back-btn"
              title={activeEvent ? 'Volver al evento' : 'Volver a eventos'}
              aria-label="Volver"
            >
              <Icon name="arrow-left" size={15} />
              <span className="navbar-btn-text">Volver</span>
            </button>
            <span className="navbar-context-title">Directorio General</span>
          </div>
        ) : activeEvent ? (
          <div className="navbar-context-group">
            <button
              type="button"
              onClick={() => selectEvent(null)}
              className="navbar-back-btn"
              title="Volver a lista de eventos"
              aria-label="Inicio"
            >
              <Icon name="arrow-left" size={15} />
              <span className="navbar-btn-text">Eventos</span>
            </button>
            <div className="navbar-event-stack">
              <span className="navbar-event-meta">
                AÑO {activeEvent.year} • {daysCount} {daysCount === 1 ? 'DÍA' : 'DÍAS'} • {eventTotals?.totalAttendingCount || 0} ASISTENTES
              </span>
              <span className="navbar-event-title" title={activeEvent.title}>
                {activeEvent.title}
              </span>
            </div>
          </div>
        ) : (
          <div className="navbar-brand-group">
            <button
              type="button"
              onClick={() => openModal('drawer')}
              className="navbar-menu-btn"
              title="Abrir menú lateral"
              aria-label="Menú"
            >
              <Icon name="menu" size={20} color="var(--color-primary)" />
            </button>
            <button
              type="button"
              onClick={() => navigateToView('events')}
              className="navbar-brand-title-btn"
              title="ChapApp - Inicio"
            >
              <span className="navbar-brand-name">ChapApp</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* ZONA CENTRAL: Logo Familiar Protagónico en el Medio            */}
      {/* ============================================================== */}
      <div className="navbar-zone-center">
        <button
          type="button"
          onClick={handleCenterClick}
          className="navbar-center-emblem"
          title="ChapApp - Inicio"
          aria-label="Ir al inicio"
        >
          <span className="navbar-emblem-aura" aria-hidden="true" />
          <img
            src="/assets/logo_tree.png"
            alt="ChapApp Logo"
            className="navbar-emblem-img"
            onError={(e) => { e.target.src = './assets/logo_tree.png'; }}
          />
        </button>
      </div>

      {/* ============================================================== */}
      {/* ZONA DERECHA: Mini-Dock de Utilidades + Botón de Acción        */}
      {/* ============================================================== */}
      <div className="navbar-zone-right">
        {/* Mini-dock translúcido de herramientas agrupadas con colores distintivos */}
        <div className="navbar-utility-dock">
          {/* Sincronización Cloud con Supabase */}
          <button
            type="button"
            onClick={syncCloud}
            className={`navbar-dock-btn sync-btn ${isSyncing ? 'syncing-spin' : ''}`}
            title={liveSyncPulse ? '¡Sincronizado en tiempo real!' : 'Sincronizar datos'}
            aria-label="Sincronizar"
          >
            <Icon name="refresh" size={16} />
            {liveSyncPulse && <span className="navbar-realtime-dot" />}
          </button>

          {/* Estadísticas y Analítica */}
          <button
            type="button"
            onClick={() => openModal('analytics')}
            className="navbar-dock-btn analytics-btn"
            title="Estadísticas y Analítica"
            aria-label="Analítica"
          >
            <Icon name="chart" size={16} />
          </button>

          {/* Alternador de Tema Claro / Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            className="navbar-dock-btn theme-toggle-btn active-subtle"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label="Cambiar tema"
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={17} />
          </button>

          {/* Acceso a Directorio General (disponible tanto en Inicio como dentro del Evento) */}
          {currentView !== 'directory' && (
            <button
              type="button"
              onClick={() => navigateToView('directory')}
              className="navbar-dock-btn directory-btn"
              title="Directorio General"
              aria-label="Directorio"
            >
              <Icon name="users" size={16} />
            </button>
          )}

          {/* Perfil de Usuario / Ajustes con color distintivo de Rol */}
          {currentUser && (
            <button
              type="button"
              onClick={() => openModal('settings')}
              className={`navbar-dock-btn user-btn ${currentUser.role === 'admin' ? 'role-admin' : 'role-operator'}`}
              title={`Configuración (${currentUser.name})`}
              aria-label="Configuración de usuario"
            >
              <Icon name={currentUser.role === 'admin' ? 'shield' : 'user'} size={16} />
            </button>
          )}
        </div>

        {/* Acciones Rápidas de Exportación + Botón Principal */}
        {activeEvent && currentView !== 'directory' ? (
          <div className="navbar-event-actions-group">
            <button
              type="button"
              onClick={handleQuickWhatsAppShare}
              className="navbar-quick-action-btn whatsapp-quick-btn"
              title="Compartir resumen del evento por WhatsApp"
              aria-label="Compartir por WhatsApp"
            >
              <Icon name="whatsapp" size={16} />
            </button>
            <button
              type="button"
              onClick={handleQuickPdfExport}
              className="navbar-quick-action-btn pdf-quick-btn"
              title="Exportar reporte PDF del evento"
              aria-label="Exportar PDF"
            >
              <Icon name="printer" size={16} />
            </button>
          </div>
        ) : !activeEvent && currentView !== 'directory' ? (
          <button
            type="button"
            onClick={() => openModal('newEvent')}
            className="navbar-cta-btn new-event-cta"
            title="Crear Nuevo Evento"
            aria-label="Nuevo Evento"
          >
            <Icon name="plus" size={15} />
            <span className="navbar-btn-text">Nuevo Evento</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
