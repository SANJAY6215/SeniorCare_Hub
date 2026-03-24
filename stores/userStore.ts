import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { ProfileSchema } from '@/lib/schemas';

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return undefined;
    }
    token = (await Notifications.getExpoPushTokenAsync({ 
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '87b4c93a-5031-4b24-a15f-d1576d68a365' 
    })).data;
  }
  return token;
}

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
  gender: string;
  dietary_profile: {
    restrictions?: string[];
    allergies?: string[];
    calorie_goal?: number;
    sodium_limit?: string;
  };
  isPremium: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  expoPushToken?: string;
  vibrationEnabled: boolean;
  voiceAssistEnabled: boolean;
  lastCheckIn: string | null;
  checkInStatus: 'done' | 'pending';
  expo_push_token?: string;
}

interface UserStore {
  profile: UserProfile | null;
  seniorProfile: UserProfile | null;
  session: any | null;
  loading: boolean;
  
  initialize: () => Promise<void>;
  fetchSeniorProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  getTargetUserId: () => string | undefined;
  setDarkMode: (val: boolean) => void;
  setTextSize: (size: UserProfile['textSize']) => void;
  completeCheckIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setupAuthListener: () => void;
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
  gender: 'not_specified',
  dietary_profile: {},
  isPremium: false,
  darkMode: false,
  soundEnabled: true,
  vibrationEnabled: true,
  voiceAssistEnabled: true,
  lastCheckIn: null,
  checkInStatus: 'pending',
};

const sanitize = (str: string) => {
  if (!str) return '';
  return str.trim().replace(/<[^>]*>?/gm, '');
};

const toDbProfile = (p: Partial<UserProfile>) => {
  const db: any = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.role !== undefined) db.role = p.role;
  if (p.familyCode !== undefined) db.family_code = p.familyCode;
  if (p.linkedSeniorId !== undefined) db.linked_senior_id = p.linkedSeniorId;
  if (p.firstName !== undefined) db.first_name = sanitize(p.firstName);
  if (p.lastName !== undefined) db.last_name = sanitize(p.lastName);
  if (p.age !== undefined) db.age = p.age;
  if (p.phone !== undefined) db.phone = sanitize(p.phone);
  if (p.conditions !== undefined) db.conditions = p.conditions.map(sanitize);
  if (p.emergencyContacts !== undefined) db.emergency_contacts = p.emergencyContacts;
  if (p.preferredHospital !== undefined) db.preferred_hospital = sanitize(p.preferredHospital);
  if (p.language !== undefined) db.language = sanitize(p.language);
  if (p.textSize !== undefined) db.text_size = p.textSize;
  if (p.darkMode !== undefined) db.dark_mode = p.darkMode;
  if (p.gender !== undefined) db.gender = p.gender;
  if (p.dietary_profile !== undefined) db.dietary_profile = p.dietary_profile;
  if (p.isPremium !== undefined) db.is_premium = p.isPremium;
  if (p.soundEnabled !== undefined) db.sound_enabled = p.soundEnabled;
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
  gender: db.gender || 'not_specified',
  dietary_profile: {
    restrictions: db.dietary_profile?.restrictions || [],
    allergies: db.dietary_profile?.allergies || [],
    calorie_goal: db.dietary_profile?.calorie_goal,
    sodium_limit: db.dietary_profile?.sodium_limit,
  },
  isPremium: db.is_premium || false,
  darkMode: db.dark_mode || false,
  soundEnabled: db.sound_enabled !== false,
  vibrationEnabled: db.vibration_enabled !== false,
  voiceAssistEnabled: db.voice_assist_enabled !== false,
  lastCheckIn: db.last_check_in || null,
  checkInStatus: db.check_in_status || 'pending',
  expo_push_token: db.expo_push_token,
});

const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  seniorProfile: null,
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
        let parsedProfile = fromDbProfile(profile);

        // Permanently patch older accounts if they are missing a family code!
        if (parsedProfile.role === 'senior' && !parsedProfile.familyCode) {
          // Robust 6-digit alphanumeric code
          parsedProfile.familyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const { error } = await supabase.from('profiles').update({ family_code: parsedProfile.familyCode }).eq('id', parsedProfile.id);
          if (error) {
            console.error('Code Sync Failure:', error.message);
            // Don't crash, but don't show the code if it wasn't saved
            parsedProfile.familyCode = undefined;
          }
        }

        // Register for push notifications and save to DB
        try {
          const token = await registerForPushNotificationsAsync();
          if (token && parsedProfile.expo_push_token !== token) {
            const { error } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', parsedProfile.id);
            if (!error) parsedProfile.expo_push_token = token;
          }
        } catch (e) { console.log('Push notification setup error:', e); }

        set({ profile: parsedProfile });
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
          firstName: meta.first_name || '',
          lastName: meta.last_name || '',
          familyCode: newFamilyCode,
          linkedSeniorId: meta.linked_senior_id
        };
        
        // Use UPSERT just in case of parallel auth collisions
        const { error } = await supabase.from('profiles').upsert([toDbProfile(newProfile)]);
        if (error) Alert.alert('Profile Creation Failed', error.message);
        set({ profile: newProfile });
      }
    }
    set({ loading: false });
  },

  setupAuthListener: () => {
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session });
      if (!session) {
        set({ profile: null, seniorProfile: null });
      } else if (event === 'SIGNED_IN') {
        get().initialize();
      }
    });
  },

  fetchSeniorProfile: async () => {
    const { profile } = get();
    if (!profile || profile.role !== 'caregiver' || !profile.linkedSeniorId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.linkedSeniorId)
      .single();

    if (data && !error) {
      set({ seniorProfile: fromDbProfile(data) });
    }
  },

  getTargetUserId: () => {
    const { profile } = get();
    if (!profile) return undefined;
    return profile.role === 'senior' ? profile.id : profile.linkedSeniorId;
  },

  updateProfile: async (updates) => {
    const { profile, session } = get();
    if (!profile || !session) {
      console.warn('Security: Attempted update without active session.');
      return;
    }

    const dbUpdates = toDbProfile(updates);
    
    // Partial validation for updates
    const validation = ProfileSchema.partial().safeParse(dbUpdates);
    if (!validation.success) {
      console.warn('Security/Validation Failure:', validation.error.message);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update(validation.data)
      .eq('id', profile.id);

    if (error) {
      console.error('Update Profile Failure:', error.message);
      Alert.alert('Update Failed', 'Your changes could not be saved securely.');
      throw error;
    }

    // Security Audit Log for potentially sensitive updates
    if (updates.emergencyContacts || updates.phone) {
      await supabase.rpc('log_security_event', {
        event_name: 'SENSITIVE_PROFILE_UPDATE',
        details: `User ${profile.firstName} updated sensitive contact/phone info.`,
        user_id: profile.id,
        severity_level: 'warning'
      });
    }

    set((state) => ({ profile: { ...state.profile!, ...updates } }));
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
    set({ session: null, profile: null, seniorProfile: null });
  },
}));

export { useUserStore };

