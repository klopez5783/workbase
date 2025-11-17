import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDcRWnHywc7uWUqFwb-qLrEV-VfhdVRea8",
  authDomain: "workbase-8dfe2.firebaseapp.com",
  projectId: "workbase-8dfe2",
  storageBucket: "workbase-8dfe2.firebasestorage.app",
  messagingSenderId: "1081396149579",
  appId: "1:1081396149579:web:ca974b7066c2148d603cce",
  measurementId: "G-QM172SZXP9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const functions = getFunctions(app, 'us-east1');

// Connect to emulators in development
// IMPORTANT: This must run BEFORE any auth operations
const USE_EMULATORS = true; // ← SET TO true TO USE EMULATORS

if (USE_EMULATORS && typeof window !== 'undefined') {
  // Only connect once
  let emulatorsConnected = false;
  
  if (!emulatorsConnected) {
    try {
      console.log('🔧 Connecting to Firebase Emulators...');
      
      // Connect to Auth Emulator
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { 
        disableWarnings: true 
      });
      
      // Connect to Firestore Emulator
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      
      // Connect to Storage Emulator
      connectStorageEmulator(storage, "127.0.0.1", 9199);

      // Connect to Functions Emulator
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      
      emulatorsConnected = true;
      
      console.log('✅ Connected to Firebase Emulators:');
      console.log('   - Auth: http://127.0.0.1:9099');
      console.log('   - Firestore: http://127.0.0.1:8080');
      console.log('   - Storage: http://127.0.0.1:9199');
      console.log('   - Functions: http://127.0.0.1:5001'); 
      console.log('   - UI: http://127.0.0.1:4000');
    } catch (error) {
      console.error('❌ Failed to connect to emulators:', error);
      console.error('Make sure emulators are running: firebase emulators:start');
    }
  }
} else {
  console.log('🌐 Using Production Firebase');
}

export default app;