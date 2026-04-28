// ============================================================
// MeteoLog – Database (Firestore)
// ============================================================
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  deleteDoc, query, orderBy, where, Timestamp,
  onSnapshot, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
let db;
export function initDB(firestore) { db = firestore; }

function getCurrentUser() {
  // Mindig a legfrissebb auth állapotot olvassuk
  const user = window.__firebase?.auth?.currentUser;
  if (!user) throw new Error('Nincs bejelentkezve – kérlek jelentkezz be újra.');
  return user;
}

function userRef() {
  return doc(db, 'users', getCurrentUser().uid);
}
function locsRef()     { return collection(userRef(), 'locations'); }
function readingsRef() { return collection(userRef(), 'readings'); }

// ── Locations ────────────────────────────────────────────────

export async function getLocations() {
  const snap = await getDocs(query(locsRef(), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addLocation(data) {
  return addDoc(locsRef(), { ...data, createdAt: serverTimestamp() });
}

export async function updateLocation(id, data) {
  return setDoc(doc(locsRef(), id), data, { merge: true });
}

export async function deleteLocation(id) {
  // delete all readings for this location too
  const snap = await getDocs(query(readingsRef(), where('locationId', '==', id)));
  const del = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(del);
  return deleteDoc(doc(locsRef(), id));
}

export async function getLocationReadingCount(id) {
  const snap = await getDocs(query(readingsRef(), where('locationId', '==', id)));
  return snap.size;
}

// ── Readings ─────────────────────────────────────────────────

export async function addReading(data) {
  return addDoc(readingsRef(), {
    ...data,
    createdAt: serverTimestamp(),
    timestamp: data.timestamp || serverTimestamp()
  });
}

export async function deleteReading(id) {
  return deleteDoc(doc(readingsRef(), id));
}

export async function getReadings(locationId, opts = {}) {
  const constraints = [orderBy('timestamp', 'desc')];
  if (locationId) constraints.unshift(where('locationId', '==', locationId));
  if (opts.limit) constraints.push(limit(opts.limit));
  if (opts.from) constraints.push(where('timestamp', '>=', Timestamp.fromDate(opts.from)));
  if (opts.to)   constraints.push(where('timestamp', '<=', Timestamp.fromDate(opts.to)));

  const snap = await getDocs(query(readingsRef(), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getLatestReading(locationId) {
  const snap = await getDocs(query(
    readingsRef(),
    where('locationId', '==', locationId),
    orderBy('timestamp', 'desc'),
    limit(1)
  ));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getReadingsForPeriod(locationId, days) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  return getReadings(locationId, { from });
}

export async function getMonthReadings(locationId, year, month) {
  const from = new Date(year, month, 1);
  const to   = new Date(year, month + 1, 0, 23, 59, 59);
  return getReadings(locationId, { from, to });
}

export async function getStats(locationId, days = 30) {
  const readings = await getReadingsForPeriod(locationId, days);
  if (!readings.length) return null;

  const temps = readings.map(r => r.temp).filter(t => t != null);
  const precip = readings.filter(r => r.precipitation?.observed).reduce((s, r) => s + (r.precipitation?.amount || 0), 0);

  return {
    count: readings.length,
    tempMin:  temps.length ? Math.min(...temps) : null,
    tempMax:  temps.length ? Math.max(...temps) : null,
    tempAvg:  temps.length ? +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null,
    precipTotal: +precip.toFixed(1),
    readings
  };
}
