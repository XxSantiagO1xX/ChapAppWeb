import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isMobile: boolean;          // < 768px (Smartphones)
  isTablet: boolean;          // >= 768px && < 1100px (iPads / Tablets)
  isDesktop: boolean;         // >= 1100px (Laptops / Desktops)
  isTabletOrDesktop: boolean; // >= 768px
  columns: number;            // 1 (mobile), 2 (tablet), 3 (desktop)
  modalMaxWidth: number;      // Ancho máximo ergonómico para diálogos
  contentMaxWidth: number;    // Ancho máximo del contenedor principal
  insets: { top: number; bottom: number; left: number; right: number };
}

/**
 * Hook centralizado para diseño responsivo y adaptativo en 3 niveles (Móvil, Tablet y Desktop).
 */
export const useResponsiveLayout = (): ResponsiveLayout => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;
  const isTabletOrDesktop = width >= 768;

  const columns = isMobile ? 1 : isTablet ? 2 : 3;
  const modalMaxWidth = isMobile ? width : Math.min(width * 0.92, isTablet ? 680 : 760);
  const contentMaxWidth = 1320;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isTabletOrDesktop,
    columns,
    modalMaxWidth,
    contentMaxWidth,
    insets,
  };
};
