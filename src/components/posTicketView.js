/**
 * ChapApp - Vista de Cuentas y Tickets de Cobro POS por Subfamilia
 */

import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { renderIcon } from '../utils/icons.js';
import { generateSubfamilyWhatsAppText, shareViaWhatsApp, printReportHtml } from '../utils/reports.js';
import { store } from '../state/store.js';

export const renderPosTicketView = (event, selectedSubFamily = null) => {
  const totals = calculateEventTotals(event);
  const subFamilies = totals.subFamilies;

  if (subFamilies.length === 0) {
    return `
      <div class="glass-panel empty-state-box">
        ${renderIcon('users', { size: 40, className: 'text-muted' })}
        <h3>No hay subfamilias registradas</h3>
        <p>Agrega participantes con subfamilia asignada para generar los tickets de cobro.</p>
      </div>
    `;
  }

  // Subfamilia activa
  const activeSubFamilyName =
    selectedSubFamily && subFamilies.some((sf) => sf.subFamilyName === selectedSubFamily)
      ? selectedSubFamily
      : subFamilies[0].subFamilyName;

  const activeSf = totals.bySubFamily[activeSubFamilyName] || subFamilies[0];

  // 1. Selector horizontal de subfamilias
  const pillsHtml = subFamilies.map((sf) => {
    const isSelected = sf.subFamilyName === activeSubFamilyName;
    const isRefund = sf.finalBalance < 0;
    const isOwed = sf.finalBalance > 0;
    const badgeText = isRefund
      ? `-${formatCurrency(Math.abs(sf.finalBalance))}`
      : isOwed
      ? `+${formatCurrency(sf.finalBalance)}`
      : '✓ $0';

    const badgeClass = isRefund ? 'badge-refund' : isOwed ? 'badge-owed' : 'badge-even';

    return `
      <button 
        class="sf-pill-item ${isSelected ? 'selected' : ''}" 
        data-subfamily="${sf.subFamilyName}"
      >
        <span class="sf-pill-name">🏡 ${sf.subFamilyName}</span>
        <span class="sf-pill-badge ${badgeClass}">${badgeText}</span>
        ${sf.isFullySettled ? '<span class="sf-pill-check">✓</span>' : ''}
      </button>
    `;
  }).join('');

  // 2. Estado contable de la subfamilia activa
  const isRefund = activeSf.finalBalance < 0;
  const isOwed = activeSf.finalBalance > 0;
  const balanceTitle = isRefund
    ? 'Reembolso a Devolver'
    : isOwed
    ? 'Saldo a Entregar en Caja'
    : 'Cuenta en Tablas';

  const balanceColorClass = isRefund ? 'text-refund' : isOwed ? 'text-owed' : 'text-even';

  // 3. Tabla de integrantes
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
          <strong>${p.participantName}</strong>
          <span class="member-category-chip">${p.category.toUpperCase()} • ${p.activeDaysCount} días</span>
          ${!p.isAttending ? '<span class="badge-absent">No Asistió</span>' : ''}
        </td>
        <td class="col-num">${formatCurrency(p.proportionalShare)}</td>
        <td class="col-num">${formatCurrency(p.totalPaid)}</td>
        <td class="col-num ${pBalClass}"><strong>${pBalText}</strong></td>
        <td class="col-action">
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
    <section class="pos-ticket-section">
      <div class="sf-pills-scroll-container">
        ${pillsHtml}
      </div>

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
                <th>Cuota</th>
                <th>Compras Pagadas</th>
                <th>Saldo Neto</th>
                <th>Estatus</th>
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
    </section>
  `;
};
