import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  Layout,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { useMedicationStore, Medication, DoseLog } from '@/stores/medicationStore';
import { Colors } from '@/constants/Colors';
import { Spacing, Radius } from '@/constants/Typography';

function MedCard({ med, doses, index }: { med: Medication; doses: DoseLog[]; index: number }) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { markTaken, markMissed } = useMedicationStore(); // Import markTaken and markMissed

  const todayDoses = doses.filter((d) => d.medication_id === med.id);
  const takenToday = todayDoses.filter((d) => d.status === 'taken').length;

  const getStatusColor = (status: string) => {
    if (status === 'taken') return colors.success;
    if (status === 'pending') return colors.warning;
    return colors.danger;
  };

  const statusIcon = (status: string) => {
    if (status === 'taken') return 'checkmark-circle' as const;
    if (status === 'pending') return 'time' as const;
    return 'close-circle' as const;
  };

  const handleDoseClick = (dose: DoseLog) => {
    const isTaken = dose.status === 'taken';
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        isTaken ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
      );
    }
    if (isTaken) markMissed(dose.id);
    else markTaken(dose.id);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={[
        styles.medCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.medCardHeader}>
        <LinearGradient
          colors={[med.color, med.color + 'AA']}
          style={styles.medColorIcon}
        >
          <Ionicons name="medical" size={20} color="#FFF" />
        </LinearGradient>
        
        <View style={styles.medHeaderText}>
          <Text style={[styles.medName, { color: colors.text, fontSize: 18 * scale }]}>{med.name}</Text>
          <Text style={[styles.medDose, { color: colors.textSecondary, fontSize: 14 * scale }]}>
            {med.dosage} • {med.frequency}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => Alert.alert(med.name, med.reason)}
          style={[styles.infoBtn, { backgroundColor: colors.background }]}
        >
          <Ionicons name="information" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.doseRow}>
        {med.times.map((time, i) => {
          const dose = todayDoses.find((d) => d.scheduled_time === time);
          const st = dose?.status ?? 'pending';
          const indicatorColor = getStatusColor(st);
          
          return (
            <TouchableOpacity 
              key={i} 
              style={[styles.doseChip, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => dose && handleDoseClick(dose)} // Pass the dose object
            >
               <View style={[styles.statusDot, { backgroundColor: indicatorColor }]} />
              <Text style={[styles.doseTime, { color: colors.textSecondary, fontSize: 13 * scale }]}>{time}</Text>
              {st === 'taken' && <Ionicons name="checkmark" size={12} color={colors.success} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {med.refill_date && (
        <View style={[styles.refillBadge, { backgroundColor: colors.warning + '15' }]}>
          <Ionicons name="repeat" size={14} color={colors.warning} />
          <Text style={[styles.refill, { color: colors.warning, fontSize: 12 * scale }]}>
            Refill by: {med.refill_date}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function MedicationsScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { medications, getTodayDoses, getAdherencePercent, fetchMedications } = useMedicationStore();
  const { session } = useUserStore();

  useEffect(() => {
    if (session) fetchMedications();
  }, [session]);

  const todayDoses = getTodayDoses();
  const adherence = getAdherencePercent();
  const taken = todayDoses.filter((d) => d.status === 'taken').length;
  const total = todayDoses.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]}>Medications</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]}>
              Tracking {medications.length} active prescriptions
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Add Medication', 'Feature coming soon')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Today's Summary */}
        <Animated.View entering={FadeInRight.delay(200).springify()}>
          <LinearGradient
            colors={colors.successGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryTitle}>Daily Adherence</Text>
                <Text style={styles.summaryValue}>{adherence}%</Text>
              </View>
              <View style={styles.summaryIconCircle}>
                 <Ionicons name="ribbon" size={32} color="rgba(255,255,255,0.4)" />
              </View>
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.statNum}>{taken}</Text>
                <Text style={styles.statLabel}>Taken</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={styles.statNum}>{total - taken}</Text>
                <Text style={styles.statLabel}>To Go</Text>
              </View>
               <View style={styles.statDivider} />
               <View style={styles.summaryStatItem}>
                <Text style={styles.statNum}>{total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Medication Cards */}
        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>
            Current List
          </Text>
          <TouchableOpacity>
            <Text style={[styles.viewHistory, { color: colors.primary }]}>History</Text>
          </TouchableOpacity>
        </View>

        {medications.map((med, i) => (
          <MedCard key={med.id} med={med} doses={todayDoses} index={i} />
        ))}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  title: { fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontWeight: '500', opacity: 0.7 },
  addBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  summaryCard: { borderRadius: Radius.xl, padding: Spacing.xl, elevation: 8, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, marginBottom: Spacing.xxl },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 16 },
  summaryValue: { color: '#FFF', fontWeight: '800', fontSize: 36 },
  summaryIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: Spacing.lg, borderRadius: Radius.lg },
  summaryStatItem: { alignItems: 'center', flex: 1 },
  statNum: { color: '#FFF', fontWeight: '800', fontSize: 20 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '800', letterSpacing: -0.5 },
  viewHistory: { fontWeight: '700', fontSize: 14 },
  medCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  medCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  medColorIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  medHeaderText: { flex: 1, gap: 2 },
  medName: { fontWeight: '800', letterSpacing: -0.3 },
  medDose: { fontWeight: '600' },
  infoBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doseRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  doseChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  doseTime: { fontWeight: '700' },
  refillBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, marginTop: Spacing.md, alignSelf: 'flex-start' },
  refill: { fontWeight: '700' },
});
