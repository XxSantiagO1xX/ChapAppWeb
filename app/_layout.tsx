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
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.documentElement.style.zoom = '90%';
      } catch (e) {
        // Fallback silencioso si no está soportado
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
