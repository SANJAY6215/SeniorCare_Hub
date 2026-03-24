import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import PremiumModal from '@/components/premium/PremiumModal';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { Spacing, Radius } from '@/constants/Typography';

function SettingRow({
  icon, iconColor, label, subtitle, rightContent, onPress, isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const scale = useTextScale();

  const content = (
    <View style={[styles.settingRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: colors.text, fontSize: 16 * scale }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingSub, { color: colors.textSecondary, fontSize: 12 * scale }]}>{subtitle}</Text>}
      </View>
      {rightContent ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
    </View>
  );

  if (onPress) return <TouchableOpacity onPress={onPress} style={styles.settingTouchable}>{content}</TouchableOpacity>;
  return <View style={styles.settingTouchable}>{content}</View>;
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { setDarkMode, setTextSize, updateProfile, signOut } = useUserStore();

  // Medical Profile Modal State
  const [showMedModal, setShowMedModal] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editConditions, setEditConditions] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const insets = useSafeAreaInsets();
  if (!profile) return null;

  const textSizeOptions: Array<'medium' | 'large' | 'extra-large'> = ['medium', 'large', 'extra-large'];
  const textSizeLabels: Record<string, string> = { medium: 'Medium', large: 'Large', 'extra-large': 'Extra Large' };

  const openMedModal = () => {
    setEditAge(profile.age?.toString() || '');
    setEditPhone(profile.phone || '');
    setEditHospital(profile.preferredHospital || '');
    setEditConditions((profile.conditions || []).join(', '));
    setShowMedModal(true);
  };

  const saveMedProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        age: parseInt(editAge) || profile.age,
        phone: editPhone.trim(),
        preferredHospital: editHospital.trim(),
        conditions: editConditions.split(',').map((c) => c.trim()).filter(Boolean),
      });
      setShowMedModal(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save medical profile.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* PREMIUM STATUS */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <PremiumModal 
            visible={showPremiumModal} 
            onClose={() => setShowPremiumModal(false)}
          />
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>SUBSCRIPTION</Text>
          <TouchableOpacity 
            onPress={() => !profile.isPremium && setShowPremiumModal(true)}
            activeOpacity={profile.isPremium ? 1 : 0.7}
          >
            <LinearGradient
              colors={profile.isPremium ? ['#10B981', '#059669'] : ['#6366F1', '#8B5CF6']}
              style={styles.premiumCard}
            >
              <View style={styles.premiumText}>
                <Text style={styles.premiumLabel}>{profile.isPremium ? 'Premium Active' : 'Upgrade to Premium'}</Text>
                <Text style={styles.premiumSub}>{profile.isPremium ? 'Enjoy all AI features infinity' : 'Unlock AI Scanner, Voice & more'}</Text>
              </View>
              <Ionicons name={profile.isPremium ? "checkmark-circle" : "star"} size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* APPEARANCE */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>APPEARANCE</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="moon"
              iconColor="#8B5CF6"
              label="Dark Mode"
              subtitle={isDark ? 'Comfortable for night' : 'Classic bright look'}
              rightContent={
                <Switch
                  value={isDark}
                  onValueChange={setDarkMode}
                  trackColor={{ false: colors.border, true: '#8B5CF6' }}
                  thumbColor="#FFF"
                />
              }
            />

            {/* Inline Text Size Picker — works on both web and native */}
            <View style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="text" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text, fontSize: 16 * scale }]}>Accessibility Text</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary, fontSize: 12 * scale }]}>{textSizeLabels[profile.textSize]}</Text>
                </View>
              </View>
              <View style={styles.textSizeRow}>
                {textSizeOptions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setTextSize(s)}
                    style={[
                      styles.textSizeChip,
                      {
                        backgroundColor: profile.textSize === s ? colors.primary : colors.background,
                        borderColor: profile.textSize === s ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.textSizeChipText, { color: profile.textSize === s ? '#FFF' : colors.text }]}>
                      {textSizeLabels[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* REMINDERS */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>REMINDERS</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="volume-high"
              iconColor="#F59E0B"
              label="Alert Sound"
              subtitle="Audible medication reminders"
              rightContent={
                <Switch
                  value={profile.soundEnabled}
                  onValueChange={(v) => updateProfile({ soundEnabled: v })}
                  trackColor={{ false: colors.border, true: '#F59E0B' }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              icon="mic"
              isLast
              iconColor={colors.primary}
              label="Voice Assistant"
              subtitle="Announce pill names aloud"
              rightContent={
                <Switch
                  value={profile.voiceAssistEnabled}
                  onValueChange={(v) => updateProfile({ voiceAssistEnabled: v })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
        </Animated.View>

        {/* SAFETY & CARE */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>SAFETY & CARE</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="people"
              iconColor="#F43F5E"
              label="Emergency Contacts"
              subtitle={`${profile.emergencyContacts?.length || 0} family members connected`}
              onPress={() => router.push('/family')}
            />
            <SettingRow
              icon="medical"
              isLast
              iconColor="#F43F5E"
              label="Medical Profile"
              subtitle={profile.preferredHospital ? `Hospital: ${profile.preferredHospital}` : 'Tap to complete your profile'}
              onPress={openMedModal}
            />
          </View>
        </Animated.View>

        {/* PREMIUM FEATURES (ONLY FOR PREMIUM) */}
        {profile.isPremium && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>PREMIUM EXCLUSIVES</Text>
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SettingRow
                icon="bluetooth"
                iconColor="#3B82F6"
                label="Smart Home Hub"
                subtitle="Manage IoT health devices"
                onPress={() => router.push('/iot-connect')}
              />
              <SettingRow
                icon="shield-checkmark"
                iconColor="#10B981"
                label="Medical Document Vault"
                subtitle="Secure encrypted storage"
                onPress={() => router.push('/vault')}
              />
              <SettingRow
                icon="restaurant"
                isLast
                iconColor="#F59E0B"
                label="AI Meal Planner"
                subtitle="Proactive nutrition engine"
                onPress={() => router.push('/meal-planner')}
              />
            </View>
          </Animated.View>
        )}

        {/* ACCOUNT */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>ACCOUNT</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity 
              onPress={() => {
                Alert.alert('Sign Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Log Out', 
                    style: 'destructive', 
                    onPress: async () => {
                      await signOut();
                      router.replace('/login');
                    } 
                  }
                ]);
              }}
              style={styles.settingTouchable}
            >
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: colors.danger + '15' }]}>
                  <Ionicons name="log-out" size={20} color={colors.danger} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: colors.danger, fontSize: 16 * scale }]}>Sign Out</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary, fontSize: 12 * scale }]}>Securely log out of your account</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LinearGradient
        colors={[colors.background + '00', colors.background]}
        style={styles.fadeBottom}
      />

      {/* ── MEDICAL PROFILE MODAL ── */}
      <Modal visible={showMedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.medModal, { backgroundColor: colors.surface }]}>
            <View style={styles.medModalHeader}>
              <Text style={[styles.medModalTitle, { color: colors.text }]}>Medical Profile</Text>
              <TouchableOpacity onPress={() => setShowMedModal(false)} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Age', placeholder: 'e.g. 72', value: editAge, onChange: setEditAge, keyboardType: 'numeric' as const },
                { label: 'Phone Number', placeholder: 'e.g. +91 98765 43210', value: editPhone, onChange: setEditPhone, keyboardType: 'phone-pad' as const },
                { label: 'Preferred Hospital / Clinic', placeholder: 'e.g. City General Hospital', value: editHospital, onChange: setEditHospital, keyboardType: 'default' as const },
                { label: 'Medical Conditions', placeholder: 'e.g. Diabetes, Hypertension (comma separated)', value: editConditions, onChange: setEditConditions, keyboardType: 'default' as const },
              ].map((field) => (
                <View key={field.label} style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={field.keyboardType}
                    style={[styles.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>
              ))}

              <TouchableOpacity
                onPress={saveMedProfile}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontWeight: '800', letterSpacing: -0.5 },
  content: { padding: Spacing.lg },
  sectionHeader: { fontWeight: '800', opacity: 0.6, letterSpacing: 1, marginTop: Spacing.xl, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  section: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  settingIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1, gap: 1 },
  settingLabel: { fontWeight: '700' },
  settingSub: { fontWeight: '500', opacity: 0.6 },
  settingTouchable: {},
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, pointerEvents: 'none' },
  textSizeRow: { flexDirection: 'row', gap: Spacing.sm, paddingLeft: 56, marginBottom: Spacing.sm },
  textSizeChip: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  textSizeChipText: { fontWeight: '700', fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  medModal: { borderTopLeftRadius: Radius.xl * 1.5, borderTopRightRadius: Radius.xl * 1.5, padding: Spacing.xl, paddingBottom: 0, maxHeight: '90%' },
  medModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  medModalTitle: { fontWeight: '800', fontSize: 22, letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  formGroup: { marginBottom: Spacing.lg },
  formLabel: { fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: 16, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: Radius.full, marginTop: Spacing.lg },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  premiumText: { flex: 1 },
  premiumLabel: { color: 'white', fontSize: 20, fontWeight: '900' },
  premiumSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
