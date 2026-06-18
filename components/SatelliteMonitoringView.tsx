import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import type { Farm, SatelliteNdviInsight } from '../types';
import {
    ensureFarmSatellitePolygon,
    getFarmSatelliteNdviInsight,
    getNdviHealthColor,
} from '../services/satelliteService';
import { Spinner } from './Spinner';

const SatelliteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 10 4 4" />
        <path d="m8 10-4 4" />
        <path d="m14 6 6 6" />
        <path d="m20 6-6 6" />
        <path d="M8.5 16.5 6 19l-1-1 2.5-2.5" />
        <path d="M17.5 7.5 20 5l1 1-2.5 2.5" />
        <path d="m12 12 3 3" />
        <path d="m12 12-3 3" />
    </svg>
);

export const SatelliteMonitoringView: React.FC = () => {
    const { farms, updateFarm } = useAuth();
    const { t } = useTranslation();
    const [selectedFarmId, setSelectedFarmId] = useState('');
    const [insight, setInsight] = useState<SatelliteNdviInsight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);
    const [ndviImageFailed, setNdviImageFailed] = useState(false);
    const [trueColorImageFailed, setTrueColorImageFailed] = useState(false);

    const farmsWithBoundaries = useMemo(
        () => farms.filter(farm => (farm.coordinates?.length || 0) >= 3),
        [farms]
    );

    useEffect(() => {
        if (farmsWithBoundaries.length === 0) {
            setSelectedFarmId('');
            return;
        }

        const selectedStillExists = farmsWithBoundaries.some(farm => farm.id === selectedFarmId);
        if (!selectedFarmId || !selectedStillExists) {
            setSelectedFarmId(farmsWithBoundaries[0].id);
        }
    }, [farmsWithBoundaries, selectedFarmId]);

    useEffect(() => {
        let isMounted = true;
        const selectedFarm = farmsWithBoundaries.find(farm => farm.id === selectedFarmId);

        if (!selectedFarm) {
            setInsight(null);
            setError(null);
            return () => {
                isMounted = false;
            };
        }

        const loadSatelliteData = async (farm: Farm) => {
            setIsLoading(true);
            setError(null);
            setNdviImageFailed(false);
            setTrueColorImageFailed(false);
            try {
                const polygonId = await ensureFarmSatellitePolygon(farm);
                let persistedFarm = farm;
                if (farm.satellitePolygonId !== polygonId) {
                    persistedFarm = await updateFarm({ ...farm, satellitePolygonId: polygonId });
                }
                if (!isMounted) return;
                const result = await getFarmSatelliteNdviInsight(persistedFarm);
                if (!isMounted) return;
                setInsight(result);
            } catch (err) {
                console.error('Satellite NDVI fetch failed:', err);
                if (isMounted) {
                    const message = err instanceof Error ? err.message : t('dashboard.satellite.error');
                    setError(message);
                    setInsight(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSatelliteData(selectedFarm);
        return () => {
            isMounted = false;
        };
    }, [selectedFarmId, farmsWithBoundaries, refreshToken, t, updateFarm]);

    if (farmsWithBoundaries.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('dashboard.satellite.noFarmsTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400">{t('dashboard.satellite.noFarmsSub')}</p>
            </div>
        );
    }

    const statusKey = insight?.status ? insight.status.toLowerCase() : 'moderate';
    const statusColor = insight ? getNdviHealthColor(insight.ndvi.mean) : '#facc15';

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('dashboard.satellite.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.satellite.subtitle')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedFarmId}
                        onChange={event => setSelectedFarmId(event.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white"
                    >
                        {farmsWithBoundaries.map(farm => (
                            <option key={farm.id} value={farm.id}>{farm.crop || farm.name} ({farm.area} {farm.areaUnit})</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setRefreshToken(prev => prev + 1)}
                        className="px-4 py-2 rounded-lg bg-brand-green text-white font-semibold hover:bg-brand-green-dark transition-colors"
                    >
                        {t('dashboard.satellite.refresh')}
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 flex flex-col items-center justify-center gap-3">
                    <Spinner />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.satellite.loading')}</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 p-4 text-sm">
                    {error}
                </div>
            )}

            {insight && !isLoading && !error && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.satellite.ndviScore')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{insight.ndvi.mean.toFixed(3)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('dashboard.satellite.range')}: {insight.ndvi.min.toFixed(2)} - {insight.ndvi.max.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('dashboard.satellite.healthStatus')}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: statusColor }}>
                                <SatelliteIcon />
                                {t(`dashboard.satellite.status.${statusKey}`)}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.satellite.capturedAt')}</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{new Date(insight.capturedAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.satellite.source')}: {insight.source}</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.satellite.cloudCoverage')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{insight.cloudCoverage.toFixed(1)}%</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('dashboard.satellite.pixelCount')}: {insight.ndvi.pixelCount.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white">{t('dashboard.satellite.ndviHeatmap')}</h3>
                            </div>
                            <div className="h-72 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                {ndviImageFailed ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4 text-center">{t('dashboard.satellite.imageError')}</p>
                                ) : (
                                    <img
                                        src={insight.ndviImageUrl}
                                        alt={t('dashboard.satellite.ndviHeatmap')}
                                        className="w-full h-full object-cover"
                                        onError={() => setNdviImageFailed(true)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white">{t('dashboard.satellite.trueColor')}</h3>
                            </div>
                            <div className="h-72 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                {trueColorImageFailed ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4 text-center">{t('dashboard.satellite.imageError')}</p>
                                ) : (
                                    <img
                                        src={insight.trueColorImageUrl}
                                        alt={t('dashboard.satellite.trueColor')}
                                        className="w-full h-full object-cover"
                                        onError={() => setTrueColorImageFailed(true)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">{t('dashboard.satellite.legend')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                            <LegendPill color="#dc2626" label={t('dashboard.satellite.status.critical')} range="< 0.15" />
                            <LegendPill color="#f97316" label={t('dashboard.satellite.status.poor')} range="0.15 - 0.29" />
                            <LegendPill color="#facc15" label={t('dashboard.satellite.status.moderate')} range="0.30 - 0.44" />
                            <LegendPill color="#22c55e" label={t('dashboard.satellite.status.good')} range="0.45 - 0.64" />
                            <LegendPill color="#15803d" label={t('dashboard.satellite.status.excellent')} range=">= 0.65" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const LegendPill: React.FC<{ color: string; label: string; range: string }> = ({ color, label, range }) => (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700/40">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{range}</p>
    </div>
);
