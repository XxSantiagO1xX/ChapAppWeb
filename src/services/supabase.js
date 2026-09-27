/**
 * ChapApp - Cliente Oficial Supabase para Web
 * Importación ESM moderna con soporte Realtime
 */

import { CONFIG, isSupabaseConfigured } from '../config.js';

let supabaseClient = null;

// Cargar cliente Supabase dinámicamente mediante ESM
export const initSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;

  if (!isSupabaseConfigured) {
    console.warn('[Supabase] Credenciales no configuradas. Operando en modo LocalStorage.');
    return null;
  }

  try {
    // Si Supabase ya fue cargado globalmente mediante script CDN
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      console.log('[Supabase Web] ✅ Cliente inicializado desde script global.');
      return supabaseClient;
    }

    // Importación dinámica ESM
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    console.log('[Supabase Web] ✅ Cliente Supabase inicializado vía ESM.');
    return supabaseClient;
  } catch (err) {
    console.warn('[Supabase Web] Error importando Supabase ESM, se usará modo local:', err.message);
    return null;
  }
};

export const getSupabase = () => supabaseClient;
