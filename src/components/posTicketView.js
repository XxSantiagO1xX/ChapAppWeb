/**
 * ChapApp - Vista Particionada de Cuentas y Tickets de Cobro POS por Subfamilia
 * Master-Detail 2 Columnas: Panel Interactivo de Subfamilias (Izquierda) + Ticket POS (Derecha)
 */

import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { renderIcon } from '../utils/icons.js';
import { store } from '../state/store.js';

export const renderPosTicketView = (event, selectedSubFamily = null) => {
  const totals = calculateEventTotals(event);
  const subFamilies = totals.subFamilies;

  if (subFamilies.length === 0) {
    return `
      <div class="glass-panel empty-state-box">
        <div class="empty-icon-circle">${renderIcon('users', { size: 36 })}</div>
        <h3 class="empty-title">No hay subfamilias registradas</h3>
        <p class="empty-description">Agrega participantes con subfamilia asignada para generar los tickets de cobro.</p>
        <button id="btn-add-participant-modal" class="btn-pill-primary" style="margin-top: 12px;">
          ${renderIcon('plus', { size: 16 })}
          <span>Agregar Primer Integrante</span>
        </button>
      </div>
    `;
  }

  // Subfamilia activa seleccionada
  const activeSubFamilyName =
    selectedSubFamily && subFamilies.some((sf) => sf.subFamilyName === selectedSubFamily)
      ? selectedSubFamily
      : subFamilies[0].subFamilyName;

  const activeSf = totals.bySubFamily[activeSubFamilyName] || subFamilies[0];

  // 1. Items de la Columna Izquierda (Master List de Subfamilias)
  const masterItemsHtml = subFamilies.map((sf) => {
    const isSelected = sf.subFamilyName === activeSubFamilyName;
    const isRefund = sf.finalBalance < 0;
    const isOwed = sf.finalBalance > 0;
    const badgeText = isRefund
      ? `-${formatCurrency(Math.abs(sf.finalBalance))}`
      : isOwed
      ? `+${formatCurrency(sf.finalBalance)}`
      : '$0.00';

    const badgeClass = isRefund ? 'badge-refund' : isOwed ? 'badge-owed' : 'badge-even';
    const statusLabel = isRefund ? 'Reembolso' : isOwed ? 'Por pagar' : 'Al día';

    // Nombres de los integrantes para facilitar la búsqueda
    const memberNames = (sf.participantIds || [])
      .map((pId) => totals.byParticipantId[pId]?.participantName || '')
      .filter(Boolean);

    return `
      <div 
        class="pos-master-item sf-pill-item ${isSelected ? 'selected' : ''}" 
        data-subfamily="${sf.subFamilyName}"
        data-members="${memberNames.join(', ').toLowerCase()}"
        role="button"
        tabindex="0"
      >
        <div class="master-item-icon-col">
          <span class="sf-icon-badge">🏡</span>
        </div>
        
        <div class="master-item-content-col">
          <div class="master-item-title-row">
            <span class="master-item-name">${sf.subFamilyName}</span>
            ${sf.isFullySettled ? '<span class="sf-item-check-pill" title="100% Liquidada">✓ Liquidada</span>' : ''}
          </div>
          
          <div class="master-item-sub-row">
            <span class="master-item-count">${sf.attendingCount} de ${sf.membersCount} asisten • ${sf.totalWeightedUnits} uds</span>
          </div>

          <div class="master-item-members-tags">
            ${memberNames.slice(0, 3).map(m => `<span class="member-tag-mini">${m}</span>`).join('')}
            ${memberNames.length > 3 ? `<span class="member-tag-mini">+${memberNames.length - 3}</span>` : ''}
          </div>
        </div>

        <div class="master-item-balance-col">
          <span class="master-item-balance ${badgeClass}">${badgeText}</span>
          <span class="master-item-status-text">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  // 2. Estado contable de la subfamilia activa
  const isRefund = activeSf.finalBalance < 0;
  const isOwed = activeSf.finalBalance > 0;
  const balanceTitle = isRefund
    ? 'Reembolso a Devolver'
    : isOwed
    ? 'Saldo a Entregar en Caja'
    : 'Cuenta en Tablas ($0.00)';

  const balanceColorClass = isRefund ? 'text-refund' : isOwed ? 'text-owed' : 'text-even';

  // 3. Tabla de integrantes de la subfamilia activa
  const membersRowsHtml = activeSf.participantIds.map((pId) => {
    const p = totals.byParticipantId[pId];
    if (!p) return '';

    const pIsRefund = p.finalBalance < 0;
    const pIsOwed = p.finalBalance > 0;
    const pBalClass = pIsRefund ? 'text-refund' : pIsOwed ? 'text-owed' : 'text-even';
    const pBalText = pIsRefund
      ? `Reembolso ${formatCurrency(Math.abs(p.finalBalance))}`
      : pIsOwed
      ? `Debe ${formatCurrency(p.finalBalance)}`
      : 'En tablas ($0.00)';

    return `
      <tr class="member-row ${!p.isAttending ? 'row-absent' : ''}">
        <td class="col-member-name">
          <div class="member-title-box">
            <strong>👤 ${p.participantName}</strong>
            ${!p.isAttending ? '<span class="badge-absent">❌ No Asistió</span>' : ''}
          </div>
          <div class="member-meta-chips">
            <span class="member-category-chip">${p.category.toUpperCase()} (${p.weight || (p.category === 'nino' ? 0.5 : 1.0)} ud)</span>
            <span class="member-days-chip">📅 ${p.activeDaysCount} días</span>
          </div>
        </td>
        <td class="col-num">${formatCurrency(p.proportionalShare)}</td>
        <td class="col-num">${formatCurrency(p.totalPaid)}</td>
        <td class="col-num ${pBalClass}"><strong>${pBalText}</strong></td>
        <td class="col-action" style="text-align: center;">
          <button 
            class="btn-toggle-settle ${p.isSettled ? 'settled' : 'pending'}"
            data-participant-id="${p.participantId}"
            data-event-id="${event.id}"
            data-settled="${p.isSettled}"
            title="${p.isSettled ? 'Marcar como pendiente' : 'Marcar como pagado/liquidado'}"
          >
            ${p.isSettled ? '✓ Liquidado' : '⏳ Pendiente'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <section class="pos-split-layout">
      <!-- Columna Izquierda: Panel Maestro Interactivo de Subfamilias -->
      <aside class="pos-master-col glass-panel">
        <div class="pos-master-header">
          <div class="master-header-title-row">
            <h4 class="pos-master-title">🏡 Familias del Evento</h4>
            <span class="badge-pill badge-cyan">${subFamilies.length}</span>
          </div>
          <p class="pos-master-sub">Selecciona una familia para consultar o liquidar</p>
          
          <div class="pos-master-search-box">
            <span class="search-icon">${renderIcon('search', { size: 14 })}</span>
            <input 
              type="text" 
              id="pos-master-search" 
              class="glass-input-search sm" 
              placeholder="Buscar familia o integrante..." 
              autocomplete="off" 
            />
          </div>
        </div>

        <div class="pos-master-list-scroll" id="pos-subfamily-master-list">
          ${masterItemsHtml}
        </div>

        <div class="pos-master-footer">
          <button id="btn-add-participant-modal" class="btn-pill-glass btn-block-sm">
            ${renderIcon('plus', { size: 14 })}
            <span>+ Nuevo Integrante</span>
          </button>
        </div>
      </aside>

      <!-- Columna Derecha: Ticket de Cobro POS de la Subfamilia Seleccionada -->
      <main class="pos-detail-col">
        <div class="pos-ticket-card glass-panel animate-fade-in">
          <div class="ticket-header">
            <div class="ticket-family-title-group">
              <span class="ticket-badge-tag">TICKET DE COBRO POS</span>
              <h2 class="ticket-family-name">🏡 ${activeSf.subFamilyName}</h2>
              <p class="ticket-family-sub">
                ${activeSf.attendingCount} asistentes de ${activeSf.membersCount} integrantes • ${activeSf.totalWeightedUnits} uds ponderadas
              </p>
            </div>
            
            <div class="ticket-status-group">
              <button 
                id="btn-toggle-sf-settle" 
                class="btn-pill-action ${activeSf.isFullySettled ? 'btn-settled-success' : 'btn-settle-action'}"
                data-subfamily="${activeSf.subFamilyName}"
                data-event-id="${event.id}"
                data-settled="${activeSf.isFullySettled}"
              >
                ${activeSf.isFullySettled ? '✓ Familia 100% Liquidada' : 'Marcar Familia como Liquidada'}
              </button>
            </div>
          </div>

          <!-- 3 Métricas HUD del Ticket Familiar -->
          <div class="ticket-metrics-row">
            <div class="metric-mini-box">
              <span class="metric-mini-label">1. Cuota Proporcional</span>
              <span class="metric-mini-val">${formatCurrency(activeSf.proportionalShare)}</span>
            </div>
            <div class="metric-mini-box">
              <span class="metric-mini-label">2. Compras de su Cartera</span>
              <span class="metric-mini-val">${formatCurrency(activeSf.totalPaid)}</span>
            </div>
            <div class="metric-mini-box highlight-balance">
              <span class="metric-mini-label">3. ${balanceTitle}</span>
              <span class="metric-mini-val ${balanceColorClass}">${formatCurrency(Math.abs(activeSf.finalBalance))}</span>
            </div>
          </div>

          <!-- Tabla detallada de integrantes -->
          <div class="ticket-table-wrapper">
            <table class="pos-table">
              <thead>
                <tr>
                  <th>Integrante</th>
                  <th class="col-num">Cuota</th>
                  <th class="col-num">Compras Pagadas</th>
                  <th class="col-num">Saldo Neto</th>
                  <th style="text-align: center;">Estatus</th>
                </tr>
              </thead>
              <tbody>
                ${membersRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Acciones rápidas de exportación del Ticket -->
          <div class="ticket-actions-bar">
            <button 
              id="btn-share-sf-whatsapp" 
              class="btn-pill-whatsapp"
              data-subfamily="${activeSf.subFamilyName}"
            >
              ${renderIcon('whatsapp', { size: 18 })}
              <span>Enviar Ticket por WhatsApp</span>
            </button>
            <button 
              id="btn-print-sf-ticket" 
              class="btn-pill-glass"
              data-subfamily="${activeSf.subFamilyName}"
            >
              ${renderIcon('print', { size: 16 })}
              <span>Imprimir Ticket POS</span>
            </button>
          </div>
        </div>
      </main>
    </section>
  `;
};
