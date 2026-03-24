-- === PERFORMANCE OPTIMIZATION: INDEXES ===

-- 1. Profiles: Speed up lookups by linked senior ID (heavy use in Caregiver views)
CREATE INDEX IF NOT EXISTS idx_profiles_linked_senior_id ON profiles(linked_senior_id);

-- 2. Medications: Speed up fetching by user
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);

-- 3. Dose Logs: Speed up history lookups and adherence calculations
CREATE INDEX IF NOT EXISTS idx_dose_logs_user_id_date ON dose_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_dose_logs_medication_id ON dose_logs(medication_id);

-- 4. Vitals: Speed up latest reading lookups
CREATE INDEX IF NOT EXISTS idx_vitals_user_id_measured_at ON vitals(user_id, measured_at DESC);

-- 5. Appointments: Speed up upcoming appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointments_user_id_date ON appointments(user_id, date ASC);

-- 6. Messages: Speed up chat history loading
CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at ON messages(user_id, created_at ASC);
