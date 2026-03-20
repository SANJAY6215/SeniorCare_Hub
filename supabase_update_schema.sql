-- Add missing columns to profiles table to fix family code changing on refresh and save other preferences

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'senior',
  ADD COLUMN IF NOT EXISTS family_code TEXT,
  ADD COLUMN IF NOT EXISTS linked_senior_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_hospital TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS text_size TEXT DEFAULT 'large',
  ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_assist_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_check_in DATE,
  ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Make family_code unique so different seniors don't get the same code by accident
-- (Commented out because it already exists!)
-- ALTER TABLE profiles ADD CONSTRAINT profiles_family_code_key UNIQUE (family_code);
