import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { useMedicationStore, DoseLog } from '@/stores/medicationStore';
import { useVitalsStore } from '@/stores/vitalsStore';
import { Spacing, Radius } from '@/constants/Typography';
import StatCard from '@/components/shared/StatCard';
import ThemedCard from '@/components/shared/ThemedCard';

export default function CaregiverDashboard() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const insets = useSafeAreaInsets();
  const { profile, seniorProfile, fetchSeniorProfile } = useUserStore();
  const { getTodayDoses, getAdherencePercent, medications, fetchMedications } = useMedicationStore();
  const { getLatest, fetchVitals } = useVitalsStore();
  const router = useRouter();

  // Fetch data on mount so caregiver doesn't see empty state
  React.useEffect(() => {
    fetchMedications();
    fetchVitals();
    fetchSeniorProfile();
  }, []);

  if (!profile) return null;

  const adherence = getAdherencePercent();
  const todayDoses = getTodayDoses();
  const taken = todayDoses.filter((d: DoseLog) => d.status === 'taken').length;
  const missed = todayDoses.filter((d: DoseLog) => d.status === 'missed').length;
  const pending = todayDoses.length - taken - missed;

  const latestBP = getLatest('bp');
  const latestHR = getLatest('hr');

  const handleCallSenior = () => {
    router.push('/video-call');
  };

  const statusColor = adherence >= 80 ? colors.success : adherence >= 50 ? colors.warning : colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.md) }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary, fontSize: 13 * scale }]}>
              Caregiver Overview
            </Text>
            <Text style={[styles.title, { color: colors.text, fontSize: 22 * scale }]}>
              Senior Health Status
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/caregiver/settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Adherence Card */}
        <ThemedCard 
          delay={100}
          gradient={isDark ? ['#1e293b', '#0f172a'] : [colors.primaryLight, '#F8FAFC']}
          style={{ padding: 0 }} // ThemedCard has internal padding, adjusting
        >
          <View style={styles.adherenceTop}>
            <View>
              <Text style={[styles.adherenceTitle, { color: colors.textSecondary, fontSize: 12 * scale }]}>Daily Adherence</Text>
              <Text style={[styles.adherenceValue, { color: statusColor, fontSize: 32 * scale }]}>{adherence}%</Text>
            </View>
            <View style={[styles.adherenceIconBg, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name="medical" size={32} color={statusColor} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxTitle, { color: colors.textSecondary }]}>Taken</Text>
              <Text style={[styles.statBoxValue, { color: colors.success }]}>{taken}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxTitle, { color: colors.textSecondary }]}>Pending</Text>
              <Text style={[styles.statBoxValue, { color: colors.warning }]}>{pending}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxTitle, { color: colors.textSecondary }]}>Missed</Text>
              <Text style={[styles.statBoxValue, { color: colors.danger }]}>{missed}</Text>
            </View>
          </View>
        </ThemedCard>

        {/* Vitals Summary */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Latest Vitals</Text>
          </View>
          
          <View style={styles.vitalsGrid}>
            <StatCard
              icon="heart"
              iconColor={colors.danger}
              iconBg={isDark ? '#4C0519' : '#FFE4E6'}
              label="Blood Pressure"
              value={latestBP ? latestBP.value : '-- / --'}
              delay={200}
            />
            
            <StatCard
              icon="pulse"
              iconColor={colors.primary}
              iconBg={isDark ? '#065F46' : '#D1FAE5'}
              label="Heart Rate"
              value={latestHR ? latestHR.value : '-- bpm'}
              delay={300}
            />
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Quick Connect</Text>
          </View>

            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: colors.primary }]}
              onPress={handleCallSenior}
            >
              <Ionicons name="videocam" size={24} color="#FFF" />
              <Text style={styles.callBtnText}>Call {seniorProfile?.firstName || 'Senior'}</Text>
            </TouchableOpacity>

            <View style={[styles.alertBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
               <Ionicons name="warning" size={24} color={colors.warning} />
               <View style={{ flex: 1 }}>
                 <Text style={[styles.alertTitle, { color: colors.warning }]}>Tip: Check In Regularly</Text>
                 <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                   Tap "Call {seniorProfile?.firstName || 'Senior'}" above to reach your linked senior directly. Use the Family tab for chat and status updates.
                 </Text>
               </View>
            </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingTop: 0 },
  header: { marginBottom: Spacing.md },
  settingsBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  title: { fontWeight: '800', letterSpacing: -0.5 },
  adherenceCard: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.xl, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
  adherenceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  adherenceTitle: { fontWeight: '600', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  adherenceValue: { fontWeight: '900', letterSpacing: -1 },
  adherenceIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.2)', paddingTop: Spacing.md },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxTitle: { fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
  statBoxValue: { fontWeight: '800', fontSize: 24, marginTop: 4 },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '800', letterSpacing: -0.5 },
  vitalsGrid: { flexDirection: 'row', gap: Spacing.md },
  vitalCard: { flex: 1, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', gap: 6 },
  vitalLabel: { fontWeight: '600', fontSize: 13 },
  vitalValue: { fontWeight: '800', fontSize: 20 },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, borderRadius: Radius.full, marginBottom: Spacing.lg, elevation: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  callBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  alertBox: { flexDirection: 'row', padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.md, alignItems: 'flex-start' },
  alertTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  alertDesc: { fontSize: 13, lineHeight: 18 },
});
