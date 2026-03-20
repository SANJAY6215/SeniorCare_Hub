import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useMedicationStore } from '@/stores/medicationStore';
import { useUserStore } from '@/stores/userStore';
import { Colors } from '@/constants/Colors';
import { Spacing, Radius } from '@/constants/Typography';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function MedicationReminderModal() {
  const { colors } = useTheme();
  const scale = useTextScale();
  const profile = useUserStore((s) => s.profile);
  
  const {
    showReminderModal,
    setShowReminderModal,
    activeMedication,
    setActiveMedication,
    doseLogs,
    markTaken,
  } = useMedicationStore();

  useEffect(() => {
    if (showReminderModal && profile?.voiceAssistEnabled && activeMedication) {
      const text = `Time to take your ${activeMedication.name}. Dosage is ${activeMedication.dosage}. ${activeMedication.reason}`;
      if (Platform.OS === 'web') {
        const uttr = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(uttr);
      } else {
        try {
          const Speech = require('expo-speech');
          Speech.speak(text, { rate: 0.9, pitch: 1.0 });
        } catch (e) {
          console.error('Speech error:', e);
        }
      }
    }
    return () => {
      if (Platform.OS === 'web') {
        window.speechSynthesis.cancel();
      } else {
        try {
          const Speech = require('expo-speech');
          Speech.stop();
        } catch (e) {}
      }
    };
  }, [showReminderModal, activeMedication, profile?.voiceAssistEnabled]);

  // Animations
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(height * 0.4)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Button tap animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnColor = useRef(new Animated.Value(0)).current;

  // Success state
  const [takenSuccess, setTakenSuccess] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showReminderModal) {
      setTakenSuccess(false);
      checkScale.setValue(0);
      checkRotate.setValue(0);
      // Vibration pattern: short-long-short
      Vibration.vibrate([200, 400, 200]);

      // Backdrop fade in
      Animated.timing(backdropOpacity, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Card slide up + scale in
      Animated.parallel([
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out + slide down
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: height * 0.4, duration: 300, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      cardScale.setValue(0.85);
    }
  }, [showReminderModal]);

  const handleTaken = useCallback(() => {
    // Pop animation: 1 → 0.95 → 1.15 → 1.0
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.15, duration: 200, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setTakenSuccess(true);
      // Mark first pending dose as taken
      const pending = doseLogs.find((d) => d.status === 'pending' && d.medication_id === activeMedication?.id);
      if (pending) markTaken(pending.id);

      // Checkmark animation
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(checkRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowReminderModal(false);
        setActiveMedication(null);
      }, 2000);
    });
  }, [doseLogs, activeMedication, markTaken]);

  const handleSnooze = useCallback((minutes: number) => {
    setShowReminderModal(false);
    setActiveMedication(null);
  }, []);

  const handleNeedHelp = useCallback(() => {
    // Would open contact options in production
    setShowReminderModal(false);
  }, []);

  const checkRotateInterp = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!activeMedication) return null;

  return (
    <Modal
      visible={showReminderModal}
      transparent
      animationType="none"
      statusBarTranslucent
      accessible
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        accessibilityElementsHidden
      />

      <View style={styles.centeredView} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.background,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            },
          ]}
          accessible
          accessibilityLabel={`Medication reminder: Time for your ${activeMedication.name}`}
        >
          {/* ── HEADER ── */}
          <View style={[styles.header, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alarm" size={28} color="#D97706" />
            <Text
              style={[styles.headerTitle, { color: '#92400E', fontSize: 20 * scale }]}
              accessibilityRole="header"
            >
              Time for your medication!
            </Text>
          </View>

          {/* ── MED INFO ── */}
          <View style={styles.medInfo}>
            <View style={[styles.pillIconWrapper, { backgroundColor: activeMedication.color + '22' }]}>
              <Ionicons name="medical" size={56} color={activeMedication.color} />
            </View>
            <Text style={[styles.medName, { color: colors.text, fontSize: 24 * scale }]}>
              {activeMedication.name}
            </Text>
            <Text style={[styles.medDosage, { color: colors.textSecondary, fontSize: 18 * scale }]}>
              {activeMedication.dosage} · {activeMedication.frequency}
            </Text>
            <Text style={[styles.medReason, { color: colors.textMuted, fontSize: 14 * scale }]}>
              {activeMedication.reason}
            </Text>
          </View>

          {takenSuccess ? (
            /* ── SUCCESS STATE ── */
            <View style={styles.successContainer} accessible accessibilityLabel="Medication marked as taken. Great job!">
              <Animated.View
                style={{
                  transform: [{ scale: checkScale }, { rotate: checkRotateInterp }],
                }}
              >
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                </View>
              </Animated.View>
              <Text style={[styles.successText, { color: Colors.light.success, fontSize: 18 * scale }]}>
                Great job! Medication logged ✅
              </Text>
              <Text style={[styles.successSub, { color: colors.textSecondary, fontSize: 14 * scale }]}>
                Closing in a moment...
              </Text>
            </View>
          ) : (
            <>
              {/* ── TAKEN BUTTON ── */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={handleTaken}
                  accessible
                  accessibilityLabel="I took my medication"
                  accessibilityHint="Marks this medication as taken and logs it"
                  accessibilityRole="button"
                  style={styles.takenButton}
                >
                  <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                  <Text style={[styles.takenButtonText, { fontSize: 18 * scale }]}>
                    I TOOK MY MEDICATION
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* ── NEED HELP ── */}
              <TouchableOpacity
                onPress={handleNeedHelp}
                accessible
                accessibilityLabel="Need help with medication"
                accessibilityHint="Opens options to call family or doctor"
                accessibilityRole="button"
                style={[styles.helpButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="help-circle" size={22} color={colors.textSecondary} />
                <Text style={[styles.helpButtonText, { color: colors.text, fontSize: 16 * scale }]}>
                  Need Help?
                </Text>
              </TouchableOpacity>

              {/* ── SNOOZE OPTIONS ── */}
              <View style={styles.snoozeRow}>
                <Text style={[styles.snoozeLabel, { color: colors.textSecondary, fontSize: 13 * scale }]}>
                  Remind me later:
                </Text>
                <View style={styles.snoozeButtons}>
                  {[15, 30, 60].map((min) => (
                    <TouchableOpacity
                      key={min}
                      onPress={() => handleSnooze(min)}
                      accessible
                      accessibilityLabel={`Snooze for ${min} minutes`}
                      accessibilityRole="button"
                      style={[styles.snoozeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Text style={[styles.snoozeBtnText, { color: colors.text, fontSize: 13 * scale }]}>
                        {min < 60 ? `${min} min` : '1 hour'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.lg,
  },
  headerTitle: { fontWeight: '800', flex: 1 },
  medInfo: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  pillIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  medName: { fontWeight: '800', textAlign: 'center' },
  medDosage: { fontWeight: '500', textAlign: 'center' },
  medReason: { textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 8, lineHeight: 20 },
  takenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    minHeight: 64,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    elevation: 3,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  takenButtonText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.5 },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  helpButtonText: { fontWeight: '600' },
  snoozeRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 8 },
  snoozeLabel: { textAlign: 'center', fontWeight: '500' },
  snoozeButtons: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  snoozeBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  snoozeBtnText: { fontWeight: '600' },
  successContainer: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: Spacing.lg },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  successText: { fontWeight: '800', textAlign: 'center' },
  successSub: { fontWeight: '400' },
});
