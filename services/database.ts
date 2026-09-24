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
      console.warn('[Supabase DB] Error al conectar con tabla events:', error.message);
    } else {
      console.log('[Supabase DB] Conexión establecida con Supabase Cloud.');
    }
  } catch (err: any) {
    console.warn('[Supabase DB] Error en handshake con Supabase:', err.message);
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

    if (error || !data) {
      console.warn('[Supabase DB] Error en getAllEvents:', error?.message);
      return [];
    }

    return data.map(formatEventRow);
  } catch (err: any) {
    console.error('[Supabase DB] Excepción en getAllEvents:', err);
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
    if (error || !data) {
      return null;
    }

    return formatEventRow(data);
  } catch (err: any) {
    console.error(`[Supabase DB] Error en getEventById (${id}):`, err);
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
        console.error('[Supabase DB] Error al crear evento:', eventError.message);
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
        await supabase.from('participants').insert(partsPayload);
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
        await supabase.from('expenses').insert(expsPayload);
      }
    } catch (err: any) {
      console.error('[Supabase DB] Excepción en createEvent:', err);
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
      await supabase
        .from('events')
        .update({
          title: event.title,
          year: event.year,
          available_days: event.availableDays,
          is_archived: event.isArchived,
        })
        .eq('id', event.id);
    } catch (err: any) {
      console.error('[Supabase DB] Error en updateEvent:', err);
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
      await supabase.from('events').update({ is_archived: targetState }).eq('id', id);
    } catch (err) {}
  }
  syncEngine.broadcastChange({ entityType: 'event', action: 'update', eventId: id });
  return await getEventById(id);
};

export const unarchiveEvent = async (id: string): Promise<EventConfig | null> => {
  return await archiveEvent(id, false);
};

/**
 * 6. Eliminar evento de Supabase.
 */
export const deleteEvent = async (id: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('events').delete().eq('id', id);
    } catch (err) {}
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
        console.warn('[Supabase DB] Error al insertar participantes importados:', error.message);
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
    console.error('[Supabase DB] Error en importDirectoryParticipantsToEvent:', error);
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
      console.error('[Supabase DB] Error al agregar participante:', error);
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
      console.error('[Supabase DB] Error al actualizar participante:', error);
      throw new Error(`Error en Supabase al actualizar participante: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'update', eventId, participantId: participant.id });
};

export const removeParticipant = async (eventId: string, participantId: string): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('participants').delete().eq('id', participantId);
    } catch (err) {}
  }

  syncEngine.broadcastChange({ entityType: 'participant', action: 'delete', eventId, participantId });
};

export const deleteParticipant = async (
  eventId: string,
  participantId: string
): Promise<EventConfig | null> => {
  await removeParticipant(eventId, participantId);
  return await getEventById(eventId);
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
      await supabase.from('participants').delete().in('id', toDeleteIds);
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'delete',
      eventId,
    });

    return await getEventById(eventId);
  } catch (err) {
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
        console.error('[Supabase DB] Error al alternar liquidación de participante:', error);
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
    console.error('[Supabase DB] Excepción en toggleParticipantSettlement:', err);
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
        console.error('[Supabase DB] Error al alternar asistencia:', error);
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
    console.error('[Supabase DB] Excepción en toggleParticipantAttendance:', err);
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
        console.error('[Supabase DB] Error al actualizar categoría/tarifa de participante:', error);
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
    console.error('[Supabase DB] Excepción en updateParticipantCategory:', err);
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
        await supabase
          .from('participants')
          .update({
            active_days: serializeParticipantActiveDays({
              ...p,
              isAttending,
            }),
          })
          .eq('id', p.id);
      }
    }

    syncEngine.broadcastChange({
      entityType: 'participant',
      action: 'attendance_toggle',
      eventId,
    });

    return await getEventById(eventId);
  } catch (err) {
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
          console.error(`[Supabase DB] Error al liquidar participante ${p.name}:`, error);
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
    console.error('[Supabase DB] Excepción en settleSubFamily:', err);
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
      await supabase
        .from('participants')
        .update({
          active_days: serializeParticipantActiveDays(updatedParticipant),
        })
        .eq('id', participantId);
    }

    syncEngine.broadcastChange({ entityType: 'participant', action: 'update', eventId, participantId });
    return await getEventById(eventId);
  } catch (err) {
    return await getEventById(eventId);
  }
};

export const batchUpdateParticipants = async (eventId: string, participants: Participant[]): Promise<void> => {
  if (isSupabaseConfigured) {
    try {
      for (const p of participants) {
        await supabase
          .from('participants')
          .update({
            name: (p.name || '').trim(),
            category: p.category,
            weight: typeof p.weight === 'number' ? p.weight : 1.0,
            active_days: serializeParticipantActiveDays(p),
          })
          .eq('id', p.id);
      }
    } catch (err) {}
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
      console.error('[Supabase DB] Error al registrar gasto en Supabase:', error);
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
      console.error('[Supabase DB] Error al actualizar gasto:', error);
      throw new Error(`Error en Supabase al actualizar gasto: ${error.message}`);
    }
  }

  syncEngine.broadcastChange({ entityType: 'expense', action: 'update', eventId, expenseId: expense.id });
};

export const deleteExpense = async (eventId: string, expenseId: string): Promise<EventConfig | null> => {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) {
      console.error('[Supabase DB] Error al eliminar gasto:', error);
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
      console.error('[Supabase DB] Error al insertar lote de gastos:', error);
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
 * 10. Directorio Global con Persistencia Local (AsyncStorage) y Sincronización en Tiempo Real.
 */
const DIRECTORY_STORAGE_KEY = '@chapapp_global_directory_v1';
let directoryInitialized = false;
let globalDirectoryState: DirectoryParticipant[] = [...SEED_DIRECTORY];

const persistGlobalDirectory = async (data: DirectoryParticipant[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[AsyncStorage] Error al persistir el directorio global:', e);
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
    } catch (e) {
      console.warn('[AsyncStorage] Error al cargar el directorio global, usando valor en memoria:', e);
    }
    directoryInitialized = true;
  }
  return globalDirectoryState;
};

export const getGlobalDirectory = async (): Promise<DirectoryParticipant[]> => {
  return await ensureDirectoryLoaded();
};

export const addDirectoryParticipant = async (
  contact: Omit<DirectoryParticipant, 'id'> & { id?: string }
): Promise<DirectoryParticipant> => {
  await ensureDirectoryLoaded();
  const newContact: DirectoryParticipant = {
    ...contact,
    id: contact.id || generateId('dir'),
  };
  globalDirectoryState = [newContact, ...globalDirectoryState.filter((c) => c.id !== newContact.id)];
  await persistGlobalDirectory(globalDirectoryState);
  syncEngine.broadcastChange({ entityType: 'directory', action: 'create', data: newContact });
  return newContact;
};

export const deleteDirectoryParticipant = async (id: string): Promise<void> => {
  await ensureDirectoryLoaded();
  globalDirectoryState = globalDirectoryState.filter((c) => c.id !== id);
  await persistGlobalDirectory(globalDirectoryState);
  syncEngine.broadcastChange({ entityType: 'directory', action: 'delete', data: { id } });
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
  syncEngine.broadcastChange({ entityType: 'directory', action: 'create' });
};

/**
 * Suscripciones reactivas en tiempo real.
 */
export const subscribeToEventRealtime = (eventId: string, callback: () => void): (() => void) => {
  return syncEngine.subscribeToEvent(eventId, callback);
};

export const subscribeToEventsListRealtime = (callback: () => void): (() => void) => {
  return syncEngine.subscribeToEventsList(callback);
};

export const subscribeToDirectoryRealtime = (callback: () => void): (() => void) => {
  return syncEngine.subscribeToDirectory(callback);
};
