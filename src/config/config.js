/**
 * ChapApp - Configuración Centralizada de Servicios y Entornos
 * Credenciales de Supabase Cloud y Google Gemini Vision
 */

export const CONFIG = {
  SUPABASE: {
    URL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
         (typeof window !== 'undefined' && window.__ENV?.SUPABASE_URL) ||
         'https://xpdvtsrdcrfljceafuuy.supabase.co',
    ANON_KEY: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
              (typeof window !== 'undefined' && window.__ENV?.SUPABASE_ANON_KEY) ||
              'sb_publishable_tG7pPEaA-_d1I7V8TKiaGg_6tyuC2vt',
  },
  GEMINI: {
    API_KEY: (typeof window !== 'undefined' && (localStorage.getItem('chapapp_gemini_api_key') || window.__ENV?.GEMINI_API_KEY)) || 
             (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '',
    MODEL: 'gemini-2.0-flash',
    FALLBACK_MODELS: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-1.5-pro'
    ]
  },
  APP: {
    NAME: 'ChapApp',
    VERSION: '5.0.0',
    DEFAULT_THEME: 'dark',
    STORAGE_KEYS: {
      THEME: 'chapapp_theme_preference',
      LOCAL_EVENTS: 'chapapp_cached_events',
      LOCAL_DIRECTORY: 'chapapp_cached_directory',
      BACKGROUND: 'chapapp_custom_background'
    }
  }
};

export const isSupabaseConfigured = Boolean(
  CONFIG.SUPABASE.URL &&
  CONFIG.SUPABASE.ANON_KEY &&
  !CONFIG.SUPABASE.URL.includes('tu-proyecto.supabase.co')
);
