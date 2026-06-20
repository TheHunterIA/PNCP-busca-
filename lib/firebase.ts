import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4ssAdadG5U5dD1ta4ybGrHMzk36cJv34",
  authDomain: "stable-carrier-8w1xt.firebaseapp.com",
  projectId: "stable-carrier-8w1xt",
  storageBucket: "stable-carrier-8w1xt.firebasestorage.app",
  messagingSenderId: "181498829542",
  appId: "1:181498829542:web:b1f0af90994d7d0144f927"
};

// Inicializa o Firebase Client SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exporta o Firestore com o databaseId específico configurado
export const db = getFirestore(app, "ai-studio-ba1f5199-04f8-44de-8cfe-eef21a7ff793");
