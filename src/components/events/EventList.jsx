/**
 * ChapApp - Vista Principal de Eventos y Vacaciones (EventList) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import EventCard from './EventCard.jsx';

export const EventList = ({ filterTab = 'active', setFilterTab }) => {
  const { events = [], loading, openModal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner-glass"></div>
        <p className="loading-text">Conectando con Supabase Cloud...</p>
      </div>
    );
  }

  const totalCount = events.length;
  const activeCount = events.filter((e) => !e.isArchived).length;
  const archivedCount = events.filter((e) => e.isArchived).length;

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

  return (
    <div className="events-view-container animate-fade-in">
      {/* Barra de Búsqueda y Filtros */}
      <div className="search-filter-bar glass-panel animate-fade-in">
        <div className="search-input-box">
          <span className="search-icon">
            <Icon name="search" size={18} />
          </span>
          <input 
            type="text" 
            id="events-search-input" 
            className="glass-input-search" 
            placeholder="Buscar eventos por título o año..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autocomplete="off"
          />
          {searchQuery && (
            <button 
              type="button"
              className="btn-clear-search" 
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips-group">
          <button 
            type="button"
            className={`filter-chip-btn ${filterTab === 'active' ? 'active' : ''}`} 
            onClick={() => setFilterTab('active')} 
            title="Ver eventos activos"
          >
            <span className="filter-dot active-dot"></span>
            <span>Activos ({activeCount})</span>
          </button>
          <button 
            type="button"
            className={`filter-chip-btn ${filterTab === 'archived' ? 'active' : ''}`} 
            onClick={() => setFilterTab('archived')} 
            title="Ver eventos archivados"
          >
            <span className="filter-dot archived-dot"></span>
            <span>Archivados ({archivedCount})</span>
          </button>
          <button 
            type="button"
            className={`filter-chip-btn ${filterTab === 'all' ? 'active' : ''}`} 
            onClick={() => setFilterTab('all')} 
            title="Ver todos los eventos"
          >
            <span>Todos ({totalCount})</span>
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state-box glass-panel animate-fade-in">
          <div className="empty-icon-circle">
            <Icon name="calendar" size={36} />
          </div>
          <h3 className="empty-title">
            {searchQuery 
              ? 'Sin resultados de búsqueda' 
              : filterTab === 'archived' 
              ? 'No hay eventos archivados' 
              : 'No hay eventos para mostrar'}
          </h3>
          <p className="empty-description">
            {searchQuery 
              ? `No se encontraron eventos que coincidan con "${searchQuery}".` 
              : filterTab === 'archived' 
              ? 'Los eventos que archives aparecerán aquí para consulta histórica.' 
              : 'Crea tu primer evento anual para comenzar a controlar gastos y prorrateo.'}
          </p>
          <button 
            type="button"
            onClick={() => openModal('newEvent')} 
            className="btn-pill-primary"
          >
            <Icon name="plus" size={16} />
            <span>Crear Nuevo Evento</span>
          </button>
        </div>
      ) : (
        <div className="events-grid-responsive">
          {filteredEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;
