// ============================================================
// MeteoLog – Firebase konfiguráció
// ============================================================
// 1. Menj a Firebase Console-ra: https://console.firebase.google.com
// 2. Hozz létre egy projektet (vagy nyiss meg egy meglévőt)
// 3. Projekt beállítások → "Az alkalmazásaid" → Web app (</> ikon)
// 4. Másold be az alábbi adatokat a saját projekted config-jából
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAs_LIo0IIaplNpNnli0rtTIAf1NfOsAbw",
  authDomain: "meteolog-94477.firebaseapp.com",
  projectId: "meteolog-94477",
  storageBucket: "meteolog-94477.firebasestorage.app",
  messagingSenderId: "480207574196",
  appId: "1:480207574196:web:64996a3fcbd0e59494f3e1",
  measurementId: "G-VYJB2P9578"
};

// ============================================================
// Firestore biztonsági szabályok (Firebase Console → Firestore → Szabályok):
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId}/{document=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
//
// Firebase Auth: engedélyezd az Email/Jelszó és Névtelen auth módszereket
// (Firebase Console → Authentication → Bejelentkezési módszerek)
// ============================================================
