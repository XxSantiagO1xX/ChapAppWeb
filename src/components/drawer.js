/**
 * ChapApp - Menú Lateral Deslizante (Drawer)
 */

import { renderIcon } from '../utils/icons.js';
import { store } from '../state/store.js';

export const renderDrawer = () => {
  const { theme, events = [] } = store.getState();
  const activeCount = events.filter((e) => !e.isArchived).length;
  const archivedCount = events.filter((e) => e.isArchived).length;

  return `
    <div id="drawer-backdrop" class="drawer-backdrop" aria-hidden="true"></div>
    <aside id="app-drawer" class="app-drawer glass-drawer" aria-label="Menú principal">
      <div class="drawer-header">
        <div class="drawer-brand">
          <div class="drawer-logo-badge">
            <img src="./assets/logo_tree.png" alt="Logo" class="emblem-tree-img" />
          </div>
          <div>
            <h2 class="drawer-title">ChapApp</h2>
            <p class="drawer-subtitle">Menú Principal</p>
          </div>
        </div>
        <button id="btn-close-drawer" class="btn-icon-glass" aria-label="Cerrar menú">
          ${renderIcon('close', { size: 18 })}
        </button>
      </div>

      <nav class="drawer-nav">
        <div class="nav-section-title">Navegación</div>
        <a href="#/" class="drawer-nav-item active">
          ${renderIcon('home', { size: 18 })}
          <span>Eventos y Vacaciones</span>
          <span class="drawer-badge">${events.length}</span>
        </a>
        <button id="btn-drawer-directory" class="drawer-nav-item">
          ${renderIcon('users', { size: 18 })}
          <span>Directorio Global</span>
        </button>
        <button id="btn-drawer-new-event" class="drawer-nav-item">
          ${renderIcon('plus', { size: 18 })}
          <span>Crear Nuevo Evento</span>
        </button>

        <div class="nav-section-title">Filtro Rápido</div>
        <button id="btn-drawer-filter-active" class="drawer-nav-item">
          <span class="filter-dot active-dot"></span>
          <span>Eventos Activos</span>
          <span class="drawer-badge">${activeCount}</span>
        </button>
        <button id="btn-drawer-filter-archived" class="drawer-nav-item">
          <span class="filter-dot archived-dot"></span>
          <span>Eventos Archivados</span>
          <span class="drawer-badge">${archivedCount}</span>
        </button>

        <div class="nav-section-title">Apariencia</div>
        <button id="btn-drawer-theme" class="drawer-nav-item">
          ${renderIcon(theme === 'dark' ? 'sun' : 'moon', { size: 18 })}
          <span>Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>
      </nav>

      <div class="drawer-footer">
        <p class="drawer-footer-text">ChapApp Web v2.0 • DOM Nativo</p>
      </div>
    </aside>
  `;
};
