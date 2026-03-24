-- === SECURITY HARDENING: CONSTRAINTS & AUDIT ===

-- 1. Strict Constraints for Data Integrity
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_age_range;
ALTER TABLE profiles ADD CONSTRAINT check_age_range CHECK (age >= 0 AND age < 120);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_role_validity;
ALTER TABLE profiles ADD CONSTRAINT check_role_validity CHECK (role IN ('senior', 'caregiver'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_textSize_validity;
ALTER TABLE profiles ADD CONSTRAINT check_textSize_validity CHECK (text_size IN ('medium', 'large', 'extra-large'));

ALTER TABLE medications DROP CONSTRAINT IF EXISTS check_pill_count_non_negative;
ALTER TABLE medications ADD CONSTRAINT check_pill_count_non_negative CHECK (pill_count >= 0);

ALTER TABLE medications DROP CONSTRAINT IF EXISTS check_threshold_non_negative;
ALTER TABLE medications ADD CONSTRAINT check_threshold_non_negative CHECK (refill_threshold >= 0);

-- 2. Security Audit Logging
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on audit logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System only access" ON security_logs;
CREATE POLICY "System only access" ON security_logs FOR ALL USING (false); 

-- 3. Abuse Protection: Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_hit TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(target_user_id UUID, target_endpoint TEXT, max_hits INTEGER, window_minutes INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_hits INTEGER;
  last_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT hit_count, last_hit INTO current_hits, last_time 
  FROM rate_limits 
  WHERE user_id = target_user_id AND endpoint = target_endpoint;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, endpoint) VALUES (target_user_id, target_endpoint);
    RETURN TRUE;
  END IF;

  -- Reset if window passed
  IF last_time < now() - (window_minutes || ' minutes')::INTERVAL THEN
    UPDATE rate_limits SET hit_count = 1, last_hit = now() WHERE user_id = target_user_id AND endpoint = target_endpoint;
    RETURN TRUE;
  END IF;

  -- Check limit
  IF current_hits >= max_hits THEN
    RETURN FALSE;
  END IF;

  UPDATE rate_limits SET hit_count = hit_count + 1, last_hit = now() WHERE user_id = target_user_id AND endpoint = target_endpoint;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Audit Trigger: Log Role Changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role <> NEW.role THEN
    INSERT INTO security_logs (user_id, event_type, description, severity)
    VALUES (NEW.id, 'ROLE_CHANGE', 'User role changed from ' || OLD.role || ' to ' || NEW.role, 'warning');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_change ON profiles;
CREATE TRIGGER on_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();
