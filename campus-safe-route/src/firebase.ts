import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDr-fWDI2NQPhawSdXuwmCAeFwWbxN8y4s",
  authDomain: "geospataila-hackathon.firebaseapp.com",
  projectId: "geospataila-hackathon",
  storageBucket: "geospataila-hackathon.firebasestorage.app",
  messagingSenderId: "602675415564",
  appId: "1:602675415564:web:2392498416c9d7df5d3c29",
  measurementId: "G-0TBCZC7T6Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics is optional and only works in browser environments, but good to have initialized
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
