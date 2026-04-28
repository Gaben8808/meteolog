// ============================================================
// MeteoLog – Locations View
// ============================================================

const ICONS = ['🏠','🌳','🏔️','🌊','🏙️','🌾','🏕️','⛰️','🌺','❄️'];

// Globális függvények – ezeket az onclick attribútumok hívják
window._locSelectIcon = function(ic) {
  window._locSelectedIcon = ic;
  document.querySelectorAll('.icon-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.icon === ic));
};

window._locShowForm = function() {
  window._locSelectedIcon = ICONS[0];
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

    const ref = await addDoc(
      collection(doc(fb.db,'users',uid),'locations'),
      { name, description:desc, icon: window._locSelectedIcon||ICONS[0], createdAt: serverTimestamp() }
    );

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

window._locSelect = function(id) {
  window.__setActiveLocation(id);
  window._locReload();
};

window._locReload = async function() {
  const wrap = document.getElementById('loc-list-wrap');
  if (!wrap) return;
  try {
    const { collection, doc, getDocs, query, orderBy, where } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const fb  = window.__firebase;
    const uid = fb.auth.currentUser?.uid;
    if (!uid) return;

    const snap = await getDocs(query(
      collection(doc(fb.db,'users',uid),'locations'),
      orderBy('createdAt','asc')
    ));
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
          <button class="loc-action" onclick="window._locSelect('${loc.id}')">${loc.id===activeId?'✅':'○'}</button>
          <button class="loc-action del" onclick="window._locDelete('${loc.id}','${loc.name.replace(/'/g,"\\'")}')">🗑️</button>
        </div>
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
