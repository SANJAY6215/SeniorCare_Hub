-- === ADVANCED CARE: REFILL TRACKING ===

-- 1. Add refill fields to medications table
ALTER TABLE medications 
ADD COLUMN IF NOT EXISTS pills_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refill_threshold INTEGER DEFAULT 5;

-- 2. Audit Log for Refills
CREATE OR REPLACE FUNCTION audit_medication_refill()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pills_remaining > OLD.pills_remaining THEN
    INSERT INTO security_logs (user_id, event_type, description, severity)
    VALUES (NEW.user_id, 'MEDICATION_REFILLED', 
      'Medication ' || NEW.name || ' refilled. New count: ' || NEW.pills_remaining, 
      'info');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_medication_refill ON medications;
CREATE TRIGGER on_medication_refill
  AFTER UPDATE OF pills_remaining ON medications
  FOR EACH ROW
  EXECUTE FUNCTION audit_medication_refill();

-- 3. Optimization: Index for refill checks
CREATE INDEX IF NOT EXISTS idx_medications_low_stock 
ON medications (user_id) 
WHERE (pills_remaining <= refill_threshold);
