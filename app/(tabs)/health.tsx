import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
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
import { useVitalsStore, VitalReading } from '@/stores/vitalsStore';
import VitalTrendChart from '@/components/health/VitalTrendChart';
import { Colors } from '@/constants/Colors';
import { Spacing, Radius } from '@/constants/Typography';

type VitalType = 'bp' | 'hr' | 'weight' | 'glucose' | 'spo2';

const vitalConfig: Record<VitalType, { label: string; unit: string; icon: keyof typeof Ionicons.glyphMap; color: string; placeholder: string; normal: string }> = {
  bp: { label: 'Blood Pressure', unit: 'mmHg', icon: 'heart', color: '#F43F5E', placeholder: '120/80', normal: '< 130/80' },
  hr: { label: 'Heart Rate', unit: 'bpm', icon: 'pulse', color: '#F59E0B', placeholder: '72', normal: '60–100' },
  weight: { label: 'Weight', unit: 'lbs', icon: 'scale', color: '#8B5CF6', placeholder: '165', normal: 'Your usual weight' },
  glucose: { label: 'Blood Sugar', unit: 'mg/dL', icon: 'water', color: '#6366F1', placeholder: '98', normal: '70–140' },
  spo2: { label: 'Oxygen Level', unit: '%', icon: 'cloud', color: '#06B6D4', placeholder: '98', normal: '> 95%' },
};

function VitalCard({ type, latest, index }: { type: VitalType; latest: VitalReading | null; index: number }) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const cfg = vitalConfig[type];
  
  const getStatusColor = () => {
    if (!latest) return colors.textMuted;
    if (latest.status === 'normal') return colors.success;
    if (latest.status === 'caution') return colors.warning;
    return colors.danger;
  };

  const statusColor = getStatusColor();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={[styles.vitalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <LinearGradient
        colors={[cfg.color, cfg.color + 'AA']}
        style={styles.vitalIconWrap}
      >
        <Ionicons name={cfg.icon} size={22} color="#FFF" />
      </LinearGradient>
      
      <View style={styles.vitalInfo}>
        <Text style={[styles.vitalLabel, { color: colors.textSecondary, fontSize: 13 * scale }]}>{cfg.label}</Text>
        <Text style={[styles.vitalValue, { color: latest ? colors.text : colors.textMuted, fontSize: 20 * scale }]}>
          {latest ? `${latest.value} ` : '— '}
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{cfg.unit}</Text>
        </Text>
        <Text style={[styles.vitalNormal, { color: colors.textMuted, fontSize: 11 * scale }]}>Normal: {cfg.normal}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
           {latest?.status?.toUpperCase() ?? 'NONE'}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HealthScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { readings, getLatest, addReading, fetchVitals } = useVitalsStore();
  const { session } = useUserStore();
  const [activeInput, setActiveInput] = useState<VitalType | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (session) fetchVitals();
  }, [session]);

  const handleLog = async () => {
    if (!activeInput || !inputValue.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const cfg = vitalConfig[activeInput];
    
    await addReading({
      type: activeInput,
      value: inputValue.trim(),
      unit: cfg.unit,
      measured_at: new Date().toISOString(),
      status: 'normal',
    });

    Alert.alert('✅ Logged!', `${cfg.label} saved successfully.`);
    setInputValue('');
    setActiveInput(null);
  };

  const recentAlerts = readings.filter((r) => r.status !== 'normal').slice(0, 3);

  // Prepare chart data for Blood Pressure
  const bpReadings = readings
    .filter((r) => r.type === 'bp')
    .slice(0, 7)
    .reverse();
  const bpData = bpReadings.map((r) => parseInt(r.value.split('/')[0]) || 0); // Use systolic for chart
  const bpLabels = bpReadings.map((r) => new Date(r.measured_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));

  // Prepare chart data for Heart Rate
  const hrReadings = readings
    .filter((r) => r.type === 'hr')
    .slice(0, 7)
    .reverse();
  const hrData = hrReadings.map((r) => parseInt(r.value) || 0);
  const hrLabels = hrReadings.map((r) => new Date(r.measured_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]}>Health Dashboard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </Animated.View>

          {/* Log New Reading */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Log New Reading</Text>
          <View style={styles.logGrid}>
            {(Object.keys(vitalConfig) as VitalType[]).map((type) => {
              const cfg = vitalConfig[type];
              const active = activeInput === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => { setActiveInput(active ? null : type); setInputValue(''); }}
                   style={[
                    styles.logChip, 
                    { 
                      backgroundColor: active ? cfg.color : colors.surface, 
                      borderColor: active ? cfg.color : colors.border,
                      elevation: active ? 4 : 0,
                    }
                  ]}
                >
                  <Ionicons name={cfg.icon} size={18} color={active ? '#FFF' : cfg.color} />
                  <Text style={[styles.logChipText, { color: active ? '#FFF' : colors.text, fontSize: 13 * scale }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeInput && (
            <Animated.View 
              entering={FadeInRight.springify()} 
              style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.inputLabel, { color: colors.text, fontSize: 16 * scale }]}>
                What is your current <Text style={{ color: vitalConfig[activeInput].color }}>{vitalConfig[activeInput].label}</Text>?
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={vitalConfig[activeInput].placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  autoFocus
                  style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, fontSize: 24 * scale }]}
                />
                <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{vitalConfig[activeInput].unit}</Text>
              </View>
              
              <TouchableOpacity
                onPress={handleLog}
                style={[styles.saveBtn, { backgroundColor: vitalConfig[activeInput].color }]}
              >
                <Text style={styles.saveBtnText}>Save Reading</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Health Insights / Trends */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale, marginTop: Spacing.xl }]}>Weekly Trends</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
            <VitalTrendChart
              title="Blood Pressure (Systolic)"
              data={bpData}
              labels={bpLabels}
              unit=""
              color="#F43F5E"
            />
            <VitalTrendChart
              title="Heart Rate"
              data={hrData}
              labels={hrLabels}
              unit="bpm"
              color="#F59E0B"
            />
          </ScrollView>

          {/* Current Vitals */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale, marginTop: Spacing.xl }]}>Vital Statistics</Text>
          {(Object.keys(vitalConfig) as VitalType[]).map((type, i) => (
            <VitalCard key={type} type={type} latest={getLatest(type)} index={i} />
          ))}

          {/* Alerts */}
          {recentAlerts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.danger, fontSize: 18 * scale, marginTop: Spacing.xl }]}>Recent Alerts</Text>
              {recentAlerts.map((r, i) => (
                <View key={r.id} style={[styles.alertCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
                  <View style={styles.alertIconCircle}>
                    <Ionicons name="warning" size={20} color={colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertText, { color: colors.text, fontSize: 15 * scale }]}>
                      {vitalConfig[r.type as VitalType]?.label} was {r.status}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 * scale }}>
                      Value: {r.value} {r.unit} · {new Date(r.measured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.md },
  title: { fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontWeight: '600', opacity: 0.6 },
  sectionTitle: { fontWeight: '800', marginBottom: Spacing.md, letterSpacing: -0.5 },
  vitalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  vitalIconWrap: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  vitalInfo: { flex: 1, gap: 2 },
  vitalLabel: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  vitalValue: { fontWeight: '800' },
  vitalNormal: { fontWeight: '500', opacity: 0.6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  logGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  logChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1 },
  logChipText: { fontWeight: '700' },
  inputCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.xl, marginBottom: Spacing.xl, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  inputLabel: { fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textInput: { flex: 1, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 16, fontWeight: '800', height: 60 },
  unitLabel: { fontWeight: '700', fontSize: 18 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: Radius.md },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  alertIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  alertText: { fontWeight: '700' },
});

