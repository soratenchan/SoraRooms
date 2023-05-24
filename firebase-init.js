import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiF7aErA5GQidniMhakmIs-3ZvGH_1oEs",
  authDomain: "sorarooms-aa822.firebaseapp.com",
  projectId: "sorarooms-aa822",
  storageBucket: "sorarooms-aa822.appspot.com",
  messagingSenderId: "90971146550",
  appId: "1:90971146550:web:88141bbf025b7575bb0b97",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
