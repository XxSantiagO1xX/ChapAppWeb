/**
 * ChapApp - Pestaña 2: Subfamilias y Control de Asistencia (SubfamiliesTab) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { 
  updateParticipant, 
  updateParticipantRole,
  toggleSubFamilyAttendance, 
  settleSubFamily, 
  deleteParticipant, 
  deleteSubFamily 
} from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const SubfamiliesTab = () => {
  const { activeEvent, refreshActiveEvent, openModal, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent);
  const participants = activeEvent.participants || [];
  const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];

  // Agrupar participantes por subfamilia
  const groupedBySf = {};
  participants.forEach((p) => {
    const sf = p.subFamily || 'Familia General';
    if (!groupedBySf[sf]) groupedBySf[sf] = [];
    groupedBySf[sf].push(p);
  });

  const handleToggleAttendance = async (participantId) => {
    const part = participants.find((p) => p.id === participantId);
    if (!part) return;

    try {
      await updateParticipant(activeEvent.id, {
        ...part,
        isAttending: !part.isAttending,
      });
      await refreshActiveEvent();
      showToast(!part.isAttending ? `${part.name} marcado como asistente` : `${part.name} marcado como ausente`, 'info');
    } catch (err) {
      console.error('Error actualizando asistencia:', err);
      showToast('Error al actualizar asistencia', 'error');
    }
  };

  const handleToggleRole = async (participant) => {
    const isChild = participant.category === 'nino';
    const newCategory = isChild ? 'adulto' : 'nino';
    const newWeight = isChild ? 1.0 : 0.5;

    try {
      await updateParticipantRole(activeEvent.id, participant.id, newCategory, newWeight);
      await refreshActiveEvent();
      showToast(`Tarifa de ${participant.name} cambiada a ${newCategory === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}`, 'info');
    } catch (err) {
      console.error('Error cambiando tarifa:', err);
      showToast('Error al cambiar tarifa', 'error');
    }
  };

  const handleSetDaysCount = async (participant, delta) => {
    if (!participant.isAttending) return;
    const maxDays = availableDays.length || 4;
    const activeDaysList = Array.isArray(participant.activeDays) && participant.activeDays.length > 0
      ? participant.activeDays
      : availableDays;
    const currentCount = activeDaysList.length;
    const newCount = Math.max(1, Math.min(maxDays, currentCount + delta));

    if (newCount === currentCount) return;

    const updatedDays = availableDays.slice(0, newCount);

    try {
      await updateParticipant(activeEvent.id, {
        ...participant,
        activeDays: updatedDays,
      });
      await refreshActiveEvent();
    } catch (err) {
      console.error('Error actualizando días:', err);
      showToast('Error al actualizar días', 'error');
    }
  };

  const handleDeleteParticipant = (participant) => {
    const pName = participant.name || `${participant.nombre || ''} ${participant.apellido_paterno || ''}`.trim() || 'Integrante';
    openModal('confirm', {
      title: '¿Eliminar Integrante?',
      message: `¿Deseas eliminar a "${pName}" de este evento?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteParticipant(activeEvent.id, participant.id);
          await refreshActiveEvent();
          showToast(`Integrante "${pName}" eliminado`, 'success');
        } catch (err) {
          console.error('Error eliminando participante:', err);
          showToast('Error al eliminar integrante', 'error');
        }
      },
    });
  };

  const handleBatchAttendance = async (sfName, targetAttending) => {
    try {
      await toggleSubFamilyAttendance(activeEvent.id, sfName, targetAttending);
      await refreshActiveEvent();
      showToast(targetAttending ? `Todos en ${sfName} marcados presentes` : `Todos en ${sfName} marcados ausentes`, 'info');
    } catch (err) {
      console.error('Error en lote de asistencia:', err);
      showToast('Error al actualizar asistencia grupal', 'error');
    }
  };

  const handleBatchSettlement = async (sfName, currentSettled) => {
    try {
      await settleSubFamily(activeEvent.id, sfName, !currentSettled);
      await refreshActiveEvent();
      showToast(!currentSettled ? `Subfamilia ${sfName} liquidada` : `Cuenta de ${sfName} reabierta`, 'success');
    } catch (err) {
      console.error('Error en liquidación familiar:', err);
      showToast('Error al actualizar liquidación familiar', 'error');
    }
  };

  const handleDeleteSubFamily = (sfName) => {
    openModal('confirm', {
      title: '¿Eliminar Subfamilia Completa?',
      message: `¿Deseas eliminar permanentemente a todos los integrantes de "${sfName}"?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteSubFamily(activeEvent.id, sfName);
          await refreshActiveEvent();
          showToast(`Subfamilia "${sfName}" eliminada`, 'success');
        } catch (err) {
          console.error('Error eliminando subfamilia:', err);
          showToast('Error al eliminar subfamilia', 'error');
        }
      },
    });
  };

  // Filtrado y ordenación alfabética automática
  const sortedSfNames = Object.keys(groupedBySf).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  );

  const filteredSfNames = sortedSfNames.filter((sfName) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchSf = sfName.toLowerCase().includes(q);
    const matchMember = (groupedBySf[sfName] || []).some((p) => (p.name || '').toLowerCase().includes(q));
    return matchSf || matchMember;
  });

  return (
    <div className="tab-subfamilies-content animate-fade-in">
      <div className="tab-actions-header">
        <div className="section-title-box">
          <span className="tab-section-badge">CONTROL DE ASISTENCIA</span>
          <h3 className="section-heading">Subfamilias y Control de Asistencia</h3>
          <p className="section-subheading">
            Gestiona integrantes, tarifas (adulto/niño), días activos y presencia para el prorrateo automático.
          </p>
        </div>
        <div className="tab-buttons-group">
          <button 
            type="button" 
            onClick={() => openModal('importParticipants')} 
            className="btn-pill-glass"
          >
            <Icon name="users" size={16} />
            <span>Importar del Directorio</span>
          </button>
          <button 
            type="button" 
            onClick={() => openModal('addParticipant')} 
            className="btn-pill-primary"
          >
            <Icon name="plus" size={16} />
            <span>Agregar Integrante</span>
          </button>
        </div>
      </div>

      {/* Buscador de Integrantes y Familias */}
      <div className="search-input-box" style={{ marginBottom: '16px' }}>
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input 
          type="text" 
          id="subfamilies-search-input" 
          className="glass-input-search" 
          placeholder="Buscar por nombre o familia..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autocomplete="off"
        />
        {searchTerm && (
          <button 
            type="button" 
            className="btn-clear-search" 
            onClick={() => setSearchTerm('')}
            aria-label="Limpiar búsqueda"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div className="subfamilies-grid">
        {filteredSfNames.length === 0 ? (
          <p className="empty-text">No hay integrantes registrados que coincidan con la búsqueda.</p>
        ) : (
          filteredSfNames.map((sfName) => {
            const rawParts = groupedBySf[sfName] || [];
            const parts = [...rawParts].sort((a, b) => {
              const nameA = (a.name || `${a.nombre || ''} ${a.apellido_paterno || ''}`).trim();
              const nameB = (b.name || `${b.nombre || ''} ${b.apellido_paterno || ''}`).trim();
              return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });
            const sfCalc = totals.bySubFamily[sfName];
            const attendingCount = parts.filter((p) => p.isAttending).length;
            const allAttending = attendingCount === parts.length;
            const isFamilyPaid = sfCalc ? sfCalc.isFullySettled : parts.length > 0 && parts.every((p) => p.isSettled);

            return (
              <div 
                key={sfName} 
                className={`subfamily-group-card glass-panel ${isFamilyPaid ? 'sf-card-settled' : ''}`}
              >
                <div className="sf-group-header">
                  <div className="sf-title-info-group">
                    <h4 className="sf-group-title">
                      <Icon name="users" size={16} /> {sfName}
                    </h4>
                    <span className="sf-group-stats">
                      {attendingCount} de {parts.length} asisten
                      {sfCalc?.guests?.length > 0 ? ` (+${sfCalc.guests.length} inv)` : ''} • Saldo:{' '}
                      <strong 
                        className={
                          sfCalc && sfCalc.finalBalance > 0 
                            ? 'text-amber' 
                            : sfCalc && sfCalc.finalBalance < 0 
                            ? 'text-emerald' 
                            : 'text-cyan'
                        }
                      >
                        {sfCalc 
                          ? sfCalc.finalBalance < 0 
                            ? `Reembolso ${formatCurrency(Math.abs(sfCalc.finalBalance))}` 
                            : formatCurrency(sfCalc.finalBalance) 
                          : '$0.00'}
                      </strong>
                    </span>
                  </div>

                  <div className="sf-header-actions-group">
                    <button 
                      type="button"
                      className="btn-pill-glass btn-family-toggle-attendance"
                      onClick={() => handleBatchAttendance(sfName, !allAttending)}
                      title={allAttending ? 'Marcar a todos como ausentes' : 'Marcar a todos como asistentes'}
                    >
                      {allAttending ? 'Ausentes' : 'Todos Asisten'}
                    </button>

                    <button 
                      type="button"
                      className={`btn-pill-action ${isFamilyPaid ? 'btn-settled-success' : 'btn-settle-action'} btn-family-toggle-settle`}
                      onClick={() => handleBatchSettlement(sfName, isFamilyPaid)}
                      title={isFamilyPaid ? 'Reabrir cuenta de la subfamilia' : 'Liquidar cuenta de toda la subfamilia'}
                    >
                      {isFamilyPaid ? (
                        <>
                          <Icon name="check" size={14} /> Liquidada
                        </>
                      ) : (
                        'Liquidar'
                      )}
                    </button>

                    <button 
                      type="button"
                      className="btn-icon-danger btn-family-delete"
                      onClick={() => handleDeleteSubFamily(sfName)}
                      title="Eliminar subfamilia completa"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="sf-members-list">
                  {parts.map((p) => {
                    const isChild = p.category === 'nino';
                    const maxDays = availableDays.length || 4;
                    const activeDaysList = Array.isArray(p.activeDays) && p.activeDays.length > 0
                      ? p.activeDays
                      : (p.isAttending !== false ? availableDays : []);
                    const activeDaysCount = activeDaysList.length;

                    return (
                      <div 
                        key={p.id} 
                        className={`participant-card-item glass-panel ${isChild ? 'card-child' : 'card-adult'} ${!p.isAttending ? 'item-absent' : ''}`}
                      >
                        {/* Cabecera: Rol interactivo + Nombre + Eliminar */}
                        <div className="participant-card-header">
                          <div className="participant-name-wrapper">
                            <button 
                              type="button"
                              className={`btn-role-badge ${isChild ? 'role-child' : 'role-adult'}`}
                              onClick={() => handleToggleRole(p)}
                              title={isChild ? 'Categoría Niño (0.5 ud). Clic para cambiar a Adulto (1.0 ud)' : 'Categoría Adulto (1.0 ud). Clic para cambiar a Niño (0.5 ud)'}
                            >
                              <Icon name="user" size={13} />
                            </button>
                            <span className="participant-name" title={p.name}>
                              {p.name}
                            </span>
                          </div>

                          <button 
                            type="button"
                            className="btn-icon-danger-subtle btn-delete-participant"
                            onClick={() => handleDeleteParticipant(p)}
                            title="Eliminar de este evento"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>

                        {/* Stepper numérico para días */}
                        <div className="days-stepper-row">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => handleSetDaysCount(p, -1)}
                            disabled={!p.isAttending || activeDaysCount <= 1}
                            title="Disminuir días"
                          >
                            <Icon name="minus" size={12} />
                          </button>

                          <span className={`stepper-label ${!p.isAttending ? 'disabled' : ''}`}>
                            <strong>{activeDaysCount}</strong> de {maxDays} {maxDays === 1 ? 'día' : 'días'}
                          </span>

                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => handleSetDaysCount(p, 1)}
                            disabled={!p.isAttending || activeDaysCount >= maxDays}
                            title="Aumentar días"
                          >
                            <Icon name="plus" size={12} />
                          </button>
                        </div>

                        {/* Footer: Botón Asiste / Falta */}
                        <div className="participant-card-footer">
                          <button 
                            type="button"
                            className={`btn-toggle-attendance-compact ${p.isAttending ? 'attending' : 'absent'}`}
                            onClick={() => handleToggleAttendance(p.id)}
                            title={p.isAttending ? 'Marcar como ausente' : 'Marcar como asistente'}
                          >
                            {p.isAttending ? (
                              <>
                                <Icon name="check" size={12} /> Asiste
                              </>
                            ) : (
                              <>
                                <Icon name="close" size={12} /> Falta
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sfCalc?.guests?.length > 0 && (
                  <div 
                    className="sf-guests-sublist" 
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      background: 'rgba(6, 182, 212, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(6, 182, 212, 0.15)',
                    }}
                  >
                    <div 
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Icon name="user-plus" size={13} /> Invitados Temporales Asignados ({sfCalc.guests.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {sfCalc.guests.map((g) => (
                        <span key={g.id} className="badge-pill badge-cyan" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                          {g.name} ({g.category} • {g.daysCount} días) =&gt; {formatCurrency(g.cost)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubfamiliesTab;
