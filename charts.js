// ============================================================
// MeteoLog – Charts View (közvetlen Firebase hívások)
// ============================================================
import { getWeatherType, formatDateShort, showToast } from './utils.js';
import { AppState } from './state.js';

let activeTab    = 'temp';
let activePeriod = 30;
let charts = {};

export async function renderCharts(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Grafikonok</div>
      <div class="tabs">
        <button class="tab-btn ${activeTab==='temp'?'active':''}" data-tab="temp">🌡️ Hőmérséklet</button>
        <button class="tab-btn ${activeTab==='precip'?'active':''}" data-tab="precip">🌧️ Csapadék</button>
        <button class="tab-btn ${activeTab==='stats'?'active':''}" data-tab="stats">📊 Statisztika</button>
      </div>
      <div class="period-selector">
        <button class="period-btn ${activePeriod===7?'active':''}" data-days="7">7 nap</button>
        <button class="period-btn ${activePeriod===30?'active':''}" data-days="30">30 nap</button>
        <button class="period-btn ${activePeriod===90?'active':''}" data-days="90">90 nap</button>
        <button class="period-btn ${activePeriod===365?'active':''}" data-days="365">1 év</button>
      </div>
      <div id="chart-content"></div>

      <!-- Export szekció -->
      <div class="export-section">
        <div class="section-header" style="margin-bottom:12px;">
          <div class="section-title">📥 Exportálás</div>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6;">
          Az aktuálisan kiválasztott időszak adatait tölti le CSV formátumban –
          megnyitható Excelben és Google Sheetsben.
        </p>
        <button id="btn-export-csv" class="btn btn-ghost" style="gap:10px;">
          <span style="font-size:18px;">📊</span> CSV letöltés (${activePeriod} nap)
        </button>
      </div>

      <!-- Hónap export (előzmény nézethez hasonló, de itt az aktív időszakra) -->
    </div>`;

  Object.values(charts).forEach(c => c?.destroy());
  charts = {};

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      loadChart(container);
    });
  });
  container.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activePeriod = +btn.dataset.days;
      container.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', +b.dataset.days === activePeriod));
      loadChart(container);
    });
  });

  await loadChart(container);

  // Export gomb
  container.querySelector('#btn-export-csv')?.addEventListener('click', () => exportCSV(container));
}

async function getReadings() {
  const { collection, doc, getDocs, query, where, orderBy, Timestamp } =
    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const fb  = window.__firebase;
  const uid = fb.auth.currentUser?.uid;
  if (!uid) throw new Error('Nincs bejelentkezve');
  const from = new Date();
  from.setDate(from.getDate() - activePeriod);
  const snap = await getDocs(query(
    collection(doc(fb.db, 'users', uid), 'readings'),
    where('locationId', '==', AppState.activeLocationId),
    where('timestamp', '>=', Timestamp.fromDate(from)),
    orderBy('timestamp', 'asc')
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function loadChart(container) {
  const el = container.querySelector('#chart-content');
  el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-secondary)">Betöltés...</div>`;

  if (!AppState.activeLocationId) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Nincs helyszín</h3><p>Válassz helyszínt a grafikonok megtekintéséhez.</p></div>`;
    return;
  }
  try {
    const readings = await getReadings();
    if (!readings.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📈</div><h3>Nincs adat</h3><p>Még nincs elég bejegyzés az időszakra.</p></div>`;
      return;
    }
    if (activeTab === 'temp')   renderTempChart(el, readings);
    if (activeTab === 'precip') renderPrecipChart(el, readings);
    if (activeTab === 'stats')  renderStatsTab(el, readings);
  } catch(e) {
    showToast('Hiba a grafikonoknál: ' + e.message, 'error');
  }
}

function chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor:'#101e35', borderColor:'#1c3054', borderWidth:1, titleColor:'#ddeeff', bodyColor:'#7a9bbf', padding:10 }
    },
    scales: {
      x: { ticks:{ color:'#7a9bbf', font:{family:'JetBrains Mono',size:11}, maxTicksLimit:8 }, grid:{color:'#1c3054'} },
      y: { ticks:{ color:'#7a9bbf', font:{family:'JetBrains Mono',size:11} }, grid:{color:'#1c3054'} }
    }
  };
}

function renderTempChart(el, readings) {
  const withTemp = readings.filter(r => r.temp != null);
  if (!withTemp.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌡️</div><h3>Nincs hőmérsékleti adat</h3></div>`; return; }
  el.innerHTML = `
    <div class="chart-container"><div class="card-title">🌡️ Hőmérséklet (°C)</div><div class="chart-wrap"><canvas id="chart-temp"></canvas></div></div>
    <div class="chart-container"><div class="card-title">💧 Páratartalom (%)</div><div class="chart-wrap"><canvas id="chart-hum"></canvas></div></div>`;
  charts.temp = new Chart(el.querySelector('#chart-temp'), {
    type: 'line',
    data: { labels: withTemp.map(r => formatDateShort(r.timestamp)),
      datasets: [{ data: withTemp.map(r => r.temp), borderColor:'#00e5b0', backgroundColor:'rgba(0,229,176,0.08)', borderWidth:2, pointRadius: withTemp.length>30?0:4, pointBackgroundColor:'#00e5b0', fill:true, tension:0.4 }] },
    options: chartDefaults()
  });
  const withHum = readings.filter(r => r.humidity != null);
  if (withHum.length) {
    charts.hum = new Chart(el.querySelector('#chart-hum'), {
      type: 'line',
      data: { labels: withHum.map(r => formatDateShort(r.timestamp)),
        datasets: [{ data: withHum.map(r => r.humidity), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)', borderWidth:2, pointRadius: withHum.length>30?0:4, pointBackgroundColor:'#3b82f6', fill:true, tension:0.4 }] },
      options: { ...chartDefaults(), scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, min:0, max:100 } } }
    });
  }
}

function renderPrecipChart(el, readings) {
  const withPrecip = readings.filter(r => r.precipitation?.observed);
  const weatherCounts = {};
  readings.forEach(r => { weatherCounts[r.weatherType] = (weatherCounts[r.weatherType]||0)+1; });
  el.innerHTML = `
    <div class="chart-container"><div class="card-title">🌧️ Csapadék (mm)</div><div class="chart-wrap"><canvas id="chart-precip"></canvas></div></div>
    <div class="chart-container"><div class="card-title">☁️ Időjárás megoszlása</div><div class="chart-wrap" style="height:200px;"><canvas id="chart-weather"></canvas></div></div>`;
  charts.precip = new Chart(el.querySelector('#chart-precip'), {
    type: 'bar',
    data: { labels: (withPrecip.length?withPrecip:readings).map(r => formatDateShort(r.timestamp)),
      datasets: [{ data: withPrecip.length?withPrecip.map(r=>r.precipitation.amount||0):readings.map(()=>0), backgroundColor:'rgba(59,130,246,0.6)', borderColor:'#3b82f6', borderWidth:1, borderRadius:4 }] },
    options: chartDefaults()
  });
  const wtEntries = Object.entries(weatherCounts);
  charts.weather = new Chart(el.querySelector('#chart-weather'), {
    type: 'doughnut',
    data: { labels: wtEntries.map(([id]) => { const wt=getWeatherType(id); return `${wt.emoji} ${wt.label}`; }),
      datasets: [{ data: wtEntries.map(([,v])=>v), backgroundColor:['#00e5b0','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#6366f1','#ec4899','#06b6d4'], borderWidth:0 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true,position:'right',labels:{color:'#7a9bbf',font:{size:11},boxWidth:12}}, tooltip:{backgroundColor:'#101e35',borderColor:'#1c3054',borderWidth:1,titleColor:'#ddeeff',bodyColor:'#7a9bbf'} } }
  });
}

function renderStatsTab(el, readings) {
  const withTemp  = readings.filter(r=>r.temp!=null).map(r=>r.temp);
  const withHum   = readings.filter(r=>r.humidity!=null).map(r=>r.humidity);
  const withPres  = readings.filter(r=>r.pressure!=null).map(r=>r.pressure);
  const precipDays = readings.filter(r=>r.precipitation?.observed).length;
  const precipSum  = readings.filter(r=>r.precipitation?.observed).reduce((s,r)=>s+(r.precipitation.amount||0),0);
  const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null;
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stats-item"><div class="stats-item-val">${withTemp.length?Math.min(...withTemp)+'°C':'–'}</div><div class="stats-item-lbl">Min hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${withTemp.length?Math.max(...withTemp)+'°C':'–'}</div><div class="stats-item-lbl">Max hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withTemp)?avg(withTemp)+'°C':'–'}</div><div class="stats-item-lbl">Átlag hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withHum)?avg(withHum)+'%':'–'}</div><div class="stats-item-lbl">Átlag páratartalom</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withPres)?avg(withPres)+' hPa':'–'}</div><div class="stats-item-lbl">Átlag légnyomás</div></div>
      <div class="stats-item"><div class="stats-item-val">${precipDays}</div><div class="stats-item-lbl">Csapadékos nap</div></div>
      <div class="stats-item"><div class="stats-item-val">${precipSum.toFixed(1)} mm</div><div class="stats-item-lbl">Összes csapadék</div></div>
      <div class="stats-item"><div class="stats-item-val">${readings.length}</div><div class="stats-item-lbl">Összes bejegyzés</div></div>
    </div>`;
}


// ── Export funkció ────────────────────────────────────────────
async function exportCSV(container) {
  const btn = container.querySelector('#btn-export-csv');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span style="font-size:18px;">⏳</span> Exportálás...';

  try {
    const readings = await getReadings();
    if (!readings.length) {
      showToast('Nincs exportálható adat ebben az időszakban.', 'error');
      return;
    }

    // Helyszín nevének lekérése
    let locationName = 'ismeretlen';
    try {
      const { collection, doc, getDoc } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const fb  = window.__firebase;
      const uid = fb.auth.currentUser?.uid;
      const locSnap = await getDoc(doc(collection(doc(fb.db,'users',uid),'locations'), AppState.activeLocationId));
      if (locSnap.exists()) locationName = locSnap.data().name;
    } catch(e) {}

    // CSV fejléc
    const headers = [
      'Dátum', 'Idő', 'Időjárás', 'Hőmérséklet (°C)',
      'Páratartalom (%)', 'Légnyomás (hPa)',
      'Szélirány', 'Szélsebesség (km/h)', 'Beaufort',
      'Csapadék', 'Csapadék (mm)', 'Megjegyzés'
    ];

    // CSV sorok
    const rows = readings.map(r => {
      const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const wt = getWeatherType(r.weatherType);
      return [
        d.toLocaleDateString('hu-HU'),
        d.toLocaleTimeString('hu-HU', { hour:'2-digit', minute:'2-digit' }),
        wt.label,
        r.temp != null ? r.temp : '',
        r.humidity != null ? r.humidity : '',
        r.pressure != null ? r.pressure : '',
        r.wind?.direction || '',
        r.wind?.speed != null ? r.wind.speed : '',
        r.wind?.beaufort != null ? r.wind.beaufort : '',
        r.precipitation?.observed ? 'igen' : 'nem',
        r.precipitation?.observed ? (r.precipitation.amount || 0) : '',
        r.notes ? `"${r.notes.replace(/"/g,'""')}"` : ''
      ].join(';');
    });

    // BOM + CSV összeállítás (UTF-8 Excel kompatibilis)
    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    // Letöltés
    const dateStr = new Date().toISOString().slice(0,10);
    const filename = `meteolog_${locationName}_${activePeriod}nap_${dateStr}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`✅ ${readings.length} bejegyzés exportálva!`);

  } catch(e) {
    showToast('Export hiba: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span style="font-size:18px;">📊</span> CSV letöltés (${activePeriod} nap)`;
  }
}