// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3hA-rtZY4KzTbi_lx-xe00aSwHWnLrVg",
  authDomain: "vu-family.firebaseapp.com",
  projectId: "vu-family",
  storageBucket: "vu-family.firebasestorage.app",
  messagingSenderId: "115612405410",
  appId: "1:115612405410:web:89a7aac3ed180bed2251fb",
  measurementId: "G-FB73XS6WN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);
const remoteConfig = getRemoteConfig(app);

import { API_BASE_URL } from './config.js';

// Cấu hình mặc định (Default configurations)
// Sẽ được sử dụng nếu không có kết nối mạng hoặc Remote Config chưa kịp tải về.
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // Cache cấu hình trong 1 giờ

remoteConfig.defaultConfig = {
  // Đường dẫn gốc của API Server (VD: localhost hoặc https://...)
  "api_base_url": API_BASE_URL,
  
  // Kích hoạt giao diện gọi điện mới (Video/Voice Call)
  "enable_new_call_ui": true,
  
  // Bật/tắt chế độ bảo trì toàn hệ thống
  "maintenance_mode": false,
  
  // (NEWSFEED) Thời gian bộ nhớ đệm bảng tin (tính bằng milli-giây).
  // 300000 = 5 phút. Khi người dùng quay lại Bảng tin, nếu quá thời gian này 
  // hệ thống sẽ gọi API ngầm để kiểm tra có bài mới không.
  "newsfeed_refresh_interval_ms": 300000 
};

import { updateAppConfigFromRemote } from './config.js';
import { getAll } from "firebase/remote-config";
import { myLog, myError } from './shared/utils/logger.js';

// Utilities for fetching and reading remote configs
export const syncRemoteConfig = async () => {
  try {
    const fetched = await fetchAndActivate(remoteConfig);
    if (fetched) {
      myLog('FIREBASE', '✅ Firebase Remote Config fetched and activated.');
    } else {
      myLog('FIREBASE', '✅ Firebase Remote Config already up-to-date.');
    }
    
    // Đọc tất cả cấu hình từ Firebase và parse tự động vào AppConfig
    const allConfigs = getAll(remoteConfig);
    updateAppConfigFromRemote(allConfigs);
    
    // Báo hiệu UI cập nhật
    window.dispatchEvent(new Event('remoteConfigUpdated'));
  } catch (err) {
    myError('FIREBASE', '❌ Firebase Remote Config sync failed:', err);
  }
};

export { app, analytics, messaging, remoteConfig };
