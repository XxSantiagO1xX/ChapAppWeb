/**
 * ChapApp - Vista Particionada Master-Detail de Tickets de Cobro POS (PosTicketView) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { generateSubfamilyWhatsAppText } from '../../utils/reports.js';
import { 
  updateParticipant, 
  settleSubFamily, 
  generateUUID 
} from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

const getStoredTicketGuests = () => {
  try {
    return JSON.parse(localStorage.getItem('chapapp_ticket_guests') || '{}');
  } catch (e) {
    return {};
  }
};

const setStoredTicketGuests = (data) => {
  localStorage.setItem('chapapp_ticket_guests', JSON.stringify(data));
};

export const PosTicketView = () => {
  const { 
    activeEvent, 
    selectedSubFamily, 
    setSelectedSubFamily, 
    refreshActiveEvent, 
    openModal, 
    showToast 
  } = useApp();

  const [subFamilySearch, setSubFamilySearch] = useState('');
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestCategory, setGuestCategory] = useState('adulto');
  const [guestDays, setGuestDays] = useState(activeEvent?.availableDays?.length || 4);

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent);
  const subFamilies = totals.subFamilies;

  if (subFamilies.length === 0) {
    return (
      <div className="glass-panel empty-state-box">
        <div className="empty-icon-circle">
          <Icon name="users" size={36} />
        </div>
        <h3 className="empty-title">No hay subfamilias registradas</h3>
        <p className="empty-description">Agrega participantes con subfamilia asignada para generar los tickets de cobro.</p>
        <button 
          type="button" 
          onClick={() => openModal('addParticipant')} 
          className="btn-pill-primary" 
          style={{ marginTop: '12px' }}
        >
          <Icon name="plus" size={16} />
          <span>Agregar Primer Integrante</span>
        </button>
      </div>
    );
  }

  // Subfamilia activa seleccionada
  const activeSubFamilyName =
    selectedSubFamily && subFamilies.some((sf) => sf.subFamilyName === selectedSubFamily)
      ? selectedSubFamily
      : subFamilies[0].subFamilyName;

  const activeSf = totals.bySubFamily[activeSubFamilyName] || subFamilies[0];

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

  // Toggle asistencia de participante
  const handleToggleAttendance = async (participantId) => {
    const part = activeEvent.participants?.find((p) => p.id === participantId);
    if (!part) return;

    try {
      await updateParticipant(activeEvent.id, {
        ...part,
        isAttending: !part.isAttending,
      });
      await refreshActiveEvent();
      showToast(!part.isAttending ? `${part.name} marcado como asistente` : `${part.name} marcado como ausente`, 'info');
    } catch (err) {
      console.error('Error cambiando asistencia:', err);
      showToast('Error al actualizar asistencia', 'error');
    }
  };

  // Toggle liquidación de subfamilia
  const handleToggleSettlement = async () => {
    try {
      await settleSubFamily(activeEvent.id, activeSf.subFamilyName, !activeSf.isFullySettled);
      await refreshActiveEvent();
      showToast(
        !activeSf.isFullySettled 
          ? `Subfamilia ${activeSf.subFamilyName} liquidada con éxito` 
          : `Cuenta de ${activeSf.subFamilyName} reabierta`,
        'success'
      );
    } catch (err) {
      console.error('Error toggling settlement:', err);
      showToast('Error al liquidar cuenta', 'error');
    }
  };

  // Agregar invitado temporal
  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      showToast('Ingresa el nombre o referencia del invitado', 'info');
      return;
    }

    try {
      const allData = getStoredTicketGuests();
      const eventMap = allData[activeEvent.id] || {};
      const sfList = eventMap[activeSf.subFamilyName] || [];

      const newGuest = {
        id: generateUUID(),
        name: guestName.trim(),
        category: guestCategory,
        daysCount: Number(guestDays) || 4,
        weight: guestCategory === 'nino' ? 0.5 : 1.0,
        subFamily: activeSf.subFamilyName,
      };

      eventMap[activeSf.subFamilyName] = [...sfList, newGuest];
      allData[activeEvent.id] = eventMap;
      setStoredTicketGuests(allData);

      setGuestName('');
      setShowAddGuestForm(false);
      await refreshActiveEvent();
      showToast(`Invitado ${guestName.trim()} agregado al cálculo`, 'success');
    } catch (err) {
      console.error('Error agregando invitado:', err);
      showToast('Error al agregar invitado', 'error');
    }
  };

  // Eliminar invitado temporal
  const handleRemoveGuest = async (guestId) => {
    try {
      const allData = getStoredTicketGuests();
      const eventMap = allData[activeEvent.id] || {};
      const sfList = eventMap[activeSf.subFamilyName] || [];

      eventMap[activeSf.subFamilyName] = sfList.filter((g) => g.id !== guestId);
      allData[activeEvent.id] = eventMap;
      setStoredTicketGuests(allData);

      await refreshActiveEvent();
      showToast('Invitado temporal eliminado', 'info');
    } catch (err) {
      console.error('Error eliminando invitado:', err);
      showToast('Error al eliminar invitado', 'error');
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = () => {
    const text = generateSubfamilyWhatsAppText(activeSf.subFamilyName, activeEvent, totals);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Imprimir Ticket
  const handlePrintTicket = () => {
    window.print();
  };

  // Filtrar subfamilias en la columna izquierda
  const filteredSubFamilies = subFamilies.filter((sf) => {
    if (!subFamilySearch.trim()) return true;
    const q = subFamilySearch.toLowerCase();
    const matchSf = sf.subFamilyName.toLowerCase().includes(q);
    const memberNames = (sf.participantIds || [])
      .map((pId) => totals.byParticipantId[pId]?.participantName || '')
      .join(' ')
      .toLowerCase();
    return matchSf || memberNames.includes(q);
  });

  return (
    <section className="pos-split-layout animate-fade-in">
      {/* Columna Izquierda: Panel Maestro Interactivo de Subfamilias */}
      <aside className="pos-master-col glass-panel">
        <div className="pos-master-header">
          <div className="master-header-title-row">
            <h4 className="pos-master-title">Subfamilias del Evento</h4>
            <span className="badge-pill badge-cyan">{subFamilies.length}</span>
          </div>
          <p className="pos-master-sub">Selecciona una familia para consultar o liquidar</p>
          
          <div className="pos-master-search-box">
            <span className="search-icon">
              <Icon name="search" size={14} />
            </span>
            <input 
              type="text" 
              className="glass-input-search sm" 
              placeholder="Buscar familia o integrante..." 
              value={subFamilySearch}
              onChange={(e) => setSubFamilySearch(e.target.value)}
              autocomplete="off" 
            />
          </div>
        </div>

        <div className="pos-master-list-scroll">
          {filteredSubFamilies.map((sf) => {
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

            const memberNames = (sf.participantIds || [])
              .map((pId) => totals.byParticipantId[pId]?.participantName || '')
              .filter(Boolean);

            return (
              <div 
                key={sf.subFamilyName}
                className={`pos-master-item sf-pill-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedSubFamily(sf.subFamilyName)}
                role="button"
                tabIndex={0}
              >
                <div className="master-item-icon-col">
                  <span className="sf-icon-badge">
                    <Icon name="users" size={16} />
                  </span>
                </div>
                
                <div className="master-item-content-col">
                  <div className="master-item-title-row">
                    <span className="master-item-name">{sf.subFamilyName}</span>
                    {sf.isFullySettled && (
                      <span className="sf-item-check-pill" title="100% Liquidada">
                        <Icon name="check" size={12} /> Liquidada
                      </span>
                    )}
                  </div>
                  
                  <div className="master-item-sub-row">
                    <span className="master-item-count">
                      {sf.attendingCount} de {sf.membersCount} asisten • {sf.totalWeightedUnits} uds
                    </span>
                  </div>

                  <div className="master-item-members-tags">
                    {memberNames.slice(0, 3).map((m) => (
                      <span key={m} className="member-tag-mini">{m}</span>
                    ))}
                    {memberNames.length > 3 && (
                      <span className="member-tag-mini">+{memberNames.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="master-item-balance-col">
                  <span className={`master-item-balance ${badgeClass}`}>{badgeText}</span>
                  <span className="master-item-status-text">{statusLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pos-master-footer">
          <button 
            type="button" 
            onClick={() => openModal('addParticipant')} 
            className="btn-pill-glass btn-block-sm"
          >
            <Icon name="plus" size={14} />
            <span>+ Nuevo Integrante</span>
          </button>
        </div>
      </aside>

      {/* Columna Derecha: Ticket de Cobro POS de la Subfamilia Seleccionada */}
      <main className="pos-detail-col">
        <div className="pos-ticket-card glass-panel animate-fade-in">
          {/* Cabecera del Ticket POS */}
          <div className="ticket-header">
            <div className="ticket-family-title-group">
              <span className="ticket-badge-tag">TICKET DE COBRO POS</span>
              <h2 className="ticket-family-name">{activeSf.subFamilyName}</h2>
              <p className="ticket-family-sub">
                {activeSf.attendingCount} asistentes ({activeSf.membersCount} integrantes
                {calculatedGuests.length > 0 ? ` + ${calculatedGuests.length} invitados` : ''}) • {activeSf.totalWeightedUnits} uds ponderadas
              </p>
            </div>
            
            <div className="ticket-status-group">
              <span className={`ticket-status-pill ${activeSf.isFullySettled ? 'settled' : 'pending'}`}>
                {activeSf.isFullySettled ? (
                  <>
                    <Icon name="check" size={14} /> Familia 100% Liquidada
                  </>
                ) : (
                  <>
                    <Icon name="clock" size={14} /> Pendiente de Liquidar
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 3 Métricas HUD del Ticket Familiar */}
          <div className="ticket-metrics-row">
            <div className="metric-mini-box">
              <span className="metric-mini-label">1. Cuota Proporcional</span>
              <span className="metric-mini-val">{formatCurrency(grossTotalQuota)}</span>
            </div>
            <div className="metric-mini-box">
              <span className="metric-mini-label">2. Compras de su Cartera</span>
              <span className="metric-mini-val">{formatCurrency(baseTotalPaid)}</span>
            </div>
            <div className="metric-mini-box highlight-balance">
              <span className="metric-mini-label">3. {balanceTitle}</span>
              <span className={`metric-mini-val ${balanceColorClass}`}>{formatCurrency(Math.abs(finalBalance))}</span>
            </div>
          </div>

          {/* Banner Informativo si la cuenta está 100% saldada */}
          {activeSf.isFullySettled && (
            <div className="ticket-settled-banner glass-panel">
              <span className="settled-dot"></span>
              <span>Esta cuenta familiar se encuentra 100% saldada y registrada en la caja común.</span>
            </div>
          )}

          {/* Split Grid en 2 Columnas */}
          <div className="ticket-body-split-grid">
            {/* Columna Izquierda: Integrantes Registrados e Invitados */}
            <div className="ticket-members-col">
              {/* Sección 1: Integrantes Registrados y Switch de Asistencia */}
              <div className="ticket-section-block">
                <div className="ticket-section-header">
                  <span className="ticket-section-title">
                    <Icon name="users" size={16} /> Integrantes Registrados ({activeSf.membersCount})
                  </span>
                  <span className="ticket-section-hint">Switch de Asistencia</span>
                </div>

                <div className="ticket-members-list">
                  {activeSf.participantIds.map((pId) => {
                    const p = totals.byParticipantId[pId];
                    if (!p) return null;

                    return (
                      <div key={pId} className={`pos-member-row glass-panel ${!p.isAttending ? 'is-absent' : ''}`}>
                        <div className="member-name-col">
                          <div className="member-title-line">
                            <strong className="member-display-name">
                              <Icon name="user" size={14} /> {p.participantName}
                            </strong>
                            {!p.isAttending && <span className="badge-absent-mini">No Asiste</span>}
                          </div>
                          <div className="member-badges-row">
                            <span className="badge-pill badge-neutral">
                              {p.category.toUpperCase()} ({p.weight} ud)
                            </span>
                            <span className="member-days-text">{p.activeDaysCount} días asistidos</span>
                          </div>
                        </div>

                        <div className="member-amount-col">
                          <span className="member-quota-val">{formatCurrency(p.proportionalShare)}</span>
                        </div>

                        <div className="member-switch-col">
                          <label className="switch-toggle" title={p.isAttending ? 'Asiste al evento' : 'No asiste'}>
                            <input 
                              type="checkbox" 
                              checked={p.isAttending}
                              onChange={() => handleToggleAttendance(p.participantId)}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección 2: Invitados Temporales */}
              <div className="ticket-section-block">
                <div className="ticket-section-header">
                  <span className="ticket-section-title">
                    <Icon name="user-plus" size={16} /> Invitados Temporales ({calculatedGuests.length})
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowAddGuestForm((prev) => !prev)}
                    className="btn-pill-cyan btn-sm"
                  >
                    <Icon name="plus" size={14} />
                    <span>Agregar Invitado</span>
                  </button>
                </div>

                {/* Formulario Desplegable para Agregar Invitado Temporal */}
                {showAddGuestForm && (
                  <form onSubmit={handleSaveGuest} className="glass-panel inline-guest-form animate-fade-in">
                    <h5 className="inline-form-title">Sumar Invitado Temporal a {activeSf.subFamilyName}</h5>
                    <div className="inline-form-grid">
                      <div className="form-group">
                        <label>Nombre o Referencia *</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="ej. Primo Carlos" 
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          required
                          autocomplete="off" 
                        />
                      </div>
                      <div className="form-group">
                        <label>Categoría</label>
                        <select 
                          className="glass-select"
                          value={guestCategory}
                          onChange={(e) => setGuestCategory(e.target.value)}
                        >
                          <option value="adulto">Adulto (1.0 ud)</option>
                          <option value="nino">Niño (0.5 ud)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Días Asistidos</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={guestDays}
                          onChange={(e) => setGuestDays(e.target.value)}
                          min="1" 
                          max="14" 
                        />
                      </div>
                    </div>
                    <div className="inline-form-actions">
                      <button 
                        type="button" 
                        onClick={() => setShowAddGuestForm(false)} 
                        className="btn-pill-glass btn-sm"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn-pill-cyan btn-sm">
                        <Icon name="plus" size={14} />
                        <span>Sumar al Cálculo</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="ticket-guests-list">
                  {calculatedGuests.length === 0 ? (
                    <p className="empty-guest-text">
                      Sin invitados adicionales. Toca "+ Agregar Invitado" para sumarlos al cálculo.
                    </p>
                  ) : (
                    calculatedGuests.map((g) => (
                      <div key={g.id} className="pos-guest-row glass-panel animate-fade-in">
                        <div className="guest-name-col">
                          <div className="guest-title-line">
                            <strong><Icon name="receipt" size={14} /> {g.name}</strong>
                            <span className="badge-pill badge-cyan">Temporal</span>
                          </div>
                          <div className="member-badges-row">
                            <span className="badge-pill badge-neutral">{g.category.toUpperCase()} ({g.weight} ud)</span>
                            <span className="member-days-text">{g.daysCount} días</span>
                          </div>
                        </div>
                        <div className="guest-amount-col">
                          <span className="guest-quota-val">{formatCurrency(g.cost)}</span>
                        </div>
                        <div className="guest-remove-col">
                          <button 
                            type="button" 
                            className="btn-icon-danger btn-remove-guest" 
                            onClick={() => handleRemoveGuest(g.id)}
                            title="Eliminar invitado"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Desglose Matemático, Liquidación y Acciones */}
            <div className="ticket-calc-col">
              {/* Sección 3: Desglose Matemático */}
              <div className="ticket-section-block">
                <div className="math-breakdown-card glass-panel">
                  <div className="breakdown-header">
                    <span className="breakdown-tag">
                      <Icon name="chart" size={14} /> DESGLOSE MATEMÁTICO
                    </span>
                  </div>
                  <div className="breakdown-table-rows">
                    <div className="breakdown-item-row">
                      <span className="breakdown-label">
                        Cuota Integrantes Fijos ({activeSf.attendingCount - calculatedGuests.length} activos)
                      </span>
                      <strong className="breakdown-val">{formatCurrency(baseProportionalShare)}</strong>
                    </div>
                    {guestsTotalCost > 0 && (
                      <div className="breakdown-item-row text-cyan">
                        <span className="breakdown-label">+ Cuota Invitados Temporales ({calculatedGuests.length})</span>
                        <strong className="breakdown-val">+{formatCurrency(guestsTotalCost)}</strong>
                      </div>
                    )}
                    <div className="breakdown-item-row total-gross-row">
                      <span className="breakdown-label">Cuota Total Bruta</span>
                      <strong className="breakdown-val">{formatCurrency(grossTotalQuota)}</strong>
                    </div>
                    <div className="breakdown-item-row text-emerald">
                      <span className="breakdown-label">- Aportes en Compras (Bolsillo)</span>
                      <strong className="breakdown-val">-{formatCurrency(baseTotalPaid)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 4: Gran Caja de Liquidación al Fondo */}
              <div className={`settlement-bottom-card ${activeSf.isFullySettled ? 'settled-card' : 'pending-card'} glass-panel`}>
                <div className="settlement-card-header">
                  <span className="settlement-badge-label">
                    {activeSf.isFullySettled 
                      ? 'CUENTA SALDADA Y REGISTRADA' 
                      : isRefund 
                      ? 'REEMBOLSO A FAVOR DE LA FAMILIA' 
                      : 'SALDO A ENTREGAR EN CAJA'}
                  </span>
                </div>
                
                <div className={`settlement-card-amount ${activeSf.isFullySettled ? 'text-emerald' : balanceColorClass}`}>
                  {formatCurrency(Math.abs(finalBalance))}
                </div>
                
                <p className="settlement-card-subtext">
                  {activeSf.isFullySettled 
                    ? `El saldo de ${formatCurrency(Math.abs(finalBalance))} ya fue recibido/entregado y liquidado en caja.` 
                    : isRefund 
                    ? `Fondo común debe devolver ${formatCurrency(Math.abs(finalBalance))} a los integrantes de esta familia.` 
                    : `Pendiente de recibir ${formatCurrency(Math.abs(finalBalance))} para ingresar a la caja general.`}
                </p>

                <div className="settlement-card-action-box">
                  <button 
                    type="button"
                    onClick={handleToggleSettlement}
                    className={activeSf.isFullySettled ? 'btn-reopen-account btn-pill-glass' : 'btn-settle-account btn-pill-cyan'}
                  >
                    {activeSf.isFullySettled ? (
                      <>
                        <Icon name="refresh" size={16} /> <span>Reabrir Cuenta</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={18} /> <span>Liquidar Cuenta en Caja</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sección 5: Acciones Rápidas de Exportación */}
              <div className="ticket-actions-bar">
                <button 
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="btn-pill-whatsapp"
                >
                  <Icon name="whatsapp" size={18} />
                  <span>Compartir WhatsApp</span>
                </button>
                <button 
                  type="button"
                  onClick={handlePrintTicket}
                  className="btn-pill-glass"
                >
                  <Icon name="print" size={16} />
                  <span>Imprimir Ticket POS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
};

export default PosTicketView;
