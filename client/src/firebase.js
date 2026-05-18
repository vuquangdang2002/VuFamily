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

// Default configurations
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
remoteConfig.defaultConfig = {
  "api_base_url": API_BASE_URL,
  "enable_new_call_ui": true,
  "maintenance_mode": false
};

// Utilities for fetching and reading remote configs
export const syncRemoteConfig = async () => {
  try {
    const fetched = await fetchAndActivate(remoteConfig);
    if (fetched) {
      console.log('✅ Firebase Remote Config fetched and activated.');
    } else {
      console.log('✅ Firebase Remote Config already up-to-date.');
    }
    window.dispatchEvent(new Event('remoteConfigUpdated'));
  } catch (err) {
    console.error('❌ Firebase Remote Config sync failed:', err);
  }
};

export const getRemoteConfigValue = (key, type = 'string') => {
  try {
    const val = getValue(remoteConfig, key);
    if (type === 'boolean') return val.asBoolean();
    if (type === 'number') return val.asNumber();
    return val.asString();
  } catch (e) {
    console.error(`Error getting remote config [${key}]:`, e);
    return null;
  }
};

export { app, analytics, messaging, remoteConfig };
