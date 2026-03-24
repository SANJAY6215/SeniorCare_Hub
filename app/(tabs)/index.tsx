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
import PremiumModal from '@/components/premium/PremiumModal';
import AdBannerPlaceholder from '@/components/common/AdBannerPlaceholder';
import { useVitalsStore } from '@/stores/vitalsStore';
import { Colors } from '@/constants/Colors';
import { Spacing, Radius, Typography } from '@/constants/Typography';
import MedicationReminderModal from '@/components/modals/MedicationReminderModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SOSButton from '@/components/home/SOSButton';
import CaregiverDashboard from '@/components/home/CaregiverDashboard';

const { width } = Dimensions.get('window');

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

import StatCard from '@/components/shared/StatCard';
import ThemedCard from '@/components/shared/ThemedCard';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, session, updateProfile } = useUserStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
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
      <PremiumModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ── HERO HEADER ── */}
        <View style={[styles.heroContainer, { backgroundColor: colors.primary }]}>
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroGradient}
          />
          
          <View style={[styles.heroContent, { paddingTop: Math.max(insets.top, 20) }]}>
            <View style={styles.statusRow}>
              <View>
                <Text 
                  style={[styles.greetingText, { color: colors.text, fontSize: 28 * scale }]}
                  maxFontSizeMultiplier={1.5}
                >
                  {getGreeting()},
                </Text>
                <Text 
                  style={[styles.nameText, { color: colors.primary, fontSize: 32 * scale }]}
                  maxFontSizeMultiplier={1.5}
                >
                  {profile.firstName || 'valued member'}
                </Text>
              </View>
              <BlurView 
                intensity={isDark ? 40 : 60} 
                style={styles.weatherGlass}
                accessible={true}
                accessibilityLabel={`Weather in ${liveWeather.city}: ${liveWeather.temp}, ${liveWeather.icon.label}`}
              >
                <Ionicons name={liveWeather.icon.icon} size={28} color={liveWeather.icon.color} />
                <View>
                  <Text style={[styles.weatherTemp, { color: colors.text }]} maxFontSizeMultiplier={1.3}>{liveWeather.temp}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>{liveWeather.city}</Text>
                </View>
              </BlurView>
            </View>

            <View 
              style={styles.timeBadge}
              accessible={true}
              accessibilityLabel={`Current date and time: ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.2}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {time}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* ── STREAK BADGE ── */}
          {streak > 0 && (
            <Animated.View entering={FadeInDown.delay(50).springify()} style={{ marginBottom: Spacing.lg }}>
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.streakCard}
                accessible={true}
                accessibilityLabel={`${streak} day medication streak!`}
                accessibilityHint="Keep taking your pills every day to grow your streak."
              >
                <Text style={styles.streakEmoji} accessible={false}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakTitle} maxFontSizeMultiplier={1.5}>{streak}-Day Streak!</Text>
                  <Text style={styles.streakSub} maxFontSizeMultiplier={1.3}>All pills taken {streak} days in a row. Keep it up!</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeNum} maxFontSizeMultiplier={1.5}>{streak}</Text>
                  <Text style={styles.streakBadgeLabel} maxFontSizeMultiplier={1.2}>days</Text>
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
              accessible={true}
              accessibilityLabel={nextMed ? `Next Reminder: ${nextMed.name}. Scheduled for ${pendingDose?.scheduled_time}` : "All medications taken for now."}
            >
              <View style={styles.primeHeader}>
                <View style={styles.primeIconContainer}>
                  <Ionicons name="notifications" size={24} color="#FFF" />
                </View>
                <Text style={styles.primeTitle} maxFontSizeMultiplier={1.5}>Next Reminder</Text>
              </View>
              <Text style={styles.primeValue} maxFontSizeMultiplier={1.5}>
                {nextMed ? `${nextMed.name}` : 'All caught up!'}
              </Text>
              <Text style={styles.primeSub} maxFontSizeMultiplier={1.3}>
                {nextMed ? `Scheduled for ${pendingDose?.scheduled_time}` : 'Next dose tomorrow morning'}
              </Text>
              {nextMed && (
                <TouchableOpacity 
                  style={styles.primeButton}
                  onPress={() => {
                    setActiveMedication(nextMed);
                    setShowReminderModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${nextMed.name}`}
                >
                  <Text style={styles.primeButtonText} maxFontSizeMultiplier={1.3}>View Details</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </LinearGradient>

          <View style={styles.sectionHeader} accessible={true} accessibilityRole="header">
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]} maxFontSizeMultiplier={1.5}>
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
              style={[styles.bigAction, { backgroundColor: colors.success, width: '100%' }]}
              accessibilityRole="button"
              accessibilityLabel="Call Family"
              accessibilityHint="Initiates a phone call to your primary emergency contact."
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="call" size={24} color="#FFF" />
              </View>
              <Text style={styles.actionLabel} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Call Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/food-scanner')}
              style={[styles.bigAction, { backgroundColor: '#22C55E20', borderWidth: 1, borderColor: '#22C55E' }]}
              accessibilityRole="button"
              accessibilityLabel="Scan Food"
              accessibilityHint="Use the camera to scan your meal and get health advice."
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="fast-food" size={24} color="#FFF" />
              </View>
              <Text style={[styles.actionLabel, { color: '#22C55E' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/exercises')}
              style={[styles.bigAction, { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981' }]}
              accessibilityRole="button"
              accessibilityLabel="Daily Exercises"
              accessibilityHint="Follow simple stretching and balance routines."
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="fitness" size={24} color="#FFF" />
              </View>
              <Text style={[styles.actionLabel, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Exercises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.bigAction, { backgroundColor: colors.card }]}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.text + '20' }]}>
                <Ionicons name="settings" size={24} color={colors.text} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/sleep')}
              style={[styles.bigAction, { backgroundColor: '#6366F120', borderWidth: 1, borderColor: '#6366F1' }]}
              accessibilityRole="button"
              accessibilityLabel="Sleep Tracker"
              accessibilityHint="Log and analyze your sleep patterns."
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#6366F1' }]}>
                <Ionicons name="moon" size={24} color="#FFF" />
              </View>
              <Text style={[styles.actionLabel, { color: '#6366F1' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Sleep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/pill-scanner')}
              style={[styles.bigAction, { backgroundColor: '#6366F120', borderWidth: 1, borderColor: '#6366F1' }]}
              accessibilityRole="button"
              accessibilityLabel="Pill Identification"
              accessibilityHint="Use the camera to identify your medication."
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#6366F1' }]}>
                <Ionicons name="medical" size={24} color="#FFF" />
              </View>
              <Text style={[styles.actionLabel, { color: '#6366F1' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Pill ID</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/caregiver')}
              style={[styles.bigAction, { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' }]}
              accessibilityRole="button"
              accessibilityLabel="Caregiver View"
              accessibilityHint="Switch to the caregiver dashboard view."
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="stats-chart" size={24} color="#FFF" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Caregiver View</Text>
            </TouchableOpacity>
          </View>

          {/* ── SOS BUTTON ── */}
          <View style={styles.sosWrapper}>
            <SOSButton emergencyContacts={profile.emergencyContacts} />
          </View>
        </View>

        {!profile?.isPremium && (
          <AdBannerPlaceholder onPressPremium={() => setShowPremiumModal(true)} />
        )}
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
    height: 260,
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
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.md,
    justifyContent: 'space-between',
  },
  bigAction: {
    width: '48%',
    height: 110,
    borderRadius: Radius.xl,
    padding: 16,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginBottom: 4,
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
