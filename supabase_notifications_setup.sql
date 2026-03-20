-- Setup trigger for missed medication notifications
-- This script enables HTTP hooks and creates a trigger on the dose_logs table

-- 1. Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the notification function
CREATE OR REPLACE FUNCTION notify_caregiver_on_missed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if the status was changed to 'missed'
  IF (NEW.status = 'missed' AND (OLD.status IS NULL OR OLD.status != 'missed')) THEN
    PERFORM
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-caregiver',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.headers')::jsonb->>'authorization'
        ),
        body := jsonb_build_object(
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD)
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to dose_logs
DROP TRIGGER IF EXISTS tr_notify_missed ON dose_logs;
CREATE TRIGGER tr_notify_missed
AFTER UPDATE ON dose_logs
FOR EACH ROW
EXECUTE FUNCTION notify_caregiver_on_missed();

-- NOTE: Since I don't have YOUR_PROJECT_REF, you can also set this up
-- visually in the Supabase Dashboard under Database -> Webhooks.
-- Set it to:
-- Table: dose_logs
-- Events: Update
-- Filter: status = missed
-- URL: your Edge Function URL
