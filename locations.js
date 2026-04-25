// ============================================================
// MeteoLog – Locations View
// ============================================================
import { getLocations, addLocation, updateLocation, deleteLocation, getLocationReadingCount } from './db.js';
import { confirmDialog, showToast } from './utils.js';
import { AppState, setActiveLocation } from './app.js';

const LOCATION_ICONS = ['🏠','🌳','🏔️','🌊','🏙️','🌾','🏕️','⛰️','🌺','❄️'];

export async function renderLocations(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Helyszínek</div>
      <div id="loc-list-wrap"></div>
      <div id="loc-form-wrap"></div>
      <button id="btn-show-add-loc" class="btn btn-ghost">＋ Új helyszín hozzáadása</button>
    </div>`;

  await loadLocations(container);

  container.querySelector('#btn-show-add-loc')?.addEventListener('click', () => {
    showAddForm(container);
  });
}

async function loadLocations(container) {
  const wrap = container.querySelector('#loc-list-wrap');
  wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary)">Betöltés...</div>';

  try {
    const locs = await getLocations();
    if (!locs.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Még nincs helyszín</h3><p>Adj hozzá egy helyszínt a mérések rögzítéséhez!</p></div>`;
      return;
    }

    const counts = await Promise.all(locs.map(l => getLocationReadingCount(l.id)));

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
            <button class="loc-action" data-action="select" data-id="${loc.id}" title="Aktív helyszínnek jelöl">
              ${loc.id === AppState.activeLocationId ? '✅' : '○'}
            </button>
            <button class="loc-action del" data-action="delete" data-id="${loc.id}" data-name="${loc.name}" title="Törlés">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`;

    wrap.querySelectorAll('[data-action="select"]').forEach(btn => {
      btn.addEventListener('click', () => {
        setActiveLocation(btn.dataset.id);
        loadLocations(container);
        showToast('Aktív helyszín: ' + locs.find(l => l.id === btn.dataset.id)?.name);
      });
    });

    wrap.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog(
          `"${btn.dataset.name}" törlése`,
          'Ez törli a helyszínhez tartozó összes bejegyzést is! Nem visszavonható.'
        );
        if (!ok) return;
        try {
          await deleteLocation(btn.dataset.id);
          if (AppState.activeLocationId === btn.dataset.id) setActiveLocation(null);
          showToast('Helyszín törölve');
          await loadLocations(container);
        } catch(e) {
          showToast('Hiba: ' + e.message, 'error');
        }
      });
    });

  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Betöltési hiba</h3><p>${e.message}</p></div>`;
  }
}

function showAddForm(container) {
  const wrap = container.querySelector('#loc-form-wrap');
  wrap.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Új helyszín</div>
      <div class="form-field">
        <div class="input-label">Ikon</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${LOCATION_ICONS.map((ic, i) => `
            <button class="wt-btn ${i === 0 ? 'active' : ''}" data-icon="${ic}" style="width:48px;padding:8px 4px;">
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
        <input type="text" id="loc-desc" class="input" placeholder="Pl. Terasz 1.5m magasságban, árnyékos oldal" />
      </div>
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button id="btn-cancel-loc" class="btn btn-ghost">Mégse</button>
        <button id="btn-save-loc" class="btn btn-primary">Mentés</button>
      </div>
    </div>`;

  let selectedIcon = LOCATION_ICONS[0];
  wrap.querySelectorAll('[data-icon]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon;
      wrap.querySelectorAll('[data-icon]').forEach(b => b.classList.toggle('active', b.dataset.icon === selectedIcon));
    });
  });

  wrap.querySelector('#btn-cancel-loc')?.addEventListener('click', () => {
    wrap.innerHTML = '';
  });

  wrap.querySelector('#btn-save-loc')?.addEventListener('click', async () => {
    const name = wrap.querySelector('#loc-name').value.trim();
    const desc = wrap.querySelector('#loc-desc').value.trim();
    if (!name) { showToast('A névmező kötelező!', 'error'); return; }

    try {
      const ref = await addLocation({ name, description: desc, icon: selectedIcon });
      showToast('✅ Helyszín hozzáadva!');
      setActiveLocation(ref.id);
      wrap.innerHTML = '';
      await loadLocations(container);
    } catch(e) {
      showToast('Hiba: ' + e.message, 'error');
    }
  });
}
