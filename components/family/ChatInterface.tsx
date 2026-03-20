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
import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/Typography';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  timestamp: string;
  isMe?: boolean; // We will compute this dynamically
}

export default function ChatInterface() {
  const { colors } = useTheme();
  const scale = useTextScale();
  const profile = useUserStore((s) => s.profile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    
    const familyId = profile?.role === 'senior' ? profile?.id : profile?.linkedSeniorId;
    if (!familyId) return;

    // Subscribe to realtime inserts on messages table, filtered to THIS family only
    const channel = supabase
      .channel(`room_${familyId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.linkedSeniorId, profile?.role]);

  const fetchMessages = async () => {
    if (!profile) return;
    const familyId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;

    if (!familyId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data as Message[]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !profile) return;
    
    const familyId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!familyId) {
      Alert.alert('Error', 'Family connection not found.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const text = inputText.trim();
    setInputText('');

    const msg = {
      family_id: familyId,
      sender_id: profile.id,
      sender_name: profile.firstName || (profile.role === 'senior' ? 'Senior' : 'Caregiver'),
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const { error } = await supabase.from('messages').insert([msg]);
    if (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Could not send message. Please try again.');
    } else {
      // Force an immediate re-fetch to ensure the UI updates instantly 
      // even if WebSockets are taking a moment to round-trip.
      fetchMessages();
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: 16 * scale }]}>Care Team Chat</Text>
        <View style={styles.onlineBadge}>
          <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.onlineText, { color: colors.textSecondary }]}>3 Online</Text>
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
          return (
            <Animated.View 
              key={msg.id}
              entering={FadeInUp.delay(i * 50)}
              style={[
                styles.messageBubble,
                isMyMessage ? [styles.myMessage, { backgroundColor: colors.primary }] : [styles.otherMessage, { backgroundColor: colors.background, borderColor: colors.border }]
              ]}
            >
              {!isMyMessage && <Text style={[styles.senderName, { color: colors.primary }]}>{msg.sender_name}</Text>}
              <Text style={[styles.messageText, { color: isMyMessage ? '#FFF' : colors.text, fontSize: 15 * scale }]}>{msg.text}</Text>
              <Text style={[styles.timestamp, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{msg.timestamp}</Text>
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
