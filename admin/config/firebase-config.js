import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBrl3HpO3kPT9DHRoUs10c3Sfc-DnAhOmQ",
    authDomain: "explodingkitten.firebaseapp.com",
    projectId: "explodingkitten",
    storageBucket: "explodingkitten.firebasestorage.app",
    messagingSenderId: "721414720560",
    appId: "1:721414720560:web:d1aad4c88faa63f760f1f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and get a reference to the service
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Firestore Database
const db = getFirestore(app);

export { app, auth, googleProvider, db };
