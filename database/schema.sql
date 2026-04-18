-- ═══════════════════════════════════════════
-- VuFamily Supabase Schema Migration
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
  role TEXT CHECK(role IN ('admin', 'viewer')) DEFAULT 'viewer',
  status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
  last_active TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
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
  author TEXT NOT NULL,
  author_role TEXT DEFAULT 'viewer',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(spouse_id);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_generation ON members(generation);
CREATE INDEX IF NOT EXISTS idx_achievements_member ON achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_events_member ON events(member_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON update_requests(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- ═══════════════════════════════════════════
-- SEED DATA: Family metadata
-- ═══════════════════════════════════════════
INSERT INTO family_meta (family_name, description, origin_place)
VALUES ('Vũ', 'Gia phả dòng họ Vũ', 'Hà Nam')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- SEED DATA: Sample members
-- ═══════════════════════════════════════════
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation) VALUES
(1, 'Vũ Văn Tổ', 1, '1900-01-15', NULL, '1975-08-20', 'Hà Nam', 'Hà Nam', 'Nông dân', '', '', '', 'Cụ Tổ - Thế hệ thứ nhất', '', NULL, 'biological', NULL, 2, 1),
(2, 'Nguyễn Thị Tổ', 0, '1905-03-10', NULL, '1980-12-05', 'Hà Nam', 'Hà Nam', '', '', '', '', 'Cụ Bà', '', NULL, 'biological', NULL, 1, 1),
(3, 'Vũ Văn An', 1, '1930-05-20', '06:30', '2005-11-15', 'Hà Nam', 'Hà Nội', 'Giáo viên', '', '', '', 'Con trưởng', '', 1, 'biological', 1, 4, 2),
(4, 'Trần Thị Bình', 0, '1934-09-08', NULL, '2010-03-22', 'Nam Định', 'Hà Nội', '', '', '', '', '', '', NULL, 'biological', NULL, 3, 2),
(5, 'Vũ Văn Bảo', 1, '1935-07-12', '08:00', '2015-06-18', 'Hà Nam', 'Hà Nội', 'Bộ đội', '', '', '', 'Con thứ hai', '', 2, 'biological', 1, 6, 2),
(6, 'Lê Thị Cúc', 0, '1938-11-25', NULL, NULL, 'Hà Nội', '', '', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 5, 2),
(7, 'Vũ Thị Chi', 0, '1940-04-03', NULL, NULL, 'Hà Nam', '', 'Y tá', '', '', '', 'Con gái út', '', 3, 'biological', 1, NULL, 2),
(8, 'Vũ Đăng Dũng', 1, '1958-02-14', '05:15', NULL, 'Hà Nội', '', 'Kỹ sư', '0912345678', '', 'Hà Nội', '', '', 1, 'biological', 3, 9, 3),
(9, 'Phạm Thị Hoa', 0, '1960-08-30', NULL, NULL, 'Hải Phòng', '', 'Kế toán', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 8, 3),
(10, 'Vũ Văn Em', 1, '1962-12-01', '07:45', NULL, 'Hà Nội', '', 'Bác sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 3, 11, 3),
(11, 'Đỗ Thị Giang', 0, '1965-06-18', NULL, NULL, 'Hà Nội', '', 'Giáo viên', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 10, 3),
(12, 'Vũ Minh Hoàng', 1, '1960-10-05', '14:30', NULL, 'Hà Nội', '', 'Doanh nhân', '', '', 'TP.HCM', '', '', 1, 'biological', 5, 13, 3),
(13, 'Ngô Thị Lan', 0, '1963-03-22', NULL, NULL, 'Bắc Ninh', '', '', '', '', 'TP.HCM', '', '', NULL, 'biological', NULL, 12, 3),
(14, 'Vũ Đăng Khoa', 1, '1985-09-15', '10:20', NULL, 'Hà Nội', '', 'Lập trình viên', '0987654321', 'khoa@email.com', 'Hà Nội', '', '', 1, 'biological', 8, 15, 4),
(15, 'Hoàng Thị Mai', 0, '1988-01-28', NULL, NULL, 'Hà Nội', '', 'Thiết kế', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 14, 4),
(16, 'Vũ Thị Ngọc', 0, '1988-07-07', '16:00', NULL, 'Hà Nội', '', 'Dược sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 8, NULL, 4),
(17, 'Vũ Minh Phúc', 1, '1990-04-12', NULL, NULL, 'Hà Nội', '', 'Kiến trúc sư', '', '', 'Đà Nẵng', '', '', 1, 'biological', 10, NULL, 4),
(18, 'Vũ Hoàng Quân', 1, '1988-11-20', NULL, NULL, 'Hà Nội', '', 'Luật sư', '', '', 'TP.HCM', '', '', 1, 'biological', 12, NULL, 4),
(19, 'Vũ Gia Bảo', 1, '2015-06-01', '09:30', NULL, 'Hà Nội', '', 'Học sinh', '', '', 'Hà Nội', '', '', 1, 'biological', 14, NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual inserts
SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));

-- ═══════════════════════════════════════════
-- SEED DATA: Sample achievements
-- ═══════════════════════════════════════════
INSERT INTO achievements (member_id, category, title, organization, start_year, end_year, description) VALUES
(3, 'education', 'Tốt nghiệp Đại học Sư phạm', 'Đại học Sư phạm Hà Nội', 1948, 1952, 'Bằng giỏi'),
(5, 'work', 'Phục vụ trong quân đội', 'QĐND Việt Nam', 1955, 1975, 'Đại úy'),
(5, 'award', 'Huân chương chiến sĩ vẻ vang', 'Nhà nước', 1975, NULL, 'Hạng Nhất'),
(8, 'education', 'Tốt nghiệp Kỹ sư Xây dựng', 'ĐH Xây dựng HN', 1976, 1981, ''),
(8, 'work', 'Kỹ sư trưởng', 'Công ty XD Số 1', 1981, 2018, ''),
(8, 'social', 'Bí thư chi bộ', 'Đảng CSVN', 1990, 2010, ''),
(10, 'education', 'Tiến sĩ Y khoa', 'ĐH Y Hà Nội', 1980, 1992, 'Chuyên khoa Ngoại'),
(14, 'education', 'Cử nhân CNTT', 'ĐH Bách Khoa HN', 2003, 2008, 'Bằng giỏi'),
(14, 'work', 'Tech Lead', 'Startup ABC', 2015, NULL, 'Đồng sáng lập'),
(14, 'social', 'Bí thư chi đoàn', 'Đoàn TNCS HCM', 2003, 2008, 'Đoàn viên ưu tú')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- SEED DATA: Default accounts
-- Password hashes (bcrypt):
--   DangVQ@2002  → $2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty
--   Admin@1234 → $2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq
--   Viewer@1234 → $2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi
-- ═══════════════════════════════════════════
INSERT INTO users (username, password, display_name, role) VALUES
('dangvq', '$2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty', 'Vũ Quang Đáng', 'admin'),
('admin', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị viên', 'admin'),
('viewer', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Khách xem', 'viewer')
ON CONFLICT (username) DO NOTHING;

-- Reset sequences
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('achievements_id_seq', (SELECT MAX(id) FROM achievements));

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (optional - public read)
-- ═══════════════════════════════════════════
-- Disable RLS for server-side access with service key
-- The service key bypasses RLS automatically
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meta ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (this is the default behavior)
DROP POLICY IF EXISTS "Service role full access" ON members;
CREATE POLICY "Service role full access" ON members FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON achievements;
CREATE POLICY "Service role full access" ON achievements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON events;
CREATE POLICY "Service role full access" ON events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON update_requests;
CREATE POLICY "Service role full access" ON update_requests FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON family_meta;
CREATE POLICY "Service role full access" ON family_meta FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON posts;
CREATE POLICY "Service role full access" ON posts FOR ALL USING (true) WITH CHECK (true);

-- 8. COMMENTS (bình luận bảng tin)
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_role TEXT DEFAULT 'viewer',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON comments;
CREATE POLICY "Service role full access" ON comments FOR ALL USING (true) WITH CHECK (true);

-- 9. REACTIONS (cảm xúc bảng tin)
CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON reactions;
CREATE POLICY "Service role full access" ON reactions FOR ALL USING (true) WITH CHECK (true);

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
  role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
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
  to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  candidate TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE call_ice_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON call_ice_candidates;
CREATE POLICY "Service role full access" ON call_ice_candidates FOR ALL USING (true) WITH CHECK (true);

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
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON call_signals;
CREATE POLICY "Service role full access" ON call_signals FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- UPGRADE SCRIPTS (For existing databases)
-- ═══════════════════════════════════════════
-- Ensure new columns are added to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Force Supabase to reload schema cache to recognize new columns
NOTIFY pgrst, 'reload schema';

