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

  // Local Clinical Heuristic Engine (Prototype Mock AI)
  const processSymptom = (input: string) => {
    const text = input.toLowerCase();
    
    // Emergency Triggers
    if (text.includes('chest pain') || text.includes('heart attack') || text.includes('bleeding') || text.includes('stroke')) {
      return "🚨 CRITICAL WARNING 🚨\nThese symptoms suggest a severe medical emergency. Please press your SOS button immediately or dial emergency services.";
    }
    
    // High Urgency
    if (text.includes('dizzy') || text.includes('fainted') || text.includes('fall') || text.includes('can\'t breathe')) {
      return "I strongly advise you to sit down and rest immediately. Please contact your Caregiver or a doctor. Would you like me to trigger your SOS alert?";
    }

    // Common Symptoms
    if (text.includes('fever') || text.includes('hot')) {
      return "A fever indicates your body is fighting off an infection. Please stay hydrated and rest. If it exceeds 103°F (39.4°C) or lasts more than 3 days, schedule a doctor's visit.";
    }
    if (text.includes('headache') || text.includes('head hurts')) {
      return "Headaches can be caused by dehydration, stress, or lack of sleep. Try drinking a large glass of water and resting in a dark room. If it is the worst headache of your life, seek emergency care.";
    }
    if (text.includes('cough') || text.includes('cold')) {
      return "For a standard cough, warm tea with honey can act as a natural soother. If you are experiencing shortness of breath alongside the cough, please consult your doctor.";
    }

    // Default Fallback
    return "Thank you for sharing. Based on those symptoms, I recommend monitoring your condition closely and logging your vitals here in the app. If you feel worse, please contact your Caregiver.";
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking delay for realism
    setTimeout(() => {
      const aiResponseText = processSymptom(userMessage.text);
      const aiMessage: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: aiResponseText };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
