// ============================================================
// MeteoLog – Locations View (import-mentes verzió)
// ============================================================

const LOCATION_ICONS = ['🏠','🌳','🏔️','🌊','🏙️','🌾','🏕️','⛰️','🌺','❄️'];
let selectedIcon = LOCATION_ICONS[0];

export async function renderLocations(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Helyszínek</div>
      <div id="loc-list-wrap"><p style="color:var(--text-secondary);text-align:center;padding:24px">Betöltés...</p></div>
      <div id="loc-form-wrap" class="hidden">
        <div class="sheet" style="margin-bottom:16px;">
          <div class="sheet-title">Új helyszín</div>
          <div id="loc-form-error" style="display:none;background:#1a0a0a;border:1px solid #ef4444;color:#fca5a5;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px;"></div>
          <div class="form-field">
            <div class="input-label">Ikon</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
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

  container.addEventListener('click', e => handleClick(e, container));
  await loadLocations(container);
}

function handleClick(e, container) {
  if (e.target.closest('.icon-btn')) {
    const btn = e.target.closest('.icon-btn');
    selectedIcon = btn.dataset.icon;
    container.querySelectorAll('.icon-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.icon === selectedIcon));
    return;
  }
  if (e.target.id === 'btn-show-add-loc') {
    selectedIcon = LOCATION_ICONS[0];
    container.querySelector('#loc-form-wrap').classList.remove('hidden');
    container.querySelector('#btn-show-add-loc').classList.add('hidden');
    return;
  }
  if (e.target.id === 'btn-cancel-loc') {
    hideForm(container); return;
  }
  if (e.target.id === 'btn-save-loc') {
    saveLocation(container); return;
  }
  const selBtn = e.target.closest('[data-action="select"]');
  if (selBtn) {
    window.__setActiveLocation(selBtn.dataset.id);
    loadLocations(container); return;
  }
  const delBtn = e.target.closest('[data-action="delete"]');
  if (delBtn) {
    deleteLocationHandler(container, delBtn.dataset.id, delBtn.dataset.name);
  }
}

function hideForm(container) {
  container.querySelector('#loc-form-wrap').classList.add('hidden');
  container.querySelector('#btn-show-add-loc').classList.remove('hidden');
  const n = container.querySelector('#loc-name'); if (n) n.value = '';
  const d = container.querySelector('#loc-desc'); if (d) d.value = '';
  const errEl = container.querySelector('#loc-form-error');
  if (errEl) errEl.style.display = 'none';
}

async function saveLocation(container) {
  const btn   = container.querySelector('#btn-save-loc');
  const errEl = container.querySelector('#loc-form-error');
  const name  = (container.querySelector('#loc-name')?.value || '').trim();
  const desc  = (container.querySelector('#loc-desc')?.value || '').trim();

  errEl.style.display = 'none';
  if (!name) {
    errEl.textContent = '⚠️ A névmező kitöltése kötelező!';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mentés...';

  try {
    const { collection, doc, addDoc, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const db   = window.__firebase.db;
    const uid  = window.__firebase.auth.currentUser?.uid;
    if (!uid) throw new Error('Nincs bejelentkezve!');

    const locsRef = collection(doc(db, 'users', uid), 'locations');
    const ref = await addDoc(locsRef, {
      name, description: desc, icon: selectedIcon,
      createdAt: serverTimestamp()
    });

    window.__setActiveLocation(ref.id);
    window.__showToast('✅ Helyszín hozzáadva!');
    hideForm(container);
    await loadLocations(container);
  } catch(err) {
    errEl.textContent = '⚠️ ' + (err.message || String(err));
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Mentés';
  }
}

async function deleteLocationHandler(container, id, name) {
  if (!confirm(`"${name}" törlése?\n\nEz törli az összes hozzá tartozó bejegyzést is!`)) return;
  try {
    const { collection, doc, getDocs, deleteDoc, query, where } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const db  = window.__firebase.db;
    const uid = window.__firebase.auth.currentUser?.uid;
    const userDoc  = doc(db, 'users', uid);
    const readings = collection(userDoc, 'readings');
    const snap = await getDocs(query(readings, where('locationId', '==', id)));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(collection(userDoc, 'locations'), id));
    if (window.__appState?.activeLocationId === id) window.__setActiveLocation(null);
    window.__showToast('Helyszín törölve');
    await loadLocations(container);
  } catch(e) {
    window.__showToast('Hiba: ' + e.message, 'error');
  }
}

async function loadLocations(container) {
  const wrap = container.querySelector('#loc-list-wrap');
  if (!wrap) return;
  try {
    const { collection, doc, getDocs, query, orderBy, where } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const db  = window.__firebase.db;
    const uid = window.__firebase.auth.currentUser?.uid;
    if (!uid) { wrap.innerHTML = '<p style="color:var(--text-secondary);padding:16px">Nincs bejelentkezve</p>'; return; }

    const locsRef = collection(doc(db, 'users', uid), 'locations');
    const snap = await getDocs(query(locsRef, orderBy('createdAt', 'asc')));
    const locs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!locs.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Még nincs helyszín</h3><p>Adj hozzá egyet a + gombbal!</p></div>`;
      return;
    }

    const readRef = collection(doc(db, 'users', uid), 'readings');
    const counts = await Promise.all(locs.map(async l => {
      try {
        const s = await getDocs(query(readRef, where('locationId', '==', l.id)));
        return s.size;
      } catch { return 0; }
    }));

    const activeId = window.__appState?.activeLocationId;
    wrap.innerHTML = `<div class="location-list">
      ${locs.map((loc, i) => `
        <div class="loc-item ${loc.id === activeId ? 'active-loc' : ''}">
          <div class="loc-item-icon">${loc.icon || '📍'}</div>
          <div class="loc-item-info">
            <div class="loc-item-name">${loc.name}</div>
            ${loc.description ? `<div class="loc-item-desc">${loc.description}</div>` : ''}
            <div class="loc-item-count">${counts[i]} bejegyzés</div>
          </div>
          <div class="loc-item-actions">
            <button type="button" class="loc-action" data-action="select" data-id="${loc.id}">
              ${loc.id === activeId ? '✅' : '○'}
            </button>
            <button type="button" class="loc-action del" data-action="delete" data-id="${loc.id}" data-name="${loc.name}">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`;
  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Hiba</h3><p>${e.message}</p></div>`;
  }
}
