/**
 * ChapApp - Directorio General y Jerarquía Familiar (Vista de Pantalla Completa)
 * Soporte completo para Modelo Híbrido, CRUD de Integrantes (con Ponderación) y Familias
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { 
  getGlobalDirectory, 
  fetchGlobalDirectoryFromSupabase,
  saveGlobalDirectory, 
  createFamilyGroup,
  updateFamilyGroup,
  deleteFamilyGroup,
  addDirectoryContact,
  updateDirectoryContact,
  deleteDirectoryContact,
  SEED_DIRECTORY
} from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const DirectoryView = () => {
  const { 
    activeEvent, 
    refreshActiveEvent, 
    directory, 
    setDirectory, 
    familyGroups,
    refreshFamilyGroups,
    updateFamilyGroupIndependence,
    navigateToView,
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

  // Estado para Edición de Integrante (Modal de Edición)
  const [editingContact, setEditingContact] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastNamePaternal, setEditLastNamePaternal] = useState('');
  const [editLastNameMaternal, setEditLastNameMaternal] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editCategory, setEditCategory] = useState('adulto');
  const [editWeight, setEditWeight] = useState(1.0);

  // Estado para Edición de Grupo Familiar (Modal de Edición)
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupParentId, setEditGroupParentId] = useState('');
  const [editGroupIsIndependent, setEditGroupIsIndependent] = useState(false);

  // Estados para diálogos del sistema (Confirmación centrada en pantalla)
  const [contactToDelete, setContactToDelete] = useState(null); // { id, name }
  const [familyToDelete, setFamilyToDelete] = useState(null);   // { id, name }
  const [submitting, setSubmitting] = useState(false);

  // Carga inicial sincronizada desde Supabase y caché
  useEffect(() => {
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
        console.warn('[DirectoryView] Error cargando directorio:', err);
      }
    };
    loadData();
  }, [setDirectory]);

  // Asignar primer grupo familiar por defecto si no hay seleccionado
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

  // Sembrar datos demo iniciales si está vacío
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

  // Guardar Nuevo Grupo Familiar
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

  // Abrir Modal de Edición de Integrante
  const handleOpenEditContact = (contact) => {
    setEditingContact(contact);
    setEditFirstName(contact.nombre || contact.name || '');
    setEditLastNamePaternal(contact.apellido_paterno || '');
    setEditLastNameMaternal(contact.apellido_materno || '');
    setEditPhone(contact.telefono || '');
    setEditGroupId(contact.grupo_familiar_id || '');
    const cat = contact.categoria || contact.category || 'adulto';
    setEditCategory(cat);
    setEditWeight(contact.ponderacion ?? contact.weight ?? (cat === 'nino' ? 0.5 : 1.0));
  };

  // Guardar Edición de Integrante
  const handleSaveEditContact = async (e) => {
    e.preventDefault();
    if (!editingContact || !editFirstName.trim()) {
      showToast('El nombre no puede estar vacío', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const groups = Array.isArray(familyGroups) ? familyGroups : [];
      const matchedGroup = groups.find((g) => g.id === editGroupId);
      const subFamilyName = matchedGroup ? (matchedGroup.nombre || matchedGroup.name) : 'Familia General';
      const wVal = parseFloat(editWeight) || (editCategory === 'nino' ? 0.5 : 1.0);

      const updated = await updateDirectoryContact(editingContact.id, {
        nombre: editFirstName.trim(),
        apellido_paterno: editLastNamePaternal.trim(),
        apellido_materno: editLastNameMaternal.trim(),
        telefono: editPhone.trim(),
        grupo_familiar_id: editGroupId || null,
        subFamily: subFamilyName,
        category: editCategory,
        categoria: editCategory,
        weight: wVal,
        ponderacion: wVal,
      });

      if (updated) {
        const currentDir = Array.isArray(directory) ? directory : [];
        setDirectory(currentDir.map((d) => (d.id === editingContact.id ? updated : d)));
        showToast(`Datos de "${updated.name}" actualizados correctamente`, 'success');
        setEditingContact(null);
      }
    } catch (err) {
      console.error('Error actualizando integrante:', err);
      showToast('Error al actualizar datos del integrante', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir Modal de Edición de Grupo Familiar
  const handleOpenEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.nombre || group.name || '');
    setEditGroupParentId(group.nodo_padre_id || '');
    setEditGroupIsIndependent(Boolean(group.es_independiente));
  };

  // Guardar Edición de Grupo Familiar
  const handleSaveEditGroup = async (e) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName.trim()) {
      showToast('El nombre del grupo familiar es requerido', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const isRoot = !editGroupParentId;
      const updated = await updateFamilyGroup(editingGroup.id, {
        nombre: editGroupName.trim(),
        nodo_padre_id: editGroupParentId || null,
        es_independiente: isRoot ? true : Boolean(editGroupIsIndependent),
      });

      if (updated) {
        await refreshFamilyGroups();
        // Si hay evento activo, refrescar para que el corte y árbol de tickets se reevalúen
        if (activeEvent?.id) {
          await refreshActiveEvent();
        }
        showToast(`Grupo "${updated.nombre}" actualizado con éxito`, 'success');
        setEditingGroup(null);
      }
    } catch (err) {
      console.error('Error actualizando grupo familiar:', err);
      showToast('Error al actualizar grupo familiar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Ejecutar Eliminación de Contacto
  const handleExecuteDeleteContact = async () => {
    if (!contactToDelete) return;
    setSubmitting(true);
    try {
      await deleteDirectoryContact(contactToDelete.id, contactToDelete.name);
      const currentDir = Array.isArray(directory) ? directory : [];
      setDirectory(currentDir.filter((d) => d.id !== contactToDelete.id));
      showToast(`"${contactToDelete.name}" eliminado permanentemente`, 'success');
    } catch (err) {
      console.error('Error eliminando contacto:', err);
      showToast('Error al eliminar contacto del directorio', 'error');
    } finally {
      setSubmitting(false);
      setContactToDelete(null);
    }
  };

  // Ejecutar Eliminación de Familia
  const handleExecuteDeleteFamily = async () => {
    if (!familyToDelete) return;
    setSubmitting(true);
    try {
      await deleteFamilyGroup(familyToDelete.id);
      const currentDir = Array.isArray(directory) ? directory : [];
      const updatedDir = currentDir.map((c) => {
        if (c.grupo_familiar_id === familyToDelete.id) {
          return { ...c, grupo_familiar_id: null, subFamily: 'Familia General' };
        }
        return c;
      });
      setDirectory(updatedDir);
      saveGlobalDirectory(updatedDir);
      await refreshFamilyGroups();
      showToast(`Familia "${familyToDelete.name}" eliminada`, 'info');
    } catch (err) {
      console.error('Error eliminando familia:', err);
      showToast('Error al eliminar grupo familiar', 'error');
    } finally {
      setSubmitting(false);
      setFamilyToDelete(null);
    }
  };

  // Filtrado de contactos reactivo
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

  // Agrupación Jerárquica Híbrida
  const { topLevelCards, unassignedContacts, totalStats } = useMemo(() => {
    const assignedIds = new Set();
    const rawGroups = Array.isArray(familyGroups) ? familyGroups : [];

    // Ramas Principales y Sub-núcleos Autónomos
    const topGroups = rawGroups.filter((g) => !g.nodo_padre_id || g.es_independiente);

    const cards = topGroups.map((group) => {
      const gName = (group.nombre || group.name || '').toLowerCase();

      // Contactos directos
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

      // Sub-núcleos dependientes
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

    return { 
      topLevelCards: cards, 
      unassignedContacts: unassigned,
      totalStats: {
        totalMembers: (directory || []).length,
        totalFamilies: rawGroups.length,
        rootBranches: rawGroups.filter((g) => !g.nodo_padre_id).length,
      }
    };
  }, [familyGroups, filteredContacts, directory]);

  const rawGroups = Array.isArray(familyGroups) ? familyGroups : [];
  const rawDirectory = Array.isArray(directory) ? directory : [];

  return (
    <div className="directory-fullview-container animate-fade-in" style={{ width: '100%', maxWidth: '1240px', margin: '0 auto', padding: '0 12px 60px 12px' }}>
      {/* Barra de Navegación y Encabezado Protagónico */}
      <div className="glass-panel" style={{ padding: '22px 26px', borderRadius: '24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <button 
                type="button" 
                onClick={() => navigateToView(activeEvent ? 'dashboard' : 'events')} 
                className="btn-pill-glass"
                style={{ height: '34px', padding: '0 14px', fontSize: '0.82rem' }}
                title="Regresar a la vista anterior"
              >
                <Icon name="arrow-left" size={15} />
                <span>{activeEvent ? `Volver a ${activeEvent.title}` : 'Volver a Eventos'}</span>
              </button>
              <span className="dialog-badge" style={{ margin: 0 }}>MODELO HÍBRIDO</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Directorio General & Jerarquía Familiar
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              {totalStats.totalMembers} integrantes registrados • {totalStats.totalFamilies} núcleos familiares ({totalStats.rootBranches} ramas principales)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => setActiveFormTab((prev) => prev === 'contact' ? null : 'contact')}
              className={activeFormTab === 'contact' ? 'btn-pill-cyan' : 'btn-pill-primary'}
              style={{ height: '42px', padding: '0 18px' }}
            >
              <Icon name="user-plus" size={17} />
              <span>+ Integrante</span>
            </button>
            <button 
              type="button" 
              onClick={() => setActiveFormTab((prev) => prev === 'group' ? null : 'group')}
              className={activeFormTab === 'group' ? 'btn-pill-cyan' : 'btn-pill-glass'}
              style={{ height: '42px', padding: '0 18px' }}
              title="Registrar una nueva rama genealógica o sub-núcleo"
            >
              <Icon name="users" size={17} />
              <span>+ Rama / Núcleo</span>
            </button>
          </div>
        </div>

        {/* Buscador de Integrantes y Familias */}
        <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Buscar por nombre, apellidos, teléfono o familia..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px', height: '44px', borderRadius: 'var(--radius-pill)', width: '100%' }}
              autoComplete="off"
            />
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <Icon name="search" size={17} />
            </div>
            {search && (
              <button 
                type="button"
                onClick={() => setSearch('')}
                className="btn-icon-glass"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '26px', height: '26px' }}
                aria-label="Limpiar búsqueda"
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FORMULARIO 1: Registrar Nuevo Integrante */}
      {activeFormTab === 'contact' && (
        <form 
          onSubmit={handleSaveContact}
          className="glass-panel animate-scale-in" 
          style={{ padding: '24px 26px', marginBottom: '22px', borderRadius: '22px', border: '1.5px solid var(--border-neon-cyan)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Icon name="user-plus" size={20} color="var(--color-primary)" />
              Registrar Nuevo Integrante
            </h4>
            <button type="button" onClick={() => setActiveFormTab(null)} className="btn-icon-glass" style={{ width: '30px', height: '30px' }}>
              <Icon name="close" size={15} />
            </button>
          </div>
          
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
              <label>Núcleo Familiar Asignado *</label>
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
              <label>Categoría y Ponderación de Cobro</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: '8px' }}>
                <select 
                  className="glass-select"
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setCategory(cat);
                    setWeight(cat === 'nino' ? 0.5 : 1.0);
                  }}
                >
                  <option value="adulto">Adulto (1.0 ud)</option>
                  <option value="nino">Niño (0.5 ud)</option>
                </select>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0"
                  className="glass-input" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  title="Unidades de ponderación en prorrateo"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setActiveFormTab(null)} className="btn-pill-glass">
              Cancelar
            </button>
            <button type="submit" className="btn-pill-cyan">
              Guardar Integrante
            </button>
          </div>
        </form>
      )}

      {/* FORMULARIO 2: Registrar Rama Principal o Sub-núcleo */}
      {activeFormTab === 'group' && (
        <form 
          onSubmit={handleSaveGroup}
          className="glass-panel animate-scale-in" 
          style={{ padding: '24px 26px', marginBottom: '22px', borderRadius: '22px', border: '1.5px solid var(--border-neon-emerald)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Icon name="users" size={20} color="#10b981" />
              Registrar Rama Principal o Sub-núcleo
            </h4>
            <button type="button" onClick={() => setActiveFormTab(null)} className="btn-icon-glass" style={{ width: '30px', height: '30px' }}>
              <Icon name="close" size={15} />
            </button>
          </div>
          
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
            <div className="glass-panel" style={{ padding: '14px 16px', margin: '10px 0 16px 0', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>¿Asume deuda propia (Independiente)?</strong>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {newGroupIsIndependent 
                    ? 'Generará su propio ticket de cobro individual en los cortes y aparecerá como tarjeta de primer nivel.' 
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button type="button" onClick={() => setActiveFormTab(null)} className="btn-pill-glass">
              Cancelar
            </button>
            <button type="submit" className="btn-pill-cyan">
              Guardar Grupo Familiar
            </button>
          </div>
        </form>
      )}

      {/* LISTADO JERÁRQUICO COMPLETO */}
      <div className="directory-cards-container">
        {rawDirectory.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: '24px' }}>
            <div className="confirm-icon-box" style={{ margin: '0 auto 16px auto', color: 'var(--color-primary)' }}>
              <Icon name="users" size={48} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              El Directorio Maestro está listo para comenzar
            </h3>
            <p style={{ fontSize: '0.90rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
              Puedes sembrar las familias iniciales preconfiguradas o comenzar registrando integrantes y ramas familiares manualmente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleSeedDirectory} className="btn-pill-cyan">
                <Icon name="refresh" size={16} />
                <span>Cargar Familias Iniciales</span>
              </button>
              <button type="button" onClick={() => setActiveFormTab('contact')} className="btn-pill-primary">
                <Icon name="user-plus" size={16} />
                <span>+ Registrar Primer Integrante</span>
              </button>
            </div>
          </div>
        ) : topLevelCards.length === 0 && unassignedContacts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: '20px' }}>
            <p style={{ fontSize: '1.0rem', color: 'var(--text-secondary)' }}>
              No se encontraron coincidencias para la búsqueda "<strong>{search}</strong>".
            </p>
            <button type="button" onClick={() => setSearch('')} className="btn-pill-glass" style={{ marginTop: '12px' }}>
              Limpiar filtro
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {topLevelCards.map((group) => {
              const parentGroup = group.nodo_padre_id ? rawGroups.find((p) => p.id === group.nodo_padre_id) : null;

              return (
                <div key={group.id} className="family-branch-card">
                  {/* CABECERA DEL GRUPO FAMILIAR / RAMA PRINCIPAL */}
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Control de Independencia si es sub-núcleo autónomo */}
                      {group.isIndependentChild && (
                        <button
                          type="button"
                          className="btn-toggle-independence is-indep"
                          onClick={() => updateFamilyGroupIndependence(group.id, false)}
                          title="Hacer dependiente para acumular (roll-up) en el ticket de su rama principal"
                        >
                          <Icon name="link" size={13} />
                          <span>Hacer Dependiente de {parentGroup ? (parentGroup.nombre || parentGroup.name) : 'Padre'}</span>
                        </button>
                      )}

                      {/* BOTÓN DE EDITAR GRUPO FAMILIAR */}
                      <button
                        type="button"
                        className="btn-icon-glass"
                        style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-pill)' }}
                        onClick={() => handleOpenEditGroup(group)}
                        title={`Editar grupo familiar "${group.nombre}"`}
                      >
                        <Icon name="edit" size={14} />
                      </button>

                      {/* BOTÓN DE ELIMINAR GRUPO FAMILIAR */}
                      <button
                        type="button"
                        className="btn-icon-danger"
                        style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-pill)' }}
                        onClick={() => setFamilyToDelete({ id: group.id, name: group.nombre })}
                        title={`Eliminar familia "${group.nombre}"`}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* INTEGRANTES DIRECTOS DE LA RAMA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.directContacts.length === 0 && group.dependentChildren.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                        Sin integrantes asignados directamente a esta rama.
                      </p>
                    ) : (
                      group.directContacts.map((d) => renderMemberCard(d))
                    )}
                  </div>

                  {/* SUB-NÚCLEOS DEPENDIENTES (ANIDADOS) */}
                  {group.dependentChildren.length > 0 && (
                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                              {/* BOTÓN DE EDITAR SUB-NÚCLEO */}
                              <button
                                type="button"
                                className="btn-icon-glass"
                                style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)' }}
                                onClick={() => handleOpenEditGroup(child)}
                                title={`Editar sub-núcleo "${child.nombre}"`}
                              >
                                <Icon name="edit" size={13} />
                              </button>

                              {/* BOTÓN DE ELIMINAR SUB-NÚCLEO */}
                              <button
                                type="button"
                                className="btn-icon-danger"
                                style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-pill)' }}
                                onClick={() => setFamilyToDelete({ id: child.id, name: child.nombre })}
                                title={`Eliminar sub-núcleo "${child.nombre}"`}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {child.contacts.length === 0 ? (
                              <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '2px 0' }}>
                                Sin integrantes registrados en este sub-núcleo.
                              </p>
                            ) : (
                              child.contacts.map((d) => renderMemberCard(d, child.nombre))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* INTEGRANTES SIN RAMA ASIGNADA */}
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
                  {unassignedContacts.map((d) => renderMemberCard(d))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: EDITAR INTEGRANTE (CRUD) */}
      {editingContact && (
        <div 
          className="modal-backdrop animate-fade-in"
          style={{ 
            zIndex: 99999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => { if (!submitting) setEditingContact(null); }}
        >
          <div 
            className="glass-dialog modal-md animate-scale-in" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dialog-content">
              <div className="dialog-header">
                <div className="dialog-title-group">
                  <span className="dialog-badge">ACTUALIZACIÓN CRUD</span>
                  <h3 className="dialog-title">Editar Integrante</h3>
                </div>
                <button 
                  type="button" 
                  className="btn-icon-glass btn-close-dialog" 
                  onClick={() => setEditingContact(null)} 
                  disabled={submitting}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditContact}>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Nombre(s) *</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        required 
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-group">
                      <label>Apellido Paterno</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={editLastNamePaternal}
                        onChange={(e) => setEditLastNamePaternal(e.target.value)}
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
                        value={editLastNameMaternal}
                        onChange={(e) => setEditLastNameMaternal(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="form-group">
                      <label>Teléfono (WhatsApp)</label>
                      <input 
                        type="tel" 
                        className="glass-input" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Núcleo Familiar Asignado</label>
                    <select 
                      className="glass-select"
                      value={editGroupId}
                      onChange={(e) => setEditGroupId(e.target.value)}
                    >
                      <option value="">(Sin asignar / General)</option>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ margin: 0 }}>Categoría y Unidad de Ponderación *</label>
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-primary)' }}>
                        Ajusta el peso conforme los niños crecen
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                      <select 
                        className="glass-select"
                        value={editCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setEditCategory(cat);
                          setEditWeight(cat === 'nino' ? 0.5 : 1.0);
                        }}
                      >
                        <option value="adulto">Adulto (1.0 ud)</option>
                        <option value="nino">Niño (0.5 ud)</option>
                      </select>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0"
                        className="glass-input" 
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        title="Unidades de ponderación"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="dialog-footer">
                  <button 
                    type="button" 
                    className="btn-pill-glass" 
                    onClick={() => setEditingContact(null)} 
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-pill-cyan" 
                    disabled={submitting}
                  >
                    <Icon name="check" size={16} />
                    <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR GRUPO FAMILIAR (CRUD) */}
      {editingGroup && (
        <div 
          className="modal-backdrop animate-fade-in"
          style={{ 
            zIndex: 99999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => { if (!submitting) setEditingGroup(null); }}
        >
          <div 
            className="glass-dialog modal-md animate-scale-in" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dialog-content">
              <div className="dialog-header">
                <div className="dialog-title-group">
                  <span className="dialog-badge">ACTUALIZACIÓN CRUD</span>
                  <h3 className="dialog-title">Editar Grupo Familiar</h3>
                </div>
                <button 
                  type="button" 
                  className="btn-icon-glass btn-close-dialog" 
                  onClick={() => setEditingGroup(null)} 
                  disabled={submitting}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditGroup}>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label>Nombre del Núcleo Familiar *</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="ej. Familia García Santiago (Casa Grande)"
                      required 
                      autoComplete="off"
                    />
                    <small style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Asigna un nombre distintivo para evitar confusiones de apellidos repetidos.
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Nodo Padre (Jerarquía Relacional)</label>
                    <select 
                      className="glass-select"
                      value={editGroupParentId}
                      onChange={(e) => setEditGroupParentId(e.target.value)}
                    >
                      <option value="">(Ninguno) - Es una Rama Principal</option>
                      {rawGroups
                        .filter((g) => g.id !== editingGroup.id && !g.nodo_padre_id)
                        .map((root) => (
                          <option key={root.id} value={root.id}>
                            Cuelga de: {root.nombre || root.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {editGroupParentId && (
                    <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>¿Asume deuda propia (Independiente)?</strong>
                        <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                          {editGroupIsIndependent 
                            ? 'Generará su propio ticket de cobro individual en los cortes y aparecerá como tarjeta de primer nivel.' 
                            : 'Se acumula (roll-up) en el ticket de cobro de su Rama Principal.'}
                        </p>
                      </div>
                      <label className="switch-toggle" style={{ flexShrink: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={editGroupIsIndependent}
                          onChange={(e) => setEditGroupIsIndependent(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="dialog-footer">
                  <button 
                    type="button" 
                    className="btn-pill-glass" 
                    onClick={() => setEditingGroup(null)} 
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-pill-cyan" 
                    disabled={submitting}
                  >
                    <Icon name="check" size={16} />
                    <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO DEL SISTEMA: Confirmación Centrada en Pantalla (Eliminaciones) */}
      {(contactToDelete || familyToDelete) && (
        <div 
          className="modal-backdrop animate-fade-in" 
          style={{ 
            zIndex: 100000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onClick={() => { if (!submitting) { setContactToDelete(null); setFamilyToDelete(null); } }}
        >
          <div 
            className="glass-dialog modal-sm animate-scale-in" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ 
              textAlign: 'center', 
              padding: '28px 24px', 
              maxWidth: '430px', 
              width: '92%',
              border: '1.5px solid var(--border-neon-coral)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div className="confirm-icon-box" style={{ color: 'var(--color-coral)', marginTop: '4px' }}>
                <Icon name="alert" size={44} />
              </div>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {contactToDelete ? '¿Eliminar Integrante?' : '¿Eliminar Grupo Familiar?'}
              </h3>
              
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {contactToDelete 
                  ? `¿Estás seguro de que deseas eliminar a "${contactToDelete.name}" de la base de datos y del directorio? Esta acción es permanente.`
                  : `¿Deseas eliminar el grupo familiar "${familyToDelete?.name}"? Los integrantes asignados se conservarán y pasarán a la sección de contactos generales.`}
              </p>

              <div className="dialog-footer confirm-footer" style={{ width: '100%', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="btn-pill-glass" 
                  onClick={() => { setContactToDelete(null); setFamilyToDelete(null); }}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-pill-danger"
                  onClick={contactToDelete ? handleExecuteDeleteContact : handleExecuteDeleteFamily}
                  disabled={submitting}
                >
                  {submitting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Renderizador de Tarjeta de Integrante con Botones Claros de Edición y Eliminación
  function renderMemberCard(d, subGroupName = null) {
    if (!d) return null;
    const isChild = d.category === 'nino' || d.categoria === 'nino';
    const fullName = `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''}`.replace(/\s+/g, ' ').trim() || d.name || 'Integrante';
    const weightVal = d.ponderacion ?? d.weight ?? (isChild ? 0.5 : 1.0);

    return (
      <div key={d.id} className="directory-contact-card glass-panel" style={{ padding: '10px 14px' }}>
        <div className="dir-contact-left">
          <div className={`contact-avatar-circle ${isChild ? 'avatar-child' : 'avatar-adult'}`}>
            <Icon name={isChild ? 'smile' : 'user'} size={16} />
          </div>
          <div className="contact-info-col">
            <span className="contact-name" style={{ fontWeight: 800 }}>{fullName}</span>
            <div className="contact-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              <span className={`badge-pill ${isChild ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
                {isChild ? 'Niño' : 'Adulto'}
              </span>
              <span className="badge-pill badge-neutral" style={{ fontSize: '0.72rem' }} title="Ponderación de cobro">
                {weightVal} ud
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* BOTÓN EDITAR INTEGRANTE */}
          <button 
            type="button"
            className="btn-icon-glass"
            style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-pill)' }}
            onClick={() => handleOpenEditContact(d)}
            title={`Editar datos de ${fullName}`}
          >
            <Icon name="edit" size={13} />
          </button>

          {/* BOTÓN ELIMINAR INTEGRANTE */}
          <button 
            type="button"
            className="btn-icon-danger"
            style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-pill)' }}
            onClick={() => setContactToDelete({ id: d.id, name: fullName })}
            title={`Eliminar ${fullName} del directorio maestro`}
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    );
  }
};

export default DirectoryView;
