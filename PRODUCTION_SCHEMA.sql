-- ==========================================
-- SENIORCARE HUB: UNIFIED PRODUCTION SCHEMA
-- ==========================================
-- Includes: Core Schema, Advanced Security, Audit Logging, 
-- Performance Indexes, and Rate Limiting.

-- --------------------------------------------------------
-- 1. EXTENSIONS
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 2. TABLES
-- --------------------------------------------------------

-- Profiles (Linked to Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  dietary_profile JSONB DEFAULT '{}'::jsonb,
  role TEXT DEFAULT 'senior' CHECK (role IN ('senior', 'caregiver')),
  linked_senior_id UUID REFERENCES public.profiles(id),
  is_premium BOOLEAN DEFAULT false,
  expo_push_token TEXT,
  dark_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Medications
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  times TEXT[],
  reason TEXT,
  color TEXT,
  pill_image TEXT,
  refill_date DATE,
  pill_count INTEGER DEFAULT 0,
  refill_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dose Logs (Tracking)
CREATE TABLE IF NOT EXISTS public.dose_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  scheduled_time TEXT NOT NULL,
  actual_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'snoozed', 'pending')),
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vitals
CREATE TABLE IF NOT EXISTS public.vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- Messages (Real-time Chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  is_voice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Security Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  severity_level TEXT CHECK (severity_level IN ('info', 'warning', 'critical')),
  details JSONB,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- --------------------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- --------------------------------------------------------

-- Drop existing functions with CASCADE to handle dependent policies
DROP FUNCTION IF EXISTS log_security_event(text,text,uuid,text) CASCADE;
DROP FUNCTION IF EXISTS check_caregiver_relation(uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS verify_ownership(text,uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(text,integer,integer) CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit(text,text,integer,integer) CASCADE;

-- Security Event Logger
CREATE OR REPLACE FUNCTION log_security_event(
  event_name TEXT,
  details TEXT,
  user_id UUID DEFAULT NULL,
  severity_level TEXT DEFAULT 'info'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO security_logs (event_name, details, user_id, severity_level)
  VALUES (event_name, details::jsonb, user_id, severity_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check Caregiver Relation (Bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION check_caregiver_relation(caregiver_id UUID, target_senior_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = caregiver_id AND linked_senior_id = target_senior_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ownership Verification Utility
CREATE OR REPLACE FUNCTION verify_ownership(
  target_table TEXT,
  target_id UUID,
  owning_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 AND user_id = $2)', target_table)
  INTO is_owner
  USING target_id, owning_user_id;
  RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate Limiter
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER DEFAULT 1,
  last_hit TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  target_identifier TEXT,
  target_endpoint TEXT,
  max_hits INTEGER,
  window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_hits INTEGER;
  last_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT hit_count, last_hit INTO current_hits, last_ts 
  FROM rate_limits 
  WHERE identifier = target_identifier AND endpoint = target_endpoint;
  
  IF NOT FOUND THEN
    INSERT INTO rate_limits (identifier, endpoint, hit_count, last_hit) 
    VALUES (target_identifier, target_endpoint, 1, now());
    RETURN TRUE;
  ELSIF last_ts < now() - (window_minutes * interval '1 minute') THEN
    UPDATE rate_limits SET hit_count = 1, last_hit = now() 
    WHERE identifier = target_identifier AND endpoint = target_endpoint;
    RETURN TRUE;
  ELSIF current_hits < max_hits THEN
    UPDATE rate_limits SET hit_count = current_hits + 1, last_hit = now() 
    WHERE identifier = target_identifier AND endpoint = target_endpoint;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_scans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean application
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner or their caregiver" ON profiles;
DROP POLICY IF EXISTS "Users can manage own medications" ON medications;
DROP POLICY IF EXISTS "Medications are accessible by owner or their caregiver" ON medications;
DROP POLICY IF EXISTS "Users can manage own dose logs" ON dose_logs;
DROP POLICY IF EXISTS "Dose logs are accessible by owner or their caregiver" ON dose_logs;
DROP POLICY IF EXISTS "Users can manage own vitals" ON vitals;
DROP POLICY IF EXISTS "Vitals are accessible by owner or their caregiver" ON vitals;
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;
DROP POLICY IF EXISTS "Messages are viewable by participants" ON messages;
DROP POLICY IF EXISTS "Admin only logs" ON security_logs;

-- Profiles: Own data only
CREATE POLICY "Users can manage own profile" ON profiles 
  FOR ALL USING (
    auth.uid() = id OR 
    check_caregiver_relation(auth.uid(), id)
  );

-- Medications: Own data only
CREATE POLICY "Users can manage own medications" ON medications 
  FOR ALL USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- Dose Logs: Own data only
CREATE POLICY "Users can manage own dose logs" ON dose_logs 
  FOR ALL USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- Vitals: Own data only
CREATE POLICY "Users can manage own vitals" ON vitals 
  FOR ALL USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- Messages: Own data only
CREATE POLICY "Users can manage own messages" ON messages 
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = user_id OR
    check_caregiver_relation(auth.uid(), user_id)
  );

-- Security Logs: No public access (Database Admin only)
CREATE POLICY "Admin only logs" ON security_logs 
  FOR ALL USING (FALSE);

-- Food Scans: Own data or caregiver
CREATE POLICY "Users can manage own food scans" ON food_scans 
  FOR ALL USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- --------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_user_id_date ON dose_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_vitals_user_id_measured ON vitals(user_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_scans_user_id ON food_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_food_scans_scanned_at ON food_scans(scanned_at);
