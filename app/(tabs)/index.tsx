import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { useMedicationStore } from '@/stores/medicationStore';
import { useVitalsStore } from '@/stores/vitalsStore';
import { Colors } from '@/constants/Colors';
import { Spacing, Radius, Typography } from '@/constants/Typography';
import MedicationReminderModal from '@/components/modals/MedicationReminderModal';
import SOSButton from '@/components/home/SOSButton';
import CaregiverDashboard from '@/components/home/CaregiverDashboard';

const { width } = Dimensions.get('window');

// Path to the generated hero illustration
const HERO_IMAGE = require('../../assets/images/senior_care_hero.png');

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function parseWeatherCode(code: number): { icon: keyof typeof Ionicons.glyphMap; label: string; color: string } {
  if (code === 0) return { icon: 'sunny', label: 'Clear', color: '#F59E0B' };
  if (code >= 1 && code <= 3) return { icon: 'partly-sunny', label: 'Cloudy', color: '#6B7280' };
  if (code >= 45 && code <= 48) return { icon: 'cloud', label: 'Fog', color: '#9CA3AF' };
  if (code >= 51 && code <= 67) return { icon: 'rainy', label: 'Rain', color: '#3B82F6' };
  if (code >= 71 && code <= 77) return { icon: 'snow', label: 'Snow', color: '#93C5FD' };
  if (code >= 95) return { icon: 'thunderstorm', label: 'Storm', color: '#4F46E5' };
  return { icon: 'partly-sunny', label: 'Cloudy', color: '#6B7280' };
}

function useLiveWeather() {
  const [data, setData] = useState({ temp: '--', city: 'Locating...', icon: parseWeatherCode(1) });
  
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setData(prev => ({ ...prev, city: 'Weather Unavailable' }));
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = location.coords;

        // Reverse Geocode for City
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const city = geocode[0]?.city || geocode[0]?.region || 'Unknown Location';

        // Fetch Open-Meteo strictly for temperature (free, no API key required)
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`);
        const weatherJson = await weatherRes.json();
        const current = weatherJson.current_weather;

        setData({
          temp: `${Math.round(current.temperature)}°`,
          city: city,
          icon: parseWeatherCode(current.weathercode)
        });
      } catch (e) {
        setData(prev => ({ ...prev, city: 'Offline' }));
      }
    })();
  }, []);

  return data;
}

function useCurrentTime() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  valueColor,
  delay = 0,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  valueColor?: string;
  delay?: number;
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value) }],
  }));

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()}
      layout={Layout.springify()}
      style={styles.statCardWrapper}
    >
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => (pressed.value = 0.96)}
          onPressOut={() => (pressed.value = 1)}
          onPress={onPress}
          style={styles.touchable}
        >
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
            style={[styles.statCard, { borderColor: colors.border }]}
          >
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={24} color={iconColor} />
            </View>
            <View style={styles.statText}>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 13 * scale }]}>
                {label}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: valueColor ?? colors.text, fontSize: 16 * scale },
                ]}
                numberOfLines={1}
              >
                {value}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { profile, session } = useUserStore();
  const { 
    getTodayDoses, 
    medications, 
    setShowReminderModal, 
    setActiveMedication, 
    fetchMedications,
    getStreak,
  } = useMedicationStore();
  const { getLatest, fetchVitals } = useVitalsStore();
  const time = useCurrentTime();
  const liveWeather = useLiveWeather();

  useEffect(() => {
    if (session) {
      fetchMedications();
      fetchVitals();
    }
  }, [session]);

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profile.role === 'caregiver') {
    return <CaregiverDashboard />;
  }

  const todayDoses = getTodayDoses();
  const takenCount = todayDoses.filter((d) => d.status === 'taken').length;
  const totalCount = todayDoses.length;
  const pendingDose = todayDoses.find((d) => d.status === 'pending');
  const nextMed = pendingDose
    ? medications.find((m) => m.id === pendingDose.medication_id)
    : null;

  const latestBP = getLatest('bp');
  const streak = getStreak();

  const handleCallFamily = useCallback(() => {
    if (!profile.emergencyContacts || profile.emergencyContacts.length === 0) {
      Alert.alert('No Contacts', 'Please link a Caregiver or add an emergency contact in the Family tab first.');
      return;
    }
    
    // Find absolute primary, fallback to first contact
    const primary = profile.emergencyContacts.find((c) => c.isPrimary) || profile.emergencyContacts[0];
    
    Linking.openURL(`tel:${primary.phone}`).catch(() => {
      Alert.alert('Error', 'Could not open the native phone dialer.');
    });
  }, [profile.emergencyContacts]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ── HERO HEADER ── */}
        <View style={styles.heroContainer}>
          <Image source={HERO_IMAGE} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroGradient}
          />
          
          <SafeAreaView style={styles.heroContent}>
            <View style={styles.statusRow}>
              <View>
                <Text style={[styles.greetingText, { color: colors.text, fontSize: 28 * scale }]}>
                  {getGreeting()},
                </Text>
                <Text style={[styles.nameText, { color: colors.primary, fontSize: 32 * scale }]}>
                  {profile.firstName || 'valued member'}
                </Text>
              </View>
              <BlurView intensity={isDark ? 40 : 60} style={styles.weatherGlass}>
                <Ionicons name={liveWeather.icon.icon} size={28} color={liveWeather.icon.color} />
                <View>
                  <Text style={[styles.weatherTemp, { color: colors.text }]}>{liveWeather.temp}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}>{liveWeather.city}</Text>
                </View>
              </BlurView>
            </View>

            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {time}
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.mainContent}>
          {/* ── STREAK BADGE ── */}
          {streak > 0 && (
            <Animated.View entering={FadeInDown.delay(50).springify()} style={{ marginBottom: Spacing.lg }}>
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.streakCard}
              >
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakTitle}>{streak}-Day Streak!</Text>
                  <Text style={styles.streakSub}>All pills taken {streak} days in a row. Keep it up!</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeNum}>{streak}</Text>
                  <Text style={styles.streakBadgeLabel}>days</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
          {/* ── NEXT REMINDER ── */}
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primeCard}
          >
            <View style={styles.primeHeader}>
              <View style={styles.primeIconContainer}>
                <Ionicons name="notifications" size={24} color="#FFF" />
              </View>
              <Text style={styles.primeTitle}>Next Reminder</Text>
            </View>
            <Text style={styles.primeValue}>
              {nextMed ? `${nextMed.name}` : 'All caught up!'}
            </Text>
            <Text style={styles.primeSub}>
              {nextMed ? `Scheduled for ${pendingDose?.scheduled_time}` : 'Next dose tomorrow morning'}
            </Text>
            {nextMed && (
              <TouchableOpacity 
                style={styles.primeButton}
                onPress={() => {
                  setActiveMedication(nextMed);
                  setShowReminderModal(true);
                }}
              >
                <Text style={styles.primeButtonText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>
              Daily Overview
            </Text>
          </View>

          <View style={styles.statGrid}>
            <StatCard
              icon="checkmark-circle"
              iconColor={colors.success}
              iconBg={isDark ? '#064E3B' : '#D1FAE5'}
              label="Medication Progress"
              value={`${takenCount}/${totalCount} taken`}
              valueColor={takenCount === totalCount ? colors.success : colors.warning}
              delay={100}
              onPress={() => router.push('/(tabs)/medications')}
            />
            <StatCard
              icon="heart"
              iconColor={colors.danger}
              iconBg={isDark ? '#4C0519' : '#FFE4E6'}
              label="Blood Pressure"
              value={latestBP ? latestBP.value : '-- / --'}
              valueColor={latestBP?.status === 'normal' ? colors.success : colors.warning}
              delay={200}
              onPress={() => router.push('/(tabs)/health')}
            />
          </View>

          {/* ── QUICK ACTIONS ── */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale, marginTop: Spacing.lg }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionGrid}>
             <TouchableOpacity
              onPress={handleCallFamily}
              style={[styles.bigAction, { backgroundColor: colors.success }]}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="call" size={24} color="#FFF" />
              </View>
              <Text style={styles.actionLabel}>Call Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.bigAction, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.background }]}>
                <Ionicons name="settings-outline" size={24} color={colors.text} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* ── SOS BUTTON ── */}
          <View style={styles.sosWrapper}>
            <SOSButton emergencyContacts={profile.emergencyContacts} />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <MedicationReminderModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { },
  heroContainer: {
    height: 340,
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    padding: Spacing.xl,
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: Spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontWeight: '600',
    opacity: 0.8,
  },
  nameText: {
    fontWeight: '800',
    marginTop: -8,
  },
  weatherGlass: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  weatherTemp: {
    fontWeight: '700',
    fontSize: 18,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  timeBadgeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
  },
  primeCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginBottom: Spacing.xl,
  },
  primeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  primeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primeTitle: {
    color: '#E0E7FF',
    fontWeight: '600',
    fontSize: 16,
  },
  primeValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  primeSub: {
    color: '#E0E7FF',
    fontSize: 16,
    marginTop: 4,
  },
  primeButton: {
    backgroundColor: '#FFF',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primeButtonText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statGrid: {
    gap: Spacing.md,
  },
  statCardWrapper: {
    width: '100%',
  },
  touchable: {
    width: '100%',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  bigAction: {
    flex: 1,
    height: 120,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
  },
  actionLabel: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  sosWrapper: {
    marginTop: Spacing.xxxl,
  },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.xl, elevation: 6, shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 12 },
  streakEmoji: { fontSize: 36 },
  streakTitle: { color: '#FFF', fontWeight: '900', fontSize: 18, letterSpacing: -0.5 },
  streakSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '500', fontSize: 13, marginTop: 2 },
  streakBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.lg, padding: Spacing.md, minWidth: 56 },
  streakBadgeNum: { color: '#FFF', fontWeight: '900', fontSize: 26, letterSpacing: -1 },
  streakBadgeLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
});
