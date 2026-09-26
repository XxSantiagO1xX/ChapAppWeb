import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const darkBgImage = require('../assets/backgrounds/dark_bg.jpg');
const lightBgImage = require('../assets/backgrounds/light_bg.jpg');

export const AmbientBackground: React.FC = () => {
  const { isDark } = useTheme();
  const bgSource = isDark ? darkBgImage : lightBgImage;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
        },
      ]}
      pointerEvents="none"
    >
      {/* 1. Capa de Arte 3D en Ultra Alta Definición (Liquid Glass Petals) */}
      <Image
        source={bgSource}
        style={[
          styles.backgroundImage,
          {
            opacity: 1,
            ...(Platform.OS === 'web'
              ? ({
                  imageRendering: '-webkit-optimize-contrast',
                  objectFit: 'contain',
                  objectPosition: 'center',
                } as any)
              : {}),
          },
        ]}
        resizeMode="contain"
      />

      {/* 2. Capa de Tinte Sutil para Legibilidad y Profundidad */}
      <View
        style={[
          styles.tintOverlay,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});
