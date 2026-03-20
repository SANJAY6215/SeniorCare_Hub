import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

export type MedicationStatus = 'taken' | 'missed' | 'pending' | 'snoozed';

export interface Medication {
  id: string;
  user_id?: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  reason: string;
  color: string;
  pillImage?: string;
  refill_date?: string;
  sideEffects?: string;
}

export interface DoseLog {
  id: string;
  medication_id: string;
  user_id: string;
  scheduled_time: string;
  actual_time?: string;
  status: MedicationStatus;
  date: string;
  notes?: string;
}

interface MedicationStore {
  medications: Medication[];
  doseLogs: DoseLog[];
  loading: boolean;
  activeMedication: Medication | null;
  showReminderModal: boolean;
  
  fetchMedications: () => Promise<void>;
  addMedication: (med: Omit<Medication, 'id'>) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  markTaken: (doseId: string) => Promise<void>;
  markMissed: (doseId: string) => Promise<void>;
  snoozeDose: (doseId: string, minutes: number) => void;
  setActiveMedication: (med: Medication | null) => void;
  setShowReminderModal: (show: boolean) => void;
  getTodayDoses: () => DoseLog[];
  getAdherencePercent: (days?: number) => number;
  getWeeklyAdherence: () => number[];
  scheduleNotifications: () => Promise<void>;
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: [],
  doseLogs: [],
  loading: false,
  activeMedication: null,
  showReminderModal: false,

  fetchMedications: async () => {
    set({ loading: true });
    
    // Check role and target user ID
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) {
      set({ loading: false });
      return;
    }

    const { data: meds, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', targetUserId);

    if (meds) set({ medications: meds as Medication[] });
    
    const today = new Date().toISOString().split('T')[0];
    const { data: logs } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('date', today);
    
    if (logs) set({ doseLogs: logs as DoseLog[] });
    set({ loading: false });
    get().scheduleNotifications();
  },

  addMedication: async (med) => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) return;

    const { data, error } = await supabase
      .from('medications')
      .insert([{ ...med, user_id: targetUserId }])
      .select()
      .single();

    if (data) {
      set((state) => ({ medications: [...state.medications, data as Medication] }));
      get().scheduleNotifications();
    }
  },

  removeMedication: async (id) => {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (!error) {
      set((state) => ({ medications: state.medications.filter((m) => m.id !== id) }));
    }
  },

  markTaken: async (doseId) => {
    const now = new Date().toTimeString().slice(0, 5);
    const { error } = await supabase
      .from('dose_logs')
      .update({ status: 'taken', actual_time: now })
      .eq('id', doseId);

    if (!error) {
      set((state) => ({
        doseLogs: state.doseLogs.map((d) =>
          d.id === doseId ? { ...d, status: 'taken', actual_time: now } : d
        ),
      }));
    }
  },

  markMissed: async (doseId) => {
    const { error } = await supabase
      .from('dose_logs')
      .update({ status: 'missed' })
      .eq('id', doseId);

    if (!error) {
      set((state) => ({
        doseLogs: state.doseLogs.map((d) =>
          d.id === doseId ? { ...d, status: 'missed' } : d
        ),
      }));
    }
  },

  snoozeDose: async (doseId, minutes) => {
    const newTime = new Date(Date.now() + minutes * 60 * 1000)
      .toTimeString()
      .slice(0, 5);
      
    // Reschedule notification
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medication Snoozed',
          body: `Reminder rescheduled for ${newTime}`,
          data: { doseId },
        },
        trigger: { seconds: minutes * 60 },
      });
    }

    set((state) => ({
      doseLogs: state.doseLogs.map((d) =>
        d.id === doseId ? { ...d, status: 'snoozed', scheduled_time: newTime } : d
      ),
    }));
  },

  setActiveMedication: (med) => set({ activeMedication: med }),
  setShowReminderModal: (show) => set({ showReminderModal: show }),

  getTodayDoses: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().doseLogs.filter((d) => d.date === today);
  },

  getAdherencePercent: (days = 7) => {
    const logs = get().doseLogs;
    if (!logs.length) return 0;
    const taken = logs.filter((d) => d.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  },

  getWeeklyAdherence: () => {
    return [85, 100, 75, 100, 100, 85, 92];
  },

  scheduleNotifications: async () => {
    if (Platform.OS === 'web') return;
    
    // Clear existing
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const meds = get().medications;
    for (const med of meds) {
      for (const time of med.times) {
        const [hour, minute] = time.split(':').map(Number);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${med.name}`,
            body: `Dosage: ${med.dosage}. Don't forget to take your medication!`,
            data: { medId: med.id },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            hour,
            minute,
            repeats: true,
          },
        });
      }
    }
  },
}));
