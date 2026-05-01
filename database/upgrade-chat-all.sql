-- Chạy script này trong Supabase SQL Editor để cập nhật DB cho Giai đoạn 1 (User Status & Banning)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;


-- Chạy script này trong Supabase SQL Editor để cập nhật DB cho Giai đoạn 2 (Hệ thống Chat)

-- 10. CHAT ROOMS
CREATE TABLE IF NOT EXISTS chat_rooms (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT '',
  type TEXT CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON chat_rooms;
CREATE POLICY "Service role full access" ON chat_rooms FOR ALL USING (true) WITH CHECK (true);

-- 11. CHAT MEMBERS
CREATE TABLE IF NOT EXISTS chat_members (
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(room_id, user_id)
);
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON chat_members;
CREATE POLICY "Service role full access" ON chat_members FOR ALL USING (true) WITH CHECK (true);

-- 12. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON chat_messages;
CREATE POLICY "Service role full access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);


-- Chạy script này trong Supabase SQL Editor để cập nhật DB cho Giai đoạn 3 (Gọi Thoại WebRTC)

-- 13. CALLS (Signaling mechanism)
CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
  caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('calling', 'ongoing', 'ended', 'rejected', 'missed')) DEFAULT 'calling',
  offer TEXT,
  answer TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON calls;
CREATE POLICY "Service role full access" ON calls FOR ALL USING (true) WITH CHECK (true);

-- 14. CALL ICE CANDIDATES
CREATE TABLE IF NOT EXISTS call_ice_candidates (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  candidate TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE call_ice_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON call_ice_candidates;
CREATE POLICY "Service role full access" ON call_ice_candidates FOR ALL USING (true) WITH CHECK (true);



-- Force Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
