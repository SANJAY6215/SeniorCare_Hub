import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import VoiceRecognitionSheet from '../health/VoiceRecognitionSheet';
import { useUserStore } from '../../stores/userStore';
import { useVitalsStore } from '../../stores/vitalsStore';
import { LinearGradient } from 'expo-linear-gradient';
import PremiumModal from '../premium/PremiumModal';
import { Alert } from 'react-native';

export default function VoiceAssistant() {
  const [visible, setVisible] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const router = useRouter();
  const { profile, updateProfile } = useUserStore();
  const { addReading } = useVitalsStore();

  const handleResult = async (transcript: string) => {
    setVisible(false);
    
    try {
      // 1. Local fast parser for simple commands
      const lower = transcript.toLowerCase();
      
      if (lower.includes('medication') || lower.includes('pill') || lower.includes('medicine')) {
        Speech.speak("Opening your medications list.");
        router.push('/(tabs)/medications');
        return;
      }
      
      if (lower.includes('caregiver') || lower.includes('stat') || lower.includes('chart')) {
        Speech.speak("Switching to caregiver view.");
        router.push('/caregiver');
        return;
      }

      if (lower.includes('scan food') || lower.includes('diet')) {
        Speech.speak("Opening food scanner.");
        router.push('/food-scanner');
        return;
      }

      if (lower.includes('exercise') || lower.includes('workout')) {
        Speech.speak("Opening daily exercises.");
        router.push('/exercises');
        return;
      }

      if (lower.includes('sleep')) {
        Speech.speak("Opening sleep tracker.");
        router.push('/sleep');
        return;
      }

      // 2. Gemini AI parser for complex intents/vitals
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        Speech.speak("I understood you said: " + transcript + ", but I'm having trouble processing that right now.");
        return;
      }

      const prompt = `
        You are a voice assistant for a senior care app.
        The user said: "${transcript}"
        
        Determine the intent and extract details. 
        Possible intents: 
        - LOG_VITAL (type: bp, hr, glucose, spo2, weight. value: string)
        - NAVIGATION (screen: medications, health, family, home, settings, exercises, sleep, food_scanner)
        - UNKNOWN

        Return ONLY a JSON object:
        { "intent": "INTENT_TYPE", "details": { "type": "...", "value": "..." } or { "screen": "..." } }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("AI Parser failed");

      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);

      if (aiResult.intent === 'LOG_VITAL') {
        const { type, value } = aiResult.details;
        const units: any = { bp: 'mmHg', hr: 'bpm', glucose: 'mg/dL', spo2: '%', weight: 'kg' };
        
        await addReading({
          type: type as any,
          value: value,
          unit: units[type] || '',
          measured_at: new Date().toISOString(),
          status: 'logged_by_voice'
        });
        
        Speech.speak(`Logged ${type} as ${value} ${units[type] || ''}`);
        router.push('/(tabs)/health');
      } else if (aiResult.intent === 'NAVIGATION') {
        const screen = aiResult.details.screen;
        const routes: any = {
          medications: '/(tabs)/medications',
          health: '/(tabs)/health',
          family: '/(tabs)/family',
          home: '/(tabs)/',
          settings: '/settings',
          exercises: '/exercises',
          sleep: '/sleep',
          food_scanner: '/food-scanner'
        };
        if (routes[screen]) {
          Speech.speak(`Opening ${screen}`);
          router.push(routes[screen]);
        }
      } else {
        Speech.speak("I heard you say " + transcript + ", but I'm not sure what to do. Try saying 'Open medications' or 'Log blood pressure 120 over 80'.");
      }

    } catch (err) {
      console.log('Voice Assistant AI error:', err);
      Speech.speak("Sorry, I couldn't process that. Please try again.");
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.floatingBtn}
        onPress={() => {
          if (!profile?.isPremium) {
            setShowPremiumModal(true);
          } else {
            setVisible(true);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.gradient}
        >
          <Ionicons name="mic" size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <PremiumModal 
        visible={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
      />

      <VoiceRecognitionSheet 
        visible={visible}
        onClose={() => setVisible(false)}
        onResult={handleResult}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
