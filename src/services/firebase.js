// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-InLtXXlRSBNw9m3wOYx3w_JoIzDgzN4",
  authDomain: "workbase-8dfe2.firebaseapp.com",
  projectId: "workbase-8dfe2",
  storageBucket: "workbase-8dfe2.firebasestorage.app",
  messagingSenderId: "1081396149579",
  appId: "1:1081396149579:web:ca974b7066c2148d603cce",
  measurementId: "G-QM172SZXP9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);