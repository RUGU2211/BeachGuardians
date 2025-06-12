
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBuB9kWfs_pn3HfnlG56i9des0D0Xjmp-s",
  authDomain: "shoreline-tzs9g.firebaseapp.com",
  projectId: "shoreline-tzs9g",
  storageBucket: "shoreline-tzs9g.appspot.com", // Corrected common typo: firebasestorage.app -> .appspot.com
  messagingSenderId: "44056276742",
  appId: "1:44056276742:web:d0cfd815558a3be19af887"
  // measurementId: "G-XXXXXXXXXX" // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
