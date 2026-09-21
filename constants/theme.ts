/**
 * Paletas de diseño y tokens de tema para ChapApp.
 * Soporta Modo Claro (Acrylic Frost / Naturaleza) y Modo Oscuro (Sci-Fi HUD / Cabaña Nocturna con Acentos Neón).
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  mode: ThemeMode;
  // Fondos y Superficies
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHighlight: string;
  cardBackground: string;

  // Bordes
  border: string;
  borderLight: string;
  borderFocus: string;

  // Tipografía
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Acentos y Marca (Verde Pino / Azul Profundo en Claro, Cian / Verde Neón en Oscuro)
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

  // Neón específico para Modo Oscuro
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
  background: '#EBECF0',        // Base Neumórfico Claro
  surface: '#EBECF0',           // Superficie Neumórfica
  surfaceSubtle: '#E2E4E9',     // Inset / Sunken
  surfaceHighlight: '#D8DBE2',  // Resaltado
  cardBackground: '#EBECF0',

  border: 'rgba(0, 0, 0, 0.05)',
  borderLight: 'rgba(0, 0, 0, 0.02)',
  borderFocus: '#15803D',

  textPrimary: '#1E2024',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  primary: '#15803D',
  primaryHover: '#166534',
  primaryLight: 'rgba(21, 128, 61, 0.12)',
  primaryBorder: 'rgba(21, 128, 61, 0.3)',
  primaryText: '#15803D',

  success: '#16A34A',
  successLight: 'rgba(22, 163, 74, 0.12)',
  successBorder: 'rgba(22, 163, 74, 0.3)',
  successText: '#16A34A',

  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.12)',
  warningBorder: 'rgba(217, 119, 6, 0.3)',
  warningText: '#D97706',

  danger: '#DC2626',
  dangerLight: 'rgba(220, 38, 38, 0.12)',
  dangerBorder: 'rgba(220, 38, 38, 0.3)',
  dangerText: '#DC2626',

  purple: '#7C3AED',
  purpleLight: 'rgba(124, 58, 237, 0.12)',
  purpleBorder: 'rgba(124, 58, 237, 0.3)',

  teal: '#0F766E',
  tealLight: 'rgba(15, 118, 110, 0.12)',
  tealBorder: 'rgba(15, 118, 110, 0.3)',
  tealText: '#0F766E',

  coral: '#E11D48',
  coralLight: 'rgba(225, 29, 72, 0.12)',
  coralBorder: 'rgba(225, 29, 72, 0.3)',
  coralText: '#E11D48',

  neonGreen: '#16A34A',
  neonCyan: '#0284C7',
  neonCoral: '#E11D48',
  neonAmber: '#D97706',
  neonPurple: '#7C3AED',

  blurTint: 'light',
  glassBackground: '#EBECF0',
  glassBorder: 'transparent',
};

export const DarkPalette: ThemePalette = {
  mode: 'dark',
  background: '#22242A',        // Gris oscuro mate exacto
  surface: '#22242A',           // 100% sólido mate
  surfaceSubtle: '#1A1C22',     // Inset / Sunken / Canal esculpido
  surfaceHighlight: '#2A2C34',  // Relieve suave
  cardBackground: '#22242A',

  border: 'rgba(255, 255, 255, 0.04)',
  borderLight: 'rgba(255, 255, 255, 0.02)',
  borderFocus: '#00E5FF',

  textPrimary: '#E4E6EB',       // Gris muy claro de alto contraste
  textSecondary: '#8A8D93',     // Gris medio para etiquetas
  textMuted: '#60646C',         // Gris apagado
  textInverse: '#22242A',

  // Acentos Vivos Neumórficos
  primary: '#00E5FF',           // Cian Eléctrico
  primaryHover: '#00B8D4',
  primaryLight: 'rgba(0, 229, 255, 0.12)',
  primaryBorder: 'rgba(0, 229, 255, 0.35)',
  primaryText: '#00E5FF',

  success: '#00E676',           // Verde Neón
  successLight: 'rgba(0, 230, 118, 0.12)',
  successBorder: 'rgba(0, 230, 118, 0.35)',
  successText: '#00E676',

  warning: '#FFAB00',           // Ámbar Intenso
  warningLight: 'rgba(255, 171, 0, 0.12)',
  warningBorder: 'rgba(255, 171, 0, 0.35)',
  warningText: '#FFAB00',

  danger: '#FF1744',            // Coral / Magenta Eléctrico
  dangerLight: 'rgba(255, 23, 68, 0.14)',
  dangerBorder: 'rgba(255, 23, 68, 0.35)',
  dangerText: '#FF1744',

  purple: '#D500F9',            // Púrpura Eléctrico
  purpleLight: 'rgba(213, 0, 249, 0.12)',
  purpleBorder: 'rgba(213, 0, 249, 0.35)',

  teal: '#00E5FF',
  tealLight: 'rgba(0, 229, 255, 0.12)',
  tealBorder: 'rgba(0, 229, 255, 0.35)',
  tealText: '#00E5FF',

  coral: '#FF1744',
  coralLight: 'rgba(255, 23, 68, 0.14)',
  coralBorder: 'rgba(255, 23, 68, 0.35)',
  coralText: '#FF1744',

  neonGreen: '#00E676',
  neonCyan: '#00E5FF',
  neonCoral: '#FF1744',
  neonAmber: '#FFAB00',
  neonPurple: '#D500F9',

  blurTint: 'dark',
  glassBackground: '#22242A',   // 100% Sólido sin transparencias
  glassBorder: 'transparent',
};

export const LaserGradients = {
  dark: {
    cyan: ['rgba(0, 229, 255, 0.25)', 'transparent'] as const,
    lime: ['rgba(0, 230, 118, 0.25)', 'transparent'] as const,
    coral: ['rgba(255, 23, 68, 0.25)', 'transparent'] as const,
    amber: ['rgba(255, 171, 0, 0.25)', 'transparent'] as const,
    purple: ['rgba(213, 0, 249, 0.25)', 'transparent'] as const,
    subtle: ['rgba(255, 255, 255, 0.05)', 'transparent'] as const,
  },
  light: {
    cyan: ['rgba(2, 132, 199, 0.2)', 'transparent'] as const,
    lime: ['rgba(22, 163, 74, 0.2)', 'transparent'] as const,
    coral: ['rgba(225, 29, 72, 0.2)', 'transparent'] as const,
    amber: ['rgba(217, 119, 6, 0.2)', 'transparent'] as const,
    purple: ['rgba(124, 58, 237, 0.2)', 'transparent'] as const,
    subtle: ['rgba(0, 0, 0, 0.04)', 'transparent'] as const,
  },
};

// Objeto Colors por defecto
export const Colors = LightPalette;

export const createNeonGlow = (color: string, intensity: 'low' | 'medium' | 'high' = 'medium') => {
  const radius = intensity === 'high' ? 12 : intensity === 'medium' ? 8 : 4;
  const opacity = intensity === 'high' ? 0.35 : intensity === 'medium' ? 0.25 : 0.15;
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
    shadowColor: '#A6ABBD',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const NeumorphicShadows = {
  dark: {
    // Web dual box shadow (light top-left, deep dark bottom-right)
    web: '-6px -6px 14px rgba(255, 255, 255, 0.035), 6px 6px 14px rgba(0, 0, 0, 0.45)',
    insetWeb: 'inset 3px 3px 6px rgba(0, 0, 0, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.03)',
    // Native shadow dual stack
    topLight: {
      shadowColor: 'rgba(255, 255, 255, 0.06)',
      shadowOffset: { width: -4, height: -4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
    },
    bottomDark: {
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  light: {
    // Web dual box shadow (white light top-left, soft shadow bottom-right)
    web: '-6px -6px 14px #FFFFFF, 6px 6px 14px rgba(166, 171, 189, 0.65)',
    insetWeb: 'inset 3px 3px 6px rgba(166, 171, 189, 0.6), inset -3px -3px 6px #FFFFFF',
    // Native shadow dual stack
    topLight: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: -4, height: -4 },
      shadowOpacity: 0.9,
      shadowRadius: 8,
    },
    bottomDark: {
      shadowColor: '#A6ABBD',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

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

