import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';

// Suppress repetitive web-only warnings in the development overlay
LogBox.ignoreLogs(['onStartShouldSetResponder', 'Unknown event handler property']);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores/userStore';
import GlobalErrorBoundary from '@/components/shared/GlobalErrorBoundary';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Suppress specific harmless web warnings that trigger the LogBox overlay
if (Platform.OS === 'web') {
  // Use both console.error and console.warn suppression
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const filter = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('onStartShouldSetResponder')) return true;
    if (msg.includes('Unknown event handler property')) return true;
    return false;
  };

  console.error = (...args: any[]) => {
    if (filter(...args)) return;
    originalError(...args);
  };
  console.warn = (...args: any[]) => {
    if (filter(...args)) return;
    originalWarn(...args);
  };
}

export default function RootLayout() {
  const { profile, session, loading, initialize } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasMounted, setHasMounted] = React.useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // The userStore handles the initial setup and auth listener.
    // Push token registration is securely handled inside userStore.initialize()
    // once a valid Supabase session is established.
    initialize();
    useUserStore.getState().setupAuthListener();
  }, []);

  useEffect(() => {
    if (!hasMounted || loading) return;

    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem('onboarding_complete');
      const isLoginPage = segments[0] === 'login';
      const isOnboardingPage = segments[0] === 'onboarding';

      if (!seen && !isOnboardingPage) {
        // 1. MUST do onboarding first, regardless of session
        router.replace('/onboarding');
      } else if (!session && !isLoginPage && !isOnboardingPage && seen) {
        // 2. If onboarding seen but no session, go to login
        router.replace('/login');
      } else if (session && seen && (isLoginPage || isOnboardingPage)) {
        // 3. Only go to tabs if logged in AND onboarding seen
        router.replace('/(tabs)');
      }
    };
    checkOnboarding();
  }, [hasMounted, session, loading, segments]);


  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <StatusBar style={profile?.darkMode ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen
          name="modal/medication-reminder"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}

