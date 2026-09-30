/**
 * ChapApp - Cliente Oficial Supabase para Web (React + Vite)
 * Soporte transparente para sincronización en tiempo real
 */

import { createClient } from '@supabase/supabase-js';
import { CONFIG, isSupabaseConfigured } from '../config/config.js';

let supabaseClient = null;

export const initSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  if (!isSupabaseConfigured) {
    console.warn('[Supabase] Credenciales no configuradas. Operando en modo LocalStorage.');
    return null;
  }

  try {
    supabaseClient = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
    console.log('[Supabase Web] ✅ Cliente Supabase inicializado.');
    return supabaseClient;
  } catch (err) {
    console.warn('[Supabase Web] Error inicializando Supabase:', err.message);
    return null;
  }
};

export const getSupabase = () => supabaseClient;
