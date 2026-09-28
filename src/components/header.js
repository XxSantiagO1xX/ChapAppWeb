/**
 * ChapApp - Header Flotante Liquid Glass con Emblema Protagónico
 */

import { renderIcon } from '../utils/icons.js';
import { store } from '../state/store.js';

export const renderHeader = ({ isDashboard = false, event = null } = {}) => {
  const { theme } = store.getState();
  const isDark = theme === 'dark';

  if (isDashboard && event) {
    return `
      <header class="app-header glass-header dashboard-header">
        <div class="header-left">
          <a href="#/" class="back-home-btn" aria-label="Volver al inicio">
            ${renderIcon('arrow-left', { size: 16 })}
            <span>Inicio</span>
          </a>
          <div class="header-title-box">
            <div class="title-with-badge">
              <h1 class="header-main-title">${event.title}</h1>
              <span class="badge-status ${event.isArchived ? 'status-archived' : 'status-active'}">
                ${event.isArchived ? 'Archivado' : 'Activo'}
              </span>
            </div>
            <p class="header-subtitle">Año ${event.year} • ${event.participants?.length || 0} Integrantes</p>
          </div>
        </div>

        <!-- Emblema Central Flotante y Sobrepuesto 100% Simétrico -->
        <div class="header-center-emblem-wrapper" pointer-events="none">
          <a href="#/" class="center-floating-emblem" aria-label="Ir al Inicio - ChapApp" title="ChapApp - Inicio">
            <img src="/assets/logo_tree.png" alt="ChapApp Logo" class="emblem-tree-img" onerror="this.src='./assets/logo_tree.png'" />
          </a>
        </div>

        <div class="header-right">
          <button id="btn-toggle-theme" class="btn-icon-glass theme-toggle-btn" aria-label="Cambiar tema">
            ${renderIcon(isDark ? 'moon' : 'sun', { size: 18 })}
          </button>
          <button id="btn-open-cut-modal" class="btn-pill-primary cut-btn" aria-label="Corte de caja">
            ${renderIcon('receipt', { size: 16 })}
            <span>Corte</span>
          </button>
          <button id="btn-open-expense-modal" class="btn-pill-cyan add-expense-header-btn" aria-label="Nuevo gasto">
            ${renderIcon('plus', { size: 16 })}
            <span class="btn-text-hide-mobile">Gasto</span>
          </button>
        </div>
      </header>
    `;
  }

  // Header para la Pantalla Principal (Home / Eventos)
  return `
    <header class="app-header glass-header home-header">
      <div class="header-left">
        <button id="btn-open-drawer" class="btn-icon-glass hamburger-btn" aria-label="Abrir menú lateral">
          ${renderIcon('menu', { size: 20 })}
        </button>
        
        <!-- Emblema Flotante de ChapApp -->
        <div class="logo-floating-badge">
          <img src="/assets/logo_tree.png" alt="ChapApp Logo" class="emblem-tree-img" onerror="this.src='./assets/logo_tree.png'" />
        </div>

        <div class="header-title-box">
          <h1 class="header-main-title">ChapApp</h1>
          <p class="header-subtitle">Finanzas Familiares & Prorrateo</p>
        </div>
      </div>

      <div class="header-right">
        <button id="btn-toggle-theme" class="btn-icon-glass theme-toggle-btn" aria-label="Cambiar tema">
          ${renderIcon(isDark ? 'moon' : 'sun', { size: 18 })}
        </button>
        <button id="btn-open-directory" class="btn-pill-glass" aria-label="Directorio Global">
          ${renderIcon('users', { size: 16 })}
          <span class="btn-text-hide-mobile">Directorio</span>
        </button>
        <button id="btn-open-new-event" class="btn-pill-primary" aria-label="Nuevo Evento">
          ${renderIcon('plus', { size: 16 })}
          <span>Nuevo Evento</span>
        </button>
      </div>
    </header>
  `;
};
