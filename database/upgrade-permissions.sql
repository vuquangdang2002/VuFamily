-- ═══════════════════════════════════════════
-- VuFamily Permission Upgrade: Add 'editor' role
-- Chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Drop old constraint and add new one with 'editor' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('admin', 'editor', 'viewer'));

-- 2. Force Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
