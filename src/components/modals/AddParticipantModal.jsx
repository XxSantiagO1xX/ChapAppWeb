/**
 * ChapApp - Modal Agregar Participante al Evento (AddParticipantModal) React
 * Soporte para Modelo Híbrido de Jerarquía Familiar (Campos separados y grupos familiares)
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { addParticipant } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const AddParticipantModal = () => {
  const { activeModal, closeModal, activeEvent, refreshActiveEvent, familyGroups, showToast } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastNamePaternal, setLastNamePaternal] = useState('');
  const [lastNameMaternal, setLastNameMaternal] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [category, setCategory] = useState('adulto');
  const [weight, setWeight] = useState(1.0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeModal === 'addParticipant') {
      setFirstName('');
      setLastNamePaternal('');
      setLastNameMaternal('');
      setPhone('');
      setCategory('adulto');
      setWeight(1.0);
      setSubmitting(false);

      if (familyGroups && familyGroups.length > 0) {
        setSelectedGroupId(familyGroups[0].id);
      } else {
        setSelectedGroupId('');
      }
    }
  }, [activeModal, familyGroups]);

  if (activeModal !== 'addParticipant' || !activeEvent) return null;

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    setWeight(newCat === 'nino' ? 0.5 : 1.0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      showToast('Ingresa el nombre del participante', 'info');
      return;
    }

    const matchedGroup = (familyGroups || []).find((g) => g.id === selectedGroupId);
    const subFamilyName = matchedGroup ? matchedGroup.nombre : 'Familia General';
    const fullName = `${firstName.trim()} ${lastNamePaternal.trim()} ${lastNameMaternal.trim()}`.replace(/\s+/g, ' ').trim();

    setSubmitting(true);
    try {
      const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
      await addParticipant(activeEvent.id, {
        nombre: firstName.trim(),
        apellido_paterno: lastNamePaternal.trim() || '',
        apellido_materno: lastNameMaternal.trim() || '',
        telefono: phone.trim() || '',
        name: fullName,
        category,
        weight: parseFloat(weight) || (category === 'nino' ? 0.5 : 1.0),
        grupo_familiar_id: selectedGroupId || null,
        subFamily: subFamilyName,
        activeDays: [...availableDays],
        isAttending: true,
        isSettled: false,
      });

      await refreshActiveEvent();
      closeModal();
      showToast(`Participante "${fullName}" agregado al evento`, 'success');
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
              <label htmlFor="participant-firstname">Nombre(s) *</label>
              <input 
                type="text" 
                id="participant-firstname" 
                className="glass-input" 
                placeholder="ej. Ariel" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required 
                autoComplete="off"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="participant-paternal">Apellido Paterno</label>
                <input 
                  type="text" 
                  id="participant-paternal" 
                  className="glass-input" 
                  placeholder="ej. Santiago" 
                  value={lastNamePaternal}
                  onChange={(e) => setLastNamePaternal(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="participant-maternal">Apellido Materno</label>
                <input 
                  type="text" 
                  id="participant-maternal" 
                  className="glass-input" 
                  placeholder="ej. Velázquez" 
                  value={lastNameMaternal}
                  onChange={(e) => setLastNameMaternal(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="participant-phone">Teléfono (WhatsApp)</label>
              <input 
                type="tel" 
                id="participant-phone" 
                className="glass-input" 
                placeholder="ej. 5512345678" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
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
              <label htmlFor="participant-group">Grupo Familiar / Núcleo *</label>
              <select 
                id="participant-group" 
                className="glass-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                required
              >
                {(familyGroups || []).map((g) => {
                  const isSub = Boolean(g.nodo_padre_id);
                  const label = isSub 
                    ? `↳ ${g.nombre} (${g.es_independiente ? 'Autónomo' : 'Dependiente'})` 
                    : `★ ${g.nombre} (Rama Principal)`;
                  return (
                    <option key={g.id} value={g.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
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
