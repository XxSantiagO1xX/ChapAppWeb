/**
 * ChapApp - Vista Particionada Master-Detail de Tickets de Cobro POS (PosTicketView) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { generateSubfamilyWhatsAppText } from '../../utils/reports.js';
import { openSubfamilyTicketPrintReport, downloadSubfamilyTicketImage } from '../../utils/pdfReport.js';
import { 
  updateParticipant, 
  settleSubFamily, 
  updateSubFamilyPartialPayment,
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
    showToast,
    familyGroups,
    updateFamilyGroupIndependence
  } = useApp();

  const [subFamilySearch, setSubFamilySearch] = useState('');
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestCategory, setGuestCategory] = useState('adulto');
  const [guestDays, setGuestDays] = useState(activeEvent?.availableDays?.length || 4);
  const [partialAmountInput, setPartialAmountInput] = useState('');

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent, null, familyGroups);
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
  const partialPayment = activeSf.partialPayment || 0;
  const remainingBalance = activeSf.remainingBalance ?? finalBalance;
  const hasPartialPayment = Boolean(activeSf.hasPartialPayment);
  const paymentProgressPercent = activeSf.paymentProgressPercent ?? 0;

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
      await settleSubFamily(activeEvent.id, activeSf.subFamilyName, !activeSf.isFullySettled, familyGroups);
      setPartialAmountInput('');
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

  // Registrar o sumar un abono parcial a la cuenta familiar
  const handleRegisterPartialPayment = async (e, customAddAmount = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawVal = customAddAmount !== null ? customAddAmount : parseFloat(partialAmountInput);
    if (!rawVal || isNaN(rawVal) || rawVal <= 0) {
      showToast('Ingresa un monto de abono válido mayor a $0', 'info');
      return;
    }

    const absTarget = Math.abs(finalBalance);
    if (absTarget <= 0) {
      showToast('Esta cuenta ya se encuentra en tablas ($0.00)', 'info');
      return;
    }

    const newTotalPartial = Math.min(absTarget, Math.round((partialPayment + rawVal) * 100) / 100);
    const willBeFullySettled = newTotalPartial >= absTarget - 0.01;

    try {
      await updateSubFamilyPartialPayment(
        activeEvent.id,
        activeSf.subFamilyName,
        willBeFullySettled ? absTarget : newTotalPartial,
        willBeFullySettled,
        familyGroups
      );
      setPartialAmountInput('');
      await refreshActiveEvent();

      if (willBeFullySettled) {
        showToast(`¡Cuenta de ${activeSf.subFamilyName} 100% liquidada con este abono!`, 'success');
      } else {
        const rest = Math.max(0, absTarget - newTotalPartial);
        showToast(
          `Abono registrado (${formatCurrency(newTotalPartial)}). Resta por cubrir: ${formatCurrency(rest)}`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error registrando abono parcial:', err);
      showToast('Error al registrar el abono parcial', 'error');
    }
  };

  // Reiniciar abonos parciales a $0
  const handleResetPartialPayment = async () => {
    try {
      await updateSubFamilyPartialPayment(activeEvent.id, activeSf.subFamilyName, 0, false, familyGroups);
      setPartialAmountInput('');
      await refreshActiveEvent();
      showToast(`Abonos de ${activeSf.subFamilyName} reiniciados a $0.00`, 'info');
    } catch (err) {
      console.error('Error reiniciando abonos:', err);
      showToast('Error al reiniciar abonos', 'error');
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

  // Descargar Ticket POS en Imagen PNG (Retina 2x) para enviar por WhatsApp
  const handleDownloadTicketImage = async () => {
    try {
      const ok = await downloadSubfamilyTicketImage(activeSf.subFamilyName, activeEvent, totals);
      if (ok) {
        showToast(`Imagen PNG del ticket de ${activeSf.subFamilyName} descargada`, 'success');
      } else {
        showToast('No se pudo generar la imagen del ticket', 'error');
      }
    } catch (err) {
      console.error('Error generando imagen PNG del ticket:', err);
      showToast('Error al descargar imagen del ticket', 'error');
    }
  };

  // Imprimir / Exportar PDF del Ticket POS Individual
  const handlePrintTicket = () => {
    openSubfamilyTicketPrintReport(activeSf.subFamilyName, activeEvent, totals);
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
            const sfEffectiveBal = sf.hasPartialPayment ? sf.remainingBalance : sfFinalBal;
            const sfIsRefund = sfFinalBal < 0;
            const sfIsOwed = sfFinalBal > 0;
            const badgeText = sf.isFullySettled
              ? '$0.00'
              : sfIsRefund
              ? `-${formatCurrency(Math.abs(sfEffectiveBal))}`
              : sfIsOwed
              ? `+${formatCurrency(Math.abs(sfEffectiveBal))}`
              : '$0.00';

            const badgeClass = sf.isFullySettled
              ? 'badge-even'
              : sfIsRefund
              ? 'badge-refund'
              : sfIsOwed
              ? 'badge-owed'
              : 'badge-even';
            const statusLabel = sf.isFullySettled
              ? 'Liquidada'
              : sf.hasPartialPayment
              ? `Resta (${sf.paymentProgressPercent}% abonado)`
              : sfIsRefund
              ? 'Reembolso'
              : sfIsOwed
              ? 'Por pagar'
              : 'Al día';

            const memberNames = (sf.participantIds || [])
              .map((pId) => totals.byParticipantId[pId]?.participantName || '')
              .filter(Boolean);

            return (
              <div 
                key={sf.subFamilyName}
                className={`pos-master-item sf-pill-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedSubFamily(sf.subFamilyName);
                  setPartialAmountInput('');
                }}
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
                    {sf.hasPartialPayment && (
                      <span className="badge-pill badge-cyan" style={{ fontSize: '0.66rem', padding: '1px 7px' }} title={`Abonado: ${formatCurrency(sf.partialPayment)}`}>
                        Abono {formatCurrency(sf.partialPayment)}
                      </span>
                    )}
                  </div>
                  
                  <div className="master-item-sub-row" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="master-item-count">
                      {sf.attendingCount} de {sf.membersCount} asisten • {sf.totalWeightedUnits} uds
                    </span>
                    {sf.hasMultipleNuclei && (
                      <span className="badge-pill badge-cyan" style={{ fontSize: '0.68rem', padding: '1px 6px' }} title={`Incluye: ${(sf.subGroups || []).join(', ')}`}>
                        Incluye {sf.subGroups.length} familias
                      </span>
                    )}
                    {sf.nodo_padre_id && sf.es_independiente && (
                      <span className="badge-pill badge-neutral" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        Cuenta Propia
                      </span>
                    )}
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

      {/* Columna Derecha: Estado de Cuenta de la Subfamilia Seleccionada */}
      <main className="pos-detail-col">
        <div
          className={`pos-ticket-card glass-panel animate-fade-in ${
            activeSf.isFullySettled
              ? 'ticket-vault-settled'
              : hasPartialPayment
                ? 'ticket-vault-partial'
                : 'ticket-vault-pending'
          }`}
        >
          {/* Cabecera del Estado de Cuenta */}
          <div className="ticket-header">
            <div className="ticket-family-title-group">
              <span className="ticket-badge-tag">ESTADO DE CUENTA</span>
              <h2 className="ticket-family-name">{activeSf.subFamilyName}</h2>
              <p className="ticket-family-sub">
                {activeSf.attendingCount} asistentes ({activeSf.membersCount} integrantes
                {calculatedGuests.length > 0 ? ` + ${calculatedGuests.length} invitados` : ''}) • {activeSf.totalWeightedUnits} uds
                {activeSf.hasMultipleNuclei ? ` • Incluye a: ${(activeSf.subGroups || []).join(', ')}` : ''}
              </p>
            </div>
            
            <div className="ticket-status-group">
              <span className={`ticket-status-pill ${activeSf.isFullySettled ? 'settled' : 'pending'}`}>
                {activeSf.isFullySettled ? (
                  <>
                    <Icon name="check" size={14} /> Liquidada
                  </>
                ) : hasPartialPayment ? (
                  <>
                    <Icon name="clock" size={14} /> Abono ({paymentProgressPercent}% • {formatCurrency(partialPayment)})
                  </>
                ) : (
                  <>
                    <Icon name="clock" size={14} /> Pendiente
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

          {/* Split Grid en 2 Columnas */}
          <div className="ticket-body-split-grid">
            {/* Columna Izquierda: Integrantes Registrados e Invitados */}
            <div className="ticket-members-col">
              {/* Sección 1: Integrantes Registrados */}
              <div className="ticket-section-block">
                <div className="ticket-section-header">
                  <span className="ticket-section-title">
                    <Icon name="users" size={16} /> Integrantes ({activeSf.membersCount})
                  </span>
                </div>

                <div className="ticket-members-list">
                  {activeSf.participantIds.map((pId) => {
                    const p = totals.byParticipantId[pId];
                    if (!p) return null;

                    const displayName = p.nombre 
                      ? `${p.nombre} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.replace(/\s+/g, ' ').trim() 
                      : p.participantName;

                    return (
                      <div key={pId} className={`pos-member-row glass-panel ${!p.isAttending ? 'is-absent' : ''}`}>
                        <div className="member-name-col">
                          <div className="member-title-line">
                            <strong className="member-display-name">
                              <Icon name="user" size={14} /> {displayName}
                            </strong>
                            {!p.isAttending && <span className="badge-absent-mini">No Asiste</span>}
                          </div>
                          <div className="member-badges-row">
                            {p.isRolledUp && p.originalGroupName && p.originalGroupName !== activeSf.subFamilyName && (
                              <span className="badge-branch-dependent" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
                                ↳ {p.originalGroupName}
                              </span>
                            )}
                            {p.telefono && (
                              <span className="contact-phone-tag" style={{ fontSize: '0.74rem' }}>
                                <Icon name="phone" size={11} /> {p.telefono}
                              </span>
                            )}
                            <span className="badge-pill badge-neutral">
                              {p.category.toUpperCase()} ({p.weight} ud)
                            </span>
                            <span className="member-days-text">{p.activeDaysCount} días</span>
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
                    <Icon name="user-plus" size={16} /> Invitados ({calculatedGuests.length})
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
                    <h5 className="inline-form-title">Nuevo Invitado en {activeSf.subFamilyName}</h5>
                    <div className="inline-form-grid">
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="ej. Carlos" 
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
                        <span>Agregar</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="ticket-guests-list">
                  {calculatedGuests.length === 0 ? (
                    <p className="empty-guest-text">
                      Sin invitados adicionales.
                    </p>
                  ) : (
                    calculatedGuests.map((g) => (
                      <div key={g.id} className="pos-guest-row glass-panel animate-fade-in">
                        <div className="guest-name-col">
                          <div className="guest-title-line">
                            <strong><Icon name="receipt" size={14} /> {g.name}</strong>
                            <span className="badge-pill badge-cyan">Invitado</span>
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

            {/* Columna Derecha: Resumen de Cuenta, Liquidación y Acciones */}
            <div className="ticket-calc-col">
              {/* Sección 3: Resumen de Cuenta */}
              <div className="ticket-section-block">
                <div className="math-breakdown-card glass-panel">
                  <div className="breakdown-header">
                    <span className="breakdown-tag">
                      <Icon name="chart" size={14} /> RESUMEN DE CUENTA
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
                    {partialPayment > 0 && !activeSf.isFullySettled && (
                      <>
                        <div className="breakdown-item-row text-cyan">
                          <span className="breakdown-label">
                            - {isRefund ? 'Reembolsos Parciales Entregados' : 'Abonos Entregados en Caja'} ({paymentProgressPercent}%)
                          </span>
                          <strong className="breakdown-val">-{formatCurrency(partialPayment)}</strong>
                        </div>
                        <div className="breakdown-item-row total-gross-row">
                          <span className="breakdown-label">
                            {isRefund ? 'Resta por Reembolsar' : 'Resta por Entregar en Caja'}
                          </span>
                          <strong className={`breakdown-val ${balanceColorClass}`}>
                            {formatCurrency(Math.abs(remainingBalance))}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 4: Gran Caja de Liquidación y Abonos Parciales al Fondo */}
              <div className={`settlement-bottom-card ${activeSf.isFullySettled ? 'settled-card' : 'pending-card'} glass-panel`}>
                <div className="settlement-card-header">
                  <span className="settlement-badge-label">
                    {activeSf.isFullySettled 
                      ? 'CUENTA SALDADA Y REGISTRADA' 
                      : hasPartialPayment
                      ? isRefund
                        ? `REEMBOLSO RESTANTE (${paymentProgressPercent}% CUBIERTO)`
                        : `SALDO RESTANTE A PAGAR (${paymentProgressPercent}% ABONADO)`
                      : isRefund 
                      ? 'REEMBOLSO A FAVOR DE LA FAMILIA' 
                      : 'SALDO A ENTREGAR EN CAJA'}
                  </span>
                </div>
                
                <div className={`settlement-card-amount ${activeSf.isFullySettled ? 'text-emerald' : balanceColorClass}`}>
                  {formatCurrency(Math.abs(hasPartialPayment ? remainingBalance : finalBalance))}
                </div>
                
                <p className="settlement-card-subtext">
                  {activeSf.isFullySettled 
                    ? `El saldo total de ${formatCurrency(Math.abs(finalBalance))} ya fue recibido/entregado y liquidado en caja.` 
                    : hasPartialPayment
                    ? `Ya se registraron ${formatCurrency(partialPayment)} de ${formatCurrency(Math.abs(finalBalance))}. Resta por ${isRefund ? 'reembolsar' : 'cobrar'} ${formatCurrency(Math.abs(remainingBalance))}.`
                    : isRefund 
                    ? `Fondo común debe devolver ${formatCurrency(Math.abs(finalBalance))} a los integrantes de esta familia.` 
                    : `Pendiente de recibir ${formatCurrency(Math.abs(finalBalance))} para ingresar a la caja general.`}
                </p>

                {/* Barra de Progreso y Control de Abonos Parciales (cuando existe saldo y aún no está 100% liquidada) */}
                {!activeSf.isFullySettled && Math.abs(finalBalance) > 0 && (
                  <div className="partial-payment-widget">
                    {hasPartialPayment && (
                      <div className="partial-progress-wrap">
                        <div className="partial-progress-labels">
                          <span>Abonado: <strong>{formatCurrency(partialPayment)}</strong></span>
                          <span>Total neto: <strong>{formatCurrency(Math.abs(finalBalance))}</strong></span>
                        </div>
                        <div className="progress-track-glass" style={{ height: '8px' }}>
                          <div 
                            className="progress-fill-emerald" 
                            style={{ width: `${paymentProgressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleRegisterPartialPayment} className="partial-payment-form">
                      <div className="partial-input-group">
                        <span className="partial-currency-sign">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max={Math.abs(remainingBalance)}
                          className="glass-input partial-amount-input"
                          placeholder={
                            hasPartialPayment
                              ? `Sumar abono (máx ${Math.abs(remainingBalance).toFixed(2)})`
                              : `Registrar abono parcial (ej. ${Math.round(Math.abs(finalBalance) / 2)})`
                          }
                          value={partialAmountInput}
                          onChange={(e) => setPartialAmountInput(e.target.value)}
                        />
                        <button type="submit" className="btn-pill-cyan btn-sm partial-submit-btn">
                          <Icon name="plus" size={14} />
                          <span>{hasPartialPayment ? 'Sumar Abono' : 'Abonar'}</span>
                        </button>
                      </div>

                      <div className="partial-quick-chips">
                        {[500, 1000].map((preset) =>
                          Math.abs(remainingBalance) > preset ? (
                            <button
                              key={preset}
                              type="button"
                              className="partial-chip-btn"
                              onClick={() => handleRegisterPartialPayment(null, preset)}
                            >
                              +${preset.toLocaleString('es-MX')}
                            </button>
                          ) : null
                        )}
                        {Math.abs(remainingBalance) > 20 && (
                          <button
                            type="button"
                            className="partial-chip-btn"
                            onClick={() =>
                              handleRegisterPartialPayment(
                                null,
                                Math.round((Math.abs(remainingBalance) / 2) * 100) / 100
                              )
                            }
                          >
                            50% ({formatCurrency(Math.abs(remainingBalance) / 2)})
                          </button>
                        )}
                        {hasPartialPayment && (
                          <button
                            type="button"
                            className="partial-chip-btn reset-chip"
                            onClick={handleResetPartialPayment}
                            title="Reiniciar abonos a $0.00"
                          >
                            Reiniciar ($0)
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

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
                    ) : hasPartialPayment ? (
                      <>
                        <Icon name="check" size={18} /> <span>Liquidar Restante ({formatCurrency(Math.abs(remainingBalance))})</span>
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
                  onClick={handleDownloadTicketImage}
                  className="btn-pill-cyan"
                  title="Descargar imagen PNG en alta definición lista para adjuntar en WhatsApp"
                >
                  <Icon name="camera" size={16} />
                  <span>Imagen PNG</span>
                </button>
                <button 
                  type="button"
                  onClick={handlePrintTicket}
                  className="btn-pill-glass"
                  title="Abrir reporte PDF individual de esta subfamilia para guardar o imprimir"
                >
                  <Icon name="print" size={16} />
                  <span>Ticket PDF / Imprimir</span>
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
