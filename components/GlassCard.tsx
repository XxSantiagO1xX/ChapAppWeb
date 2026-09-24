import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Radii, GlassShadows } from '../constants/theme';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'cyan' | 'lime' | 'coral' | 'amber' | 'purple' | 'subtle';
  intensity?: number;
  glow?: boolean;
  /** Modo esmerilado denso y opalescente con alta opacidad (especial para Ticket POS) */
  frosted?: boolean;
  onPress?: () => void;
  activeOpacity?: number;
  borderRadius?: number;
  borderWidth?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  variant = 'default',
  glow = false,
  frosted = false,
  onPress,
  activeOpacity = 0.85,
  borderRadius = Radii.lg,
  borderWidth = 1,
}) => {
  const { isDark, colors } = useTheme();

  // Variables de color, bisel y capas
  let borderColor = colors.border;
  let borderTopColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.95)';
  let borderBottomColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.65)';
  let borderSideColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.65)';
  let surfaceColor = isDark ? 'rgba(16, 23, 36, 0.68)' : 'rgba(255, 255, 255, 0.72)';
  let glowColor = colors.primary;
  let specularShineColor = isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.90)';

  if (frosted) {
    // =========================================================================
    // MODO ESMERILADO DENSO (EXCLUSIVO PARA TICKET DE CUENTA POS)
    // Conserva 100% su acabado acrílico opalino denso y sus colores semánticos
    // =========================================================================
    borderTopColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.95)';
    borderBottomColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.85)';
    borderSideColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.85)';
    surfaceColor = isDark ? 'rgba(19, 25, 36, 0.85)' : 'rgba(255, 255, 255, 0.88)';
    specularShineColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.95)';

    if (variant === 'cyan') {
      surfaceColor = isDark ? 'rgba(10, 28, 44, 0.85)' : 'rgba(240, 249, 255, 0.90)';
      borderTopColor = isDark ? 'rgba(0, 240, 255, 0.50)' : 'rgba(2, 132, 199, 0.45)';
      borderBottomColor = isDark ? 'rgba(0, 240, 255, 0.12)' : 'rgba(2, 132, 199, 0.20)';
      borderSideColor = isDark ? 'rgba(0, 240, 255, 0.25)' : 'rgba(2, 132, 199, 0.28)';
      borderColor = isDark ? 'rgba(0, 240, 255, 0.25)' : 'rgba(2, 132, 199, 0.28)';
      glowColor = colors.neonCyan;
      specularShineColor = isDark ? 'rgba(0, 240, 255, 0.40)' : 'rgba(2, 132, 199, 0.35)';
    } else if (variant === 'lime') {
      surfaceColor = isDark ? 'rgba(10, 32, 24, 0.85)' : 'rgba(240, 253, 244, 0.90)';
      borderTopColor = isDark ? 'rgba(0, 229, 153, 0.50)' : 'rgba(16, 185, 129, 0.45)';
      borderBottomColor = isDark ? 'rgba(0, 229, 153, 0.12)' : 'rgba(16, 185, 129, 0.20)';
      borderSideColor = isDark ? 'rgba(0, 229, 153, 0.25)' : 'rgba(16, 185, 129, 0.28)';
      borderColor = isDark ? 'rgba(0, 229, 153, 0.25)' : 'rgba(16, 185, 129, 0.28)';
      glowColor = colors.neonGreen;
      specularShineColor = isDark ? 'rgba(0, 229, 153, 0.40)' : 'rgba(16, 185, 129, 0.35)';
    } else if (variant === 'coral') {
      surfaceColor = isDark ? 'rgba(35, 16, 24, 0.85)' : 'rgba(255, 241, 242, 0.90)';
      borderTopColor = isDark ? 'rgba(244, 63, 94, 0.50)' : 'rgba(244, 63, 94, 0.45)';
      borderBottomColor = isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.20)';
      borderSideColor = isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.28)';
      borderColor = isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.28)';
      glowColor = colors.neonCoral;
      specularShineColor = isDark ? 'rgba(244, 63, 94, 0.40)' : 'rgba(244, 63, 94, 0.35)';
    } else if (variant === 'amber') {
      surfaceColor = isDark ? 'rgba(35, 26, 10, 0.85)' : 'rgba(254, 249, 235, 0.90)';
      borderTopColor = isDark ? 'rgba(251, 191, 36, 0.50)' : 'rgba(245, 158, 11, 0.45)';
      borderBottomColor = isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(245, 158, 11, 0.20)';
      borderSideColor = isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.28)';
      borderColor = isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.28)';
      glowColor = colors.neonAmber;
      specularShineColor = isDark ? 'rgba(251, 191, 36, 0.40)' : 'rgba(245, 158, 11, 0.35)';
    } else if (variant === 'purple') {
      surfaceColor = isDark ? 'rgba(26, 15, 38, 0.85)' : 'rgba(250, 245, 255, 0.90)';
      borderTopColor = isDark ? 'rgba(168, 85, 247, 0.50)' : 'rgba(139, 92, 246, 0.45)';
      borderBottomColor = isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(139, 92, 246, 0.20)';
      borderSideColor = isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(139, 92, 246, 0.28)';
      borderColor = isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(139, 92, 246, 0.28)';
      glowColor = colors.neonPurple;
      specularShineColor = isDark ? 'rgba(168, 85, 247, 0.40)' : 'rgba(139, 92, 246, 0.35)';
    } else if (variant === 'subtle') {
      surfaceColor = isDark ? 'rgba(13, 17, 23, 0.78)' : 'rgba(255, 255, 255, 0.86)';
      borderColor = colors.border;
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)';
      borderBottomColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(226, 232, 240, 0.80)';
      borderSideColor = colors.border;
    }
  } else {
    // =========================================================================
    // MODO ESTÁNDAR (AUTÉNTICO GLASSMORPHISM TRASLÚCIDO EN TEMA CLARO Y OSCURO)
    // Permite que el arte 3D del fondo se trasluzca con refracción y bisel de luz
    // =========================================================================
    if (variant === 'cyan') {
      surfaceColor = isDark ? 'rgba(8, 26, 40, 0.70)' : 'rgba(240, 249, 255, 0.72)';
      borderTopColor = isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(2, 132, 199, 0.40)';
      borderBottomColor = isDark ? 'rgba(0, 240, 255, 0.10)' : 'rgba(2, 132, 199, 0.18)';
      borderSideColor = isDark ? 'rgba(0, 240, 255, 0.20)' : 'rgba(2, 132, 199, 0.22)';
      borderColor = isDark ? 'rgba(0, 240, 255, 0.20)' : 'rgba(2, 132, 199, 0.22)';
      glowColor = colors.neonCyan;
      specularShineColor = isDark ? 'rgba(0, 240, 255, 0.35)' : 'rgba(2, 132, 199, 0.30)';
    } else if (variant === 'lime') {
      surfaceColor = isDark ? 'rgba(8, 30, 20, 0.70)' : 'rgba(240, 253, 244, 0.72)';
      borderTopColor = isDark ? 'rgba(0, 229, 153, 0.45)' : 'rgba(16, 185, 129, 0.40)';
      borderBottomColor = isDark ? 'rgba(0, 229, 153, 0.10)' : 'rgba(16, 185, 129, 0.18)';
      borderSideColor = isDark ? 'rgba(0, 229, 153, 0.20)' : 'rgba(16, 185, 129, 0.22)';
      borderColor = isDark ? 'rgba(0, 229, 153, 0.20)' : 'rgba(16, 185, 129, 0.22)';
      glowColor = colors.neonGreen;
      specularShineColor = isDark ? 'rgba(0, 229, 153, 0.35)' : 'rgba(16, 185, 129, 0.30)';
    } else if (variant === 'coral') {
      surfaceColor = isDark ? 'rgba(32, 14, 22, 0.70)' : 'rgba(255, 241, 242, 0.72)';
      borderTopColor = isDark ? 'rgba(244, 63, 94, 0.45)' : 'rgba(244, 63, 94, 0.40)';
      borderBottomColor = isDark ? 'rgba(244, 63, 94, 0.10)' : 'rgba(244, 63, 94, 0.18)';
      borderSideColor = isDark ? 'rgba(244, 63, 94, 0.20)' : 'rgba(244, 63, 94, 0.22)';
      borderColor = isDark ? 'rgba(244, 63, 94, 0.20)' : 'rgba(244, 63, 94, 0.22)';
      glowColor = colors.neonCoral;
      specularShineColor = isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.30)';
    } else if (variant === 'amber') {
      surfaceColor = isDark ? 'rgba(30, 22, 10, 0.70)' : 'rgba(254, 249, 235, 0.72)';
      borderTopColor = isDark ? 'rgba(251, 191, 36, 0.45)' : 'rgba(245, 158, 11, 0.40)';
      borderBottomColor = isDark ? 'rgba(251, 191, 36, 0.10)' : 'rgba(245, 158, 11, 0.18)';
      borderSideColor = isDark ? 'rgba(251, 191, 36, 0.20)' : 'rgba(245, 158, 11, 0.22)';
      borderColor = isDark ? 'rgba(251, 191, 36, 0.20)' : 'rgba(245, 158, 11, 0.22)';
      glowColor = colors.neonAmber;
      specularShineColor = isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(245, 158, 11, 0.30)';
    } else if (variant === 'purple') {
      surfaceColor = isDark ? 'rgba(24, 14, 36, 0.70)' : 'rgba(250, 245, 255, 0.72)';
      borderTopColor = isDark ? 'rgba(168, 85, 247, 0.45)' : 'rgba(139, 92, 246, 0.40)';
      borderBottomColor = isDark ? 'rgba(168, 85, 247, 0.10)' : 'rgba(139, 92, 246, 0.18)';
      borderSideColor = isDark ? 'rgba(168, 85, 247, 0.20)' : 'rgba(139, 92, 246, 0.22)';
      borderColor = isDark ? 'rgba(168, 85, 247, 0.20)' : 'rgba(139, 92, 246, 0.22)';
      glowColor = colors.neonPurple;
      specularShineColor = isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(139, 92, 246, 0.30)';
    } else if (variant === 'subtle') {
      surfaceColor = isDark ? 'rgba(13, 17, 23, 0.55)' : 'rgba(241, 245, 249, 0.60)';
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.85)';
      borderBottomColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(226, 232, 240, 0.50)';
      borderSideColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(226, 232, 240, 0.50)';
      borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(226, 232, 240, 0.60)';
    } else {
      // default: Superficie cristalina pura con refracción y bisel superior
      surfaceColor = isDark ? 'rgba(16, 23, 36, 0.68)' : 'rgba(255, 255, 255, 0.72)';
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.95)';
      borderBottomColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(226, 232, 240, 0.65)';
      borderSideColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.65)';
      borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.65)';
      specularShineColor = isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(255, 255, 255, 0.90)';
    }
  }

  const glassShadow = isDark ? GlassShadows.dark : GlassShadows.light;

  let cardContent: React.ReactNode;

  if (Platform.OS === 'web') {
    const webBoxShadow = glow
      ? `0 0 24px ${glowColor}${isDark ? '45' : '20'}, ${glassShadow.web}`
      : glassShadow.web;

    const blurValue = frosted ? 'blur(32px) saturate(190%)' : 'blur(20px) saturate(180%)';

    const webCardStyle: any = {
      backdropFilter: blurValue,
      WebkitBackdropFilter: blurValue,
      backgroundColor: surfaceColor,
      borderWidth,
      borderTopColor,
      borderBottomColor,
      borderLeftColor: borderSideColor,
      borderRightColor: borderSideColor,
      borderRadius,
      boxShadow: webBoxShadow,
    };

    cardContent = (
      <View style={[styles.cardBase, webCardStyle, style]}>
        {/* Línea de Brillo Especular Cenital */}
        <View
          pointerEvents="none"
          style={[
            styles.specularTopLine,
            {
              backgroundColor: specularShineColor,
            },
          ]}
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    );
  } else {
    // Native (iPadOS / iOS / Android): Translucent glass surface with native shadow & specular edge
    cardContent = (
      <View
        style={[
          styles.nativeCard,
          glassShadow.native,
          {
            borderRadius,
            backgroundColor: surfaceColor,
            borderWidth,
            borderTopColor,
            borderBottomColor,
            borderLeftColor: borderSideColor,
            borderRightColor: borderSideColor,
          },
          style,
        ]}
      >
        {/* Línea de Brillo Especular Cenital */}
        <View
          pointerEvents="none"
          style={[
            styles.specularTopLine,
            {
              backgroundColor: specularShineColor,
            },
          ]}
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={styles.touchableWrapper}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <>{cardContent}</>;
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '100%',
    alignSelf: 'stretch',
  },
  cardBase: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  nativeCard: {
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  specularTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
    opacity: 0.85,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    alignSelf: 'stretch',
  },
});
