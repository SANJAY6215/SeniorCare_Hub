import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';

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
}

export const useVitalsStore = create<VitalsStore>((set, get) => ({
  readings: [],
  loading: false,

  fetchVitals: async () => {
    set({ loading: true });
    
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) {
      set({ loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('user_id', targetUserId)
      .order('measured_at', { ascending: false });

    if (data) set({ readings: data as VitalReading[] });
    set({ loading: false });
  },

  addReading: async (reading) => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;
    const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
    if (!targetUserId) return;

    const { data, error } = await supabase
      .from('vitals')
      .insert([{ ...reading, user_id: targetUserId }])
      .select()
      .single();

    if (data) {
      set((state) => ({ readings: [data as VitalReading, ...state.readings] }));
    }
  },

  getLatest: (type) => get().readings.find((r) => r.type === type) ?? null,
  getLast7Days: (type) => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    return get().readings.filter(
      (r) => r.type === type && new Date(r.measured_at) >= cutoff
    );
  },
}));
