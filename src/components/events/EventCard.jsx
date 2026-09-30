/**
 * ChapApp - Tarjeta de Evento (EventCard) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';
import { archiveEvent, deleteEvent } from '../../services/database.js';

export const EventCard = ({ event }) => {
  const { selectEvent, setEvents, showToast, openModal } = useApp();

  const totals = calculateEventTotals(event);
  const collectionPercent =
    totals.totalToCollect > 0
      ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
      : 100;

  const handleToggleArchive = async (e) => {
    e.stopPropagation();
    try {
      await archiveEvent(event.id, !event.isArchived);
      setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, isArchived: !event.isArchived } : item)));
      showToast(
        !event.isArchived ? `Evento "${event.title}" archivado` : `Evento "${event.title}" reactivado`,
        'info'
      );
    } catch (err) {
      console.error('Error toggling archive:', err);
      showToast('Error al actualizar evento', 'error');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    openModal('confirm', {
      title: '¿Eliminar Evento?',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${event.title}"? Esta acción borrará todos sus gastos y participantes.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteEvent(event.id);
          setEvents((prev) => prev.filter((item) => item.id !== event.id));
          showToast(`Evento "${event.title}" eliminado`, 'success');
        } catch (err) {
          console.error('Error eliminando evento:', err);
          showToast('Error al eliminar evento', 'error');
        }
      },
    });
  };

  return (
    <article 
      className="event-card glass-panel animate-scale-in" 
      onClick={() => selectEvent(event.id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="event-card-top">
        <div className="event-card-header">
          <div className="event-card-badges-row">
            <span className="event-year-tag">Año {event.year}</span>
            <span className={`badge-status ${event.isArchived ? 'status-archived' : 'status-active'}`}>
              {event.isArchived ? 'Archivado' : 'Activo'}
            </span>
          </div>
          <div className="event-card-menu-group" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              className="btn-icon-glass btn-toggle-archive-card" 
              onClick={handleToggleArchive}
              title={event.isArchived ? 'Desarchivar evento' : 'Archivar evento'}
              aria-label={event.isArchived ? 'Desarchivar' : 'Archivar'}
            >
              <Icon name="archive" size={16} />
            </button>
            <button 
              type="button"
              className="btn-icon-danger btn-delete-event-card" 
              onClick={handleDelete}
              title="Eliminar evento"
              aria-label="Eliminar"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>

        <h3 className="event-card-title">{event.title}</h3>

        {/* Barra de Progreso de Recaudación */}
        <div className="event-progress-section">
          <div className="event-progress-labels">
            <span className="progress-title">Meta de Recaudación</span>
            <span className="progress-stats text-emerald">
              <strong>{collectionPercent}%</strong> ({formatCurrency(totals.totalCollected)})
            </span>
          </div>
          <div className="progress-track-glass">
            <div className="progress-fill-emerald" style={{ width: `${collectionPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="event-card-footer">
        <div className="event-members-pill">
          <Icon name="users" size={15} />
          <span>{totals.totalAttendingCount} de {totals.totalParticipantsCount} asistentes</span>
        </div>
        <button 
          type="button"
          onClick={() => selectEvent(event.id)}
          className="btn-pill-primary enter-dashboard-btn" 
          aria-label={`Abrir Dashboard de ${event.title}`}
        >
          <span>Abrir</span>
          <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </article>
  );
};

export default EventCard;
