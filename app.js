// ============================================================
// MeteoLog – App (Router & Init)
// ============================================================
import { initAuth, loginEmail, registerEmail, loginAnonymous, logout, onUserChange, currentUser, getUserDisplayName, isGuest } from './auth.js';
import { initDB, getLocations } from './db.js';
import { renderDashboard } from './dashboard.js';
import { renderLog }       from './log.js';
import { renderHistory }   from './history.js';
import { renderCharts }    from './charts.js';
import { renderLocations } from './locations.js';
import { showToast }       from './utils.js';

// ── App State ────────────────────────────────────────────────
export const AppState = {
  activeLocationId: localStorage.getItem('meteolog_loc') || null,
  activeView: 'dashboard',
};

export function setActiveLocation(id) {
  AppState.activeLocationId = id;
  localStorage.setItem('meteolog_loc', id || '');
  updateLocationChip();
}

// ── Wait for Firebase ────────────────────────────────────────
window.addEventListener('firebase-ready', () => {
  const { auth, db } = window.__firebase;
  initAuth(auth);
  initDB(db);
  boot();
});

function boot() {
  onUserChange(user => {
    if (user) {
      hideAuthModal();
      showApp();
      loadLocationChip();
    } else {
      showAuthModal();
    }
  });
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
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 600);
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
    <button class="ap-btn" id="ap-logout" style="color:var(--red);">🚪 Kijelentkezés</button>`;

  document.body.appendChild(popup);

  popup.querySelector('#ap-logout')?.addEventListener('click', async () => {
    popup.remove();
    await logout();
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
