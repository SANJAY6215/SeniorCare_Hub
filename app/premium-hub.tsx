import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { Radius, Spacing } from '@/constants/Typography';

function HubCard({ 
    title, sub, icon, colors: gradientColors, onPress, index 
}: { 
    title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; colors: string[]; onPress: () => void; index: number 
}) {
    const { colors } = useTheme();
    return (
        <Animated.View entering={FadeInDown.delay(index * 150).springify()}>
            <TouchableOpacity onPress={onPress}>
                <LinearGradient colors={gradientColors} style={styles.hubCard} start={{x:0, y:0}} end={{x:1, y:1}}>
                    <View style={styles.hubIconCircle}>
                        <Ionicons name={icon} size={28} color={gradientColors[0]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.hubTitle}>{title}</Text>
                        <Text style={styles.hubSub}>{sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function PremiumHubScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { profile } = useUserStore();

  if (!profile?.isPremium) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="star" size={64} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 20 }}>Premium Access Required</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 16 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Go Back</Text>
            </TouchableOpacity>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Premium Header */}
        <View style={styles.header}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]}>Premium Hub</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Advanced Health Suite</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
                <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>

        <View style={styles.grid}>
            <HubCard 
                index={0}
                title="Smart Home Hub"
                sub="Connect Withings, Apple & IoT devices"
                icon="bluetooth"
                colors={['#3B82F6', '#2563EB']}
                onPress={() => router.push('/iot-connect')}
            />
            <HubCard 
                index={1}
                title="Medical Vault"
                sub="Encrypted Document Storage"
                icon="shield-checkmark"
                colors={['#10B981', '#059669']}
                onPress={() => router.push('/vault')}
            />
            <HubCard 
                index={2}
                title="AI Meal Planner"
                sub="Condition-Aware Nutrition"
                icon="restaurant"
                colors={['#F59E0B', '#D97706']}
                onPress={() => router.push('/meal-planner')}
            />
            <HubCard 
                index={3}
                title="Daily Exercises"
                sub="Gated Mobility Routines"
                icon="fitness"
                colors={['#8B5CF6', '#7C3AED']}
                onPress={() => router.push('/exercises')}
            />
             <HubCard 
                index={4}
                title="Voice Assistant"
                sub="Full Natural Language Control"
                icon="mic"
                colors={['#EC4899', '#DB2777']}
                onPress={() => router.push('/health')}
            />
        </View>

        {/* Feature Spotlight */}
        <Animated.View entering={FadeInDown.delay(800)} style={[styles.spotlight, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.spotlightTitle, { color: colors.text }]}>Premium Benefit</Text>
            <Text style={[styles.spotlightText, { color: colors.textSecondary }]}>
                You are currently saving 45 minutes a week on manual logging thanks to your connected IoT devices.
            </Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LinearGradient colors={['rgba(0,0,0,0)', isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)']} style={styles.fade} pointerEvents="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xxl, marginTop: Spacing.xl },
  title: { fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontWeight: '600', opacity: 0.6, fontSize: 16 },
  closeBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: Spacing.lg },
  hubCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, borderRadius: Radius.xl, gap: Spacing.lg, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  hubIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  hubTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  hubSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  spotlight: { marginTop: Spacing.xxl, padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed' },
  spotlightTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  spotlightText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
});
