import React, { useEffect, useState } from 'react';
import { getWeatherData } from '../services/weatherService';
import type { WeatherData } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { Spinner } from './Spinner';
import { useAuth } from '../contexts/AuthContext';

const getWeatherIcon = (condition: string): string => {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('sun') || lowerCondition.includes('clear') || lowerCondition.includes('مشمس') || lowerCondition.includes('صحو')) return '☀️';
  if (lowerCondition.includes('cloud') || lowerCondition.includes('غائم')) return '☁️';
  if (lowerCondition.includes('rain') || lowerCondition.includes('shower') || lowerCondition.includes('مطر')) return '🌧️';
  if (lowerCondition.includes('storm') || lowerCondition.includes('عاصفة')) return '⛈️';
  if (lowerCondition.includes('snow') || lowerCondition.includes('ثلج')) return '❄️';
  if (lowerCondition.includes('mist') || lowerCondition.includes('fog') || lowerCondition.includes('ضباب')) return '🌫️';
  return '🌤️';
};

const getStatusText = (status: string, lang: string) => {
  const isArabic = lang === 'ar';
  switch (status) {
    case 'locating':
      return isArabic ? 'تحديد الموقع...' : 'Locating...';
    case 'permission_denied':
      return isArabic ? 'الرفض' : 'Denied';
    case 'unable_to_locate':
      return isArabic ? 'فشل' : 'Failed';
    case 'farm_weather':
      return isArabic ? 'المزرعة' : 'Farm';
    case 'profile_location':
      return isArabic ? 'الحساب' : 'Profile';
    case 'approximate':
      return isArabic ? 'تقريبي' : 'Approx.';
    case 'device_location':
      return isArabic ? 'الفعلي' : 'Device';
    default:
      return '';
  }
};

export const WeatherWidget: React.FC = () => {
  const { user, farms } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'permission_denied' | 'unable_to_locate' | 'farm_weather' | 'profile_location' | 'approximate' | 'device_location'>('locating');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { t, language } = useTranslation();
  const locale = language === 'ar' ? 'ar' : 'en';

  const resolveLocationAndFetchWeather = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setWeather(null);

    const fetchWeatherForCoords = async (lat: number, lng: number, status: typeof locationStatus): Promise<boolean> => {
      try {
        const data = await getWeatherData(lat, lng, language);
        setWeather(data);
        setLocationStatus(status);
        const now = new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastUpdated(now);
        return true;
      } catch (err) {
        console.error('Failed to fetch weather for coordinates:', lat, lng, err);
        return false;
      }
    };

    const getFarmCoords = (): { lat: number; lng: number } | null => {
      const activeFarm = farms[0];
      if (activeFarm && activeFarm.coordinates && activeFarm.coordinates.length > 0) {
        const lats = activeFarm.coordinates.map(c => c.lat);
        const lngs = activeFarm.coordinates.map(c => c.lng);
        return {
          lat: lats.reduce((a, b) => a + b, 0) / lats.length,
          lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
        };
      }
      return null;
    };

    const getProfileCoords = (): { lat: number; lng: number } | null => {
      if (user?.location) {
        const ls = user.location.toLowerCase().trim();
        if (ls.includes('cairo') || ls.includes('القاهرة')) return { lat: 30.0444, lng: 31.2357 };
        if (ls.includes('giza') || ls.includes('الجيزة')) return { lat: 30.0131, lng: 31.2089 };
        if (ls.includes('alexandria') || ls.includes('الاسكندرية') || ls.includes('الإسكندرية')) return { lat: 31.2001, lng: 29.9187 };
        
        const coordsRegex = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
        const match = user.location.match(coordsRegex);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
          }
        }
      }
      return null;
    };

    const tryGeolocation = (): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            console.warn('Geolocation error:', err);
            if (err.code === err.PERMISSION_DENIED) {
              setLocationStatus('permission_denied');
            } else {
              setLocationStatus('unable_to_locate');
            }
            resolve(null);
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      });
    };

    setLocationStatus('locating');

    // 1. Try Geolocation
    const geoCoords = await tryGeolocation();
    if (geoCoords) {
      const success = await fetchWeatherForCoords(geoCoords.lat, geoCoords.lng, 'device_location');
      if (success) {
        setIsLoading(false);
        return;
      }
    }

    // 2. Try Farm Coordinates
    const farmCoords = getFarmCoords();
    if (farmCoords) {
      const success = await fetchWeatherForCoords(farmCoords.lat, farmCoords.lng, 'farm_weather');
      if (success) {
        setIsLoading(false);
        return;
      }
    }

    // 3. Try Profile location coordinates
    const profileCoords = getProfileCoords();
    if (profileCoords) {
      const success = await fetchWeatherForCoords(profileCoords.lat, profileCoords.lng, 'profile_location');
      if (success) {
        setIsLoading(false);
        return;
      }
    }

    // 4. Default Fallback Cairo (approximate)
    await fetchWeatherForCoords(30.0444, 31.2357, 'approximate');
    setIsLoading(false);
  }, [farms, user?.location, language]);

  useEffect(() => {
    resolveLocationAndFetchWeather();
  }, [resolveLocationAndFetchWeather]);

  return (
    <div className="ui-card ui-surface-dark ui-soft-grid relative h-full overflow-hidden rounded-[1.75rem] p-6">
      <div className="relative z-10 h-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner small />
          </div>
        ) : error || !weather ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-white/78">{error || t('weather.error')}</div>
        ) : (
          <div className="flex h-full flex-col justify-between text-white">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">{t('weather.title')}</div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-semibold uppercase tracking-wider">
                      {getStatusText(locationStatus, locale)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/72">{weather.location}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-4xl backdrop-blur-lg">
                  {weather.icon || getWeatherIcon(weather.condition)}
                </div>
              </div>
              
              <div className="mt-8 flex justify-between items-end">
                <div>
                  <div className="text-[3.5rem] font-extrabold leading-none tracking-[-0.08em]">{Math.round(weather.temperature)}°C</div>
                  <p className="mt-3 text-base font-semibold text-white/78">{weather.condition}</p>
                  {lastUpdated && (
                    <p className="text-[10px] text-white/50 mt-1 font-medium">
                      {locale === 'ar' ? 'تحديث: ' : 'Updated: '}{lastUpdated}
                    </p>
                  )}
                </div>
                
                {/* Refresh weather button */}
                <button 
                  onClick={resolveLocationAndFetchWeather}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white cursor-pointer transition-colors shadow-sm hover:scale-105 active:scale-95 duration-200"
                  title={locale === 'ar' ? 'تحديث الموقع والطقس' : 'Refresh Weather'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-slow"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: t('weather.pressure'), value: `${weather.pressure} mb` },
                { label: t('weather.humidity'), value: `${weather.humidity}%` },
                { label: t('weather.wind'), value: `${weather.wind} km/h` },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/8 p-3 text-center backdrop-blur-lg">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/56">{item.label}</p>
                  <p className="mt-2 text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
