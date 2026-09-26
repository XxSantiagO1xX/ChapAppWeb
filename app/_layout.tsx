import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useSyncEngine } from '../services/syncEngine';

import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AmbientBackground } from '../components/AmbientBackground';

function AppNavigation() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AmbientBackground />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="event/index" />
        <Stack.Screen name="event/[id]" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  // Carga de fuentes modernas Inter con control de error y fallback
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Escala compacta global (~90%) en entorno Web para mayor densidad y vista panorámica
  // Y modo pantalla completa automático exclusivo para dispositivos iPad
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        document.documentElement.style.zoom = '90%';
      } catch (e) {
        // Fallback silencioso si no está soportado
      }

      // Detección exclusiva de iPad (iPadOS Safari y navegadores en iPad)
      const ua = navigator.userAgent || '';
      const isIPadUA = /iPad/i.test(ua);
      const isMacTouch = /Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
      const isIPadDevice = isIPadUA || Boolean(isMacTouch);

      if (isIPadDevice) {
        // Inyección de meta-etiquetas de pantalla completa para iPadOS Web App
        const setMetaTag = (name: string, content: string) => {
          if (!document.querySelector(`meta[name="${name}"]`)) {
            const meta = document.createElement('meta');
            meta.name = name;
            meta.content = content;
            document.head.appendChild(meta);
          }
        };

        setMetaTag('apple-mobile-web-app-capable', 'yes');
        setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
        setMetaTag('apple-touch-fullscreen', 'yes');
        setMetaTag('mobile-web-app-capable', 'yes');

        // Activación de Fullscreen al primer toque en iPad
        const handleFirstIPadTouch = () => {
          const docEl: any = document.documentElement;
          if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
            const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
            if (req) {
              req.call(docEl).catch(() => {
                // Silencioso si la política del navegador de iPad lo restringe
              });
            }
          }
          window.removeEventListener('touchstart', handleFirstIPadTouch);
          window.removeEventListener('click', handleFirstIPadTouch);
        };

        window.addEventListener('touchstart', handleFirstIPadTouch, { once: true });
        window.addEventListener('click', handleFirstIPadTouch, { once: true });
      }
    }
  }, []);

  // Motor de sincronización en segundo plano con monitoreo reactivo de red
  useSyncEngine();

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
