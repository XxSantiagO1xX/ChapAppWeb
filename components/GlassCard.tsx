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
import { Radii, NeumorphicShadows } from '../constants/theme';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: 'default' | 'cyan' | 'lime' | 'coral' | 'amber' | 'purple' | 'subtle';
  intensity?: number;
  glow?: boolean;
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
  onPress,
  activeOpacity = 0.85,
  borderRadius = Radii.lg,
  borderWidth = 1,
}) => {
  const { isDark, colors } = useTheme();

  // Subtle border accent if specific variant is requested
  let borderColor = colors.border;
  let glowColor = colors.primary;

  if (variant === 'cyan') {
    borderColor = isDark ? 'rgba(0, 229, 255, 0.25)' : 'rgba(2, 132, 199, 0.25)';
    glowColor = colors.neonCyan;
  } else if (variant === 'lime') {
    borderColor = isDark ? 'rgba(0, 230, 118, 0.25)' : 'rgba(22, 163, 74, 0.25)';
    glowColor = colors.neonGreen;
  } else if (variant === 'coral') {
    borderColor = isDark ? 'rgba(255, 23, 68, 0.25)' : 'rgba(225, 29, 72, 0.25)';
    glowColor = colors.neonCoral;
  } else if (variant === 'amber') {
    borderColor = isDark ? 'rgba(255, 171, 0, 0.25)' : 'rgba(217, 119, 6, 0.25)';
    glowColor = colors.neonAmber;
  } else if (variant === 'purple') {
    borderColor = isDark ? 'rgba(213, 0, 249, 0.25)' : 'rgba(124, 58, 237, 0.25)';
    glowColor = colors.neonPurple;
  }

  const neumorphic = isDark ? NeumorphicShadows.dark : NeumorphicShadows.light;

  let cardContent: React.ReactNode;

  if (Platform.OS === 'web') {
    const webBoxShadow = glow
      ? `0 0 16px ${glowColor}${isDark ? '40' : '20'}, ${neumorphic.web}`
      : neumorphic.web;

    const webCardStyle: any = {
      boxShadow: webBoxShadow,
      borderRadius,
      backgroundColor: colors.surface,
      borderColor,
      borderWidth,
    };

    cardContent = (
      <View style={[styles.cardBase, webCardStyle, style]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    );
  } else {
    // Native (iPadOS / iOS / Android): Dual shadow stack for authentic Neumorphism
    cardContent = (
      <View
        style={[
          styles.nativeShadowOuter,
          neumorphic.topLight,
          { borderRadius },
          style,
        ]}
      >
        <View
          style={[
            styles.nativeShadowInner,
            neumorphic.bottomDark,
            {
              borderRadius,
              backgroundColor: colors.surface,
              borderColor,
              borderWidth,
            },
          ]}
        >
          <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
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
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  nativeShadowOuter: {
    overflow: 'visible',
    alignSelf: 'stretch',
  },
  nativeShadowInner: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    alignSelf: 'stretch',
  },
});
