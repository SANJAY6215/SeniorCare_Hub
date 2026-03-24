import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import PremiumModal from '../components/premium/PremiumModal';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  steps: string[];
}

const EXERCISES: Exercise[] = [
  {
    id: '1',
    title: 'Seated Stretching',
    description: 'Gentle neck and shoulder stretches to improve mobility.',
    duration: 300,
    icon: 'body-outline',
    color: '#3B82F6',
    steps: [
      'Sit tall with feet flat on the floor.',
      'Gently tilt your head toward your right shoulder.',
      'Hold for 30 seconds and repeat on the left.',
      'Roll your shoulders backward 10 times.',
      'Reach both arms up towards the ceiling and hold.'
    ]
  },
  {
    id: '2',
    title: 'Balance Booster',
    description: 'Improve stability and prevent falls with simple poses.',
    duration: 180,
    icon: 'accessibility-outline',
    color: '#10B981',
    steps: [
      'Stand behind a sturdy chair for support.',
      'Slowly lift your right heel off the ground.',
      'Try to balance on one leg for 10-15 seconds.',
      'Lower and repeat with the left leg.',
      'Stand tall and look straight ahead.'
    ]
  },
  {
    id: '3',
    title: 'Deep Breathing',
    description: 'Calm the mind and improve lung capacity.',
    duration: 120,
    icon: 'leaf-outline',
    color: '#6366F1',
    steps: [
      'Sit or lie down in a comfortable position.',
      'Inhale slowly through your nose for 4 seconds.',
      'Hold your breath for 2 seconds.',
      'Exhale slowly through your mouth for 6 seconds.',
      'Repeat this cycle 5 times.'
    ]
  }
];

export default function ExercisesScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (activeExercise) {
        Speech.speak("Exercise completed! Great job.");
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startExercise = (exercise: Exercise) => {
    if (!profile?.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setActiveExercise(exercise);
    setTimeLeft(exercise.duration);
    setIsActive(true);
    setCurrentStep(0);
    Speech.speak(`Starting ${exercise.title}. ${exercise.description}`);
  };

  const stopExercise = () => {
    setIsActive(false);
    setActiveExercise(null);
    Speech.stop();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (activeExercise) {
    return (
      <SafeAreaView style={styles.activeContainer}>
        <LinearGradient colors={[activeExercise.color, '#1E293B']} style={styles.gradient} />
        
        <View style={[styles.activeHeader, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity onPress={stopExercise}>
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
          <Text style={styles.activeTitle}>{activeExercise.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerSub}>Time Remaining</Text>
        </View>

        <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsContent}>
          <Text style={styles.stepHeader}>Instructions</Text>
          {activeExercise.steps.map((step, index) => (
            <Animated.View 
              key={index} 
              entering={FadeInRight.delay(index * 200)}
              style={[styles.stepItem, currentStep === index && styles.activeStep]}
            >
              <Text style={[styles.stepNumber, currentStep === index && styles.activeStepText]}>{index + 1}</Text>
              <Text style={[styles.stepText, currentStep === index && styles.activeStepText]}>{step}</Text>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.activeControls}>
          <TouchableOpacity 
            style={[styles.controlBtn, isActive ? styles.pauseBtn : styles.resumeBtn]} 
            onPress={() => setIsActive(!isActive)}
          >
            <Ionicons name={isActive ? "pause" : "play"} size={32} color="white" />
            <Text style={styles.controlBtnText}>{isActive ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PremiumModal 
        visible={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
      />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Daily Exercises</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Stay active and healthy with these senior-friendly routines.</Text>
        
        {EXERCISES.map((ex, index) => (
          <Animated.View key={ex.id} entering={FadeInDown.delay(index * 100)}>
            <TouchableOpacity 
              style={styles.exerciseCard}
              onPress={() => startExercise(ex)}
            >
              <View style={[styles.iconContainer, { backgroundColor: ex.color + '20' }]}>
                <Ionicons name={ex.icon} size={32} color={ex.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{ex.title}</Text>
                <Text style={styles.cardDesc}>{ex.description}</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={styles.metaText}>{Math.floor(ex.duration / 60)} Minutes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 24,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '600',
  },
  activeContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 40,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  timerText: {
    fontSize: 80,
    fontWeight: '900',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: 18,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  stepsScroll: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
  },
  stepsContent: {
    paddingBottom: 40,
  },
  stepHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    lineHeight: 28,
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 18,
    color: '#CBD5E1',
    lineHeight: 26,
  },
  activeStep: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: -12,
  },
  activeStepText: {
    color: 'white',
    fontWeight: '600',
  },
  activeControls: {
    padding: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 20,
  },
  pauseBtn: {
    backgroundColor: '#EF4444',
  },
  resumeBtn: {
    backgroundColor: '#10B981',
  },
  controlBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
