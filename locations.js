// ============================================================
// MeteoLog – Locations View
// ============================================================

const ICONS = ['🏠','🌳','🏔️','🌊','🏙️','🌾','🏕️','⛰️','🌺','❄️'];

// Globális függvények – ezeket az onclick attribútumok hívják
window._locIsPublic = false;
window._locTogglePublic = function() {
  window._locIsPublic = !window._locIsPublic;
  const t = document.getElementById('loc-public-toggle');
  if (t) t.classList.toggle('on', window._locIsPublic);
};

window._locGetGPS = function() {
  const btn = document.getElementById('btn-get-gps');
  if (btn) { btn.textContent = '📡 Lekérés...'; btn.disabled = true; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = document.getElementById('loc-lat');
      const lon = document.getElementById('loc-lon');
      if (lat) lat.value = pos.coords.latitude.toFixed(4);
      if (lon) lon.value = pos.coords.longitude.toFixed(4);
      if (btn) { btn.textContent = '✅ Pozíció lekérve!'; btn.disabled = false; }
    },
    err => {
      if (btn) { btn.textContent = '⚠️ Hiba: ' + err.message; btn.disabled = false; }
    }
  );
};

window._locSelectIcon = function(ic) {
  window._locSelectedIcon = ic;
  document.querySelectorAll('.icon-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.icon === ic));
};

window._locShowForm = function() {
  window._locSelectedIcon = ICONS[0];
  window._locIsPublic = false;
  document.getElementById('loc-form-wrap').style.display = 'block';
  document.getElementById('btn-show-add-loc').style.display = 'none';
};

window._locHideForm = function() {
  document.getElementById('loc-form-wrap').style.display = 'none';
  document.getElementById('btn-show-add-loc').style.display = '';
  const n = document.getElementById('loc-name'); if(n) n.value = '';
  const d = document.getElementById('loc-desc'); if(d) d.value = '';
  const e = document.getElementById('loc-form-error'); if(e) e.style.display='none';
};

window._locSave = async function() {
  const btn   = document.getElementById('btn-save-loc');
  const errEl = document.getElementById('loc-form-error');
  const name  = (document.getElementById('loc-name')?.value||'').trim();
  const desc  = (document.getElementById('loc-desc')?.value||'').trim();

  if(errEl) errEl.style.display = 'none';
  if (!name) {
    if(errEl){ errEl.textContent='⚠️ A névmező kötelező!'; errEl.style.display='block'; }
    return;
  }
  if(btn){ btn.disabled=true; btn.textContent='Mentés...'; }

  try {
    const fb = window.__firebase;
    const uid = fb.auth.currentUser?.uid;
    if (!uid) throw new Error('Nincs bejelentkezve!');

    const { collection, doc, addDoc, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const lat = parseFloat(document.getElementById('loc-lat')?.value) || null;
    const lon = parseFloat(document.getElementById('loc-lon')?.value) || null;
    const isPublic = window._locIsPublic || false;

    const locData = {
      name, description: desc,
      icon: window._locSelectedIcon || ICONS[0],
      lat, lon, isPublic,
      createdAt: serverTimestamp()
    };

    const ref = await addDoc(
      collection(doc(fb.db,'users',uid),'locations'),
      locData
    );

    // Ha nyilvános, elmentjük a publicLocations gyűjteménybe is
    if (isPublic && lat && lon) {
      const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      await setDoc(doc(fb.db, 'publicLocations', ref.id), {
        ownerUid: uid, locationId: ref.id,
        name, description: desc, icon: locData.icon,
        lat, lon, createdAt: serverTimestamp()
      });
    }

    window.__setActiveLocation(ref.id);
    window.__showToast('✅ Helyszín hozzáadva!');
    window._locHideForm();
    await window._locReload();
  } catch(err) {
    if(btn){ btn.disabled=false; btn.textContent='Mentés'; }
    if(errEl){ errEl.textContent='⚠️ '+( err.message||String(err)); errEl.style.display='block'; }
  }
};

window._locDelete = async function(id, name) {
  if (!confirm('"'+name+'" törlése?\n\nAz összes bejegyzés is törlődik!')) return;
  try {
    const { collection, doc, getDocs, deleteDoc, query, where } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const fb  = window.__firebase;
    const uid = fb.auth.currentUser?.uid;
    const userDoc = doc(fb.db,'users',uid);
    const snap = await getDocs(query(collection(userDoc,'readings'), where('locationId','==',id)));
    await Promise.all(snap.docs.map(d=>deleteDoc(d.ref)));
    await deleteDoc(doc(collection(userDoc,'locations'),id));
    if (window.__appState?.activeLocationId===id) window.__setActiveLocation(null);
    window.__showToast('Helyszín törölve');
    await window._locReload();
  } catch(e) {
    window.__showToast('Hiba: '+e.message,'error');
  }
};

window._locShare = function(id, name) {
  const base = window.location.origin + window.location.pathname;
  const url  = base + '?loc=' + id;
  if (navigator.share) {
    navigator.share({ title: 'MeteoLog – ' + name, url });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    window.__showToast('🔗 Link vágólapra másolva!');
  } else {
    prompt('Másold ki a linket:', url);
  }
};

window._locSelect = function(id) {
  window.__setActiveLocation(id);
  window._locReload();
};

window._locReload = async function() {
  const wrap = document.getElementById('loc-list-wrap');
  if (!wrap) return;
  try {
    const { collection, doc, getDocs, query, where } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const fb  = window.__firebase;
    const uid = fb.auth.currentUser?.uid;
    if (!uid) return;

    const snap = await getDocs(
      collection(doc(fb.db,'users',uid),'locations')
    );
    const locs = snap.docs.map(d=>({id:d.id,...d.data()}));

    if (!locs.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Még nincs helyszín</h3><p>Adj hozzá egyet lent!</p></div>`;
      return;
    }

    const activeId = window.__appState?.activeLocationId;
    wrap.innerHTML = `<div class="location-list">${locs.map(loc=>`
      <div class="loc-item ${loc.id===activeId?'active-loc':''}">
        <div class="loc-item-icon">${loc.icon||'📍'}</div>
        <div class="loc-item-info">
          <div class="loc-item-name">${loc.name}</div>
          ${loc.description?`<div class="loc-item-desc">${loc.description}</div>`:''}
        </div>
        <div class="loc-item-actions">
          ${loc.isPublic ? '<button class="loc-action" title="Link megosztása" onclick="window._locShare(\'' + loc.id + '\',\'' + loc.name.replace(/'/g,"\\'") + '\')">🔗</button>' : ''}
          <button class="loc-action" onclick="window._locSelect('${loc.id}')">${loc.id===activeId?'✅':'○'}</button>
          <button class="loc-action del" onclick="window._locDelete('${loc.id}','${loc.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </div>`).join('')}</div>`;
      </div>`).join('')}</div>`;
  } catch(e) {
    const wrap2 = document.getElementById('loc-list-wrap');
    if(wrap2) wrap2.innerHTML=`<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Hiba</h3><p>${e.message}</p></div>`;
  }
};

export async function renderLocations(container) {
  window._locSelectedIcon = ICONS[0];

  container.innerHTML = `
    <div class="view">
      <div class="view-title">Helyszínek</div>
      <div id="loc-list-wrap"><p style="color:var(--text-secondary);text-align:center;padding:24px">Betöltés...</p></div>

      <div id="loc-form-wrap" style="display:none;margin-bottom:16px;">
        <div class="sheet">
          <div class="sheet-title">Új helyszín</div>
          <div id="loc-form-error" style="display:none;background:#1a0a0a;border:1px solid #ef4444;color:#fca5a5;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px;"></div>
          <div class="form-field">
            <div class="input-label">Ikon</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${ICONS.map((ic,i)=>`
                <button type="button" class="wt-btn icon-btn ${i===0?'active':''}" data-icon="${ic}"
                  onclick="window._locSelectIcon('${ic}')" style="width:46px;padding:8px 4px;">
                  <span style="font-size:20px;">${ic}</span>
                </button>`).join('')}
            </div>
          </div>
          <div class="form-field">
            <div class="input-label">Helyszín neve *</div>
            <input type="text" id="loc-name" class="input" placeholder="Pl. Otthon, Kert..." />
          </div>
          <div class="form-field">
            <div class="input-label">Leírás (nem kötelező)</div>
            <input type="text" id="loc-desc" class="input" placeholder="Pl. terasz, árnyékos oldal..." />
          </div>
          <div class="form-field">
            <div class="input-label">📍 GPS koordináták (Open-Meteo időjáráshoz)</div>
            <div style="display:flex;gap:8px;">
              <input type="number" id="loc-lat" class="input" placeholder="Szélesség pl. 47.1234" step="0.0001" />
              <input type="number" id="loc-lon" class="input" placeholder="Hosszúság pl. 17.9012" step="0.0001" />
            </div>
            <button type="button" id="btn-get-gps" class="btn btn-ghost btn-sm" style="margin-top:8px;width:auto;" onclick="window._locGetGPS()">
              📡 Jelenlegi pozíció lekérése
            </button>
          </div>
          <div class="form-field">
            <div class="toggle-row">
              <span class="input-label" style="margin:0;">🌐 Nyilvános helyszín</span>
              <div class="toggle" id="loc-public-toggle" onclick="window._locTogglePublic()"></div>
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-top:6px;line-height:1.5;">
              Ha bekapcsolod, megosztható linket kapsz amit bárki megtekinthet.
            </p>
          </div>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button type="button" class="btn btn-ghost" onclick="window._locHideForm()">Mégse</button>
            <button type="button" id="btn-save-loc" class="btn btn-primary" onclick="window._locSave()">Mentés</button>
          </div>
        </div>
      </div>

      <button type="button" id="btn-show-add-loc" class="btn btn-ghost" onclick="window._locShowForm()">
        ＋ Új helyszín hozzáadása
      </button>
    </div>`;

  await window._locReload();
}
