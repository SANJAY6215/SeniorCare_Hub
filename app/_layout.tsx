import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';

// Suppress repetitive web-only warnings in the development overlay
LogBox.ignoreLogs(['onStartShouldSetResponder', 'Unknown event handler property']);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/stores/userStore';

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

  useEffect(() => {
    initialize();
    
    // Request notification permissions
    const registerForPushNotifications = async () => {
      if (Platform.OS === 'web') return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '87b4c93a-5031-4b24-a15f-d1576d68a365',
          });
          useUserStore.getState().updateProfile({ expo_push_token: tokenData.data });
        } catch (e) {
          console.log('Failed to fetch push token:', e);
        }
      }
    };
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    if (loading) return;

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
  }, [session, loading, segments]);


  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <>
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
    </>
  );
}

