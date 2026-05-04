// ============================================================
// MeteoLog – Publikus helyszín nézet
// Betöltődik ha ?loc=LOCATION_ID van az URL-ben
// ============================================================
import { fetchCurrentWeather, fetchForecast, getWMOInfo } from './weather-api.js';
import { getWeatherType, formatDate, formatTime } from './utils.js';

export async function renderPublicView(locationId) {
  document.body.innerHTML = `
    <div id="pub-app" style="
      min-height:100dvh;
      background:var(--bg-primary);
      font-family:var(--font-body);
      color:var(--text-primary);
      max-width:480px;
      margin:0 auto;
      padding:0 0 32px;
    ">
      <!-- Header -->
      <div style="
        background:var(--bg-secondary);
        border-bottom:1px solid var(--border);
        padding:env(safe-area-inset-top,16px) 16px 14px;
        display:flex; align-items:center; gap:10px;
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
    // Helyszín adatok betöltése Firestore-ból
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, limit, Timestamp } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { FIREBASE_CONFIG } = await import('./firebase-config-module.js');

    const app = initializeApp(FIREBASE_CONFIG, 'public-view');
    const db  = getFirestore(app);

    // Publikus helyszín keresése
    const pubSnap = await getDoc(doc(db, 'publicLocations', locationId));
    if (!pubSnap.exists()) {
      showError('Ez a helyszín nem létezik vagy nem nyilvános.');
      return;
    }

    const pubData  = pubSnap.data();
    const { ownerUid, name, description, icon, lat, lon } = pubData;

    const content = document.getElementById('pub-content');

    // Párhuzamosan töltjük be: Open-Meteo + saját mérések
    const [official, forecast, readingsSnap] = await Promise.all([
      lat && lon ? fetchCurrentWeather(lat, lon).catch(() => null) : null,
      lat && lon ? fetchForecast(lat, lon).catch(() => null) : null,
      getDocs(query(
        collection(doc(db, 'users', ownerUid), 'readings'),
        where('locationId', '==', locationId),
        orderBy('timestamp', 'desc'),
        limit(10)
      )).catch(() => null)
    ]);

    const readings = readingsSnap ? readingsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const latest   = readings[0] || null;

    content.innerHTML = `
      <!-- Helyszín neve -->
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:48px;margin-bottom:8px;">${icon || '📍'}</div>
        <div style="font-family:var(--font-display);font-size:24px;font-weight:800;">${name}</div>
        ${description ? `<div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${description}</div>` : ''}
      </div>

      ${official ? renderOfficialWeather(official) : ''}
      ${forecast  ? renderForecast(forecast) : ''}
      ${latest    ? renderLatestMeasurement(latest) : ''}
      ${readings.length ? renderRecentReadings(readings) : ''}

      <!-- CTA -->
      <div style="
        background:var(--bg-card);border:1px solid var(--accent);
        border-radius:var(--radius-lg);padding:20px;text-align:center;margin-top:20px;
      ">
        <div style="font-size:28px;margin-bottom:8px;">📱</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:16px;margin-bottom:6px;">
          Rögzítsd te is a saját időjárásod!
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.5;">
          A MeteoLog ingyenes – add hozzá a kezdőképernyődhöz és kezdj el mérni!
        </div>
        <a href="${window.location.origin}${window.location.pathname.replace(/\?.*/, '')}"
           style="
             display:inline-block;background:var(--accent);color:#000;
             font-weight:600;padding:12px 24px;border-radius:var(--radius);
             text-decoration:none;font-size:14px;
           ">
          Megnyitom a MeteoLog-ot →
        </a>
      </div>

      <div style="text-align:center;margin-top:20px;font-size:11px;color:var(--text-muted);">
        Adatok forrása: saját mérések + Open-Meteo.com
      </div>`;

  } catch(e) {
    showError('Hiba a betöltésnél: ' + e.message);
  }
}

function renderOfficialWeather(w) {
  return `
    <div style="
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;
      position:relative;overflow:hidden;
    ">
      <div style="
        position:absolute;top:-30px;right:-30px;width:120px;height:120px;
        background:radial-gradient(circle,rgba(0,229,176,0.1) 0%,transparent 70%);
      "></div>
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        🌐 Hivatalos időjárás · Open-Meteo · ${w.updatedAt}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">${w.label}</div>
          <div style="font-family:var(--font-mono);font-size:52px;font-weight:600;line-height:1;">
            ${w.temp}<span style="font-size:22px;color:var(--text-secondary);">°C</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
            Érzés: ${w.feelsLike}°C
          </div>
        </div>
        <div style="font-size:56px;">${w.emoji}</div>
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
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        📅 5 napos előrejelzés
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;">
        ${days.map(d => {
          const date = new Date(d.date);
          const isToday = d.date === new Date().toISOString().slice(0,10);
          return `
            <div style="
              flex:1;min-width:60px;text-align:center;
              background:${isToday ? 'var(--accent-dim)' : 'var(--bg-input)'};
              border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'};
              border-radius:var(--radius-sm);padding:10px 6px;
            ">
              <div style="font-size:11px;color:${isToday ? 'var(--accent)' : 'var(--text-secondary)'};font-weight:${isToday ? '600' : '400'};">
                ${isToday ? 'Ma' : dayNames[date.getDay()]}
              </div>
              <div style="font-size:22px;margin:6px 0;">${d.emoji}</div>
              <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;">${Math.round(d.tempMax)}°</div>
              <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${Math.round(d.tempMin)}°</div>
              ${d.precip > 0 ? `<div style="font-size:10px;color:#3b82f6;margin-top:3px;">💧${d.precip}mm</div>` : ''}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderLatestMeasurement(r) {
  const wt = getWeatherType(r.weatherType);
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        📍 Saját mérés · legutóbbi
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="font-size:44px;">${wt.emoji}</div>
        <div>
          <div style="font-size:13px;color:var(--text-secondary);">${wt.label}</div>
          ${r.temp != null ? `<div style="font-family:var(--font-mono);font-size:36px;font-weight:600;">${r.temp}<span style="font-size:16px;color:var(--text-secondary);">°C</span></div>` : ''}
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${formatDate(r.timestamp)} · ${formatTime(r.timestamp)}</div>
        </div>
      </div>
      ${r.temp != null && arguments[0]?.official?.temp != null ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:13px;">
          <span style="color:var(--text-secondary);">Különbség a hivatalostól: </span>
          <span style="font-family:var(--font-mono);font-weight:600;color:var(--accent);">
            ${(r.temp - arguments[0].official.temp).toFixed(1) > 0 ? '+' : ''}${(r.temp - arguments[0].official.temp).toFixed(1)}°C
          </span>
        </div>` : ''}
    </div>`;
}

function renderRecentReadings(readings) {
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        📋 Utolsó 10 saját mérés
      </div>
      ${readings.map(r => {
        const wt = getWeatherType(r.weatherType);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:22px;">${wt.emoji}</span>
            <div style="flex:1;">
              <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;">
                ${r.temp != null ? r.temp + '°C' : wt.label}
              </div>
              <div style="font-size:11px;color:var(--text-muted);">${formatDate(r.timestamp)}</div>
            </div>
            <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted);">${formatTime(r.timestamp)}</div>
          </div>`;
      }).join('')}
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
