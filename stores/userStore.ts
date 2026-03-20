import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface UserProfile {
  id: string;
  role: 'senior' | 'caregiver';
  familyCode?: string;
  linkedSeniorId?: string;
  firstName: string;
  lastName: string;
  age: number;
  phone: string;
  conditions: string[];
  emergencyContacts: EmergencyContact[];
  preferredHospital: string;
  language: string;
  textSize: 'medium' | 'large' | 'extra-large';
  darkMode: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceAssistEnabled: boolean;
  lastCheckIn: string | null;
  checkInStatus: 'done' | 'pending';
  expo_push_token?: string;
}

interface UserStore {
  profile: UserProfile | null;
  session: any | null;
  loading: boolean;
  
  initialize: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setDarkMode: (val: boolean) => void;
  setTextSize: (size: UserProfile['textSize']) => void;
  completeCheckIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  id: '',
  role: 'senior',
  firstName: '',
  lastName: '',
  age: 0,
  phone: '',
  conditions: [],
  emergencyContacts: [],
  preferredHospital: '',
  language: 'English',
  textSize: 'large',
  darkMode: false,
  soundEnabled: true,
  vibrationEnabled: true,
  voiceAssistEnabled: true,
  lastCheckIn: null,
  checkInStatus: 'pending',
};

const toDbProfile = (p: Partial<UserProfile>) => {
  const db: any = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.role !== undefined) db.role = p.role;
  if (p.familyCode !== undefined) db.family_code = p.familyCode;
  if (p.linkedSeniorId !== undefined) db.linked_senior_id = p.linkedSeniorId;
  if (p.firstName !== undefined) db.first_name = p.firstName;
  if (p.lastName !== undefined) db.last_name = p.lastName;
  if (p.age !== undefined) db.age = p.age;
  if (p.phone !== undefined) db.phone = p.phone;
  if (p.conditions !== undefined) db.conditions = p.conditions;
  if (p.emergencyContacts !== undefined) db.emergency_contacts = p.emergencyContacts;
  if (p.preferredHospital !== undefined) db.preferred_hospital = p.preferredHospital;
  if (p.language !== undefined) db.language = p.language;
  if (p.textSize !== undefined) db.text_size = p.textSize;
  if (p.darkMode !== undefined) db.dark_mode = p.darkMode;
  if (p.soundEnabled !== undefined) db.sound_enabled = p.soundEnabled;
  if (p.vibrationEnabled !== undefined) db.vibrationEnabled = p.vibrationEnabled;
  if (p.voiceAssistEnabled !== undefined) db.voice_assist_enabled = p.voiceAssistEnabled;
  if (p.lastCheckIn !== undefined) db.last_check_in = p.lastCheckIn;
  if (p.checkInStatus !== undefined) db.check_in_status = p.checkInStatus;
  if (p.expo_push_token !== undefined) db.expo_push_token = p.expo_push_token;
  return db;
};

const fromDbProfile = (db: any): UserProfile => ({
  id: db.id,
  role: db.role || 'senior',
  familyCode: db.family_code,
  linkedSeniorId: db.linked_senior_id,
  firstName: db.first_name || '',
  lastName: db.last_name || '',
  age: db.age || 0,
  phone: db.phone || '',
  conditions: db.conditions || [],
  emergencyContacts: db.emergency_contacts || [],
  preferredHospital: db.preferred_hospital || '',
  language: db.language || 'English',
  textSize: db.text_size || 'large',
  darkMode: db.dark_mode || false,
  soundEnabled: db.sound_enabled !== false,
  vibrationEnabled: db.vibration_enabled !== false,
  voiceAssistEnabled: db.voice_assist_enabled !== false,
  lastCheckIn: db.last_check_in || null,
  checkInStatus: db.check_in_status || 'pending',
  expo_push_token: db.expo_push_token,
});

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  session: null,
  loading: true,

  initialize: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    set({ session });

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        set({ profile: fromDbProfile(profile) });
      } else {
        // Create initial profile if missing
        const meta = session.user.user_metadata || {};
        const role = meta.role || 'senior';
        
        // Generate random family code for senior
        const newFamilyCode = role === 'senior' ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;
        
        const newProfile: UserProfile = { 
          ...defaultProfile, 
          id: session.user.id,
          role,
          familyCode: newFamilyCode,
          linkedSeniorId: meta.linked_senior_id
        };
        
        await supabase.from('profiles').insert([toDbProfile(newProfile)]);
        set({ profile: newProfile });
      }
    }
    set({ loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (!session) set({ profile: null });
    });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    const dbUpdates = toDbProfile(updates);

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', profile.id);

    if (!error) {
      set((state) => ({ profile: { ...state.profile!, ...updates } }));
    }
  },

  setDarkMode: (val) =>
    set((state) => ({ profile: state.profile ? { ...state.profile, darkMode: val } : null })),
  
  setTextSize: (size) =>
    set((state) => ({ profile: state.profile ? { ...state.profile, textSize: size } : null })),

  completeCheckIn: async () => {
    const { profile } = get();
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    await get().updateProfile({ lastCheckIn: today, checkInStatus: 'done' });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
