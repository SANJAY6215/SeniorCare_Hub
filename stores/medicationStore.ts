import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import { notificationService } from '@/lib/notificationService';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { MedicationSchema, DoseLogSchema } from '@/lib/schemas';

const sanitize = (str: string) => {
  if (!str) return '';
  // Trim and remove any HTML-like tags to prevent basic injection
  return str.trim().replace(/<[^>]*>?/gm, '');
};

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
  pills_remaining?: number;
  refill_threshold?: number;
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
  refillMedication: (id: string, count: number) => Promise<void>;
  getTodayDoses: () => DoseLog[];
  getAdherencePercent: (days?: number) => number;
  getWeeklyAdherence: () => number[];
  getStreak: () => number;
  fetchLogs: (days: number) => Promise<void>;
  scheduleNotifications: () => Promise<void>;
  subscribeToDoses: () => void;
  unsubscribeFromDoses: () => void;
  channel: any;
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: [],
  doseLogs: [],
  loading: false,
  activeMedication: null,
  showReminderModal: false,
  channel: null,

  fetchMedications: async () => {
    set({ loading: true });
    
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) {
      set({ loading: false });
      return;
    }

    const { data: meds, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', targetUserId);

    if (meds) set({ medications: meds as Medication[] });
    
    // Fetch logs: Basic = 1 day (today), Premium = 7 days (standard history)
    const isPremium = useUserStore.getState().profile?.isPremium;
    const historyDays = isPremium ? 7 : 1;
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (historyDays - 1));
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('date', startDateStr);
    
    if (logs) set({ doseLogs: logs as DoseLog[] });

    // Auto-generate logs for today if they don't exist
    const todayStr = today.toISOString().split('T')[0];
    const todayLogs = (logs || []).filter((l: DoseLog) => l.date === todayStr);
    const medsList = (meds || []) as Medication[];
    
    if (medsList.length > 0) {
      const missingMeds = medsList.filter((m: Medication) => !todayLogs.some((l: DoseLog) => l.medication_id === m.id));
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
            set((state: MedicationStore) => ({ doseLogs: [...state.doseLogs, ...(createdLogs as DoseLog[])] }));
          }
        }
      }
    }

    set({ loading: false });
    get().scheduleNotifications();
    get().subscribeToDoses();
  },

  addMedication: async (med: Omit<Medication, 'id'>) => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    const sanitizedMed = {
      ...med,
      name: sanitize(med.name),
      dosage: sanitize(med.dosage),
      frequency: sanitize(med.frequency),
      reason: sanitize(med.reason),
      user_id: targetUserId,
    };

    const validation = MedicationSchema.safeParse(sanitizedMed);

    if (!validation.success) {
      console.error('Security/Validation Failure:', validation.error.message);
      return;
    }

    const { data: createdMed, error } = await supabase
      .from('medications')
      .insert([validation.data])
      .select()
      .single();

    if (createdMed) {
      set((state: MedicationStore) => ({ medications: [...state.medications, createdMed as Medication] }));
      
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
        set((state: MedicationStore) => ({ doseLogs: [...state.doseLogs, ...(doseLogs as DoseLog[])] }));
      }
      
      get().scheduleNotifications();
    }
  },

  removeMedication: async (id: string) => {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (!error) {
      set((state: MedicationStore) => ({ medications: state.medications.filter((m: Medication) => m.id !== id) }));
      // Security Audit Logging
      const targetUserId = useUserStore.getState().getTargetUserId();
      await supabase.rpc('log_security_event', {
        event_name: 'MEDICATION_REMOVAL',
        details: `User removed medication ID: ${id}`,
        user_id: targetUserId,
        severity_level: 'info'
      });
    }
  },

  markTaken: async (doseId: string) => {
    const state = get();
    const dose = state.doseLogs.find((d: DoseLog) => d.id === doseId);
    if (!dose) return;

    const previousLogs = state.doseLogs;
    const previousMeds = state.medications;

    // OPTIMISTIC UPDATE: Update local state immediately
    const now = new Date().toTimeString().slice(0, 5);
    const med = state.medications.find((m: Medication) => m.id === dose.medication_id);
    const newCount = (med && med.pills_remaining !== undefined) ? Math.max(0, med.pills_remaining - 1) : undefined;

    set((state: MedicationStore) => ({
      doseLogs: state.doseLogs.map((d: DoseLog) =>
        d.id === doseId ? { ...d, status: 'taken', actual_time: now } : d
      ),
      medications: state.medications.map((m: Medication) => 
        (med && m.id === med.id && newCount !== undefined) ? { ...m, pills_remaining: newCount } : m
      )
    }));

    // BACKEND SYNC
    const { error: doseError } = await supabase
      .from('dose_logs')
      .update({ status: 'taken', actual_time: now })
      .eq('id', doseId);

    if (doseError) {
      // ROLLBACK on failure
      set({ doseLogs: previousLogs, medications: previousMeds });
      Alert.alert('Sync Failed', 'Could not save medication status. Please check your internet connection.');
      return;
    }

    if (med && newCount !== undefined) {
      const { error: medError } = await supabase
        .from('medications')
        .update({ pills_remaining: newCount })
        .eq('id', med.id);
      
      if (medError) {
        console.error('Failed to sync pill count to backend:', medError);
      }
    }
  },

  refillMedication: async (id: string, count: number) => {
    const state = get();
    const med = state.medications.find((m: Medication) => m.id === id);
    if (!med) return;

    const newCount = (med.pills_remaining || 0) + count;
    const previousMeds = state.medications;

    // Optimistic Update
    set((state: MedicationStore) => ({
      medications: state.medications.map((m: Medication) => 
        m.id === id ? { ...m, pills_remaining: newCount } : m
      )
    }));

    const { error } = await supabase
      .from('medications')
      .update({ pills_remaining: newCount })
      .eq('id', id);

    if (error) {
      set({ medications: previousMeds });
      Alert.alert('Refill Failed', 'Could not sync the refill with the database.');
    } else {
      // Security Audit Logging
      const targetUserId = useUserStore.getState().getTargetUserId();
      await supabase.rpc('log_security_event', {
        event_name: 'MEDICATION_REFILL',
        details: `Medication ${med.name} refilled with ${count} units. New total: ${newCount}`,
        user_id: targetUserId,
        severity_level: 'info'
      });
    }
  },

  markMissed: async (doseId: string) => {
    const { error } = await supabase
      .from('dose_logs')
      .update({ status: 'missed' })
      .eq('id', doseId);

    if (!error) {
      set((state: MedicationStore) => ({
        doseLogs: state.doseLogs.map((d: DoseLog) =>
          d.id === doseId ? { ...d, status: 'missed' } : d
        ),
      }));
    }
  },

  snoozeDose: async (doseId: string, minutes: number) => {
    const newTime = new Date(Date.now() + minutes * 60 * 1000)
      .toTimeString()
      .slice(0, 5);
      
    // Reschedule notification
    await notificationService.scheduleSnooze(doseId, minutes, newTime);

    set((state: MedicationStore) => ({
      doseLogs: state.doseLogs.map((d: DoseLog) =>
        d.id === doseId ? { ...d, status: 'snoozed', scheduled_time: newTime } : d
      ),
    }));
  },

  setActiveMedication: (med: Medication | null) => set({ activeMedication: med }),
  setShowReminderModal: (show: boolean) => set({ showReminderModal: show }),

  getTodayDoses: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().doseLogs.filter((d: DoseLog) => d.date === today);
  },

  getAdherencePercent: (days = 7) => {
    const logs = get().doseLogs;
    if (!logs.length) return 0;
    const taken = logs.filter((d: DoseLog) => d.status === 'taken').length;
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
      
      const dayLogs = logs.filter((l: DoseLog) => l.date === dateStr);
      if (dayLogs.length === 0) {
        history.push(0);
      } else {
        const taken = dayLogs.filter((l: DoseLog) => l.status === 'taken').length;
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
      const dayLogs = logs.filter((l: DoseLog) => l.date === dateStr);
      if (!dayLogs.length) { if (i === 0) continue; break; }
      const allTaken = dayLogs.every((l: DoseLog) => l.status === 'taken');
      if (allTaken) streak++;
      else break;
    }
    return streak;
  },

  fetchLogs: async (days: number) => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: logs, error } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (logs && !error) {
      set({ doseLogs: logs as DoseLog[] });
    }
  },

  scheduleNotifications: async () => {
    const meds = get().medications;
    await notificationService.scheduleMedicationReminders(meds);
  },

  subscribeToDoses: () => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    if (get().channel) supabase.removeChannel(get().channel);

    const newChannel = supabase
      .channel(`dose_logs_${targetUserId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'dose_logs',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload: any) => {
          const { eventType, new: newDose, old: oldDose } = payload;
          set((state: MedicationStore) => {
            if (eventType === 'INSERT') {
              if (state.doseLogs.find((d: DoseLog) => d.id === (newDose as DoseLog).id)) return state;
              return { doseLogs: [...state.doseLogs, newDose as DoseLog] };
            }
            if (eventType === 'UPDATE') {
              return {
                doseLogs: state.doseLogs.map((d: DoseLog) => d.id === (newDose as DoseLog).id ? newDose as DoseLog : d)
              };
            }
            if (eventType === 'DELETE') {
              return { doseLogs: state.doseLogs.filter((d: DoseLog) => d.id !== (oldDose as any).id) };
            }
            return state;
          });
        }
      )
      .subscribe();

    set({ channel: newChannel });
  },

  unsubscribeFromDoses: () => {
    if (get().channel) {
      supabase.removeChannel(get().channel);
      set({ channel: null });
    }
  }
}));
