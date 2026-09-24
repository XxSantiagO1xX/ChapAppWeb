import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const darkBgImage = require('../assets/backgrounds/dark_bg.jpg');
const lightBgImage = require('../assets/backgrounds/light_bg.jpg');

export const AmbientBackground: React.FC = () => {
  const { isDark } = useTheme();
  const bgSource = isDark ? darkBgImage : lightBgImage;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. Capa de Arte 3D en Alta Definición y Máxima Nitidez Nativa */}
      <Image
        source={bgSource}
        style={[
          styles.backgroundImage,
          {
            opacity: isDark ? 0.95 : 0.98,
            ...(Platform.OS === 'web'
              ? ({
                  imageRendering: '-webkit-optimize-contrast',
                } as any)
              : {}),
          },
        ]}
        resizeMode="cover"
      />

      {/* 2. Capa de Tinte Translúcido Sutil para Legibilidad y Contraste */}
      <View
        style={[
          styles.tintOverlay,
          {
            backgroundColor: isDark ? 'rgba(13, 17, 23, 0.25)' : 'rgba(248, 250, 252, 0.12)',
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
