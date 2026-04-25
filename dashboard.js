// ============================================================
// MeteoLog – Dashboard View
// ============================================================
import { getLatestReading, getStats, getReadings } from './db.js';
import { getWeatherType, formatDate, formatTime, formatDateShort, showToast } from './utils.js';
import { AppState } from './app.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="view">
      <div id="dash-hero">
        <div class="dash-hero"><div class="dash-no-data"><div class="dash-no-data-icon">⏳</div><p>Betöltés...</p></div></div>
      </div>
      <div class="stat-row" id="dash-stats">
        <div class="stat-card"><div class="stat-label">MIN HŐMÉRSÉKLET</div><div class="stat-value" id="stat-min">–</div><div class="stat-sub">30 nap</div></div>
        <div class="stat-card"><div class="stat-label">MAX HŐMÉRSÉKLET</div><div class="stat-value" id="stat-max">–</div><div class="stat-sub">30 nap</div></div>
      </div>
      <div class="section-header">
        <div class="section-title">Utolsó bejegyzések</div>
      </div>
      <div id="dash-recent"></div>
    </div>`;

  if (!AppState.activeLocationId) {
    container.querySelector('#dash-hero').innerHTML = `
      <div class="dash-hero">
        <div class="dash-no-data">
          <div class="dash-no-data-icon">📍</div>
          <p>Először adj hozzá egy helyszínt!</p>
        </div>
      </div>`;
    return;
  }

  try {
    const [latest, stats, recent] = await Promise.all([
      getLatestReading(AppState.activeLocationId),
      getStats(AppState.activeLocationId, 30),
      getReadings(AppState.activeLocationId, { limit: 5 })
    ]);

    renderHero(container.querySelector('#dash-hero'), latest);
    renderStats(container, stats);
    renderRecent(container.querySelector('#dash-recent'), recent);
  } catch(e) {
    console.error(e);
    showToast('Hiba az adatok betöltésekor', 'error');
  }
}

function renderHero(el, reading) {
  if (!reading) {
    el.innerHTML = `
      <div class="dash-hero">
        <div class="dash-no-data">
          <div class="dash-no-data-icon">🌡️</div>
          <p>Még nincs bejegyzés ezen a helyszínen.<br>Nyomj a + gombra az első rögzítéséhez!</p>
        </div>
      </div>`;
    return;
  }
  const wt = getWeatherType(reading.weatherType);
  el.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-top">
        <div>
          <div class="dash-weather-label">${wt.label}</div>
          <div class="dash-time">
            ${formatDate(reading.timestamp)} · ${formatTime(reading.timestamp)}
          </div>
        </div>
        <div class="dash-weather-emoji">${wt.emoji}</div>
      </div>
      ${reading.temp != null ? `<div class="dash-temp-big">${reading.temp}<span class="unit">°C</span></div>` : '<div class="dash-temp-big" style="font-size:36px;color:var(--text-secondary)">Nincs adat</div>'}
      <div class="dash-details">
        <div class="dash-detail-item">
          <div class="dash-detail-label">💧 Páratar.</div>
          <div class="dash-detail-value">${reading.humidity != null ? reading.humidity + '%' : '–'}</div>
        </div>
        <div class="dash-detail-item">
          <div class="dash-detail-label">🌬️ Szél</div>
          <div class="dash-detail-value">${reading.wind?.speed != null ? reading.wind.speed + ' km/h' : '–'}</div>
        </div>
        <div class="dash-detail-item">
          <div class="dash-detail-label">📊 Nyomás</div>
          <div class="dash-detail-value">${reading.pressure != null ? reading.pressure + ' hPa' : '–'}</div>
        </div>
      </div>
      ${reading.precipitation?.observed ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:13px;color:var(--accent);">
          🌧️ Csapadék: ${reading.precipitation.amount ?? 0} mm
        </div>` : ''}
      ${reading.notes ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);font-style:italic;">${reading.notes}</div>` : ''}
    </div>`;
}

function renderStats(container, stats) {
  if (!stats) return;
  const minEl = container.querySelector('#stat-min');
  const maxEl = container.querySelector('#stat-max');
  if (minEl) minEl.textContent = stats.tempMin != null ? stats.tempMin + '°C' : '–';
  if (maxEl) maxEl.textContent = stats.tempMax != null ? stats.tempMax + '°C' : '–';
}

function renderRecent(el, readings) {
  if (!readings.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📝</div><h3>Még nincs bejegyzés</h3><p>Nyomj a + gombra az első időjárás rögzítéséhez!</p></div>`;
    return;
  }
  el.innerHTML = `<div class="recent-list">${readings.map(r => {
    const wt = getWeatherType(r.weatherType);
    const badges = [];
    if (r.humidity != null) badges.push(`💧 ${r.humidity}%`);
    if (r.wind?.speed != null) badges.push(`🌬️ ${r.wind.speed} km/h`);
    if (r.precipitation?.observed) badges.push(`🌧️ ${r.precipitation.amount ?? 0}mm`);
    return `
      <div class="recent-item">
        <div class="recent-emoji">${wt.emoji}</div>
        <div class="recent-info">
          <div class="recent-temp">${r.temp != null ? r.temp + '°C' : wt.label}</div>
          <div class="recent-date">${formatDate(r.timestamp)}</div>
          ${badges.length ? `<div class="recent-badges">${badges.map(b => `<span class="badge">${b}</span>`).join('')}</div>` : ''}
        </div>
        <div class="recent-time" style="font-family:var(--font-mono);font-size:13px;color:var(--text-muted);">${formatTime(r.timestamp)}</div>
      </div>`;
  }).join('')}</div>`;
}
