// ============================================================
// MeteoLog – Napi emlékeztető (helyi notification)
// ============================================================

const REMINDER_KEY = 'meteolog_reminder';

export function getReminderSettings() {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, hour: 8, minute: 0 };
  } catch { return { enabled: false, hour: 8, minute: 0 }; }
}

export function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

// Engedély kérése
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { ok: false, reason: 'A böngésző nem támogatja az értesítéseket.' };
  }
  if (Notification.permission === 'granted') {
    return { ok: true };
  }
  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'Az értesítések le vannak tiltva. Engedélyezd a telefon beállításaiban.' };
  }
  const result = await Notification.requestPermission();
  return result === 'granted'
    ? { ok: true }
    : { ok: false, reason: 'Értesítési engedély megtagadva.' };
}

// Emlékeztető ütemezése – minden nap adott időpontban
export function scheduleReminder(hour, minute) {
  // Töröljük a régit
  cancelReminder();

  const now  = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // ha már elmúlt, holnapra

  const msUntil = next - now;

  // Első értesítés
  const firstTimer = setTimeout(() => {
    fireNotification();
    // Ezután naponta ismétlődik
    const dailyTimer = setInterval(fireNotification, 24 * 60 * 60 * 1000);
    localStorage.setItem('meteolog_interval_id', dailyTimer);
  }, msUntil);

  localStorage.setItem('meteolog_timeout_id', firstTimer);
  localStorage.setItem('meteolog_reminder_scheduled', 'true');
}

export function cancelReminder() {
  const timeoutId  = localStorage.getItem('meteolog_timeout_id');
  const intervalId = localStorage.getItem('meteolog_interval_id');
  if (timeoutId)  clearTimeout(+timeoutId);
  if (intervalId) clearInterval(+intervalId);
  localStorage.removeItem('meteolog_timeout_id');
  localStorage.removeItem('meteolog_interval_id');
  localStorage.removeItem('meteolog_reminder_scheduled');
}

function fireNotification() {
  if (Notification.permission !== 'granted') return;
  const messages = [
    'Ne felejtsd el rögzíteni a mai időjárást! 🌤️',
    'Milyen az idő ma? Rögzítsd most! 🌡️',
    'Ideje frissíteni az időjárás naplót! 📊',
    'Ma még nem rögzítettél időjárást. Pár másodperc az egész! ⛅',
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  new Notification('MeteoLog emlékeztető', {
    body: msg,
    icon: './icon-192.svg',
    badge: './icon-192.svg',
    tag: 'meteolog-daily',
    renotify: true,
  });
}

// App indításakor visszaállítja az ütemezést ha be volt kapcsolva
export function restoreReminder() {
  const settings = getReminderSettings();
  if (settings.enabled && Notification.permission === 'granted') {
    scheduleReminder(settings.hour, settings.minute);
  }
}
