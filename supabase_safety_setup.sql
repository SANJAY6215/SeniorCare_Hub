-- Function to reset check-in status every midnight
CREATE OR REPLACE FUNCTION reset_daily_check_ins()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET check_in_status = 'pending'
  WHERE role = 'senior';
END;
$$ LANGUAGE plpgsql;

-- To actually run this daily, the user would need to enable pg_cron:
-- SELECT cron.schedule('0 0 * * *', 'SELECT reset_daily_check_ins()');
