import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
} from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Radii } from '../constants/theme';

export type IconName =
  | 'chart'
  | 'trending-up'
  | 'users'
  | 'family'
  | 'receipt'
  | 'wallet'
  | 'money'
  | 'search'
  | 'trash'
  | 'calendar'
  | 'archive'
  | 'unarchive'
  | 'share'
  | 'check'
  | 'check-circle'
  | 'plus'
  | 'sun'
  | 'moon'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'arrow-left'
  | 'refresh'
  | 'close'
  | 'cut'
  | 'home'
  | 'food'
  | 'user'
  | 'child'
  | 'clock'
  | 'bank'
  | 'cart'
  | 'bed'
  | 'car'
  | 'whatsapp'
  | 'print';

export interface SculptedIconProps {
  name: IconName;
  size?: number;
  containerSize?: number;
  color?: string;
  accentColor?: string;
  variant?: 'sunken' | 'flat' | 'raised' | 'glow' | 'plain';
  shape?: 'circle' | 'rounded' | 'square';
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export const SculptedIcon: React.FC<SculptedIconProps> = ({
  name,
  size = 18,
  containerSize = 36,
  color,
  accentColor,
  variant = 'sunken',
  shape = 'rounded',
  style,
  glow = false,
}) => {
  const { colors, isDark } = useTheme();

  // Color del glifo integrado armónicamente con la superficie
  const iconColor = color || (isDark ? colors.textPrimary : colors.textPrimary);
  const glowAccent = accentColor || colors.primary;

  // Renderizar las formas vectoriales SVG de 24x24 estándar
  const renderGlyph = () => {
    switch (name) {
      case 'chart':
        return (
          <>
            <Path d="M3 3v18h18" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18 17V9M13 17V5M8 17v-3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'trending-up':
        return (
          <>
            <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M17 6h6v6" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="9" stroke={iconColor} strokeWidth="2" />
            <Path d="M12 7v5l3 3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
          </>
        );

      case 'bank':
        return (
          <>
            <Path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M14 10v11M12 2 2 7h20L12 2Z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'cart':
        return (
          <>
            <Circle cx="9" cy="21" r="1.5" stroke={iconColor} strokeWidth="2" />
            <Circle cx="20" cy="21" r="1.5" stroke={iconColor} strokeWidth="2" />
            <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'bed':
        return (
          <>
            <Path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'car':
        return (
          <>
            <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
            <Circle cx="7" cy="17" r="2" stroke={iconColor} strokeWidth="2" />
            <Circle cx="17" cy="17" r="2" stroke={iconColor} strokeWidth="2" />
          </>
        );

      case 'whatsapp':
        return (
          <>
            <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'print':
        return (
          <>
            <Path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'users':
      case 'family':
        return (
          <>
            <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="9" cy="7" r="4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'receipt':
        return (
          <>
            <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8 7h8M8 12h8M8 17h4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'wallet':
        return (
          <>
            <Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'money':
        return (
          <>
            <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'search':
        return (
          <>
            <Circle cx="11" cy="11" r="8" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="m21 21-4.3-4.3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'trash':
        return (
          <>
            <Path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'calendar':
        return (
          <>
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M16 2v4M8 2v4M3 10h18" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'archive':
        return (
          <>
            <Rect x="3" y="3" width="18" height="5" rx="1" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'unarchive':
        return (
          <>
            <Path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'share':
        return (
          <>
            <Circle cx="18" cy="5" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="6" cy="12" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="18" cy="19" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'check':
        return (
          <Path d="M20 6 9 17l-5-5" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'check-circle':
        return (
          <>
            <Circle cx="12" cy="12" r="10" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="m9 12 2 2 4-4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'plus':
        return (
          <Path d="M5 12h14M12 5v14" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'sun':
        return (
          <>
            <Circle cx="12" cy="12" r="4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'moon':
        return (
          <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'chevron-down':
        return (
          <Path d="m6 9 6 6 6-6" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'chevron-right':
        return (
          <Path d="m9 18 6-6-6-6" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'chevron-left':
        return (
          <Path d="m15 18-6-6 6-6" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'arrow-left':
        return (
          <Path d="m12 19-7-7 7-7M19 12H5" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'refresh':
        return (
          <>
            <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8 16H3v5" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'close':
        return (
          <Path d="M18 6 6 18M6 6l12 12" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        );

      case 'cut':
        return (
          <>
            <Circle cx="6" cy="6" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="6" cy="18" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'home':
        return (
          <>
            <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M9 22V12h6v10" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'food':
        return (
          <>
            <Path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8ZM6 1v3M10 1v3M14 1v3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'user':
        return (
          <>
            <Circle cx="12" cy="7" r="4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'child':
        return (
          <>
            <Circle cx="12" cy="6" r="3" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M9 12h6M12 9v7M10 21l2-5 2 5" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      default:
        return (
          <Circle cx="12" cy="12" r="8" stroke={iconColor} strokeWidth="2" />
        );
    }
  };

  if (variant === 'plain') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {renderGlyph()}
        </Svg>
      </View>
    );
  }

  const borderRadius =
    shape === 'circle' ? containerSize / 2 : shape === 'square' ? Radii.sm : Radii.md;

  const isSunken = variant === 'sunken';
  const hasGlow = glow || variant === 'glow';

  let webStyle: any = {};
  if (Platform.OS === 'web') {
    let webBoxShadow = isDark
      ? '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
      : '0 2px 8px rgba(44, 38, 32, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)';

    if (hasGlow) {
      webBoxShadow = `${webBoxShadow}, 0 0 14px ${glowAccent}${isDark ? '40' : '25'}`;
    }

    webStyle = {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: webBoxShadow,
    };
  }

  const nativeGlow = hasGlow
    ? {
        shadowColor: glowAccent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isDark ? 0.35 : 0.20,
        shadowRadius: 6,
        elevation: 2,
      }
    : {
        shadowColor: isDark ? '#000000' : '#2C2620',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 4,
        elevation: 1,
      };

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius,
          backgroundColor: isSunken ? colors.surfaceSubtle : colors.surface,
          borderColor: isSunken
            ? isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : colors.border
            : colors.border,
          borderWidth: 1,
          ...(Platform.OS === 'web' ? webStyle : nativeGlow),
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {renderGlyph()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
