import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function MedCard({ med, doses, index, onRefill }: { med: Medication; doses: DoseLog[]; index: number; onRefill: (id: string) => void }) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { markTaken, markMissed, refillMedication, removeMedication } = useMedicationStore();

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
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Medication: ${med.name}, ${med.dosage}. ${takenToday} of ${todayDoses.length} doses taken today.`}
      accessibilityHint="Double tap to view medication history and refill details."
    >
      <View style={styles.medCardHeader}>
        <LinearGradient
          colors={[med.color, med.color + 'AA']}
          style={styles.medColorIcon}
        >
          <Ionicons name="medical" size={20} color="#FFF" />
        </LinearGradient>
        
        <View style={styles.medHeaderText}>
          <Text style={[styles.medName, { color: colors.text, fontSize: 18 * scale }]} maxFontSizeMultiplier={1.5}>{med.name}</Text>
          <Text style={[styles.medDose, { color: colors.textSecondary, fontSize: 14 * scale }]} maxFontSizeMultiplier={1.3}>
            {med.dosage} • {med.frequency}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => Alert.alert(med.name, med.reason)}
            style={[styles.infoBtn, { backgroundColor: colors.background }]}
            accessibilityRole="button"
            accessibilityLabel="More Information"
            accessibilityHint={`View the prescribed reason for ${med.name}`}
          >
            <Ionicons name="information" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Remove Medication",
                `Are you sure you want to remove ${med.name}? This will also delete all intake logs for this medication.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Remove', 
                    style: 'destructive', 
                    onPress: () => {
                      removeMedication(med.id);
                      if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    } 
                  }
                ]
              );
            }}
            style={[styles.infoBtn, { backgroundColor: colors.danger + '10' }]}
            accessibilityRole="button"
            accessibilityLabel="Delete Medication"
            accessibilityHint={`Remove ${med.name} from your list.`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
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
              onPress={() => dose && handleDoseClick(dose)}
              accessibilityRole="button"
              accessibilityLabel={`Dose at ${time}. Status: ${st}.`}
              accessibilityHint={st === 'taken' ? "Double tap to mark as missed" : "Double tap to mark as taken"}
            >
               <View style={[styles.statusDot, { backgroundColor: indicatorColor }]} />
              <Text style={[styles.doseTime, { color: colors.textSecondary, fontSize: 13 * scale }]} maxFontSizeMultiplier={1.2}>{time}</Text>
              {st === 'taken' && <Ionicons name="checkmark" size={12} color={colors.success} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {med.pills_remaining !== undefined && (
        <View style={styles.refillRow}>
          <View 
            style={[styles.refillBadge, { backgroundColor: (med.pills_remaining <= (med.refill_threshold || 5)) ? colors.danger + '15' : colors.success + '15' }]}
            accessible={true}
            accessibilityLabel={`Pill count: ${med.pills_remaining} remaining. ${med.pills_remaining <= (med.refill_threshold || 5) ? 'Action required: Refill soon!' : ''}`}
          >
            <Ionicons 
              name={med.pills_remaining <= (med.refill_threshold || 5) ? "warning" : "cube"} 
              size={14} 
              color={med.pills_remaining <= (med.refill_threshold || 5) ? colors.danger : colors.success} 
            />
            <Text style={[styles.refill, { color: med.pills_remaining <= (med.refill_threshold || 5) ? colors.danger : colors.success, fontSize: 12 * scale }]} maxFontSizeMultiplier={1.2}>
              {med.pills_remaining} pills remaining {med.pills_remaining <= (med.refill_threshold || 5) ? '(Refill Soon!)' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.miniRefillBtn, { backgroundColor: colors.primary + '10' }]}
            onPress={() => onRefill(med.id)}
          >
            <Text style={[styles.miniRefillText, { color: colors.primary }]}>Refill</Text>
          </TouchableOpacity>
        </View>
      )}

      {med.refill_date && (
        <View style={[styles.refillBadge, { backgroundColor: colors.warning + '15' }]}>
          <Ionicons name="repeat" size={14} color={colors.warning} />
          <Text style={[styles.refill, { color: colors.warning, fontSize: 12 * scale }]}>
            Next Refill: {med.refill_date}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function MedicationsScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { medications, getTodayDoses, getAdherencePercent, fetchMedications, addMedication } = useMedicationStore();
  const { session } = useUserStore();

  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedTime, setNewMedTime] = useState('');
  const [newMedReason, setNewMedReason] = useState('');
  const [newMedPillCount, setNewMedPillCount] = useState('30');
  const [newMedThreshold, setNewMedThreshold] = useState('5');
  const [formError, setFormError] = useState<string | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const weeklyAdherence = useMedicationStore().getWeeklyAdherence();

  useEffect(() => {
    if (session) fetchMedications();
  }, [session]);

  const handleAddMedication = async () => {
    setFormError(null);
    if (!newMedName || !newMedDosage || !newMedTime) {
      setFormError('Please fill in Name, Dosage, and Time');
      return;
    }

    const timesArray = newMedTime.split(',').map(t => t.trim()).filter(Boolean);
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timesArray.every(t => timeRegex.test(t))) {
      setFormError('Use 24h format like 08:00 or 20:30');
      return;
    }

    try {
      await addMedication({
        name: newMedName,
        dosage: newMedDosage,
        frequency: newMedFreq || 'Daily',
        times: timesArray,
        reason: newMedReason || 'Routine',
        pills_remaining: parseInt(newMedPillCount) || 30,
        refill_threshold: parseInt(newMedThreshold) || 5,
        color: ['#F43F5E', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6'][Math.floor(Math.random() * 5)],
      });

      setShowAddModal(false);
      setNewMedName(''); setNewMedDosage(''); setNewMedFreq(''); setNewMedTime(''); setNewMedReason('');
      setFormError(null);
    } catch (e: any) {
      setFormError(e.message || 'Failed to save medication');
    }
  };

  // Refill State
  const [refillMedId, setRefillMedId] = useState<string | null>(null);
  const [refillCount, setRefillCount] = useState('30');
  const [showRefillModal, setShowRefillModal] = useState(false);

  const handleRefill = () => {
    const count = parseInt(refillCount);
    if (refillMedId && count > 0) {
      useMedicationStore.getState().refillMedication(refillMedId, count);
      setShowRefillModal(false);
      setRefillMedId(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const todayDoses = useMemo(() => getTodayDoses(), [medications]);
  const adherence = useMemo(() => getAdherencePercent(), [todayDoses]);
  const taken = useMemo(() => todayDoses.filter((d) => d.status === 'taken').length, [todayDoses]);
  const total = useMemo(() => todayDoses.length, [todayDoses]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header} accessible={true} accessibilityRole="header">
          <View>
            <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]} maxFontSizeMultiplier={1.5}>Medications</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]} maxFontSizeMultiplier={1.3}>
              {useUserStore.getState().profile?.role === 'caregiver' ? "Tracking senior's prescriptions" : `Tracking ${medications.length} active prescriptions`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Add Medication"
            accessibilityHint="Open form to add a new medication prescription."
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
          <View style={styles.listHeader} accessible={true} accessibilityRole="header">
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]} maxFontSizeMultiplier={1.5}>
              Current List
            </Text>
            <TouchableOpacity 
              onPress={() => setShowHistoryModal(true)}
              accessibilityRole="button"
              accessibilityLabel="View History"
              accessibilityHint="Double tap to open your medication adherence history for the last 7 days."
            >
              <Text style={[styles.viewHistory, { color: colors.primary }]} maxFontSizeMultiplier={1.3}>History</Text>
            </TouchableOpacity>
          </View>

        {medications.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="medical-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 20 * scale }]}>No Medications Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add your first prescription to start tracking your health journey.
            </Text>
            <TouchableOpacity 
              style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyAddText}>Add My First Med</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          medications.map((med, i) => (
            <MedCard 
              key={med.id} 
              med={med} 
              doses={todayDoses} 
              index={i} 
              onRefill={(id) => {
                setRefillMedId(id);
                setShowRefillModal(true);
              }} 
            />
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Refill Modal - Fixing Android Bug */}
      <Modal visible={showRefillModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Refill Prescription</Text>
              <TouchableOpacity onPress={() => setShowRefillModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.label, { color: colors.textSecondary }]}>Number of pills to add</Text>
            <View style={styles.refillInputRow}>
              <TouchableOpacity 
                style={[styles.stepBtn, { backgroundColor: colors.background }]} 
                onPress={() => setRefillCount(prev => (Math.max(1, parseInt(prev) - 5)).toString())}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              
              <TextInput 
                style={[styles.input, { flex: 1, textAlign: 'center', borderColor: colors.border, color: colors.text, fontSize: 24 }]}
                keyboardType="numeric"
                value={refillCount}
                onChangeText={setRefillCount}
              />
              
              <TouchableOpacity 
                style={[styles.stepBtn, { backgroundColor: colors.background }]} 
                onPress={() => setRefillCount(prev => (parseInt(prev) + 5).toString())}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.presetRow}>
              {['10', '30', '60', '90'].map(p => (
                <TouchableOpacity 
                  key={p} 
                  style={[styles.presetBtn, { backgroundColor: refillCount === p ? colors.primary : colors.background }]}
                  onPress={() => setRefillCount(p)}
                >
                  <Text style={[styles.presetText, { color: refillCount === p ? '#FFF' : colors.textSecondary }]}>+{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleRefill} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.saveBtnText}>Confirm Refill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Medication Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
             <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Medication</Text>
                {useUserStore.getState().profile?.role === 'caregiver' && (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>CREATING FOR SENIOR</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {formError && (
                <View style={{ backgroundColor: colors.danger + '15', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ color: colors.danger, fontWeight: '700', textAlign: 'center' }}>{formError}</Text>
                </View>
              )}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Medication Name</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. Lisinopril" placeholderTextColor={colors.textMuted} value={newMedName} onChangeText={setNewMedName} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Dosage</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. 10mg" placeholderTextColor={colors.textMuted} value={newMedDosage} onChangeText={setNewMedDosage} />

               <Text style={[styles.label, { color: colors.textSecondary }]}>Times (comma separated)</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. 08:00, 20:00" placeholderTextColor={colors.textMuted} value={newMedTime} onChangeText={setNewMedTime} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Frequency</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. Daily with food" placeholderTextColor={colors.textMuted} value={newMedFreq} onChangeText={setNewMedFreq} />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Reason (Optional)</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. For Blood Pressure" placeholderTextColor={colors.textMuted} value={newMedReason} onChangeText={setNewMedReason} />

              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Current Pill Count</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="30" keyboardType="numeric" placeholderTextColor={colors.textMuted} value={newMedPillCount} onChangeText={setNewMedPillCount} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Alert at Threshold</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="5" keyboardType="numeric" placeholderTextColor={colors.textMuted} value={newMedThreshold} onChangeText={setNewMedThreshold} />
                </View>
              </View>

              <TouchableOpacity onPress={handleAddMedication} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>Save Medication</Text>
              </TouchableOpacity>
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
             <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Weekly History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {weeklyAdherence.map((pct, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ width: 90, color: colors.textSecondary, fontWeight: '600', fontSize: 14 * scale }}>
                    {new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'})}
                  </Text>
                  <View style={{ flex: 1, height: 16, backgroundColor: colors.border, borderRadius: 8, marginHorizontal: 16, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 80 ? colors.success : colors.warning }} />
                  </View>
                  <Text style={{ width: 45, textAlign: 'right', fontWeight: '800', color: colors.text, fontSize: 15 * scale }}>
                    {pct}%
                  </Text>
                </View>
              ))}
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  refillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniRefillBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, marginTop: Spacing.md },
  miniRefillText: { fontWeight: '800', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, elevation: 10, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: Spacing.md },
  input: { minHeight: 50, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 16, fontWeight: '500', paddingVertical: 10 },
  saveBtn: { height: 50, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontWeight: '800' },
  emptySub: { textAlign: 'center', opacity: 0.6, paddingHorizontal: 40, lineHeight: 20 },
  emptyAddBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.full, marginTop: Spacing.lg },
  emptyAddText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  refillInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginVertical: Spacing.lg },
  stepBtn: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0001' },
  presetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md, minWidth: 60, alignItems: 'center' },
  presetText: { fontWeight: '700' },
});
