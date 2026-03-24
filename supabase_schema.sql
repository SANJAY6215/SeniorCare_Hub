-- 1. Create Profiles table (Linked to Auth users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  is_premium BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  voice_assist_enabled BOOLEAN DEFAULT true,
  family_code TEXT,
  linked_senior_id UUID,
  dietary_profile JSONB,
  last_check_in TEXT,
  check_in_status TEXT,
  expo_push_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Medications table
CREATE TABLE medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  times TEXT[], -- Store as an array of strings like ["08:00", "20:00"]
  instructions TEXT,
  reason TEXT,
  color TEXT,
  refill_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Dose Logs (Tracking)
CREATE TABLE dose_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  scheduled_time TEXT NOT NULL,
  actual_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'snoozed', 'pending')),
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Vitals table
CREATE TABLE vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- "BP", "HeartRate", "Sugar", "Weight"
  value TEXT NOT NULL,
  unit TEXT,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- 5. Create Messages (Real-time Chat)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) - Basic setup ensuring users only see their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own medications" ON medications 
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dose logs" ON dose_logs 
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vitals" ON vitals 
  FOR ALL USING (auth.uid() = user_id);
