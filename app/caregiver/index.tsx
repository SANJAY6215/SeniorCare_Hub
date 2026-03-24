import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/Typography';
import { useUserStore } from '@/stores/userStore';
import { useMedicationStore } from '@/stores/medicationStore';
import { useVitalsStore } from '@/stores/vitalsStore';
import { generateDoctorReport } from '@/utils/reportGenerator';

const { width } = Dimensions.get('window');

function StatCard({ title, value, unit, icon, color, delay }: any) {
  const { colors } = useTheme();
  const scale = useTextScale();

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, { color: colors.text, fontSize: 24 * scale }]}>{value}</Text>
          {unit && <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

export default function CaregiverDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const insets = useSafeAreaInsets();
  const { profile, seniorProfile, fetchSeniorProfile } = useUserStore();
  const { medications, fetchMedications, getAdherencePercent, getStreak, fetchLogs, doseLogs } = useMedicationStore();
  const { readings, fetchVitals } = useVitalsStore();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleCall = () => {
    if (!seniorProfile?.phone) {
      Alert.alert('No Phone Number', 'This senior does not have a phone number linked to their profile.');
      return;
    }
    Linking.openURL(`tel:${seniorProfile.phone}`).catch(() => {
      Alert.alert('Error', 'Could not open the native dialer.');
    });
  };

  const handleMessage = () => {
    router.push('/(tabs)/family');
  };

  const handleExportReport = async () => {
    try {
      setExporting(true);
      // Fetch 30 days of data
      await fetchLogs(30);
      
      const seniorName = seniorProfile?.firstName + ' ' + (seniorProfile?.lastName || '');
      const caregiverName = profile?.firstName + ' ' + (profile?.lastName || '');

      await generateDoctorReport({
        seniorName,
        caregiverName,
        medications,
        doseLogs,
        vitals: readings
      });
    } catch (error) {
      Alert.alert('Export Failed', 'An error occurred while generating the report.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      await fetchSeniorProfile();
      await fetchMedications();
      await fetchVitals();
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !profile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const adherence = getAdherencePercent(7);
  const streak = getStreak();
  const seniorName = seniorProfile?.firstName || 'Your Senior';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.md) }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 22 * scale }]}>Care Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: 13 * scale }]}>Monitoring {seniorName}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            onPress={() => router.push('/caregiver/settings')}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Adherence Overview */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroSection}>
          <LinearGradient
            colors={colors.primaryGradient}
            style={styles.heroCard}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.heroLabel}>Weekly Adherence</Text>
              <Text style={styles.heroValue}>{adherence}%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${adherence}%` }]} />
              </View>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={20} color="#FFD700" />
              <Text style={styles.streakText}>{streak} Day Streak</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Medications" 
            value={medications.length} 
            icon="medical" 
            color="#6366F1" 
            delay={200} 
          />
          <StatCard 
            title="Vitals Check" 
            value="Normal" 
            icon="pulse" 
            color="#EF4444" 
            delay={300} 
          />
        </View>

        {/* Recent Activity Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Recent Activity</Text>
        <Animated.View entering={FadeInDown.delay(400)} style={[styles.activityList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {medications.slice(0, 3).map((med, i) => (
            <View key={med.id} style={[styles.activityItem, i !== 2 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.activityDot, { backgroundColor: colors.success }]} />
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>{med.name} taken</Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>Today · {med.times[0]}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
          ))}
          {medications.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activities found.</Text>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            onPress={handleCall}
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Call ${seniorName}`}
          >
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.actionIcon}>
              <Ionicons name="call" size={22} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.actionText, { color: colors.text }]}>Call Senior</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleMessage}
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Message ${seniorName}`}
          >
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={22} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.actionText, { color: colors.text }]}>Message</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.exportCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
          onPress={handleExportReport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionText, { color: colors.text }]}>Export 30-Day Doctor Report</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Professional PDF summary of adherence and vitals.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { marginLeft: Spacing.sm },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
  heroSection: { marginBottom: Spacing.xl },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  heroInfo: { flex: 1 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  heroValue: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, width: '80%' },
  progressBarFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 4 },
  streakBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  statsGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  statInfo: { flex: 1 },
  statLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontWeight: '800' },
  statUnit: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontWeight: '800', marginBottom: Spacing.md, letterSpacing: -0.5 },
  activityList: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.xl },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityContent: { flex: 1 },
  activityTitle: { fontWeight: '700', fontSize: 15 },
  activityTime: { fontSize: 12, fontWeight: '600', opacity: 0.6 },
  emptyText: { textAlign: 'center', padding: Spacing.xl, fontStyle: 'italic' },
  actionsGrid: { flexDirection: 'row', gap: Spacing.md },
  actionCard: { flex: 1, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, alignItems: 'center', gap: Spacing.sm },
  actionIcon: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '700', fontSize: 14 },
  exportCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginTop: Spacing.lg, gap: Spacing.md },
});
