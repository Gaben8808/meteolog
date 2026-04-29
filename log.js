// ============================================================
// MeteoLog – Log / Entry View (közvetlen Firebase hívások)
// ============================================================
import { getWeatherType, WEATHER_TYPES, getBeaufort, showToast } from './utils.js';
import { AppState } from './state.js';

const state = {
  weatherType: 'sunny',
  temp: 20, hasTemp: true,
  humidity: 60, hasHumidity: true,
  pressure: 1013, hasPressure: false,
  windDir: null, windSpeed: 0, hasWind: false,
  precipObs: false, precipAmt: 0,
};

export function renderLog(container) {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Rögzítés</div>

      <div class="form-field">
        <div class="input-label">📅 Időpont</div>
        <input type="datetime-local" id="log-datetime" class="input" value="${localISO}" />
      </div>

      <div class="form-field">
        <div class="input-label">🌤️ Időjárás típusa</div>
        <div class="weather-type-grid" id="wt-grid">
          ${WEATHER_TYPES.map(w => `
            <button class="wt-btn ${w.id===state.weatherType?'active':''}" data-wt="${w.id}">
              <span class="wt-emoji">${w.emoji}</span>
              <span>${w.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="form-field">
        <div class="toggle-row" style="margin-bottom:10px;">
          <span class="input-label" style="margin:0;">🌡️ Hőmérséklet</span>
          <div class="toggle ${state.hasTemp?'on':''}" id="toggle-temp"></div>
        </div>
        <div id="temp-field" class="${state.hasTemp?'':'hidden'}">
          <div class="stepper">
            <button class="stepper-btn" data-action="dec" data-target="temp">−</button>
            <div class="stepper-value" id="temp-val">${state.temp}<span class="stepper-unit">°C</span></div>
            <button class="stepper-btn" data-action="inc" data-target="temp">+</button>
          </div>
        </div>
      </div>

      <div class="form-field">
        <div class="toggle-row" style="margin-bottom:10px;">
          <span class="input-label" style="margin:0;">💧 Páratartalom</span>
          <div class="toggle ${state.hasHumidity?'on':''}" id="toggle-hum"></div>
        </div>
        <div id="hum-field" class="${state.hasHumidity?'':'hidden'}">
          <input type="range" id="hum-range" min="0" max="100" step="1" value="${state.humidity}" />
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:12px;color:var(--text-muted)">0%</span>
            <span style="font-family:var(--font-mono);font-size:16px;font-weight:600;color:var(--accent)" id="hum-val">${state.humidity}%</span>
            <span style="font-size:12px;color:var(--text-muted)">100%</span>
          </div>
        </div>
      </div>

      <div class="form-field">
        <div class="toggle-row" style="margin-bottom:10px;">
          <span class="input-label" style="margin:0;">📊 Légnyomás</span>
          <div class="toggle ${state.hasPressure?'on':''}" id="toggle-pres"></div>
        </div>
        <div id="pres-field" class="${state.hasPressure?'':'hidden'}">
          <div class="stepper">
            <button class="stepper-btn" data-action="dec" data-target="pres">−</button>
            <div class="stepper-value" id="pres-val">${state.pressure}<span class="stepper-unit">hPa</span></div>
            <button class="stepper-btn" data-action="inc" data-target="pres">+</button>
          </div>
        </div>
      </div>

      <div class="form-field">
        <div class="toggle-row" style="margin-bottom:10px;">
          <span class="input-label" style="margin:0;">🌬️ Szél</span>
          <div class="toggle ${state.hasWind?'on':''}" id="toggle-wind"></div>
        </div>
        <div id="wind-field" class="${state.hasWind?'':'hidden'}">
          <div class="wind-section">
            <div>
              <div class="input-label" style="margin-bottom:8px;">Irány</div>
              <div class="compass-grid">
                ${[['ÉNy','É','ÉK'],['Ny','🧭','K'],['DNy','D','DK']].map(row =>
                  row.map(dir => dir === '🧭'
                    ? `<button class="compass-btn center">🧭</button>`
                    : `<button class="compass-btn ${state.windDir===dir?'active':''}" data-dir="${dir}">${dir}</button>`
                  ).join('')
                ).join('')}
              </div>
            </div>
            <div>
              <div class="input-label" style="margin-bottom:8px;">Sebesség</div>
              <input type="range" id="wind-range" min="0" max="120" step="1" value="${state.windSpeed}" />
              <div style="margin-top:6px;">
                <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--amber)" id="wind-val">${state.windSpeed} km/h</div>
                <div class="beaufort-label" id="beaufort-label">${getBeaufort(state.windSpeed).label} (Beaufort ${getBeaufort(state.windSpeed).scale})</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-field">
        <div class="toggle-row">
          <span class="input-label" style="margin:0;">🌧️ Csapadék</span>
          <div class="toggle ${state.precipObs?'on':''}" id="toggle-precip"></div>
        </div>
        <div id="precip-field" style="margin-top:12px;" class="${state.precipObs?'':'hidden'}">
          <div class="stepper">
            <button class="stepper-btn" data-action="dec" data-target="precip">−</button>
            <div class="stepper-value" id="precip-val">${state.precipAmt}<span class="stepper-unit">mm</span></div>
            <button class="stepper-btn" data-action="inc" data-target="precip">+</button>
          </div>
        </div>
      </div>

      <div class="form-field">
        <div class="input-label">📝 Megjegyzés (nem kötelező)</div>
        <textarea id="log-notes" class="input" placeholder="Pl. erős zivatar, jégeső..."></textarea>
      </div>

      <button id="btn-save-entry" class="btn btn-primary" style="margin-top:8px;">💾 Bejegyzés mentése</button>
      <div style="height:16px;"></div>
    </div>`;

  bindEvents(container);
}

function bindEvents(container) {
  container.querySelectorAll('.wt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.weatherType = btn.dataset.wt;
      container.querySelectorAll('.wt-btn').forEach(b => b.classList.toggle('active', b.dataset.wt === state.weatherType));
    });
  });

  bindToggle(container, 'toggle-temp',   'temp-field',   'hasTemp');
  bindToggle(container, 'toggle-hum',    'hum-field',    'hasHumidity');
  bindToggle(container, 'toggle-pres',   'pres-field',   'hasPressure');
  bindToggle(container, 'toggle-wind',   'wind-field',   'hasWind');
  bindToggle(container, 'toggle-precip', 'precip-field', 'precipObs');

  container.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target, inc = btn.dataset.action === 'inc';
      if (t==='temp')   { state.temp    = +((state.temp   +(inc?.5:-.5)).toFixed(1)); container.querySelector('#temp-val').innerHTML   = state.temp+'<span class="stepper-unit">°C</span>'; }
      if (t==='pres')   { state.pressure = state.pressure +(inc?1:-1);                container.querySelector('#pres-val').innerHTML   = state.pressure+'<span class="stepper-unit">hPa</span>'; }
      if (t==='precip') { state.precipAmt= Math.max(0,+((state.precipAmt+(inc?.5:-.5)).toFixed(1))); container.querySelector('#precip-val').innerHTML = state.precipAmt+'<span class="stepper-unit">mm</span>'; }
    });
  });

  container.querySelector('#hum-range')?.addEventListener('input', e => {
    state.humidity = +e.target.value;
    container.querySelector('#hum-val').textContent = state.humidity + '%';
  });

  container.querySelector('#wind-range')?.addEventListener('input', e => {
    state.windSpeed = +e.target.value;
    container.querySelector('#wind-val').textContent = state.windSpeed + ' km/h';
    const bf = getBeaufort(state.windSpeed);
    container.querySelector('#beaufort-label').textContent = `${bf.label} (Beaufort ${bf.scale})`;
  });

  container.querySelectorAll('.compass-btn[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.windDir = btn.dataset.dir;
      container.querySelectorAll('.compass-btn[data-dir]').forEach(b => b.classList.toggle('active', b.dataset.dir === state.windDir));
    });
  });

  container.querySelector('#btn-save-entry')?.addEventListener('click', () => saveEntry(container));
}

function bindToggle(container, toggleId, fieldId, stateKey) {
  const toggle = container.querySelector('#' + toggleId);
  const field  = container.querySelector('#' + fieldId);
  toggle?.addEventListener('click', () => {
    state[stateKey] = !state[stateKey];
    toggle.classList.toggle('on', state[stateKey]);
    field?.classList.toggle('hidden', !state[stateKey]);
  });
}

async function saveEntry(container) {
  if (!AppState.activeLocationId) {
    showToast('Válassz helyszínt előbb!', 'error');
    return;
  }
  const btn = container.querySelector('#btn-save-entry');
  btn.disabled = true;
  btn.textContent = 'Mentés...';

  try {
    const { collection, doc, addDoc, Timestamp, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const fb  = window.__firebase;
    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('Nincs bejelentkezve!');

    const dtInput = container.querySelector('#log-datetime');
    const dt = dtInput?.value ? new Date(dtInput.value) : new Date();

    const data = {
      locationId:  AppState.activeLocationId,
      timestamp:   Timestamp.fromDate(dt),
      weatherType: state.weatherType,
      notes:       (container.querySelector('#log-notes')?.value || '').trim(),
      createdAt:   serverTimestamp(),
    };
    if (state.hasTemp)     data.temp      = state.temp;
    if (state.hasHumidity) data.humidity  = state.humidity;
    if (state.hasPressure) data.pressure  = state.pressure;
    if (state.hasWind)     data.wind      = { direction: state.windDir, speed: state.windSpeed, beaufort: getBeaufort(state.windSpeed).scale };
    data.precipitation = state.precipObs
      ? { observed: true,  amount: state.precipAmt }
      : { observed: false, amount: 0 };

    await addDoc(collection(doc(fb.db, 'users', uid), 'readings'), data);
  } catch(e) {
    showToast('Hiba a mentésnél: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = '💾 Bejegyzés mentése';
    return;
  }

  showToast('✅ Bejegyzés elmentve!');
  window.__navigate('dashboard');
}
