import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { getGeoAgriAnalysis } from '../services/staticDataService';
import type { GeoAgriData } from '../types';
import { Spinner } from './Spinner';

const MapPin = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const SoilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22h20"/><path d="M12 2v20"/><path d="m2 10 10-5 10 5"/><path d="m2 16 10-5 10 5"/></svg>;
const CropIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2"/><path d="M10 22v-8"/><path d="M14 22v-8"/><path d="M12 22V2"/></svg>;
const DangerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

export const GeoAgriWidget: React.FC = () => {
    const { t, language } = useTranslation();
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [data, setData] = useState<GeoAgriData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });
                setData(getGeoAgriAnalysis(latitude, longitude, language));
                setLoading(false);
            },
            (err) => {
                console.error("Geolocation error", err);
                setError(t('dashboard.geoAgri.error'));
                setLoading(false);
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    }, [t, language]);

    if (loading) return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center">
            <div className="text-center">
                <Spinner />
                <p className="mt-4 text-gray-500">{t('dashboard.geoAgri.loading')}</p>
            </div>
        </div>
    );

    if (error || !location) return null; // Hide if failed

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                    <MapPin />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('dashboard.geoAgri.title')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.geoAgri.subtitle')}</p>
                </div>
            </div>

            {/* Map Visualization (Using OSM Embed) */}
            <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-600 image-3d-effect">
                <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.05},${location.lat - 0.05},${location.lng + 0.05},${location.lat + 0.05}&layer=mapnik&marker=${location.lat},${location.lng}`}
                    className="opacity-90 hover:opacity-100 transition-opacity"
                ></iframe>
                <div className="absolute top-2 right-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
            </div>

            {/* AI Analysis Grid */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                        <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                            <SoilIcon /> {t('dashboard.geoAgri.soilType')}
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{data.soilType}</p>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                        <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                            <CropIcon /> {t('dashboard.geoAgri.suitableCrops')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.suitableCrops.map(crop => (
                                <span key={crop} className="px-2 py-1 bg-white dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-md border border-emerald-200 dark:border-emerald-700">{crop}</span>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                        <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                            <DangerIcon /> {t('dashboard.geoAgri.diseaseRisks')}
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                            {data.commonDiseases.map(disease => (
                                <li key={disease}>{disease}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                            {t('dashboard.geoAgri.climate')}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{data.climateSummary}</p>
                    </div>
                </div>
            )}
        </div>
    );
}