import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

// Initialize Firebase
let app;
let auth;
let storage;
let rtdb;
let db;

if (!firebaseConfig.apiKey) {
  console.warn("Firebase API Key missing. Firebase features will be disabled.");
} else {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    storage = getStorage(app)
    rtdb = getDatabase(app)

    // Initialize Firestore with persistence
    if (typeof window !== "undefined") {
      try {
        // In some environments, multiple initializations can cause lease issues.
        // We use getFirestore first to see if it's already setup.
        db = getFirestore(app);
      } catch (e) {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({ 
            tabManager: persistentMultipleTabManager() 
          }),
          experimentalAutoDetectLongPolling: true
        });
      }
    } else {
      db = getFirestore(app);
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { app, auth, db, storage, rtdb, firebaseConfig }
