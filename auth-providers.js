// ============================================================
// MeteoLog – Social Auth Providers (újrafelhasználható modul)
// Használat bármely Firebase projektnél:
//   import { signInWithGoogle, signInWithFacebook, signInWithApple } from './auth-providers.js';
// ============================================================
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let _auth = null;

export function initProviders(auth) {
  _auth = auth;
}

// Mobilon a popup sokszor blokkolva van, ezért redirect fallback-kel
async function signInWith(provider) {
  try {
    const result = await signInWithPopup(_auth, provider);
    return result.user;
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(_auth, provider);
      return null; // redirect visszatérésekor getRedirectResult() adja vissza
    }
    throw e;
  }
}

// ── Google ───────────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  return signInWith(provider);
}

// ── Facebook ─────────────────────────────────────────────────
export async function signInWithFacebook() {
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  provider.addScope('public_profile');
  return signInWith(provider);
}

// ── Apple ────────────────────────────────────────────────────
export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  provider.setCustomParameters({ locale: 'hu_HU' });
  return signInWith(provider);
}

// ── Redirect eredmény kezelése (oldal újratöltés után) ────────
// Hívd meg az app indításakor: handleRedirectResult()
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(_auth);
    return result?.user || null;
  } catch (e) {
    if (e.code === 'auth/account-exists-with-different-credential') {
      throw new Error('Ez az e-mail más bejelentkezési módszerrel már regisztrált.');
    }
    throw e;
  }
}

// ── Hibakódok magyarítása ─────────────────────────────────────
export function socialAuthErrorMsg(code) {
  const msgs = {
    'auth/account-exists-with-different-credential': 'Ez az e-mail más módszerrel már regisztrált.',
    'auth/popup-closed-by-user':  'A bejelentkezési ablakot bezártad.',
    'auth/cancelled-popup-request': 'Bejelentkezés megszakítva.',
    'auth/network-request-failed': 'Hálózati hiba. Ellenőrizd az internetkapcsolatot.',
    'auth/user-disabled': 'Ez a fiók le van tiltva.',
    'auth/operation-not-allowed': 'Ez a bejelentkezési mód nincs engedélyezve a Firebase-ben.',
    'auth/invalid-credential': 'Érvénytelen azonosító adat.',
  };
  return msgs[code] || 'Hiba: ' + code;
}
