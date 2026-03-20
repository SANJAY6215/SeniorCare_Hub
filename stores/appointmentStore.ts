import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from './userStore';

export interface Appointment {
  id: string;
  user_id: string;
  doctor: string;
  specialty: string;
  date: string;
  location: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,

  fetchAppointments: async () => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;

    set({ loading: true, error: null });
    try {
      const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
      if (!targetUserId) throw new Error('No target user found');

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: true });

      if (error) throw error;
      set({ appointments: data as Appointment[], loading: false });
    } catch (e: any) {
      console.error(e);
      set({ error: e.message, loading: false });
    }
  },

  addAppointment: async (appointment) => {
    const profile = useUserStore.getState().profile;
    if (!profile) return;

    try {
      const targetUserId = profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
      if (!targetUserId) throw new Error('No target user found for scheduling');

      const newAppt = {
        ...appointment,
        user_id: targetUserId,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([newAppt])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        appointments: [...state.appointments, data as Appointment].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      }));
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  deleteAppointment: async (id) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id),
      }));
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
}));
