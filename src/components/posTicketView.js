/**
 * ChapApp - Vista Particionada de Cuentas y Tickets de Cobro POS por Subfamilia
 * Master-Detail 2 Columnas: Panel Interactivo de Subfamilias (Izquierda) + Ticket POS con Invitados y Switches (Derecha)
 */

import { formatCurrency, calculateEventTotals, roundToTwoDecimals } from '../utils/calculations.js';
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

  // Invitados calculados y métricas directamente del motor contable
  const calculatedGuests = activeSf.guests || [];
  const guestsTotalCost = activeSf.guestsTotalCost || 0;
  const baseProportionalShare = activeSf.membersProportionalShare || 0;
  const baseTotalPaid = activeSf.totalPaid || 0;
  const grossTotalQuota = activeSf.proportionalShare || 0;
  const finalBalance = activeSf.finalBalance || 0;

  const isRefund = finalBalance < 0;
  const isOwed = finalBalance > 0;
  const balanceTitle = isRefund
    ? 'Reembolso a Devolver'
    : isOwed
    ? 'Saldo a Entregar en Caja'
    : 'Cuenta en Tablas ($0.00)';
  const balanceColorClass = isRefund ? 'text-refund' : isOwed ? 'text-owed' : 'text-even';

  // 1. Items de la Columna Izquierda (Master List de Subfamilias)
  const masterItemsHtml = subFamilies.map((sf) => {
    const isSelected = sf.subFamilyName === activeSubFamilyName;
    const sfFinalBal = sf.finalBalance;
    const sfIsRefund = sfFinalBal < 0;
    const sfIsOwed = sfFinalBal > 0;
    const badgeText = sfIsRefund
      ? `-${formatCurrency(Math.abs(sfFinalBal))}`
      : sfIsOwed
      ? `+${formatCurrency(sfFinalBal)}`
      : '$0.00';

    const badgeClass = sfIsRefund ? 'badge-refund' : sfIsOwed ? 'badge-owed' : 'badge-even';
    const statusLabel = sfIsRefund ? 'Reembolso' : sfIsOwed ? 'Por pagar' : 'Al día';

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
          <span class="sf-icon-badge">${renderIcon('users', { size: 16 })}</span>
        </div>
        
        <div class="master-item-content-col">
          <div class="master-item-title-row">
            <span class="master-item-name">${sf.subFamilyName}</span>
            ${sf.isFullySettled ? `<span class="sf-item-check-pill" title="100% Liquidada">${renderIcon('check', { size: 12 })} Liquidada</span>` : ''}
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

  // 2. Filas de Integrantes Registrados con Switch de Asistencia
  const membersListHtml = activeSf.participantIds.map((pId) => {
    const p = totals.byParticipantId[pId];
    if (!p) return '';

    return `
      <div class="pos-member-row glass-panel ${!p.isAttending ? 'is-absent' : ''}">
        <div class="member-name-col">
          <div class="member-title-line">
            <strong class="member-display-name">${renderIcon('user', { size: 14 })} ${p.participantName}</strong>
            ${!p.isAttending ? '<span class="badge-absent-mini">No Asiste</span>' : ''}
          </div>
          <div class="member-badges-row">
            <span class="badge-pill badge-neutral">${p.category.toUpperCase()} (${p.weight} ud)</span>
            <span class="member-days-text">${p.activeDaysCount} días asistidos</span>
          </div>
        </div>
        <div class="member-amount-col">
          <span class="member-quota-val">${formatCurrency(p.proportionalShare)}</span>
        </div>
        <div class="member-switch-col">
          <label class="switch-toggle" title="${p.isAttending ? 'Asiste al evento' : 'No asiste'}">
            <input 
              type="checkbox" 
              class="toggle-member-attendance" 
              data-participant-id="${p.participantId}"
              data-event-id="${event.id}"
              ${p.isAttending ? 'checked' : ''}
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  }).join('');

  // 3. Filas de Invitados Temporales
  const guestsListHtml = calculatedGuests.map((g) => `
    <div class="pos-guest-row glass-panel">
      <div class="guest-name-col">
        <div class="guest-title-line">
          <strong>${renderIcon('receipt', { size: 14 })} ${g.name}</strong>
          <span class="badge-pill badge-cyan">Temporal</span>
        </div>
        <div class="member-badges-row">
          <span class="badge-pill badge-neutral">${g.category.toUpperCase()} (${g.weight} ud)</span>
          <span class="member-days-text">${g.daysCount} días</span>
        </div>
      </div>
      <div class="guest-amount-col">
        <span class="guest-quota-val">${formatCurrency(g.cost)}</span>
      </div>
      <div class="guest-remove-col">
        <button type="button" class="btn-icon-danger btn-remove-guest" data-guest-id="${g.id}" data-subfamily="${activeSf.subFamilyName}" title="Eliminar invitado">
          ${renderIcon('trash', { size: 14 })}
        </button>
      </div>
    </div>
  `).join('');

  return `
    <section class="pos-split-layout">
      <!-- Columna Izquierda: Panel Maestro Interactivo de Subfamilias -->
      <aside class="pos-master-col glass-panel">
        <div class="pos-master-header">
          <div class="master-header-title-row">
            <h4 class="pos-master-title">Subfamilias del Evento</h4>
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
          <!-- Cabecera del Ticket POS -->
          <div class="ticket-header">
            <div class="ticket-family-title-group">
              <span class="ticket-badge-tag">TICKET DE COBRO POS</span>
              <h2 class="ticket-family-name">${activeSf.subFamilyName}</h2>
              <p class="ticket-family-sub">
                ${activeSf.attendingCount} asistentes (${activeSf.membersCount} integrantes${calculatedGuests.length > 0 ? ` + ${calculatedGuests.length} invitados` : ''}) • ${activeSf.totalWeightedUnits} uds ponderadas
              </p>
            </div>
            
            <div class="ticket-status-group">
              <span class="ticket-status-pill ${activeSf.isFullySettled ? 'settled' : 'pending'}">
                ${activeSf.isFullySettled ? `${renderIcon('check', { size: 14 })} Familia 100% Liquidada` : `${renderIcon('clock', { size: 14 })} Pendiente de Liquidar`}
              </span>
            </div>
          </div>

          <!-- 3 Métricas HUD del Ticket Familiar -->
          <div class="ticket-metrics-row">
            <div class="metric-mini-box">
              <span class="metric-mini-label">1. Cuota Proporcional</span>
              <span class="metric-mini-val">${formatCurrency(grossTotalQuota)}</span>
            </div>
            <div class="metric-mini-box">
              <span class="metric-mini-label">2. Compras de su Cartera</span>
              <span class="metric-mini-val">${formatCurrency(baseTotalPaid)}</span>
            </div>
            <div class="metric-mini-box highlight-balance">
              <span class="metric-mini-label">3. ${balanceTitle}</span>
              <span class="metric-mini-val ${balanceColorClass}">${formatCurrency(Math.abs(finalBalance))}</span>
            </div>
          </div>

          <!-- Banner Informativo si la cuenta está 100% saldada -->
          ${activeSf.isFullySettled ? `
            <div class="ticket-settled-banner glass-panel">
              <span class="settled-dot"></span>
              <span>Esta cuenta familiar se encuentra 100% saldada y registrada en la caja común.</span>
            </div>
          ` : ''}

          <!-- Split Grid en 2 Columnas: Integrantes & Invitados (Izquierda) vs Desglose & Liquidación (Derecha) -->
          <div class="ticket-body-split-grid">
            <!-- Columna Izquierda: Integrantes Registrados e Invitados -->
            <div class="ticket-members-col">
              <!-- Sección 1: Integrantes Registrados y Switch de Asistencia -->
              <div class="ticket-section-block">
                <div class="ticket-section-header">
                  <span class="ticket-section-title">
                    ${renderIcon('users', { size: 16 })} Integrantes Registrados (${activeSf.membersCount})
                  </span>
                  <span class="ticket-section-hint">Switch de Asistencia</span>
                </div>

                <div class="ticket-members-list">
                  ${membersListHtml}
                </div>
              </div>

              <!-- Sección 2: Invitados Temporales -->
              <div class="ticket-section-block">
                <div class="ticket-section-header">
                  <span class="ticket-section-title">
                    ${renderIcon('user-plus', { size: 16 })} Invitados Temporales (${calculatedGuests.length})
                  </span>
                  <button type="button" id="btn-open-add-guest-form" class="btn-pill-cyan btn-sm">
                    ${renderIcon('plus', { size: 14 })}
                    <span>Agregar Invitado</span>
                  </button>
                </div>

                <!-- Formulario Desplegable para Agregar Invitado Temporal -->
                <div id="form-inline-add-guest" class="glass-panel inline-guest-form" style="display: none;">
                  <h5 class="inline-form-title">Sumar Invitado Temporal a ${activeSf.subFamilyName}</h5>
                  <div class="inline-form-grid">
                    <div class="form-group">
                      <label for="input-guest-name">Nombre o Referencia *</label>
                      <input type="text" id="input-guest-name" class="glass-input" placeholder="ej. Primo Carlos" autocomplete="off" />
                    </div>
                    <div class="form-group">
                      <label for="select-guest-category">Categoría</label>
                      <select id="select-guest-category" class="glass-select">
                        <option value="adulto">Adulto (1.0 ud)</option>
                        <option value="nino">Niño (0.5 ud)</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="input-guest-days">Días Asistidos</label>
                      <input type="number" id="input-guest-days" class="glass-input" value="${event.availableDays?.length || 4}" min="1" max="14" />
                    </div>
                  </div>
                  <div class="inline-form-actions">
                    <button type="button" id="btn-cancel-add-guest" class="btn-pill-glass btn-sm">Cancelar</button>
                    <button type="button" id="btn-save-add-guest" class="btn-pill-cyan btn-sm" data-subfamily="${activeSf.subFamilyName}">
                      ${renderIcon('plus', { size: 14 })}
                      <span>Sumar al Cálculo</span>
                    </button>
                  </div>
                </div>

                <div class="ticket-guests-list">
                  ${calculatedGuests.length === 0 
                    ? '<p class="empty-guest-text">Sin invitados adicionales. Toca "+ Agregar Invitado" para sumarlos al cálculo.</p>' 
                    : guestsListHtml}
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Desglose Matemático, Liquidación y Acciones -->
            <div class="ticket-calc-col">
              <!-- Sección 3: Desglose Matemático -->
              <div class="ticket-section-block">
                <div class="math-breakdown-card glass-panel">
                  <div class="breakdown-header">
                    <span class="breakdown-tag">${renderIcon('chart', { size: 14 })} DESGLOSE MATEMÁTICO</span>
                  </div>
                  <div class="breakdown-table-rows">
                    <div class="breakdown-item-row">
                      <span class="breakdown-label">Cuota Integrantes Fijos (${activeSf.attendingCount - calculatedGuests.length} activos)</span>
                      <strong class="breakdown-val">${formatCurrency(baseProportionalShare)}</strong>
                    </div>
                    ${guestsTotalCost > 0 ? `
                      <div class="breakdown-item-row text-cyan">
                        <span class="breakdown-label">+ Cuota Invitados Temporales (${calculatedGuests.length})</span>
                        <strong class="breakdown-val">+${formatCurrency(guestsTotalCost)}</strong>
                      </div>
                    ` : ''}
                    <div class="breakdown-item-row total-gross-row">
                      <span class="breakdown-label">Cuota Total Bruta</span>
                      <strong class="breakdown-val">${formatCurrency(grossTotalQuota)}</strong>
                    </div>
                    <div class="breakdown-item-row text-emerald">
                      <span class="breakdown-label">- Aportes en Compras (Bolsillo)</span>
                      <strong class="breakdown-val">-${formatCurrency(baseTotalPaid)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sección 4: Gran Caja de Liquidación al Fondo -->
              <div class="settlement-bottom-card ${activeSf.isFullySettled ? 'settled-card' : 'pending-card'} glass-panel">
                <div class="settlement-card-header">
                  <span class="settlement-badge-label">
                    ${activeSf.isFullySettled 
                      ? 'CUENTA SALDADA Y REGISTRADA' 
                      : isRefund 
                      ? 'REEMBOLSO A FAVOR DE LA FAMILIA' 
                      : 'SALDO A ENTREGAR EN CAJA'}
                  </span>
                </div>
                
                <div class="settlement-card-amount ${activeSf.isFullySettled ? 'text-emerald' : balanceColorClass}">
                  ${formatCurrency(Math.abs(finalBalance))}
                </div>
                
                <p class="settlement-card-subtext">
                  ${activeSf.isFullySettled 
                    ? `El saldo de ${formatCurrency(Math.abs(finalBalance))} ya fue recibido/entregado y liquidado en caja.` 
                    : isRefund 
                    ? `Fondo común debe devolver ${formatCurrency(Math.abs(finalBalance))} a los integrantes de esta familia.` 
                    : `Pendiente de recibir ${formatCurrency(Math.abs(finalBalance))} para ingresar a la caja general.`}
                </p>

                <div class="settlement-card-action-box">
                  <button 
                    id="btn-toggle-sf-settle" 
                    class="${activeSf.isFullySettled ? 'btn-reopen-account btn-pill-glass' : 'btn-settle-account btn-pill-cyan'}"
                    data-subfamily="${activeSf.subFamilyName}"
                    data-event-id="${event.id}"
                    data-settled="${activeSf.isFullySettled}"
                  >
                    ${activeSf.isFullySettled 
                      ? `${renderIcon('refresh', { size: 16 })} <span>Reabrir Cuenta</span>` 
                      : `${renderIcon('check', { size: 18 })} <span>Liquidar Cuenta en Caja</span>`}
                  </button>
                </div>
              </div>

              <!-- Sección 5: Acciones Rápidas de Exportación -->
              <div class="ticket-actions-bar">
                <button 
                  id="btn-share-sf-whatsapp" 
                  class="btn-pill-whatsapp"
                  data-subfamily="${activeSf.subFamilyName}"
                >
                  ${renderIcon('whatsapp', { size: 18 })}
                  <span>Compartir WhatsApp</span>
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
          </div>
        </div>
      </main>
    </section>
  `;
};
