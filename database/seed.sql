-- ═══════════════════════════════════════════
-- VuFamily Supabase - Dữ liệu Test (Seed Data)
-- ═══════════════════════════════════════════

-- 1. XOÁ DỮ LIỆU TEST CŨ (RESET)
-- Chạy lệnh này nếu bạn muốn làm sạch toàn bộ dữ liệu hiện có trong Database
TRUNCATE TABLE 
  family_meta, 
  members, 
  achievements, 
  events, 
  users, 
  update_requests, 
  posts, 
  comments, 
  reactions, 
  chat_rooms, 
  chat_members, 
  chat_messages, 
  calls, 
  call_ice_candidates, 
  call_signals 
RESTART IDENTITY CASCADE;

-- ═══════════════════════════════════════════
-- 2. THÊM DỮ LIỆU TEST MỚI
-- ═══════════════════════════════════════════

-- FAMILY METADATA
INSERT INTO family_meta (family_name, description, origin_place)
VALUES ('Vũ', 'Gia phả dòng họ Vũ', 'Hà Nam')
ON CONFLICT DO NOTHING;

-- USERS (Tài khoản mặc định)
-- Password hashes (bcrypt):
-- dangvq (DangVQ@2002) : $2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty
-- admin1-5 (Admin@1234) : $2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq
-- test1-5 (Viewer@1234) : $2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi
INSERT INTO users (username, password, display_name, role, email_verified) VALUES
('dangvq', '$2a$10$Wk9qgWNnap3v.nXvM8in6.LNLgzTGhejo7GdyUXbnnUVbI1z3Vpty', 'Vũ Quang Đáng', 'admin', true),
('admin1', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 1', 'admin', true),
('admin2', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 2', 'admin', true),
('admin3', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 3', 'admin', true),
('admin4', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 4', 'admin', true),
('admin5', '$2a$10$Su0NSYtZ2GLvzNyopSbLN.PP5Oc0wY.mqiaoXzquUE8GKffG28buq', 'Quản trị 5', 'admin', true),
('viewer1', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 1', 'viewer', true),
('viewer2', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 2', 'viewer', true),
('viewer3', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 3', 'viewer', true),
('viewer4', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 4', 'viewer', true),
('viewer5', '$2a$10$PaIpm3CwdYtJYkPx1nNNA.FlZ75UQiiLbt3b4jtFZgp.jYEkUEVPi', 'Viewer 5', 'viewer', true)
ON CONFLICT (username) DO NOTHING;

-- MEMBERS (Cây gia phả test)
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

-- ACHIEVEMENTS
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

-- POSTS (Bảng tin)
INSERT INTO posts (content, user_id) VALUES
('Chào mừng tất cả thành viên dòng họ Vũ đã gia nhập hệ thống Gia Phả trực tuyến. Mọi người có thể vào phần Gia phả để xem sơ đồ dòng họ nhé!', 1),
('Cuối tuần này dòng họ tổ chức họp mặt tại nhà thờ tổ. Kính mời các bác, các chú và anh chị em sắp xếp thời gian tham dự.', 2)
ON CONFLICT DO NOTHING;

-- EVENTS (Sự kiện)
INSERT INTO events (title, event_date, event_type, description) VALUES
('Giỗ Tổ Dòng Họ', '2026-03-10', 'other', 'Lễ giỗ tổ họ Vũ hằng năm. Địa điểm: Nhà Thờ Tổ'),
('Họp Mặt Đầu Năm', '2026-02-15', 'other', 'Gặp gỡ, chúc tết đầu năm toàn thể dòng họ. Địa điểm: Hội trường xã')
ON CONFLICT DO NOTHING;

-- UPDATE REQUESTS (Yêu cầu chỉnh sửa)
-- user_id = 7 (viewer1), member_id = 14 (Vũ Đăng Khoa)
INSERT INTO update_requests (user_id, member_id, changes, note, status) VALUES
(7, 14, '{"occupation": "Giám đốc Công nghệ (CTO)"}', 'Cập nhật lại chức vụ mới', 'pending')
ON CONFLICT DO NOTHING;

-- Cập nhật lại chuỗi Auto Increment (Tránh lỗi Duplicate Key sau khi INSERT thủ công)
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('members_id_seq', COALESCE((SELECT MAX(id) FROM members), 1));
SELECT setval('achievements_id_seq', COALESCE((SELECT MAX(id) FROM achievements), 1));
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1));
SELECT setval('events_id_seq', COALESCE((SELECT MAX(id) FROM events), 1));
SELECT setval('update_requests_id_seq', COALESCE((SELECT MAX(id) FROM update_requests), 1));
