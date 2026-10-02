/**
 * ChapApp - Modal de Importación de Integrantes al Evento Activo
 * Diseñado exclusivamente para el Dashboard del Evento
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { 
  getGlobalDirectory, 
  fetchGlobalDirectoryFromSupabase,
  addParticipant 
} from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const ImportParticipantsModal = () => {
  const { 
    activeModal, 
    closeModal, 
    activeEvent, 
    refreshActiveEvent, 
    directory, 
    setDirectory, 
    familyGroups,
    showToast 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Cargar directorio fresco al abrir el modal
  useEffect(() => {
    if (activeModal === 'importParticipants' || activeModal === 'importDirectory') {
      const loadData = async () => {
        try {
          const cached = getGlobalDirectory();
          if (Array.isArray(cached) && cached.length > 0) {
            setDirectory(cached);
          }
          const fresh = await fetchGlobalDirectoryFromSupabase();
          if (Array.isArray(fresh)) {
            setDirectory(fresh);
          }
        } catch (err) {
          console.warn('[ImportParticipantsModal] Error cargando directorio:', err);
        }
      };

      loadData();
      setSearch('');
      setSelectedIds(new Set());
    }
  }, [activeModal, setDirectory]);

  // Integrantes ya agregados al evento activo
  const existingNames = useMemo(() => {
    if (!activeEvent || !Array.isArray(activeEvent.participants)) return new Set();
    return new Set(activeEvent.participants.map((p) => (p.name || '').toLowerCase().trim()));
  }, [activeEvent]);

  // Contactos disponibles para importar (excluyendo los que ya están en el evento)
  const availableContacts = useMemo(() => {
    const rawList = Array.isArray(directory) ? directory : [];
    return rawList.filter((d) => {
      if (!d) return false;
      const fullName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''}`).trim();
      return !existingNames.has(fullName.toLowerCase());
    });
  }, [directory, existingNames]);

  // Filtrado por buscador
  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availableContacts;
    const q = search.toLowerCase();
    return availableContacts.filter((d) => {
      const full = `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''} ${d.name || ''}`.toLowerCase();
      const sf = (d.subFamily || '').toLowerCase();
      return full.includes(q) || sf.includes(q);
    });
  }, [availableContacts, search]);

  if (activeModal !== 'importParticipants' && activeModal !== 'importDirectory') return null;

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAvailable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAvailable.map((d) => d.id)));
    }
  };

  const handleImportSelected = async () => {
    if (!activeEvent || selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
      const rawList = Array.isArray(directory) ? directory : [];
      const toImport = rawList.filter((d) => selectedIds.has(d.id));

      for (const item of toImport) {
        const cat = item.categoria || item.category || 'adulto';
        const wVal = item.ponderacion ?? item.weight ?? (cat === 'nino' ? 0.5 : 1.0);

        await addParticipant(activeEvent.id, {
          nombre: item.nombre || item.name,
          apellido_paterno: item.apellido_paterno || '',
          apellido_materno: item.apellido_materno || '',
          telefono: item.telefono || '',
          name: item.name || `${item.nombre || ''} ${item.apellido_paterno || ''}`.trim(),
          grupo_familiar_id: item.grupo_familiar_id || null,
          subFamily: item.subFamily || 'Familia General',
          category: cat,
          weight: parseFloat(wVal) || 1.0,
          activeDays: [...availableDays],
          isAttending: true,
          isSettled: false,
        });
      }

      await refreshActiveEvent();
      closeModal();
      showToast(`¡${toImport.length} integrantes importados exitosamente al evento!`, 'success');
    } catch (err) {
      console.error('Error importando al evento:', err);
      showToast('Error al importar integrantes al evento', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
              <span className="dialog-badge">ASISTENCIA DEL EVENTO</span>
              <h3 className="dialog-title">Importar Integrantes del Directorio</h3>
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

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
              Selecciona a los familiares registrados en el directorio maestro que participarán en <strong>{activeEvent?.title}</strong>.
            </p>

            {/* Barra de Búsqueda y Seleccionar Todos */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Buscar familiar o núcleo..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', height: '38px', borderRadius: 'var(--radius-pill)', paddingLeft: '36px' }}
                  autoComplete="off"
                />
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Icon name="search" size={15} />
                </div>
              </div>

              {filteredAvailable.length > 0 && (
                <button 
                  type="button" 
                  onClick={handleSelectAll} 
                  className="btn-pill-glass"
                  style={{ height: '38px', fontSize: '0.80rem' }}
                >
                  {selectedIds.size === filteredAvailable.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
              )}
            </div>

            {/* Lista de Selección */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {availableContacts.length === 0 ? (
                <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Icon name="check-circle" size={36} color="var(--color-primary)" />
                  <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '10px', marginBottom: '4px' }}>
                    Todos los integrantes del directorio ya están registrados en este evento.
                  </p>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                    Para agregar nuevas personas, regístralas en el Directorio General o agrega participantes manuales.
                  </p>
                </div>
              ) : filteredAvailable.length === 0 ? (
                <p className="empty-text">Sin coincidencias para "{search}".</p>
              ) : (
                filteredAvailable.map((d) => {
                  const isChild = d.category === 'nino' || d.categoria === 'nino';
                  const isSelected = selectedIds.has(d.id);
                  const fullName = `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''}`.replace(/\s+/g, ' ').trim() || d.name;
                  const weightVal = d.ponderacion ?? d.weight ?? (isChild ? 0.5 : 1.0);

                  return (
                    <label 
                      key={d.id} 
                      className={`glass-panel ${isSelected ? 'selected-row' : ''}`}
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: '14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        cursor: 'pointer',
                        border: isSelected ? '1.5px solid var(--border-neon-cyan)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(d.id)}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div className={`contact-avatar-circle ${isChild ? 'avatar-child' : 'avatar-adult'}`} style={{ width: '36px', height: '36px' }}>
                        <Icon name={isChild ? 'smile' : 'user'} size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>{fullName}</span>
                          <span className="badge-pill badge-neutral" style={{ fontSize: '0.70rem', padding: '1px 7px' }}>
                            {d.subFamily || 'Familia General'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span>{isChild ? 'Niño' : 'Adulto'}</span>
                          <span>•</span>
                          <span>{weightVal} ud</span>
                          {d.telefono && (
                            <>
                              <span>•</span>
                              <span><Icon name="phone" size={10} /> {d.telefono}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-pill-glass" onClick={closeModal}>
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleImportSelected} 
              className="btn-pill-cyan"
              disabled={submitting || selectedIds.size === 0}
            >
              <Icon name="check" size={16} />
              <span>{submitting ? 'Importando...' : `Importar (${selectedIds.size}) al Evento`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportParticipantsModal;
