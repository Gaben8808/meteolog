// ============================================================
// MeteoLog – Shared App State (körkörös import elkerülése)
// ============================================================

export const AppState = {
  activeLocationId: localStorage.getItem('meteolog_loc') || null,
  activeView: 'dashboard',
};

export function setActiveLocation(id) {
  AppState.activeLocationId = id;
  localStorage.setItem('meteolog_loc', id || '');
  // Értesítjük az app.js-t hogy frissítse a header chipet
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { id } }));
}
