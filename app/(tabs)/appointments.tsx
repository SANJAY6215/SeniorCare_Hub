import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
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
import { Spacing, Radius } from '@/constants/Typography';
import { Colors } from '@/constants/Colors';

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  phone: string;
  notes: string;
  type: 'upcoming' | 'past';
}

const mockAppointments: Appointment[] = [
  { id: 'a1', doctor: 'Dr. Mary Chen', specialty: 'Primary Care', date: 'Mar 25, 2026', time: '10:00 AM', location: 'City Medical Center, 123 Main St', phone: '+1 555-0200', notes: 'Annual check-up. Bring insurance card and medication list.', type: 'upcoming' },
  { id: 'a2', doctor: 'Dr. James Wilson', specialty: 'Cardiologist', date: 'Apr 02, 2026', time: '2:30 PM', location: 'Heart Health Clinic, 456 Oak Ave', phone: '+1 555-0300', notes: 'Blood pressure review. Bring last 30 days of BP readings.', type: 'upcoming' },
  { id: 'a3', doctor: 'Dr. Sarah Lee', specialty: 'Endocrinologist', date: 'Feb 15, 2026', time: '11:00 AM', location: 'Diabetes Care Center', phone: '+1 555-0400', notes: 'Diabetes management review', type: 'past' },
];

function AppointmentCard({ appt, index }: { appt: Appointment; index: number }) {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const isUpcoming = appt.type === 'upcoming';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={[styles.apptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.apptHeader}>
        <LinearGradient
          colors={isUpcoming ? colors.primaryGradient : [colors.card, colors.card]}
          style={styles.apptIcon}
        >
          <Ionicons name="calendar" size={22} color={isUpcoming ? '#FFF' : colors.textSecondary} />
        </LinearGradient>
        
        <View style={styles.apptInfo}>
          <Text style={[styles.doctorName, { color: colors.text, fontSize: 18 * scale }]}>{appt.doctor}</Text>
          <Text style={[styles.specialty, { color: colors.textSecondary, fontSize: 13 * scale }]}>{appt.specialty}</Text>
        </View>

        {isUpcoming && (
          <View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.statusText, { color: colors.primary }]}>UPCOMING</Text>
          </View>
        )}
      </View>

      <View style={styles.apptDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={[styles.detailText, { color: colors.text }]}>{appt.date} · {appt.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{appt.location}</Text>
        </View>
        {appt.notes && (
          <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{appt.notes}</Text>
          </View>
        )}
      </View>

      {isUpcoming && (
        <View style={styles.apptActions}>
          <TouchableOpacity
            onPress={() => {
              if (appt.phone) {
                Linking.openURL(`tel:${appt.phone}`).catch(() => 
                  Alert.alert('Error', 'Could not open phone dialer')
                );
              }
            }}
            style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
          >
            <Ionicons name="call" size={18} color={colors.success} />
            <Text style={[styles.actionBtnText, { color: colors.success }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(appt.location)}`,
                android: `geo:0,0?q=${encodeURIComponent(appt.location)}`,
                default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`
              });
              Linking.openURL(url).catch(() => 
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`)
              );
            }}
            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
          >
            <Ionicons name="navigate" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Directions</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

export default function AppointmentsScreen() {
  const { colors, isDark } = useTheme();
  const scale = useTextScale();
  const upcoming = mockAppointments.filter((a) => a.type === 'upcoming');
  const past = mockAppointments.filter((a) => a.type === 'past');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text, fontSize: 32 * scale }]}>Visits</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your medical schedule</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Add', 'Opening form...')}
            style={styles.addCircle}
          >
            <LinearGradient colors={colors.primaryGradient} style={styles.addGradient}>
              <Ionicons name="add" size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Pre-visit checklist */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checklistLine}
          />
          <Text style={[styles.checklistTitle, { color: colors.text, fontSize: 16 * scale }]}>
            Checklist for your next visit
          </Text>
          <View style={styles.checklistGrid}>
            {['Insurance card', 'Medication list', 'Photo ID'].map((item, i) => (
              <View key={i} style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.checklistText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * scale }]}>Upcoming</Text>
        {upcoming.map((a, i) => <AppointmentCard key={a.id} appt={a} index={i} />)}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 18 * scale, marginTop: Spacing.xl }]}>History</Text>
        {past.map((a, i) => <AppointmentCard key={a.id} appt={a} index={upcoming.length + i} />)}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  title: { fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontWeight: '600', opacity: 0.6 },
  addCircle: { width: 56, height: 56, borderRadius: 28, elevation: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  addGradient: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  checklistCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, paddingLeft: Spacing.xl, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginBottom: Spacing.xxl },
  checklistLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  checklistTitle: { fontWeight: '800', marginBottom: Spacing.md },
  checklistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checklistText: { fontWeight: '600' },
  sectionTitle: { fontWeight: '800', marginBottom: Spacing.md, letterSpacing: -0.5 },
  apptCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  apptHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  apptIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  apptInfo: { flex: 1, gap: 2 },
  doctorName: { fontWeight: '800', letterSpacing: -0.3 },
  specialty: { fontWeight: '600', opacity: 0.7 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  apptDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontWeight: '600' },
  notesBox: { borderRadius: Radius.md, padding: Spacing.md, marginTop: 4 },
  notesText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  apptActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.md },
  actionBtnText: { fontWeight: '800', fontSize: 14 },
});

