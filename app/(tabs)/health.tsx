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
  Modal,
} from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import AISymptomChecker from '@/components/health/AISymptomChecker';
import VoiceRecognitionSheet from '@/components/health/VoiceRecognitionSheet';
import { Colors } from '@/constants/Colors';
import PremiumModal from '@/components/premium/PremiumModal';
import AdBannerPlaceholder from '@/components/common/AdBannerPlaceholder';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius } from '@/constants/Typography';

type VitalType = 'bp' | 'hr' | 'weight' | 'glucose' | 'spo2';

const vitalConfig: Record<VitalType, { label: string; unit: string; icon: keyof typeof Ionicons.glyphMap; color: string; placeholder: string; normal: string }> = {
  bp: { label: 'Blood Pressure', unit: 'mmHg', icon: 'heart', color: '#F43F5E', placeholder: '120/80', normal: '< 130/80' },
  hr: { label: 'Heart Rate', unit: 'bpm', icon: 'pulse', color: '#F59E0B', placeholder: '72', normal: '60–100' },
  weight: { label: 'Weight', unit: 'lbs', icon: 'scale', color: '#8B5CF6', placeholder: '165', normal: 'Your usual weight' },
  glucose: { label: 'Blood Sugar', unit: 'mg/dL', icon: 'water', color: '#6366F1', placeholder: '98', normal: '70–140' },
  spo2: { label: 'Oxygen Level', unit: '%', icon: 'cloud', color: '#06B6D4', placeholder: '98', normal: '> 95%' },
};

const calculateStatus = (type: VitalType, value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num) && type !== 'bp') return 'UNKNOWN';

  switch (type) {
    case 'bp': {
      const parts = value.split('/');
      if (parts.length === 1) {
        // If they enter a single number, assume systolic for basic triage
        const sys = parseInt(parts[0]);
        if (isNaN(sys)) return 'UNKNOWN';
        if (sys >= 140) return 'HIGH';
        if (sys < 90) return 'LOW';
        return 'NORMAL';
      }
      if (parts.length !== 2) return 'UNKNOWN';
      const sys = parseInt(parts[0]);
      const dia = parseInt(parts[1]);
      if (isNaN(sys) || isNaN(dia)) return 'UNKNOWN';
      if (sys < 90 || dia < 60) return 'LOW';
      if (sys > 180 || dia > 120) return 'CRITICAL';
      if (sys >= 130 || dia >= 80) return 'HIGH';
      if (sys >= 120 && sys < 130 && dia < 80) return 'ELEVATED';
      return 'NORMAL';
    }
    case 'hr':
      if (num < 60) return 'LOW';
      if (num > 100) return 'HIGH';
      return 'NORMAL';
    case 'glucose':
      if (num < 70) return 'LOW';
      if (num > 140) return 'HIGH';
      return 'NORMAL';
    case 'spo2':
      if (num < 90) return 'CRITICAL';
      if (num < 95) return 'LOW';
      return 'NORMAL';
    case 'weight':
      return 'RECORDED'; 
    default:
      return 'NORMAL';
  }
};

function HealthInsightCard({ readings }: { readings: VitalReading[] }) {
  const { colors } = useTheme();
  const scale = useTextScale();
  
  const hasCritical = readings.some(r => r.status === 'critical');
  const hasHigh = readings.some(r => r.status === 'high' || r.status === 'elevated');
  
  let config: { title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; color: string } = {
    title: "All vitals look stable",
    sub: "Your recent readings are within normal ranges. Great job!",
    icon: "checkmark-circle",
    color: colors.success
  };

  if (hasCritical) {
    config = {
      title: "Action Required",
      sub: "Some readings are in a critical range. Please consult your physician.",
      icon: "alert-circle" as const,
      color: colors.danger
    };
  } else if (hasHigh) {
    config = {
      title: "Daily Insight",
      sub: "Vitals are slightly elevated today. Ensure you've taken your medications.",
      icon: "information-circle" as const,
      color: colors.warning
    };
  }

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()} style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.insightIconBg, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={28} color={config.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.insightTitle, { color: colors.text, fontSize: 16 * scale }]}>{config.title}</Text>
        <Text style={[styles.insightSub, { color: colors.textSecondary, fontSize: 13 * scale }]}>{config.sub}</Text>
      </View>
    </Animated.View>
  );
}

function VitalCard({ type, latest, index }: { type: VitalType; latest: VitalReading | null; index: number }) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const cfg = vitalConfig[type];
  
  const getStatusColor = (s: string) => {
    if (s === 'NORMAL' || s === 'RECORDED') return colors.success;
    if (s === 'LOW' || s === 'ELEVATED' || s === 'CAUTION') return colors.warning;
    if (s === 'UNKNOWN' || s === 'NONE') return colors.textMuted;
    return colors.danger; // HIGH, CRITICAL, etc
  };

  const dynamicStatus = latest ? calculateStatus(type, latest.value).toUpperCase() : 'NONE';
  const statusColor = getStatusColor(dynamicStatus);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={[styles.vitalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Vital: ${cfg.label}. Latest reading: ${latest ? `${latest.value} ${cfg.unit}` : 'No data yet'}. Status: ${dynamicStatus.toLowerCase()}.`}
    >
      <LinearGradient
        colors={[cfg.color, cfg.color + 'AA']}
        style={styles.vitalIconWrap}
      >
        <Ionicons name={cfg.icon} size={22} color="#FFF" />
      </LinearGradient>
      
      <View style={styles.vitalInfo}>
        <Text style={[styles.vitalLabel, { color: colors.textSecondary, fontSize: 13 * scale }]} maxFontSizeMultiplier={1.5}>{cfg.label}</Text>
        <Text style={[styles.vitalValue, { color: latest ? colors.text : colors.textMuted, fontSize: 20 * scale }]} maxFontSizeMultiplier={1.5}>
          {latest ? `${latest.value} ` : '— '}
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }} maxFontSizeMultiplier={1.2}>{cfg.unit}</Text>
        </Text>
        <Text style={[styles.vitalNormal, { color: colors.textMuted, fontSize: 11 * scale }]} maxFontSizeMultiplier={1.2}>Normal: {cfg.normal}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
        <Text style={[styles.statusText, { color: statusColor }]} maxFontSizeMultiplier={1.2}>
           {dynamicStatus}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function HealthScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { readings, getLatest, addReading, fetchVitals } = useVitalsStore();
  const { session, profile, updateProfile } = useUserStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeInput, setActiveInput] = useState<VitalType | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showAIChecker, setShowAIChecker] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceHint, setVoiceHint] = useState('');

  // Voice text parser — interprets natural language vitals
  const parseVoiceInput = (text: string) => {
    const lower = text.toLowerCase();
    let matched = false;
    if (lower.includes('blood pressure') || lower.includes('bp')) {
      const nums = lower.match(/(\d+)\s*(?:over|\/)\s*(\d+)/);
      if (nums) {
        setActiveInput('bp');
        setInputValue(`${nums[1]}/${nums[2]}`);
        setVoiceHint(`✅ Blood Pressure set to ${nums[1]}/${nums[2]} mmHg`);
        matched = true;
      }
    } else if (lower.includes('heart rate') || lower.includes('pulse') || lower.includes('bpm')) {
      const nums = lower.match(/(\d+)/);
      if (nums) {
        setActiveInput('hr');
        setInputValue(nums[1]);
        setVoiceHint(`✅ Heart Rate set to ${nums[1]} bpm`);
        matched = true;
      }
    } else if (lower.includes('blood sugar') || lower.includes('glucose')) {
      const nums = lower.match(/(\d+)/);
      if (nums) {
        setActiveInput('glucose');
        setInputValue(nums[1]);
        setVoiceHint(`✅ Blood Sugar set to ${nums[1]} mg/dL`);
        matched = true;
      }
    } else if (lower.includes('oxygen') || lower.includes('spo2') || lower.includes('saturation')) {
      const nums = lower.match(/(\d+)/);
      if (nums) {
        setActiveInput('spo2');
        setInputValue(nums[1]);
        setVoiceHint(`✅ SpO2 set to ${nums[1]}%`);
        matched = true;
      }
    } else if (lower.includes('weight')) {
      const nums = lower.match(/(\d+)/);
      if (nums) {
        setActiveInput('weight');
        setInputValue(nums[1]);
        setVoiceHint(`✅ Weight set to ${nums[1]} kg`);
        matched = true;
      }
    }
    if (!matched) {
      setVoiceHint('❌ Could not understand. Try: "Blood pressure 120 over 80"');
    }
  };

  useEffect(() => {
    let subscription: Pedometer.Subscription | null = null;
    const subscribeP = async () => {
      if (await Pedometer.isAvailableAsync()) {
        const start = new Date(); start.setHours(0,0,0,0);
        try {
          // getStepCountAsync for historical data is currently not supported by Expo on most Android setups
          if (Platform.OS === 'ios') {
            const past = await Pedometer.getStepCountAsync(start, new Date());
            if (past) setStepCount(past.steps);
          }
        } catch (e) {
          console.log("Pedometer past steps error:", e);
        }

        subscription = Pedometer.watchStepCount(res => {
          setStepCount(prev => prev + 1); // Mock trigger bump
        });
      }
    };
    if (Platform.OS !== 'web' && profile?.role === 'senior') subscribeP();
    return () => { subscription && subscription.remove(); };
  }, [profile]);

  useEffect(() => {
    if (session) fetchVitals();
  }, [session]);

  const handleLog = async () => {
    if (!activeInput || !inputValue.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const cfg = vitalConfig[activeInput];
    
    const calculatedStatus = calculateStatus(activeInput, inputValue.trim());

    await addReading({
      type: activeInput,
      value: inputValue.trim(),
      unit: cfg.unit,
      measured_at: new Date().toISOString(),
      status: calculatedStatus.toLowerCase(),
    });

    if (activeInput === 'bp') {
      const parts = inputValue.split('/');
      const systolic = parseInt(parts[0]);
      const diastolic = parseInt(parts[1]);
      
      if (systolic >= 140 || diastolic >= 90) {
        Alert.alert(
          '⚠️ High Blood Pressure Detected',
          'Your reading is high. To help bring it back to normal, consider these dietary adjustments:\n\n' +
          '✅ INCREASE: Leafy greens (spinach, kale), Berries, Bananas, Oatmeal, and Lentils.\n' +
          '❌ REDUCE: Salt (sodium), Processed meats, Pickles, and Canned soups.\n\n' +
          'Would you like to scan your next meal for a health check?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Scan Food 📸', onPress: () => router.push('/food-scanner') }
          ]
        );
      } else {
        Alert.alert('✅ Logged!', `${cfg.label} saved successfully.`);
      }
    } else {
      Alert.alert('✅ Logged!', `${cfg.label} saved successfully.`);
    }

    setInputValue('');
    setActiveInput(null);
  };

  const recentAlerts = readings
    .filter((r) => calculateStatus(r.type as VitalType, r.value) !== 'NORMAL' && calculateStatus(r.type as VitalType, r.value) !== 'RECORDED')
    .slice(0, 3);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <PremiumModal 
          visible={showPremiumModal} 
          onClose={() => setShowPremiumModal(false)}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]} accessible={true} accessibilityRole="header">
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]} maxFontSizeMultiplier={1.5}>Health</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]} maxFontSizeMultiplier={1.3}>Real-time monitoring & AI triage</Text>
            </View>
            {profile?.isPremium && (
              <TouchableOpacity 
                onPress={() => router.push('/premium-hub')}
                style={[styles.premiumBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              >
                <Ionicons name="star" size={16} color={colors.primary} />
                <Text style={[styles.premiumBadgeText, { color: colors.primary }]}>Premium Hub</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: Spacing.xl }}>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]} maxFontSizeMultiplier={1.3}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </Animated.View>

          {/* AI Symptom Checker Button */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginBottom: Spacing.xl }}>
            <TouchableOpacity 
              onPress={() => {
                if (profile?.isPremium) setShowAIChecker(true);
                else setShowPremiumModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="AI Symptom Triage"
              accessibilityHint="Describe your symptoms to receive instant health advice from our AI."
            >
              <LinearGradient colors={colors.primaryGradient} style={styles.aiCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.aiIconCircle} accessible={false}>
                  <Ionicons name="sparkles" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiCardTitle} maxFontSizeMultiplier={1.5}>AI Symptom Triage</Text>
                  <Text style={styles.aiCardSub} maxFontSizeMultiplier={1.3}>Describe how you feel for instant advice</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <HealthInsightCard readings={readings} />

          {profile?.role === 'senior' && (
            <>
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
                        accessibilityRole="button"
                        accessibilityLabel={`Log ${cfg.label}`}
                        accessibilityState={{ selected: active }}
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
                        <Text style={[styles.logChipText, { color: active ? '#FFF' : colors.text, fontSize: 13 * scale }]} maxFontSizeMultiplier={1.3}>{cfg.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

              {/* Voice Dictation Button */}
              <TouchableOpacity
                onPress={() => {
                  if (profile?.isPremium) setShowVoiceModal(true);
                  else setShowPremiumModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Log by voice"
                accessibilityHint="Say something like: My blood pressure is 120 over 80."
                style={[styles.voiceBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              >
                <Ionicons name="mic" size={22} color={colors.primary} />
                <Text style={[styles.voiceBtnText, { color: colors.primary, fontSize: 15 * scale }]} maxFontSizeMultiplier={1.5}>Voice Log</Text>
              </TouchableOpacity>

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
            </>
          )}

          {/* Wearable / Pedometer */}
          {profile?.role === 'senior' && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{x:0, y:0}} end={{x:1, y:1}}
                style={[styles.stepsCard, { elevation: 6, shadowColor: '#8B5CF6' }]}
                accessible={true}
                accessibilityLabel={`Daily Activity: ${stepCount.toLocaleString()} steps taken today.`}
              >
                <View style={styles.stepsInfo}>
                  <Text style={[styles.stepsTitle, { color: 'rgba(255,255,255,0.8)' }]} maxFontSizeMultiplier={1.3}>Daily Activity</Text>
                  <Text style={styles.stepsCount} maxFontSizeMultiplier={1.5}>{stepCount.toLocaleString()} <Text style={styles.stepsLabel}>steps</Text></Text>
                </View>
                <View style={styles.stepsIconBg} accessible={false}>
                  <Ionicons name="walk" size={36} color="#FFF" />
                </View>
              </LinearGradient>
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

          {/* Premium Report Button */}
          <TouchableOpacity 
            onPress={() => {
              if (profile?.isPremium) Alert.alert("Weekly Report", "Your AI weekly report is being generated. You will receive a notification when it is ready.");
              else setShowPremiumModal(true);
            }}
            style={[styles.reportBtn, { backgroundColor: colors.surface, borderColor: profile?.isPremium ? colors.primary : colors.border }]}
          >
            <Ionicons name="document-text" size={20} color={profile?.isPremium ? colors.primary : colors.textMuted} />
            <Text style={[styles.reportBtnText, { color: profile?.isPremium ? colors.primary : colors.textMuted }]}>
              {profile?.isPremium ? "View Weekly Health Report" : "Unlock Weekly AI Reports"}
            </Text>
            {!profile?.isPremium && <Ionicons name="lock-closed" size={14} color={colors.textMuted} />}
          </TouchableOpacity>

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
                      {vitalConfig[r.type as VitalType]?.label} was {calculateStatus(r.type as VitalType, r.value)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 * scale }}>
                      Value: {r.value} {r.unit} · {new Date(r.measured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {!profile?.isPremium && (
            <AdBannerPlaceholder onPressPremium={() => setShowPremiumModal(true)} />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showAIChecker} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <AISymptomChecker onClose={() => setShowAIChecker(false)} />
        </SafeAreaView>
      </Modal>

      <VoiceRecognitionSheet
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onResult={(transcript) => {
          parseVoiceInput(transcript);
          // Keep it open for a second so they see the ✅ checkmark status in the parser if I add one, 
          // or just close it if we want immediate action.
          setTimeout(() => setShowVoiceModal(false), 1500);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.md },
  title: { fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontWeight: '600', opacity: 0.6 },
  sectionTitle: { fontWeight: '800', marginBottom: Spacing.md, letterSpacing: -0.5 },
  stepsCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderRadius: Radius.xl, marginBottom: Spacing.xl, marginTop: Spacing.lg },
  stepsInfo: { gap: 4 },
  stepsTitle: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, fontSize: 13 },
  stepsCount: { fontWeight: '900', color: '#FFF', fontSize: 36, letterSpacing: -1 },
  stepsLabel: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  stepsIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
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
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xl, padding: Spacing.xl, elevation: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  aiIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  aiCardTitle: { color: '#FFF', fontWeight: '800', fontSize: 18 },
  aiCardSub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: Radius.full, borderWidth: 1.5, marginTop: Spacing.md },
  voiceBtnText: { fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  voiceModal: { borderTopLeftRadius: Radius.xl * 1.5, borderTopRightRadius: Radius.xl * 1.5, padding: Spacing.xl, paddingBottom: 40, gap: Spacing.lg, elevation: 20 },
  voiceModalTitle: { fontWeight: '800', fontSize: 22, letterSpacing: -0.5 },
  voiceModalHint: { fontWeight: '500', fontSize: 14, lineHeight: 20 },
  voiceInput: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.lg, fontSize: 17, minHeight: 80, textAlignVertical: 'top' },
  voiceActions: { flexDirection: 'row', gap: Spacing.md },
  voiceCancel: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, borderWidth: 1 },
  voiceConfirm: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: Radius.full },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  reportBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  syncedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.xl, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  insightIconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontWeight: '800' },
  insightSub: { fontWeight: '500', opacity: 0.7, lineHeight: 18 },
});

