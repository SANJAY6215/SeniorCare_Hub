import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    FadeInDown, 
    FadeInUp, 
    ZoomIn,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';


import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { getLocalizedPricing, formatPrice } from '@/lib/currency';
import { Spacing, Radius } from '@/constants/Typography';

const { width } = Dimensions.get('window');

const benefits = [
  { icon: 'megaphone-outline', text: 'Ad-Free Experience', sub: 'No interruptions, pure focus' },
  { icon: 'sparkles-outline', text: 'All AI Health Tools', sub: 'Pill ID, Diet Scan, Symptom Triage' },
  { icon: 'bluetooth-outline', text: 'IoT Smart Home Hub', sub: 'Link Withings, Apple & more' },
  { icon: 'people-outline', text: 'Unlimited Caregivers', sub: 'Whole family can stay linked' },
  { icon: 'time-outline', text: 'Full History & Trends', sub: 'Lifetime data retention' },
  { icon: 'videocam-outline', text: 'HD Video Calling', sub: 'Face-to-face with family' },
];

export default function PricingScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const router = useRouter();
  const { profile, session, updateProfile } = useUserStore();
  
  const [pricing, setPricing] = useState(getLocalizedPricing());
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    
    // TEMPORARY: Simulate successful payment until Stripe is fully integrated
    setTimeout(async () => {
        await updateProfile({ isPremium: true });
        setIsProcessing(false);
        setSuccess(true);
    }, 1500);
  };


  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 100], [1, 0]),
      transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -20]) }],
    };
  });

  if (success) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <Animated.View entering={ZoomIn.duration(600)} style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={100} color={colors.success} />
            </Animated.View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Welcome to Premium!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>Your life-saving tools are now fully unlocked.</Text>
            <TouchableOpacity 
                onPress={() => router.push('/(tabs)')}
                style={[styles.successBtn, { backgroundColor: colors.primary }]}
            >
                <Text style={styles.successBtnText}>Start Exploring</Text>
            </TouchableOpacity>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Background Glow */}
      <View style={styles.glowContainer} pointerEvents="none">
          <LinearGradient colors={[colors.primary + '20', 'transparent']} style={styles.glow} />
      </View>

      <Animated.ScrollView 
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Hero Section */}
        <Animated.View style={[styles.hero, headerStyle]}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.starCircle}>
                <Ionicons name="star" size={32} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text, fontSize: 36 * scale }]}>SeniorCare Hub</Text>
            <Text style={[styles.premiumTag, { color: colors.primary }]}>PREMIUM</Text>
        </Animated.View>

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
            {benefits.map((benefit, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(200 + i * 100).springify()} style={styles.benefitRow}>
                    <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                        <Ionicons name={benefit.icon as any} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.benefitText, { color: colors.text }]}>{benefit.text}</Text>
                        <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>{benefit.sub}</Text>
                    </View>
                </Animated.View>
            ))}
        </View>

        {/* Pricing Card */}
        <Animated.View entering={FadeInUp.delay(800)} style={[styles.pricingCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <View style={styles.priceHeader}>
                <Text style={[styles.priceCountry, { color: colors.textMuted }]}>Plan for {pricing.countryCode}</Text>
                <View style={styles.priceRow}>
                    <View style={styles.slashedPriceRow}>
                        <Text style={[styles.slashedCurrency, { color: colors.textMuted }]}>{pricing.symbol}</Text>
                        <Text style={[styles.slashedValue, { color: colors.textMuted }]}>99.99</Text>
                    </View>
                    <Text style={[styles.currency, { color: colors.text }]}>{pricing.symbol}</Text>
                    <Text style={[styles.priceValue, { color: colors.text }]}>0.00</Text>
                    <Text style={[styles.perMonth, { color: colors.textSecondary }]}>/month</Text>
                </View>
                {pricing.isOffer && (
                    <View style={[styles.offerBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.offerText, { color: colors.success }]}>Limited Time: 100% OFF for Seniors</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity 
                onPress={handleSubscribe}
                disabled={isProcessing}
                style={[styles.subscribeBtn, { backgroundColor: colors.primary }]}
            >
                {isProcessing ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <>
                        <Text style={styles.subscribeText}>Subscribe Now</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </>
                )}
            </TouchableOpacity>
            
            <Text style={styles.cancelText}>Cancel anytime. No hidden fees.</Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Processing Overlay */}
      {isProcessing && (
          <View style={styles.overlay}>
              <View style={[styles.processingBox, { backgroundColor: colors.surface }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.processingTitle, { color: colors.text }]}>Securing your connection...</Text>
                  <Text style={[styles.processingSub, { color: colors.textSecondary }]}>Contacting payment gateway</Text>
              </View>
          </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingTop: 60 },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  glowContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
  glow: { flex: 1 },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  starCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 15 },
  title: { fontWeight: '900', letterSpacing: -1, marginTop: 16 },
  premiumTag: { fontWeight: '900', letterSpacing: 4, fontSize: 13, marginTop: 4 },
  benefitsContainer: { gap: Spacing.xl, marginBottom: Spacing.xxl + 40 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  benefitText: { fontSize: 16, fontWeight: '800' },
  benefitSub: { fontSize: 13, fontWeight: '600', opacity: 0.7, marginTop: 2 },
  pricingCard: { padding: 32, borderRadius: Radius.xl, borderWidth: 2, alignItems: 'center', elevation: 20, shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 25 },
  priceHeader: { alignItems: 'center', marginBottom: 24 },
  priceCountry: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  currency: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  priceValue: { fontSize: 64, fontWeight: '900', lineHeight: 64 },
  perMonth: { fontSize: 16, fontWeight: '700', marginTop: 32, marginLeft: 4 },
  slashedPriceRow: { flexDirection: 'row', alignItems: 'flex-start', opacity: 0.6, marginRight: 16, marginTop: 12 },
  slashedCurrency: { fontSize: 16, fontWeight: '700', marginTop: 4, textDecorationLine: 'line-through' },
  slashedValue: { fontSize: 32, fontWeight: '800', textDecorationLine: 'line-through' },
  offerBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginTop: 12 },
  offerText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  subscribeBtn: { width: '100%', height: 64, borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  subscribeText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  cancelText: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 16, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  processingBox: { padding: 40, borderRadius: Radius.xl, alignItems: 'center', width: width * 0.8 },
  processingTitle: { fontSize: 18, fontWeight: '800', marginTop: 20 },
  processingSub: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  successIcon: { marginBottom: 30 },
  successTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  successSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, maxWidth: 280, lineHeight: 24 },
  successBtn: { marginTop: 40, paddingHorizontal: 40, paddingVertical: 18, borderRadius: Radius.full },
  successBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
