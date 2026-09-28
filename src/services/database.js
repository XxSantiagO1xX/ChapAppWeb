/**
 * ChapApp - Servicio de Base de Datos y Sincronización Web
 * Comunicación transparente con Supabase Cloud y respaldo resiliente en LocalStorage
 */

import { initSupabaseClient, getSupabase } from './supabase.js';
import { CONFIG } from '../config.js';

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
 * Directorio Global de Participantes Frecuentes.
 */
export const SEED_DIRECTORY = [
  { id: 'dir_1', name: 'Don Carlos Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo' },
  { id: 'dir_2', name: 'Doña María Bustamante', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo' },
  { id: 'dir_3', name: 'Juanito Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Chapantongo' },
  { id: 'dir_4', name: 'Roberto Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez' },
  { id: 'dir_5', name: 'Patricia Velázquez', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez' },
  { id: 'dir_6', name: 'Mateo Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Velázquez' },
  { id: 'dir_7', name: 'Fernando Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales' },
  { id: 'dir_8', name: 'Carmen Morales', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales' },
  { id: 'dir_9', name: 'Lucía Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Morales' },
  { id: 'dir_10', name: 'Alejandro Ruiz', category: 'adulto', weight: 1.0, subFamily: 'Amigos y Primos' },
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

// --- Manejo de Caché Local (LocalStorage) ---
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
 */
export const parseParticipantRow = (p) => {
  let days = [];
  let isAttending = true;
  let isSettled = false;
  let subFamily = '';

  if (p.active_days) {
    if (typeof p.active_days === 'object' && !Array.isArray(p.active_days) && p.active_days !== null) {
      days = Array.isArray(p.active_days.days) ? p.active_days.days : [];
      if (typeof p.active_days.isAttending === 'boolean') isAttending = p.active_days.isAttending;
      if (typeof p.active_days.isSettled === 'boolean') isSettled = p.active_days.isSettled;
      if (p.active_days.subFamily) subFamily = p.active_days.subFamily;
    } else if (Array.isArray(p.active_days)) {
      days = p.active_days.filter((d) => typeof d === 'string' && !d.startsWith('__meta__:'));
      const metaItem = p.active_days.find((d) => typeof d === 'string' && d.startsWith('__meta__:'));
      if (metaItem) {
        try {
          const meta = JSON.parse(metaItem.replace('__meta__:', ''));
          if (typeof meta.isSettled === 'boolean') isSettled = meta.isSettled;
          if (typeof meta.isAttending === 'boolean') isAttending = meta.isAttending;
          if (meta.subFamily) subFamily = meta.subFamily;
        } catch (e) {}
      }
    }
  } else if (Array.isArray(p.activeDays)) {
    days = p.activeDays;
  }

  const finalSubFamily =
    p.subFamily ||
    p.subfamily ||
    p.sub_family ||
    subFamily ||
    inferSubFamily(p.name);

  return {
    id: p.id,
    name: p.name,
    category: p.category || 'adulto',
    weight: typeof p.weight === 'number' ? p.weight : parseFloat(p.weight) || (p.category === 'nino' ? 0.5 : 1.0),
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
      await supabase.from('events').insert({
        id: newEvent.id,
        slug: newEvent.slug,
        title: newEvent.title,
        year: newEvent.year,
        available_days: newEvent.availableDays,
        is_archived: false,
        created_at: now,
      });

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
export const addParticipant = async (eventId, participantData) => {
  const localList = loadLocalEvents();
  let currentEvent = localList.find((e) => e.id === eventId || e.slug === eventId);
  if (!currentEvent && localList.length > 0) {
    currentEvent = localList[0];
  }

  const defaultDays = currentEvent?.availableDays && currentEvent.availableDays.length > 0
    ? currentEvent.availableDays
    : ['Día 1', 'Día 2', 'Día 3', 'Día 4'];

  const p = {
    id: isUUID(participantData.id) ? participantData.id : generateUUID(),
    name: participantData.name.trim(),
    category: participantData.category || 'adulto',
    weight: typeof participantData.weight === 'number'
      ? participantData.weight
      : (participantData.category === 'nino' ? 0.5 : 1.0),
    subFamily: participantData.subFamily || participantData.subfamily || inferSubFamily(participantData.name),
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

      // Si no es UUID, buscar el evento correspondiente en Supabase
      if (!targetEventId) {
        const { data: dbEvents } = await supabase.from('events').select('id').limit(1);
        if (dbEvents && dbEvents.length > 0) {
          targetEventId = dbEvents[0].id;
        }
      }

      const { data, error } = await supabase.from('participants').insert({
        id: p.id,
        event_id: targetEventId,
        name: p.name,
        category: p.category,
        weight: p.weight,
        active_days: {
          days: p.activeDays,
          isAttending: p.isAttending,
          isSettled: p.isSettled,
          subFamily: p.subFamily,
        },
      });

      if (error) {
        console.error('[Database] Error insertando participante en Supabase:', error);
      } else {
        console.log('[Database] ✅ Participante guardado en Supabase:', p.name, p.id, 'en evento:', targetEventId);
      }
    } catch (e) {
      console.error('[Database] Excepción insertando participante en Supabase:', e);
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
      await supabase.from('participants').update({
        name: participant.name,
        category: participant.category,
        weight: participant.weight,
        active_days: {
          days: participant.activeDays,
          isAttending: participant.isAttending,
          isSettled: participant.isSettled,
          subFamily: participant.subFamily,
        },
      }).eq('id', participant.id);
    } catch (e) {
      console.error('[Database] Error actualizando participante en Supabase:', e);
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
      await supabase.from('participants').delete().eq('id', participantId);
    } catch (e) {
      console.error('[Database] Error eliminando participante en Supabase:', e);
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

  // 1. Si Supabase NO está configurado y nunca se ha guardado directorio local, cargar semilla demo
  if (!CONFIG.SUPABASE.URL || CONFIG.SUPABASE.URL.includes('tu-proyecto.supabase.co')) {
    if (cachedDir === null && localList.length === 0) {
      SEED_DIRECTORY.forEach((d) => {
        if (d && d.name) contactsMap.set(d.name.toLowerCase().trim(), { ...d });
      });
      return Array.from(contactsMap.values());
    }
  }

  // 2. Si hay un directorio guardado explícitamente en LocalStorage (incluyendo [] si se borraron todos)
  if (Array.isArray(cachedDir)) {
    cachedDir.forEach((d) => {
      if (d && d.name) {
        const key = d.name.toLowerCase().trim();
        contactsMap.set(key, {
          id: d.id || generateUUID(),
          name: d.name,
          category: d.category || 'adulto',
          weight: typeof d.weight === 'number' ? d.weight : (d.category === 'nino' ? 0.5 : 1.0),
          subFamily: d.subFamily || inferSubFamily(d.name),
        });
      }
    });
  }

  // 3. Participantes de eventos en caché/memoria
  localList.forEach((ev) => {
    (ev.participants || []).forEach((p) => {
      if (p && p.name) {
        const key = p.name.toLowerCase().trim();
        const existing = contactsMap.get(key);
        contactsMap.set(key, {
          id: p.id || existing?.id || generateUUID(),
          name: p.name,
          category: p.category || existing?.category || 'adulto',
          weight: typeof p.weight === 'number' ? p.weight : (existing?.weight || (p.category === 'nino' ? 0.5 : 1.0)),
          subFamily: p.subFamily || existing?.subFamily || inferSubFamily(p.name),
        });
      }
    });
  });

  return Array.from(contactsMap.values());
};

export const fetchGlobalDirectoryFromSupabase = async () => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('participants').select('*');
      if (!error && Array.isArray(data)) {
        const contactsMap = new Map();

        // 1. Mapear todos los participantes existentes actualmente en Supabase
        data.forEach((row) => {
          const p = parseParticipantRow(row);
          if (p && p.name) {
            const key = p.name.toLowerCase().trim();
            contactsMap.set(key, {
              id: p.id || generateUUID(),
              name: p.name,
              category: p.category || 'adulto',
              weight: typeof p.weight === 'number' ? p.weight : (p.category === 'nino' ? 0.5 : 1.0),
              subFamily: p.subFamily || inferSubFamily(p.name),
            });
          }
        });

        // 2. Si el usuario creó contactos manuales en el directorio local (con id empezando por 'dir_')
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
            if (d && d.name && String(d.id).startsWith('dir_')) {
              const key = d.name.toLowerCase().trim();
              if (!contactsMap.has(key)) {
                contactsMap.set(key, { ...d });
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

/**
 * Agregar Contacto al Directorio Maestro (y guardarlo en Supabase y LocalStorage)
 */
export const addDirectoryContact = async ({ name, subFamily, category = 'adulto', weight = 1.0 }) => {
  const newContact = {
    id: generateUUID(),
    name: name.trim(),
    category,
    weight: typeof weight === 'number' ? weight : (category === 'nino' ? 0.5 : 1.0),
    subFamily: subFamily?.trim() || inferSubFamily(name),
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('participants').insert({
        id: newContact.id,
        event_id: null,
        name: newContact.name,
        category: newContact.category,
        weight: newContact.weight,
        active_days: {
          days: [],
          isAttending: true,
          isSettled: false,
          subFamily: newContact.subFamily,
        },
      });
      if (error) {
        console.error('[Database] Error guardando contacto en Supabase:', error);
      } else {
        console.log('[Database] ✅ Contacto del directorio guardado en Supabase:', newContact.name, newContact.id);
      }
    } catch (e) {
      console.error('[Database] Excepción guardando contacto en Supabase:', e);
    }
  }

  const dir = getGlobalDirectory();
  dir.push(newContact);
  saveGlobalDirectory(dir);
  return newContact;
};

/**
 * Eliminar Contacto del Directorio Maestro (y de Supabase si existe)
 */
export const deleteDirectoryContact = async (contactId, contactName) => {
  const supabase = await initSupabaseClient();
  if (supabase && isUUID(contactId)) {
    try {
      await supabase.from('participants').delete().eq('id', contactId);
      console.log('[Database] ✅ Contacto eliminado de Supabase:', contactName, contactId);
    } catch (e) {
      console.error('[Database] Error eliminando contacto en Supabase:', e);
    }
  }

  let dir = getGlobalDirectory();
  dir = dir.filter((d) => d.id !== contactId && d.name.toLowerCase().trim() !== (contactName || '').toLowerCase().trim());
  saveGlobalDirectory(dir);
  return dir;
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
