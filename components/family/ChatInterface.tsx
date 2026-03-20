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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTextScale } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/Typography';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore } from '@/stores/messageStore';

export default function ChatInterface() {
  const { colors } = useTheme();
  const scale = useTextScale();
  const profile = useUserStore((s) => s.profile);
  const { messages, fetchMessages, subscribeToMessages, unsubscribeFromMessages, sendMessage } = useMessageStore();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || !profile) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const text = inputText.trim();
    setInputText('');

    try {
      await sendMessage(text);
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    // Small delay ensures ScrollView has updated its content size before scrolling
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 16 * scale }]}>Care Team Chat</Text>
        <View style={styles.onlineBadge}>
          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.onlineText, { color: colors.textSecondary }]}>Online</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={{ padding: Spacing.md }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => {
          const isMyMessage = msg.sender_id === profile?.id;
          const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <Animated.View 
              key={msg.id}
              entering={FadeInUp.delay(0)}
              style={[
                styles.messageBubble,
                isMyMessage ? [styles.myMessage, { backgroundColor: colors.primary }] : [styles.otherMessage, { backgroundColor: colors.background, borderColor: colors.border }]
              ]}
            >
              {!isMyMessage && <Text style={[styles.senderName, { color: colors.primary }]}>{msg.sender_name}</Text>}
              <Text style={[styles.messageText, { color: isMyMessage ? '#FFF' : colors.text, fontSize: 15 * scale }]}>{msg.content}</Text>
              <Text style={[styles.timestamp, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{timeString}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, fontSize: 16 * scale }]}
            multiline
          />
          <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 400, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontWeight: '800' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  messagesList: { flex: 1 },
  messageBubble: { maxWidth: '80%', padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, borderWidth: 1 },
  myMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 2, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, borderBottomLeftRadius: Radius.lg, borderColor: 'transparent' },
  otherMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  senderName: { fontSize: 10, fontWeight: '800', marginBottom: 2, textTransform: 'uppercase' },
  messageText: { fontWeight: '500', lineHeight: 20 },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10, fontWeight: '500' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
