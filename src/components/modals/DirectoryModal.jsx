/**
 * ChapApp - Modal Directorio Global (DirectoryModal) React
 * Soporte para Modelo Híbrido de Jerarquía Familiar (Ramas Principales y Sub-núcleos)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { 
  getGlobalDirectory, 
  fetchGlobalDirectoryFromSupabase,
  saveGlobalDirectory, 
  addParticipant,
  createFamilyGroup,
  addDirectoryContact,
  deleteDirectoryContact,
  generateUUID,
  SEED_DIRECTORY
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
    familyGroups,
    refreshFamilyGroups,
    updateFamilyGroupIndependence,
    showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [activeFormTab, setActiveFormTab] = useState(null); // 'contact' | 'group' | null

  // Campos para nuevo contacto
  const [firstName, setFirstName] = useState('');
  const [lastNamePaternal, setLastNamePaternal] = useState('');
  const [lastNameMaternal, setLastNameMaternal] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [category, setCategory] = useState('adulto');
  const [weight, setWeight] = useState(1.0);

  // Campos para nuevo grupo familiar
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParentId, setNewGroupParentId] = useState('');
  const [newGroupIsIndependent, setNewGroupIsIndependent] = useState(false);

  const [selectedForImport, setSelectedForImport] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null); // { id, name }

  // Carga inicial y refresco al abrir el modal
  useEffect(() => {
    if (activeModal === 'directory') {
      const loadData = async () => {
        try {
          // 1. Cargar lo que tengamos en caché inmediatamente
          const cached = getGlobalDirectory();
          if (Array.isArray(cached) && cached.length > 0) {
            setDirectory(cached);
          }

          // 2. Traer sincronizado desde Supabase
          const fresh = await fetchGlobalDirectoryFromSupabase();
          if (Array.isArray(fresh) && fresh.length > 0) {
            setDirectory(fresh);
          }

          if (activeEvent && Array.isArray(fresh)) {
            const existingNames = new Set((activeEvent.participants || []).map((p) => (p.name || '').toLowerCase()));
            const available = fresh
              .filter((d) => {
                const fullName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''}`).trim();
                return !existingNames.has(fullName.toLowerCase());
              })
              .map((d) => d.id);
            setSelectedForImport(new Set(available));
          }
        } catch (err) {
          console.warn('[DirectoryModal] Error cargando directorio:', err);
        }
      };

      loadData();
      setSearch('');
      setActiveFormTab(null);
      setContactToDelete(null);
      resetContactForm();
      resetGroupForm();
    }
  }, [activeModal, activeEvent, setDirectory]);

  // Si no hay grupo seleccionado por defecto, tomar el primero disponible
  useEffect(() => {
    const groups = Array.isArray(familyGroups) ? familyGroups : [];
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [familyGroups, selectedGroupId]);

  const resetContactForm = () => {
    setFirstName('');
    setLastNamePaternal('');
    setLastNameMaternal('');
    setPhone('');
    setCategory('adulto');
    setWeight(1.0);
  };

  const resetGroupForm = () => {
    setNewGroupName('');
    setNewGroupParentId('');
    setNewGroupIsIndependent(false);
  };

  // Cargar datos demo de semilla si está vacío
  const handleSeedDirectory = () => {
    saveGlobalDirectory(SEED_DIRECTORY);
    setDirectory(SEED_DIRECTORY);
    showToast('Directorio sembrado con familias iniciales', 'success');
  };

  // Guardar Nuevo Contacto
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      showToast('Ingresa el nombre del integrante', 'info');
      return;
    }

    const groups = Array.isArray(familyGroups) ? familyGroups : [];
    const matchedGroup = groups.find((g) => g.id === selectedGroupId);
    const subFamilyName = matchedGroup ? (matchedGroup.nombre || matchedGroup.name) : 'Familia General';
    const fullName = `${firstName.trim()} ${lastNamePaternal.trim()} ${lastNameMaternal.trim()}`.replace(/\s+/g, ' ').trim();

    try {
      const newContact = await addDirectoryContact({
        name: fullName,
        nombre: firstName.trim(),
        apellido_paterno: lastNamePaternal.trim() || '',
        apellido_materno: lastNameMaternal.trim() || '',
        telefono: phone.trim() || '',
        grupo_familiar_id: selectedGroupId || null,
        subFamily: subFamilyName,
        category,
        categoria: category,
        weight: parseFloat(weight) || (category === 'nino' ? 0.5 : 1.0),
        ponderacion: parseFloat(weight) || (category === 'nino' ? 0.5 : 1.0),
      });

      const currentDir = Array.isArray(directory) ? directory : [];
      setDirectory([...currentDir, newContact]);
      resetContactForm();
      setActiveFormTab(null);
      showToast(`"${fullName}" agregado al directorio maestro`, 'success');
    } catch (err) {
      console.error('Error guardando contacto:', err);
      showToast('Error al registrar integrante', 'error');
    }
  };

  // Guardar Nuevo Grupo / Rama Familiar
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showToast('Ingresa el nombre del grupo familiar', 'info');
      return;
    }

    try {
      const created = await createFamilyGroup({
        nombre: newGroupName.trim(),
        nodo_padre_id: newGroupParentId || null,
        es_independiente: newGroupParentId ? Boolean(newGroupIsIndependent) : true,
      });

      if (created) {
        await refreshFamilyGroups();
        setSelectedGroupId(created.id);
        resetGroupForm();
        setActiveFormTab(null);
        showToast(
          newGroupParentId 
            ? `Sub-núcleo "${created.nombre}" creado exitosamente` 
            : `Rama Principal "${created.nombre}" registrada`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error guardando grupo familiar:', err);
      showToast('Error al crear el grupo familiar', 'error');
    }
  };

  // Confirmar y Ejecutar Eliminación de Contacto (Sin cerrar el modal)
  const handleExecuteDeleteContact = async () => {
    if (!contactToDelete) return;

    try {
      await deleteDirectoryContact(contactToDelete.id, contactToDelete.name);
      const currentDir = Array.isArray(directory) ? directory : [];
      const updated = currentDir.filter((d) => d.id !== contactToDelete.id);
      setDirectory(updated);
      showToast(`"${contactToDelete.name}" eliminado del directorio`, 'info');
    } catch (err) {
      console.error('Error eliminando contacto:', err);
      showToast('Error al eliminar contacto del directorio', 'error');
    } finally {
      setContactToDelete(null);
    }
  };

  // Toggle Selección para Importar
  const handleToggleSelectImport = (id) => {
    setSelectedForImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Importar al Evento Activo
  const handleImportToActiveEvent = async () => {
    if (!activeEvent || selectedForImport.size === 0) return;

    setSubmitting(true);
    try {
      const availableDays = activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'];
      const currentDir = Array.isArray(directory) ? directory : [];
      const toImport = currentDir.filter((d) => selectedForImport.has(d.id));

      for (const item of toImport) {
        await addParticipant(activeEvent.id, {
          nombre: item.nombre || item.name,
          apellido_paterno: item.apellido_paterno || '',
          apellido_materno: item.apellido_materno || '',
          telefono: item.telefono || '',
          name: item.name || `${item.nombre || ''} ${item.apellido_paterno || ''}`.trim(),
          grupo_familiar_id: item.grupo_familiar_id,
          subFamily: item.subFamily || 'Familia General',
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

  // Filtrado de contactos seguro
  const filteredContacts = useMemo(() => {
    const rawList = Array.isArray(directory) ? directory : [];
    if (!search.trim()) return rawList;
    const q = search.toLowerCase();
    return rawList.filter((d) => {
      if (!d) return false;
      const full = `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''} ${d.name || ''}`.toLowerCase();
      const phoneMatch = (d.telefono || '').toLowerCase().includes(q);
      const sfMatch = (d.subFamily || '').toLowerCase().includes(q);
      return full.includes(q) || phoneMatch || sfMatch;
    });
  }, [directory, search]);

  // Agrupación Jerárquica Híbrida 100% segura
  const { topLevelCards, unassignedContacts } = useMemo(() => {
    const assignedIds = new Set();
    const rawGroups = Array.isArray(familyGroups) ? familyGroups : [];

    // Determinar Ramas Principales y Sub-núcleos Autónomos
    const topGroups = rawGroups.filter((g) => !g.nodo_padre_id || g.es_independiente);

    const cards = topGroups.map((group) => {
      const gName = (group.nombre || group.name || '').toLowerCase();

      // Contactos directos de este grupo
      const directContacts = filteredContacts.filter((c) => {
        if (!c) return false;
        const matchesId = c.grupo_familiar_id && c.grupo_familiar_id === group.id;
        const cSfName = (c.subFamily || '').toLowerCase();
        const matchesName = !c.grupo_familiar_id && gName && cSfName === gName;
        if (matchesId || matchesName) {
          assignedIds.add(c.id);
          return true;
        }
        return false;
      });

      // Sub-núcleos dependientes que cuelgan de este grupo
      const dependentChildren = rawGroups
        .filter((child) => child.nodo_padre_id === group.id && !child.es_independiente)
        .map((child) => {
          const chName = (child.nombre || child.name || '').toLowerCase();
          const childContacts = filteredContacts.filter((c) => {
            if (!c) return false;
            const matchesId = c.grupo_familiar_id && c.grupo_familiar_id === child.id;
            const cSfName = (c.subFamily || '').toLowerCase();
            const matchesName = !c.grupo_familiar_id && chName && cSfName === chName;
            if (matchesId || matchesName) {
              assignedIds.add(c.id);
              return true;
            }
            return false;
          });

          return {
            ...child,
            nombre: child.nombre || child.name || 'Sub-núcleo',
            contacts: childContacts,
          };
        });

      const totalMembers = directContacts.length + dependentChildren.reduce((acc, c) => acc + c.contacts.length, 0);

      return {
        ...group,
        nombre: group.nombre || group.name || 'Familia',
        directContacts,
        dependentChildren,
        totalMembers,
        isRoot: !group.nodo_padre_id,
        isIndependentChild: Boolean(group.nodo_padre_id && group.es_independiente),
      };
    });

    const unassigned = filteredContacts.filter((c) => c && !assignedIds.has(c.id));

    return { topLevelCards: cards, unassignedContacts: unassigned };
  }, [familyGroups, filteredContacts]);

  if (activeModal !== 'directory') return null;

  const rawGroups = Array.isArray(familyGroups) ? familyGroups : [];
  const rawDirectory = Array.isArray(directory) ? directory : [];

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
              <span className="dialog-badge">JERARQUÍA FAMILIAR</span>
              <h3 className="dialog-title">Directorio Maestro de Integrantes</h3>
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
            {/* Modal/Banner de Confirmación de Eliminación Local en el Directorio */}
            {contactToDelete && (
              <div className="glass-panel animate-fade-in" style={{ padding: '14px 18px', margin: '0 0 14px 0', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid var(--border-neon-coral)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="alert" size={22} />
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      ¿Eliminar a "{contactToDelete.name}" del directorio?
                    </strong>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      Se desvinculará de la lista maestra y de Supabase.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-pill-glass btn-sm" onClick={() => setContactToDelete(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-pill-danger btn-sm" onClick={handleExecuteDeleteContact}>
                    <Icon name="trash" size={14} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Barra superior de búsqueda y acciones */}
            <div className="directory-top-actions">
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Buscar por nombre, apellidos, teléfono o grupo..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button 
                  type="button" 
                  onClick={() => setActiveFormTab((prev) => prev === 'contact' ? null : 'contact')}
                  className={activeFormTab === 'contact' ? 'btn-pill-cyan' : 'btn-pill-primary'}
                >
                  <Icon name="user-plus" size={16} />
                  <span>+ Integrante</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveFormTab((prev) => prev === 'group' ? null : 'group')}
                  className={activeFormTab === 'group' ? 'btn-pill-cyan' : 'btn-pill-glass'}
                  title="Registrar una nueva rama o sub-núcleo genealógico"
                >
                  <Icon name="users" size={16} />
                  <span>+ Rama / Núcleo</span>
                </button>
              </div>
            </div>

            {/* FORMULARIO 1: Agregar Integrante */}
            {activeFormTab === 'contact' && (
              <form 
                onSubmit={handleSaveContact}
                className="glass-panel animate-fade-in" 
                style={{ padding: '20px', margin: '14px 0', borderRadius: '18px', border: '1px solid var(--border-neon-cyan)' }}
              >
                <h4 style={{ fontSize: '1.0rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="user-plus" size={18} /> Registrar Nuevo Integrante
                </h4>
                
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Nombre(s) *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Ariel" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required 
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido Paterno</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Santiago" 
                      value={lastNamePaternal}
                      onChange={(e) => setLastNamePaternal(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Apellido Materno</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Velázquez" 
                      value={lastNameMaternal}
                      onChange={(e) => setLastNameMaternal(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono (WhatsApp)</label>
                    <input 
                      type="tel" 
                      className="glass-input" 
                      placeholder="ej. 5512345678" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Núcleo Familiar / Subfamilia *</label>
                    <select 
                      className="glass-select"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      required
                    >
                      {rawGroups.map((g) => {
                        const isSub = Boolean(g.nodo_padre_id);
                        const label = isSub 
                          ? `↳ ${g.nombre || g.name} (${g.es_independiente ? 'Autónomo' : 'Dependiente'})` 
                          : `★ ${g.nombre || g.name} (Rama Principal)`;
                        return (
                          <option key={g.id} value={g.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Categoría y Ponderación</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                      <select 
                        className="glass-select"
                        value={category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setCategory(cat);
                          setWeight(cat === 'nino' ? 0.5 : 1.0);
                        }}
                      >
                        <option value="adulto">Adulto (1.0)</option>
                        <option value="nino">Niño (0.5)</option>
                      </select>
                      <input 
                        type="number" 
                        step="0.1" 
                        className="glass-input" 
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        title="Unidades de ponderación"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setActiveFormTab(null)} 
                    className="btn-pill-glass"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-pill-cyan">
                    Guardar Integrante
                  </button>
                </div>
              </form>
            )}

            {/* FORMULARIO 2: Agregar Rama o Sub-núcleo */}
            {activeFormTab === 'group' && (
              <form 
                onSubmit={handleSaveGroup}
                className="glass-panel animate-fade-in" 
                style={{ padding: '20px', margin: '14px 0', borderRadius: '18px', border: '1px solid var(--border-neon-emerald)' }}
              >
                <h4 style={{ fontSize: '1.0rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="users" size={18} /> Registrar Rama Principal o Sub-núcleo
                </h4>
                
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Nombre del Grupo Familiar *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="ej. Familia Santiago Morales" 
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required 
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nodo Padre (Jerarquía Relacional)</label>
                    <select 
                      className="glass-select"
                      value={newGroupParentId}
                      onChange={(e) => setNewGroupParentId(e.target.value)}
                    >
                      <option value="">(Ninguno) - Es una Rama Principal</option>
                      {rawGroups.filter((g) => !g.nodo_padre_id).map((root) => (
                        <option key={root.id} value={root.id}>
                          Cuelga de: {root.nombre || root.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {newGroupParentId && (
                  <div className="glass-panel" style={{ padding: '12px 14px', margin: '8px 0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>¿Asume deuda propia (Independiente)?</strong>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        {newGroupIsIndependent 
                          ? 'Generará su propio ticket de cobro individual en los cortes.' 
                          : 'Se acumula (roll-up) en el ticket de cobro de su Rama Principal.'}
                      </p>
                    </div>
                    <label className="switch-toggle" style={{ flexShrink: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={newGroupIsIndependent}
                        onChange={(e) => setNewGroupIsIndependent(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => setActiveFormTab(null)} 
                    className="btn-pill-glass"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-pill-cyan">
                    Guardar Grupo Familiar
                  </button>
                </div>
              </form>
            )}

            {/* LISTA JERÁRQUICA DE RAMAS PRINCIPALES Y SUB-NÚCLEOS */}
            <div className="directory-cards-list-container" style={{ marginTop: '12px', maxHeight: '460px', overflowY: 'auto' }}>
              {rawDirectory.length === 0 ? (
                <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '1.0rem', fontWeight: 700, marginBottom: '8px' }}>El Directorio Maestro está listo para comenzar.</p>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Puedes sembrar los contactos y familias iniciales o registrar integrantes manualmente.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button type="button" onClick={handleSeedDirectory} className="btn-pill-cyan">
                      <Icon name="users" size={16} />
                      <span>Cargar Familias Iniciales</span>
                    </button>
                    <button type="button" onClick={() => setActiveFormTab('contact')} className="btn-pill-primary">
                      <Icon name="user-plus" size={16} />
                      <span>+ Nuevo Integrante</span>
                    </button>
                  </div>
                </div>
              ) : topLevelCards.length === 0 && unassignedContacts.length === 0 ? (
                <p className="empty-text">Sin coincidencias con la búsqueda "{search}".</p>
              ) : (
                <>
                  {topLevelCards.map((group) => {
                    const parentGroup = group.nodo_padre_id ? rawGroups.find((p) => p.id === group.nodo_padre_id) : null;
                    return (
                      <div key={group.id} className="family-branch-card">
                        {/* Cabecera de la Rama Principal / Sub-núcleo Autónomo */}
                        <div className="family-branch-header">
                          <div className="family-branch-title-group">
                            <span className="family-branch-name">
                              <Icon name="users" size={18} /> {group.nombre}
                            </span>
                            
                            {group.isRoot ? (
                              <span className="badge-branch-root">Rama Principal</span>
                            ) : (
                              <span className="badge-branch-independent" title={`Cuelga de ${parentGroup ? (parentGroup.nombre || parentGroup.name) : 'Rama Principal'}`}>
                                Sub-núcleo Autónomo
                              </span>
                            )}

                            <span className="badge-pill badge-neutral">
                              {group.totalMembers} integrante{group.totalMembers === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Control de Independencia si es un sub-núcleo promovido a primer nivel */}
                          {group.isIndependentChild && (
                            <button
                              type="button"
                              className="btn-toggle-independence is-indep"
                              onClick={() => updateFamilyGroupIndependence(group.id, false)}
                              title="Hacer dependiente para acumular (roll-up) en el ticket de su rama principal"
                            >
                              <Icon name="link" size={12} />
                              <span>Hacer Dependiente de {parentGroup ? (parentGroup.nombre || parentGroup.name) : 'Padre'}</span>
                            </button>
                          )}
                        </div>

                        {/* Integrantes directos del grupo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {group.directContacts.length === 0 && group.dependentChildren.length === 0 ? (
                            <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                              Sin integrantes asignados directamente a esta rama.
                            </p>
                          ) : (
                            group.directContacts.map((d) => renderContactRow(d))
                          )}
                        </div>

                        {/* SUB-NÚCLEOS DEPENDIENTES (ANIDADOS) */}
                        {group.dependentChildren.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            {group.dependentChildren.map((child) => (
                              <div key={child.id} className="family-subnucleus-nested">
                                <div className="subnucleus-header">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span className="subnucleus-title">
                                      <Icon name="chevron-right" size={14} /> {child.nombre}
                                    </span>
                                    <span className="badge-branch-dependent">
                                      Dependiente (Roll-Up al Ticket Padre)
                                    </span>
                                    <span className="badge-pill badge-neutral">
                                      {child.contacts.length} integrante{child.contacts.length === 1 ? '' : 's'}
                                    </span>
                                  </div>

                                  {/* Botón para independizar financieramente este sub-núcleo */}
                                  <button
                                    type="button"
                                    className="btn-toggle-independence"
                                    onClick={() => updateFamilyGroupIndependence(child.id, true)}
                                    title="Independizar este núcleo para que genere su propio ticket de cobro y aparezca como tarjeta de primer nivel"
                                  >
                                    <Icon name="check" size={12} />
                                    <span>Hacer Autónomo (Ticket Propio)</span>
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                  {child.contacts.length === 0 ? (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '2px 0' }}>
                                      Sin integrantes registrados en este sub-núcleo.
                                    </p>
                                  ) : (
                                    child.contacts.map((d) => renderContactRow(d, child.nombre))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Contactos no asignados a grupos registrados */}
                  {unassignedContacts.length > 0 && (
                    <div className="family-branch-card" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="family-branch-header">
                        <div className="family-branch-title-group">
                          <span className="family-branch-name">
                            <Icon name="users" size={18} /> Otros Integrantes / Sin Rama Asignada
                          </span>
                          <span className="badge-pill badge-neutral">
                            {unassignedContacts.length} integrante{unassignedContacts.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {unassignedContacts.map((d) => renderContactRow(d))}
                      </div>
                    </div>
                  )}
                </>
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

  // Renderizador de fila de contacto con eliminación en contexto
  function renderContactRow(d, subGroupName = null) {
    if (!d) return null;
    const isChild = d.category === 'nino' || d.categoria === 'nino';
    const fullName = `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''}`.replace(/\s+/g, ' ').trim() || d.name || 'Integrante';

    return (
      <div key={d.id} className="directory-contact-card glass-panel" style={{ padding: '8px 12px' }}>
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
            <Icon name={isChild ? 'smile' : 'user'} size={15} />
          </div>
          <div className="contact-info-col">
            <span className="contact-name" style={{ fontWeight: 700 }}>{fullName}</span>
            <div className="contact-meta-row">
              {subGroupName && (
                <span className="badge-pill badge-neutral" style={{ fontSize: '0.70rem', padding: '1px 6px' }}>
                  {subGroupName}
                </span>
              )}
              {d.telefono && (
                <span className="contact-phone-tag">
                  <Icon name="phone" size={11} /> {d.telefono}
                </span>
              )}
              <span>• {isChild ? 'Niño' : 'Adulto'}</span>
              <span>• {d.weight || d.ponderacion || (isChild ? 0.5 : 1.0)} ud</span>
            </div>
          </div>
        </div>
        <button 
          type="button"
          className="btn-icon-danger"
          onClick={() => setContactToDelete({ id: d.id, name: fullName })}
          title="Eliminar del directorio maestro"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    );
  }
};

export default DirectoryModal;
