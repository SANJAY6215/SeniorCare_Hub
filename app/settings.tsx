import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  Layout,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { Spacing, Radius } from '@/constants/Typography';
import { Colors } from '@/constants/Colors';

function SettingRow({
  icon,
  iconColor,
  label,
  subtitle,
  rightContent,
  onPress,
  isLast = false,
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

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.settingTouchable}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.settingTouchable}>{content}</View>;
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { setDarkMode, setTextSize, updateProfile } = useUserStore();

  if (!profile) return null;

  const textSizeOptions: Array<'medium' | 'large' | 'extra-large'> = ['medium', 'large', 'extra-large'];
  const textSizeLabels: Record<string, string> = { medium: 'Medium', large: 'Large', 'extra-large': 'Extra Large' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
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
            <SettingRow
              icon="text"
              iconColor={colors.primary}
              label="Accessibility Text"
              subtitle={textSizeLabels[profile.textSize] || 'Medium'}
              isLast
              onPress={() =>
                Alert.alert('Text Size', 'Choose a comfortable reading size:', textSizeOptions.map((s) => ({
                  text: textSizeLabels[s] + (profile.textSize === s ? ' ✓' : ''),
                  onPress: () => setTextSize(s),
                })))
              }
            />
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

        {/* SAFETY */}
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
              label="Preferred Hospital"
              subtitle={profile.preferredHospital || 'None set'}
              onPress={() => Alert.alert('Medical Profile', 'Edit medical details feature coming soon.')}
            />
          </View>
        </Animated.View>

        {/* ABOUT */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>ABOUT</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow icon="help-circle" iconColor={colors.textSecondary} label="Help Center" onPress={() => {}} />
            <SettingRow icon="information-circle" isLast iconColor={colors.textSecondary} label="App Version" subtitle="1.0.0 (Premium)" />
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LinearGradient
        colors={[colors.background + '00', colors.background]}
        style={styles.fadeBottom}
      />
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
});
