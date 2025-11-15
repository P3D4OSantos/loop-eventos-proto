import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Lê configuração das variáveis de ambiente (Next.js expõe apenas chaves com NEXT_PUBLIC_ no cliente)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBGXgiiJkWnRx-08ngTVOY5AkNwIo1A3mA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "loop-9f3ed.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://loop-9f3ed-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "loop-9f3ed",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "loop-9f3ed.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "496503349104",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:496503349104:web:574c3af46c0fa16399f9b5",
};

// Dica de desenvolvimento caso variáveis não estejam definidas
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn('Firebase não configurado: defina as variáveis NEXT_PUBLIC_FIREBASE_* no ambiente.');
}

// Inicializa Firebase apenas no cliente
let app;
let database;
let auth;

if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
  } catch (error) {
    console.warn('Firebase initialization error:', error);
    // Fallback para desenvolvimento
    database = null;
    auth = null;
  }
}

export { database, auth };
