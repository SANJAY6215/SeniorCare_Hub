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
  getStreak: () => number;
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
    
    // Fetch logs for the last 7 days for the history view
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('date', sevenDaysAgoStr);
    
    if (logs) set({ doseLogs: logs as DoseLog[] });

    // Auto-generate logs for today if they don't exist
    const todayStr = today.toISOString().split('T')[0];
    const todayLogs = (logs || []).filter(l => l.date === todayStr);
    const medsList = meds || [];
    
    if (medsList.length > 0) {
      const missingMeds = medsList.filter(m => !todayLogs.some(l => l.medication_id === m.id));
      if (missingMeds.length > 0) {
        const newLogs = [];
        for (const med of missingMeds) {
          for (const time of med.times) {
            newLogs.push({
              user_id: targetUserId,
              medication_id: med.id,
              scheduled_time: time,
              status: 'pending',
              date: todayStr,
            });
          }
        }
        if (newLogs.length > 0) {
          const { data: createdLogs } = await supabase.from('dose_logs').insert(newLogs).select();
          if (createdLogs) {
            set((state) => ({ doseLogs: [...state.doseLogs, ...(createdLogs as DoseLog[])] }));
          }
        }
      }
    }

    set({ loading: false });
    get().scheduleNotifications();
  },

  addMedication: async (med) => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) return;

    const { data: createdMed, error } = await supabase
      .from('medications')
      .insert([{ ...med, user_id: targetUserId }])
      .select()
      .single();

    if (createdMed) {
      set((state) => ({ medications: [...state.medications, createdMed as Medication] }));
      
      // Generate today's logs for this new medication immediately
      const todayStr = new Date().toISOString().split('T')[0];
      const newLogs = createdMed.times.map((time: string) => ({
        user_id: targetUserId,
        medication_id: (createdMed as Medication).id,
        scheduled_time: time,
        status: 'pending',
        date: todayStr,
      }));

      const { data: doseLogs } = await supabase.from('dose_logs').insert(newLogs).select();
      if (doseLogs) {
        set((state) => ({ doseLogs: [...state.doseLogs, ...(doseLogs as DoseLog[])] }));
      }
      
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
    const logs = get().doseLogs;
    const history: number[] = [];
    const today = new Date();
    
    // Calculate for today and the previous 6 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayLogs = logs.filter((l) => l.date === dateStr);
      if (dayLogs.length === 0) {
        history.push(0);
      } else {
        const taken = dayLogs.filter((l) => l.status === 'taken').length;
        history.push(Math.round((taken / dayLogs.length) * 100));
      }
    }
    return history;
  },

  getStreak: () => {
    const logs = get().doseLogs;
    if (!logs.length) return 0;
    let streak = 0;
    const today = new Date();
    // Check backward from today up to 90 days
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter((l) => l.date === dateStr);
      if (!dayLogs.length) { if (i === 0) continue; break; } // no data today yet = don't break
      const allTaken = dayLogs.every((l) => l.status === 'taken');
      if (allTaken) streak++;
      else break;
    }
    return streak;
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
