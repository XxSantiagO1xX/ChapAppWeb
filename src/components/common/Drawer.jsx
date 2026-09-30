/**
 * ChapApp - Menú Lateral Deslizante (Drawer) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const Drawer = ({ filterTab, setFilterTab }) => {
  const { activeModal, closeModal, events = [], theme, toggleTheme, openModal, selectEvent } = useApp();

  if (activeModal !== 'drawer') return null;

  const activeCount = events.filter((e) => !e.isArchived).length;
  const archivedCount = events.filter((e) => e.isArchived).length;

  return (
    <>
      <div 
        id="drawer-backdrop" 
        className="drawer-backdrop active animate-fade-in" 
        onClick={closeModal} 
        aria-hidden="true" 
      />
      <aside 
        id="app-drawer" 
        className="app-drawer glass-drawer open animate-slide-right" 
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
              openModal('directory');
            }}
          >
            <Icon name="users" size={18} />
            <span>Directorio Global</span>
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

          <div className="nav-section-title">Filtro Rápido</div>
          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              if (setFilterTab) setFilterTab('active');
              closeModal();
            }}
          >
            <span className="filter-dot active-dot"></span>
            <span>Eventos Activos</span>
            <span className="drawer-badge">{activeCount}</span>
          </button>

          <button 
            type="button" 
            className="drawer-nav-item"
            onClick={() => {
              if (setFilterTab) setFilterTab('archived');
              closeModal();
            }}
          >
            <span className="filter-dot archived-dot"></span>
            <span>Eventos Archivados</span>
            <span className="drawer-badge">{archivedCount}</span>
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

        <div className="drawer-footer">
          <p className="drawer-footer-text">ChapApp Web v5.0 • React + Vite</p>
        </div>
      </aside>
    </>
  );
};

export default Drawer;
