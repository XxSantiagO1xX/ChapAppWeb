/**
 * ChapApp - Header Flotante Liquid Glass con Emblema Protagónico (React)
 * Diseño delgado y adaptativo con soporte para Modo Claro y Modo Oscuro
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const Header = () => {
  const { theme, toggleTheme, activeEvent, selectEvent, isSyncing, syncCloud, liveSyncPulse, openModal } = useApp();
  const isDark = theme === 'dark';

  if (activeEvent) {
    return (
      <header className="app-header glass-header dashboard-header">
        <div className="header-left">
          <button 
            type="button" 
            onClick={() => selectEvent(null)} 
            className="back-home-btn" 
            aria-label="Volver al inicio"
          >
            <Icon name="arrow-left" size={16} />
            <span>Inicio</span>
          </button>
          
          <div className="header-title-box">
            <div className="title-with-badge">
              <h1 className="header-main-title">{activeEvent.title}</h1>
              <span className={`badge-status ${activeEvent.isArchived ? 'status-archived' : 'status-active'}`}>
                {activeEvent.isArchived ? 'Archivado' : 'Activo'}
              </span>
            </div>
            <p className="header-subtitle">
              Año {activeEvent.year} • {activeEvent.participants?.length || 0} Integrantes
            </p>
          </div>
        </div>

        {/* Emblema Central Flotante y Sobrepuesto 100% Simétrico */}
        <div className="header-center-emblem-wrapper">
          <button 
            type="button"
            onClick={() => selectEvent(null)}
            className="center-floating-emblem" 
            aria-label="Ir al Inicio - ChapApp" 
            title="ChapApp - Inicio"
          >
            <img 
              src="/assets/logo_tree.png" 
              alt="ChapApp Logo" 
              className="emblem-tree-img" 
              onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
            />
          </button>
        </div>

        <div className="header-right">
          <button 
            id="btn-sync-cloud" 
            onClick={syncCloud} 
            className={`btn-icon-glass sync-btn ${isSyncing ? 'syncing-spin' : ''}`} 
            title={liveSyncPulse ? '¡Sincronizado en tiempo real!' : 'Sincronizar con Supabase Cloud'} 
            aria-label="Sincronizar"
            style={{ position: 'relative' }}
          >
            <Icon name="refresh" size={16} />
            {liveSyncPulse && (
              <span 
                className="realtime-pulse-dot" 
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px #10B981',
                }} 
              />
            )}
          </button>

          <button 
            type="button" 
            id="btn-open-analytics-dash" 
            onClick={() => openModal('analytics')} 
            className="btn-icon-glass" 
            title="Analítica Histórica y Estadísticas Globales" 
            aria-label="Analítica"
          >
            <Icon name="chart" size={16} />
          </button>

          <button 
            id="btn-toggle-theme" 
            onClick={toggleTheme} 
            className="btn-icon-glass theme-toggle-btn" 
            aria-label="Cambiar tema"
          >
            <Icon name={isDark ? 'moon' : 'sun'} size={18} />
          </button>

          <button 
            id="btn-open-cut-modal" 
            onClick={() => openModal('cut')} 
            className="btn-pill-primary cut-btn" 
            aria-label="Corte de caja"
          >
            <Icon name="receipt" size={16} />
            <span>Corte</span>
          </button>
        </div>
      </header>
    );
  }

  // Header para la Pantalla Principal (Home / Eventos)
  return (
    <header className="app-header glass-header home-header">
      <div className="header-left">
        <button 
          id="btn-open-drawer" 
          onClick={() => openModal('drawer')} 
          className="btn-icon-glass hamburger-btn" 
          aria-label="Abrir menú lateral"
        >
          <Icon name="menu" size={20} />
        </button>
        
        {/* Emblema Flotante de ChapApp */}
        <div className="logo-floating-badge">
          <img 
            src="/assets/logo_tree.png" 
            alt="ChapApp Logo" 
            className="emblem-tree-img" 
            onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
          />
        </div>

        <div className="header-title-box">
          <h1 className="header-main-title">ChapApp</h1>
          <p className="header-subtitle">Finanzas Familiares & Prorrateo</p>
        </div>
      </div>

      <div className="header-right">
        <button 
          id="btn-sync-cloud-home" 
          onClick={syncCloud} 
          className={`btn-icon-glass sync-btn ${isSyncing ? 'syncing-spin' : ''}`} 
          title={liveSyncPulse ? '¡Sincronizado en tiempo real!' : 'Sincronizar con Supabase Cloud'} 
          aria-label="Sincronizar"
          style={{ position: 'relative' }}
        >
          <Icon name="refresh" size={16} />
          {liveSyncPulse && (
            <span 
              className="realtime-pulse-dot" 
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }} 
            />
          )}
        </button>

        <button 
          type="button" 
          id="btn-open-analytics-home" 
          onClick={() => openModal('analytics')} 
          className="btn-icon-glass" 
          title="Analítica Histórica y Estadísticas Globales" 
          aria-label="Analítica"
        >
          <Icon name="chart" size={16} />
        </button>

        <button 
          id="btn-toggle-theme" 
          onClick={toggleTheme} 
          className="btn-icon-glass theme-toggle-btn" 
          aria-label="Cambiar tema"
        >
          <Icon name={isDark ? 'moon' : 'sun'} size={18} />
        </button>

        <button 
          id="btn-open-directory" 
          onClick={() => openModal('directory')} 
          className="btn-pill-glass" 
          aria-label="Directorio Global"
        >
          <Icon name="users" size={16} />
          <span className="btn-text-hide-mobile">Directorio</span>
        </button>

        <button 
          id="btn-open-new-event" 
          onClick={() => openModal('newEvent')} 
          className="btn-pill-primary" 
          aria-label="Nuevo Evento"
        >
          <Icon name="plus" size={16} />
          <span>Nuevo Evento</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
