-- Ensure messages table exists
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON messages;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON messages;

-- Create policies to allow Caregivers and Seniors to read/write messages
CREATE POLICY "Enable read access for all authenticated users" ON messages 
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all authenticated users" ON messages 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable Supabase Realtime (WebSockets) for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
