// ============================================================
// MeteoLog – Publikus helyszín nézet
// ============================================================
import { fetchCurrentWeather, fetchForecast, getWMOInfo } from './weather-api.js';
import { getWeatherType, formatDate, formatTime } from './utils.js';

export async function renderPublicView(locationId) {
  // PWA shell elrejtése, publikus nézet beállítása
  document.body.style.background = 'var(--bg-primary)';
  document.body.style.overflowY  = 'auto';
  document.body.style.height     = 'auto';
  document.body.innerHTML = `
    <div style="
      min-height:100dvh;
      background:var(--bg-primary);
      font-family:var(--font-body);
      color:var(--text-primary);
      max-width:480px;
      margin:0 auto;
      padding-bottom:40px;
    ">
      <div style="
        background:var(--bg-secondary);
        border-bottom:1px solid var(--border);
        padding:max(env(safe-area-inset-top,0px),16px) 16px 14px;
        display:flex;align-items:center;gap:10px;
        position:sticky;top:0;z-index:10;
      ">
        <span style="font-size:22px;">🌤️</span>
        <span style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--accent);">MeteoLog</span>
        <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">Publikus állomás</span>
      </div>
      <div id="pub-content" style="padding:16px;">
        <div style="text-align:center;padding:48px 0;color:var(--text-secondary);">
          <div style="font-size:40px;margin-bottom:12px;">⏳</div>
          <p>Betöltés...</p>
        </div>
      </div>
    </div>`;

  try {
    const { initializeApp, getApps } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, limit, Timestamp } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Meglévő Firebase app újrahasználása
    const app = getApps().find(a => a.name === '[DEFAULT]') ||
                initializeApp(window.FIREBASE_CONFIG);
    const db  = getFirestore(app);

    // Publikus helyszín betöltése
    const pubSnap = await getDoc(doc(db, 'publicLocations', locationId));
    if (!pubSnap.exists()) {
      showError('Ez a helyszín nem létezik vagy nem nyilvános.');
      return;
    }

    const { ownerUid, name, description, icon, lat, lon } = pubSnap.data();

    // Open Graph meta tagek frissítése (link preview)
    updateMetaTags(name, description, icon);

    // Párhuzamos betöltés
    const [official, forecast, readingsSnap] = await Promise.all([
      (lat && lon) ? fetchCurrentWeather(lat, lon).catch(() => null) : Promise.resolve(null),
      (lat && lon) ? fetchForecast(lat, lon).catch(() => null)       : Promise.resolve(null),
      getDocs(query(
        collection(doc(db, 'users', ownerUid), 'readings'),
        where('locationId', '==', locationId),
        orderBy('timestamp', 'desc'),
        limit(10)
      )).catch(() => null)
    ]);

    const readings = readingsSnap ? readingsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const latest   = readings[0] || null;

    const content = document.getElementById('pub-content');
    content.innerHTML = `
      <!-- Helyszín fejléc -->
      <div style="text-align:center;margin-bottom:20px;padding-top:8px;">
        <div style="font-size:52px;margin-bottom:8px;">${icon || '📍'}</div>
        <div style="font-family:var(--font-display);font-size:26px;font-weight:800;">${name}</div>
        ${description ? `<div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${description}</div>` : ''}
      </div>

      ${official ? renderOfficialWeather(official) : ''}
      ${forecast  ? renderForecast(forecast) : ''}
      ${latest    ? renderLatestMeasurement(latest, official) : ''}
      ${readings.length ? renderRecentReadings(readings) : ''}
      ${renderCTA()}

      <div style="text-align:center;margin-top:20px;font-size:11px;color:var(--text-muted);">
        Adatok forrása: saját mérések + Open-Meteo.com
      </div>`;

  } catch(e) {
    showError('Hiba a betöltésnél: ' + e.message);
  }
}

function updateMetaTags(name, description, icon) {
  document.title = `${name} – MeteoLog`;
  const setMeta = (prop, content) => {
    let el = document.querySelector(`meta[property="${prop}"]`) ||
             document.querySelector(`meta[name="${prop}"]`);
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
    el.setAttribute(prop.startsWith('og:') ? 'property' : 'name', prop);
    el.setAttribute('content', content);
  };
  setMeta('og:title',       `${name} – MeteoLog időjárás állomás`);
  setMeta('og:description', description || 'Valós idejű időjárás adatok és előrejelzés');
  setMeta('og:type',        'website');
  setMeta('og:url',         window.location.href);
  setMeta('description',    description || 'MeteoLog – személyes időjárás napló');
}

function renderOfficialWeather(w) {
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(0,229,176,0.1) 0%,transparent 70%);pointer-events:none;"></div>
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        🌐 Hivatalos időjárás · Open-Meteo · ${w.updatedAt}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">${w.label}</div>
          <div style="font-family:var(--font-mono);font-size:52px;font-weight:600;line-height:1;">
            ${w.temp}<span style="font-size:22px;color:var(--text-secondary);">°C</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Érzés: ${w.feelsLike}°C</div>
        </div>
        <div style="font-size:60px;line-height:1;">${w.emoji}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="text-align:center;">
          <div style="font-size:11px;color:var(--text-muted);">💧 Páratar.</div>
          <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;margin-top:3px;">${w.humidity}%</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:11px;color:var(--text-muted);">🌬️ Szél</div>
          <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;margin-top:3px;">${w.windSpeed} km/h</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:11px;color:var(--text-muted);">📊 Nyomás</div>
          <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;margin-top:3px;">${w.pressure} hPa</div>
        </div>
      </div>
    </div>`;
}

function renderForecast(days) {
  const dayNames = ['Vas','Hét','Kedd','Szer','Csüt','Pén','Szom'];
  const today = new Date().toISOString().slice(0,10);
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📅 5 napos előrejelzés</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
        ${days.map(d => {
          const isToday = d.date === today;
          return `
            <div style="text-align:center;background:${isToday?'var(--accent-dim)':'var(--bg-input)'};border:1px solid ${isToday?'var(--accent)':'var(--border)'};border-radius:var(--radius-sm);padding:10px 4px;">
              <div style="font-size:11px;color:${isToday?'var(--accent)':'var(--text-secondary)'};font-weight:${isToday?'700':'400'};">${isToday?'Ma':dayNames[new Date(d.date).getDay()]}</div>
              <div style="font-size:24px;margin:6px 0;">${d.emoji}</div>
              <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;">${Math.round(d.tempMax)}°</div>
              <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${Math.round(d.tempMin)}°</div>
              ${d.precip > 0 ? `<div style="font-size:10px;color:#3b82f6;margin-top:3px;">💧${d.precip}mm</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderLatestMeasurement(r, official) {
  const wt   = getWeatherType(r.weatherType);
  const diff = (official && r.temp != null)
    ? (r.temp - official.temp).toFixed(1)
    : null;
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📍 Saját mérés · legutóbbi</div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="font-size:48px;line-height:1;">${wt.emoji}</div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);">${wt.label}</div>
          ${r.temp != null ? `<div style="font-family:var(--font-mono);font-size:36px;font-weight:600;line-height:1.1;">${r.temp}<span style="font-size:16px;color:var(--text-secondary);">°C</span></div>` : ''}
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${formatDate(r.timestamp)} · ${formatTime(r.timestamp)}</div>
        </div>
      </div>
      ${diff !== null ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:13px;display:flex;gap:8px;align-items:center;">
          <span style="color:var(--text-secondary);">Különbség a hivatalostól:</span>
          <span style="font-family:var(--font-mono);font-weight:600;color:${diff > 0 ? 'var(--accent)' : '#3b82f6'};">
            ${diff > 0 ? '+' : ''}${diff}°C
          </span>
        </div>` : ''}
      ${r.humidity != null || r.wind?.speed != null || r.pressure != null ? `
        <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;">
          ${r.humidity  != null ? `<span style="font-size:13px;color:var(--text-secondary);">💧 ${r.humidity}%</span>` : ''}
          ${r.wind?.speed != null ? `<span style="font-size:13px;color:var(--text-secondary);">🌬️ ${r.wind.speed} km/h</span>` : ''}
          ${r.pressure  != null ? `<span style="font-size:13px;color:var(--text-secondary);">📊 ${r.pressure} hPa</span>` : ''}
        </div>` : ''}
    </div>`;
}

function renderRecentReadings(readings) {
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📋 Utolsó 10 saját mérés</div>
      ${readings.map((r,i) => {
        const wt = getWeatherType(r.weatherType);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;${i < readings.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
            <span style="font-size:24px;width:30px;text-align:center;">${wt.emoji}</span>
            <div style="flex:1;">
              <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;">${r.temp != null ? r.temp + '°C' : wt.label}</div>
              <div style="font-size:11px;color:var(--text-muted);">${formatDate(r.timestamp)}</div>
            </div>
            <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${formatTime(r.timestamp)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderCTA() {
  const base = window.location.origin + window.location.pathname.split('?')[0];
  return `
    <div style="background:var(--bg-card);border:2px solid var(--accent);border-radius:var(--radius-lg);padding:24px;text-align:center;margin-top:8px;">
      <div style="font-size:32px;margin-bottom:10px;">📱</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:17px;margin-bottom:8px;">Rögzítsd te is a saját időjárásod!</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
        A MeteoLog ingyenes – add hozzá a kezdőképernyődhöz és kezdj el mérni!
      </div>
      <a href="${base}" style="display:inline-block;background:var(--accent);color:#000;font-weight:700;padding:13px 28px;border-radius:var(--radius);text-decoration:none;font-size:15px;">
        Megnyitom a MeteoLog-ot →
      </a>
    </div>`;
}

function showError(msg) {
  const content = document.getElementById('pub-content');
  if (content) content.innerHTML = `
    <div style="text-align:center;padding:48px 16px;color:var(--text-secondary);">
      <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
      <div style="font-size:16px;color:var(--text-primary);margin-bottom:8px;">Hiba</div>
      <div style="font-size:14px;">${msg}</div>
    </div>`;
}
