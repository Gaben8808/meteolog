// ============================================================
// MeteoLog – Firebase konfiguráció
// ============================================================
// 1. Menj a Firebase Console-ra: https://console.firebase.google.com
// 2. Hozz létre egy projektet (vagy nyiss meg egy meglévőt)
// 3. Projekt beállítások → "Az alkalmazásaid" → Web app (</> ikon)
// 4. Másold be az alábbi adatokat a saját projekted config-jából
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey:            "IDE_IRD_A_TE_API_KULCSODAT",
  authDomain:        "projekt-azonosito.firebaseapp.com",
  projectId:         "projekt-azonosito",
  storageBucket:     "projekt-azonosito.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
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
