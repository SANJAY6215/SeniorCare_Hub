-- 1. Completely remove the broken/mismatched table
DROP TABLE IF EXISTS messages CASCADE;

-- 2. Create the exact table structure the app is actually expecting
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Apply permissions so the app can read/write without being blocked
CREATE POLICY "Enable read access" ON messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- (We skip the Realtime WebSocket command because we know from your earlier screenshot that it is already successfully attached to this table name!)
