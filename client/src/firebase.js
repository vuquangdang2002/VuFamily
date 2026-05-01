// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";
import { getRemoteConfig } from "firebase/remote-config";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuFE7c3FGNmG-0j0lwLr-JXy4dachfK4o",
  authDomain: "vufamily-723d4.firebaseapp.com",
  projectId: "vufamily-723d4",
  storageBucket: "vufamily-723d4.firebasestorage.app",
  messagingSenderId: "852388108645",
  appId: "1:852388108645:web:2118b225057094e217a98c",
  measurementId: "G-ZC3QCNZ0Q4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);
const remoteConfig = getRemoteConfig(app);

// Default configurations
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
remoteConfig.defaultConfig = {
  "api_base_url": "https://api.dangvq.online",
  "enable_new_call_ui": true,
  "maintenance_mode": false
};

export { app, analytics, messaging, remoteConfig };
