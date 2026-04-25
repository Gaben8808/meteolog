// ============================================================
// MeteoLog – README
// ============================================================
# MeteoLog 🌤️

**Személyes időjárás dokumentáló PWA**  
Telefonról használható, Firebase alapú, GitHub Pages-en hostolható.

---

## ⚡ Gyors telepítés

### 1. Firebase projekt létrehozása

1. Menj a [Firebase Console](https://console.firebase.google.com)-ra
2. „Projekt hozzáadása" → add meg a nevet → „Folytatás"
3. Google Analytics: opcionális, kihagyható
4. Projekt létrehozása után: **Projekt beállítások** (fogaskerék ikon)
5. Görgess le → „Az alkalmazásaid" → `</>` (Web) ikon → regisztrálj egy app-ot
6. Másold ki a `firebaseConfig` objektum tartalmát

### 2. Firebase szolgáltatások aktiválása

**Authentication:**
- Firebase Console → Authentication → Bejelentkezési módszerek
- ✅ E-mail/jelszó → Engedélyezés
- ✅ Névtelen → Engedélyezés

**Firestore Database:**
- Firebase Console → Firestore Database → Adatbázis létrehozása
- Válaszd: **Éles mód** (majd írd felül a szabályokat)
- Régió: `europe-west1` (vagy ami közelebb van)

**Biztonsági szabályok** (Firestore → Szabályok fül):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Firebase konfiguráció beillesztése

Szerkeszd a `firebase-config.js` fájlt, és illeszd be a saját adataidat:

```js
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 4. GitHub Pages beállítása

1. Hozz létre egy GitHub repository-t (pl. `meteolog`)
2. Töltsd fel az összes fájlt a repo gyökerébe
3. Settings → Pages → Branch: `main`, mappa: `/ (root)` → Save
4. Néhány perc múlva elérhető: `https://FELHASZNALONEV.github.io/meteolog`

**Fontos:** A `firebase-config.js` ne kerüljön `.gitignore`-ba, mert a Firebase kliens-oldali konfig publikusan szükséges. A biztonságot a Firestore szabályok garantálják.

---

## 📱 PWA telepítés telefonra

**Android (Chrome):** Kinyílik egy „Alkalmazás hozzáadása a kezdőképernyőhöz" banner, vagy: ⋮ menü → „Alkalmazás telepítése"

**iOS (Safari):** Megosztás ikon → „A kezdőképernyőre"

---

## 🗂️ Projekt struktúra

```
meteolog/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── firebase-config.js  # ← IDE írd be a saját adataidat!
├── css/
│   └── style.css       # Teljes stílus
├── js/
│   ├── app.js          # Router + inicializálás
│   ├── auth.js         # Firebase Auth
│   ├── db.js           # Firestore műveletek
│   ├── utils.js        # Segédfüggvények
│   └── views/
│       ├── dashboard.js
│       ├── log.js
│       ├── history.js
│       ├── charts.js
│       └── locations.js
└── icons/
    ├── icon-192.svg
    └── icon-512.svg
```

---

## 🔧 Fejlesztői megjegyzések

- **Adatmodell:** Minden felhasználónak saját `users/{uid}/` ág van Firestore-ban
- **Helyszínek:** `users/{uid}/locations/{locId}`
- **Mérések:** `users/{uid}/readings/{readingId}`
- **Vendég mód:** Firebase Anonymous Auth – az adatok mentve maradnak, később regisztrálható fiók
- **Offline:** Service worker cache-eli a statikus fájlokat

---

## 📊 Rögzíthető adatok

| Mező | Egység | Megjegyzés |
|------|--------|-----------|
| Hőmérséklet | °C | 0.5°C lépésközzel |
| Páratartalom | % | Csúszkával |
| Légnyomás | hPa | 1 hPa lépésközzel |
| Szélirány | N/NE/E/... | Iránytűs választó |
| Szélsebesség | km/h | Beaufort-skálával |
| Csapadék | igen/nem + mm | |
| Időjárás típus | 10 kategória | emoji választó |
| Megjegyzés | szöveg | szabad szöveg |

---

Készítette: **MeteoLog** PWA projekt  
Technológiák: Vanilla JS · Firebase v10 · Chart.js · PWA
