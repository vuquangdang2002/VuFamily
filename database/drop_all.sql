-- =========================================================================
-- Xoá toàn bộ Database (Dùng khi cần reset sạch hệ thống)
-- Chạy trong Supabase SQL Editor
-- CẢNH BÁO: Lệnh này sẽ xoá VĨNH VIỄN toàn bộ dữ liệu hiện có trong các bảng!
-- =========================================================================

DROP TABLE IF EXISTS "funds_audit_logs" CASCADE;
DROP TABLE IF EXISTS "funds_transactions" CASCADE;
DROP TABLE IF EXISTS "call_signals" CASCADE;
DROP TABLE IF EXISTS "call_ice_candidates" CASCADE;
DROP TABLE IF EXISTS "calls" CASCADE;
DROP TABLE IF EXISTS "chat_messages" CASCADE;
DROP TABLE IF EXISTS "chat_members" CASCADE;
DROP TABLE IF EXISTS "chat_rooms" CASCADE;
DROP TABLE IF EXISTS "reactions" CASCADE;
DROP TABLE IF EXISTS "comments" CASCADE;
DROP TABLE IF EXISTS "posts" CASCADE;
DROP TABLE IF EXISTS "update_requests" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "achievements" CASCADE;
DROP TABLE IF EXISTS "members" CASCADE;
DROP TABLE IF EXISTS "family_meta" CASCADE;

-- Update lại bộ nhớ Cache của Supabase
NOTIFY pgrst, 'reload schema';
