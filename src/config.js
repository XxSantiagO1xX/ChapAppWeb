/**
 * ChapApp - Configuración Centralizada de Servicios Web
 * Credenciales de Supabase y Google Gemini Vision
 */

export const CONFIG = {
  SUPABASE: {
    URL: 'https://xpdvtsrdcrfljceafuuy.supabase.co',
    ANON_KEY: 'sb_publishable_tG7pPEaA-_d1I7V8TKiaGg_6tyuC2vt',
  },
  GEMINI: {
    // API Key de Google Gemini para escaneo inteligente de tickets
    API_KEY: window.__ENV?.GEMINI_API_KEY || 'AIzaSyA8_EXAMPLE_OR_USER_CONFIGURED',
    MODEL: 'gemini-2.5-flash',
    FALLBACK_MODELS: [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-flash-latest'
    ]
  },
  APP: {
    NAME: 'ChapApp',
    VERSION: '2.0.0',
    DEFAULT_THEME: 'dark', // Tema oscuro predeterminado
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
