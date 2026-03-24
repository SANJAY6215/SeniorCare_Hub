
-- === SECURITY HARDENING: ENTERPRISE AUDIT & PROTECTION ===

-- 1. Specialized Logging Function (Custom Events)
CREATE OR REPLACE FUNCTION log_security_event(
  event_name TEXT, 
  details TEXT, 
  user_id UUID DEFAULT NULL, 
  severity_level TEXT DEFAULT 'info'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO security_logs (user_id, event_type, description, severity)
  VALUES (user_id, event_name, details, severity_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Audit Trigger: High-Risk Medication Deletions
CREATE OR REPLACE FUNCTION audit_medication_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_logs (user_id, event_type, description, severity)
  VALUES (OLD.user_id, 'MEDICATION_DELETED', 'Medication deleted: ' || OLD.name || ' (ID: ' || OLD.id || ')', 'warning');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_medication_delete ON medications;
CREATE TRIGGER on_medication_delete
  BEFORE DELETE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION audit_medication_delete();

-- 3. Audit Trigger: Sensitive Profile Changes (Phone/Emergency Contacts)
CREATE OR REPLACE FUNCTION audit_sensitive_profile_change()
RETURNS TRIGGER AS $$
DECLARE
  change_desc TEXT := '';
BEGIN
  IF OLD.phone <> NEW.phone THEN
    change_desc := change_desc || 'Phone changed from ' || OLD.phone || ' to ' || NEW.phone || '. ';
  END IF;
  
  IF OLD.emergency_contacts::TEXT <> NEW.emergency_contacts::TEXT THEN
    change_desc := change_desc || 'Emergency contacts updated. ';
  END IF;

  IF change_desc <> '' THEN
    INSERT INTO security_logs (user_id, event_type, description, severity)
    VALUES (NEW.id, 'SENSITIVE_PROFILE_UPDATE', change_desc, 'info');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_sensitive_profile_change ON profiles;
CREATE TRIGGER on_sensitive_profile_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_profile_change();

-- 4. Constraint: Ensure Family Code is never missing for Seniors
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS senior_must_have_code;
ALTER TABLE profiles ADD CONSTRAINT senior_must_have_code 
  CHECK (role != 'senior' OR family_code IS NOT NULL);

-- 5. Helper Function: Verify Ownership (Backend Safety)
CREATE OR REPLACE FUNCTION verify_ownership(target_table TEXT, target_id UUID, req_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  owner_id UUID;
BEGIN
  EXECUTE format('SELECT user_id FROM %I WHERE id = $1', target_table)
  INTO owner_id
  USING target_id;
  
  RETURN owner_id = req_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Abuse Protection: Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- UUID string, IP, or Email
  endpoint TEXT NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_hit TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(target_identifier TEXT, target_endpoint TEXT, max_hits INTEGER, window_minutes INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_hits INTEGER;
  last_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT hit_count, last_hit INTO current_hits, last_time 
  FROM rate_limits 
  WHERE identifier = target_identifier AND endpoint = target_endpoint;
  
  IF NOT FOUND THEN
    INSERT INTO rate_limits (identifier, endpoint) VALUES (target_identifier, target_endpoint);
    RETURN TRUE;
  END IF;

  -- Reset if window passed
  IF last_time < now() - (window_minutes || ' minutes')::INTERVAL THEN
    UPDATE rate_limits SET hit_count = 1, last_hit = now() WHERE identifier = target_identifier AND endpoint = target_endpoint;
    RETURN TRUE;
  END IF;

  -- Check limit
  IF current_hits >= max_hits THEN
    RETURN FALSE;
  END IF;

  UPDATE rate_limits SET hit_count = hit_count + 1, last_hit = now() WHERE identifier = target_identifier AND endpoint = target_endpoint;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
