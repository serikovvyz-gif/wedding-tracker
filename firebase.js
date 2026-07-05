// ═══════════════════════════════════════════════════════════
//   ВСТАВЬТЕ СЮДА КЛЮЧИ ИЗ FIREBASE (см. инструкцию, шаг B4)
// ═══════════════════════════════════════════════════════════
// Скопируйте объект firebaseConfig целиком со страницы «Настройки проекта»
// и замените этот пример на свой.

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAa6CjILoIK7VobHNn_0E4AyMHajGQlF_4",
  authDomain: "wednastyaserega.firebaseapp.com",
  projectId: "wednastyaserega",
  storageBucket: "wednastyaserega.firebasestorage.app",
  messagingSenderId: "285101824600",
  appId: "1:285101824600:web:3a4537ae07c219438f082d",
  measurementId: "G-DD23QPWKSJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
