import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN DE CREDENCIALES DE SUPABASE
// ============================================================================
export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xpdvtsrdcrfljceafuuy.supabase.co';

export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tG7pPEaA-_d1I7V8TKiaGg_6tyuC2vt';

/**
 * Determina si las credenciales de Supabase han sido configuradas válidamente por el usuario.
 */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('tu-proyecto.supabase.co') &&
  !SUPABASE_ANON_KEY.includes('tu-anon-key')
);

/**
 * Instancia centralizada del cliente oficial de Supabase sin dependencias de AsyncStorage.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
