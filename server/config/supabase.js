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

// Manual Failover Toggle (via Constants)
if (FEATURES.USE_BACKUP_DATABASE && backupUrl && backupKey) {
    console.log('🔄 Manual Failover: Đang kết nối tới Backup Database...');
    activeUrl = backupUrl;
    activeKey = backupKey;
}

// Auto-Failover Fetcher (Tự động chuyển sang DB phụ nếu DB chính sập)
const autoFailoverFetch = async (url, options) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status >= 500) {
            throw new Error(`Primary DB returned 5xx error: ${response.status}`);
        }
        return response;
    } catch (err) {
        if (backupUrl && backupKey && url.toString().includes(primaryUrl)) {
            console.warn(`⚠️ Primary DB lỗi (${err.message}). Đang tự động Failover sang Backup DB...`);
            
            // Rewrite URL and API keys for Backup DB
            const fallbackUrl = url.toString().replace(primaryUrl, backupUrl);
            const fallbackOptions = { ...options };
            
            if (fallbackOptions.headers) {
                const newHeaders = new Headers(fallbackOptions.headers);
                if (newHeaders.has('apikey')) newHeaders.set('apikey', backupKey);
                if (newHeaders.has('Authorization')) newHeaders.set('Authorization', `Bearer ${backupKey}`);
                fallbackOptions.headers = newHeaders;
            }
            
            return fetch(fallbackUrl, fallbackOptions);
        }
        throw err;
    }
};

const supabase = createClient(activeUrl || '', activeKey || '', {
    auth: { persistSession: false },
    global: { fetch: autoFailoverFetch }
});

module.exports = { supabase };
