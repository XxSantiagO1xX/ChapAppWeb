/**
 * ChapApp - Menú Lateral Deslizante (Drawer) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const Drawer = ({ filterTab, setFilterTab }) => {
  const { 
    activeModal, 
    closeModal, 
    events = [], 
    theme, 
    toggleTheme, 
    openModal, 
    selectEvent, 
    navigateToView, 
    currentUser, 
    logoutUser 
  } = useApp();

  if (activeModal !== 'drawer') return null;

  return (
    <>
      <div 
        id="drawer-backdrop" 
        className="drawer-backdrop active" 
        onClick={closeModal} 
        aria-hidden="true" 
      />
      <aside 
        id="app-drawer" 
        className="app-drawer glass-drawer open" 
        aria-label="Menú principal"
      >
        <div className="drawer-header">
          <div className="drawer-brand">
            <div className="drawer-logo-badge">
              <img 
                src="/assets/logo_tree.png" 
                alt="Logo" 
                className="emblem-tree-img" 
                onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
              />
            </div>
            <div>
              <h2 className="drawer-title">ChapApp</h2>
              <p className="drawer-subtitle">Menú Principal</p>
            </div>
          </div>
          <button 
            type="button" 
            id="btn-close-drawer" 
            className="btn-icon-glass" 
            onClick={closeModal} 
            aria-label="Cerrar menú"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="drawer-nav">
          <div className="nav-section-title">Navegación</div>
          <button 
            type="button" 
            className="drawer-nav-item active"
            onClick={() => {
              selectEvent(null);
              closeModal();
            }}
          >
            <Icon name="home" size={18} />
            <span>Eventos y Vacaciones</span>
            <span className="drawer-badge">{events.length}</span>
          </button>

          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              closeModal();
              navigateToView('directory');
            }}
          >
            <Icon name="users" size={18} />
            <span>Directorio General</span>
          </button>

          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              closeModal();
              openModal('analytics');
            }}
          >
            <Icon name="chart" size={18} />
            <span>Analítica Global</span>
          </button>

          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              closeModal();
              openModal('newEvent');
            }}
          >
            <Icon name="plus" size={18} />
            <span>Crear Nuevo Evento</span>
          </button>


          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              closeModal();
              openModal('settings');
            }}
          >
            <Icon name="settings" size={18} />
            <span>Configuración del Sistema</span>
          </button>

          <div className="nav-section-title">Apariencia</div>
          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            <span>Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
          </button>
        </nav>

        {currentUser && (
          <div className="drawer-user-panel glass-panel" style={{ margin: '14px 16px', padding: '12px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)'
                }}
              >
                <Icon name={currentUser.role === 'admin' ? 'shield' : 'user'} size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{currentUser.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                  {currentUser.role === 'admin' ? 'Administrador' : 'Segundo al Mando'}
                </span>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-icon-danger" 
              onClick={() => {
                closeModal();
                logoutUser();
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        )}

        <div className="drawer-footer">
          <p className="drawer-footer-text">ChapApp Web v5.0 • React + Vite</p>
        </div>
      </aside>
    </>
  );
};

export default Drawer;
