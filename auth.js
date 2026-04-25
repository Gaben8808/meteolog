// ============================================================
// MeteoLog – Auth
// ============================================================
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let auth;
export let currentUser = null;
const listeners = [];

export function initAuth(firebaseAuth) {
  auth = firebaseAuth;
  onAuthStateChanged(auth, user => {
    currentUser = user;
    listeners.forEach(fn => fn(user));
  });
}

export function onUserChange(fn) {
  listeners.push(fn);
}

export function isGuest() {
  return currentUser?.isAnonymous ?? true;
}

export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred;
}

export async function loginAnonymous() {
  return signInAnonymously(auth);
}

export async function logout() {
  return signOut(auth);
}

export function getUserDisplayName() {
  if (!currentUser) return 'Vendég';
  if (currentUser.isAnonymous) return 'Vendég';
  return currentUser.displayName || currentUser.email?.split('@')[0] || 'Felhasználó';
}
