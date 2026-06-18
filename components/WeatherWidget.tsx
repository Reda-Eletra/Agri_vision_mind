import React, { useEffect, useState } from 'react';
import { getWeatherData } from '../services/weatherService';
import type { WeatherData } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { Spinner } from './Spinner';

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

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, language } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = (latitude: number, longitude: number) => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      getWeatherData(latitude, longitude, language)
        .then(data => {
          if (isMounted) setWeather(data);
        })
        .catch(err => {
          console.error('Failed to fetch weather data:', err);
          if (isMounted) setError(t('weather.error'));
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => fetchWeather(position.coords.latitude, position.coords.longitude),
        () => fetchWeather(30.0444, 31.2357),
        { timeout: 10000, maximumAge: 60000 },
      );
    } else {
      fetchWeather(30.0444, 31.2357);
    }

    return () => {
      isMounted = false;
    };
  }, [t, language]);

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
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">{t('weather.title')}</div>
                  <p className="mt-2 text-sm font-medium text-white/72">{weather.location}</p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-4xl backdrop-blur-lg">
                  {weather.icon || getWeatherIcon(weather.condition)}
                </div>
              </div>
              <div className="mt-8">
                <div className="text-[3.5rem] font-extrabold leading-none tracking-[-0.08em]">{Math.round(weather.temperature)}°C</div>
                <p className="mt-3 text-base font-semibold text-white/78">{weather.condition}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
