// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

export default app;
// AIzaSyCRIlaHJs64iqcxuZ6j7JW6MCBhHRzW2QY

