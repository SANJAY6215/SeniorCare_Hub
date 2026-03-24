import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUserStore } from './userStore';
import { AppointmentSchema } from '@/lib/schemas';

const sanitize = (str: string) => {
  if (!str) return '';
  return str.trim().replace(/<[^>]*>?/gm, '');
};

export interface Appointment {
  id: string;
  user_id: string;
  doctor: string;
  specialty: string;
  date: string;
  location: string;
  phone?: string;
  notes?: string;
  status: 'pending' | 'visited';
  created_at: string;
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'status'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: 'pending' | 'visited') => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,

  fetchAppointments: async () => {
    set({ loading: true, error: null });
    try {
      const targetUserId = useUserStore.getState().getTargetUserId();
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
    try {
      const targetUserId = useUserStore.getState().getTargetUserId();
      if (!targetUserId) throw new Error('No target user found for scheduling');

      const sanitizedAppt = {
        ...appointment,
        doctor: sanitize(appointment.doctor),
        specialty: sanitize(appointment.specialty),
        location: sanitize(appointment.location),
        notes: sanitize(appointment.notes || ''),
        user_id: targetUserId,
        status: 'pending',
      };

      const validation = AppointmentSchema.safeParse(sanitizedAppt);
      if (!validation.success) {
        console.error('Security/Validation Failure:', validation.error.message);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert([validation.data])
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

  updateAppointmentStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === id ? { ...a, status } : a
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
      
      const targetUserId = useUserStore.getState().getTargetUserId();
      await supabase.rpc('log_security_event', {
        event_name: 'APPOINTMENT_DELETION',
        details: `User deleted appointment ID: ${id}`,
        user_id: targetUserId,
        severity_level: 'info'
      });

      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id),
      }));
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
}));
