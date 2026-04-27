// ============================================================
// MeteoLog – History View
// ============================================================
import { getMonthReadings, deleteReading } from './db.js';
import { getWeatherType, formatTime, confirmDialog, showToast, HU_MONTHS, HU_DOW_SHORT, sameDay, toDateKey } from './utils.js';
import { AppState } from './state.js';

let curYear  = new Date().getFullYear();
let curMonth = new Date().getMonth();
let selectedDate = new Date();
let monthData = [];

export async function renderHistory(container) {
  container.innerHTML = `
    <div class="view">
      <div class="view-title">Előzmény</div>
      <div class="calendar" id="cal"></div>
      <div class="section-header" style="margin-top:20px;">
        <div class="section-title" id="day-title">Bejegyzések</div>
      </div>
      <div id="day-entries"></div>
    </div>`;

  await loadMonth(container);
}

async function loadMonth(container) {
  if (!AppState.activeLocationId) {
    container.querySelector('#cal').innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-secondary);">Válassz helyszínt!</div>`;
    return;
  }
  monthData = await getMonthReadings(AppState.activeLocationId, curYear, curMonth);
  renderCalendar(container);
  renderDayEntries(container, selectedDate);
}

function renderCalendar(container) {
  const cal = container.querySelector('#cal');
  if (!cal) return;
  const months = HU_MONTHS();
  const dows   = HU_DOW_SHORT();

  // Build DOW-keyed map of readings
  const readingsByDay = {};
  monthData.forEach(r => {
    const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
    const key = toDateKey(d);
    if (!readingsByDay[key]) readingsByDay[key] = [];
    readingsByDay[key].push(r);
  });

  const firstDay = new Date(curYear, curMonth, 1);
  // HU week starts on Monday (1=Mon ... 0=Sun → put Sun last)
  let startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const today = new Date();

  let cells = '';
  // prev month filler
  for (let i = 0; i < startDow; i++) {
    const d = new Date(curYear, curMonth, 1 - (startDow - i));
    cells += `<div class="cal-day other-month"><span class="cal-day-num">${d.getDate()}</span></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(curYear, curMonth, d);
    const key  = toDateKey(date);
    const rs   = readingsByDay[key] || [];
    const isToday    = sameDay(date, today);
    const isSelected = sameDay(date, selectedDate);
    const topR = rs[0];
    const wt   = topR ? getWeatherType(topR.weatherType) : null;
    cells += `
      <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${key}">
        <span class="cal-day-num">${d}</span>
        ${wt ? `<span class="cal-day-emoji">${wt.emoji}</span>` : (rs.length ? '<span class="cal-day-dot"></span>' : '')}
      </div>`;
  }
  // next month filler
  const filled = startDow + daysInMonth;
  const trailing = filled % 7 === 0 ? 0 : 7 - (filled % 7);
  for (let i = 1; i <= trailing; i++) {
    cells += `<div class="cal-day other-month"><span class="cal-day-num">${i}</span></div>`;
  }

  cal.innerHTML = `
    <div class="calendar-header">
      <button class="cal-nav" id="cal-prev">‹</button>
      <div class="cal-month">${months[curMonth]} ${curYear}</div>
      <button class="cal-nav" id="cal-next">›</button>
    </div>
    <div class="cal-grid">
      ${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells}
    </div>`;

  cal.querySelector('#cal-prev')?.addEventListener('click', () => {
    curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; }
    loadMonth(container);
  });
  cal.querySelector('#cal-next')?.addEventListener('click', () => {
    curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; }
    loadMonth(container);
  });
  cal.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      const [y, m, d] = el.dataset.date.split('-').map(Number);
      selectedDate = new Date(y, m - 1, d);
      cal.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      renderDayEntries(container, selectedDate);
    });
  });
}

function renderDayEntries(container, date) {
  const titleEl = container.querySelector('#day-title');
  const listEl  = container.querySelector('#day-entries');
  if (!titleEl || !listEl) return;

  const dayReadings = monthData.filter(r => sameDay(r.timestamp, date));
  titleEl.textContent = date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' }) + ' – bejegyzések';

  if (!dayReadings.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>Nincs bejegyzés</h3><p>Ezen a napon még nem rögzítettél adatot.</p></div>`;
    return;
  }

  listEl.innerHTML = `<div class="history-day-entries">
    ${dayReadings.map(r => {
      const wt = getWeatherType(r.weatherType);
      const meta = [
        r.humidity != null ? `💧 ${r.humidity}%` : null,
        r.wind?.speed != null ? `🌬️ ${r.wind.speed} km/h ${r.wind.direction || ''}` : null,
        r.pressure != null ? `📊 ${r.pressure} hPa` : null,
        r.precipitation?.observed ? `🌧️ ${r.precipitation.amount ?? 0} mm` : null,
      ].filter(Boolean).join('  ·  ');
      return `
        <div class="history-entry" data-id="${r.id}">
          <div class="he-emoji">${wt.emoji}</div>
          <div class="he-data">
            <div class="he-temp">${r.temp != null ? r.temp + '°C' : wt.label}</div>
            ${meta ? `<div class="he-meta">${meta}</div>` : ''}
            ${r.notes ? `<div class="he-meta" style="font-style:italic;margin-top:4px;">${r.notes}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <div class="he-time">${formatTime(r.timestamp)}</div>
            <button class="he-delete" data-id="${r.id}" title="Törlés">🗑️</button>
          </div>
        </div>`;
    }).join('')}
  </div>`;

  listEl.querySelectorAll('.he-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog('Bejegyzés törlése', 'Biztosan törölni szeretnéd ezt a bejegyzést? Ez nem visszavonható.');
      if (!ok) return;
      try {
        await deleteReading(btn.dataset.id);
        monthData = monthData.filter(r => r.id !== btn.dataset.id);
        showToast('Törölve!');
        renderCalendar(container);
        renderDayEntries(container, selectedDate);
      } catch(e) {
        showToast('Hiba: ' + e.message, 'error');
      }
    });
  });
}
