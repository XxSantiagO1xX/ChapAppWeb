import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncEngine } from './syncEngine';
import type { EventConfig, Participant, Expense, DirectoryParticipant, CategoryType } from '../types';

/**
 * Generador de identificadores únicos UUID v4 para compatibilidad total con PostgreSQL Supabase.
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Validador de formato UUID v4 estándar.
 */
export const isUUID = (str?: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export const generateId = (_prefix = 'id'): string => {
  return generateUUID();
};

/**
 * Directorio Global de Participantes Frecuentes de Chapantongo.
 */
export const SEED_DIRECTORY: DirectoryParticipant[] = [
  { id: 'dir_1', name: 'Don Carlos Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', familyGroup: 'Familia Santiago Chapantongo' },
  { id: 'dir_2', name: 'Doña María Bustamante', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Chapantongo', familyGroup: 'Familia Santiago Chapantongo' },
  { id: 'dir_3', name: 'Juanito Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Chapantongo', familyGroup: 'Familia Santiago Chapantongo' },
  { id: 'dir_4', name: 'Roberto Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez', familyGroup: 'Familia Santiago Velázquez' },
  { id: 'dir_5', name: 'Patricia Velázquez', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Velázquez', familyGroup: 'Familia Santiago Velázquez' },
  { id: 'dir_6', name: 'Mateo Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Velázquez', familyGroup: 'Familia Santiago Velázquez' },
  { id: 'dir_7', name: 'Fernando Santiago', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', familyGroup: 'Familia Santiago Morales' },
  { id: 'dir_8', name: 'Carmen Morales', category: 'adulto', weight: 1.0, subFamily: 'Familia Santiago Morales', familyGroup: 'Familia Santiago Morales' },
  { id: 'dir_9', name: 'Lucía Santiago', category: 'nino', weight: 0.5, subFamily: 'Familia Santiago Morales', familyGroup: 'Familia Santiago Morales' },
  { id: 'dir_10', name: 'Alejandro Ruiz', category: 'adulto', weight: 1.0, subFamily: 'Amigos y Primos', familyGroup: 'Amigos y Primos' },
];

/**
 * Mapeo de subfamilias inferidas por nombre o asignación por defecto.
 */
const inferSubFamily = (name: string, fallback = 'Familia General'): string => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('chapantongo')) return 'Familia Santiago Chapantongo';
  if (lower.includes('velázquez') || lower.includes('velazquez')) return 'Familia Santiago Velázquez';
  if (lower.includes('morales')) return 'Familia Santiago Morales';
  if (lower.includes('amigo') || lower.includes('primo') || lower.includes('ruiz')) return 'Amigos y Primos';
  const match = SEED_DIRECTORY.find((d) => d.name.toLowerCase() === lower);
  if (match) return match.subFamily;
  return fallback;
};

/**
 * Diagnóstico centralizado de errores de Supabase (RLS, CORS, Claves Foráneas, Conexión).
 */
export const logSupabaseError = (context: string, error: any): void => {
  if (!error) return;
  const msg = error.message || String(error);
  const code = error.code || '';
  const details = error.details || '';
  const hint = error.hint || '';

  if (code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission denied')) {
    console.error(`🚨 [Supabase RLS Error] ${context}: Permiso denegado por Row Level Security (RLS). Revisa las políticas en el panel de Supabase. Código: ${code}. Mensaje: ${msg}`);
  } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.toLowerCase().includes('network')) {
    console.error(`🌐 [Supabase Network/CORS Error] ${context}: Fallo de red/CORS al conectar con Supabase. Mensaje: ${msg}`);
  } else if (code === '23503' || msg.toLowerCase().includes('foreign key constraint')) {
    console.error(`🔗 [Supabase FK Error] ${context}: Violación de clave foránea. Mensaje: ${msg}. Detalles: ${details}`);
  } else {
    console.error(`❌ [Supabase DB Error] ${context}: [${code}] ${msg} ${details ? `(${details})` : ''} ${hint ? `[Pista: ${hint}]` : ''}`);
  }
};

/**
 * Inicialización y comprobación directa de Supabase Cloud.
 */
export const initDB = async (): Promise<void> => {
  if (!isSupabaseConfigured) {
    console.warn('[Supabase DB] Credenciales no configuradas.');
    return;
  }
  try {
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error) {
      logSupabaseError('initDB (Handshake tabla events)', error);
    } else {
      console.log('[Supabase DB] ✅ Conexión establecida con Supabase Cloud.');
    }
  } catch (err: any) {
    logSupabaseError('initDB (Excepción de conexión)', err);
  }
};

/**
 * Serializador de metadatos de participante dentro de la columna JSONB active_days.
 */
export const serializeParticipantActiveDays = (p: {
  activeDays?: string[];
  isAttending?: boolean;
  isSettled?: boolean;
  subFamily?: string;
  name?: string;
}) => ({
  days: p.activeDays || [],
  isAttending: p.isAttending !== false,
  isSettled: Boolean(p.isSettled),
  subFamily: p.subFamily || inferSubFamily(p.name || ''),
});

/**
 * Parser robusto para registros de participantes desde Supabase.
 */
export const parseParticipantRow = (p: any): Participant => {
  let days: string[] = [];
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
      days = p.active_days.filter((d: any) => typeof d === 'string' && !d.startsWith('__meta__:'));
      const metaItem = p.active_days.find((d: any) => typeof d === 'string' && d.startsWith('__meta__:'));
      if (metaItem) {
        try {
          const meta = JSON.parse(metaItem.replace('__meta__:', ''));
          if (typeof meta.isSettled === 'boolean') isSettled = meta.isSettled;
          if (typeof meta.isAttending === 'boolean') isAttending = meta.isAttending;
          if (meta.subFamily) subFamily = meta.subFamily;
        } catch (e) {}
      }
    } else if (typeof p.active_days === 'string') {
      try {
        const parsed = JSON.parse(p.active_days);
        if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
          days = Array.isArray(parsed.days) ? parsed.days : [];
          if (typeof parsed.isAttending === 'boolean') isAttending = parsed.isAttending;
          if (typeof parsed.isSettled === 'boolean') isSettled = parsed.isSettled;
          if (parsed.subFamily) subFamily = parsed.subFamily;
        } else if (Array.isArray(parsed)) {
          days = parsed.filter((d: any) => typeof d === 'string' && !d.startsWith('__meta__:'));
          const metaItem = parsed.find((d: any) => typeof d === 'string' && d.startsWith('__meta__:'));
          if (metaItem) {
            const meta = JSON.parse(metaItem.replace('__meta__:', ''));
            if (typeof meta.isSettled === 'boolean') isSettled = meta.isSettled;
            if (typeof meta.isAttending === 'boolean') isAttending = meta.isAttending;
            if (meta.subFamily) subFamily = meta.subFamily;
          }
        }
      } catch (e) {
        days = [];
      }
    }
  }

  return {
    id: p.id,
    name: p.name,
    category: (p.category as CategoryType) || 'adulto',
    weight: typeof p.weight === 'number' ? p.weight : parseFloat(p.weight) || 1.0,
    subFamily: p.sub_family || subFamily || inferSubFamily(p.name),
    activeDays: days,
    isAttending: typeof p.is_attending === 'boolean' ? p.is_attending : isAttending,
    isSettled: typeof p.is_settled === 'boolean' ? p.is_settled : isSettled,
  };
};

/**
 * Helper para formatear eventos desde Supabase.
 */
const formatEventRow = (row: any): EventConfig => {
  const parts: Participant[] = (row.participants || []).map(parseParticipantRow);

  const exps: Expense[] = (row.expenses || []).map((exp: any) => ({
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
 * 1. Obtener la lista completa de eventos desde Supabase.
 */
export const getAllEvents = async (): Promise<EventConfig[]> => {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*, participants(*), expenses(*)')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('getAllEvents', error);
      return [];
    }

    if (!data) return [];
    return data.map(formatEventRow);
  } catch (err: any) {
    logSupabaseError('getAllEvents (Excepción)', err);
    return [];
  }
};

/**
 * 2. Obtener un evento específico por ID o Slug desde Supabase.
 */
export const getEventById = async (id: string): Promise<EventConfig | null> => {
  if (!id) return null;
  if (!isSupabaseConfigured) return null;

  try {
    const isIdUUID = isUUID(id);
    let query = supabase.from('events').select('*, participants(*), expenses(*)');
    if (isIdUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('id', id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      logSupabaseError(`getEventById (${id})`, error);
      return null;
    }

    if (!data) return null;
    return formatEventRow(data);
  } catch (err: any) {
    logSupabaseError(`getEventById (${id}) [Excepción]`, err);
    return null;
  }
};

/**
 * 3. Crear un nuevo evento en Supabase.
 */
export const createEvent = async (params: {
  id?: string;
  slug?: string;
  year: number;
  title: string;
  availableDays?: string[];
  initialParticipants?: Participant[];
  participants?: Participant[];
  expenses?: Expense[];
  settlementNotes?: string;
}): Promise<EventConfig> => {
  const newId = params.id && isUUID(params.id) ? params.id : generateUUID();
  const defaultDays =
    params.availableDays && params.availableDays.length > 0
      ? params.availableDays
      : ['Día 1', 'Día 2', 'Día 3'];

  const parts = params.participants || params.initialParticipants || [];
  const exps = params.expenses || [];

  if (isSupabaseConfigured) {
    try {
      // 1. Insertar evento
      const { error: eventError } = await supabase.from('events').insert({
        id: newId,
        year: params.year,
        title: params.title.trim() || `Evento ${params.year}`,
        available_days: defaultDays,
        is_archived: false,
      });

      if (eventError) {
        logSupabaseError('createEvent (insert events)', eventError);
      }

      // 2. Insertar participantes si existen
      if (parts.length > 0) {
        const partsPayload = parts.map((p) => ({
          id: p.id && isUUID(p.id) ? p.id : generateUUID(),
          event_id: newId,
          name: (p.name || '').trim(),
          category: p.category || 'adulto',
          weight: typeof p.weight === 'number' ? p.weight : 1.0,
          active_days: serializeParticipantActiveDays({
            activeDays: p.activeDays || defaultDays,
            isAttending: p.isAttending,
            isSettled: p.isSettled,
            subFamily: p.subFamily,
            name: p.name,
          }),
        }));
        const { error: partsError } = await supabase.from('participants').insert(partsPayload);
        if (partsError) {
          logSupabaseError('createEvent (insert participants)', partsError);
        }
      }

      // 3. Insertar gastos si existen
      if (exps.length > 0) {
        const expsPayload = exps.map((e) => ({
          id: e.id && isUUID(e.id) ? e.id : generateUUID(),
          event_id: newId,
          title: e.title,
          amount: e.amount,
          expense_category: e.category || 'Comida',
          paid_by: e.paidBy && isUUID(e.paidBy) ? e.paidBy : null,
          split_between: e.splitBetween || [],
        }));
        const { error: expsError } = await supabase.from('expenses').insert(expsPayload);
        if (expsError) {
          logSupabaseError('createEvent (insert expenses)', expsError);
        }
      }
    } catch (err: any) {
      logSupabaseError('createEvent (Excepción)', err);
    }
  }

  const createdEvent: EventConfig = {
    id: newId,
    slug: newId,
    year: params.year,
    title: params.title.trim() || `Evento ${params.year}`,
    availableDays: defaultDays,
    participants: parts,
    expenses: exps,
    isArchived: false,
    createdAt: new Date().toISOString(),
    settlementNotes: params.settlementNotes,
  };

  syncEngine.broadcastChange({ entityType: 'event', action: 'create', eventId: newId });
  return createdEvent;
};

/**
 * 4. Actualizar un evento en Supabase.
 */
export const updateEvent = async (event: EventConfig): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: event.title,
          year: event.year,
          available_days: event.availableDays,
          is_archived: event.isArchived,
        })
        .eq('id', event.id);

      if (error) {
        logSupabaseError(`updateEvent (${event.id})`, error);
      }
    } catch (err: any) {
      logSupabaseError(`updateEvent (${event.id}) [Excepción]`, err);
    }
  }

  syncEngine.broadcastChange({ entityType: 'event', action: 'update', eventId: event.id });
};

/**
 * 5. Archivar / Desarchivar evento en Supabase.
 */
export const archiveEvent = async (
  id: string,
  targetState: boolean = true
): Promise<EventConfig | null> => {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('events').update({ is_archived: targetState }).eq('id', id);
      if (error) {
        logSupabaseError(`archiveEvent (${id})`, error);
      }
    } catch (err: any) {
      logSupabaseError(`archiveEvent (${id}) [Excepción]`, err);
    }
  }
  syncEngine.broadcastChange({ entityType: 'event', action: 'update', eventId: id });
  return await getEventById(id);
};

export const unarchiveEvent = async (id: string): Promise<EventConfig | null> => {
  return await archiveEvent(id, false);
};

export const deleteEvent = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      // Eliminar gastos y participantes asociados para respetar claves foráneas en Supabase
      const { error: expErr } = await supabase.from('expenses').delete().eq('event_id', id);
      if (expErr) logSupabaseError(`deleteEvent -> delete expenses (${id})`, expErr);

      const { error: partErr } = await supabase.from('participants').delete().eq('event_id', id);
      if (partErr) logSupabaseError(`deleteEvent -> delete participants (${id})`, partErr);

      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        logSupabaseError(`deleteEvent (${id})`, error);
      }
    } catch (err: any) {
      logSupabaseError(`deleteEvent (${id}) [Excepción]`, err);
    }
  }
  syncEngine.broadcastChange({ entityType: 'event', action: 'delete', eventId: id });
};

/**
 * 7. Importar participantes del Directorio Global hacia un Evento.
 * Maneja asincronía y devuelve siempre el objeto EventConfig actualizado con sus relaciones.
 */
export const importDirectoryParticipantsToEvent = async (
  eventId: string,
  directoryIds: string[]
): Promise<EventConfig | null> => {
  try {
    if (!eventId || !Array.isArray(directoryIds) || directoryIds.length === 0) {
      return await getEventById(eventId);
    }

    // 1. Obtener el evento actual
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) {
      return null;
    }

    // 2. Obtener el directorio global
    const directory = await getGlobalDirectory();
    const contactsToImport = directory.filter((d) => directoryIds.includes(d.id));

    if (contactsToImport.length === 0) {
      return currentEvent;
    }

    const availableDays =
      currentEvent.availableDays && currentEvent.availableDays.length > 0
        ? currentEvent.availableDays
        : ['Día 1', 'Día 2', 'Día 3'];

    // 3. Crear los nuevos participantes
    const existingParticipantIds = new Set(currentEvent.participants.map((p) => p.id));
    const newParticipants: Participant[] = [];

    for (const contact of contactsToImport) {
      const partId =
        isUUID(contact.id) && !existingParticipantIds.has(contact.id)
          ? contact.id
          : generateUUID();

      const newPart: Participant = {
        id: partId,
        name: contact.name,
        category: contact.category,
        weight: typeof contact.weight === 'number' ? contact.weight : 1.0,
        subFamily: contact.subFamily || contact.familyGroup || 'Familia General',
        activeDays: [...availableDays],
        isAttending: true,
        isSettled: false,
      };

      newParticipants.push(newPart);
    }

    // 4. Insertar en Supabase
    if (isSupabaseConfigured && newParticipants.length > 0) {
      const payload = newParticipants.map((p) => ({
        id: p.id,
        event_id: eventId,
        name: (p.name || '').trim(),
        category: p.category || 'adulto',
        weight: typeof p.weight === 'number' ? p.weight : 1.0,
        active_days: serializeParticipantActiveDays(p),
      }));

      const { error } = await supabase.from('participants').insert(payload);
      if (error) {
        logSupabaseError('importDirectoryParticipantsToEvent (insert participants)', error);
      }
    }

    // 5. Emitir cambio reactivo
    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'import',
      eventId,
    });

    // 6. Consultar y devolver el evento actualizado
    const updatedEvent = await getEventById(eventId);
    return updatedEvent || currentEvent;
  } catch (error: any) {
    logSupabaseError('importDirectoryParticipantsToEvent (Excepción)', error);
    return await getEventById(eventId).catch(() => null);
  }
};

/**
 * 8. Participantes: Operaciones CRUD y Helpers de Asistencia y Liquidación.
 */
export const addParticipant = async (
  eventId: string,
  participant: Omit<Participant, 'id'> & { id?: string }
): Promise<Participant> => {
  if (!eventId) {
    throw new Error('ID de evento inválido para registrar participante.');
  }

  const pId = participant.id && isUUID(participant.id) ? participant.id : generateUUID();
  const subFamily = participant.subFamily || inferSubFamily(participant.name);
  const activeDays = participant.activeDays || [];
  const isAttending = participant.isAttending !== false;
  const isSettled = Boolean(participant.isSettled);

  const newParticipant: Participant = {
    ...participant,
    id: pId,
    subFamily,
    activeDays,
    isAttending,
    isSettled,
  };

  if (isSupabaseConfigured) {
    const payload = {
      id: pId,
      event_id: eventId,
      name: (newParticipant.name || '').trim(),
      category: newParticipant.category || 'adulto',
      weight: typeof newParticipant.weight === 'number' ? newParticipant.weight : 1.0,
      active_days: serializeParticipantActiveDays(newParticipant),
    };

    const { error } = await supabase.from('participants').insert(payload);
    if (error) {
      logSupabaseError(`addParticipant (${participant.name})`, error);
      throw new Error(`Error en Supabase al agregar participante: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'create', eventId, participantId: pId });
  return newParticipant;
};

export const updateParticipant = async (eventId: string, participant: Participant): Promise<void> => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('participants')
      .update({
        name: (participant.name || '').trim(),
        category: participant.category,
        weight: typeof participant.weight === 'number' ? participant.weight : 1.0,
        active_days: serializeParticipantActiveDays(participant),
      })
      .eq('id', participant.id);

    if (error) {
      logSupabaseError(`updateParticipant (${participant.id})`, error);
      throw new Error(`Error en Supabase al actualizar participante: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'update', eventId, participantId: participant.id });
};

export const removeParticipant = async (eventId: string, participantId: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      // Limpiar referencia de pagador en gastos para evitar violaciones de clave foránea en Postgres
      const { error: expFkErr } = await supabase.from('expenses').update({ payer_participant_id: null }).eq('payer_participant_id', participantId);
      if (expFkErr) logSupabaseError(`removeParticipant -> clean expense FK (${participantId})`, expFkErr);

      const { error } = await supabase.from('participants').delete().eq('id', participantId);
      if (error) {
        logSupabaseError(`removeParticipant (${participantId})`, error);
      }
    } catch (err: any) {
      logSupabaseError(`removeParticipant (${participantId}) [Excepción]`, err);
    }
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'delete', eventId, participantId });
};

export const deleteParticipant = async (
  eventId: string,
  participantId: string
): Promise<EventConfig | null> => {
  await removeParticipant(eventId, participantId);
  const refreshed = await getEventById(eventId);
  if (refreshed) {
    refreshed.participants = refreshed.participants.filter((p) => String(p.id) !== String(participantId));
  }
  return refreshed;
};

export const deleteSubFamily = async (
  eventId: string,
  subFamilyName: string
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const targetSf = subFamilyName.trim().toLowerCase();
    const toDeleteIds = currentEvent.participants
      .filter((p) => (p.subFamily || 'Familia General').trim().toLowerCase() === targetSf)
      .map((p) => p.id);

    if (isSupabaseConfigured && toDeleteIds.length > 0) {
      try {
        const { error: expFkErr } = await supabase.from('expenses').update({ payer_participant_id: null }).in('payer_participant_id', toDeleteIds);
        if (expFkErr) logSupabaseError(`deleteSubFamily -> clean expenses FK (${subFamilyName})`, expFkErr);

        const { error } = await supabase.from('participants').delete().in('id', toDeleteIds);
        if (error) {
          logSupabaseError(`deleteSubFamily -> delete participants (${subFamilyName})`, error);
        }
      } catch (e: any) {
        logSupabaseError(`deleteSubFamily (${subFamilyName}) [Excepción]`, e);
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'delete',
      eventId,
    });

    const refreshed = await getEventById(eventId);
    if (refreshed) {
      refreshed.participants = refreshed.participants.filter(
        (p) => (p.subFamily || 'Familia General').trim().toLowerCase() !== targetSf
      );
    }
    return refreshed;
  } catch (err) {
    logSupabaseError(`deleteSubFamily outer (${subFamilyName})`, err);
    return await getEventById(eventId);
  }
};

export const toggleParticipantSettled = async (eventId: string, participantId: string): Promise<void> => {
  await toggleParticipantSettlement(eventId, participantId);
};

export const toggleParticipantSettlement = async (
  eventId: string,
  participantId: string
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const participant = currentEvent.participants.find((p) => p.id === participantId);
    if (!participant) return currentEvent;

    const targetSettled = !participant.isSettled;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('participants')
        .update({
          active_days: serializeParticipantActiveDays({
            ...participant,
            isSettled: targetSettled,
          }),
        })
        .eq('id', participantId);

      if (error) {
        logSupabaseError(`toggleParticipantSettlement (${participantId})`, error);
        throw new Error(`Error en Supabase al liquidar: ${error.message}`);
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'settle_toggle',
      eventId,
      participantId,
    });

    return await getEventById(eventId);
  } catch (err: any) {
    logSupabaseError(`toggleParticipantSettlement (${participantId}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const toggleParticipantAttendance = async (
  eventId: string,
  participantId: string
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const participant = currentEvent.participants.find((p) => p.id === participantId);
    if (!participant) return currentEvent;

    const targetAttending = !participant.isAttending;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('participants')
        .update({
          active_days: serializeParticipantActiveDays({
            ...participant,
            isAttending: targetAttending,
          }),
        })
        .eq('id', participantId);

      if (error) {
        logSupabaseError(`toggleParticipantAttendance (${participantId})`, error);
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'attendance_toggle',
      eventId,
      participantId,
    });

    return await getEventById(eventId);
  } catch (err: any) {
    logSupabaseError(`toggleParticipantAttendance (${participantId}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const updateParticipantCategory = async (
  eventId: string,
  participantId: string,
  category: CategoryType,
  weight?: number
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const participant = currentEvent.participants.find((p) => p.id === participantId);
    if (!participant) return currentEvent;

    const newWeight = typeof weight === 'number' ? weight : (category === 'nino' ? 0.5 : 1.0);

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('participants')
        .update({
          category,
          weight: newWeight,
        })
        .eq('id', participantId);

      if (error) {
        logSupabaseError(`updateParticipantCategory (${participantId})`, error);
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'update',
      eventId,
      participantId,
    });

    return await getEventById(eventId);
  } catch (err: any) {
    logSupabaseError(`updateParticipantCategory (${participantId}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const toggleSubFamilyAttendance = async (
  eventId: string,
  subFamilyName: string,
  targetAttending?: boolean
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const targetSf = subFamilyName.trim().toLowerCase();
    const toUpdate = currentEvent.participants.filter(
      (p) => (p.subFamily || 'Familia General').trim().toLowerCase() === targetSf
    );

    if (isSupabaseConfigured && toUpdate.length > 0) {
      for (const p of toUpdate) {
        const isAttending = typeof targetAttending === 'boolean' ? targetAttending : !p.isAttending;
        const { error } = await supabase
          .from('participants')
          .update({
            active_days: serializeParticipantActiveDays({
              ...p,
              isAttending,
            }),
          })
          .eq('id', p.id);

        if (error) {
          logSupabaseError(`toggleSubFamilyAttendance (${p.name})`, error);
        }
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'attendance_toggle',
      eventId,
    });

    return await getEventById(eventId);
  } catch (err) {
    logSupabaseError(`toggleSubFamilyAttendance (${subFamilyName}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const settleSubFamily = async (
  eventId: string,
  subFamilyName: string,
  isSettled: boolean = true
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const targetSf = subFamilyName.trim().toLowerCase();
    const toUpdate = currentEvent.participants.filter(
      (p) => (p.subFamily || 'Familia General').trim().toLowerCase() === targetSf
    );

    if (isSupabaseConfigured && toUpdate.length > 0) {
      for (const p of toUpdate) {
        const { error } = await supabase
          .from('participants')
          .update({
            active_days: serializeParticipantActiveDays({
              ...p,
              isSettled,
            }),
          })
          .eq('id', p.id);

        if (error) {
          logSupabaseError(`settleSubFamily (${p.name})`, error);
        }
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'settle_toggle',
      eventId,
    });

    const updatedEvent = await getEventById(eventId);
    return updatedEvent;
  } catch (err: any) {
    logSupabaseError(`settleSubFamily (${subFamilyName}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const updateParticipantDays = async (
  eventId: string,
  participantId: string,
  activeDays: string[]
): Promise<EventConfig | null> => {
  try {
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) return null;

    const participant = currentEvent.participants.find((p) => p.id === participantId);
    if (!participant) return currentEvent;

    const updatedParticipant: Participant = {
      ...participant,
      activeDays,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('participants')
        .update({
          active_days: serializeParticipantActiveDays(updatedParticipant),
        })
        .eq('id', participantId);

      if (error) {
        logSupabaseError(`updateParticipantDays (${participantId})`, error);
      }
    }

    syncEngine.broadcastChange({ entityType: 'participant', action: 'update', eventId, participantId });
    return await getEventById(eventId);
  } catch (err) {
    logSupabaseError(`updateParticipantDays (${participantId}) [Excepción]`, err);
    return await getEventById(eventId);
  }
};

export const batchUpdateParticipants = async (eventId: string, participants: Participant[]): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      for (const p of participants) {
        const { error } = await supabase
          .from('participants')
          .update({
            name: (p.name || '').trim(),
            category: p.category,
            weight: typeof p.weight === 'number' ? p.weight : 1.0,
            active_days: serializeParticipantActiveDays(p),
          })
          .eq('id', p.id);

        if (error) {
          logSupabaseError(`batchUpdateParticipants (${p.name})`, error);
        }
      }
    } catch (err) {
      logSupabaseError('batchUpdateParticipants (Excepción)', err);
    }
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'update', eventId });
};

/**
 * 9. Gastos: Alta, Modificación, Eliminación y Batch directamente en Supabase.
 */
export const addExpense = async (
  eventId: string,
  expense: Omit<Expense, 'id'> & { id?: string }
): Promise<Expense> => {
  if (!eventId) {
    throw new Error('ID de evento no válido para registrar el gasto.');
  }

  const eId = expense.id && isUUID(expense.id) ? expense.id : generateUUID();
  const title = (expense.title || '').trim();
  const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount)) || 0;
  const category = expense.category || 'Comida';
  const paidBy = expense.paidBy && isUUID(expense.paidBy) ? expense.paidBy : null;
  const splitBetween = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];

  const newExpense: Expense = {
    id: eId,
    title,
    amount,
    category,
    paidBy: paidBy || (expense.paidBy || ''),
    splitBetween,
  };

  if (isSupabaseConfigured) {
    const payload = {
      id: eId,
      event_id: eventId,
      title,
      amount,
      expense_category: category,
      paid_by: paidBy,
      split_between: splitBetween,
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError(`addExpense (${title})`, error);
      throw new Error(`Error en Supabase al guardar gasto: ${error.message}`);
    }

    if (data) {
      newExpense.id = data.id;
      newExpense.amount = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0;
      newExpense.category = data.expense_category || category;
    }
  }

  syncEngine.broadcastChange({ entityType: 'expense', action: 'create', eventId, expenseId: newExpense.id });
  return newExpense;
};

export const updateExpense = async (eventId: string, expense: Expense): Promise<void> => {
  if (isSupabaseConfigured) {
    const paidBy = expense.paidBy && isUUID(expense.paidBy) ? expense.paidBy : null;
    const { error } = await supabase
      .from('expenses')
      .update({
        title: (expense.title || '').trim(),
        amount: typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount)) || 0,
        expense_category: expense.category || 'Comida',
        paid_by: paidBy,
        split_between: expense.splitBetween || [],
      })
      .eq('id', expense.id);

    if (error) {
      logSupabaseError(`updateExpense (${expense.id})`, error);
      throw new Error(`Error en Supabase al actualizar gasto: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'expense', action: 'update', eventId, expenseId: expense.id });
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<EventConfig | null> => {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) {
      logSupabaseError(`deleteExpense (${expenseId})`, error);
      throw new Error(`Error en Supabase al eliminar gasto: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'expense', action: 'delete', eventId, expenseId });
  return await getEventById(eventId);
};

export const batchAddExpenses = async (eventId: string, newExpenses: Expense[]): Promise<Expense[]> => {
  if (!eventId || !Array.isArray(newExpenses) || newExpenses.length === 0) {
    return [];
  }

  const preparedExpenses: Expense[] = [];
  const payloadToInsert: any[] = [];

  for (const exp of newExpenses) {
    const eId = exp.id && isUUID(exp.id) ? exp.id : generateUUID();
    const title = (exp.title || '').trim();
    const amount = typeof exp.amount === 'number' ? exp.amount : parseFloat(String(exp.amount)) || 0;
    const category = exp.category || 'Comida';
    const paidBy = exp.paidBy && isUUID(exp.paidBy) ? exp.paidBy : null;
    const splitBetween = Array.isArray(exp.splitBetween) ? exp.splitBetween : [];

    preparedExpenses.push({
      id: eId,
      title,
      amount,
      category,
      paidBy: paidBy || (exp.paidBy || ''),
      splitBetween,
    });

    payloadToInsert.push({
      id: eId,
      event_id: eventId,
      title,
      amount,
      expense_category: category,
      paid_by: paidBy,
      split_between: splitBetween,
    });
  }

  if (isSupabaseConfigured && payloadToInsert.length > 0) {
    const { data, error } = await supabase.from('expenses').insert(payloadToInsert).select();
    if (error) {
      logSupabaseError('batchAddExpenses', error);
      throw new Error(`Error en Supabase al importar gastos: ${error.message}`);
    }
    if (data && Array.isArray(data)) {
      data.forEach((row: any, i: number) => {
        if (preparedExpenses[i]) {
          preparedExpenses[i].id = row.id;
        }
      });
    }
  }

  syncEngine.broadcastChange({ entityType: 'expense', action: 'create', eventId });
  return preparedExpenses;
};

/**
 * 10. Directorio Global con Persistencia Híbrida (Supabase Cloud + AsyncStorage) y Sincronización en Tiempo Real.
 */
const DIRECTORY_STORAGE_KEY = '@chapapp_global_directory_v1';
const DIRECTORY_DELETED_KEY = '@chapapp_global_directory_deleted_v1';
let directoryInitialized = false;
let globalDirectoryState: DirectoryParticipant[] = [...SEED_DIRECTORY];
let deletedDirectoryIds: Set<string> = new Set();

const persistGlobalDirectory = async (data: DirectoryParticipant[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[AsyncStorage] Error al persistir el directorio global:', e);
  }
};

const persistDeletedIds = async (ids: Set<string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIRECTORY_DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('[AsyncStorage] Error al persistir eliminados de directorio:', e);
  }
};

const ensureDirectoryLoaded = async (): Promise<DirectoryParticipant[]> => {
  if (!directoryInitialized) {
    try {
      const stored = await AsyncStorage.getItem(DIRECTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          globalDirectoryState = parsed;
        }
      } else {
        // Primera ejecución: guardar la semilla inicial
        await persistGlobalDirectory(SEED_DIRECTORY);
      }

      const storedDeleted = await AsyncStorage.getItem(DIRECTORY_DELETED_KEY);
      if (storedDeleted) {
        const parsedDel = JSON.parse(storedDeleted);
        if (Array.isArray(parsedDel)) {
          deletedDirectoryIds = new Set(parsedDel);
        }
      }
    } catch (e) {
      console.warn('[AsyncStorage] Error al cargar el directorio global, usando valor en memoria:', e);
    }
    directoryInitialized = true;
  }
  return globalDirectoryState;
};

export const globalDirectorySyncFromRemote = async (data: DirectoryParticipant[]): Promise<void> => {
  if (Array.isArray(data)) {
    globalDirectoryState = data;
    directoryInitialized = true;
    await persistGlobalDirectory(data);
  }
};

export const getGlobalDirectory = async (): Promise<DirectoryParticipant[]> => {
  const localList = await ensureDirectoryLoaded();

  if (isSupabaseConfigured) {
    try {
      // Consultar participantes registrados en Supabase Cloud para descubrimiento automático
      const { data: cloudParts, error } = await supabase
        .from('participants')
        .select('id, name, category, weight, active_days');

      if (!error && Array.isArray(cloudParts) && cloudParts.length > 0) {
        const directoryMap = new Map<string, DirectoryParticipant>();

        // 1. Cargar entradas actuales locales y semillas
        localList.forEach((d) => {
          if (!deletedDirectoryIds.has(d.id) && !deletedDirectoryIds.has(d.name.trim().toLowerCase())) {
            directoryMap.set(d.name.trim().toLowerCase(), d);
          }
        });

        // 2. Descubrir y fusionar participantes de la nube
        cloudParts.forEach((cp: any) => {
          const parsed = parseParticipantRow(cp);
          if (parsed && parsed.name && parsed.name.trim()) {
            const normalizedName = parsed.name.trim().toLowerCase();
            if (!deletedDirectoryIds.has(parsed.id) && !deletedDirectoryIds.has(normalizedName)) {
              const existing = directoryMap.get(normalizedName);
              if (!existing) {
                directoryMap.set(normalizedName, {
                  id: parsed.id,
                  name: parsed.name.trim(),
                  category: parsed.category,
                  weight: parsed.weight,
                  subFamily: parsed.subFamily || inferSubFamily(parsed.name),
                  familyGroup: parsed.subFamily || inferSubFamily(parsed.name),
                });
              }
            }
          }
        });

        const merged = Array.from(directoryMap.values());
        globalDirectoryState = merged;
        await persistGlobalDirectory(merged);
        return merged;
      }
    } catch (e) {
      console.warn('[GlobalDirectory] Error consultando participantes de Supabase:', e);
    }
  }

  return [...localList];
};

export const addDirectoryParticipant = async (
  contact: Omit<DirectoryParticipant, 'id'> & { id?: string }
): Promise<DirectoryParticipant> => {
  await ensureDirectoryLoaded();
  const normalizedName = (contact.name || '').trim().toLowerCase();
  deletedDirectoryIds.delete(contact.id || '');
  deletedDirectoryIds.delete(normalizedName);
  await persistDeletedIds(deletedDirectoryIds);

  const newContact: DirectoryParticipant = {
    ...contact,
    id: contact.id || generateId('dir'),
  };
  globalDirectoryState = [newContact, ...globalDirectoryState.filter((c) => String(c.id) !== String(newContact.id) && c.name.trim().toLowerCase() !== normalizedName)];
  await persistGlobalDirectory(globalDirectoryState);
  syncEngine.broadcastChange({ entityType: 'directory', action: 'create', data: globalDirectoryState });
  return newContact;
};

export const deleteDirectoryParticipant = async (id: string): Promise<void> => {
  await ensureDirectoryLoaded();
  const target = globalDirectoryState.find((c) => String(c.id) === String(id));
  deletedDirectoryIds.add(id);
  if (target?.name) {
    deletedDirectoryIds.add(target.name.trim().toLowerCase());
  }
  await persistDeletedIds(deletedDirectoryIds);

  globalDirectoryState = globalDirectoryState.filter((c) => String(c.id) !== String(id));
  await persistGlobalDirectory(globalDirectoryState);
  syncEngine.broadcastChange({ entityType: 'directory', action: 'delete', data: globalDirectoryState });
};

export const batchAddDirectoryParticipants = async (contacts: DirectoryParticipant[]): Promise<void> => {
  await ensureDirectoryLoaded();
  const existingMap = new Map<string, DirectoryParticipant>();
  contacts.forEach((c) => {
    const item: DirectoryParticipant = {
      ...c,
      id: c.id || generateId('dir'),
    };
    existingMap.set(item.id, item);
  });
  globalDirectoryState.forEach((c) => {
    if (!existingMap.has(c.id)) {
      existingMap.set(c.id, c);
    }
  });
  globalDirectoryState = Array.from(existingMap.values());
  await persistGlobalDirectory(globalDirectoryState);
  syncEngine.broadcastChange({ entityType: 'directory', action: 'create', data: globalDirectoryState });
};

// Escucha reactiva interna para sincronizar el estado global del directorio ante mensajes de SyncEngine
syncEngine.subscribeToDirectory((payload) => {
  if (payload && Array.isArray(payload.data)) {
    globalDirectorySyncFromRemote(payload.data);
  }
});

/**
 * Suscripciones reactivas en tiempo real.
 */
export const subscribeToEventRealtime = (eventId: string, callback: () => void): (() => void) => {
  return syncEngine.subscribeToEvent(eventId, callback);
};

export const subscribeToEventsListRealtime = (callback: () => void): (() => void) => {
  return syncEngine.subscribeToEventsList(callback);
};

export const subscribeToDirectoryRealtime = (callback: (payload?: any) => void): (() => void) => {
  return syncEngine.subscribeToDirectory(callback);
};
