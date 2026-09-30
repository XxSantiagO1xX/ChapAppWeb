/**
 * ChapApp - Modal Crear Nuevo Evento (NewEventModal) React
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { createEvent, getGlobalDirectory } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const NewEventModal = () => {
  const { activeModal, closeModal, setEvents, selectEvent, showToast } = useApp();

  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState(4);
  const [directory, setDirectory] = useState([]);
  const [selectedDirectoryIds, setSelectedDirectoryIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeModal === 'newEvent') {
      try {
        const dir = getGlobalDirectory();
        setDirectory(dir || []);
        if (dir && dir.length > 0) {
          setSelectedDirectoryIds(new Set(dir.map((d) => d.id)));
        }
      } catch (err) {
        console.warn('[NewEventModal] Error cargando directorio:', err);
      }
      setTitle('');
      setYear(new Date().getFullYear());
      setDays(4);
    }
  }, [activeModal]);

  if (activeModal !== 'newEvent') return null;

  const handleToggleParticipant = (id) => {
    setSelectedDirectoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDirectoryIds.size === directory.length) {
      setSelectedDirectoryIds(new Set());
    } else {
      setSelectedDirectoryIds(new Set(directory.map((d) => d.id)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Por favor ingresa un título para el evento', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const numDays = Math.max(1, Math.min(30, parseInt(days, 10) || 4));
      const availableDays = Array.from({ length: numDays }, (_, i) => `Día ${i + 1}`);

      // Participantes seleccionados del directorio
      const participants = directory
        .filter((d) => selectedDirectoryIds.has(d.id))
        .map((d) => ({
          name: d.name,
          category: d.category || 'adulto',
          weight: typeof d.weight === 'number' ? d.weight : d.category === 'nino' ? 0.5 : 1.0,
          subFamily: d.subFamily || 'Familia General',
          activeDays: [...availableDays],
          isAttending: true,
          isSettled: false,
        }));

      const newEvt = await createEvent({
        title: title.trim(),
        year: parseInt(year, 10) || new Date().getFullYear(),
        availableDays,
        participants,
        expenses: [],
      });

      setEvents((prev) => [newEvt, ...prev]);
      closeModal();
      showToast(`Evento "${newEvt.title}" creado con éxito`, 'success');
      selectEvent(newEvt.id);
    } catch (err) {
      console.error('Error creando evento:', err);
      showToast('Error al crear evento', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-md animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge">NUEVO EVENTO</span>
              <h3 className="dialog-title">Crear Evento Anual</h3>
            </div>
            <button 
              type="button" 
              className="btn-icon-glass btn-close-dialog" 
              onClick={closeModal} 
              aria-label="Cerrar"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="dialog-form">
            <div className="form-group">
              <label htmlFor="new-event-title">Nombre del Evento / Vacaciones *</label>
              <input 
                type="text" 
                id="new-event-title" 
                className="glass-input" 
                placeholder="ej. Vacaciones Chapantongo 2026" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
                autocomplete="off"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="new-event-year">Año *</label>
                <input 
                  type="number" 
                  id="new-event-year" 
                  className="glass-input" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-event-days">Número de Días Cobrables</label>
                <input 
                  type="number" 
                  id="new-event-days" 
                  className="glass-input" 
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min="1" 
                  max="30" 
                  required 
                />
              </div>
            </div>

            <div className="directory-picker-section">
              <div className="picker-header">
                <span className="picker-title">
                  Importar Integrantes del Directorio ({selectedDirectoryIds.size} seleccionados)
                </span>
                <button 
                  type="button" 
                  onClick={handleSelectAll} 
                  className="btn-link-cyan"
                >
                  {selectedDirectoryIds.size === directory.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
              </div>

              <div className="directory-checklist-scroll">
                {directory.length === 0 ? (
                  <p className="empty-hint-text">No hay contactos en el directorio maestro aún.</p>
                ) : (
                  directory.map((d) => (
                    <label key={d.id} className="directory-check-item">
                      <input 
                        type="checkbox" 
                        checked={selectedDirectoryIds.has(d.id)}
                        onChange={() => handleToggleParticipant(d.id)}
                      />
                      <span className="dir-item-name">{d.name}</span>
                      <span className="dir-item-sub">({d.subFamily || 'General'})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="dialog-footer">
              <button type="button" className="btn-pill-glass" onClick={closeModal}>
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-pill-primary" 
                disabled={submitting}
              >
                <Icon name="plus" size={16} />
                <span>{submitting ? 'Creando...' : 'Crear Evento'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewEventModal;
