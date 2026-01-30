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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-east1');

// Connect to emulators in development
// IMPORTANT: This must run BEFORE any auth operations
// const USE_EMULATORS = true; // ← SET TO true TO USE EMULATORS

// if (USE_EMULATORS && typeof window !== 'undefined') {
//   // Only connect once
//   let emulatorsConnected = false;
  
//   if (!emulatorsConnected) {
//     try {
//     console.log('🔧 Connecting to Firebase Emulators...');
    
//     connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//     connectFirestoreEmulator(db, "127.0.0.1", 8080);
//     connectStorageEmulator(storage, "127.0.0.1", 9199);
    
//     // 🎯 THIS LINE CONNECTS TO FUNCTIONS EMULATOR
//     connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    
//     console.log('✅ Functions emulator connected');
//     } catch (error) {
//       console.error('❌ Failed to connect to emulators:', error);
//       console.error('Make sure emulators are running: firebase emulators:start');
//     }
//   }
// } else {
//   console.log('🌐 Using Production Firebase');
// }

// ONLY use emulators when accessing from localhost (your PC)
// if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
//   console.log('🔧 Connecting to Firebase Emulators...');
  
//   connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectStorageEmulator(storage, "127.0.0.1", 9199);
//   connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  
//   console.log('✅ Emulators connected');
// } else {
//   console.log('✅ Using production Firebase');
// }

// Export AFTER connecting
export { auth, db, storage, functions };
export default app;