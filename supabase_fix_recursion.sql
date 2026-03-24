-- === FIX: RLS INFINITE RECURSION ===

-- 1. Create a helper function with SECURITY DEFINER to avoid recursion
-- This function runs with the privileges of the creator (bypass RLS)
CREATE OR REPLACE FUNCTION check_caregiver_relation(caregiver_id UUID, target_senior_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = caregiver_id AND linked_senior_id = target_senior_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update PROFILES Policy
DROP POLICY IF EXISTS "Profiles are viewable by owner or their caregiver" ON profiles;
CREATE POLICY "Profiles are viewable by owner or their caregiver" 
  ON profiles FOR SELECT 
  USING (
    auth.uid() = id OR 
    check_caregiver_relation(auth.uid(), id)
  );

-- 3. Update MEDICATIONS Policy
DROP POLICY IF EXISTS "Medications are accessible by owner or their caregiver" ON medications;
CREATE POLICY "Medications are accessible by owner or their caregiver"
  ON medications FOR ALL
  USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- 4. Update DOSE LOGS Policy
DROP POLICY IF EXISTS "Dose logs are accessible by owner or their caregiver" ON dose_logs;
CREATE POLICY "Dose logs are accessible by owner or their caregiver"
  ON dose_logs FOR ALL
  USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- 5. Update VITALS Policy
DROP POLICY IF EXISTS "Vitals are accessible by owner or their caregiver" ON vitals;
CREATE POLICY "Vitals are accessible by owner or their caregiver"
  ON vitals FOR ALL
  USING (
    auth.uid() = user_id OR 
    check_caregiver_relation(auth.uid(), user_id)
  );

-- 6. Update MESSAGES Policy
DROP POLICY IF EXISTS "Messages are viewable by participants" ON messages;
CREATE POLICY "Messages are viewable by participants"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = user_id OR
    check_caregiver_relation(auth.uid(), user_id)
  );
