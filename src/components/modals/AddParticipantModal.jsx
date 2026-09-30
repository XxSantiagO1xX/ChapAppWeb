/**
 * ChapApp - Modal Agregar Participante (AddParticipantModal) React
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { addParticipant } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const AddParticipantModal = () => {
  const { activeModal, closeModal, activeEvent, refreshActiveEvent, showToast } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('adulto');
  const [weight, setWeight] = useState(1.0);
  const [subFamily, setSubFamily] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeModal === 'addParticipant') {
      setName('');
      setCategory('adulto');
      setWeight(1.0);
      setSubFamily('');
      setSubmitting(false);
    }
  }, [activeModal]);

  if (activeModal !== 'addParticipant' || !activeEvent) return null;

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    setWeight(newCat === 'nino' ? 0.5 : 1.0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Ingresa el nombre del participante', 'info');
      return;
    }
    if (!subFamily.trim()) {
      showToast('Ingresa la subfamilia o grupo familiar', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
      await addParticipant(activeEvent.id, {
        name: name.trim(),
        category,
        weight: parseFloat(weight) || (category === 'nino' ? 0.5 : 1.0),
        subFamily: subFamily.trim(),
        activeDays: [...availableDays],
        isAttending: true,
        isSettled: false,
      });

      await refreshActiveEvent();
      closeModal();
      showToast(`Participante "${name.trim()}" agregado al evento`, 'success');
    } catch (err) {
      console.error('Error agregando participante:', err);
      showToast('Error al agregar integrante', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-sm animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge">ASISTENCIA</span>
              <h3 className="dialog-title">Agregar Integrante al Evento</h3>
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
              <label htmlFor="participant-name">Nombre Completo *</label>
              <input 
                type="text" 
                id="participant-name" 
                className="glass-input" 
                placeholder="ej. Don Carlos Santiago" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                autocomplete="off"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="participant-category">Categoría</label>
                <select 
                  id="participant-category" 
                  className="glass-select"
                  value={category}
                  onChange={handleCategoryChange}
                >
                  <option value="adulto">Adulto (1.0 ud)</option>
                  <option value="nino">Niño (0.5 ud)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="participant-weight">Ponderación (Factor)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  id="participant-weight" 
                  className="glass-input" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="0.1" 
                  max="5.0" 
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="participant-subfamily">Subfamilia / Grupo Familiar *</label>
              <input 
                type="text" 
                id="participant-subfamily" 
                className="glass-input" 
                placeholder="ej. Familia Santiago Chapantongo" 
                value={subFamily}
                onChange={(e) => setSubFamily(e.target.value)}
                required 
                list="subfamily-suggestions-react" 
                autocomplete="off"
              />
              <datalist id="subfamily-suggestions-react">
                <option value="Familia Santiago Chapantongo" />
                <option value="Familia Santiago Velázquez" />
                <option value="Familia Santiago Morales" />
                <option value="Amigos y Primos" />
                <option value="Familia General" />
              </datalist>
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
                <span>{submitting ? 'Agregando...' : 'Agregar Integrante'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddParticipantModal;
