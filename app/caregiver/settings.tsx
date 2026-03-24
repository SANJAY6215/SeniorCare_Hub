import React from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function CaregiverSettings() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { profile, updateProfile, signOut, setDarkMode } = useUserStore();

  const insets = useSafeAreaInsets();
  if (!profile) return null;

  const handleUnlink = () => {
    Alert.alert(
      'Unlink Senior',
      'Are you sure you want to stop monitoring this senior? You will need their family code to link again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await updateProfile({ linkedSeniorId: undefined });
              router.replace('/login');
            } catch (e) {
              Alert.alert('Error', 'Failed to unlink senior.');
            }
          } 
        }
      ]
    );
  };

  const handleLogout = () => {
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
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontSize: 24 * scale }]}>Caregiver Settings</Text>
        <View style={{ width: 44 }} />
      </View>

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
              isLast
              rightContent={
                <Switch
                  value={isDark}
                  onValueChange={setDarkMode}
                  trackColor={{ false: colors.border, true: '#8B5CF6' }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
        </Animated.View>

        {/* NOTIFICATIONS */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>NOTIFICATIONS</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="notifications"
              iconColor="#3B82F6"
              label="Missed Dose Alerts"
              subtitle="Get notified if senior skips meds"
              rightContent={
                <Switch
                  value={profile.soundEnabled} // Using existing fields for simplicity or adding new ones
                  onValueChange={(v) => updateProfile({ soundEnabled: v })}
                  trackColor={{ false: colors.border, true: '#3B82F6' }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              icon="pulse"
              iconColor="#EF4444"
              label="Vitals Alerts"
              subtitle="Emergency alerts for high/low readings"
              isLast
              rightContent={
                <Switch
                  value={profile.vibrationEnabled}
                  onValueChange={(v) => updateProfile({ vibrationEnabled: v })}
                  trackColor={{ false: colors.border, true: '#EF4444' }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>
        </Animated.View>

        {/* SENIOR MANAGEMENT */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>SENIOR MANAGEMENT</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="link-outline"
              iconColor="#F59E0B"
              label="Unlink Senior"
              subtitle="Stop monitoring current profile"
              onPress={handleUnlink}
              isLast
            />
          </View>
        </Animated.View>

        {/* ACCOUNT */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontSize: 13 * scale }]}>ACCOUNT</Text>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              icon="log-out"
              iconColor={colors.danger}
              label="Sign Out"
              subtitle="Securely log out of your session"
              onPress={handleLogout}
              isLast
            />
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
});
