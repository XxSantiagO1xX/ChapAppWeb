import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ThemeMode,
  ThemePalette,
  LightPalette,
  DarkPalette,
  createNeonGlow,
  Shadows,
  getLiquidGlassStyle,
  LiquidGlassVariant,
} from '../constants/theme';

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemePalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  getNeonGlow: (color: string, intensity?: 'low' | 'medium' | 'high') => any;
  getLiquidGlass: (variant?: LiquidGlassVariant) => any;
  cardShadow: any;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  isDark: false,
  colors: LightPalette,
  toggleTheme: () => {},
  setThemeMode: () => {},
  getNeonGlow: () => ({}),
  getLiquidGlass: () => ({}),
  cardShadow: Shadows.card,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const isDark = themeMode === 'dark';
  const colors = useMemo(() => (isDark ? DarkPalette : LightPalette), [isDark]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const getNeonGlow = (color: string, intensity: 'low' | 'medium' | 'high' = 'medium') => {
    if (!isDark) {
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
      };
    }
    return createNeonGlow(color, intensity);
  };

  const getLiquidGlass = (variant: LiquidGlassVariant = 'card') => {
    return getLiquidGlassStyle(isDark, variant);
  };

  const cardShadow = useMemo(() => {
    return isDark ? Shadows.cardDark : Shadows.card;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      toggleTheme,
      setThemeMode,
      getNeonGlow,
      getLiquidGlass,
      cardShadow,
    }),
    [themeMode, isDark, colors, cardShadow]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
