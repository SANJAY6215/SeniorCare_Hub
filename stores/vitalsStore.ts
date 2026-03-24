import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { VitalSchema } from '@/lib/schemas';

const sanitize = (str: string) => {
  if (!str) return '';
  return str.trim().replace(/<[^>]*>?/gm, '');
};

export interface VitalReading {
  id: string;
  user_id?: string;
  type: 'bp' | 'hr' | 'weight' | 'glucose' | 'spo2' | 'temp';
  value: string;
  unit: string;
  measured_at: string; // Changed from timestamp/ISO for DB consistency
  status: string; // Dynamic status from calculation
  notes?: string;
}

interface VitalsStore {
  readings: VitalReading[];
  loading: boolean;
  fetchVitals: () => Promise<void>;
  addReading: (reading: Omit<VitalReading, 'id'>) => Promise<void>;
  getLatest: (type: VitalReading['type']) => VitalReading | null;
  getLast7Days: (type: VitalReading['type']) => VitalReading[];
  subscribeToVitals: () => void;
  unsubscribeFromVitals: () => void;
  channel: any;
}

export const useVitalsStore = create<VitalsStore>((set, get) => ({
  readings: [],
  loading: false,
  channel: null,

  fetchVitals: async () => {
    set({ loading: true });
    
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) {
      set({ loading: false });
      return;
    }

    const isPremium = useUserStore.getState().profile?.isPremium;
    let query = supabase
      .from('vitals')
      .select('*')
      .eq('user_id', targetUserId);

    if (!isPremium) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('measured_at', yesterday);
    }

    const { data, error } = await query.order('measured_at', { ascending: false });

    if (data) set({ readings: data as VitalReading[] });
    set({ loading: false });
    get().subscribeToVitals();
  },

  addReading: async (reading: Omit<VitalReading, 'id'>) => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    const previousReadings = get().readings;
    const tempId = Math.random().toString(36).substr(2, 9);
    const optimisticReading: VitalReading = {
      ...reading,
      id: tempId,
      user_id: targetUserId,
    };

    // OPTIMISTIC UPDATE
    set((state: VitalsStore) => ({ readings: [optimisticReading, ...state.readings] }));

    // BACKEND SYNC
    const sanitizedReading = {
      ...reading,
      value: sanitize(reading.value),
      unit: sanitize(reading.unit),
      notes: sanitize(reading.notes || ''),
      user_id: targetUserId,
    };

    const validation = VitalSchema.safeParse(sanitizedReading);
    if (!validation.success) {
      console.error('Security/Validation Failure:', validation.error.message);
      return;
    }

    const { data, error } = await supabase
      .from('vitals')
      .insert([validation.data])
      .select()
      .single();

    if (error) {
      // ROLLBACK
      set({ readings: previousReadings });
      Alert.alert('Save Failed', 'Could not save vital reading to the cloud. It will be removed from your local history.');
      return;
    }

    if (data) {
      // Replace optimistic reading with real one from DB (to get real ID)
      set((state: VitalsStore) => ({
        readings: state.readings.map((r: VitalReading) => r.id === tempId ? data as VitalReading : r)
      }));

      // Security Audit Log for critical findings
      if (data.status === 'critical') {
        await supabase.rpc('log_security_event', {
          event_name: 'CRITICAL_VITAL_DETECTED',
          details: `CRITICAL ${data.type} reading: ${data.value} ${data.unit}`,
          user_id: targetUserId,
          severity_level: 'critical'
        });
      }
    }
  },

  getLatest: (type: VitalReading['type']) => get().readings.find((r: VitalReading) => r.type === type) ?? null,
  getLast7Days: (type: VitalReading['type']) => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    return get().readings.filter(
      (r: VitalReading) => r.type === type && new Date(r.measured_at) >= cutoff
    );
  },

  subscribeToVitals: () => {
    const targetUserId = useUserStore.getState().getTargetUserId();
    if (!targetUserId) return;

    if (get().channel) supabase.removeChannel(get().channel);

    const newChannel = supabase
      .channel(`vitals_${targetUserId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vitals',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload: any) => {
          const { eventType, new: newVital, old: oldVital } = payload;
          set((state: VitalsStore) => {
            if (eventType === 'INSERT') {
              if (state.readings.find((r: VitalReading) => r.id === (newVital as VitalReading).id)) return state;
              return { readings: [newVital as VitalReading, ...state.readings] };
            }
            if (eventType === 'DELETE') {
              return { readings: state.readings.filter((r: VitalReading) => r.id !== (oldVital as any).id) };
            }
            return state;
          });
        }
      )
      .subscribe();

    set({ channel: newChannel });
  },

  unsubscribeFromVitals: () => {
    if (get().channel) {
      supabase.removeChannel(get().channel);
      set({ channel: null });
    }
  }
}));
