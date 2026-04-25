// ============================================================
// MeteoLog – Utilities
// ============================================================

export const WEATHER_TYPES = [
  { id: 'sunny',         emoji: '☀️',  label: 'Napos' },
  { id: 'partly-cloudy', emoji: '🌤️', label: 'Részb.' },
  { id: 'cloudy',        emoji: '⛅',  label: 'Felhős' },
  { id: 'overcast',      emoji: '☁️',  label: 'Borult' },
  { id: 'foggy',         emoji: '🌫️', label: 'Ködös' },
  { id: 'drizzle',       emoji: '🌦️', label: 'Szitál' },
  { id: 'rainy',         emoji: '🌧️', label: 'Esős' },
  { id: 'stormy',        emoji: '⛈️',  label: 'Viharos' },
  { id: 'snowy',         emoji: '🌨️', label: 'Havas' },
  { id: 'thunder',       emoji: '🌩️', label: 'Villám' },
];

export const WIND_DIRS = ['É', 'ÉK', 'K', 'DK', 'D', 'DNy', 'Ny', 'ÉNy'];

export const BEAUFORT = [
  { max: 1,  label: 'Szélcsend' },
  { max: 5,  label: 'Gyenge szellő' },
  { max: 11, label: 'Enyhe szél' },
  { max: 19, label: 'Gyenge szél' },
  { max: 28, label: 'Mérsékelt' },
  { max: 38, label: 'Friss szél' },
  { max: 49, label: 'Erős szél' },
  { max: 61, label: 'Sebes szél' },
  { max: 74, label: 'Viharos szél' },
  { max: 88, label: 'Erős vihar' },
  { max: 102, label: 'Nagyon erős vihar' },
  { max: 117, label: 'Orkán széle' },
  { max: 9999, label: 'Hurrikán' },
];

export function getBeaufort(kmh) {
  const b = BEAUFORT.findIndex(b => kmh <= b.max);
  return { scale: b, label: BEAUFORT[b]?.label ?? 'Hurrikán' };
}

export function getWeatherType(id) {
  return WEATHER_TYPES.find(w => w.id === id) || WEATHER_TYPES[0];
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(ts) {
  if (!ts) return '';
  return `${formatDate(ts)} ${formatTime(ts)}`;
}

export function formatDateShort(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function sameDay(a, b) {
  const ad = a.toDate ? a.toDate() : new Date(a);
  const bd = b instanceof Date ? b : new Date(b);
  return ad.getFullYear() === bd.getFullYear()
    && ad.getMonth() === bd.getMonth()
    && ad.getDate() === bd.getDate();
}

export function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

export function confirmDialog(title, msg) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'confirm-modal';
    el.innerHTML = `
      <div class="confirm-backdrop"></div>
      <div class="confirm-box">
        <div class="confirm-title">${title}</div>
        <div class="confirm-msg">${msg}</div>
        <div class="confirm-btns">
          <button class="btn btn-ghost" id="confirm-no">Mégse</button>
          <button class="btn btn-danger" id="confirm-yes">Törlés</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#confirm-yes').onclick = () => { el.remove(); resolve(true); };
    el.querySelector('#confirm-no').onclick  = () => { el.remove(); resolve(false); };
    el.querySelector('.confirm-backdrop').onclick = () => { el.remove(); resolve(false); };
  });
}

export function el(tag, cls, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function HU_MONTHS() {
  return ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December'];
}

export function HU_DOW_SHORT() {
  return ['H','K','Sze','Cs','P','Szo','V'];
}
