// Supabase client connection
// Thay thế sql.js connection — dùng cho Vercel serverless functions
const { createClient } = require('@supabase/supabase-js');

const { FEATURES } = require('./constants');

const primaryUrl = process.env.SUPABASE_URL;
const primaryKey = process.env.SUPABASE_SERVICE_KEY;

const backupUrl = process.env.SUPABASE_BACKUP_URL;
const backupKey = process.env.SUPABASE_BACKUP_KEY;

if (!primaryUrl || !primaryKey) {
    console.warn('⚠️  SUPABASE_URL hoặc SUPABASE_SERVICE_KEY chưa được cấu hình!');
}

let activeUrl = primaryUrl;
let activeKey = primaryKey;

// Cơ chế Failover (Chống sập)
if (FEATURES.USE_BACKUP_DATABASE) {
    if (backupUrl && backupKey) {
        console.log('🔄 Đang kết nối tới Backup Database (Failover Active)...');
        activeUrl = backupUrl;
        activeKey = backupKey;
    } else {
        console.warn('⚠️  Tính năng Backup DB được bật nhưng chưa cấu hình SUPABASE_BACKUP_URL. Đang dùng Primary DB...');
    }
}

const supabase = createClient(activeUrl || '', activeKey || '', {
    auth: { persistSession: false }
});

module.exports = { supabase };
