// ============================================================
// MeteoLog – Locations View
// ============================================================
import { getLocations, addLocation, deleteLocation, getLocationReadingCount } from './db.js';
import { confirmDialog, showToast } from './utils.js';
import { AppState, setActiveLocation } from './state.js';

const LOCATION_ICONS = ['🏠','🌳','🏔️','🌊','🏙️','🌾','🏕️','⛰️','🌺','❄️'];
let selectedIcon = LOCATION_ICONS[0];

export async function renderLocations(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Helyszínek</div>
      <div id="loc-list-wrap"><p style="color:var(--text-secondary);text-align:center;padding:24px">Betöltés...</p></div>

      <!-- Új helyszín form -->
      <div id="loc-form-wrap" class="hidden">
        <div class="sheet" style="margin-bottom:16px;">
          <div class="sheet-title">Új helyszín</div>
          <div id="loc-form-error" style="display:none;background:#1a0a0a;border:1px solid #ef4444;color:#fca5a5;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px;"></div>
          <div class="form-field">
            <div class="input-label">Ikon</div>
            <div id="icon-picker" style="display:flex;gap:8px;flex-wrap:wrap;">
              ${LOCATION_ICONS.map((ic, i) => `
                <button type="button" class="wt-btn icon-btn ${i === 0 ? 'active' : ''}" data-icon="${ic}" style="width:46px;padding:8px 4px;">
                  <span style="font-size:20px;">${ic}</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form-field">
            <div class="input-label">Helyszín neve *</div>
            <input type="text" id="loc-name" class="input" placeholder="Pl. Otthon, Kert, Garázs teteje..." />
          </div>
          <div class="form-field">
            <div class="input-label">Leírás (nem kötelező)</div>
            <input type="text" id="loc-desc" class="input" placeholder="Pl. terasz, árnyékos oldal..." />
          </div>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button type="button" id="btn-cancel-loc" class="btn btn-ghost">Mégse</button>
            <button type="button" id="btn-save-loc" class="btn btn-primary">Mentés</button>
          </div>
        </div>
      </div>

      <button type="button" id="btn-show-add-loc" class="btn btn-ghost">＋ Új helyszín hozzáadása</button>
    </div>`;

  // Event delegation – egyetlen listener az egész view-ra
  container.addEventListener('click', handleClick);

  await loadLocations(container);
}

function handleClick(e) {
  const container = e.currentTarget;

  // Ikon választó
  if (e.target.closest('.icon-btn')) {
    const btn = e.target.closest('.icon-btn');
    selectedIcon = btn.dataset.icon;
    container.querySelectorAll('.icon-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.icon === selectedIcon));
    return;
  }

  // Megjelenít form
  if (e.target.id === 'btn-show-add-loc') {
    selectedIcon = LOCATION_ICONS[0];
    container.querySelector('#loc-form-wrap').classList.remove('hidden');
    container.querySelector('#btn-show-add-loc').classList.add('hidden');
    container.querySelector('#loc-name')?.focus();
    return;
  }

  // Mégse
  if (e.target.id === 'btn-cancel-loc') {
    hideForm(container);
    return;
  }

  // Mentés
  if (e.target.id === 'btn-save-loc') {
    saveLocation(container);
    return;
  }

  // Helyszín kiválasztása
  if (e.target.closest('[data-action="select"]')) {
    const id = e.target.closest('[data-action="select"]').dataset.id;
    setActiveLocation(id);
    loadLocations(container);
    return;
  }

  // Törlés
  if (e.target.closest('[data-action="delete"]')) {
    const btn = e.target.closest('[data-action="delete"]');
    deleteLocationHandler(container, btn.dataset.id, btn.dataset.name);
    return;
  }
}

function hideForm(container) {
  container.querySelector('#loc-form-wrap').classList.add('hidden');
  container.querySelector('#btn-show-add-loc').classList.remove('hidden');
  const nameInput = container.querySelector('#loc-name');
  const descInput = container.querySelector('#loc-desc');
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
  const errEl = container.querySelector('#loc-form-error');
  if (errEl) errEl.style.display = 'none';
}

async function saveLocation(container) {
  const btn    = container.querySelector('#btn-save-loc');
  const errEl  = container.querySelector('#loc-form-error');
  const name   = container.querySelector('#loc-name')?.value?.trim();
  const desc   = container.querySelector('#loc-desc')?.value?.trim() || '';

  errEl.style.display = 'none';

  if (!name) {
    errEl.textContent = '⚠️ A névmező kitöltése kötelező!';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mentés...';

  try {
    const ref = await addLocation({ name, description: desc, icon: selectedIcon });
    setActiveLocation(ref.id);
    showToast('✅ Helyszín hozzáadva!');
    hideForm(container);
    await loadLocations(container);
  } catch(err) {
    errEl.textContent = '⚠️ Hiba: ' + (err.message || String(err));
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Mentés';
  }
}

async function deleteLocationHandler(container, id, name) {
  const ok = await confirmDialog(
    `"${name}" törlése`,
    'Ez törli a helyszínhez tartozó összes bejegyzést is! Nem visszavonható.'
  );
  if (!ok) return;
  try {
    await deleteLocation(id);
    if (AppState.activeLocationId === id) setActiveLocation(null);
    showToast('Helyszín törölve');
    await loadLocations(container);
  } catch(e) {
    showToast('Hiba: ' + e.message, 'error');
  }
}

async function loadLocations(container) {
  const wrap = container.querySelector('#loc-list-wrap');
  if (!wrap) return;

  try {
    const locs = await getLocations();

    if (!locs.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📍</div>
          <h3>Még nincs helyszín</h3>
          <p>Adj hozzá egy helyszínt a mérések rögzítéséhez!</p>
        </div>`;
      return;
    }

    const counts = await Promise.all(locs.map(l => getLocationReadingCount(l.id).catch(() => 0)));

    wrap.innerHTML = `<div class="location-list">
      ${locs.map((loc, i) => `
        <div class="loc-item ${loc.id === AppState.activeLocationId ? 'active-loc' : ''}">
          <div class="loc-item-icon">${loc.icon || '📍'}</div>
          <div class="loc-item-info">
            <div class="loc-item-name">${loc.name}</div>
            ${loc.description ? `<div class="loc-item-desc">${loc.description}</div>` : ''}
            <div class="loc-item-count">${counts[i]} bejegyzés</div>
          </div>
          <div class="loc-item-actions">
            <button type="button" class="loc-action" data-action="select" data-id="${loc.id}" title="Aktív helyszín">
              ${loc.id === AppState.activeLocationId ? '✅' : '○'}
            </button>
            <button type="button" class="loc-action del" data-action="delete" data-id="${loc.id}" data-name="${loc.name}" title="Törlés">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`;

  } catch(e) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Betöltési hiba</h3>
        <p>${e.message}</p>
      </div>`;
  }
}
