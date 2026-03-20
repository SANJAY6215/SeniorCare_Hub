import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  Layout,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { useTextScale } from '@/hooks/useTheme';
import { useUserStore } from '@/stores/userStore';
import { Spacing, Radius } from '@/constants/Typography';
import { Colors } from '@/constants/Colors';
import ChatInterface from '@/components/family/ChatInterface';

const mockMessages = [
  { id: 'm1', from: 'Sarah Johnson', relation: 'Daughter', text: 'Hi Mom! Did you take your morning pills? 💊', time: '9:15 AM', read: true, avatar: '👩' },
  { id: 'm2', from: 'Tom Johnson', relation: 'Son', text: 'Love you! See you Sunday for dinner 🍕', time: 'Yesterday', read: true, avatar: '👨' },
  { id: 'm3', from: 'Dr. Mary Chen', relation: 'Doctor', text: 'Your BP readings look great this week! Keep it up.', time: 'Mon', read: false, avatar: '👩‍⚕️' },
];

const quickReplies = ['Yes ✅', 'No ❌', 'Call me 📞', 'Love you ❤️', 'Feeling good 😊'];

export default function FamilyScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const { profile, updateProfile } = useUserStore();

  const [showAddContact, setShowAddContact] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRel, setNewRel] = useState('');

  if (!profile) return null;

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Error', 'Name and Phone are required.');
      return;
    }
    const newContact = {
      id: Date.now().toString(),
      name: newName.trim(),
      relationship: newRel.trim() || 'Family',
      phone: newPhone.trim(),
      isPrimary: profile.emergencyContacts.length === 0,
    };
    await updateProfile({
      emergencyContacts: [...profile.emergencyContacts, newContact]
    });
    setShowAddContact(false);
    setNewName('');
    setNewPhone('');
    setNewRel('');
  };

  const setAsPrimary = async (id: string) => {
    const updated = profile.emergencyContacts.map(c => 
      c.id === id ? { ...c, isPrimary: true } : { ...c, isPrimary: false }
    );
    await updateProfile({ emergencyContacts: updated });
  };

  const handleCall = (contact: any) => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`).catch(() => 
        Alert.alert('Calling', `Calling ${contact.name}...`)
      );
    } else {
      Alert.alert('Calling', `Calling ${contact.name}...`);
    }
  };

  const handleMessage = (msg: any) => {
    Alert.alert(`Message from ${msg.from}`, msg.text, [
      { text: 'Close' },
      { text: 'Reply', onPress: () => Alert.alert('Reply', 'Voice or text reply coming soon!') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]}>Family & Care</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * scale }]}>
            Stay connected with your loved ones
          </Text>
        </Animated.View>

        {/* Quick Call Section */}
        <View style={styles.sectionHeaderLine}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Emergency Contacts</Text>
          {profile.role === 'senior' && (
            <TouchableOpacity onPress={() => setShowAddContact(true)} style={styles.addBtn}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {profile.emergencyContacts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="shield-outline" size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>No emergency contacts added. The SOS button will default to 911.</Text>
          </View>
        ) : (
          profile.emergencyContacts.map((contact, i) => (
            <Animated.View 
              key={contact.id} 
              entering={FadeInDown.delay(i * 100).springify()}
              layout={Layout.springify()}
            >
              <TouchableOpacity
                onPress={() => handleCall(contact)}
                onLongPress={() => profile.role === 'senior' && setAsPrimary(contact.id)}
                delayLongPress={500}
                style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.avatarContainer, { backgroundColor: contact.isPrimary ? colors.primaryLight : colors.background }]}>
                  <Ionicons name="person" size={24} color={contact.isPrimary ? colors.primary : colors.textSecondary} />
                </View>
                
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.text, fontSize: 17 * scale }]}>
                    {contact.name}
                    {contact.isPrimary && <Text style={{ color: colors.primary }}> ★</Text>}
                  </Text>
                  <Text style={[styles.contactRelation, { color: colors.textSecondary, fontSize: 13 * scale }]}>{contact.relationship}</Text>
                </View>

                <LinearGradient
                  colors={colors.successGradient}
                  style={styles.callCircle}
                >
                  <Ionicons name="call" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        {/* Real-time Care Chat */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: Spacing.xl }}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Care Coordination</Text>
          <ChatInterface />
        </Animated.View>

        {/* Messages */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Recent Messages</Text>
        </View>

        {mockMessages.map((msg, i) => (
          <Animated.View 
            key={msg.id} 
            entering={FadeInRight.delay(400 + i * 100).springify()}
          >
            <TouchableOpacity
              onPress={() => handleMessage(msg)}
              style={[
                styles.msgCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: msg.read ? colors.border : colors.primary,
                },
              ]}
            >
              <View style={styles.msgAvatarWrapper}>
                <Text style={styles.msgAvatarText}>{msg.avatar}</Text>
                {!msg.read && <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />}
              </View>
              
              <View style={styles.msgContent}>
                <View style={styles.msgHeader}>
                  <Text style={[styles.msgFrom, { color: colors.text, fontSize: 16 * scale }]}>{msg.from}</Text>
                  <Text style={[styles.msgTime, { color: colors.textMuted, fontSize: 12 * scale }]}>{msg.time}</Text>
                </View>
                <Text style={[styles.msgText, { color: colors.textSecondary, fontSize: 14 * scale }]} numberOfLines={1}>
                  {msg.text}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Quick Replies */}
        <View style={styles.repliesRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.repliesScroll}>
            {quickReplies.map((reply, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => Alert.alert('Reply Sent', `"${reply}" sent`)}
                style={[styles.replyChip, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.replyText, { color: colors.text, fontSize: 14 * scale }]}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Premium Video Call Card */}
        <LinearGradient
          colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.videoCard}
        >
          <View style={styles.videoIconCircle}>
            <Ionicons name="videocam" size={28} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle}>Family Video Call</Text>
            <Text style={styles.videoSub}>Start a face-to-face conversation</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Video Call', 'Starting call...')}
            style={styles.videoStartBtn}
          >
            <Text style={styles.videoBtnText}>Start</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={showAddContact} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContact(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]} value={newName} onChangeText={setNewName} placeholder="Jane Doe" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number (Include Country Code)</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]} value={newPhone} onChangeText={setNewPhone} placeholder="+1 555-0199" keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Relationship</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]} value={newRel} onChangeText={setNewRel} placeholder="Daughter" placeholderTextColor={colors.textMuted} />
            </View>
            
            <TouchableOpacity onPress={handleAddContact} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.saveBtnText}>Save Contact</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.md },
  title: { fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontWeight: '600', opacity: 0.6 },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '800', letterSpacing: -0.5 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  avatarContainer: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontWeight: '800', letterSpacing: -0.3 },
  contactRelation: { fontWeight: '600', opacity: 0.7 },
  callCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  msgCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.sm },
  msgAvatarWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  msgAvatarText: { fontSize: 24 },
  unreadBadge: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  msgContent: { flex: 1, gap: 2 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msgFrom: { fontWeight: '800' },
  msgTime: { fontWeight: '600', opacity: 0.5 },
  msgText: { fontWeight: '500' },
  repliesRow: { marginHorizontal: -Spacing.lg, marginBottom: Spacing.xxl },
  repliesScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  replyChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1 },
  replyText: { fontWeight: '700' },
  videoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xl, padding: Spacing.xl, elevation: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  videoIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  videoTitle: { color: '#FFF', fontWeight: '800', fontSize: 18 },
  videoSub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 13 },
  videoStartBtn: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md },
  videoBtnText: { color: '#6366F1', fontWeight: '800' },
  sectionHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  addBtnText: { fontWeight: '700' },
  emptyCard: { padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { height: 50, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 16, fontWeight: '500' },
  saveBtn: { height: 50, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

