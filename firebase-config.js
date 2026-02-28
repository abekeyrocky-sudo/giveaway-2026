// Firebase SDK (Modular V10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVWZefqfDudpf9Ujhc3vmee0MpIxybAjo",
  authDomain: "giveaway-c4bf9.firebaseapp.com",
  projectId: "giveaway-c4bf9",
  storageBucket: "giveaway-c4bf9.firebasestorage.app",
  messagingSenderId: "191792739633",
  appId: "1:191792739633:web:9c18b58bc9e0a9aba02c10",
  measurementId: "G-45R0YPLWN8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);