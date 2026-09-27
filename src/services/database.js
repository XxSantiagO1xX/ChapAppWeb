/**
 * ChapApp - Servicio de Base de Datos y Sincronización Web
 * Comunicación transparente con Supabase Cloud y respaldo en LocalStorage
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
 * Parser de participante desde fila de Supabase
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
  }

  return {
    id: p.id,
    name: p.name,
    category: p.category || 'adulto',
    weight: typeof p.weight === 'number' ? p.weight : parseFloat(p.weight) || 1.0,
    subFamily: p.sub_family || subFamily || inferSubFamily(p.name),
    activeDays: days,
    isAttending: typeof p.is_attending === 'boolean' ? p.is_attending : isAttending,
    isSettled: typeof p.is_settled === 'boolean' ? p.is_settled : isSettled,
  };
};

const formatEventRow = (row) => {
  const parts = (row.participants || []).map(parseParticipantRow);
  const exps = (row.expenses || []).map((exp) => ({
    id: exp.id,
    title: exp.title,
    amount: typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0,
    category: exp.expense_category || exp.category || 'Comida',
    paidBy: exp.paid_by,
    splitBetween: Array.isArray(exp.split_between)
      ? exp.split_between
      : typeof exp.split_between === 'string'
      ? JSON.parse(exp.split_between)
      : [],
  }));

  return {
    id: row.id,
    slug: row.slug || row.id,
    year: row.year,
    title: row.title,
    availableDays: Array.isArray(row.available_days)
      ? row.available_days
      : typeof row.available_days === 'string'
      ? JSON.parse(row.available_days)
      : ['Día 1', 'Día 2', 'Día 3'],
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at,
    settlementNotes: row.settlement_notes,
    participants: parts,
    expenses: exps,
  };
};

/**
 * Obtener todos los eventos
 */
export const getAllEvents = async () => {
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, participants(*), expenses(*)')
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted = data.map(formatEventRow);
        saveLocalEvents(formatted);
        return formatted;
      }
    } catch (err) {
      console.warn('[Database] Error cargando de Supabase, usando local:', err);
    }
  }
  const localList = loadLocalEvents();
  if (localList && localList.length > 0) {
    return localList;
  }
  // Semilla predeterminada si no hay datos en la nube ni en caché local
  saveLocalEvents(INITIAL_SEED_EVENTS);
  return INITIAL_SEED_EVENTS;
};

/**
 * Obtener un evento por ID
 */
export const getEventById = async (id) => {
  if (!id) return null;
  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      const isIdUUID = isUUID(id);
      let query = supabase.from('events').select('*, participants(*), expenses(*)');
      query = isIdUUID ? query.eq('id', id) : query.eq('slug', id);

      const { data, error } = await query.single();
      if (!error && data) {
        return formatEventRow(data);
      }
    } catch (err) {
      console.warn('[Database] Error cargando evento de Supabase:', err);
    }
  }

  const localList = loadLocalEvents();
  const matched = localList.find((e) => e.id === id || e.slug === id);
  if (matched) return matched;

  return INITIAL_SEED_EVENTS.find((e) => e.id === id || e.slug === id) || INITIAL_SEED_EVENTS[0] || null;
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
    subFamily: p.subFamily || inferSubFamily(p.name),
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
          id: p.id,
          event_id: newEvent.id,
          name: p.name,
          category: p.category,
          weight: p.weight,
          sub_family: p.subFamily,
          is_attending: p.isAttending,
          is_settled: p.isSettled,
          active_days: {
            days: p.activeDays,
            isAttending: p.isAttending,
            isSettled: p.isSettled,
            subFamily: p.subFamily,
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
    } catch (e) {}
  }
  const list = loadLocalEvents();
  const found = list.find((e) => e.id === id);
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
    } catch (e) {}
  }
  let list = loadLocalEvents();
  list = list.filter((e) => e.id !== id);
  saveLocalEvents(list);
};

/**
 * Agregar Participante
 */
export const addParticipant = async (eventId, participantData) => {
  const p = {
    id: generateUUID(),
    name: participantData.name.trim(),
    category: participantData.category || 'adulto',
    weight: participantData.weight ?? (participantData.category === 'nino' ? 0.5 : 1.0),
    subFamily: participantData.subFamily || inferSubFamily(participantData.name),
    activeDays: participantData.activeDays || [],
    isAttending: participantData.isAttending !== false,
    isSettled: Boolean(participantData.isSettled),
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('participants').insert({
        id: p.id,
        event_id: eventId,
        name: p.name,
        category: p.category,
        weight: p.weight,
        sub_family: p.subFamily,
        is_attending: p.isAttending,
        is_settled: p.isSettled,
        active_days: {
          days: p.activeDays,
          isAttending: p.isAttending,
          isSettled: p.isSettled,
          subFamily: p.subFamily,
        },
      });
    } catch (e) {}
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId);
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
        sub_family: participant.subFamily,
        is_attending: participant.isAttending,
        is_settled: participant.isSettled,
        active_days: {
          days: participant.activeDays,
          isAttending: participant.isAttending,
          isSettled: participant.isSettled,
          subFamily: participant.subFamily,
        },
      }).eq('id', participant.id);
    } catch (e) {}
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId);
  if (event) {
    const idx = event.participants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) {
      event.participants[idx] = { ...event.participants[idx], ...participant };
      saveLocalEvents(list);
    }
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
    } catch (e) {}
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId);
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

  const targetParts = event.participants.filter(
    (p) => (p.subFamily || 'Familia General') === subFamilyName
  );

  const supabase = await initSupabaseClient();
  for (const p of targetParts) {
    p.isSettled = isSettled;
    if (supabase) {
      try {
        await supabase.from('participants').update({
          is_settled: isSettled,
          active_days: {
            days: p.activeDays,
            isAttending: p.isAttending,
            isSettled,
            subFamily: p.subFamily,
          },
        }).eq('id', p.id);
      } catch (e) {}
    }
  }

  const list = loadLocalEvents();
  const ev = list.find((e) => e.id === eventId);
  if (ev) {
    ev.participants = event.participants;
    saveLocalEvents(list);
  }
};

/**
 * Agregar Gasto
 */
export const addExpense = async (eventId, expenseData) => {
  const exp = {
    id: generateUUID(),
    title: expenseData.title.trim(),
    amount: typeof expenseData.amount === 'number' ? expenseData.amount : parseFloat(expenseData.amount) || 0,
    category: expenseData.category || 'Comida',
    paidBy: expenseData.paidBy,
    splitBetween: expenseData.splitBetween || [],
  };

  const supabase = await initSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('expenses').insert({
        id: exp.id,
        event_id: eventId,
        title: exp.title,
        amount: exp.amount,
        expense_category: exp.category,
        paid_by: exp.paidBy,
        split_between: exp.splitBetween,
      });
    } catch (e) {}
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId);
  if (event) {
    event.expenses = event.expenses || [];
    event.expenses.unshift(exp);
    saveLocalEvents(list);
  }
/**
 * Agregar Lote de Gastos (Importación CSV)
 */
export const batchAddExpenses = async (eventId, expensesList) => {
  if (!expensesList || expensesList.length === 0) return [];

  const prepared = expensesList.map((exp) => ({
    id: exp.id || generateUUID(),
    title: exp.title.trim(),
    amount: typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0,
    category: exp.category || 'Comida',
    paidBy: exp.paidBy,
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
  const event = list.find((e) => e.id === eventId);
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
    } catch (e) {}
  }

  const list = loadLocalEvents();
  const event = list.find((e) => e.id === eventId);
  if (event) {
    event.expenses = (event.expenses || []).filter((x) => x.id !== expenseId);
    saveLocalEvents(list);
  }
};

/**
 * Directorio Global
 */
export const getGlobalDirectory = () => {
  try {
    const raw = localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY);
    return raw ? JSON.parse(raw) : SEED_DIRECTORY;
  } catch (e) {
    return SEED_DIRECTORY;
  }
};

export const saveGlobalDirectory = (directory) => {
  try {
    localStorage.setItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY, JSON.stringify(directory));
  } catch (e) {}
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
