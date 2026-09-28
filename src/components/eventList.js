/**
 * ChapApp - Vista Principal de Lista de Eventos y Vacaciones
 */

import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { renderIcon } from '../utils/icons.js';
import { store } from '../state/store.js';

export const renderEventList = () => {
  const { events = [], filterTab = 'active', searchQuery = '', loading = false } = store.getState();

  if (loading) {
    return `
      <div class="loading-state-container">
        <div class="spinner-glass"></div>
        <p class="loading-text">Conectando con Supabase Cloud...</p>
      </div>
    `;
  }

  const totalCount = events.length;
  const activeCount = events.filter((e) => !e.isArchived).length;
  const archivedCount = events.filter((e) => e.isArchived).length;

  // Filtrado de eventos
  const filteredEvents = events.filter((evt) => {
    if (filterTab === 'active' && evt.isArchived) return false;
    if (filterTab === 'archived' && !evt.isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (evt.title || '').toLowerCase().includes(q);
      const matchYear = String(evt.year || '').includes(q);
      return matchTitle || matchYear;
    }
    return true;
  });

  // Barra de Búsqueda y Filtros
  const searchFilterBarHtml = `
    <div class="search-filter-bar glass-panel animate-fade-in">
      <div class="search-input-box">
        <span class="search-icon">${renderIcon('search', { size: 18 })}</span>
        <input 
          type="text" 
          id="events-search-input" 
          class="glass-input-search" 
          placeholder="Buscar eventos por título o año..." 
          value="${searchQuery}"
          autocomplete="off"
        />
        ${searchQuery ? `<button id="btn-clear-search" class="btn-clear-search" aria-label="Limpiar">${renderIcon('close', { size: 14 })}</button>` : ''}
      </div>

      <div class="filter-chips-group">
        <button class="filter-chip-btn ${filterTab === 'active' ? 'active' : ''}" data-filter="active" title="Ver eventos activos">
          <span class="filter-dot active-dot"></span>
          <span>Activos (${activeCount})</span>
        </button>
        <button class="filter-chip-btn ${filterTab === 'archived' ? 'active' : ''}" data-filter="archived" title="Ver eventos archivados">
          <span class="filter-dot archived-dot"></span>
          <span>Archivados (${archivedCount})</span>
        </button>
        <button class="filter-chip-btn ${filterTab === 'all' ? 'active' : ''}" data-filter="all" title="Ver todos los eventos">
          <span>Todos (${totalCount})</span>
        </button>
      </div>
    </div>
  `;

  if (filteredEvents.length === 0) {
    let emptyMessage = 'Crea tu primer evento anual para comenzar a controlar gastos y prorrateo.';
    let emptyTitle = 'No hay eventos para mostrar';
    if (searchQuery) {
      emptyTitle = 'Sin resultados de búsqueda';
      emptyMessage = `No se encontraron eventos que coincidan con "${searchQuery}".`;
    } else if (filterTab === 'archived') {
      emptyTitle = 'No hay eventos archivados';
      emptyMessage = 'Los eventos que archives aparecerán aquí para consulta histórica.';
    } else if (filterTab === 'active' && totalCount > 0) {
      emptyTitle = 'No hay eventos activos';
      emptyMessage = 'Todos tus eventos están archivados actualmente.';
    }

    return `
      <div class="events-view-container">
        ${searchFilterBarHtml}
        <div class="empty-state-box glass-panel animate-fade-in">
          <div class="empty-icon-circle">${renderIcon('calendar', { size: 36 })}</div>
          <h3 class="empty-title">${emptyTitle}</h3>
          <p class="empty-description">${emptyMessage}</p>
          <button id="btn-empty-new-event" class="btn-pill-primary">
            ${renderIcon('plus', { size: 16 })}
            <span>Crear Nuevo Evento</span>
          </button>
        </div>
      </div>
    `;
  }

  // Renderizar tarjetas de eventos
  const eventCardsHtml = filteredEvents.map((evt) => {
    const totals = calculateEventTotals(evt);
    const collectionPercent =
      totals.totalToCollect > 0
        ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
        : 100;

    return `
      <article class="event-card glass-panel animate-scale-in" data-event-id="${evt.id}">
        <div class="event-card-header">
          <div class="event-card-title-group">
            <span class="event-year-tag">${evt.year}</span>
            <h3 class="event-card-title">${evt.title}</h3>
            <span class="badge-status ${evt.isArchived ? 'status-archived' : 'status-active'}">
              ${evt.isArchived ? 'Archivado' : 'Activo'}
            </span>
          </div>
          <div class="event-card-menu-group">
            <button 
              class="btn-icon-glass btn-toggle-archive-card" 
              data-event-id="${evt.id}" 
              data-archived="${evt.isArchived}"
              title="${evt.isArchived ? 'Desarchivar evento' : 'Archivar evento'}"
            >
              ${renderIcon('archive', { size: 16 })}
            </button>
            <button 
              class="btn-icon-danger btn-delete-event-card" 
              data-event-id="${evt.id}" 
              data-event-title="${evt.title}"
              title="Eliminar evento"
            >
              ${renderIcon('trash', { size: 16 })}
            </button>
          </div>
        </div>

        <!-- Barra de Progreso de Recaudación -->
        <div class="event-progress-section">
          <div class="event-progress-labels">
            <span>Meta de Recaudación</span>
            <span class="text-emerald"><strong>${collectionPercent}%</strong> (${formatCurrency(totals.totalCollected)})</span>
          </div>
          <div class="progress-track-glass">
            <div class="progress-fill-emerald" style="width: ${collectionPercent}%;"></div>
          </div>
        </div>

        <!-- 4 Indicadores Rápidos -->
        <div class="event-metrics-row">
          <div class="event-metric-cell">
            <span class="cell-label">Gastado</span>
            <span class="cell-val">${formatCurrency(totals.totalExpenses)}</span>
          </div>
          <div class="event-metric-cell">
            <span class="cell-label">Por Cobrar</span>
            <span class="cell-val text-amber">${formatCurrency(totals.totalPendingToCollect)}</span>
          </div>
          <div class="event-metric-cell">
            <span class="cell-label">En Caja</span>
            <span class="cell-val text-cyan">${formatCurrency(totals.cashInHand)}</span>
          </div>
          <div class="event-metric-cell">
            <span class="cell-label">Familias</span>
            <span class="cell-val">${totals.subFamilies.length}</span>
          </div>
        </div>

        <div class="event-card-footer">
          <div class="event-members-pill">
            ${renderIcon('users', { size: 14 })}
            <span>${totals.totalAttendingCount} de ${totals.totalParticipantsCount} asistentes</span>
          </div>
          <a href="#/event/${evt.id}" class="btn-pill-primary enter-dashboard-btn">
            <span>Abrir Dashboard</span>
            ${renderIcon('arrow-right', { size: 14 })}
          </a>
        </div>
      </article>
    `;
  }).join('');

  return `
    <div class="events-view-container">
      ${searchFilterBarHtml}
      <div class="events-grid-responsive">
        ${eventCardsHtml}
      </div>
    </div>
  `;
};
