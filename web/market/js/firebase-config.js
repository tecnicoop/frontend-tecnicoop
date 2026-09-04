// ════════════════════════════════════════════════════════════════════════
//  firebase-config.js — MarkETec
//  Inicialización modular de Firebase (v10) para el mercado online.
//  Solo se usa Firestore (`db`): las fotos se guardan como base64 dentro
//  del documento, no se utiliza Cloud Storage.
//
//  ⚠️ COMPLETÁ los valores de firebaseConfig con los de TU proyecto.
//  Los sacás de: Consola de Firebase → Configuración del proyecto →
//  "Tus apps" → tu app web → ícono </> → "Configuración de SDK".
// ════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Configuración de MarkETec (marketec-cooperativa) ──
const firebaseConfig = {
  apiKey: "AIzaSyBKt7Qt8K2WoVdaTJw874a_0CEtUZ7dGVA",
  authDomain: "marketec-cooperativa.firebaseapp.com",
  projectId: "marketec-cooperativa",
  storageBucket: "marketec-cooperativa.firebasestorage.app",
  messagingSenderId: "139428547769",
  appId: "1:139428547769:web:43d3f39be7aa4b00139f68"
};

const app = initializeApp(firebaseConfig);

// Base de datos de anuncios
// (Las fotos se guardan como base64 dentro del documento, no se usa Storage)
export const db = getFirestore(app);
