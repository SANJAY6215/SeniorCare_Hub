import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// SECURITY: Always use environment variables for keys.
// NEVER put your SUPABASE_SERVICE_ROLE_KEY here! 
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase configuration is missing. Requests will fail, but the app will not crash on launch. " +
    "If this is an EAS build, ensure you have set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY as Secrets."
  );
}

// Fallback to placeholders instead of empty strings to prevent 'supabaseUrl is required' crash
export const supabase = createClient(
  supabaseUrl || 'https://MISSING_SUPABASE_URL.supabase.co',
  supabaseAnonKey || 'MISSING_ANON_KEY',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
