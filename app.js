// ============================================================
// MeteoLog – App (Router & Init)
// ============================================================
import { initAuth, loginEmail, registerEmail, loginAnonymous, logout, onUserChange, currentUser, getUserDisplayName, isGuest } from './auth.js';
import { signInWithGoogle, signInWithFacebook, socialAuthErrorMsg } from './auth-providers.js';
import { initDB, getLocations } from './db.js';
import { renderDashboard } from './dashboard.js';
import { renderLog }       from './log.js';
import { renderHistory }   from './history.js';
import { renderCharts }    from './charts.js';
import { renderLocations } from './locations.js';
import { showToast }       from './utils.js';
import { AppState, setActiveLocation } from './state.js';
import { restoreReminder } from './reminder.js';

// ── Window globálok (import-mentes view fájlok számára) ───────
window.__appState = AppState;
window.__navigate = (view) => navigate(view);
window.__setActiveLocation = (id) => {
  setActiveLocation(id);
  updateLocationChip();
};
window.__showToast = (msg, type) => {
  // inline showToast mivel a utils import is körkörös lehet
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type || 'success'}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3100);
};

// Helyszín változás esemény (state.js dispatch-eli)
window.addEventListener('location-changed', () => {
  updateLocationChip();
});

// ── Wait for Firebase ────────────────────────────────────────
function showSplashError(msg) {
  const box = document.getElementById('splash-error');
  const txt = document.getElementById('splash-error-msg');
  if (box && txt) { txt.textContent = msg; box.style.display = 'block'; }
}

function initFirebase() {
  const { auth, db } = window.__firebase;
  initAuth(auth);
  initDB(db);
  boot();
}

if (window.__firebase) {
  initFirebase();
} else {
  window.addEventListener('firebase-ready', initFirebase);
}

function boot() {
  restoreReminder();
  try {
    onUserChange(user => {
      if (user) {
        hideAuthModal();
        showApp();
        loadLocationChip();
      } else {
        showAuthModal();
      }
    });
  } catch(e) {
    showSplashError('boot() hiba: ' + e.message);
  }
}

// ── Auth UI ──────────────────────────────────────────────────
function showAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  hideSplash();
}

function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function showApp() {
  document.getElementById('app').classList.remove('hidden');
  hideSplash();
  navigate(AppState.activeView);
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('fade-out');
  setTimeout(() => splash?.remove(), 600);
}

// Auth form events
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.getElementById('auth-login').classList.toggle('hidden', tab !== 'login');
      document.getElementById('auth-register').classList.toggle('hidden', tab !== 'register');
    });
  });

  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const err   = document.getElementById('auth-error');
    err.classList.add('hidden');
    try {
      await loginEmail(email, pass);
    } catch(e) {
      err.textContent = authErrorMsg(e.code);
      err.classList.remove('hidden');
    }
  });

  document.getElementById('btn-register')?.addEventListener('click', async () => {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    const err   = document.getElementById('auth-error');
    err.classList.add('hidden');
    if (!name) { err.textContent = 'A becenév kötelező!'; err.classList.remove('hidden'); return; }
    try {
      await registerEmail(name, email, pass);
    } catch(e) {
      err.textContent = authErrorMsg(e.code);
      err.classList.remove('hidden');
    }
  });

  document.getElementById('btn-guest')?.addEventListener('click', async () => {
    try {
      await loginAnonymous();
    } catch(e) {
      document.getElementById('auth-error').textContent = 'Hiba: ' + e.message;
      document.getElementById('auth-error').classList.remove('hidden');
    }
  });

  // Social login gombok
  async function handleSocialLogin(fn) {
    const err = document.getElementById('auth-error');
    err.classList.add('hidden');
    try {
      await fn();
    } catch(e) {
      err.textContent = socialAuthErrorMsg(e.code) || e.message;
      err.classList.remove('hidden');
    }
  }

  document.getElementById('btn-google')?.addEventListener('click', () =>
    handleSocialLogin(signInWithGoogle));

  document.getElementById('btn-facebook')?.addEventListener('click', () =>
    handleSocialLogin(signInWithFacebook));


  // Header auth button
  document.getElementById('btn-header-auth')?.addEventListener('click', showAccountMenu);

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Location selector
  document.getElementById('location-selector')?.addEventListener('click', toggleLocationDropdown);
  document.getElementById('btn-add-location-quick')?.addEventListener('click', () => {
    closeLocationDropdown();
    navigate('locations');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#location-selector') && !e.target.closest('#location-dropdown')) {
      closeLocationDropdown();
    }
  });
});

function authErrorMsg(code) {
  const msgs = {
    'auth/user-not-found':    'Nem találtunk ilyen e-mail címet.',
    'auth/wrong-password':    'Hibás jelszó.',
    'auth/email-already-in-use': 'Ez az e-mail már regisztrált.',
    'auth/weak-password':     'Legalább 6 karakteres jelszó kell.',
    'auth/invalid-email':     'Érvénytelen e-mail cím.',
    'auth/too-many-requests': 'Túl sok próbálkozás. Próbáld újra később.',
  };
  return msgs[code] || 'Hiba: ' + code;
}

// ── Navigation ────────────────────────────────────────────────
export function navigate(view) {
  AppState.activeView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

  const main = document.getElementById('app-main');
  main.scrollTop = 0;

  switch(view) {
    case 'dashboard': renderDashboard(main); break;
    case 'log':       renderLog(main); break;
    case 'history':   renderHistory(main); break;
    case 'charts':    renderCharts(main); break;
    case 'locations': renderLocations(main); break;
  }
}

// ── Location Dropdown ─────────────────────────────────────────
async function loadLocationChip() {
  updateLocationChip();
}

async function updateLocationChip() {
  const nameEl = document.getElementById('active-location-name');
  if (!nameEl) return;
  if (!AppState.activeLocationId) {
    nameEl.textContent = 'Válassz...';
    return;
  }
  try {
    const locs = await getLocations();
    const active = locs.find(l => l.id === AppState.activeLocationId);
    if (active) {
      nameEl.textContent = (active.icon || '📍') + ' ' + active.name;
    } else {
      nameEl.textContent = 'Válassz...';
      setActiveLocation(null);
    }
  } catch(e) {
    nameEl.textContent = '...';
  }
}

async function toggleLocationDropdown() {
  const dd = document.getElementById('location-dropdown');
  if (!dd.classList.contains('hidden')) {
    closeLocationDropdown(); return;
  }
  try {
    const locs = await getLocations();
    const list = document.getElementById('location-list');
    list.innerHTML = locs.map(l => `
      <div class="dropdown-item ${l.id === AppState.activeLocationId ? 'active' : ''}" data-id="${l.id}">
        <span>${l.icon || '📍'}</span> <span>${l.name}</span>
      </div>`).join('');
    list.querySelectorAll('.dropdown-item').forEach(el => {
      el.addEventListener('click', () => {
        setActiveLocation(el.dataset.id);
        closeLocationDropdown();
        navigate(AppState.activeView);
      });
    });
    dd.classList.remove('hidden');
  } catch(e) {}
}

function closeLocationDropdown() {
  document.getElementById('location-dropdown')?.classList.add('hidden');
}

// ── Account Menu ──────────────────────────────────────────────
function showAccountMenu() {
  const existing = document.querySelector('.account-popup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.className = 'account-popup';
  const name = getUserDisplayName();
  const guest = isGuest();

  popup.innerHTML = `
    <style>
    .account-popup {
      position: fixed; top: calc(var(--header-h) + 8px); right: 12px;
      background: var(--bg-card); border: 1px solid var(--border-light);
      border-radius: var(--radius); padding: 16px; min-width: 200px; z-index: 300;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: slide-down 0.2s ease;
    }
    .ap-name { font-weight: 600; margin-bottom: 4px; }
    .ap-sub  { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
    .ap-btn  { display: block; width: 100%; padding: 10px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; cursor: pointer; text-align: left; margin-bottom: 8px; transition: background 0.15s; }
    .ap-btn:hover { background: var(--bg-card-hover); }
    </style>
    <div class="ap-name">${name}</div>
    <div class="ap-sub">${guest ? '👤 Vendég fiók' : '✉️ Regisztrált felhasználó'}</div>
    ${guest ? `<button class="ap-btn" id="ap-register">📧 Regisztráció</button>` : ''}
    <button class="ap-btn" id="ap-reminder">🔔 Napi emlékeztető</button>
    <button class="ap-btn" id="ap-logout" style="color:var(--red);">🚪 Kijelentkezés</button>`;

  document.body.appendChild(popup);

  popup.querySelector('#ap-logout')?.addEventListener('click', async () => {
    popup.remove();
    await logout();
  });

  popup.querySelector('#ap-reminder')?.addEventListener('click', () => {
    popup.remove();
    showReminderModal();
  });
  popup.querySelector('#ap-register')?.addEventListener('click', () => {
    popup.remove();
    document.getElementById('auth-modal').classList.remove('hidden');
    document.querySelector('[data-tab="register"]')?.click();
  });

  setTimeout(() => document.addEventListener('click', function handler(e) {
    if (!popup.contains(e.target) && e.target !== document.getElementById('btn-header-auth')) {
      popup.remove();
      document.removeEventListener('click', handler);
    }
  }), 50);
}

// ── Emlékeztető modal ─────────────────────────────────────────
async function showReminderModal() {
  const { getReminderSettings, saveReminderSettings,
          requestNotificationPermission, scheduleReminder,
          cancelReminder } = await import('./reminder.js');

  const settings = getReminderSettings();
  const perm = Notification.permission ?? 'default';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="height:auto;max-height:90dvh;border-radius:var(--radius-lg);border:1px solid var(--border-light);top:50%;transform:translateY(-50%);position:absolute;left:0;right:0;margin:0 auto;max-width:420px;padding:28px 24px;">
      <div class="auth-logo" style="margin-bottom:20px;">
        <span style="font-size:28px;">🔔</span>
        <span style="font-family:var(--font-display);font-weight:700;font-size:20px;">Napi emlékeztető</span>
      </div>

      ${perm === 'denied' ? `
        <div class="auth-error" style="display:block;margin-bottom:16px;">
          ⚠️ Az értesítések le vannak tiltva. Engedélyezd a telefon beállításaiban:
          Beállítások → Safari → Értesítések → MeteoLog
        </div>` : ''}

      <div style="margin-bottom:20px;">
        <div class="toggle-row">
          <span style="font-size:15px;font-weight:500;">Emlékeztető bekapcsolása</span>
          <div class="toggle ${settings.enabled ? 'on' : ''}" id="rem-toggle"></div>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;line-height:1.5;">
          Naponta értesítést küld ha még nem rögzítettél időjárást.
          ${perm !== 'granted' ? '(Engedélyt fog kérni az értesítésekhez.)' : '✅ Értesítések engedélyezve.'}
        </p>
      </div>

      <div id="rem-time-section" style="${settings.enabled ? '' : 'opacity:0.4;pointer-events:none;'}">
        <div class="input-label" style="margin-bottom:10px;">⏰ Értesítés időpontja</div>
        <div style="display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:20px;">
          <div class="stepper" style="max-width:160px;">
            <button class="stepper-btn" id="rem-hour-dec">−</button>
            <div class="stepper-value" id="rem-hour-val">${String(settings.hour).padStart(2,'0')}<span class="stepper-unit">ó</span></div>
            <button class="stepper-btn" id="rem-hour-inc">+</button>
          </div>
          <span style="font-size:24px;color:var(--accent);font-weight:700;">:</span>
          <div class="stepper" style="max-width:160px;">
            <button class="stepper-btn" id="rem-min-dec">−</button>
            <div class="stepper-value" id="rem-min-val">${String(settings.minute).padStart(2,'0')}<span class="stepper-unit">p</span></div>
            <button class="stepper-btn" id="rem-min-inc">+</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button class="btn btn-ghost" id="rem-cancel">Mégse</button>
        <button class="btn btn-primary" id="rem-save">Mentés</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  let hour    = settings.hour;
  let minute  = settings.minute;
  let enabled = settings.enabled;

  // Toggle
  modal.querySelector('#rem-toggle').addEventListener('click', () => {
    enabled = !enabled;
    modal.querySelector('#rem-toggle').classList.toggle('on', enabled);
    modal.querySelector('#rem-time-section').style.opacity = enabled ? '1' : '0.4';
    modal.querySelector('#rem-time-section').style.pointerEvents = enabled ? 'auto' : 'none';
  });

  // Óra stepper
  modal.querySelector('#rem-hour-dec').addEventListener('click', () => {
    hour = (hour - 1 + 24) % 24;
    modal.querySelector('#rem-hour-val').innerHTML = String(hour).padStart(2,'0') + '<span class="stepper-unit">ó</span>';
  });
  modal.querySelector('#rem-hour-inc').addEventListener('click', () => {
    hour = (hour + 1) % 24;
    modal.querySelector('#rem-hour-val').innerHTML = String(hour).padStart(2,'0') + '<span class="stepper-unit">ó</span>';
  });

  // Perc stepper (5 perces lépésközzel)
  modal.querySelector('#rem-min-dec').addEventListener('click', () => {
    minute = (minute - 5 + 60) % 60;
    modal.querySelector('#rem-min-val').innerHTML = String(minute).padStart(2,'0') + '<span class="stepper-unit">p</span>';
  });
  modal.querySelector('#rem-min-inc').addEventListener('click', () => {
    minute = (minute + 5) % 60;
    modal.querySelector('#rem-min-val').innerHTML = String(minute).padStart(2,'0') + '<span class="stepper-unit">p</span>';
  });

  // Mégse
  modal.querySelector('#rem-cancel').addEventListener('click', () => modal.remove());

  // Mentés
  modal.querySelector('#rem-save').addEventListener('click', async () => {
    if (enabled) {
      const perm = await requestNotificationPermission();
      if (!perm.ok) {
        showToast(perm.reason, 'error');
        modal.remove();
        return;
      }
      saveReminderSettings({ enabled: true, hour, minute });
      scheduleReminder(hour, minute);
      showToast(`✅ Emlékeztető beállítva: ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
    } else {
      saveReminderSettings({ enabled: false, hour, minute });
      cancelReminder();
      showToast('Emlékeztető kikapcsolva.');
    }
    modal.remove();
  });
}
