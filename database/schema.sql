-- ═══════════════════════════════════════════
-- VuFamily Supabase Schema (Standard Version)
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. FAMILY METADATA
CREATE TABLE IF NOT EXISTS family_meta (
  id SERIAL PRIMARY KEY,
  family_name TEXT DEFAULT 'Vũ',
  description TEXT DEFAULT '',
  origin_place TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEMBERS
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  gender INTEGER CHECK(gender IN (0, 1)) DEFAULT 1,
  birth_date TEXT,
  birth_time TEXT,
  death_date TEXT,
  death_date_lunar TEXT,
  birth_place TEXT DEFAULT '',
  death_place TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  note TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  birth_order INTEGER,
  child_type TEXT CHECK(child_type IN ('biological', 'adopted')) DEFAULT 'biological',
  parent_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  spouse_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  generation INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category TEXT CHECK(category IN ('education', 'work', 'social', 'award', 'other')) DEFAULT 'other',
  title TEXT NOT NULL,
  organization TEXT DEFAULT '',
  start_year INTEGER,
  end_year INTEGER,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EVENTS
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  event_type TEXT DEFAULT 'other',
  event_date TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USERS (accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT CHECK(role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
  last_active TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. UPDATE REQUESTS
CREATE TABLE IF NOT EXISTS update_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL,
  changes TEXT NOT NULL,
  note TEXT DEFAULT '',
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. POSTS (Bảng tin dòng họ)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMMENTS (bình luận bảng tin)
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. REACTIONS (cảm xúc bảng tin)
CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- 10. CHAT ROOMS
CREATE TABLE IF NOT EXISTS chat_rooms (
  id SERIAL PRIMARY KEY,
  name TEXT DEFAULT '',
  type TEXT CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CHAT MEMBERS
CREATE TABLE IF NOT EXISTS chat_members (
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(room_id, user_id)
);

-- 12. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 14. CALL ICE CANDIDATES
CREATE TABLE IF NOT EXISTS call_ice_candidates (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  candidate TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CALL SIGNALS (Mesh WebRTC)
CREATE TABLE IF NOT EXISTS call_signals (
  id SERIAL PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('offer', 'answer')),
  payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INDEXES & OPTIMIZATIONS
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_generation ON members(generation);
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_birth_place_trgm ON members USING GIN (birth_place gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_note_trgm ON members USING GIN (note gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_generation_birth ON members(generation, birth_date);

CREATE INDEX IF NOT EXISTS idx_achievements_member ON achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_events_member ON events(member_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON update_requests(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (Service Role Default)
-- ═══════════════════════════════════════════
ALTER TABLE family_meta ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON family_meta; CREATE POLICY "Service role full access" ON family_meta FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE members ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON members; CREATE POLICY "Service role full access" ON members FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON achievements; CREATE POLICY "Service role full access" ON achievements FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE events ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON events; CREATE POLICY "Service role full access" ON events FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE users ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON users; CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON update_requests; CREATE POLICY "Service role full access" ON update_requests FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON posts; CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON comments; CREATE POLICY "Service role full access" ON comments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON reactions; CREATE POLICY "Service role full access" ON reactions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON chat_rooms; CREATE POLICY "Service role full access" ON chat_rooms FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON chat_members; CREATE POLICY "Service role full access" ON chat_members FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON chat_messages; CREATE POLICY "Service role full access" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE calls ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON calls; CREATE POLICY "Service role full access" ON calls FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE call_ice_candidates ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON call_ice_candidates; CREATE POLICY "Service role full access" ON call_ice_candidates FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Service role full access" ON call_signals; CREATE POLICY "Service role full access" ON call_signals FOR ALL USING (true) WITH CHECK (true);

-- Force Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
