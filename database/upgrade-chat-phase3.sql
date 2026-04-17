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
