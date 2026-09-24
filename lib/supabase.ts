import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// ============================================================================
// CONFIGURACIÓN DE CREDENCIALES DE SUPABASE
// ============================================================================
const extra = Constants.expoConfig?.extra || {};

export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  'https://xpdvtsrdcrfljceafuuy.supabase.co';

export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_tG7pPEaA-_d1I7V8TKiaGg_6tyuC2vt';

/**
 * Determina si las credenciales de Supabase han sido configuradas válidamente por el usuario.
 */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('tu-proyecto.supabase.co') &&
  !SUPABASE_ANON_KEY.includes('tu-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn('[Supabase Init] ⚠️ Credenciales de Supabase no configuradas o con valor por defecto.');
} else {
  console.log(`[Supabase Init] 🔌 Conectando a Supabase URL: ${SUPABASE_URL.substring(0, 24)}... (Clave configurada: ${Boolean(SUPABASE_ANON_KEY)})`);
}

/**
 * Instancia centralizada del cliente oficial de Supabase.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
