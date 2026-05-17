// Application Configuration
import sharedConfig from '../../shared-config.json';

// Tên miền chính của hệ thống (sửa tại shared-config.json ở thư mục gốc)
export const APP_DOMAIN = sharedConfig.APP_DOMAIN;

export const API_BASE_URL = `https://${APP_DOMAIN}/api`;
