/**
 * weatherService.ts
 * Real weather via OpenWeatherMap free API.
 * Falls back to static seasonal data when no API key is configured.
 */

import type { WeatherData } from '../types';

const OPEN_WEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim() ?? '';

// ─── Cache (15 min) ────────────────────────────────────────
const CACHE_TTL = 15 * 60 * 1000;
const _cache = new Map<string, { data: WeatherData; ts: number }>();

const fromCache = (key: string): WeatherData | null => {
  const e = _cache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
  _cache.delete(key);
  return null;
};

// ─── Icon mapping ──────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  '01d':'☀️','01n':'🌙','02d':'🌤️','02n':'☁️','03d':'☁️','03n':'☁️',
  '04d':'☁️','04n':'☁️','09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌧️',
  '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️','50d':'🌫️','50n':'🌫️',
};

const resolveIcon = (code: string | undefined, condition: string): string => {
  if (code && ICON_MAP[code]) return ICON_MAP[code];
  const lc = condition.toLowerCase();
  if (lc.includes('sun') || lc.includes('clear')) return '☀️';
  if (lc.includes('cloud'))  return '☁️';
  if (lc.includes('rain'))   return '🌧️';
  if (lc.includes('storm'))  return '⛈️';
  if (lc.includes('snow'))   return '❄️';
  return '🌤️';
};

// ─── Static fallback (no API key) ─────────────────────────
const staticFallback = (lat = 30.0444, lng = 31.2357, language = 'ar'): WeatherData => {
  const month = new Date().getMonth(); // 0-11
  const isSummer = month >= 4 && month <= 8;
  const isAr = language.toLowerCase().startsWith('ar');
  const locationName = isAr
    ? `موقع تقريبي (${lat.toFixed(2)}، ${lng.toFixed(2)})`
    : `Approximate Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
    
  return {
    location:    locationName,
    temperature: isSummer ? 34 : 18,
    condition:   isSummer 
      ? (isAr ? 'مشمس وحار' : 'Sunny and hot') 
      : (isAr ? 'صاف ومعتدل' : 'Clear and mild'),
    icon:        isSummer ? '☀️' : '🌤️',
    pressure:    1013,
    humidity:    isSummer ? 45 : 60,
    wind:        12,
    feels_like:  isSummer ? 36 : 17,
    temp_min:    isSummer ? 22 : 10,
    temp_max:    isSummer ? 38 : 22,
    sunrise:     isAr ? '05:12 ص' : '05:12 AM',
    sunset:      isAr ? '06:48 م' : '06:48 PM',
    forecast: [
      { 
        day: isAr ? 'غداً' : 'Tomorrow',  
        temp_high: isSummer ? 36 : 19, 
        temp_low: isSummer ? 24 : 12, 
        condition: isSummer 
          ? (isAr ? 'مشمس' : 'Sunny') 
          : (isAr ? 'غائم جزئياً' : 'Partly cloudy') 
      },
      { 
        day: isAr ? 'بعد غد' : 'Day after', 
        temp_high: isSummer ? 35 : 21, 
        temp_low: isSummer ? 23 : 13, 
        condition: isAr ? 'صاف' : 'Clear' 
      },
      { 
        day: isAr ? 'خلال 3 أيام' : 'In 3 days', 
        temp_high: isSummer ? 33 : 20, 
        temp_low: isSummer ? 22 : 11, 
        condition: isSummer 
          ? (isAr ? 'حار' : 'Hot') 
          : (isAr ? 'معتدل' : 'Mild') 
      },
    ],
  };
};

// ─── Main export ───────────────────────────────────────────
export const getWeatherData = async (lat: number, lng: number, language: string): Promise<WeatherData> => {
  const cacheKey = `weather_${lat.toFixed(1)}_${lng.toFixed(1)}_${language}`;
  const cached   = fromCache(cacheKey);
  if (cached) return cached;

  if (!OWM_KEY) {
    return staticFallback(lat, lng, language);
  }

  const lang   = language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  const params = `lat=${lat}&lon=${lng}&units=metric&lang=${lang}&appid=${OWM_KEY}`;

  try {
    const [curRes, foreRes] = await Promise.all([
      fetch(`${OPEN_WEATHER_BASE}/weather?${params}`),
      fetch(`${OPEN_WEATHER_BASE}/forecast?${params}`),
    ]);

    if (!curRes.ok || !foreRes.ok) {
      console.warn('Weather API error, using fallback');
      return staticFallback(lat, lng, language);
    }

    const cur  = await curRes.json()  as { 
      name: string; 
      sys: { country: string; sunrise: number; sunset: number }; 
      dt: number; 
      main: { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number }; 
      wind: { speed: number }; 
      weather: { description: string; icon: string }[] 
    };
    const fore = await foreRes.json() as { list: { dt: number; dt_txt: string; main: { temp_min: number; temp_max: number }; weather: { description: string; icon: string }[] }[] };

    const todayKey  = new Date(cur.dt * 1000).toISOString().split('T')[0];
    const dayMap    = new Map<string, { high: number; low: number; cond: string; icon: string; dn: number }>();

    for (const e of fore.list ?? []) {
      const [datePart, timePart] = e.dt_txt.split(' ');
      if (!datePart || datePart <= todayKey) continue;
      const hour = Number(timePart?.slice(0, 2) ?? '12');
      const dn   = Math.abs(hour - 12);
      const existing = dayMap.get(datePart);
      if (!existing) {
        dayMap.set(datePart, { high: e.main.temp_max, low: e.main.temp_min, cond: e.weather[0]?.description ?? '', icon: e.weather[0]?.icon ?? '', dn });
      } else {
        existing.high = Math.max(existing.high, e.main.temp_max);
        existing.low  = Math.min(existing.low,  e.main.temp_min);
        if (dn < existing.dn) { existing.cond = e.weather[0]?.description ?? ''; existing.icon = e.weather[0]?.icon ?? ''; existing.dn = dn; }
      }
    }

    const locale   = lang === 'ar' ? 'ar-EG' : 'en-US';
    const forecast = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 3)
      .map(([date, d]) => ({
        day:       new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${date}T12:00:00`)),
        temp_high: d.high,
        temp_low:  d.low,
        condition: d.cond,
      }));

    const condition = cur.weather?.[0]?.description ?? 'Clear';
    const result: WeatherData = {
      location:    [cur.name, cur.sys?.country].filter(Boolean).join(', '),
      temperature: cur.main?.temp  ?? 0,
      condition,
      icon:        resolveIcon(cur.weather?.[0]?.icon, condition),
      pressure:    cur.main?.pressure ?? 0,
      humidity:    cur.main?.humidity ?? 0,
      wind:        Number(((cur.wind?.speed ?? 0) * 3.6).toFixed(1)),
      feels_like:  cur.main?.feels_like ?? cur.main?.temp,
      temp_min:    cur.main?.temp_min ?? cur.main?.temp,
      temp_max:    cur.main?.temp_max ?? cur.main?.temp,
      sunrise:     new Date(cur.sys?.sunrise * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      sunset:      new Date(cur.sys?.sunset * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      forecast,
    };

    _cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return staticFallback(lat, lng, language);
  }
};

// ─── Rule-based disease risk predictions ──────────────────
import type { DiseasePrediction } from '../types';

const DISEASE_RULES: Array<{
  minTemp: number; maxTemp: number;
  minHumidity: number;
  crops: string[];
  disease: string;
  risk: DiseasePrediction['riskLevel'];
  probability: number;
  reasoning: string;
  action: string;
}> = [
  { minTemp: 20, maxTemp: 30, minHumidity: 70, crops: ['Tomato','Potato','Wheat'], disease: 'Late Blight', risk: 'High', probability: 0.80, reasoning: 'Warm and humid conditions are ideal for Phytophthora infestans.', action: 'Apply copper-based fungicide preventively.' },
  { minTemp: 15, maxTemp: 25, minHumidity: 60, crops: ['Wheat','Barley','Corn'], disease: 'Powdery Mildew', risk: 'Medium', probability: 0.60, reasoning: 'Moderate temperatures with elevated humidity favour mildew spread.', action: 'Ensure adequate crop spacing and apply sulfur-based fungicide.' },
  { minTemp: 25, maxTemp: 40, minHumidity: 30, crops: ['Corn','Sorghum'], disease: 'Drought Stress', risk: 'High', probability: 0.75, reasoning: 'High temperatures and low humidity cause significant moisture loss.', action: 'Increase irrigation frequency and apply mulch to retain soil moisture.' },
  { minTemp: 10, maxTemp: 20, minHumidity: 65, crops: ['Tomato','Pepper'], disease: 'Botrytis (Grey Mould)', risk: 'Medium', probability: 0.55, reasoning: 'Cool, damp conditions encourage Botrytis cinerea growth.', action: 'Improve air circulation, remove infected plant parts.' },
  { minTemp: 28, maxTemp: 45, minHumidity: 50, crops: ['Rice','Cotton'], disease: 'Bacterial Blight', risk: 'Medium', probability: 0.50, reasoning: 'Hot temperatures with moderate humidity promote bacterial spread.', action: 'Use resistant varieties and apply copper hydroxide spray.' },
];

export const predictDiseaseRisks = (weather: WeatherData, crops: string[]): DiseasePrediction[] => {
  const temp     = weather.temperature;
  const humidity = weather.humidity;
  const today    = new Date().toISOString().split('T')[0];

  return DISEASE_RULES
    .filter(rule => {
      const tempMatch  = temp >= rule.minTemp && temp <= rule.maxTemp;
      const humidMatch = humidity >= rule.minHumidity;
      const cropMatch  = crops.some(c => rule.crops.some(rc => c.toLowerCase().includes(rc.toLowerCase()) || rc.toLowerCase().includes(c.toLowerCase())));
      return tempMatch && humidMatch && cropMatch;
    })
    .map(rule => ({
      riskLevel:       rule.risk,
      diseaseName:     rule.disease,
      affectedCrop:    crops.find(c => rule.crops.some(rc => c.toLowerCase().includes(rc.toLowerCase()))) ?? rule.crops[0],
      probability:     rule.probability,
      reasoning:       rule.reasoning,
      preventiveAction: rule.action,
      forecastDate:    today,
    }));
};
