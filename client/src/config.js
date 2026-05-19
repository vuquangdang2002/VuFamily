// ============================================================================
// CẤU HÌNH TĨNH HỆ THỐNG (STATIC CONFIGURATIONS)
// Tự động đọc từ file .env ở thư mục gốc. 
// Nếu không có biến môi trường, hệ thống sẽ sử dụng các giá trị mặc định bên dưới.
// ============================================================================
import { myLog, myWarning } from './shared/utils/logger.js';

// Tên miền chính của hệ thống. Dùng làm gốc để tạo ra các URL khác.
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'family.dangvq.online';

// URL của Backend API. Thường trỏ tới /api của tên miền chính.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `https://${APP_DOMAIN}/api`;

// URL gốc của ứng dụng (Thường dùng cho CORS hoặc tạo đường dẫn tuyệt đối)
export const APP_URL = import.meta.env.VITE_APP_URL || `https://${APP_DOMAIN}`;

// URL của Socket.io Hub (Quản lý Real-time Chat và Video/Voice Call)
// - Khi chạy Local (DEV): Trỏ thẳng tới server Express ở cổng 3000
// - Khi Deploy: Trỏ tới tên miền chính (server Node.js thực tế)
export const HUB_URL = import.meta.env.VITE_HUB_URL || (
    import.meta.env.DEV
        ? 'http://localhost:3000'
        : `https://${APP_DOMAIN}`
);

// ============================================================================
// CẤU HÌNH ĐỘNG HỆ THỐNG (CURRENT APP CONFIG)
// Là nơi HỘI TỤ (Merge) giữa cấu hình tĩnh mặc định và Firebase Remote Config.
// Tất cả các Component/Service sẽ đọc từ AppConfig này làm chuẩn duy nhất.
// ============================================================================
export const AppConfig = {
    api_base_url: API_BASE_URL,
    enable_new_call_ui: true,
    maintenance_mode: false,
    newsfeed_refresh_interval_ms: 300000,
    
    // Tính năng
    feature_tree_enabled: true,
    feature_newsfeed_enabled: true,
    feature_calendar_enabled: true,
    feature_chat_enabled: true,
    feature_history_enabled: true,
    feature_requests_enabled: true,
    // (Có thể mở rộng thêm các Config dạng Object JSON ở đây)
};

/**
 * Hàm ghi cấu hình từ Remote Config vào AppConfig hiện tại.
 * Lưu trữ dưới dạng chuỗi (String) nguyên bản.
 * Khi lấy ra, sử dụng ConfigAPI.getNumber/getBoolean/getJSON để tự động Parse (tránh Duplicate Code).
 */
export const updateAppConfigFromRemote = (remoteConfigsMap) => {
    myLog('CONFIG', '📥 Đang đồng bộ Remote Config vào bộ nhớ (AppConfig)...');
    for (const [key, valueObj] of Object.entries(remoteConfigsMap)) {
        AppConfig[key] = valueObj.asString();
    }
    myLog('CONFIG', '✅ Đã ghi đè cấu hình thành công. AppConfig hiện tại:', AppConfig);
};

// ============================================================================
// API TRUY XUẤT CẤU HÌNH (CONFIG API)
// Cung cấp các hàm tái sử dụng để lấy cấu hình an toàn, có hỗ trợ Fallback
// ============================================================================
export const ConfigAPI = {
    /** Lấy cấu hình dạng chuỗi Text */
    getString: (key, fallback = '') => {
        const val = AppConfig[key];
        if (val === undefined || val === null) return fallback;
        return String(val);
    },
    
    /** Lấy cấu hình dạng số Number */
    getNumber: (key, fallback = 0) => {
        const val = AppConfig[key];
        if (val === undefined || val === null) return fallback;
        const num = Number(val);
        return isNaN(num) ? fallback : num;
    },
    
    /** Lấy cấu hình dạng Boolean */
    getBoolean: (key, fallback = false) => {
        const val = AppConfig[key];
        if (val === undefined || val === null) return fallback;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.toLowerCase() === 'true';
        return Boolean(val);
    },
    
    /** 
     * Lấy cấu hình dạng JSON Object (Struct/Class). 
     * Hỗ trợ tự động parse nếu cấu hình vẫn đang ở dạng chuỗi.
     */
    getJSON: (key, fallback = {}) => {
        const val = AppConfig[key];
        if (val === undefined || val === null) return fallback;
        if (typeof val === 'object') return val; // Đã được parse sẵn
        try {
            return JSON.parse(val);
        } catch (error) {
            myWarning('CONFIG', `[getJSON] Lỗi parse JSON cho key '${key}':`, error, '- Đang sử dụng Fallback.');
            return fallback;
        }
    }
};
