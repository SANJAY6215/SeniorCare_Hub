import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useUserStore } from '@/stores/userStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    const isLoginPage = segments[0] === 'login';

    if (!session && !isLoginPage) {
      // Redirect to the login page if not logged in
      router.replace('/login');
    } else if (session && isLoginPage) {
      // Redirect away from login if logged in
      router.replace('/(tabs)');
    }
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

