// Application Configuration (Tự động đọc từ file .env ở thư mục gốc)

// Tên miền chính của hệ thống
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'family.dangvq.online';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `https://${APP_DOMAIN}/api`;

// URL gốc của server (dùng cho Socket.io)
export const APP_URL = import.meta.env.VITE_APP_URL || `https://${APP_DOMAIN}`;
