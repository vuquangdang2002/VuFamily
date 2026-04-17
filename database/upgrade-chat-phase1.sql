-- Chạy script này trong Supabase SQL Editor để cập nhật DB cho Giai đoạn 1 (User Status & Banning)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT CHECK(status IN ('active', 'banned')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Force Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
