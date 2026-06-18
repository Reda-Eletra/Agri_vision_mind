
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { computePerformanceAnalytics } from '../services/analyticsService';
import type { PerformanceAnalyticsData } from '../types';
import { Spinner } from './Spinner';

const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const TrendingDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>;
const SoilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22h20"/><path d="M12 2v20"/><path d="m2 10 10-5 10 5"/><path d="m2 16 10-5 10 5"/></svg>;
const FarmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L6 5v5l6 3 6-3V5Z"/><path d="M6 5v14"/><path d="M18 5v14"/></svg>;

export const AnalyticsView: React.FC = () => {
    const { farms } = useAuth();
    const { t, language } = useTranslation();
    const [data, setData] = useState<PerformanceAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setData(computePerformanceAnalytics(farms));
        setLoading(false);
    }, [farms]);

    if (farms.length === 0) return (
        <div className="flex flex-col items-center justify-center h-96 rounded-2xl border border-dashed border-[var(--ag-border)]" style={{ background: 'var(--ag-surface-strong)' }}>
            <p className="text-[var(--ag-text-muted)] text-lg mb-2">{t('dashboard.performanceAnalytics.noData')}</p>
            <p className="text-sm text-[var(--ag-text-soft)]">Add farms to see insights.</p>
        </div>
    );

    if (loading) return <div className="h-96 flex items-center justify-center"><Spinner /></div>;
    if (!data) return <div className="text-center text-[var(--ag-red)] p-10">{t('dashboard.performanceAnalytics.error')}</div>;

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-[var(--ag-text)] mb-6">{t('dashboard.performanceAnalytics.title')}</h2>
                
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard 
                        label={t('dashboard.performanceAnalytics.kpi.averageYield')} 
                        value={data.kpis.averageYield} 
                        subValue="Across all crops" 
                        icon={<ScaleIcon />}
                        variant="green-orange"
                    />
                    <KPICard 
                        label={t('dashboard.performanceAnalytics.kpi.bestCrop')} 
                        value={data.kpis.bestPerformingCrop} 
                        subValue="Highest yield" 
                        icon={<TrendingUpIcon />} 
                        variant="green"
                    />
                    <KPICard 
                        label={t('dashboard.performanceAnalytics.kpi.bestSoil')} 
                        value={data.kpis.mostProductiveSoil} 
                        subValue="Optimal conditions" 
                        icon={<SoilIcon />}
                        variant="green-orange"
                    />
                    <KPICard 
                        label={t('dashboard.performanceAnalytics.kpi.totalFarms')} 
                        value={data.kpis.totalFarms.toString()} 
                        subValue="Active fields" 
                        icon={<FarmIcon />}
                        variant="green"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Crop Performance Table */}
                <div className="rounded-2xl shadow-sm border border-[var(--ag-border)] overflow-hidden" style={{ background: 'var(--ag-surface-strong)' }}>
                    <div className="p-6 border-b border-[var(--ag-border)]">
                        <h3 className="font-bold text-lg text-[var(--ag-text)]">{t('dashboard.performanceAnalytics.cropPerformanceTitle')}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[var(--ag-text-muted)] text-xs uppercase font-semibold" style={{ background: 'var(--ag-surface-muted)' }}>
                                <tr>
                                    <th className="px-6 py-4">{t('dashboard.performanceAnalytics.tableHeaders.crop')}</th>
                                    <th className="px-6 py-4">{t('dashboard.performanceAnalytics.tableHeaders.avgYield')}</th>
                                    <th className="px-6 py-4">{t('dashboard.performanceAnalytics.tableHeaders.totalArea')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ag-border)] text-sm">
                                {data.cropPerformance.map((crop, idx) => (
                                    <tr key={idx} className="transition-colors hover:bg-[var(--ag-surface-muted)]">
                                        <td className="px-6 py-4 font-medium text-[var(--ag-text)]">{crop.crop}</td>
                                        <td className="px-6 py-4 text-[var(--ag-text-muted)]">{crop.averageYield} {crop.yieldUnit}</td>
                                        <td className="px-6 py-4 text-[var(--ag-text-muted)]">{crop.totalArea} {crop.areaUnit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="rounded-2xl shadow-sm border border-[var(--ag-border)] p-6" style={{ background: 'var(--ag-surface-strong)' }}>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 rounded-lg text-[var(--ag-blue)]" style={{ background: 'var(--ag-blue-soft)' }}>
                            <LightbulbIcon />
                        </div>
                        <h3 className="font-bold text-lg text-[var(--ag-text)]">{t('dashboard.performanceAnalytics.insightsTitle')}</h3>
                    </div>

                    <div className="space-y-4">
                        {data.insights.map((insight, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border-l-4 ${
                                insight.type === 'positive' ? 'border-[var(--ag-forest)]' :
                                insight.type === 'negative' ? 'border-[var(--ag-red)]' :
                                'border-[var(--ag-blue)]'
                            }`} style={{ background: 'var(--ag-surface-muted)' }}>
                                <p className="text-sm text-[var(--ag-text-muted)]">{insight.text}</p>
                            </div>
                        ))}
                    </div>

                    {/* Prediction */}
                    <div className="mt-6 pt-6 border-t border-[var(--ag-border)]">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--ag-text-muted)] mb-2">{t('dashboard.performanceAnalytics.yieldPrediction')}</h4>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-brand-green">{data.prediction.predictedYield}</p>
                            <span className="ui-chip text-xs">Next Season</span>
                        </div>
                        <p className="text-xs text-[var(--ag-text-soft)] mt-2">{data.prediction.reasoning}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard: React.FC<{ label: string; value: string; subValue?: string; icon?: React.ReactNode; variant: 'green' | 'green-orange' }> = ({ label, value, subValue, icon, variant }) => {
    const gradientStyle = variant === 'green'
        ? { background: 'linear-gradient(135deg, var(--ag-forest), var(--ag-forest-deep, #1a5c36))' }
        : { background: 'linear-gradient(135deg, var(--ag-forest), var(--ag-amber))' };

    return (
        <div className="p-6 rounded-2xl shadow-lg text-white transform transition-transform hover:-translate-y-1" style={gradientStyle}>
            {icon && (
                <div className="w-10 h-10 mb-4 p-2 rounded-xl flex items-center justify-center shadow-inner text-white" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    {icon}
                </div>
            )}
            <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>{label}</p>

            {subValue && (
                <div className="mt-4 inline-block px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
                    {subValue}
                </div>
            )}
        </div>
    );
};
