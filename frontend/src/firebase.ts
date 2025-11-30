import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Added import for getAuth

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQwKG_5uZFGBxkuoMMQy-_2ux1bYeAjHs",
  authDomain: "sfv-backend.firebaseapp.com",
  projectId: "sfv-backend",
  storageBucket: "sfv-backend.firebasestorage.app",
  messagingSenderId: "491371458183",
  appId: "1:491371458183:web:739b98dd61af5bd4d41222",
  measurementId: "G-LFB555DKFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app); // Exporting auth as a named export