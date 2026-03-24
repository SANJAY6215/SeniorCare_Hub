import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { useTextScale } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/Typography';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

export default function AISymptomChecker({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const scale = useTextScale();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hi! I am your AI Health Assistant. What symptoms are you experiencing today?\n\n(Disclaimer: I am an AI prototype. Always consult a real doctor for medical advice.)' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Structured Triage Engine ---
  const [triageState, setTriageState] = useState<{
    stage: 'initial' | 'clarifying' | 'result';
    category?: string;
    subCategory?: string;
    answers: Record<string, string>;
  }>({ stage: 'initial', answers: {} });

  const SYMPTOM_DB: any = {
    cardiac: {
      triggers: ['chest pain', 'heart', 'tightness', 'left arm'],
      questions: [
        "Is the pain sharp, or does it feel like a heavy weight or pressure?",
        "Does the pain spread to your neck, jaw, or left arm?",
        "Are you also feeling short of breath or nauseous?"
      ],
      conclusion: (answers: any) => {
        const severe = answers[0]?.includes('pressure') || answers[1]?.includes('yes') || answers[2]?.includes('yes');
        if (severe) return "🚨 EMERGENCY ALERT: Your symptoms suggest a potential cardiac event. PLEASE CALL EMERGENCY SERVICES (911/112) AND PRESS YOUR SOS BUTTON IMMEDIATELY.";
        return "You are experiencing chest discomfort. While it may not be an immediate emergency, please rest and contact your doctor for an urgent appointment today.";
      }
    },
    respiratory: {
      triggers: ['breath', 'cough', 'wheezing', 'lungs'],
      questions: [
        "Is it difficult to breathe even while sitting still?",
        "Are you coughing up any colored phlegm or blood?",
        "Do you have a fever?"
      ],
      conclusion: (answers: any) => {
        if (answers[0]?.includes('yes')) return "🚩 URGENT: Difficulty breathing while resting is serious. Please contact your doctor or visit urgent care immediately.";
        return "It sounds like a respiratory issue. Rest, stay hydrated, and monitor your temperature. If breathing becomes difficult, seek immediate care.";
      }
    },
    neurological: {
      triggers: ['dizzy', 'faint', 'stroke', 'numb', 'speech'],
      questions: [
        "Are you experiencing any facial drooping or sudden weakness on one side?",
        "Is your speech slurred or are you having trouble finding words?",
        "When did these symptoms start exactly?"
      ],
      conclusion: (answers: any) => {
        if (answers[0]?.includes('yes') || answers[1]?.includes('yes')) return "🚨 CRITICAL: These could be signs of a stroke. EVERY MINUTE COUNTS. Call emergency services immediately.";
        return "Dizziness can be caused by dehydration or blood pressure changes. Please sit down, drink water, and notify your caregiver.";
      }
    },
    digestive: {
      triggers: ['stomach', 'belly', 'nausea', 'vomit', 'diarrhea'],
      questions: [
        "Where exactly is the pain located (Upper, Lower, Left, Right)?",
        "Is the pain sharp and stabbing, or a dull ache?",
        "Have you been able to kept fluids down today?"
      ],
      conclusion: (answers: any) => {
        if (answers[1]?.includes('sharp') && answers[0]?.includes('right')) return "🚩 URGENT: Sharp pain in the lower right abdomen could indicate appendicitis. Please consult a doctor immediately.";
        return "Digestive upset is common but needs monitoring. Focus on small sips of water. If the pain becomes severe or localized, seek medical advice.";
      }
    }
  };

  const processResponse = (userInput: string) => {
    const text = userInput.toLowerCase();
    
    // Stage 1: Initial Discovery
    if (triageState.stage === 'initial') {
      for (const cat in SYMPTOM_DB) {
        if (SYMPTOM_DB[cat].triggers.some((t: string) => text.includes(t))) {
          setTriageState({
            stage: 'clarifying',
            category: cat,
            answers: {}
          });
          return `I've noted your concern related to ${cat}. To help me understand better, ${SYMPTOM_DB[cat].questions[0]}`;
        }
      }
      return "I hear you. Could you tell me a bit more? For example, where exactly do you feel this, and how long has it been happening?";
    }

    // Stage 2: Clarifying Questions
    if (triageState.stage === 'clarifying' && triageState.category) {
      const cat = triageState.category;
      const currentQIndex = Object.keys(triageState.answers).length;
      const nextAnswers = { ...triageState.answers, [currentQIndex]: text };
      
      if (currentQIndex < SYMPTOM_DB[cat].questions.length - 1) {
        setTriageState({ ...triageState, answers: nextAnswers });
        return SYMPTOM_DB[cat].questions[currentQIndex + 1];
      } else {
        const finalResult = SYMPTOM_DB[cat].conclusion(nextAnswers);
        setTriageState({ stage: 'result', answers: {} }); // Reset for next time
        return `Thank you for those details.\n\n${finalResult}\n\nWould you like to review anything else?`;
      }
    }

    return "Thank you. Please remember I am an AI; for any health concerns, always contact your doctor or caregiver.";
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const user = useUserStore.getState().profile;
    if (!user) return;

    // Rate Limit AI requests
    const { data: canProceed } = await supabase.rpc('check_rate_limit', {
      target_identifier: user.id,
      target_endpoint: 'ai_health_query',
      max_hits: 10,
      window_minutes: 5
    });

    if (!canProceed) {
      Alert.alert('Too Many Requests', 'Please wait a few minutes before asking more health questions.');
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = processResponse(userMsg.text);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: 18 * scale }]}>Health AI</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={{ padding: Spacing.md }}
      >
        {messages.map((msg, i) => (
          <Animated.View 
            key={msg.id}
            entering={FadeInUp.delay(50)}
            style={[
              styles.messageBubble,
              msg.sender === 'user' ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.aiBubble, { backgroundColor: colors.background, borderColor: colors.border }]
            ]}
          >
            {msg.sender === 'ai' && <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginBottom: 4 }} />}
            <Text style={[styles.messageText, { color: msg.sender === 'user' ? '#FFF' : colors.text, fontSize: 15 * scale }]}>{msg.text}</Text>
          </Animated.View>
        ))}
        {isTyping && (
          <Animated.View entering={FadeInUp} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.background, borderColor: colors.border, paddingVertical: 12 }]}>
            <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>AI is analyzing...</Text>
          </Animated.View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your symptoms..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, fontSize: 16 * scale }]}
            multiline
          />
          <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: inputText.trim() ? 1 : 0.5 }]} disabled={!inputText.trim() || isTyping}>
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: Radius.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontWeight: '800' },
  closeBtn: { padding: 4 },
  chatArea: { flex: 1 },
  messageBubble: { maxWidth: '85%', padding: Spacing.md, borderRadius: Radius.xl, marginBottom: Spacing.md },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderTopLeftRadius: 4, borderWidth: 1 },
  messageText: { fontWeight: '500', lineHeight: 22 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: Radius.xl, paddingHorizontal: 16, paddingVertical: 12, fontWeight: '500' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
