-- === SECURITY HARDENING: ROW LEVEL SECURITY ===

-- 1. PROFILES: Seniors see themselves; Caregivers see themselves + their seniors
DROP POLICY IF EXISTS "Profiles are viewable by owner or their caregiver" ON profiles;
CREATE POLICY "Profiles are viewable by owner or their caregiver" 
  ON profiles FOR SELECT 
  USING (
    auth.uid() = id OR 
    auth.uid() IN (SELECT id FROM profiles WHERE linked_senior_id = profiles.id)
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. MEDICATIONS: Multi-user access
DROP POLICY IF EXISTS "Medications are accessible by owner or their caregiver" ON medications;
CREATE POLICY "Medications are accessible by owner or their caregiver"
  ON medications FOR ALL
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT id FROM profiles WHERE linked_senior_id = medications.user_id)
  );

-- 3. DOSE LOGS: Multi-user access
DROP POLICY IF EXISTS "Dose logs are accessible by owner or their caregiver" ON dose_logs;
CREATE POLICY "Dose logs are accessible by owner or their caregiver"
  ON dose_logs FOR ALL
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT id FROM profiles WHERE linked_senior_id = dose_logs.user_id)
  );

-- 4. VITALS: Multi-user access
DROP POLICY IF EXISTS "Vitals are accessible by owner or their caregiver" ON vitals;
CREATE POLICY "Vitals are accessible by owner or their caregiver"
  ON vitals FOR ALL
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT id FROM profiles WHERE linked_senior_id = vitals.user_id)
  );

-- 5. MESSAGES: Access only if user is in the care circle
DROP POLICY IF EXISTS "Messages are viewable by participants" ON messages;
CREATE POLICY "Messages are viewable by participants"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_senior_id = messages.user_id)
  );

DROP POLICY IF EXISTS "Messages can be sent by participants" ON messages;
CREATE POLICY "Messages can be sent by participants"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );
