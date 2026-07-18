PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS family_meta;
    CREATE TABLE family_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT DEFAULT 'Vũ',
      description TEXT DEFAULT '',
      origin_place TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS members;
    CREATE TABLE members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      parent_id INTEGER,
      spouse_id INTEGER,
      generation INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS achievements;
    CREATE TABLE achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      category TEXT CHECK(category IN ('education', 'work', 'social', 'award', 'other')) DEFAULT 'other',
      title TEXT NOT NULL,
      organization TEXT DEFAULT '',
      start_year INTEGER,
      end_year INTEGER,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS events;
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      event_type TEXT DEFAULT 'other',
      event_date TEXT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS users;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      role TEXT CHECK(role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
      status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
      last_active DATETIME,
      is_online BOOLEAN DEFAULT false,
      email_verified BOOLEAN DEFAULT false,
      verification_token TEXT,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS update_requests;
    CREATE TABLE update_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      changes TEXT NOT NULL,
      note TEXT DEFAULT '',
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      reject_reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS posts;
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS comments;
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS reactions;
    CREATE TABLE reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id, emoji)
    );
DROP TABLE IF EXISTS chat_rooms;
    CREATE TABLE chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      type TEXT CHECK(type IN ('direct', 'group')) DEFAULT 'direct',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS chat_members;
    CREATE TABLE chat_members (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(room_id, user_id)
    );
DROP TABLE IF EXISTS chat_messages;
    CREATE TABLE chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS calls;
    CREATE TABLE calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      caller_id INTEGER,
      status TEXT CHECK(status IN ('calling', 'ongoing', 'ended', 'rejected', 'missed')) DEFAULT 'calling',
      offer TEXT,
      answer TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );
DROP TABLE IF EXISTS call_ice_candidates;
    CREATE TABLE call_ice_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      sender_id INTEGER,
      to_user_id INTEGER,
      candidate TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS call_signals;
    CREATE TABLE call_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      from_user_id INTEGER,
      to_user_id INTEGER,
      type TEXT CHECK(type IN ('offer', 'answer')),
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered BOOLEAN DEFAULT 0
    );
DROP TABLE IF EXISTS funds_transactions;
    CREATE TABLE funds_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
      amount_encrypted TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT CHECK(category IN ('education', 'death_anniversary', 'travel', 'construction', 'award', 'other')) DEFAULT 'other',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS funds_audit_logs;
    CREATE TABLE funds_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      action TEXT CHECK(action IN ('CREATED', 'UPDATED', 'DELETED')) NOT NULL,
      old_amount_encrypted TEXT,
      new_amount_encrypted TEXT,
      modified_by INTEGER,
      modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DROP TABLE IF EXISTS storage_objects;
    CREATE TABLE storage_objects (
      id TEXT PRIMARY KEY,
      bucket TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT,
      data BLOB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- Seeding table: members
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (1, 'Vũ Văn Tổ', 1, '1900-01-15', NULL, '1975-08-20', NULL, 'Hà Nam', 'Hà Nam', 'Nông dân', '', '', '', 'Cụ Tổ - Thế hệ thứ nhất', '', NULL, 'biological', NULL, 2, 1, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (2, 'Nguyễn Thị Tổ', 0, '1905-03-10', NULL, '1980-12-05', NULL, 'Hà Nam', 'Hà Nam', '', '', '', '', 'Cụ Bà', '', NULL, 'biological', NULL, 1, 1, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (3, 'Vũ Văn An', 1, '1930-05-20', '06:30', '2005-11-15', NULL, 'Hà Nam', 'Hà Nội', 'Giáo viên', '', '', '', 'Con trưởng', '', 1, 'biological', 1, 4, 2, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (4, 'Trần Thị Bình', 0, '1934-09-08', NULL, '2010-03-22', NULL, 'Nam Định', 'Hà Nội', '', '', '', '', '', '', NULL, 'biological', NULL, 3, 2, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (5, 'Vũ Văn Bảo', 1, '1935-07-12', '08:00', '2015-06-18', NULL, 'Hà Nam', 'Hà Nội', 'Bộ đội', '', '', '', 'Con thứ hai', '', 2, 'biological', 1, 6, 2, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (6, 'Lê Thị Cúc', 0, '1938-11-25', NULL, NULL, NULL, 'Hà Nội', '', '', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 5, 2, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (7, 'Vũ Thị Chi', 0, '1940-04-03', NULL, NULL, NULL, 'Hà Nam', '', 'Y tá', '', '', '', 'Con gái út', '', 3, 'biological', 1, NULL, 2, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (8, 'Vũ Đăng Dũng', 1, '1958-02-14', '05:15', NULL, NULL, 'Hà Nội', '', 'Kỹ sư', '0912345678', '', 'Hà Nội', '', '', 1, 'biological', 3, 9, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (9, 'Phạm Thị Hoa', 0, '1960-08-30', NULL, NULL, NULL, 'Hải Phòng', '', 'Kế toán', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 8, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (10, 'Vũ Văn Em', 1, '1962-12-01', '07:45', NULL, NULL, 'Hà Nội', '', 'Bác sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 3, 11, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (11, 'Đỗ Thị Giang', 0, '1965-06-18', NULL, NULL, NULL, 'Hà Nội', '', 'Giáo viên', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 10, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (12, 'Vũ Minh Hoàng', 1, '1960-10-05', '14:30', NULL, NULL, 'Hà Nội', '', 'Doanh nhân', '', '', 'TP.HCM', '', '', 1, 'biological', 5, 13, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (13, 'Ngô Thị Lan', 0, '1963-03-22', NULL, NULL, NULL, 'Bắc Ninh', '', '', '', '', 'TP.HCM', '', '', NULL, 'biological', NULL, 12, 3, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (14, 'Vũ Đăng Khoa', 1, '1985-09-15', '10:20', NULL, NULL, 'Hà Nội', '', 'Lập trình viên', '0987654321', 'khoa@email.com', 'Hà Nội', '', '', 1, 'biological', 8, 15, 4, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (15, 'Hoàng Thị Mai', 0, '1988-01-28', NULL, NULL, NULL, 'Hà Nội', '', 'Thiết kế', '', '', 'Hà Nội', '', '', NULL, 'biological', NULL, 14, 4, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (16, 'Vũ Thị Ngọc', 0, '1988-07-07', '16:00', NULL, NULL, 'Hà Nội', '', 'Dược sĩ', '', '', 'Hà Nội', '', '', 2, 'biological', 8, NULL, 4, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (17, 'Vũ Minh Phúc', 1, '1990-04-12', NULL, NULL, NULL, 'Hà Nội', '', 'Kiến trúc sư', '', '', 'Đà Nẵng', '', '', 1, 'biological', 10, NULL, 4, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (18, 'Vũ Hoàng Quân', 1, '1988-11-20', NULL, NULL, NULL, 'Hà Nội', '', 'Luật sư', '', '', 'TP.HCM', '', '', 1, 'biological', 12, NULL, 4, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO members (id, name, gender, birth_date, birth_time, death_date, death_date_lunar, birth_place, death_place, occupation, phone, email, address, note, photo, birth_order, child_type, parent_id, spouse_id, generation, created_at, updated_at) VALUES (19, 'Vũ Gia Bảo', 1, '2015-06-01', '09:30', NULL, NULL, 'Hà Nội', '', 'Học sinh', '', '', 'Hà Nội', '', '', 1, 'biological', 14, NULL, 5, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');

-- Seeding table: achievements
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (1, 3, 'education', 'Tốt nghiệp Đại học Sư phạm', 'Đại học Sư phạm Hà Nội', 1948, 1952, 'Bằng giỏi', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (2, 5, 'work', 'Phục vụ trong quân đội', 'QĐND Việt Nam', 1955, 1975, 'Đại úy', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (3, 5, 'award', 'Huân chương chiến sĩ vẻ vang', 'Nhà nước', 1975, NULL, 'Hạng Nhất', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (4, 8, 'education', 'Tốt nghiệp Kỹ sư Xây dựng', 'ĐH Xây dựng HN', 1976, 1981, '', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (5, 8, 'work', 'Kỹ sư trưởng', 'Công ty XD Số 1', 1981, 2018, '', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (6, 8, 'social', 'Bí thư chi bộ', 'Đảng CSVN', 1990, 2010, '', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (7, 10, 'education', 'Tiến sĩ Y khoa', 'ĐH Y Hà Nội', 1980, 1992, 'Chuyên khoa Ngoại', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (8, 14, 'education', 'Cử nhân CNTT', 'ĐH Bách Khoa HN', 2003, 2008, 'Bằng giỏi', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (9, 14, 'work', 'Tech Lead', 'Startup ABC', 2015, NULL, 'Đồng sáng lập', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO achievements (id, member_id, category, title, organization, start_year, end_year, description, created_at) VALUES (10, 14, 'social', 'Bí thư chi đoàn', 'Đoàn TNCS HCM', 2003, 2008, 'Đoàn viên ưu tú', '2026-06-03T18:35:17.769233+00:00');

-- Seeding table: users
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (2, 'admin1', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 1', '', '', '', 'admin', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (3, 'admin2', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 2', '', '', '', 'admin', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (4, 'admin3', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 3', '', '', '', 'admin', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (5, 'admin4', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 4', '', '', '', 'admin', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (6, 'admin5', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 5', '', '', '', 'admin', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (8, 'viewer2', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 2', '', '', '', 'viewer', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (9, 'viewer3', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 3', '', '', '', 'viewer', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (10, 'viewer4', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 4', '', '', '', 'viewer', 'active', NULL, 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-03T18:35:17.769233+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (11, 'viewer5', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 5', '', '', '', 'viewer', 'active', '2026-06-04T17:29:12.362+00:00', 0, 1, NULL, 'ea38b90e72517015045b6cf8ffbfc49518d087d60bd585fcefdb904e78d72942', '2026-06-03T18:35:17.769233+00:00', '2026-06-04T17:27:35.477+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (1, 'dangvq', '$2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty', 'Vũ Quang Đáng', '', '', '', 'admin', 'active', '2026-06-21T08:55:00.981+00:00', 0, 1, NULL, '8cd49dc57f78706e4d078a8c1d0bfe38213ec21627d1c401cc9f1510526c3003', '2026-06-03T18:35:17.769233+00:00', '2026-06-20T15:50:53.241+00:00');
INSERT INTO users (id, username, password, display_name, email, phone, avatar, role, status, last_active, is_online, email_verified, verification_token, token, created_at, updated_at) VALUES (7, 'viewer1', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 1', '', '', '', 'viewer', 'active', '2026-06-04T17:27:07.119+00:00', 0, 1, NULL, NULL, '2026-06-03T18:35:17.769233+00:00', '2026-06-04T17:26:33.438+00:00');

-- Seeding table: posts
INSERT INTO posts (id, content, user_id, created_at) VALUES (1, 'Chào mừng tất cả thành viên dòng họ Vũ đã gia nhập hệ thống Gia Phả trực tuyến. Mọi người có thể vào phần Gia phả để xem sơ đồ dòng họ nhé!', 1, '2026-06-03T18:35:17.769233+00:00');
INSERT INTO posts (id, content, user_id, created_at) VALUES (2, 'Cuối tuần này dòng họ tổ chức họp mặt tại nhà thờ tổ. Kính mời các bác, các chú và anh chị em sắp xếp thời gian tham dự.', 2, '2026-06-03T18:35:17.769233+00:00');

-- Seeding table: chat_rooms
INSERT INTO chat_rooms (id, name, type, created_by, created_at, updated_at) VALUES (2, NULL, 'direct', NULL, '2026-06-04T17:25:43.770023+00:00', '2026-06-04T17:25:50.214+00:00');
INSERT INTO chat_rooms (id, name, type, created_by, created_at, updated_at) VALUES (3, NULL, 'direct', NULL, '2026-06-04T17:27:13.890904+00:00', '2026-06-04T17:27:19.081+00:00');
INSERT INTO chat_rooms (id, name, type, created_by, created_at, updated_at) VALUES (1, '{"n":"test 123","ic":"6RW02J49","aa":true}', 'group', NULL, '2026-06-04T17:15:00.75216+00:00', '2026-06-06T04:00:00.803+00:00');

-- Seeding table: chat_members
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 2, 'member', '2026-06-04T17:15:01.067217+00:00', '2026-06-04T17:15:01.067217+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 8, 'member', '2026-06-04T17:15:01.067217+00:00', '2026-06-04T17:15:01.067217+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 7, 'member', '2026-06-04T17:15:01.067217+00:00', '2026-06-04T17:15:01.067217+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (2, 1, 'member', '2026-06-06T04:12:56.649+00:00', '2026-06-04T17:25:44.035683+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (3, 1, 'member', '2026-06-06T04:13:01.662+00:00', '2026-06-04T17:27:14.158631+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (2, 7, 'member', '2026-06-04T17:26:57.602+00:00', '2026-06-04T17:25:44.035683+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 4, 'member', '2026-06-04T17:23:12.240058+00:00', '2026-06-04T17:23:12.240058+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (3, 11, 'member', '2026-06-04T17:27:14.158631+00:00', '2026-06-04T17:27:14.158631+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 3, 'admin', '2026-06-04T17:15:01.067217+00:00', '2026-06-04T17:15:01.067217+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 9, 'member', '2026-06-04T17:23:17.02164+00:00', '2026-06-04T17:23:17.02164+00:00');
INSERT INTO chat_members (room_id, user_id, role, last_read_at, joined_at) VALUES (1, 1, 'admin', '2026-06-20T15:51:27.336+00:00', '2026-06-04T17:15:01.067217+00:00');

-- Seeding table: chat_messages
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (1, 1, 1, '18993f3a8d5472ed2c20f1b4dfcf3122:dbfbb62abbf739e9700674f78db05cd0:67e29ec59514655139467d7a807c461ac75bbafb0832183ddfab9892452dc98e4601d6fac4d9cd348f27cede51000d62219ef28843ae64f67848f685db', '2026-06-04T17:23:12.767747+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (2, 1, 1, '7f870530547f5663bbf7ace8bb7c911b:b0294d5a1f159a61398bd04d893b2c6b:d0d478a4e8934b850cb5e0b937f54f09e6b0ac3ca6714115af893a7f1d514625f2759703cf37a97c7f91ded1c8e3cfb301e0016afe72ed', '2026-06-04T17:23:17.54303+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (3, 2, 1, 'b6ca1c9157f3da1e2b94f9ca9c634f8d:40c8253310b95e1e483d4d4919929a72:3a457455a0ebe3f24562d8b7043828f5b5c6ad56bbd415423a950dc974993e1e07a49873c47b60e33712bab0fa39707c2a', '2026-06-04T17:25:50.080143+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (4, 3, 1, '2e4090cb19a72b8a6f32c7b7363ed0e2:4820b7cf2757d5f07195c244fd006788:8319313a10ebca397cd04601108bc067699a675277bf153fb25864193ebff078e82921c9d0a258a7146ec80c5e7363b7ad', '2026-06-04T17:27:18.954441+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (5, 1, 11, 'd8be6419728651057dd483ffee636f0f:27a18486527caa4e29f92d283a30f919:20543703cf96191515e9c36ef7de216a887a7811179ab644865d5962c8802c3431c0ff67db0f9756282a456928ff78e3b347f2e5de', '2026-06-04T17:28:05.986258+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (6, 1, 1, 'f1931e349b504f3f89bbbd84b9e3f48b:ef172cb503e8ec8f3c0c59f7cdca6074:7f3dcc64192b51c63c0f9c7cbed2d3bc4789a0656e230f8c0c37ced799364ec05b59d7302e319f32b0bb056eaffafb4ca0ef786f60a2ad29ab9ea692908aea350e8f2dce56e2e0983a9dc8ddc2786ba6e3', '2026-06-06T03:59:12.837513+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (7, 1, 1, '221f2c27671eaec1443e5ca0b57a8a8e:596935667b72796b62a5a50e5399a59b:074d8e9da6187154b13adcff1a3644487a51ce81aa141404a8a8f6ab98d22fe13dff858ddee5a4ca05074f973ae34448e6051ae2df94af32d556fc0f9750fcad74e337ba169b3e620df3db9dd50c15337b303abd711c14', '2026-06-06T03:59:38.412811+00:00');
INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) VALUES (8, 1, 1, 'da250b190b56cc16d1f965b3815e604b:8a0493399645c8ed9c6e41b151a10d3d:a2a3d25220ce93843e1e186dfb1392b5066c29293039066aa0360bfc2e59cdcc69d996ac0b81f4aa2618f8f412f4a1d3d149161b53fa0a169e2660ea03538aa70c0adc4ab7ee160d422027a8', '2026-06-06T04:00:00.670796+00:00');

-- Seeding table: funds_transactions
INSERT INTO funds_transactions (id, type, amount_encrypted, description, category, created_by, created_at, updated_at) VALUES (2, 'INCOME', 'ab0bf185398c3c3bae39d18cad19194a:68fad2a394c8bc9c4265f15a0067a6b4:e57abfea4e04', 'Đáng đóng', 'education', 1, '2026-06-04T17:08:49.513351+00:00', '2026-06-04T17:08:49.513351+00:00');
INSERT INTO funds_transactions (id, type, amount_encrypted, description, category, created_by, created_at, updated_at) VALUES (3, 'EXPENSE', '1b93fb98c8bdc74b60b4539cfbcb1e8c:9e8782dd448119fabcca4dbde5ee245d:6319695dc8', 'Mua phần thưởng', 'education', 1, '2026-06-04T17:09:15.116046+00:00', '2026-06-04T17:09:15.116046+00:00');

-- Seeding table: funds_audit_logs
INSERT INTO funds_audit_logs (id, transaction_id, action, old_amount_encrypted, new_amount_encrypted, modified_by, modified_at) VALUES (2, NULL, 'DELETED', '5d2d6fc89cd1d569d3001e9a906d560a:ceee73989b6d232359e361098eb68300:6fad', NULL, 1, '2026-06-04T16:58:32.868924+00:00');
INSERT INTO funds_audit_logs (id, transaction_id, action, old_amount_encrypted, new_amount_encrypted, modified_by, modified_at) VALUES (3, 2, 'CREATED', NULL, 'ab0bf185398c3c3bae39d18cad19194a:68fad2a394c8bc9c4265f15a0067a6b4:e57abfea4e04', 1, '2026-06-04T17:08:50.294858+00:00');
INSERT INTO funds_audit_logs (id, transaction_id, action, old_amount_encrypted, new_amount_encrypted, modified_by, modified_at) VALUES (4, 3, 'CREATED', NULL, '1b93fb98c8bdc74b60b4539cfbcb1e8c:9e8782dd448119fabcca4dbde5ee245d:6319695dc8', 1, '2026-06-04T17:09:15.395712+00:00');

-- Seeding table: update_requests
INSERT INTO update_requests (id, user_id, member_id, changes, note, status, reviewed_by, reviewed_at, reject_reason, created_at) VALUES (1, 7, 14, '{"occupation": "Giám đốc Công nghệ (CTO)"}', 'Cập nhật lại chức vụ mới', 'rejected', 1, '2026-06-04T16:58:01.964+00:00', '', '2026-06-03T18:35:17.769233+00:00');

PRAGMA foreign_keys = ON;