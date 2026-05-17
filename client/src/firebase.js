// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
import { getRemoteConfig } from "firebase/remote-config";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Default configurations
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
remoteConfig.defaultConfig = {
  "api_base_url": API_BASE_URL,
  "enable_new_call_ui": true,
  "maintenance_mode": false
};

export { app, analytics, messaging, remoteConfig };
