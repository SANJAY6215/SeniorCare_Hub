import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Image, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Removed static Dimensions call for useWindowDimensions hook

const STEPS = [
  {
    id: 1,
    icon: 'heart-circle' as const,
    gradient: ['#6366F1', '#8B5CF6'] as [string, string],
    title: 'Welcome to\nSeniorCare Hub',
    body: 'Your all-in-one companion for managing health, medications, and staying connected with loved ones.',
    accent: '#8B5CF6',
  },
  {
    id: 2,
    icon: 'people' as const,
    gradient: ['#0EA5E9', '#6366F1'] as [string, string],
    title: 'Two Roles,\nOne Platform',
    body: 'Sign in as a Senior to manage your own health, or as a Caregiver to monitor and support your loved one remotely.',
    accent: '#0EA5E9',
  },
  {
    id: 3,
    icon: 'qr-code' as const,
    gradient: ['#10B981', '#0EA5E9'] as [string, string],
    title: 'Link with a\nFamily Code',
    body: 'Seniors get a unique 6-digit Family Code. Share it with your Caregiver and they\'ll be instantly connected to your health data.',
    accent: '#10B981',
  },
  {
    id: 4,
    icon: 'notifications' as const,
    gradient: ['#F59E0B', '#EF4444'] as [string, string],
    title: 'Never Miss\na Dose',
    body: 'Get timely reminders for all your medications. Your Caregiver is also notified if a dose is skipped — keeping everyone in the loop.',
    accent: '#F59E0B',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      scrollRef.current?.scrollTo({ x: prev * width, animated: true });
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/login');
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient that morphs with each step */}
      <LinearGradient colors={step.gradient} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity onPress={finish} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        onMomentumScrollEnd={(e) => {
          const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentStep(nextIndex);
        }}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {STEPS.map((s, i) => (
          <Animated.View key={s.id} style={[styles.slide, { width }]}>
            {/* Icon Circle */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.iconContainer}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={s.icon} size={80} color="#FFF" />
              </View>
            </Animated.View>

            {/* Text */}
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.textBlock}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </Animated.View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Dot Indicators */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { width: i === currentStep ? 28 : 8, backgroundColor: i === currentStep ? '#FFF' : 'rgba(255,255,255,0.4)' },
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}

        <TouchableOpacity
          onPress={isLast ? finish : goNext}
          style={styles.nextBtn}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>{isLast ? 'Get Started 🚀' : 'Next'}</Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { position: 'absolute', top: 56, right: 24, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  skipText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 40 },
  iconContainer: { marginBottom: 48 },
  iconCircle: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', elevation: 20, shadowColor: '#000', shadowRadius: 30, shadowOpacity: 0.3 },
  textBlock: { alignItems: 'center', gap: 16 },
  title: { fontSize: 36, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: -1, lineHeight: 42 },
  body: { fontSize: 17, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26, fontWeight: '500' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  backBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, marginLeft: 16 },
  nextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  nextText: { color: '#FFF', fontWeight: '800', fontSize: 17 },
});
