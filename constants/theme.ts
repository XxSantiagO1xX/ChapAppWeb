/**
 * Paletas de diseño y tokens de tema para ChapApp.
 * Implementación de Glassmorphism UI Ultra-Moderno para Modo Oscuro y Modo Claro.
 * Inspirado en dashboards ejecutivos de alta gama (Imágenes conceptuales).
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  mode: ThemeMode;
  // Fondos y Superficies de Cristal
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHighlight: string;
  cardBackground: string;

  // Bordes de Cristal
  border: string;
  borderLight: string;
  borderFocus: string;

  // Tipografía de Alta Legibilidad
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Acentos y Marca
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryBorder: string;
  primaryText: string;

  // Estados Financieros Semánticos
  success: string;
  successLight: string;
  successBorder: string;
  successText: string;

  warning: string;
  warningLight: string;
  warningBorder: string;
  warningText: string;

  danger: string;
  dangerLight: string;
  dangerBorder: string;
  dangerText: string;

  purple: string;
  purpleLight: string;
  purpleBorder: string;

  teal: string;
  tealLight: string;
  tealBorder: string;
  tealText: string;

  coral: string;
  coralLight: string;
  coralBorder: string;
  coralText: string;

  // Acentos Vibrantes de Cristal
  neonGreen: string;
  neonCyan: string;
  neonCoral: string;
  neonAmber: string;
  neonPurple: string;

  // Propiedades Glassmorphism
  blurTint: 'light' | 'dark' | 'default';
  glassBackground: string;
  glassBorder: string;
}

export const LightPalette: ThemePalette = {
  mode: 'light',
  background: '#F8FAFC',        // Base luminosa y limpia con toque sutil de malla iridiscente
  surface: 'rgba(255, 255, 255, 0.48)', // Auténtico vidrio esmerilado blanco translúcido
  surfaceSubtle: 'rgba(255, 255, 255, 0.35)', // Inset esmerilado suave / sunken limpio
  surfaceHighlight: 'rgba(255, 255, 255, 0.70)', // Superficie brillante elevada
  cardBackground: 'rgba(255, 255, 255, 0.48)',

  border: 'rgba(255, 255, 255, 0.65)', // Borde de cristal fino y luminoso
  borderLight: 'rgba(255, 255, 255, 0.40)',
  borderFocus: '#0284C7',

  textPrimary: '#0F172A',       // Azul marino / carbón profundo de alta legibilidad
  textSecondary: '#475569',     // Gris pizarra medio
  textMuted: '#94A3B8',         // Gris atenuado
  textInverse: '#FFFFFF',

  primary: '#0284C7',           // Azul cian / zafiro
  primaryHover: '#0369A1',
  primaryLight: 'rgba(2, 132, 199, 0.10)',
  primaryBorder: 'rgba(2, 132, 199, 0.30)',
  primaryText: '#0284C7',

  success: '#10B981',           // Esmeralda fresco
  successLight: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.30)',
  successText: '#059669',

  warning: '#F59E0B',           // Ámbar brillante
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.30)',
  warningText: '#D97706',

  danger: '#F43F5E',            // Coral rosa / rubí
  dangerLight: 'rgba(244, 63, 94, 0.12)',
  dangerBorder: 'rgba(244, 63, 94, 0.30)',
  dangerText: '#E11D48',

  purple: '#8B5CF6',            // Violeta moderno
  purpleLight: 'rgba(139, 92, 246, 0.12)',
  purpleBorder: 'rgba(139, 92, 246, 0.30)',

  teal: '#06B6D4',
  tealLight: 'rgba(6, 182, 212, 0.12)',
  tealBorder: 'rgba(6, 182, 212, 0.30)',
  tealText: '#0891B2',

  coral: '#F43F5E',
  coralLight: 'rgba(244, 63, 94, 0.12)',
  coralBorder: 'rgba(244, 63, 94, 0.30)',
  coralText: '#E11D48',

  neonGreen: '#10B981',
  neonCyan: '#06B6D4',
  neonCoral: '#F43F5E',
  neonAmber: '#F59E0B',
  neonPurple: '#8B5CF6',

  blurTint: 'light',
  glassBackground: 'rgba(255, 255, 255, 0.48)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
};

export const DarkPalette: ThemePalette = {
  mode: 'dark',
  background: '#0D1117',        // Canvas medianoche moderno (Glassmorphism dark)
  surface: 'rgba(18, 26, 42, 0.45)', // Tarjeta de cristal oscuro translúcido auténtico
  surfaceSubtle: 'rgba(255, 255, 255, 0.05)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.12)',
  cardBackground: 'rgba(18, 26, 42, 0.45)',

  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderFocus: '#00F0FF',

  textPrimary: '#FFFFFF',       // Blanco puro nítido
  textSecondary: '#94A3B8',     // Pizarra luminoso
  textMuted: '#64748B',         // Gris atenuado visible
  textInverse: '#0D1117',

  // Acentos Vivos de Cristal Neón
  primary: '#00F0FF',           // Cian Eléctrico Luminous
  primaryHover: '#38BDF8',
  primaryLight: 'rgba(0, 240, 255, 0.12)',
  primaryBorder: 'rgba(0, 240, 255, 0.35)',
  primaryText: '#00F0FF',

  success: '#00E599',           // Verde Menta Neón
  successLight: 'rgba(0, 229, 153, 0.12)',
  successBorder: 'rgba(0, 229, 153, 0.35)',
  successText: '#00E599',

  warning: '#FBBF24',           // Ámbar Topacio
  warningLight: 'rgba(251, 191, 36, 0.12)',
  warningBorder: 'rgba(251, 191, 36, 0.35)',
  warningText: '#FBBF24',

  danger: '#F43F5E',            // Coral Neón
  dangerLight: 'rgba(244, 63, 94, 0.14)',
  dangerBorder: 'rgba(244, 63, 94, 0.35)',
  dangerText: '#FB7185',

  purple: '#A855F7',            // Magenta / Púrpura Eléctrico
  purpleLight: 'rgba(168, 85, 247, 0.14)',
  purpleBorder: 'rgba(168, 85, 247, 0.35)',

  teal: '#00F0FF',
  tealLight: 'rgba(0, 240, 255, 0.12)',
  tealBorder: 'rgba(0, 240, 255, 0.35)',
  tealText: '#00F0FF',

  coral: '#F43F5E',
  coralLight: 'rgba(244, 63, 94, 0.14)',
  coralBorder: 'rgba(244, 63, 94, 0.35)',
  coralText: '#FB7185',

  neonGreen: '#00E599',
  neonCyan: '#00F0FF',
  neonCoral: '#F43F5E',
  neonAmber: '#FBBF24',
  neonPurple: '#A855F7',

  blurTint: 'dark',
  glassBackground: 'rgba(18, 26, 42, 0.45)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
};

export const LaserGradients = {
  dark: {
    cyan: ['rgba(0, 240, 255, 0.25)', 'transparent'] as const,
    lime: ['rgba(0, 229, 153, 0.25)', 'transparent'] as const,
    coral: ['rgba(244, 63, 94, 0.25)', 'transparent'] as const,
    amber: ['rgba(251, 191, 36, 0.25)', 'transparent'] as const,
    purple: ['rgba(168, 85, 247, 0.25)', 'transparent'] as const,
    subtle: ['rgba(255, 255, 255, 0.05)', 'transparent'] as const,
  },
  light: {
    cyan: ['rgba(2, 132, 199, 0.18)', 'transparent'] as const,
    lime: ['rgba(16, 185, 129, 0.18)', 'transparent'] as const,
    coral: ['rgba(244, 63, 94, 0.18)', 'transparent'] as const,
    amber: ['rgba(245, 158, 11, 0.18)', 'transparent'] as const,
    purple: ['rgba(139, 92, 246, 0.18)', 'transparent'] as const,
    subtle: ['rgba(0, 0, 0, 0.03)', 'transparent'] as const,
  },
};

// Objeto Colors por defecto
export const Colors = LightPalette;

export const createNeonGlow = (color: string, intensity: 'low' | 'medium' | 'high' = 'medium') => {
  const radius = intensity === 'high' ? 14 : intensity === 'medium' ? 8 : 4;
  const opacity = intensity === 'high' ? 0.35 : intensity === 'medium' ? 0.22 : 0.12;
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: intensity === 'high' ? 5 : 2,
  };
};

export const Shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHover: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const GlassShadows = {
  dark: {
    web: '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 0 rgba(0, 0, 0, 0.20)',
    insetWeb: 'inset 0 2px 6px 0 rgba(0, 0, 0, 0.45), inset 0 -1px 0 0 rgba(255, 255, 255, 0.06)',
    native: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  light: {
    web: '0 8px 32px 0 rgba(31, 38, 135, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.02)',
    insetWeb: 'inset 0 2px 4px 0 rgba(15, 23, 42, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.85)',
    native: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
  },
};

// Aliases para retrocompatibilidad
export const NeumorphicShadows = GlassShadows;

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
};

export const FormatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
