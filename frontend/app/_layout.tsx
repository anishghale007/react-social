import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const { user, isHydrated, hydrate } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in, trying to access main app -> kick to logina
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in, but sitting on an auth screen -> send to home
      router.replace('/');
    }
  }, [user, isHydrated, segments]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
