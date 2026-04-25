// ============================================================
// MeteoLog – Charts View
// ============================================================
import { getReadingsForPeriod, getStats } from '../db.js';
import { getWeatherType, WEATHER_TYPES, formatDateShort, showToast } from '../utils.js';
import { AppState } from '../app.js';

let activeTab    = 'temp';
let activePeriod = 30;
let charts = {};

export async function renderCharts(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Grafikonok</div>
      <div class="tabs">
        <button class="tab-btn ${activeTab === 'temp' ? 'active' : ''}" data-tab="temp">🌡️ Hőmérséklet</button>
        <button class="tab-btn ${activeTab === 'precip' ? 'active' : ''}" data-tab="precip">🌧️ Csapadék</button>
        <button class="tab-btn ${activeTab === 'stats' ? 'active' : ''}" data-tab="stats">📊 Statisztika</button>
      </div>
      <div class="period-selector" id="period-sel">
        <button class="period-btn ${activePeriod === 7   ? 'active' : ''}" data-days="7">7 nap</button>
        <button class="period-btn ${activePeriod === 30  ? 'active' : ''}" data-days="30">30 nap</button>
        <button class="period-btn ${activePeriod === 90  ? 'active' : ''}" data-days="90">90 nap</button>
        <button class="period-btn ${activePeriod === 365 ? 'active' : ''}" data-days="365">1 év</button>
      </div>
      <div id="chart-content"></div>
    </div>`;

  // Destroy old charts on re-render
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
}

async function loadChart(container) {
  const el = container.querySelector('#chart-content');
  el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-secondary)">Betöltés...</div>`;

  if (!AppState.activeLocationId) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📍</div><h3>Nincs helyszín</h3><p>Válassz helyszínt a grafikonok megtekintéséhez.</p></div>`;
    return;
  }

  try {
    const readings = await getReadingsForPeriod(AppState.activeLocationId, activePeriod);

    if (!readings.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📈</div><h3>Nincs adat</h3><p>Még nincs elég bejegyzés az időszakra.</p></div>`;
      return;
    }

    if (activeTab === 'temp')   renderTempChart(el, readings);
    if (activeTab === 'precip') renderPrecipChart(el, readings);
    if (activeTab === 'stats')  renderStatsTab(el, readings);
  } catch(e) {
    showToast('Hiba a grafikonoknál', 'error');
    console.error(e);
  }
}

function getChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#101e35',
        borderColor: '#1c3054',
        borderWidth: 1,
        titleColor: '#ddeeff',
        bodyColor: '#7a9bbf',
        padding: 10,
      }
    },
    scales: {
      x: { ticks: { color: '#7a9bbf', font: { family: 'JetBrains Mono', size: 11 }, maxTicksLimit: 8 }, grid: { color: '#1c3054' } },
      y: { ticks: { color: '#7a9bbf', font: { family: 'JetBrains Mono', size: 11 } }, grid: { color: '#1c3054' } }
    }
  };
}

function renderTempChart(el, readings) {
  // Sort ascending by time
  const sorted = [...readings].sort((a, b) => {
    const at = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const bt = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return at - bt;
  });
  const withTemp = sorted.filter(r => r.temp != null);
  if (!withTemp.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌡️</div><h3>Nincs hőmérsékleti adat</h3></div>`; return; }

  const labels = withTemp.map(r => formatDateShort(r.timestamp));
  const data   = withTemp.map(r => r.temp);

  el.innerHTML = `
    <div class="chart-container">
      <div class="card-title">🌡️ Hőmérséklet (°C)</div>
      <div class="chart-wrap"><canvas id="chart-temp"></canvas></div>
    </div>
    <div class="chart-container">
      <div class="card-title">💧 Páratartalom (%)</div>
      <div class="chart-wrap"><canvas id="chart-hum"></canvas></div>
    </div>`;

  charts.temp = new Chart(el.querySelector('#chart-temp'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#00e5b0',
        backgroundColor: 'rgba(0,229,176,0.08)',
        borderWidth: 2,
        pointRadius: data.length > 30 ? 0 : 4,
        pointBackgroundColor: '#00e5b0',
        fill: true,
        tension: 0.4,
      }]
    },
    options: { ...getChartDefaults() }
  });

  const withHum = sorted.filter(r => r.humidity != null);
  if (withHum.length) {
    charts.hum = new Chart(el.querySelector('#chart-hum'), {
      type: 'line',
      data: {
        labels: withHum.map(r => formatDateShort(r.timestamp)),
        datasets: [{
          data: withHum.map(r => r.humidity),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          borderWidth: 2,
          pointRadius: withHum.length > 30 ? 0 : 4,
          pointBackgroundColor: '#3b82f6',
          fill: true,
          tension: 0.4,
        }]
      },
      options: { ...getChartDefaults(), scales: { ...getChartDefaults().scales, y: { ...getChartDefaults().scales.y, min: 0, max: 100 } } }
    });
  }
}

function renderPrecipChart(el, readings) {
  const sorted = [...readings].sort((a, b) => {
    const at = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const bt = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return at - bt;
  });

  const withPrecip = sorted.filter(r => r.precipitation?.observed);
  const weatherCounts = {};
  readings.forEach(r => {
    weatherCounts[r.weatherType] = (weatherCounts[r.weatherType] || 0) + 1;
  });

  el.innerHTML = `
    <div class="chart-container">
      <div class="card-title">🌧️ Csapadék (mm)</div>
      <div class="chart-wrap"><canvas id="chart-precip"></canvas></div>
    </div>
    <div class="chart-container">
      <div class="card-title">☁️ Időjárás megoszlása</div>
      <div class="chart-wrap" style="height:200px;"><canvas id="chart-weather"></canvas></div>
    </div>`;

  // Precip bar
  const precipLabels = withPrecip.length ? withPrecip.map(r => formatDateShort(r.timestamp)) : sorted.map(r => formatDateShort(r.timestamp));
  const precipData   = withPrecip.length ? withPrecip.map(r => r.precipitation.amount || 0) : sorted.map(() => 0);

  charts.precip = new Chart(el.querySelector('#chart-precip'), {
    type: 'bar',
    data: {
      labels: precipLabels,
      datasets: [{
        data: precipData,
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: { ...getChartDefaults() }
  });

  // Weather type donut
  const wtEntries = Object.entries(weatherCounts);
  charts.weather = new Chart(el.querySelector('#chart-weather'), {
    type: 'doughnut',
    data: {
      labels: wtEntries.map(([id]) => {
        const wt = getWeatherType(id);
        return `${wt.emoji} ${wt.label}`;
      }),
      datasets: [{
        data: wtEntries.map(([, v]) => v),
        backgroundColor: ['#00e5b0','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#6366f1','#ec4899','#06b6d4'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'right', labels: { color: '#7a9bbf', font: { size: 11 }, boxWidth: 12 } },
        tooltip: { backgroundColor: '#101e35', borderColor: '#1c3054', borderWidth: 1, titleColor: '#ddeeff', bodyColor: '#7a9bbf' }
      }
    }
  });
}

function renderStatsTab(el, readings) {
  const withTemp   = readings.filter(r => r.temp != null).map(r => r.temp);
  const withHum    = readings.filter(r => r.humidity != null).map(r => r.humidity);
  const withPres   = readings.filter(r => r.pressure != null).map(r => r.pressure);
  const precipDays = readings.filter(r => r.precipitation?.observed).length;
  const precipSum  = readings.filter(r => r.precipitation?.observed).reduce((s, r) => s + (r.precipitation.amount || 0), 0);

  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stats-item"><div class="stats-item-val">${withTemp.length ? Math.min(...withTemp) + '°C' : '–'}</div><div class="stats-item-lbl">Min hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${withTemp.length ? Math.max(...withTemp) + '°C' : '–'}</div><div class="stats-item-lbl">Max hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withTemp) ? avg(withTemp) + '°C' : '–'}</div><div class="stats-item-lbl">Átlag hőmérséklet</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withHum) ? avg(withHum) + '%' : '–'}</div><div class="stats-item-lbl">Átlag páratartalom</div></div>
      <div class="stats-item"><div class="stats-item-val">${avg(withPres) ? avg(withPres) + ' hPa' : '–'}</div><div class="stats-item-lbl">Átlag légnyomás</div></div>
      <div class="stats-item"><div class="stats-item-val">${precipDays}</div><div class="stats-item-lbl">Csapadékos nap</div></div>
      <div class="stats-item"><div class="stats-item-val">${precipSum.toFixed(1)} mm</div><div class="stats-item-lbl">Összes csapadék</div></div>
      <div class="stats-item"><div class="stats-item-val">${readings.length}</div><div class="stats-item-lbl">Összes bejegyzés</div></div>
    </div>`;
}
