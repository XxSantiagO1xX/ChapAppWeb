/**
 * ChapApp - Servicio de Base de Datos y Sincronización Web
 * Comunicación transparente con Supabase Cloud y respaldo resiliente en LocalStorage
 */

import { initSupabaseClient, getSupabase } from './supabase.js';
import { CONFIG } from '../config/config.js';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateId = () => generateUUID();

export const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

/**
 * Variables de inicialización (Vacías por defecto para garantizar que la base de datos comience limpia).
 */
export const SEED_FAMILY_GROUPS = [];
export const SEED_DIRECTORY = [];
export const INITIAL_SEED_EVENTS = [];

export const inferSubFamily = (_name, fallback = 'Familia General') => {
  return fallback;
};

// --- Manejo de Caché Local de Grupos Familiares ---
export const loadLocalFamilyGroups = () => {
  try {
    const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.FAMILY_GROUPS || 'chapapp_cached_family_groups');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveLocalFamilyGroups = (groups) => {
  try {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.FAMILY_GROUPS || 'chapapp_cached_family_groups', JSON.stringify(groups || []));
  } catch (e) {
    console.error('Error guardando family_groups en LocalStorage:', e);
  }
};

/**
 * Obtener todos los grupos familiares directamente desde Supabase Cloud
 */
export const getAllFamilyGroups = async () => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        saveLocalFamilyGroups(data);
        return data;
      }
      if (error) {
        console.warn('[Database] Consulta a family_groups en Supabase:', error.message);
      }
    } catch (e) {
      console.warn('[Database] Error consultando family_groups en Supabase:', e);
    }
    return [];
  }

  return loadLocalFamilyGroups();
};

/**
 * Crear un nuevo Grupo Familiar o Sub-núcleo directamente en Supabase
 */
export const createFamilyGroup = async ({ nombre, nodo_padre_id = null, es_independiente = false, color = '#38BDF8' }) => {
  const newGroup = {
    id: generateUUID(),
    nombre: nombre.trim(),
    nodo_padre_id: nodo_padre_id || null,
    es_independiente: Boolean(es_independiente),
    color,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('family_groups').insert(newGroup);
      if (error) {
        console.warn('[Database] Advertencia al insertar en family_groups de Supabase:', error.message);
      } else {
        console.log('[Database] ✅ Grupo familiar guardado en tabla family_groups de Supabase:', newGroup.nombre);
      }
    } catch (err) {
      console.error('[Database] Error guardando grupo familiar en Supabase:', err);
    }
  }

  const list = loadLocalFamilyGroups();
  list.push(newGroup);
  saveLocalFamilyGroups(list);
  return newGroup;
};

/**
 * Actualizar Grupo Familiar directamente en Supabase
 */
export const updateFamilyGroup = async (id, fields = {}) => {
  const supabase = await initSupabaseClient();
  if (supabase && isUUID(id)) {
    try {
      const { error } = await supabase.from('family_groups').update({
        ...fields,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) {
        console.warn('[Database] Advertencia al actualizar en family_groups de Supabase:', error.message);
      } else {
        console.log('[Database] ✅ Grupo familiar actualizado en family_groups de Supabase:', id);
      }
    } catch (err) {
      console.warn('[Database] Error actualizando grupo familiar en Supabase:', err);
    }
  }

  const list = loadLocalFamilyGroups();
  const idx = list.findIndex(g => g.id === id);
  if (idx >= 0) {
    const oldName = list[idx].nombre;
    list[idx] = { ...list[idx], ...fields, updated_at: new Date().toISOString() };
    saveLocalFamilyGroups(list);

    // Si cambió el nombre del grupo familiar, actualizar subFamily en contactos asociados
    if (fields.nombre && fields.nombre !== oldName) {
      const dir = getGlobalDirectory();
      const updatedDir = dir.map((c) => {
        if (c.grupo_familiar_id === id || (oldName && c.subFamily?.toLowerCase() === oldName.toLowerCase())) {
          return { ...c, subFamily: fields.nombre };
        }
        return c;
      });
      saveGlobalDirectory(updatedDir);
    }

    return list[idx];
  }
  return null;
};

/**
 * Eliminar Grupo Familiar directamente de Supabase
 */
export const deleteFamilyGroup = async (id) => {
  const supabase = await initSupabaseClient();
  if (supabase && isUUID(id)) {
    try {
      await supabase.from('family_groups').delete().eq('id', id);
      await supabase.from('family_groups').update({ nodo_padre_id: null, es_independiente: true }).eq('nodo_padre_id', id);
      await supabase.from('participants').update({ grupo_familiar_id: null }).eq('grupo_familiar_id', id);
      // Eliminar cualquier registro residual si existía
      await supabase.from('participants').delete().eq('id', id);
    } catch (e) {
      console.warn('[Database] Error borrando grupo familiar de Supabase:', e);
    }
  }

  let list = loadLocalFamilyGroups();
  list = list.map((g) => {
    if (g.nodo_padre_id === id) {
      return { ...g, nodo_padre_id: null, es_independiente: true };
    }
    return g;
  }).filter((g) => g.id !== id);
  saveLocalFamilyGroups(list);

  // Desvincular en directorio local
  const dir = getGlobalDirectory();
  const updatedDir = dir.map((c) => {
    if (c.grupo_familiar_id === id || (targetName && c.subFamily?.toLowerCase() === targetName.toLowerCase())) {
      return { ...c, grupo_familiar_id: null, subFamily: 'Familia General' };
    }
    return c;
  });
  saveGlobalDirectory(updatedDir);
};

// --- Manejo de Caché Local de Eventos (LocalStorage) ---
const loadLocalEvents = () => {
  try {
    const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalEvents = (events) => {
  try {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.LOCAL_EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('Error guardando en LocalStorage:', e);
  }
};

/**
 * Parser de participante desde fila de Supabase o Local
 * Conecta los campos nuevos (nombre, apellido_paterno, apellido_materno, telefono, categoria, ponderacion, grupo_familiar_id)
 * con los campos legados de la aplicación para retrocompatibilidad total.
 */
export const parseParticipantRow = (p) => {
  let days = [];
  let isAttending = true;
  let isSettled = false;
  let subFamily = '';
  let grupo_familiar_id = p.grupo_familiar_id || p.grupoFamiliarId || null;

  if (p.active_days) {
    if (typeof p.active_days === 'object' && !Array.isArray(p.active_days) && p.active_days !== null) {
      days = Array.isArray(p.active_days.days) ? p.active_days.days : [];
      if (typeof p.active_days.isAttending === 'boolean') isAttending = p.active_days.isAttending;
      if (typeof p.active_days.isSettled === 'boolean') isSettled = p.active_days.isSettled;
      if (p.active_days.subFamily) subFamily = p.active_days.subFamily;
      if (p.active_days.grupo_familiar_id) grupo_familiar_id = p.active_days.grupo_familiar_id;
    } else if (Array.isArray(p.active_days)) {
      days = p.active_days.filter((d) => typeof d === 'string' && !d.startsWith('__meta__:'));
      const metaItem = p.active_days.find((d) => typeof d === 'string' && d.startsWith('__meta__:'));
      if (metaItem) {
        try {
          const meta = JSON.parse(metaItem.replace('__meta__:', ''));
          if (typeof meta.isSettled === 'boolean') isSettled = meta.isSettled;
          if (typeof meta.isAttending === 'boolean') isAttending = meta.isAttending;
          if (meta.subFamily) subFamily = meta.subFamily;
          if (meta.grupo_familiar_id) grupo_familiar_id = meta.grupo_familiar_id;
        } catch (e) {}
      }
    }
  } else if (Array.isArray(p.activeDays)) {
    days = p.activeDays;
  }

  // Desglosar nombre, apellido paterno y materno
  let nombre = p.nombre || '';
  let apellido_paterno = p.apellido_paterno || p.apellidoPaterno || '';
  let apellido_materno = p.apellido_materno || p.apellidoMaterno || '';

  if (!nombre && p.name) {
    const parts = p.name.trim().split(/\s+/);
    nombre = parts[0] || '';
    apellido_paterno = parts[1] || '';
    apellido_materno = parts.slice(2).join(' ') || '';
  }

  const fullName = [nombre, apellido_paterno, apellido_materno].filter(Boolean).join(' ') || p.name || 'Integrante';

  const categoria = String(p.categoria || p.category || 'adulto').toLowerCase();
  const rawPonderacion = p.ponderacion !== undefined ? p.ponderacion : p.weight;
  let ponderacion = typeof rawPonderacion === 'number'
    ? rawPonderacion
    : parseFloat(rawPonderacion) || (categoria === 'nino' ? 0.5 : 1.0);
  let telefono = p.telefono || p.phone || '';

  // Extraer campos detallados si fueron almacenados en JSONB active_days
  if (p.active_days && typeof p.active_days === 'object' && !Array.isArray(p.active_days)) {
    if (p.active_days.nombre && !p.nombre) nombre = p.active_days.nombre;
    if (p.active_days.apellido_paterno && !p.apellido_paterno) apellido_paterno = p.active_days.apellido_paterno;
    if (p.active_days.apellido_materno && !p.apellido_materno) apellido_materno = p.active_days.apellido_materno;
    if (p.active_days.telefono && !p.telefono) telefono = p.active_days.telefono;
    if (p.active_days.categoria && !p.categoria) categoria = p.active_days.categoria;
    if (p.active_days.ponderacion !== undefined && p.ponderacion === undefined) {
      ponderacion = typeof p.active_days.ponderacion === 'number' ? p.active_days.ponderacion : parseFloat(p.active_days.ponderacion) || ponderacion;
    }
  }

  const finalSubFamily =
    p.subFamily ||
    p.subfamily ||
    p.sub_family ||
    subFamily ||
    inferSubFamily(fullName);

  return {
    id: p.id,
    nombre,
    apellido_paterno,
    apellido_materno,
    name: fullName,
    telefono,
    categoria,
    category: categoria,
    ponderacion,
    weight: ponderacion,
    grupo_familiar_id,
    subFamily: finalSubFamily,
    activeDays: days,
    isAttending: typeof p.isAttending === 'boolean' ? p.isAttending : (typeof p.is_attending === 'boolean' ? p.is_attending : isAttending),
    isSettled: typeof p.isSettled === 'boolean' ? p.isSettled : (typeof p.is_settled === 'boolean' ? p.is_settled : isSettled),
  };
};

const formatEventRow = (row) => {
  const availableDays = Array.isArray(row.available_days)
    ? row.available_days
    : Array.isArray(row.availableDays)
    ? row.availableDays
    : typeof row.available_days === 'string'
    ? JSON.parse(row.available_days)
    : ['Día 1', 'Día 2', 'Día 3', 'Día 4'];

  const parts = (row.participants || []).map((p) => {
    const parsed = parseParticipantRow(p);
    if (!parsed.activeDays || parsed.activeDays.length === 0) {
      parsed.activeDays = [...availableDays];
    }
    return parsed;
  });

  const exps = (row.expenses || []).map((exp) => ({
    id: exp.id,
    title: exp.title,
    amount: typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0,
    category: exp.expense_category || exp.category || 'Comida',
    paidBy: exp.paid_by || exp.paidBy,
    splitBetween: Array.isArray(exp.split_between)
      ? exp.split_between
      : Array.isArray(exp.splitBetween)
      ? exp.splitBetween
      : typeof exp.split_between === 'string'
      ? JSON.parse(exp.split_between)
      : [],
  }));

  return {
    id: row.id,
    slug: row.slug || row.id,
    year: row.year,
    title: row.title,
    availableDays,
    isArchived: Boolean(row.is_archived || row.isArchived),
    createdAt: row.created_at || row.createdAt,
    settlementNotes: row.settlement_notes || row.settlementNotes,
    participants: parts,
    expenses: exps,
  };
};

/**
 * Obtener todos los eventos (Supabase como Fuente de la Verdad)
 */
export const getAllEvents = async () => {
  const localList = loadLocalEvents();
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants(*), expenses(*)')
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          const formatted = data.map((row) => formatEventRow(row));
          saveLocalEvents(formatted);
          return formatted;
        } else {
          // Si Supabase devuelve 0 eventos, la base de datos está vacía
          saveLocalEvents([]);
          return [];
        }
      }
    } catch (err) {
      console.warn('[Database] Error cargando de Supabase, usando local:', err);
    }
  }

  if (localList && localList.length > 0) {
    return localList;
  }
  return [];
};

/**
 * Obtener un evento por ID o Slug
 */
export const getEventById = async (id) => {
  if (!id) return null;
  const localList = loadLocalEvents();
  const localMatched = localList.find((e) => e.id === id || e.slug === id);

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const isIdUUID = isUUID(id);
      let query = supabase.from('events').select('*, participants(*), expenses(*)');
      query = isIdUUID ? query.eq('id', id) : query.eq('slug', id);

      const { data, error } = await query.single();
      if (!error && data) {
        const formatted = formatEventRow(data);

        // Actualizar en caché local
        const idx = localList.findIndex((e) => e.id === formatted.id || e.slug === formatted.slug);
        if (idx >= 0) {
          localList[idx] = formatted;
        } else {
          localList.unshift(formatted);
        }
        saveLocalEvents(localList);
        return formatted;
      }
    } catch (err) {
      console.warn('[Database] Error cargando evento de Supabase:', err);
    }
  }

  if (localMatched) return localMatched;
  return null;
};

/**
 * Crear un nuevo evento
 */
export const createEvent = async ({ title, year, availableDays = [], participants = [] }) => {
  const newId = generateUUID();
  const now = new Date().toISOString();
  const days = availableDays.length > 0 ? availableDays : ['Día 1', 'Día 2', 'Día 3', 'Día 4'];

  const initialParticipants = participants.map((p) => {
    const nombre = (p.nombre || (p.name ? p.name.trim().split(/\s+/)[0] : '')).trim();
    const apellido_paterno = (p.apellido_paterno || (p.name ? (p.name.trim().split(/\s+/)[1] || '') : '')).trim();
    const apellido_materno = (p.apellido_materno || (p.name ? (p.name.trim().split(/\s+/).slice(2).join(' ') || '') : '')).trim();
    const fullName = [nombre, apellido_paterno, apellido_materno].filter(Boolean).join(' ') || p.name || 'Integrante';
    const cat = p.category || p.categoria || 'adulto';
    const pond = typeof p.ponderacion === 'number' ? p.ponderacion : (typeof p.weight === 'number' ? p.weight : (cat === 'nino' ? 0.5 : 1.0));

    return {
      id: generateUUID(),
      nombre,
      apellido_paterno,
      apellido_materno,
      telefono: p.telefono || '',
      name: fullName,
      category: cat,
      categoria: cat,
      weight: pond,
      ponderacion: pond,
      grupo_familiar_id: p.grupo_familiar_id || null,
      subFamily: p.subFamily || 'Familia General',
      activeDays: Array.isArray(p.activeDays) && p.activeDays.length > 0 ? p.activeDays : [...days],
      isAttending: p.isAttending !== false,
      isSettled: Boolean(p.isSettled),
    };
  });

  const newEvent = {
    id: newId,
    slug: `event_${year}_${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`,
    title,
    year: Number(year) || new Date().getFullYear(),
    availableDays: days,
    isArchived: false,
    createdAt: now,
    participants: initialParticipants,
    expenses: [],
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { error: insertError } = await supabase.from('events').insert({
        id: newEvent.id,
        title: newEvent.title,
        year: newEvent.year,
        available_days: newEvent.availableDays,
        is_archived: false,
        created_at: now,
      });

      if (insertError) {
        console.error('[Database] Error guardando evento en Supabase:', insertError);
      }

      if (initialParticipants.length > 0) {
        const rows = initialParticipants.map((p) => ({
          id: p.id,
          event_id: newEvent.id,
          name: p.name,
          nombre: p.nombre,
          apellido_paterno: p.apellido_paterno,
          apellido_materno: p.apellido_materno,
          telefono: p.telefono,
          categoria: p.categoria,
          category: p.category,
          ponderacion: p.ponderacion,
          weight: p.weight,
          grupo_familiar_id: p.grupo_familiar_id,
          active_days: {
            days: p.activeDays || days,
            isAttending: p.isAttending !== false,
            isSettled: Boolean(p.isSettled),
            subFamily: p.subFamily || 'Familia General',
            grupo_familiar_id: p.grupo_familiar_id,
            nombre: p.nombre,
            apellido_paterno: p.apellido_paterno,
            apellido_materno: p.apellido_materno,
            telefono: p.telefono,
            categoria: p.categoria,
            ponderacion: p.ponderacion,
          },
        }));

        const { error: partErr } = await supabase.from('participants').insert(rows);
        if (partErr) {
          const fallbackRows = initialParticipants.map((p) => ({
            id: p.id,
            event_id: newEvent.id,
            name: p.name,
            category: p.category,
            weight: p.weight,
            active_days: {
              days: p.activeDays || days,
              isAttending: p.isAttending !== false,
              isSettled: Boolean(p.isSettled),
              subFamily: p.subFamily || 'Familia General',
              grupo_familiar_id: p.grupo_familiar_id,
              nombre: p.nombre,
              apellido_paterno: p.apellido_paterno,
              apellido_materno: p.apellido_materno,
              telefono: p.telefono,
              categoria: p.categoria,
              ponderacion: p.ponderacion,
            },
          }));
          await supabase.from('participants').insert(fallbackRows);
        }
      }
    } catch (err) {
      console.error('[Database] Error guardando evento en Supabase:', err);
    }
  }

  const list = loadLocalEvents();
  list.unshift(newEvent);
  saveLocalEvents(list);
  return newEvent;
};

/**
 * Archivar / Desarchivar evento
 */
export const archiveEvent = async (id, isArchived) => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('events').update({ is_archived: isArchived }).eq('id', id);
    } catch (e) {
      console.error('[Database] Error archivando evento en Supabase:', e);
    }
  }
  const list = loadLocalEvents();
  const found = list.find((e) => e.id === id || e.slug === id);
  if (found) {
    found.isArchived = isArchived;
    saveLocalEvents(list);
  }
};

/**
 * Eliminar evento
 */
export const deleteEvent = async (id) => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('events').delete().eq('id', id);
    } catch (e) {
      console.error('[Database] Error eliminando evento en Supabase:', e);
    }
  }
  let list = loadLocalEvents();
  list = list.filter((e) => e.id !== id && e.slug !== id);
  saveLocalEvents(list);
};

/**
 * Agregar Participante
 */
/**
 * Agregar Participante a un Evento
 */
export const addParticipant = async (eventId, participantData) => {
  const localList = loadLocalEvents();
  let currentEvent = localList.find((e) => e.id === eventId || e.slug === eventId);
  if (!currentEvent && localList.length > 0) {
    currentEvent = localList[0];
  }

  const defaultDays = currentEvent?.availableDays && currentEvent.availableDays.length > 0
    ? currentEvent.availableDays
    : ['Día 1', 'Día 2', 'Día 3', 'Día 4'];

  const nombre = (participantData.nombre || (participantData.name ? participantData.name.trim().split(/\s+/)[0] : '')).trim();
  const apellido_paterno = (participantData.apellido_paterno || (participantData.name ? (participantData.name.trim().split(/\s+/)[1] || '') : '')).trim();
  const apellido_materno = (participantData.apellido_materno || (participantData.name ? (participantData.name.trim().split(/\s+/).slice(2).join(' ') || '') : '')).trim();
  const fullName = [nombre, apellido_paterno, apellido_materno].filter(Boolean).join(' ') || participantData.name?.trim() || 'Integrante';
  
  const categoria = String(participantData.categoria || participantData.category || 'adulto').toLowerCase();
  const ponderacion = typeof participantData.ponderacion === 'number'
    ? participantData.ponderacion
    : typeof participantData.weight === 'number'
    ? participantData.weight
    : (categoria === 'nino' ? 0.5 : 1.0);
  const telefono = participantData.telefono || participantData.phone || '';
  const grupo_familiar_id = participantData.grupo_familiar_id || null;

  // IMPORTANTE: Cada asistente a un evento tiene su propio ID único en la tabla participants
  const p = {
    id: generateUUID(),
    nombre,
    apellido_paterno,
    apellido_materno,
    name: fullName,
    telefono,
    categoria,
    category: categoria,
    ponderacion,
    weight: ponderacion,
    grupo_familiar_id,
    subFamily: participantData.subFamily || participantData.subfamily || 'Familia General',
    activeDays: Array.isArray(participantData.activeDays) && participantData.activeDays.length > 0
      ? participantData.activeDays
      : [...defaultDays],
    isAttending: participantData.isAttending !== false,
    isSettled: Boolean(participantData.isSettled),
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      let targetEventId = isUUID(eventId)
        ? eventId
        : currentEvent && isUUID(currentEvent.id)
        ? currentEvent.id
        : null;

      if (!targetEventId) {
        const { data: dbEvents } = await supabase.from('events').select('id').limit(1);
        if (dbEvents && dbEvents.length > 0) {
          targetEventId = dbEvents[0].id;
        }
      }

      if (!targetEventId) {
        console.warn('[Database] No se pudo determinar targetEventId para el participante de evento');
      } else {
        const activeDaysMeta = {
          days: p.activeDays,
          isAttending: p.isAttending,
          isSettled: p.isSettled,
          subFamily: p.subFamily,
          grupo_familiar_id: p.grupo_familiar_id,
          nombre: p.nombre,
          apellido_paterno: p.apellido_paterno,
          apellido_materno: p.apellido_materno,
          telefono: p.telefono,
          categoria: p.categoria,
          ponderacion: p.ponderacion,
        };

        const { error } = await supabase.from('participants').insert({
          id: p.id,
          event_id: targetEventId,
          name: p.name,
          nombre: p.nombre,
          apellido_paterno: p.apellido_paterno,
          apellido_materno: p.apellido_materno,
          telefono: p.telefono,
          categoria: p.categoria,
          category: p.category,
          ponderacion: p.ponderacion,
          weight: p.weight,
          grupo_familiar_id: p.grupo_familiar_id,
          active_days: activeDaysMeta,
        });

        if (error) {
          console.warn('[Database] Fallback para insertar asistente de evento en Supabase:', error.message);
          await supabase.from('participants').insert({
            id: p.id,
            event_id: targetEventId,
            name: p.name,
            category: p.category,
            weight: p.weight,
            active_days: activeDaysMeta,
          });
        }
      }
    } catch (e) {
      console.warn('[Database] Excepción insertando participante en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId) || list[0];
  if (event) {
    event.participants = event.participants || [];
    event.participants.push(p);
    saveLocalEvents(list);
  }
  return p;
};

/**
 * Actualizar Participante
 */
export const updateParticipant = async (eventId, participantOrId, updates = {}) => {
  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);

  let participant;
  if (typeof participantOrId === 'string') {
    const existing = event?.participants?.find((p) => p.id === participantOrId);
    participant = { ...(existing || {}), ...updates, id: participantOrId };
  } else {
    participant = { ...(participantOrId || {}), ...updates };
  }

  if (!participant?.id) {
    console.warn('[Database] updateParticipant llamado sin id válido');
    return null;
  }

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const activeDaysMeta = {
        days: participant.activeDays,
        isAttending: participant.isAttending !== false,
        isSettled: Boolean(participant.isSettled),
        subFamily: participant.subFamily || 'Familia General',
        grupo_familiar_id: participant.grupo_familiar_id || null,
        nombre: participant.nombre,
        apellido_paterno: participant.apellido_paterno,
        apellido_materno: participant.apellido_materno,
        telefono: participant.telefono,
        categoria: participant.categoria || participant.category || 'adulto',
        ponderacion: participant.ponderacion || participant.weight || 1.0,
      };

      const { error } = await supabase.from('participants').update({
        name: participant.name,
        nombre: participant.nombre,
        apellido_paterno: participant.apellido_paterno,
        apellido_materno: participant.apellido_materno,
        telefono: participant.telefono,
        categoria: participant.categoria || participant.category,
        category: participant.category || participant.categoria,
        ponderacion: participant.ponderacion || participant.weight,
        weight: participant.weight || participant.ponderacion,
        grupo_familiar_id: participant.grupo_familiar_id,
        active_days: activeDaysMeta,
      }).eq('id', participant.id);

      if (error) {
        console.warn('[Database] Update nativo falló en participants, reintentando con base columns + JSONB:', error.message);
        await supabase.from('participants').update({
          name: participant.name,
          category: participant.category || participant.categoria,
          weight: participant.weight || participant.ponderacion,
          active_days: activeDaysMeta,
        }).eq('id', participant.id);
      }
    } catch (e) {
      console.warn('[Database] Error actualizando participante en Supabase:', e);
    }
  }

  if (event && Array.isArray(event.participants)) {
    const idx = event.participants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) {
      event.participants[idx] = { ...event.participants[idx], ...participant };
      saveLocalEvents(list);
    }
  }

  return participant;
};

/**
 * Alternar rol/categoría del participante ('adulto' <-> 'nino')
 */
export const updateParticipantRole = async (eventId, participantId, category, weight) => {
  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  const part = event?.participants?.find((p) => p.id === participantId);

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('participants').update({
        category,
        weight,
        active_days: {
          days: part?.activeDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'],
          isAttending: part?.isAttending ?? true,
          isSettled: part?.isSettled ?? false,
          subFamily: part?.subFamily || '',
        }
      }).eq('id', participantId);
    } catch (e) {
      console.error('[Database] Error actualizando rol en Supabase:', e);
    }
  }

  if (part) {
    part.category = category;
    part.weight = weight;
    saveLocalEvents(list);
  }
};

/**
 * Alternar asistencia de toda una subfamilia
 */
export const toggleSubFamilyAttendance = async (eventId, subFamilyName, isAttending) => {
  const event = await getEventById(eventId);
  if (!event) return;

  const targetParts = (event.participants || []).filter(
    (p) => (p.subFamily || 'Familia General') === subFamilyName
  );

  const supabase = await initSupabaseClient();
  for (const p of targetParts) {
    p.isAttending = isAttending;
    if (supabase) {
      try {
        await supabase.from('participants').update({
          active_days: {
            days: p.activeDays,
            isAttending,
            isSettled: p.isSettled,
            subFamily: p.subFamily,
          },
        }).eq('id', p.id);
      } catch (e) {
        console.error('[Database] Error actualizando asistencia en Supabase:', e);
      }
    }
  }

  const list = loadLocalEvents();
  const ev = list.find((e) => e.id === eventId || e.slug === eventId);
  if (ev) {
    ev.participants = event.participants;
    saveLocalEvents(list);
  }
};

/**
 * Eliminar una Subfamilia completa
 */
export const deleteSubFamily = async (eventId, subFamilyName) => {
  const event = await getEventById(eventId);
  const targetParts = (event?.participants || []).filter(
    (p) => (p.subFamily || 'Familia General') === subFamilyName
  );

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      for (const p of targetParts) {
        let query = supabase.from('participants').delete().eq('id', p.id);
        if (event?.id) {
          query = query.eq('event_id', event.id);
        } else {
          query = query.not('event_id', 'is', null);
        }
        await query;
      }
    } catch (e) {
      console.error('[Database] Error eliminando subfamilia en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const ev = list.find((e) => e.id === eventId || e.slug === eventId);
  if (ev) {
    ev.participants = (ev.participants || []).filter(
      (p) => (p.subFamily || 'Familia General') !== subFamilyName
    );
    saveLocalEvents(list);
  }
};

/**
 * Eliminar Participante
 */
export const deleteParticipant = async (eventId, participantId) => {
  const event = await getEventById(eventId);
  const targetEventId = event?.id || (isUUID(eventId) ? eventId : null);

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      // 1. Intentar borrar por id Y event_id (MUY IMPORTANTE: asegurar que solo se borre del evento, jamás del directorio)
      if (isUUID(participantId)) {
        let query = supabase.from('participants').delete().eq('id', participantId);
        if (targetEventId) {
          query = query.eq('event_id', targetEventId);
        } else {
          query = query.not('event_id', 'is', null);
        }
        const { error: err1 } = await query;
        if (err1) {
          console.warn('[Database] Error borrando participante por id en Supabase:', err1);
        }
      }

      // 2. Respaldo: si el ID es local o no coincidió, borrar por event_id y name
      const targetPart = event?.participants?.find((p) => p.id === participantId);
      if (targetPart && targetPart.name && targetEventId) {
        await supabase
          .from('participants')
          .delete()
          .eq('event_id', targetEventId)
          .eq('name', targetPart.name);
      }
    } catch (e) {
      console.error('[Database] Excepción eliminando participante en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const ev = list.find((e) => e.id === eventId || e.slug === eventId);
  if (ev) {
    ev.participants = (ev.participants || []).filter((p) => p.id !== participantId);
    saveLocalEvents(list);
  }
};

/**
 * Liquidar / Desmarcar Subfamilia completa
 */
export const settleSubFamily = async (eventId, subFamilyName, isSettled) => {
  const event = await getEventById(eventId);
  if (!event) return;

  const targetParts = (event.participants || []).filter(
    (p) => (p.subFamily || 'Familia General') === subFamilyName
  );

  const supabase = await initSupabaseClient();
  for (const p of targetParts) {
    p.isSettled = isSettled;
    if (supabase) {
      try {
        await supabase.from('participants').update({
          active_days: {
            days: p.activeDays,
            isAttending: p.isAttending,
            isSettled,
            subFamily: p.subFamily,
          },
        }).eq('id', p.id);
      } catch (e) {
        console.error('[Database] Error actualizando liquidación en Supabase:', e);
      }
    }
  }

  const list = loadLocalEvents();
  const ev = list.find((e) => e.id === eventId || e.slug === eventId);
  if (ev) {
    ev.participants = event.participants;
    saveLocalEvents(list);
  }
};

/**
 * Agregar Gasto
 */
export const addExpense = async (eventId, expenseData) => {
  const localList = loadLocalEvents();
  let currentEvent = localList.find((e) => e.id === eventId || e.slug === eventId);
  if (!currentEvent && localList.length > 0) currentEvent = localList[0];

  const exp = {
    id: generateUUID(),
    title: expenseData.title.trim(),
    amount: typeof expenseData.amount === 'number' ? expenseData.amount : parseFloat(expenseData.amount) || 0,
    category: expenseData.category || 'Comida',
    paidBy: expenseData.paidBy && isUUID(expenseData.paidBy) ? expenseData.paidBy : null,
    splitBetween: expenseData.splitBetween || [],
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      let targetEventId = isUUID(eventId)
        ? eventId
        : currentEvent && isUUID(currentEvent.id)
        ? currentEvent.id
        : null;

      if (!targetEventId) {
        const { data: dbEvents } = await supabase.from('events').select('id').limit(1);
        if (dbEvents && dbEvents.length > 0) targetEventId = dbEvents[0].id;
      }

      const { error } = await supabase.from('expenses').insert({
        id: exp.id,
        event_id: targetEventId,
        title: exp.title,
        amount: exp.amount,
        expense_category: exp.category,
        paid_by: exp.paidBy,
        split_between: exp.splitBetween,
      });
      if (error) {
        console.error('[Database] Error insertando gasto en Supabase:', error);
      } else {
        console.log('[Database] ✅ Gasto guardado en Supabase:', exp.title, exp.id);
      }
    } catch (e) {
      console.error('[Database] Excepción insertando gasto en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  if (event) {
    event.expenses = event.expenses || [];
    event.expenses.unshift(exp);
    saveLocalEvents(list);
  }
  return exp;
};

/**
 * Agregar Lote de Gastos (Importación CSV)
 */
export const batchAddExpenses = async (eventId, expensesList) => {
  if (!expensesList || expensesList.length === 0) return [];

  const prepared = expensesList.map((exp) => ({
    id: isUUID(exp.id) ? exp.id : generateUUID(),
    title: exp.title.trim(),
    amount: typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0,
    category: exp.category || 'Comida',
    paidBy: exp.paidBy && isUUID(exp.paidBy) ? exp.paidBy : null,
    splitBetween: exp.splitBetween || [],
  }));

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const rows = prepared.map((exp) => ({
        id: exp.id,
        event_id: eventId,
        title: exp.title,
        amount: exp.amount,
        expense_category: exp.category,
        paid_by: exp.paidBy,
        split_between: exp.splitBetween,
      }));
      await supabase.from('expenses').insert(rows);
    } catch (e) {
      console.error('[Database] Error batch insert expenses:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  if (event) {
    event.expenses = event.expenses || [];
    event.expenses.unshift(...prepared);
    saveLocalEvents(list);
  }
  return prepared;
};

/**
 * Eliminar Gasto
 */
export const deleteExpense = async (eventId, expenseId) => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('expenses').delete().eq('id', expenseId);
    } catch (e) {
      console.error('[Database] Error eliminando gasto en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  if (event) {
    event.expenses = (event.expenses || []).filter((x) => x.id !== expenseId);
    saveLocalEvents(list);
  }
};

/**
 * Directorio Global Maestro
 * Si Supabase está configurado, la fuente de la verdad son los participantes reales y los contactos explícitamente guardados.
 * SEED_DIRECTORY sólo se utiliza como demo si Supabase NO está configurado y no hay nada en almacenamiento local.
 */
export const getGlobalDirectory = () => {
  try {
    const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[Database] Error leyendo directorio local:', e);
  }
  return [];
};

export const fetchGlobalDirectoryFromSupabase = async () => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      // SOLO consultar registros maestros del directorio general donde event_id IS NULL
      const { data, error } = await supabase.from('participants').select('*').is('event_id', null);
      if (!error && Array.isArray(data)) {
        const contactsMap = new Map();
        data.forEach((row) => {
          // Ignorar grupos familiares guardados en participants como fallback
          if (row.name?.startsWith('__FG__') || row.active_days?.isFamilyGroup) {
            return;
          }
          const p = parseParticipantRow(row);
          if (p && (p.name || p.nombre)) {
            const fullName = (p.name || `${p.nombre || ''} ${p.apellido_paterno || ''}`).replace(/\s+/g, ' ').trim();
            const nameKey = fullName.toLowerCase().trim();
            if (!nameKey) return;

            const existing = contactsMap.get(nameKey);
            const contactData = {
              id: (isUUID(p.id) ? p.id : existing?.id) || generateUUID(),
              name: fullName,
              nombre: p.nombre || existing?.nombre || fullName.split(' ')[0] || '',
              apellido_paterno: p.apellido_paterno || existing?.apellido_paterno || '',
              apellido_materno: p.apellido_materno || existing?.apellido_materno || '',
              telefono: p.telefono || existing?.telefono || '',
              grupo_familiar_id: p.grupo_familiar_id || existing?.grupo_familiar_id || null,
              category: p.category || existing?.category || 'adulto',
              categoria: p.categoria || p.category || existing?.categoria || 'adulto',
              weight: typeof p.weight === 'number' ? p.weight : (existing?.weight ?? (p.category === 'nino' ? 0.5 : 1.0)),
              ponderacion: typeof p.ponderacion === 'number' ? p.ponderacion : (existing?.ponderacion ?? (typeof p.weight === 'number' ? p.weight : 1.0)),
              subFamily: p.subFamily || existing?.subFamily || inferSubFamily(fullName),
            };

            contactsMap.set(nameKey, contactData);
          }
        });

        const synced = Array.from(contactsMap.values());
        saveGlobalDirectory(synced);
        return synced;
      }
    } catch (err) {
      console.warn('[Database] Error consultando participantes de Supabase para el directorio:', err);
    }
  }
  return getGlobalDirectory();
};

export const saveGlobalDirectory = (directory) => {
  try {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY, JSON.stringify(directory));
  } catch (e) {}
};

export const deleteDirectoryContact = async (contactId, contactName) => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      if (isUUID(contactId)) {
        await supabase.from('participants').delete().eq('id', contactId).is('event_id', null);
      }
      if (contactName) {
        await supabase.from('participants').delete().eq('name', contactName.trim()).is('event_id', null);
      }
    } catch (e) {
      console.warn('[Database] Error borrando contacto de Supabase:', e);
    }
  }

  // 1. Eliminar del directorio en LocalStorage
  let dir = getGlobalDirectory();
  dir = dir.filter((d) => {
    const dName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''}`).toLowerCase().trim();
    const targetName = (contactName || '').toLowerCase().trim();
    return d.id !== contactId && (!targetName || dName !== targetName);
  });
  saveGlobalDirectory(dir);

  return dir;
};

/**
 * Agregar Contacto al Directorio Maestro (y guardarlo en Supabase y LocalStorage)
 */
export const addDirectoryContact = async ({
  nombre = '',
  apellido_paterno = '',
  apellido_materno = '',
  telefono = '',
  name = '',
  subFamily = '',
  grupo_familiar_id = null,
  category = 'adulto',
  categoria = 'adulto',
  weight = 1.0,
  ponderacion = 1.0,
}) => {
  const nom = (nombre || (name ? name.trim().split(/\s+/)[0] : '')).trim();
  const apePat = (apellido_paterno || (name ? (name.trim().split(/\s+/)[1] || '') : '')).trim();
  const apeMat = (apellido_materno || (name ? (name.trim().split(/\s+/).slice(2).join(' ') || '') : '')).trim();
  const fullName = [nom, apePat, apeMat].filter(Boolean).join(' ') || name.trim() || 'Integrante';
  
  const cat = String(categoria || category || 'adulto').toLowerCase() === 'nino' ? 'nino' : 'adulto';
  const pond = typeof ponderacion === 'number'
    ? ponderacion
    : typeof weight === 'number'
    ? weight
    : (cat === 'nino' ? 0.5 : 1.0);

  const newContact = {
    id: generateUUID(),
    nombre: nom,
    apellido_paterno: apePat,
    apellido_materno: apeMat,
    name: fullName,
    telefono: telefono.trim(),
    categoria: cat,
    category: cat,
    ponderacion: pond,
    weight: pond,
    grupo_familiar_id: grupo_familiar_id || null,
    subFamily: subFamily?.trim() || inferSubFamily(fullName),
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const activeDaysMeta = {
        days: [],
        isAttending: true,
        isSettled: false,
        subFamily: newContact.subFamily,
        grupo_familiar_id: newContact.grupo_familiar_id,
        nombre: newContact.nombre,
        apellido_paterno: newContact.apellido_paterno,
        apellido_materno: newContact.apellido_materno,
        telefono: newContact.telefono,
        categoria: newContact.categoria,
        ponderacion: newContact.ponderacion,
      };

      const { error } = await supabase.from('participants').insert({
        id: newContact.id,
        event_id: null,
        name: newContact.name,
        nombre: newContact.nombre,
        apellido_paterno: newContact.apellido_paterno,
        apellido_materno: newContact.apellido_materno,
        telefono: newContact.telefono,
        categoria: newContact.categoria,
        category: newContact.category,
        ponderacion: newContact.ponderacion,
        weight: newContact.weight,
        grupo_familiar_id: newContact.grupo_familiar_id,
        active_days: activeDaysMeta,
      });

      if (error) {
        console.warn('[Database] Full insert en participants falló, reintentando con columnas base + JSONB metadata:', error.message);
        const { error: fallbackError } = await supabase.from('participants').insert({
          id: newContact.id,
          event_id: null,
          name: newContact.name,
          category: newContact.category,
          weight: newContact.weight,
          active_days: activeDaysMeta,
        });
        if (fallbackError) {
          console.error('[Database] ❌ Error en insert de respaldo en Supabase:', fallbackError);
        } else {
          console.log('[Database] ✅ Integrante guardado exitosamente en Supabase (fallback JSONB)');
        }
      } else {
        console.log('[Database] ✅ Integrante guardado exitosamente en Supabase (columnas nativas)');
      }
    } catch (e) {
      console.warn('[Database] Excepción guardando contacto en Supabase:', e);
    }
  }

  const dir = getGlobalDirectory();
  dir.push(newContact);
  saveGlobalDirectory(dir);
  return newContact;
};

/**
 * Alternar rol/categoría de un contacto en el Directorio Maestro (y en Supabase)
 */
export const updateDirectoryContactRole = async (contactId, category, weight) => {
  const supabase = await initSupabaseClient();
  const normalizedCat = category === 'nino' ? 'nino' : 'adulto';
  if (supabase && isUUID(contactId)) {
    try {
      await supabase.from('participants').update({
        category: normalizedCat,
        weight,
      }).eq('id', contactId);
      console.log('[Database] ✅ Rol de contacto actualizado en Supabase:', contactId, normalizedCat);
    } catch (e) {
      console.error('[Database] Error actualizando rol en Supabase:', e);
    }
  }

  const dir = getGlobalDirectory();
  const contact = dir.find((d) => d.id === contactId);
  if (contact) {
    contact.category = normalizedCat;
    contact.categoria = normalizedCat;
    contact.weight = weight;
    contact.ponderacion = weight;
    saveGlobalDirectory(dir);
  }
  return dir;
};

/**
 * Actualizar Contacto del Directorio Maestro (Nombre, Apellidos, Teléfono, Categoría, Ponderación, Grupo Familiar)
 */
export const updateDirectoryContact = async (contactId, fields = {}) => {
  const supabase = await initSupabaseClient();
  
  const firstName = fields.nombre || '';
  const pat = fields.apellido_paterno || '';
  const mat = fields.apellido_materno || '';
  const computedName = `${firstName} ${pat} ${mat}`.replace(/\s+/g, ' ').trim() || fields.name || 'Integrante';
  const normalizedCat = String(fields.categoria || fields.category || 'adulto').toLowerCase() === 'nino' ? 'nino' : 'adulto';
  const pond = parseFloat(fields.ponderacion ?? fields.weight) || (normalizedCat === 'nino' ? 0.5 : 1.0);

  const merged = {
    ...fields,
    name: computedName,
    nombre: firstName,
    apellido_paterno: pat,
    apellido_materno: mat,
    telefono: fields.telefono || '',
    category: normalizedCat,
    categoria: normalizedCat,
    weight: pond,
    ponderacion: pond,
    grupo_familiar_id: fields.grupo_familiar_id || null,
    subFamily: fields.subFamily || 'Familia General',
  };

  if (supabase && isUUID(contactId)) {
    try {
      const activeDaysMeta = {
        days: [],
        isAttending: true,
        isSettled: false,
        subFamily: merged.subFamily,
        grupo_familiar_id: merged.grupo_familiar_id,
        nombre: merged.nombre,
        apellido_paterno: merged.apellido_paterno,
        apellido_materno: merged.apellido_materno,
        telefono: merged.telefono,
        categoria: merged.categoria,
        ponderacion: merged.ponderacion,
      };

      const updatePayload = {
        name: merged.name,
        nombre: merged.nombre,
        apellido_paterno: merged.apellido_paterno,
        apellido_materno: merged.apellido_materno,
        telefono: merged.telefono,
        categoria: merged.categoria,
        category: merged.category,
        ponderacion: merged.ponderacion,
        weight: merged.weight,
        grupo_familiar_id: merged.grupo_familiar_id,
        active_days: activeDaysMeta,
      };

      const { error } = await supabase.from('participants').update(updatePayload).eq('id', contactId);
      if (error) {
        console.warn('[Database] Full update falló en participants, reintentando con columnas base + JSONB metadata:', error.message);
        const { error: fallbackError } = await supabase.from('participants').update({
          name: merged.name,
          category: merged.category,
          weight: merged.weight,
          active_days: activeDaysMeta,
        }).eq('id', contactId);
        if (fallbackError) {
          console.error('[Database] ❌ Error en update fallback de Supabase:', fallbackError);
        } else {
          console.log('[Database] ✅ Contacto actualizado exitosamente en Supabase (fallback JSONB)');
        }
      } else {
        console.log('[Database] ✅ Contacto actualizado en Supabase (columnas nativas)');
      }
    } catch (e) {
      console.warn('[Database] Error actualizando contacto en Supabase:', e);
    }
  }

  const dir = getGlobalDirectory();
  const idx = dir.findIndex((d) => d.id === contactId);
  if (idx >= 0) {
    dir[idx] = { ...dir[idx], ...merged };
    saveGlobalDirectory(dir);
    return dir[idx];
  }
  return null;
};

/**
 * Suscripción Realtime a cambios globales
 */
export const subscribeToEventsListRealtime = (callback) => {
  let channel = null;
  initSupabaseClient().then((supabase) => {
    if (!supabase) return;
    channel = supabase
      .channel('public:events_realtime_web')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_groups' }, () => callback())
      .subscribe();
  });

  return () => {
    if (channel) {
      const supabase = getSupabase();
      if (supabase) supabase.removeChannel(channel);
    }
  };
};
