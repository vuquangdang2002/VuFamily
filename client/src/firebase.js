// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging"; // Also add messaging just in case

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

export { app, analytics, messaging };
