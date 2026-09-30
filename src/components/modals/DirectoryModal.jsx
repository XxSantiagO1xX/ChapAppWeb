/**
 * ChapApp - Modal Directorio Global (DirectoryModal) React
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { 
  getGlobalDirectory, 
  saveGlobalDirectory, 
  addParticipant 
} from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const DirectoryModal = () => {
  const { 
    activeModal, 
    closeModal, 
    activeEvent, 
    refreshActiveEvent, 
    directory, 
    setDirectory, 
    showToast,
    openModal 
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubFamily, setNewSubFamily] = useState('');
  const [newCategory, setNewCategory] = useState('adulto');
  const [newWeight, setNewWeight] = useState(1.0);
  const [selectedForImport, setSelectedForImport] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeModal === 'directory') {
      try {
        const dir = getGlobalDirectory();
        setDirectory(dir || []);
        if (activeEvent && dir) {
          // Filtrar los que no estén ya en el evento
          const existingNames = new Set((activeEvent.participants || []).map((p) => p.name.toLowerCase()));
          const available = dir.filter((d) => !existingNames.has(d.name.toLowerCase())).map((d) => d.id);
          setSelectedForImport(new Set(available));
        }
      } catch (err) {
        console.warn('[DirectoryModal] Error cargando directorio:', err);
      }
      setSearch('');
      setShowAddForm(false);
      setNewName('');
      setNewSubFamily('');
      setNewCategory('adulto');
      setNewWeight(1.0);
    }
  }, [activeModal, activeEvent, setDirectory]);

  if (activeModal !== 'directory') return null;

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Ingresa el nombre del integrante', 'info');
      return;
    }
    if (!newSubFamily.trim()) {
      showToast('Ingresa la subfamilia', 'info');
      return;
    }

    const newContact = {
      id: 'dir_' + Date.now() + Math.random().toString(36).substring(2, 6),
      name: newName.trim(),
      subFamily: newSubFamily.trim(),
      category: newCategory,
      weight: parseFloat(newWeight) || (newCategory === 'nino' ? 0.5 : 1.0),
    };

    const updated = [...directory, newContact];
    setDirectory(updated);
    saveGlobalDirectory(updated);
    setNewName('');
    setNewSubFamily('');
    setShowAddForm(false);
    showToast(`"${newContact.name}" agregado al directorio maestro`, 'success');
  };

  const handleDeleteContact = (contactId, contactName) => {
    openModal('confirm', {
      title: '¿Eliminar del Directorio?',
      message: `¿Deseas eliminar a "${contactName}" del directorio maestro?`,
      variant: 'danger',
      onConfirm: () => {
        const updated = directory.filter((d) => d.id !== contactId);
        setDirectory(updated);
        saveGlobalDirectory(updated);
        showToast(`"${contactName}" eliminado del directorio`, 'info');
      },
    });
  };

  const handleToggleSelectImport = (id) => {
    setSelectedForImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImportToActiveEvent = async () => {
    if (!activeEvent || selectedForImport.size === 0) return;

    setSubmitting(true);
    try {
      const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
      const toImport = directory.filter((d) => selectedForImport.has(d.id));

      for (const item of toImport) {
        await addParticipant(activeEvent.id, {
          name: item.name,
          subFamily: item.subFamily || 'General',
          category: item.category || 'adulto',
          weight: item.weight || (item.category === 'nino' ? 0.5 : 1.0),
          activeDays: [...availableDays],
          isAttending: true,
          isSettled: false,
        });
      }

      await refreshActiveEvent();
      closeModal();
      showToast(`¡${toImport.length} integrantes importados al evento!`, 'success');
    } catch (err) {
      console.error('Error importando al evento:', err);
      showToast('Error al importar integrantes', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Agrupar por subfamilia
  const filtered = directory.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || (d.subFamily || '').toLowerCase().includes(q);
  });

  const grouped = {};
  filtered.forEach((d) => {
    const sf = d.subFamily || 'Familia General';
    if (!grouped[sf]) grouped[sf] = [];
    grouped[sf].push(d);
  });

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-lg animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge">DIRECTORIO MAESTRO</span>
              <h3 className="dialog-title">Directorio Global de Participantes</h3>
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

          <div className="directory-modal-body">
            <div className="directory-top-actions">
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Buscar participante o subfamilia..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autocomplete="off"
              />
              <button 
                type="button" 
                onClick={() => setShowAddForm((prev) => !prev)}
                className="btn-pill-primary"
              >
                <Icon name="user-plus" size={16} />
                <span>+ Nuevo Contacto</span>
              </button>
            </div>

            {/* Formulario Plegable para Agregar Contacto */}
            {showAddForm && (
              <form 
                onSubmit={handleSaveContact}
                className="glass-panel animate-fade-in" 
                style={{ padding: '20px', margin: '14px 0', borderRadius: '18px', border: '1px solid var(--border-neon-cyan)' }}
              >
                <h4 style={{ fontSize: '1.0rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
                  Agregar Nuevo Integrante al Directorio Maestro
                </h4>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Nombre Completo *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Carlos Santiago" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required 
                      autocomplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Subfamilia *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Familia Santiago Morales" 
                      value={newSubFamily}
                      onChange={(e) => setNewSubFamily(e.target.value)}
                      required 
                      autocomplete="off"
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Categoría</label>
                    <select 
                      className="glass-select"
                      value={newCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setNewCategory(cat);
                        setNewWeight(cat === 'nino' ? 0.5 : 1.0);
                      }}
                    >
                      <option value="adulto">Adulto (1.0)</option>
                      <option value="nino">Niño (0.5)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ponderación</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input" 
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)} 
                    className="btn-pill-glass"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-pill-cyan">
                    Guardar en Directorio
                  </button>
                </div>
              </form>
            )}

            <div className="directory-cards-list-container" style={{ marginTop: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {directory.length === 0 ? (
                <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>No hay contactos en el directorio maestro.</p>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>Toca "+ Nuevo Contacto" para registrar integrantes.</p>
                </div>
              ) : Object.keys(grouped).length === 0 ? (
                <p className="empty-text">Sin coincidencias con la búsqueda.</p>
              ) : (
                Object.keys(grouped).sort().map((sfName) => {
                  const contacts = grouped[sfName];
                  return (
                    <div key={sfName} className="subfamily-group-card glass-panel" style={{ padding: '16px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <strong style={{ fontSize: '1.0rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                          <Icon name="users" size={16} /> {sfName}
                        </strong>
                        <span className="badge-pill badge-neutral">{contacts.length} integrante{contacts.length === 1 ? '' : 's'}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {contacts.map((d) => {
                          const isChild = d.category === 'nino';
                          return (
                            <div key={d.id} className="directory-contact-card glass-panel">
                              <div className="dir-contact-left">
                                {activeEvent && (
                                  <input 
                                    type="checkbox" 
                                    checked={selectedForImport.has(d.id)}
                                    onChange={() => handleToggleSelectImport(d.id)}
                                    style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                                  />
                                )}
                                <div className={`contact-avatar-circle ${isChild ? 'avatar-child' : 'avatar-adult'}`}>
                                  <Icon name={isChild ? 'smile' : 'user'} size={16} />
                                </div>
                                <div className="contact-info-col">
                                  <span className="contact-name">{d.name}</span>
                                  <span className="contact-sf-sub">{sfName} • {d.weight || (isChild ? 0.5 : 1.0)} ud</span>
                                </div>
                              </div>
                              <button 
                                type="button"
                                className="btn-icon-danger"
                                onClick={() => handleDeleteContact(d.id, d.name)}
                                title="Eliminar del directorio"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-pill-glass" onClick={closeModal}>
              Cerrar
            </button>
            {activeEvent && selectedForImport.size > 0 && (
              <button 
                type="button" 
                onClick={handleImportToActiveEvent} 
                className="btn-pill-cyan"
                disabled={submitting}
              >
                <Icon name="check" size={16} />
                <span>{submitting ? 'Importando...' : `Importar ${selectedForImport.size} al Evento`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectoryModal;
