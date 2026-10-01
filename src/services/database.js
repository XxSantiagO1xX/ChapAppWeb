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
 * Semilla de Grupos y Ramas Familiares (Modelo Híbrido).
 * - nodo_padre_id: null indica Rama Principal.
 * - es_independiente: true indica que asume su propia cuenta/deuda en cortes, independizándose financieramente.
 */
export const SEED_FAMILY_GROUPS = [
  { id: 'fg_1', nombre: 'Familia Santiago Chapantongo', nodo_padre_id: null, es_independiente: false, color: '#38BDF8' },
  { id: 'fg_2', nombre: 'Familia Santiago Velázquez', nodo_padre_id: null, es_independiente: false, color: '#F59E0B' },
  { id: 'fg_3', nombre: 'Familia Santiago Morales', nodo_padre_id: 'fg_1', es_independiente: false, color: '#10B981' },
  { id: 'fg_4', nombre: 'Familia Roberto Santiago', nodo_padre_id: 'fg_2', es_independiente: true, color: '#EC4899' },
  { id: 'fg_5', nombre: 'Amigos y Primos', nodo_padre_id: null, es_independiente: true, color: '#8B5CF6' },
];

/**
 * Directorio Global de Participantes Frecuentes.
 */
export const SEED_DIRECTORY = [
  { id: 'dir_1', nombre: 'Carlos', apellido_paterno: 'Santiago', apellido_materno: '', name: 'Don Carlos Santiago', telefono: '5512345601', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', grupo_familiar_id: 'fg_1' },
  { id: 'dir_2', nombre: 'María', apellido_paterno: 'Bustamante', apellido_materno: '', name: 'Doña María Bustamante', telefono: '5512345602', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', grupo_familiar_id: 'fg_1' },
  { id: 'dir_3', nombre: 'Juanito', apellido_paterno: 'Santiago', apellido_materno: 'Bustamante', name: 'Juanito Santiago', telefono: '', categoria: 'nino', ponderacion: 0.5, category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Chapantongo', grupo_familiar_id: 'fg_1' },
  { id: 'dir_4', nombre: 'Roberto', apellido_paterno: 'Santiago', apellido_materno: 'Velázquez', name: 'Roberto Santiago', telefono: '5512345604', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Roberto Santiago', grupo_familiar_id: 'fg_4' },
  { id: 'dir_5', nombre: 'Patricia', apellido_paterno: 'Velázquez', apellido_materno: '', name: 'Patricia Velázquez', telefono: '5512345605', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez', grupo_familiar_id: 'fg_2' },
  { id: 'dir_6', nombre: 'Mateo', apellido_paterno: 'Santiago', apellido_materno: 'Velázquez', name: 'Mateo Santiago', telefono: '', categoria: 'nino', ponderacion: 0.5, category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Velázquez', grupo_familiar_id: 'fg_2' },
  { id: 'dir_7', nombre: 'Fernando', apellido_paterno: 'Santiago', apellido_materno: 'Morales', name: 'Fernando Santiago', telefono: '5512345607', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', grupo_familiar_id: 'fg_3' },
  { id: 'dir_8', nombre: 'Carmen', apellido_paterno: 'Morales', apellido_materno: '', name: 'Carmen Morales', telefono: '5512345608', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', grupo_familiar_id: 'fg_3' },
  { id: 'dir_9', nombre: 'Lucía', apellido_paterno: 'Santiago', apellido_materno: 'Morales', name: 'Lucía Santiago', telefono: '', categoria: 'nino', ponderacion: 0.5, category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Morales', grupo_familiar_id: 'fg_3' },
  { id: 'dir_10', nombre: 'Alejandro', apellido_paterno: 'Ruiz', apellido_materno: '', name: 'Alejandro Ruiz', telefono: '5512345610', categoria: 'adulto', ponderacion: 1.0, category: 'adulto', weight: 1.0, subFamily: 'Amigos y Primos', grupo_familiar_id: 'fg_5' },
];

export const INITIAL_SEED_EVENTS = [
  {
    id: 'chapantongo-2026',
    slug: 'vacaciones-chapantongo-2026',
    title: 'Vacaciones Chapantongo 2026',
    year: 2026,
    availableDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'],
    isArchived: false,
    createdAt: new Date().toISOString(),
    participants: [
      { id: 'p1', name: 'Don Carlos Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p2', name: 'Doña María Bustamante', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p3', name: 'Juanito Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Chapantongo', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p4', name: 'Roberto Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p5', name: 'Patricia Velázquez', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p6', name: 'Mateo Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Velázquez', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p7', name: 'Fernando Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p8', name: 'Carmen Morales', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p9', name: 'Lucía Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Morales', activeDays: ['Día 1', 'Día 2', 'Día 3', 'Día 4'], isAttending: true, isSettled: false },
      { id: 'p10', name: 'Alejandro Ruiz', category: 'adulto', weight: 1.0, subFamily: 'Amigos y Primos', activeDays: ['Día 1', 'Día 2', 'Día 3'], isAttending: true, isSettled: false }
    ],
    expenses: [
      { id: 'e1', title: 'Supermercado Despensa Familiar', amount: 2850.00, category: 'Comida', paidBy: 'p1' },
      { id: 'e2', title: 'Carbón, Carnicería y Asado', amount: 1680.50, category: 'Comida', paidBy: 'p4' },
      { id: 'e3', title: 'Gasolina y Casetas Viaje', amount: 1250.00, category: 'Transporte', paidBy: 'p4' },
      { id: 'e4', title: 'Hospedaje Cabañas del Bosque', amount: 6400.00, category: 'Hospedaje', paidBy: 'p1' },
      { id: 'e5', title: 'Entradas Balneario y Parque', amount: 980.00, category: 'Varios', paidBy: 'p8' },
      { id: 'e6', title: 'Bebidas, Refrescos y Hielo', amount: 750.00, category: 'Bebidas', paidBy: 'p1' }
    ]
  }
];

export const inferSubFamily = (name, fallback = 'Familia General') => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('chapantongo')) return 'Familia Santiago Chapantongo';
  if (lower.includes('velázquez') || lower.includes('velazquez')) return 'Familia Santiago Velázquez';
  if (lower.includes('morales')) return 'Familia Santiago Morales';
  if (lower.includes('amigo') || lower.includes('primo') || lower.includes('ruiz')) return 'Amigos y Primos';
  const match = SEED_DIRECTORY.find((d) => d.name.toLowerCase() === lower);
  if (match) return match.subFamily;
  return fallback;
};

// --- Manejo de Caché Local de Grupos Familiares ---
export const loadLocalFamilyGroups = () => {
  try {
    const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.FAMILY_GROUPS || 'chapapp_cached_family_groups');
    return raw ? JSON.parse(raw) : SEED_FAMILY_GROUPS;
  } catch (e) {
    return SEED_FAMILY_GROUPS;
  }
};

export const saveLocalFamilyGroups = (groups) => {
  try {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.FAMILY_GROUPS || 'chapapp_cached_family_groups', JSON.stringify(groups));
  } catch (e) {
    console.error('Error guardando family_groups en LocalStorage:', e);
  }
};

/**
 * Obtener todos los grupos familiares (Supabase Cloud + LocalStorage)
 */
export const getAllFamilyGroups = async () => {
  const localList = loadLocalFamilyGroups();
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          saveLocalFamilyGroups(data);
          return data;
        } else {
          // Sembrar grupos familiares iniciales si la tabla existe y está vacía
          for (const fg of SEED_FAMILY_GROUPS) {
            await supabase.from('family_groups').insert({
              id: fg.id.startsWith('fg_') ? generateUUID() : fg.id,
              nombre: fg.nombre,
              nodo_padre_id: fg.nodo_padre_id,
              es_independiente: fg.es_independiente,
              color: fg.color || '#38BDF8'
            }).catch(() => {});
          }
          const { data: seeded } = await supabase.from('family_groups').select('*');
          if (seeded && seeded.length > 0) {
            saveLocalFamilyGroups(seeded);
            return seeded;
          }
        }
      }
    } catch (err) {
      console.warn('[Database] Error consultando family_groups de Supabase, usando local:', err);
    }
  }
  return localList;
};

/**
 * Crear un nuevo Grupo Familiar o Sub-núcleo
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
      await supabase.from('family_groups').insert(newGroup);
    } catch (e) {
      console.warn('[Database] Error insertando family_group en Supabase:', e);
    }
  }

  const list = loadLocalFamilyGroups();
  list.push(newGroup);
  saveLocalFamilyGroups(list);
  return newGroup;
};

/**
 * Actualizar Grupo Familiar (ej. independizar, cambiar nombre o nodo_padre_id)
 */
export const updateFamilyGroup = async (id, fields = {}) => {
  const supabase = await initSupabaseClient();
  if (supabase && isUUID(id)) {
    try {
      await supabase.from('family_groups').update({
        ...fields,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    } catch (e) {
      console.warn('[Database] Error actualizando family_group en Supabase:', e);
    }
  }

  const list = loadLocalFamilyGroups();
  const idx = list.findIndex(g => g.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...fields, updated_at: new Date().toISOString() };
    saveLocalFamilyGroups(list);
    return list[idx];
  }
  return null;
};

/**
 * Eliminar Grupo Familiar
 */
export const deleteFamilyGroup = async (id) => {
  const supabase = await initSupabaseClient();
  if (supabase && isUUID(id)) {
    try {
      await supabase.from('family_groups').delete().eq('id', id);
    } catch (e) {
      console.warn('[Database] Error eliminando family_group en Supabase:', e);
    }
  }

  let list = loadLocalFamilyGroups();
  list = list.filter(g => g.id !== id);
  saveLocalFamilyGroups(list);
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
  const ponderacion = typeof rawPonderacion === 'number'
    ? rawPonderacion
    : parseFloat(rawPonderacion) || (categoria === 'nino' ? 0.5 : 1.0);
  const telefono = p.telefono || p.phone || '';

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

  const initialParticipants = participants.map((p) => ({
    id: p.id || generateUUID(),
    name: p.name,
    category: p.category || 'adulto',
    weight: p.weight ?? (p.category === 'nino' ? 0.5 : 1.0),
    subFamily: p.subFamily || p.subfamily || inferSubFamily(p.name),
    activeDays: [...days],
    isAttending: true,
    isSettled: false,
  }));

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
          id: isUUID(p.id) ? p.id : generateUUID(),
          event_id: newEvent.id,
          name: p.name,
          category: p.category || 'adulto',
          weight: typeof p.weight === 'number' ? p.weight : (p.category === 'nino' ? 0.5 : 1.0),
          active_days: {
            days: p.activeDays || days,
            isAttending: p.isAttending !== false,
            isSettled: Boolean(p.isSettled),
            subFamily: p.subFamily || inferSubFamily(p.name),
          },
        }));
        await supabase.from('participants').insert(rows);
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
 * Agregar Participante
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

  const p = {
    id: isUUID(participantData.id) ? participantData.id : generateUUID(),
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
    subFamily: participantData.subFamily || participantData.subfamily || inferSubFamily(fullName),
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
      };

      // Intentar primero con las nuevas columnas
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

      if (error && error.message?.includes('does not exist')) {
        // Fallback a columnas legadas si la migración de Supabase aún no se ha ejecutado
        await supabase.from('participants').insert({
          id: p.id,
          event_id: targetEventId,
          name: p.name,
          category: p.category,
          weight: p.weight,
          active_days: activeDaysMeta,
        });
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
export const updateParticipant = async (eventId, participant) => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const activeDaysMeta = {
        days: participant.activeDays,
        isAttending: participant.isAttending,
        isSettled: participant.isSettled,
        subFamily: participant.subFamily,
        grupo_familiar_id: participant.grupo_familiar_id,
        nombre: participant.nombre,
        apellido_paterno: participant.apellido_paterno,
        apellido_materno: participant.apellido_materno,
        telefono: participant.telefono,
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

      if (error && error.message?.includes('does not exist')) {
        await supabase.from('participants').update({
          name: participant.name,
          category: participant.category,
          weight: participant.weight,
          active_days: activeDaysMeta,
        }).eq('id', participant.id);
      }
    } catch (e) {
      console.warn('[Database] Error actualizando participante en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  if (event) {
    const idx = event.participants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) {
      event.participants[idx] = { ...event.participants[idx], ...participant };
      saveLocalEvents(list);
    }
  }
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
        await supabase.from('participants').delete().eq('id', p.id);
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
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      // 1. Intentar borrar por id
      const { error: err1 } = await supabase.from('participants').delete().eq('id', participantId);
      if (err1) {
        console.warn('[Database] Error borrando participante por id en Supabase:', err1);
      }

      // 2. Respaldo: si el ID es local o no coincidió, borrar por event_id y name
      const event = await getEventById(eventId);
      const targetPart = event?.participants?.find((p) => p.id === participantId);
      if (targetPart && targetPart.name) {
        await supabase
          .from('participants')
          .delete()
          .eq('event_id', event.id)
          .eq('name', targetPart.name);
      }
    } catch (e) {
      console.error('[Database] Excepción eliminando participante en Supabase:', e);
    }
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId || e.slug === eventId);
  if (event) {
    event.participants = (event.participants || []).filter((p) => p.id !== participantId);
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
  const localList = loadLocalEvents();
  const cachedDir = (() => {
    try {
      const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  const contactsMap = new Map();

  // 1. Si hay un directorio guardado explícitamente en LocalStorage
  if (Array.isArray(cachedDir) && cachedDir.length > 0) {
    cachedDir.forEach((d) => {
      if (d && (d.name || d.nombre)) {
        const fullName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''}`).replace(/\s+/g, ' ').trim();
        const key = fullName.toLowerCase().trim();
        contactsMap.set(key, {
          id: d.id || generateUUID(),
          name: fullName,
          nombre: d.nombre || fullName.split(' ')[0] || '',
          apellido_paterno: d.apellido_paterno || '',
          apellido_materno: d.apellido_materno || '',
          telefono: d.telefono || '',
          grupo_familiar_id: d.grupo_familiar_id || null,
          category: d.category || d.categoria || 'adulto',
          categoria: d.categoria || d.category || 'adulto',
          weight: typeof d.weight === 'number' ? d.weight : (d.category === 'nino' ? 0.5 : 1.0),
          ponderacion: typeof d.ponderacion === 'number' ? d.ponderacion : (d.weight || 1.0),
          subFamily: d.subFamily || inferSubFamily(fullName),
        });
      }
    });
  }

  // 2. Participantes de eventos en caché/memoria
  localList.forEach((ev) => {
    (ev.participants || []).forEach((p) => {
      if (p && (p.name || p.nombre)) {
        const fullName = (p.name || `${p.nombre || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`).replace(/\s+/g, ' ').trim();
        const key = fullName.toLowerCase().trim();
        const existing = contactsMap.get(key);
        contactsMap.set(key, {
          id: p.id || existing?.id || generateUUID(),
          name: fullName,
          nombre: p.nombre || existing?.nombre || fullName.split(' ')[0] || '',
          apellido_paterno: p.apellido_paterno || existing?.apellido_paterno || '',
          apellido_materno: p.apellido_materno || existing?.apellido_materno || '',
          telefono: p.telefono || existing?.telefono || '',
          grupo_familiar_id: p.grupo_familiar_id || existing?.grupo_familiar_id || null,
          category: p.category || existing?.category || 'adulto',
          categoria: p.categoria || existing?.categoria || 'adulto',
          weight: typeof p.weight === 'number' ? p.weight : (existing?.weight || (p.category === 'nino' ? 0.5 : 1.0)),
          ponderacion: typeof p.ponderacion === 'number' ? p.ponderacion : (existing?.ponderacion || 1.0),
          subFamily: p.subFamily || existing?.subFamily || inferSubFamily(fullName),
        });
      }
    });
  });

  // 3. Si no hay nada en caché ni eventos, sembrar con SEED_DIRECTORY
  if (contactsMap.size === 0) {
    SEED_DIRECTORY.forEach((d) => {
      if (d && (d.name || d.nombre)) {
        const fullName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''}`).replace(/\s+/g, ' ').trim();
        contactsMap.set(fullName.toLowerCase().trim(), { ...d, name: fullName });
      }
    });
    const seededList = Array.from(contactsMap.values());
    saveGlobalDirectory(seededList);
    return seededList;
  }

  return Array.from(contactsMap.values());
};

export const fetchGlobalDirectoryFromSupabase = async () => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('participants').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const contactsMap = new Map();

        // 1. Mapear todos los participantes existentes actualmente en Supabase
        data.forEach((row) => {
          const p = parseParticipantRow(row);
          if (p && (p.name || p.nombre)) {
            const fullName = (p.name || `${p.nombre || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`).replace(/\s+/g, ' ').trim();
            const key = fullName.toLowerCase().trim();
            contactsMap.set(key, {
              id: p.id || generateUUID(),
              name: fullName,
              nombre: p.nombre || fullName.split(' ')[0] || '',
              apellido_paterno: p.apellido_paterno || '',
              apellido_materno: p.apellido_materno || '',
              telefono: p.telefono || '',
              grupo_familiar_id: p.grupo_familiar_id || null,
              category: p.category || 'adulto',
              categoria: p.categoria || p.category || 'adulto',
              weight: typeof p.weight === 'number' ? p.weight : (p.category === 'nino' ? 0.5 : 1.0),
              ponderacion: typeof p.ponderacion === 'number' ? p.ponderacion : p.weight,
              subFamily: p.subFamily || inferSubFamily(fullName),
            });
          }
        });

        // 2. Conservar también contactos manuales guardados localmente
        const cachedDir = (() => {
          try {
            const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY);
            return raw ? JSON.parse(raw) : null;
          } catch (e) {
            return null;
          }
        })();

        if (Array.isArray(cachedDir)) {
          cachedDir.forEach((d) => {
            if (d && (d.name || d.nombre)) {
              const fullName = (d.name || `${d.nombre || ''} ${d.apellido_paterno || ''}`).replace(/\s+/g, ' ').trim();
              const key = fullName.toLowerCase().trim();
              if (!contactsMap.has(key)) {
                contactsMap.set(key, { ...d, name: fullName });
              }
            }
          });
        }

        const merged = Array.from(contactsMap.values());
        saveGlobalDirectory(merged);
        return merged;
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
        await supabase.from('participants').delete().eq('id', contactId);
      }
      if (contactName) {
        await supabase.from('participants').delete().eq('name', contactName.trim());
      }
    } catch (e) {
      console.warn('[Database] Error borrando contacto de Supabase:', e);
    }
  }

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
  
  const cat = String(categoria || category || 'adulto').toLowerCase();
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

      if (error && error.message?.includes('does not exist')) {
        await supabase.from('participants').insert({
          id: newContact.id,
          event_id: null,
          name: newContact.name,
          category: newContact.category,
          weight: newContact.weight,
          active_days: activeDaysMeta,
        });
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
  if (supabase && isUUID(contactId)) {
    try {
      await supabase.from('participants').update({
        category,
        weight,
      }).eq('id', contactId);
      console.log('[Database] ✅ Rol de contacto actualizado en Supabase:', contactId, category);
    } catch (e) {
      console.error('[Database] Error actualizando rol en Supabase:', e);
    }
  }

  const dir = getGlobalDirectory();
  const contact = dir.find((d) => d.id === contactId);
  if (contact) {
    contact.category = category;
    contact.weight = weight;
    saveGlobalDirectory(dir);
  }
  return dir;
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
      .subscribe();
  });

  return () => {
    if (channel) {
      const supabase = getSupabase();
      if (supabase) supabase.removeChannel(channel);
    }
  };
};
