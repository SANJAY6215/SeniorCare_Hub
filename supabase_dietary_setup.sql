-- --------------------------------------------------------
-- DIETARY FEATURES SETUP
-- --------------------------------------------------------

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dietary_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'senior' CHECK (role IN ('senior', 'caregiver')),
ADD COLUMN IF NOT EXISTS linked_senior_id UUID REFERENCES public.profiles(id);

-- 2. Create Food Scans Table
CREATE TABLE IF NOT EXISTS public.food_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  image_url TEXT, -- URL to the scanned image (if stored)
  food_name TEXT NOT NULL,
  calories INTEGER,
  nutrients JSONB, -- {sodium, sugar, fats, etc.}
  safety_status TEXT CHECK (safety_status IN ('safe', 'caution', 'unsafe')),
  health_advice TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.food_scans ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can manage own food scans" ON public.food_scans 
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND linked_senior_id = food_scans.user_id
    )
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_food_scans_user_id ON public.food_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_food_scans_scanned_at ON public.food_scans(scanned_at);
