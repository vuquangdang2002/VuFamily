-- ==========================================
-- VU FAMILY DATABASE OPTIMIZATIONS
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create Trigram Extension for fast partial text search (ilike)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Indexes on frequently searched columns in members table
CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_birth_place_trgm ON members USING GIN (birth_place gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_note_trgm ON members USING GIN (note gin_trgm_ops);

-- 3. Standard indexes for foreign keys to speed up joins
CREATE INDEX IF NOT EXISTS idx_members_parent_id ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_spouse_id ON members(spouse_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- 4. Index for sorting 
CREATE INDEX IF NOT EXISTS idx_members_generation_birth ON members(generation, birth_date);
