// Application Configuration (Tự động đọc từ file .env ở thư mục gốc)

// Tên miền chính của hệ thống
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'family.dangvq.online';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `https://${APP_DOMAIN}/api`;

// URL gốc của server (dùng cho REST API)
export const APP_URL = import.meta.env.VITE_APP_URL || `https://${APP_DOMAIN}`;

// URL của Socket.io Hub (Chat + Call real-time)
// Khi deploy trên Vercel: trỏ tới server Node.js riêng (Railway/Render/VPS)
// Khi dev local: cùng server Express (localhost:3000)
export const HUB_URL = import.meta.env.VITE_HUB_URL || (
    import.meta.env.DEV
        ? 'http://localhost:3000'
        : `https://${APP_DOMAIN}`
);
