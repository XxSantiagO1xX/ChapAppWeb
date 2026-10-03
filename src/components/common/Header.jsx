/**
 * ChapApp - Header Flotante Liquid Glass Capsule (Navbar)
 * Inspirado en diseño Lumina (Dark) y Cápsula Aurora (Light)
 * Logo familiar protagónico al centro, dock de utilidades y cero saturación
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

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
    currentUser 
  } = useApp();
  const isDark = theme === 'dark';

  const handleCenterClick = () => {
    if (currentView === 'directory' && activeEvent) {
      navigateToView('dashboard');
    } else {
      selectEvent(null);
      navigateToView('events');
    }
  };

  return (
    <header className="app-header fixed-top-navbar">
      <div className="header-inner-content">
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
            <div className="navbar-event-info">
              <span className="navbar-event-title" title={activeEvent.title}>
                {activeEvent.title}
              </span>
              <span 
                className={`navbar-status-dot ${activeEvent.isArchived ? 'status-archived' : 'status-active'}`} 
                title={activeEvent.isArchived ? 'Archivado' : 'Activo'} 
              />
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
          title="ChapApp - Inicio / Actualizar"
          aria-label="Ir al inicio"
        >
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
            title={liveSyncPulse ? '¡Sincronizado en tiempo real!' : 'Sincronizar con Supabase Cloud'}
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
            title="Analítica Histórica y Estadísticas Globales"
            aria-label="Analítica"
          >
            <Icon name="chart" size={16} />
          </button>

          {/* Alternador de Tema Claro / Oscuro con active constante sutil */}
          <button
            type="button"
            onClick={toggleTheme}
            className="navbar-dock-btn theme-toggle-btn active-subtle"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label="Cambiar tema"
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={17} />
          </button>

          {/* Acceso a Directorio (si estamos en Home) */}
          {!activeEvent && currentView !== 'directory' && (
            <button
              type="button"
              onClick={() => navigateToView('directory')}
              className="navbar-dock-btn directory-btn"
              title="Directorio General & Jerarquía Familiar"
              aria-label="Directorio"
            >
              <Icon name="users" size={16} />
            </button>
          )}

          {/* Perfil de Usuario / Ajustes con color distintivo de Rol (Admin vs Operador) */}
          {currentUser && (
            <button
              type="button"
              onClick={() => openModal('settings')}
              className={`navbar-dock-btn user-btn ${currentUser.role === 'admin' ? 'role-admin' : 'role-operator'}`}
              title={`Configuración (${currentUser.name} - ${currentUser.role === 'admin' ? 'Administrador' : 'Segundo al Mando'})`}
              aria-label="Configuración de usuario"
            >
              <Icon name={currentUser.role === 'admin' ? 'shield' : 'user'} size={16} />
            </button>
          )}
        </div>

        {/* Botón de Acción Principal */}
        {activeEvent && currentView !== 'directory' ? (
          <button
            type="button"
            onClick={() => openModal('cut')}
            className="navbar-cta-btn cut-cta"
            title="Generar Corte de Caja"
            aria-label="Corte de caja"
          >
            <Icon name="receipt" size={15} />
            <span>Corte</span>
          </button>
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
    </div>
  </header>
  );
};

export default Header;
