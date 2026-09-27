/**
 * ChapApp - Vista del Dashboard del Evento (3 Pestañas Integradas)
 */

import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { renderIcon } from '../utils/icons.js';
import { renderCollectionDial, renderCategory3DBars } from './charts.js';
import { renderPosTicketView } from './posTicketView.js';
import { store } from '../state/store.js';

export const renderEventDashboard = (event) => {
  if (!event) {
    return `
      <div class="empty-state-box glass-panel">
        <h3>Evento no encontrado</h3>
        <a href="#/" class="btn-pill-primary">Volver al inicio</a>
      </div>
    `;
  }

  const { activeDashboardTab = 'summary', selectedSubFamily = null } = store.getState();
  const totals = calculateEventTotals(event);
  const collectionPercent =
    totals.totalToCollect > 0
      ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
      : 100;

  // 1. Barra de Navegación por Pestañas (Estilo Cápsula Liquid Glass)
  const navTabsHtml = `
    <nav class="dashboard-tabs-bar glass-panel" aria-label="Secciones del evento">
      <button 
        class="dash-tab-btn ${activeDashboardTab === 'summary' ? 'active' : ''}" 
        data-tab="summary"
      >
        ${renderIcon('chart', { size: 18 })}
        <span>1. Resumen y Cuadre</span>
      </button>
      <button 
        class="dash-tab-btn ${activeDashboardTab === 'subfamilies' ? 'active' : ''}" 
        data-tab="subfamilies"
      >
        ${renderIcon('users', { size: 18 })}
        <span>2. Subfamilias y Asistencia</span>
        <span class="tab-badge">${event.participants?.length || 0}</span>
      </button>
      <button 
        class="dash-tab-btn ${activeDashboardTab === 'expenses' ? 'active' : ''}" 
        data-tab="expenses"
      >
        ${renderIcon('receipt', { size: 18 })}
        <span>3. Gastos Registrados</span>
        <span class="tab-badge">${event.expenses?.length || 0}</span>
      </button>
    </nav>
  `;

  // 2. Contenido según la pestaña activa
  let tabContentHtml = '';

  if (activeDashboardTab === 'summary') {
    // --- TAB 1: RESUMEN Y CUADRE ---
    tabContentHtml = `
      <div class="tab-summary-content animate-fade-in">
        <!-- 4 Tarjetas HUD Métricas Superiores -->
        <div class="hud-metrics-grid">
          <div class="hud-metric-card glass-panel metric-cyan">
            <div class="hud-header">
              <span class="hud-label">TOTAL GASTADO</span>
              <span class="hud-icon">${renderIcon('receipt', { size: 16 })}</span>
            </div>
            <div class="hud-value">${formatCurrency(totals.totalExpenses)}</div>
            <div class="hud-sub">${event.expenses?.length || 0} compras registradas</div>
          </div>

          <div class="hud-metric-card glass-panel metric-emerald">
            <div class="hud-header">
              <span class="hud-label">RECAUDADO</span>
              <span class="hud-icon">${renderIcon('trending-up', { size: 16 })}</span>
            </div>
            <div class="hud-value text-emerald">${formatCurrency(totals.totalCollected)}</div>
            <div class="hud-sub"><span class="badge-emerald">${collectionPercent}% de la meta</span></div>
          </div>

          <div class="hud-metric-card glass-panel metric-amber">
            <div class="hud-header">
              <span class="hud-label">PENDIENTE POR COBRAR</span>
              <span class="hud-icon">${renderIcon('wallet', { size: 16 })}</span>
            </div>
            <div class="hud-value text-amber">${formatCurrency(totals.totalPendingToCollect)}</div>
            <div class="hud-sub">${totals.subFamilies.filter((sf) => !sf.isFullySettled).length} familias pendientes</div>
          </div>

          <div class="hud-metric-card glass-panel metric-purple">
            <div class="hud-header">
              <span class="hud-label">EN CAJA (FONDO EN MANO)</span>
              <span class="hud-icon">${renderIcon('cash', { size: 16 })}</span>
            </div>
            <div class="hud-value text-cyan">${formatCurrency(totals.cashInHand)}</div>
            <div class="hud-sub">Líquido disponible</div>
          </div>
        </div>

        <!-- Barra de Botones Rápidos de Reporte -->
        <div class="summary-action-shortcuts">
          <button id="btn-share-whatsapp-summary" class="btn-pill-whatsapp">
            ${renderIcon('whatsapp', { size: 18 })}
            <span>WhatsApp Resumen</span>
          </button>
          <button id="btn-open-cut-modal-shortcut" class="btn-pill-primary">
            ${renderIcon('receipt', { size: 16 })}
            <span>Resumen de Liquidación</span>
          </button>
        </div>

        <!-- 2 Gráficas HUD: Dial Circular + 3D Bar Cylinders -->
        <div class="charts-row-grid">
          ${renderCollectionDial(totals.totalCollected, totals.totalExpenses, collectionPercent)}
          ${renderCategory3DBars(event.expenses, totals.totalExpenses)}
        </div>

        <!-- Cuentas y Tickets de Cobro POS -->
        <div class="section-title-box">
          <h3 class="section-heading">Cuentas y Tickets de Cobro POS</h3>
          <p class="section-subheading">Selecciona una subfamilia para ajustar asistencia, liquidar o enviar su ticket individual.</p>
        </div>

        ${renderPosTicketView(event, selectedSubFamily)}
      </div>
    `;
  } else if (activeDashboardTab === 'subfamilies') {
    // --- TAB 2: SUBFAMILIAS Y CONTROL DE ASISTENCIA ---
    const participants = event.participants || [];
    const groupedBySf = {};

    participants.forEach((p) => {
      const sf = p.subFamily || 'Familia General';
      if (!groupedBySf[sf]) groupedBySf[sf] = [];
      groupedBySf[sf].push(p);
    });

    const sfCardsHtml = Object.keys(groupedBySf).sort().map((sfName) => {
      const parts = groupedBySf[sfName];
      const attendingCount = parts.filter((p) => p.isAttending).length;

      const membersListHtml = parts.map((p) => {
        const availableDays = event.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
        const dayChipsHtml = availableDays.map((d) => {
          const isDayActive = Array.isArray(p.activeDays) && p.activeDays.includes(d);
          return `
            <button 
              class="day-chip-btn ${isDayActive ? 'active' : ''} ${!p.isAttending ? 'disabled' : ''}"
              data-participant-id="${p.id}"
              data-day="${d}"
              ${!p.isAttending ? 'disabled' : ''}
              title="${isDayActive ? `Desmarcar ${d}` : `Marcar ${d}`}"
            >
              ${d}
            </button>
          `;
        }).join('');

        return `
          <div class="participant-card-item glass-panel ${!p.isAttending ? 'item-absent' : ''}">
            <div class="participant-info-col">
              <div class="participant-name-row">
                <span class="participant-name">👤 ${p.name}</span>
                <span class="badge-pill badge-neutral">${p.category.toUpperCase()} (${p.weight || (p.category === 'nino' ? 0.5 : 1.0)})</span>
              </div>
              <div class="days-chips-row">
                ${dayChipsHtml}
              </div>
            </div>

            <div class="participant-actions-col">
              <button 
                class="btn-toggle-attendance ${p.isAttending ? 'attending' : 'absent'}"
                data-participant-id="${p.id}"
                data-event-id="${event.id}"
                data-attending="${p.isAttending}"
              >
                ${p.isAttending ? '✓ Asiste' : '❌ Falta'}
              </button>
              <button 
                class="btn-icon-danger btn-delete-participant"
                data-participant-id="${p.id}"
                data-participant-name="${p.name}"
                data-event-id="${event.id}"
                title="Eliminar participante"
              >
                ${renderIcon('trash', { size: 16 })}
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="subfamily-group-card glass-panel">
          <div class="sf-group-header">
            <div>
              <h4 class="sf-group-title">🏡 ${sfName}</h4>
              <span class="sf-group-stats">${attendingCount} asistentes de ${parts.length} integrantes</span>
            </div>
          </div>
          <div class="sf-members-list">
            ${membersListHtml}
          </div>
        </div>
      `;
    }).join('');

    tabContentHtml = `
      <div class="tab-subfamilies-content animate-fade-in">
        <div class="tab-actions-header">
          <div class="section-title-box">
            <h3 class="section-heading">Subfamilias y Control de Asistencia</h3>
            <p class="section-subheading">Gestiona integrantes, días activos y presencia para el prorrateo automático.</p>
          </div>
          <div class="tab-buttons-group">
            <button id="btn-open-directory-import" class="btn-pill-glass">
              ${renderIcon('users', { size: 16 })}
              <span>Importar del Directorio</span>
            </button>
            <button id="btn-add-participant-modal" class="btn-pill-primary">
              ${renderIcon('plus', { size: 16 })}
              <span>Agregar Integrante</span>
            </button>
          </div>
        </div>

        <div class="subfamilies-grid">
          ${sfCardsHtml || '<p class="empty-text">No hay integrantes registrados en este evento.</p>'}
        </div>
      </div>
    `;
  } else if (activeDashboardTab === 'expenses') {
    // --- TAB 3: GASTOS REGISTRADOS ---
    const expenses = event.expenses || [];
    const participants = event.participants || [];

    const expenseCardsHtml = expenses.map((exp) => {
      const payer = participants.find((p) => p.id === exp.paidBy);
      const payerName = payer ? payer.name : 'Caja General';

      return `
        <div class="expense-card-item glass-panel animate-fade-in">
          <div class="expense-icon-box">
            ${renderIcon('receipt', { size: 20 })}
          </div>
          <div class="expense-details-col">
            <h4 class="expense-title">${exp.title}</h4>
            <div class="expense-meta-row">
              <span class="badge-pill badge-category">${exp.category || 'Comida'}</span>
              <span class="expense-payer">Pagado por: <strong>${payerName}</strong></span>
            </div>
          </div>
          <div class="expense-amount-col">
            <span class="expense-amount-val">${formatCurrency(exp.amount)}</span>
            <button 
              class="btn-icon-danger btn-delete-expense"
              data-expense-id="${exp.id}"
              data-expense-title="${exp.title}"
              data-event-id="${event.id}"
              title="Eliminar gasto"
            >
              ${renderIcon('trash', { size: 16 })}
            </button>
          </div>
        </div>
      `;
    }).join('');

    tabContentHtml = `
      <div class="tab-expenses-content animate-fade-in">
        <div class="tab-actions-header">
          <div class="section-title-box">
            <h3 class="section-heading">Gastos Registrados</h3>
            <p class="section-subheading">Total gastado: ${formatCurrency(totals.totalExpenses)} en ${expenses.length} compras.</p>
          </div>
          <div class="tab-buttons-group">
            <button id="btn-open-csv-import" class="btn-pill-glass">
              ${renderIcon('upload', { size: 16 })}
              <span>Importar CSV</span>
            </button>
            <button id="btn-add-expense-tab" class="btn-pill-cyan">
              ${renderIcon('plus', { size: 16 })}
              <span>+ Gasto Rápido con IA</span>
            </button>
          </div>
        </div>

        <div class="expenses-list-container">
          ${expenseCardsHtml || '<p class="empty-text">No se han registrado compras ni gastos en este evento.</p>'}
        </div>
      </div>
    `;
  }

  return `
    <div class="event-dashboard-view">
      ${navTabsHtml}
      ${tabContentHtml}
    </div>
  `;
};
