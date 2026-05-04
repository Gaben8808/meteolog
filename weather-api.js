// ============================================================
// MeteoLog – Open-Meteo API integráció
// Ingyenes, API kulcs nélkül
// ============================================================

const WMO_CODES = {
  0:  { label: 'Derült',          emoji: '☀️' },
  1:  { label: 'Főleg napos',     emoji: '🌤️' },
  2:  { label: 'Részben felhős',  emoji: '⛅' },
  3:  { label: 'Borult',          emoji: '☁️' },
  45: { label: 'Ködös',           emoji: '🌫️' },
  48: { label: 'Zúzmarás köd',    emoji: '🌫️' },
  51: { label: 'Gyenge szitálás', emoji: '🌦️' },
  53: { label: 'Szitálás',        emoji: '🌦️' },
  55: { label: 'Erős szitálás',   emoji: '🌧️' },
  61: { label: 'Gyenge eső',      emoji: '🌧️' },
  63: { label: 'Eső',             emoji: '🌧️' },
  65: { label: 'Erős eső',        emoji: '🌧️' },
  71: { label: 'Gyenge hóesés',   emoji: '🌨️' },
  73: { label: 'Hóesés',          emoji: '🌨️' },
  75: { label: 'Erős hóesés',     emoji: '❄️' },
  80: { label: 'Zápor',           emoji: '🌦️' },
  81: { label: 'Erős zápor',      emoji: '🌧️' },
  95: { label: 'Zivatar',         emoji: '⛈️' },
  99: { label: 'Erős zivatar',    emoji: '⛈️' },
};

export function getWMOInfo(code) {
  return WMO_CODES[code] || { label: 'Ismeretlen', emoji: '🌡️' };
}

export async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
    `weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation` +
    `&wind_speed_unit=kmh&timezone=Europe%2FBudapest`;

  const res  = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo API hiba: ' + res.status);
  const data = await res.json();
  const c    = data.current;

  return {
    temp:        c.temperature_2m,
    feelsLike:   c.apparent_temperature,
    humidity:    c.relative_humidity_2m,
    pressure:    Math.round(c.surface_pressure),
    windSpeed:   Math.round(c.wind_speed_10m),
    windDir:     c.wind_direction_10m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    ...getWMOInfo(c.weather_code),
    updatedAt:   new Date(c.time).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }),
  };
}

export async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&wind_speed_unit=kmh&timezone=Europe%2FBudapest&forecast_days=5`;

  const res  = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo API hiba: ' + res.status);
  const data = await res.json();

  return data.daily.time.map((date, i) => ({
    date,
    tempMax:     data.daily.temperature_2m_max[i],
    tempMin:     data.daily.temperature_2m_min[i],
    precip:      data.daily.precipitation_sum[i],
    ...getWMOInfo(data.daily.weather_code[i]),
  }));
}
