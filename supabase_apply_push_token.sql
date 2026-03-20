-- Add push notification token to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
