import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Vibration,
  Linking,
  Platform,
} from 'react-native';
import * as SMS from 'expo-sms';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Localization from 'expo-localization';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';

// Maps physical country region to native emergency service dial
const getLocalEmergencyNumber = () => {
  const region = Localization.getLocales()[0]?.regionCode || 'US';
  switch (region) {
    case 'GB': return '999';
    case 'AU': return '000';
    case 'NZ': return '111';
    case 'FR': case 'DE': case 'IT': case 'ES': case 'NL': return '112'; // EU Standard
    case 'IN': return '112'; // India standard fallback
    default: return '911'; // NA Standard
  }
};

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

interface SOSButtonProps {
  emergencyContacts: EmergencyContact[];
}

export default function SOSButton({ emergencyContacts }: SOSButtonProps) {
  const { colors } = useTheme();
  const scale = useTextScale();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpac = useRef(new Animated.Value(0.6)).current;
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gentle pulse every 2 seconds
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );
    const ring = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringAnim, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringOpac, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(ringAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpac, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    ring.start();
    return () => { pulse.stop(); ring.stop(); };
  }, []);

  const triggerSOS = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    // Vibration API gracefully handles web fallback inherently on modern browsers
    Vibration.vibrate([200, 100, 600, 100, 200]);
    
    // Grab localized 911/999/112
    const localEmergencyNumber = getLocalEmergencyNumber();
    const primary = emergencyContacts.find((c) => c.isPrimary);
    
    let locationLink = '';
    if (Platform.OS !== 'web') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          locationLink = `\n\n📌 My Live Location: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
        } catch (e) {
          console.log('Could not fetch GPS fast enough.', e);
        }
      }
    }
    
    if (primary) {
      Alert.alert(
        '🚨 Emergency SOS',
        `Calling ${primary.name}...`,
        [
          { text: "I'm OK", style: 'cancel' },
          { 
            text: 'Send SMS Alert', 
            onPress: async () => {
              const isAvailable = await SMS.isAvailableAsync();
              if (isAvailable) {
                await SMS.sendSMSAsync(
                  [primary.phone],
                  `🚨 EMERGENCY: I need help! Please contact me immediately. (Sent from SeniorCare Hub)${locationLink}`
                );
              }
            }
          },
          {
            text: `Call ${primary.name}`,
            style: 'destructive',
            onPress: () => Linking.openURL(`tel:${primary.phone}`),
          },
        ]
      );
    } else {
      Alert.alert('🚨 Emergency', `No primary contact found. Calling ${localEmergencyNumber}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: `Call ${localEmergencyNumber}`, style: 'destructive', onPress: () => Linking.openURL(`tel:${localEmergencyNumber}`) }
      ]);
    }
  }, [emergencyContacts]);

  const startHold = useCallback(() => {
    setHolding(true);
    setHoldProgress(0);
    let progress = 0;
    holdTimer.current = setInterval(() => {
      progress += 50;
      setHoldProgress(progress);
      if (progress >= 2000) {
        clearInterval(holdTimer.current!);
        setHolding(false);
        setHoldProgress(0);
        triggerSOS();
      }
    }, 50);
  }, [triggerSOS]);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: colors.textSecondary, fontSize: 14 * scale }]}>
        Hold 2 seconds for emergency
      </Text>

      <View style={styles.pulseWrapper}>
        {/* Expanding ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [{ scale: ringAnim }],
              opacity: ringOpac,
              borderColor: '#EF4444',
            },
          ]}
        />

        {/* Main SOS Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPressIn={startHold}
            onPressOut={endHold}
            accessible
            accessibilityLabel="SOS Emergency Button"
            accessibilityHint="Hold for 2 seconds to call emergency contacts"
            accessibilityRole="button"
            style={[
              styles.sosButton,
              { backgroundColor: holding ? '#C81E1E' : '#EF4444' },
            ]}
          >
            <Ionicons name="warning" size={32} color="#FFFFFF" />
            <Text style={[styles.sosText, { fontSize: 18 * scale }]}>SOS</Text>
            {holding && (
              <Text style={[styles.holdText, { fontSize: 11 * scale }]}>
                {Math.ceil((2000 - holdProgress) / 1000)}s...
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Hold progress bar */}
      {holding && (
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${(holdProgress / 2000) * 100}%`, backgroundColor: '#EF4444' },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10, marginVertical: 8 },
  hint: { fontWeight: '500', textAlign: 'center' },
  pulseWrapper: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100 },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
  },
  sosButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    gap: 2,
  },
  sosText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  holdText: { color: '#FFE4E4', fontWeight: '600' },
  progressBar: {
    height: 6,
    width: 160,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
});
