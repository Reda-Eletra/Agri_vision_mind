import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { 
  Wind, 
  CloudRain, 
  Thermometer, 
  Cloud, 
  Compass, 
  Gauge, 
  AlertTriangle, 
  Expand, 
  Shrink,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { SurfaceCard, SectionHeading, StatusChip } from './WorkspacePrimitives';

interface LayerItem {
  id: 'wind' | 'rain' | 'temp' | 'clouds' | 'pressure' | 'humidity';
  icon: React.ReactNode;
  colorClass: string;
}

export const MapRadarView: React.FC = () => {
  const { t, language } = useTranslation();
  const [activeLayer, setActiveLayer] = useState<'wind' | 'rain' | 'temp' | 'clouds' | 'pressure' | 'humidity'>('rain');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const locale = language === 'ar' ? 'ar' : 'en';

  const layers: LayerItem[] = [
    { id: 'rain', icon: <CloudRain className="w-5 h-5" />, colorClass: 'text-blue-500' },
    { id: 'wind', icon: <Wind className="w-5 h-5" />, colorClass: 'text-teal-500' },
    { id: 'temp', icon: <Thermometer className="w-5 h-5" />, colorClass: 'text-amber-500' },
    { id: 'clouds', icon: <Cloud className="w-5 h-5" />, colorClass: 'text-sky-400' },
    { id: 'pressure', icon: <Compass className="w-5 h-5" />, colorClass: 'text-indigo-400' },
    { id: 'humidity', icon: <Gauge className="w-5 h-5" />, colorClass: 'text-emerald-500' },
  ];

  // Egypt / MENA coordinates as default center: Lat 26.8206, Lon 30.8025
  const defaultLat = 26.8206;
  const defaultLon = 30.8025;
  const zoomLevel = 5;

  const getEmbedUrl = () => {
    // Windy official embed subdomain to bypass X-Frame-Options SAMEORIGIN
    return `https://embed.windy.com/embed2.html?lat=${defaultLat}&lon=${defaultLon}&zoom=${zoomLevel}&level=surface&overlay=${activeLayer}&menu=true&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&metricWind=default&metricTemp=default`;
  };

  const activeLayerData = layers.find(l => l.id === activeLayer);

  const renderMapContainer = () => (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-inner flex flex-col">
      {/* Map Header with controls */}
      <div className="px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 backdrop-blur flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {locale === 'ar' ? 'البث المباشر للطقس والأقمار الصناعية' : 'Live Satellite & Radar Stream'}
          </span>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? (
            <>
              <Shrink className="w-4 h-4" />
              <span>{locale === 'ar' ? 'خروج من ملء الشاشة' : 'Exit Fullscreen'}</span>
            </>
          ) : (
            <>
              <Expand className="w-4 h-4" />
              <span>{locale === 'ar' ? 'ملء الشاشة' : 'Fullscreen Mode'}</span>
            </>
          )}
        </button>
      </div>

      {/* Actual Iframe */}
      <div className="flex-1 w-full relative min-h-[500px]">
        <iframe
          src={getEmbedUrl()}
          className="absolute inset-0 w-full h-full border-0 z-0"
          title="Interactive Weather Map & Radar"
          allowFullScreen
        />
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[99999] bg-gray-950 p-4 md:p-6 flex flex-col space-y-4 animate-reveal">
        <div className="flex justify-between items-center bg-gray-900/90 border border-gray-800 rounded-2xl p-4 backdrop-blur shadow-lg">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-green" />
              {t('dashboard.mapRadar.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.mapRadar.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick layer pills in fullscreen */}
            <div className="hidden lg:flex items-center gap-1.5 bg-gray-950/60 p-1 rounded-xl border border-gray-800">
              {layers.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeLayer === layer.id
                      ? 'bg-brand-green text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {layer.icon}
                  <span>{t(`dashboard.mapRadar.${layer.id}`)}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 border border-gray-700 transition-colors"
            >
              <Shrink className="w-4 h-4" />
              <span>{locale === 'ar' ? 'إغلاق ملء الشاشة' : 'Close'}</span>
            </button>
          </div>
        </div>
        
        {/* Fullscreen Map View */}
        <div className="flex-1 w-full relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
          <iframe
            src={getEmbedUrl()}
            className="absolute inset-0 w-full h-full border-0"
            title="Fullscreen Interactive Map"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-brand-green" />
            {t('dashboard.mapRadar.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('dashboard.mapRadar.subtitle')}
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left Side: Controllers & Utility Descriptions */}
        <div className="space-y-6">
          {/* Layer Selector Card */}
          <SurfaceCard className="p-5 flex flex-col space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              {t('dashboard.mapRadar.layersTitle')}
            </h3>
            
            <div className="grid grid-cols-1 gap-2">
              {layers.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all hover:-translate-y-0.5 duration-200 ${
                    activeLayer === layer.id
                      ? 'border-brand-green/30 bg-brand-green/5 dark:bg-brand-green/10 text-brand-green font-bold'
                      : 'border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 bg-transparent text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activeLayer === layer.id ? 'text-brand-green' : layer.colorClass}>
                      {layer.icon}
                    </span>
                    <span className="text-sm">
                      {t(`dashboard.mapRadar.${layer.id}`)}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${activeLayer === layer.id ? 'bg-brand-green scale-110' : 'bg-transparent border border-gray-300 dark:border-gray-600'}`} />
                </button>
              ))}
            </div>
          </SurfaceCard>

          {/* Active Layer Agronomy Explanation Card */}
          <SurfaceCard className="p-5 border-l-4 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                  {t(`dashboard.mapRadar.${activeLayer}`)}
                  <StatusChip tone="forest" className="text-[10px] px-2 py-0.5">Agronomy</StatusChip>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                  {t(`dashboard.mapRadar.${activeLayer}Desc`)}
                </p>
              </div>
            </div>
          </SurfaceCard>

          {/* Tips and Warnings */}
          <SurfaceCard className="p-5 space-y-3 bg-gray-50/50 dark:bg-gray-800/40">
            <div className="flex gap-3 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{t('dashboard.mapRadar.zoomEarthDisclaimer')}</p>
            </div>
            
            <div className="border-t border-gray-100 dark:border-gray-700/60 pt-3 flex gap-3 text-xs text-gray-500 dark:text-gray-450 leading-relaxed">
              <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <p>{t('dashboard.mapRadar.zoomInHint')}</p>
            </div>
          </SurfaceCard>
        </div>

        {/* Right Side: Map Canvas Frame */}
        <div className="h-[600px] xl:h-[650px] w-full">
          {renderMapContainer()}
        </div>
      </div>
    </div>
  );
};
