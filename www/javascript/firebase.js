import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Prototype: skip Firebase if config is incomplete
if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  try {
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
  } catch (e) {
    console.warn('[Eki Story] Firebase init skipped (prototype mode):', e.message);
  }
} else {
  console.warn('[Eki Story] Firebase config missing – running in prototype mode without backend.');
}
