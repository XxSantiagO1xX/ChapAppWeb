/**
 * ChapApp - Vista del Dashboard del Evento (Menú Lateral Flotante en Cápsula y 3 Pestañas Integradas)
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
        <div class="empty-icon-circle">${renderIcon('alert', { size: 36 })}</div>
        <h3 class="empty-title">Evento no encontrado</h3>
        <p class="empty-description">El evento seleccionado no existe o fue eliminado.</p>
        <a href="#/" class="btn-pill-primary">Volver al inicio</a>
      </div>
    `;
  }

  const { activeDashboardTab = 'summary', selectedSubFamily = null, isSidebarCollapsed = false } = store.getState();
  const totals = calculateEventTotals(event);
  const collectionPercent =
    totals.totalToCollect > 0
      ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
      : 100;

  // 1. Barra Lateral Flotante en Forma de Cápsula (Left Floating Capsule Sidebar)
  const capsuleSidebarHtml = `
    <aside id="floating-capsule-sidebar" class="floating-capsule-sidebar glass-panel ${isSidebarCollapsed ? 'collapsed' : ''}" aria-label="Navegación del evento">
      <!-- Botón Colapsar / Expandir Barra Lateral (Desktop/Tablet) -->
      <button id="btn-toggle-capsule-sidebar" class="capsule-toggle-btn" title="${isSidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}">
        ${renderIcon(isSidebarCollapsed ? 'chevron-right' : 'chevron-left', { size: 14 })}
      </button>

      <!-- Grupo de Pestañas en Cápsula -->
      <div class="capsule-tabs-group">
        <!-- Tab 1: Corte y Tickets -->
        <button 
          class="capsule-tab-item dash-tab-btn ${activeDashboardTab === 'summary' ? 'active' : ''}" 
          data-tab="summary"
          title="1. Corte y Tickets POS"
        >
          <div class="capsule-icon-box">
            ${renderIcon('chart', { size: 19 })}
          </div>
          <div class="capsule-text-box">
            <span class="capsule-tab-title">Corte y Tickets</span>
            <span class="capsule-tab-sub">Métricas & POS</span>
          </div>
        </button>

        <!-- Tab 2: Subfamilias y Asistencia -->
        <button 
          class="capsule-tab-item dash-tab-btn ${activeDashboardTab === 'subfamilies' ? 'active' : ''}" 
          data-tab="subfamilies"
          title="2. Subfamilias y Asistencia"
        >
          <div class="capsule-icon-box">
            ${renderIcon('users', { size: 19 })}
          </div>
          <div class="capsule-text-box">
            <span class="capsule-tab-title">Subfamilias</span>
            <span class="capsule-tab-sub">${totals.totalAttendingCount} de ${event.participants?.length || 0} asisten</span>
          </div>
          <span class="capsule-count-badge">${event.participants?.length || 0}</span>
        </button>

        <!-- Tab 3: Gastos e Insumos -->
        <button 
          class="capsule-tab-item dash-tab-btn ${activeDashboardTab === 'expenses' ? 'active' : ''}" 
          data-tab="expenses"
          title="3. Gastos Registrados"
        >
          <div class="capsule-icon-box">
            ${renderIcon('receipt', { size: 19 })}
          </div>
          <div class="capsule-text-box">
            <span class="capsule-tab-title">Gastos</span>
            <span class="capsule-tab-sub">${formatCurrency(totals.totalExpenses)}</span>
          </div>
          <span class="capsule-count-badge">${event.expenses?.length || 0}</span>
        </button>
      </div>

      <!-- Accesos Rápidos de Acción en la Cápsula -->
      <div class="capsule-shortcuts-group">
        <button id="btn-capsule-add-expense" class="capsule-shortcut-btn btn-pill-cyan" title="Registrar Gasto con IA">
          ${renderIcon('plus', { size: 15 })}
          <span class="shortcut-label">Gasto IA</span>
        </button>
        <button id="btn-capsule-directory" class="capsule-shortcut-btn btn-pill-glass" title="Directorio Global">
          ${renderIcon('users', { size: 15 })}
          <span class="shortcut-label">Directorio</span>
        </button>
      </div>
    </aside>
  `;

  // 2. Contenido según la pestaña activa
  let tabContentHtml = '';

  if (activeDashboardTab === 'summary') {
    // --- TAB 1: RESUMEN, CUADRE Y TICKETS POS ---
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

        <!-- 2 Gráficas HUD Liquid Glass 3D -->
        <div class="charts-row-grid">
          ${renderCollectionDial(totals.totalCollected, totals.totalExpenses, collectionPercent)}
          ${renderCategory3DBars(event.expenses, totals.totalExpenses)}
        </div>

        <!-- Cuentas y Tickets de Cobro POS -->
        <div class="section-title-box">
          <h3 class="section-heading">Cuentas y Tickets de Cobro POS</h3>
          <p class="section-subheading">Panel interactivo de subfamilias y emisión de tickets de cobro individuales.</p>
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
      const sfCalc = totals.bySubFamily[sfName];
      const attendingCount = parts.filter((p) => p.isAttending).length;
      const allAttending = attendingCount === parts.length;
      const isFamilyPaid = sfCalc ? sfCalc.isFullySettled : (parts.length > 0 && parts.every((p) => p.isSettled));

      const membersListHtml = parts.map((p) => {
        const availableDays = event.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
        const isChild = p.category === 'nino';
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
          <div class="participant-card-item glass-panel ${!p.isAttending ? 'item-absent' : ''}" data-member-name="${p.name.toLowerCase()}">
            <div class="participant-info-col">
              <div class="participant-name-row">
                <span class="participant-name">👤 ${p.name}</span>
                
                <!-- Botón de Cambio Rápido de Tarifa (Adulto 1.0 <-> Niño 0.5) -->
                <button 
                  class="btn-toggle-member-role ${isChild ? 'role-child' : 'role-adult'}"
                  data-participant-id="${p.id}"
                  data-category="${p.category}"
                  title="Clic para cambiar tarifa entre Adulto (1.0) y Niño (0.5)"
                >
                  ${isChild ? '👶 Niño (0.5)' : '🧑 Adulto (1.0)'}
                </button>
              </div>

              <!-- Chips de Selección de Días -->
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
                title="${p.isAttending ? 'Marcar como ausente' : 'Marcar como asistente'}"
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
        <div class="subfamily-group-card glass-panel ${isFamilyPaid ? 'sf-card-settled' : ''}" data-sf-name="${sfName.toLowerCase()}">
          <div class="sf-group-header">
            <div class="sf-title-info-group">
              <h4 class="sf-group-title">🏡 ${sfName}</h4>
              <span class="sf-group-stats">
                ${attendingCount} de ${parts.length} asisten • Saldo: <strong class="${sfCalc && sfCalc.finalBalance > 0 ? 'text-amber' : sfCalc && sfCalc.finalBalance < 0 ? 'text-emerald' : 'text-cyan'}">${sfCalc ? formatCurrency(sfCalc.finalBalance) : '$0.00'}</strong>
              </span>
            </div>

            <!-- Acciones de Cabecera de Subfamilia -->
            <div class="sf-header-actions-group">
              <button 
                class="btn-pill-glass btn-family-toggle-attendance"
                data-subfamily="${sfName}"
                data-event-id="${event.id}"
                data-target-attending="${!allAttending}"
                title="${allAttending ? 'Marcar a todos como ausentes' : 'Marcar a todos como asistentes'}"
              >
                ${allAttending ? 'Ausentes' : 'Todos Asisten'}
              </button>

              <button 
                class="btn-pill-action ${isFamilyPaid ? 'btn-settled-success' : 'btn-settle-action'} btn-family-toggle-settle"
                data-subfamily="${sfName}"
                data-event-id="${event.id}"
                data-settled="${isFamilyPaid}"
                title="${isFamilyPaid ? 'Reabrir cuenta de la subfamilia' : 'Liquidar cuenta de toda la subfamilia'}"
              >
                ${isFamilyPaid ? '✓ Liquidada' : 'Liquidar'}
              </button>

              <button 
                class="btn-icon-danger btn-family-delete"
                data-subfamily="${sfName}"
                data-event-id="${event.id}"
                title="Eliminar subfamilia completa"
              >
                ${renderIcon('trash', { size: 15 })}
              </button>
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
            <p class="section-subheading">Gestiona integrantes, tarifas (adulto/niño), días activos y presencia para el prorrateo automático.</p>
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

        <!-- Buscador de Integrantes y Familias -->
        <div class="search-input-box" style="margin-bottom: 16px;">
          <span class="search-icon">${renderIcon('search', { size: 18 })}</span>
          <input 
            type="text" 
            id="subfamilies-search-input" 
            class="glass-input-search" 
            placeholder="Buscar por nombre o familia..." 
            autocomplete="off"
          />
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
        <div class="expense-card-item glass-panel animate-fade-in" data-expense-title="${exp.title.toLowerCase()}" data-payer-name="${payerName.toLowerCase()}">
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
            <button id="btn-open-csv-modal" class="btn-pill-glass">
              ${renderIcon('upload', { size: 16 })}
              <span>Importar CSV</span>
            </button>
            <button id="btn-add-expense-tab" class="btn-pill-cyan">
              ${renderIcon('plus', { size: 16 })}
              <span>Gasto con IA</span>
            </button>
          </div>
        </div>

        <!-- Buscador de Gastos y Compras -->
        <div class="search-input-box" style="margin-bottom: 16px;">
          <span class="search-icon">${renderIcon('search', { size: 18 })}</span>
          <input 
            type="text" 
            id="expenses-search-input" 
            class="glass-input-search" 
            placeholder="Buscar por concepto o quien pagó..." 
            autocomplete="off"
          />
        </div>

        <div class="expenses-list-container">
          ${expenseCardsHtml || '<p class="empty-text">No se han registrado compras ni gastos en este evento.</p>'}
        </div>
      </div>
    `;
  }

  // Botón de Acción Flotante (+ Gasto Rápido) Fijo Permanentemente con un solo signo +
  const floatingFabHtml = `
    <button id="btn-fab-add-expense" class="floating-fab-btn btn-pill-cyan" title="Registrar Gasto Rápido con IA">
      ${renderIcon('plus', { size: 18 })}
      <span>Gasto Rápido</span>
    </button>
  `;

  return `
    <div class="dashboard-layout-container">
      ${capsuleSidebarHtml}
      <main class="dashboard-main-content">
        ${tabContentHtml}
      </main>
      ${floatingFabHtml}
    </div>
  `;
};
