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
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
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
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        await sendMessage('', { uri: result.assets[0].uri, type: 'image' });
      } catch (error) {
        Alert.alert('Upload Failed', 'Could not send image.');
      }
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      try {
        await recording?.stopAndUnloadAsync();
        const uri = recording?.getURI();
        if (uri) {
          await sendMessage('', { uri, type: 'audio' });
        }
      } catch (error) {
        console.error(error);
      }
      setRecording(null);
    } else {
      // Start recording
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') return;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      } catch (error) {
        console.error(error);
      }
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
              
              {msg.media_url && msg.media_type === 'image' && (
                <Animated.Image 
                  source={{ uri: msg.media_url }} 
                  style={styles.messageImage} 
                  resizeMode="cover"
                />
              )}

              {msg.media_url && msg.media_type === 'audio' && (
                <TouchableOpacity 
                  style={styles.audioBubble}
                  onPress={async () => {
                    const { sound } = await Audio.Sound.createAsync({ uri: msg.media_url || '' });
                    await sound.playAsync();
                  }}
                >
                  <Ionicons name="play-circle" size={32} color={isMyMessage ? '#FFF' : colors.primary} />
                  <Text style={[styles.audioText, { color: isMyMessage ? '#FFF' : colors.text }]}>Voice Note</Text>
                </TouchableOpacity>
              )}

              {msg.content ? (
                <Text style={[styles.messageText, { color: isMyMessage ? '#FFF' : colors.text, fontSize: 15 * scale }]}>{msg.content}</Text>
              ) : null}
              <Text style={[styles.timestamp, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{timeString}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handlePickImage} style={styles.iconBtn}>
            <Ionicons name="image" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleRecording} style={styles.iconBtn}>
            <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color={isRecording ? colors.danger : colors.primary} />
          </TouchableOpacity>
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
  iconBtn: { padding: 4 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10, fontWeight: '500' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  messageImage: { width: 240, height: 180, borderRadius: Radius.md, marginBottom: 8 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  audioText: { fontWeight: '700', fontSize: 14 },
});
