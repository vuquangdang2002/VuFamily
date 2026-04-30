// Supabase client connection
// Thay thế sql.js connection — dùng cho Vercel serverless functions
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_URL hoặc SUPABASE_SERVICE_KEY chưa được cấu hình!');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: { persistSession: false }
});

module.exports = { supabase };
