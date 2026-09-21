import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getAllEvents } from '../../services/database';
import { Colors } from '../../constants/theme';

export default function EventIndexScreen() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const events = await getAllEvents();
        const activeEvent = events.find((e) => !e.isArchived) || events[0];
        if (activeEvent) {
          router.replace(`/event/${activeEvent.id}`);
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    }
    redirect();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
