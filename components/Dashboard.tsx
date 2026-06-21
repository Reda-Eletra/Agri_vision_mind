import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarRange,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Leaf,
  LineChart,
  Map,
  MapPinned,
  Orbit,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Droplets,
  Sunrise,
  Sunset,
  Navigation,
  Info,
  Wind,
  Compass,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { WeatherWidget } from './WeatherWidget';
import { computePerformanceAnalytics } from '../services/analyticsService';
import { getWeatherData, predictDiseaseRisks } from '../services/weatherService';
import { getRegionalOutbreaks } from '../services/staticDataService';
import type { DiseasePrediction, Outbreak, PerformanceAnalyticsData, WeatherData } from '../types';
import { Spinner } from './Spinner';
import { MapRadarView } from './MapRadarView';
import { AgriStore } from './AgriStore';
import { FarmDetailView } from './FarmDetailView';
import { FinanceView } from './FinanceView';
import { MyFarmsView } from './MyFarmsView';
import { SatelliteMonitoringView } from './SatelliteMonitoringView';
import { SettingsView } from './SettingsView';
import { TrackedPlantsView } from './TrackedPlantsView';
import { EmptyPanel, IconBadge, ProgressBar, SectionHeading, StatTile, StatusChip, SurfaceCard } from './WorkspacePrimitives';

interface DashboardProps {
  setActiveView: (view: 'home' | 'doctor' | 'guide' | 'dashboard' | 'library' | 'contact' | 'community' | 'admin' | 'news') => void;
  requestedView?: DashboardView;
  onRequestedViewHandled?: () => void;
}

export type DashboardView = 'overview' | 'myFarms' | 'farmDetail' | 'satellite' | 'tracking' | 'mapRadar' | 'finance' | 'store' | 'settings';

const navItems: Array<{ key: DashboardView; icon: React.ReactNode }> = [
  { key: 'overview', icon: <LayoutDashboard size={18} /> },
  { key: 'myFarms', icon: <MapPinned size={18} /> },
  { key: 'satellite', icon: <Orbit size={18} /> },
  { key: 'tracking', icon: <Activity size={18} /> },
  { key: 'mapRadar', icon: <Map size={18} /> },
  { key: 'finance', icon: <DollarSign size={18} /> },
  { key: 'store', icon: <ShoppingBag size={18} /> },
  { key: 'settings', icon: <Settings size={18} /> },
];

export const resolveCoordsFromLocationString = (locStr: string): { lat: number; lng: number } | null => {
  if (!locStr) return null;
  const ls = locStr.toLowerCase().trim();
  if (ls.includes('cairo') || ls.includes('القاهرة')) return { lat: 30.0444, lng: 31.2357 };
  if (ls.includes('giza') || ls.includes('الجيزة')) return { lat: 30.0131, lng: 31.2089 };
  if (ls.includes('alexandria') || ls.includes('الاسكندرية') || ls.includes('الإسكندرية')) return { lat: 31.2001, lng: 29.9187 };
  if (ls.includes('ismailia') || ls.includes('الاسماعيلية') || ls.includes('الإسماعيلية')) return { lat: 30.6043, lng: 32.2723 };
  if (ls.includes('suez') || ls.includes('السويس')) return { lat: 29.9668, lng: 32.5498 };
  if (ls.includes('mansoura') || ls.includes('المنصورة')) return { lat: 31.0409, lng: 31.3785 };
  if (ls.includes('tanta') || ls.includes('طنطا')) return { lat: 30.7865, lng: 30.9998 };
  if (ls.includes('fayoum') || ls.includes('الفيوم')) return { lat: 29.3084, lng: 30.8428 };
  if (ls.includes('luxor') || ls.includes('الأقصر') || ls.includes('الاقصر')) return { lat: 25.6872, lng: 32.6396 };
  if (ls.includes('aswan') || ls.includes('أسوان') || ls.includes('اسوان')) return { lat: 24.0889, lng: 32.8998 };
  if (ls.includes('port said') || ls.includes('بورسعيد')) return { lat: 31.2653, lng: 32.3019 };
  
  const coordsRegex = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
  const match = locStr.match(coordsRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ setActiveView, requestedView, onRequestedViewHandled }) => {
  const { user, farms, trackedPlants, diagnosisHistory } = useAuth();
  const { t, language } = useTranslation();
  const [analytics, setAnalytics] = useState<PerformanceAnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [activeDashboardView, setActiveDashboardView] = useState<DashboardView>('overview');
  const [selectedFarmId,      setSelectedFarmId]      = useState<string | null>(null);
  const [crowdAlert, setCrowdAlert] = useState<Outbreak | null>(null);
  const [predictions, setPredictions] = useState<DiseasePrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const [overviewWeather, setOverviewWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'permission_denied' | 'unable_to_locate' | 'farm_weather' | 'profile_location' | 'approximate' | 'device_location'>('locating');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [weatherCoords, setWeatherCoords] = useState<{ lat: number; lng: number } | null>(null);

  const diagnosesThisMonth = diagnosisHistory.filter(h => new Date(h.date).getMonth() === new Date().getMonth()).length;
  const avgHealthScore =
    trackedPlants.length > 0
      ? Math.round(trackedPlants.reduce((acc, plant) => acc + plant.recoveryProgressPercentage, 0) / trackedPlants.length)
      : 85;
  const plantedPlants = trackedPlants.length;
  const activeFarms = farms.length;
  const cropCount = new Set(farms.map(farm => farm.crop).filter(Boolean)).size;
  const averageYield = farms.length > 0 ? Math.round(farms.reduce((acc, farm) => acc + (farm.yield || 0), 0) / farms.length) : 0;
  const needsAttention = trackedPlants.filter(plant => plant.recoveryProgressPercentage < 45).length;
  const portfolioArea = farms.reduce((acc, farm) => acc + Number(farm.area || 0), 0);
  const todayIso = new Date().toISOString().split('T')[0];
  const allSmartTasks = farms.flatMap(farm =>
    (farm.schedule || []).map(task => ({
      ...task,
      farmName: farm.name,
      cycleName: farm.crop || 'General cycle',
      source: task.weatherAdjusted ? 'Weather Update' : 'Cycle Plan',
    })),
  );
  const todaySmartTasks = allSmartTasks
    .filter(task => !task.completed && task.date <= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const pendingTaskCount = allSmartTasks.filter(task => !task.completed).length;
  const activeCycleCards = farms
    .filter(farm => farm.crop)
    .slice(0, 4)
    .map(farm => ({
      id: farm.id,
      farmName: farm.name,
      crop: farm.crop || 'Crop',
      progress: farm.harvestPrediction?.progress ?? (farm.plantingDate ? 42 : 18),
      harvest: farm.harvestPrediction?.estimatedHarvestDate || 'Not predicted',
      health: Math.max(42, Math.min(92, avgHealthScore + (farm.crop?.length || 0) % 8 - 4)),
    }));
  const weatherImpactText =
    predictions.length > 0
      ? `${predictions[0].riskLevel} disease risk for ${predictions[0].affectedCrop}: ${predictions[0].preventiveAction}`
      : 'No major weather conflict detected for today. Review irrigation before spraying.';
  const alertItems = [
    crowdAlert ? `${crowdAlert.riskLevel} regional outbreak: ${crowdAlert.diseaseName}` : null,
    needsAttention > 0 ? `${needsAttention} tracked plant(s) need treatment follow-up` : null,
    pendingTaskCount > 0 ? `${pendingTaskCount} pending smart task(s)` : null,
  ].filter(Boolean) as string[];

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(new Date()),
    [language],
  );

  useEffect(() => {
    if (activeDashboardView === 'overview' && farms.length > 0) {
      setIsAnalyticsLoading(true);
      setAnalytics(computePerformanceAnalytics(farms));
      setIsAnalyticsLoading(false);
    } else {
      setIsAnalyticsLoading(false);
    }
  }, [farms, activeDashboardView]);

  const resolveLocationAndFetchWeather = React.useCallback(async () => {
    setIsWeatherLoading(true);
    setOverviewWeather(null);
    
    // Helper to fetch weather for coordinates
    const fetchWeatherForCoords = async (lat: number, lng: number, status: typeof locationStatus): Promise<boolean> => {
      try {
        const data = await getWeatherData(lat, lng, language);
        setOverviewWeather(data);
        setLocationStatus(status);
        setWeatherCoords({ lat, lng });
        const now = new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastUpdated(now);
        return true;
      } catch (err) {
        console.error('Failed to fetch weather for coordinates:', lat, lng, err);
        return false;
      }
    };

    // Helper for selected/primary farm coordinates
    const getFarmCoords = (): { lat: number; lng: number } | null => {
      const activeFarm = farms.find(f => f.id === selectedFarmId) || farms[0];
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

    // Helper for profile location string
    const getProfileCoords = (): { lat: number; lng: number } | null => {
      if (user?.location) {
        return resolveCoordsFromLocationString(user.location);
      }
      return null;
    };

    // Tier 1: Browser Geolocation
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
        setIsWeatherLoading(false);
        return;
      }
    }

    // 2. Try Selected Farm / Primary Farm Coordinates
    const farmCoords = getFarmCoords();
    if (farmCoords) {
      const success = await fetchWeatherForCoords(farmCoords.lat, farmCoords.lng, 'farm_weather');
      if (success) {
        setIsWeatherLoading(false);
        return;
      }
    }

    // 3. Try Profile Location Coordinates
    const profileCoords = getProfileCoords();
    if (profileCoords) {
      const success = await fetchWeatherForCoords(profileCoords.lat, profileCoords.lng, 'profile_location');
      if (success) {
        setIsWeatherLoading(false);
        return;
      }
    }

    // 4. Default Fallback Location (Cairo, clearly labeled as approximate)
    await fetchWeatherForCoords(30.0444, 31.2357, 'approximate');
    setIsWeatherLoading(false);
  }, [farms, selectedFarmId, user?.location, language]);

  useEffect(() => {
    if (activeDashboardView === 'overview') {
      if (selectedFarmId) {
        const farm = farms.find(f => f.id === selectedFarmId);
        if (farm && farm.coordinates && farm.coordinates.length > 0) {
          const lats = farm.coordinates.map(c => c.lat);
          const lngs = farm.coordinates.map(c => c.lng);
          const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
          
          setIsWeatherLoading(true);
          setOverviewWeather(null);
          getWeatherData(lat, lng, language).then(data => {
            setOverviewWeather(data);
            setLocationStatus('farm_weather');
            setWeatherCoords({ lat, lng });
            const now = new Date().toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastUpdated(now);
            setIsWeatherLoading(false);
          }).catch(() => {
            resolveLocationAndFetchWeather();
          });
          return;
        }
      }
      
      resolveLocationAndFetchWeather();
    }
  }, [selectedFarmId, activeDashboardView, language, resolveLocationAndFetchWeather]);

  useEffect(() => {
    const runPredictions = async () => {
      if (farms.length === 0 || !weatherCoords) return;
      setLoadingPredictions(true);
      try {
        const weatherData: WeatherData = await getWeatherData(weatherCoords.lat, weatherCoords.lng, language);
        const uniqueCrops = Array.from(new Set(farms.map(farm => farm.crop).filter(Boolean))) as string[];
        if (uniqueCrops.length > 0) {
          setPredictions(predictDiseaseRisks(weatherData, uniqueCrops));
        }
      } catch (err) {
        console.error('Prediction failed', err);
      } finally {
        setLoadingPredictions(false);
      }
    };

    if (activeDashboardView === 'overview') {
      void runPredictions();
    }
  }, [farms, language, activeDashboardView, weatherCoords]);

  useEffect(() => {
    if (!weatherCoords) return;
    const outbreaks = getRegionalOutbreaks(weatherCoords.lat, weatherCoords.lng, language);
    const critical  = outbreaks.find(o => o.riskLevel === 'High' || o.riskLevel === 'Critical');
    if (critical) setCrowdAlert(critical);
  }, [language, weatherCoords]);

  useEffect(() => {
    if (!requestedView) return;
    setActiveDashboardView(requestedView);
    onRequestedViewHandled?.();
  }, [requestedView, onRequestedViewHandled]);

  if (!user) return null;

  const getPlantImage = (image?: string) => image?.trim() || '/images/avm-3d/hero-seedling-hand.png';
  const getLastCheckLabel = (lastCheckDate?: string) => lastCheckDate?.trim() || 'Not checked yet';

  const renderContent = () => {
    switch (activeDashboardView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <WeatherOverviewCard 
              weather={overviewWeather} 
              isLoading={isWeatherLoading} 
              locationStatus={locationStatus}
              lastUpdated={lastUpdated}
              onRefresh={resolveLocationAndFetchWeather}
            />
            <SurfaceCard className="smart-dashboard-brief p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="ui-section-eyebrow">
                    <Sparkles size={14} />
                    <span>Smart farm command center</span>
                  </div>
                  <h2 className="mt-2 text-[clamp(1.8rem,2.4vw,2.8rem)] font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">
                    Today’s operational view
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ag-text-muted)]">
                    Farms, cycles, diagnoses, weather impact, and urgent alerts are grouped here before the detailed pages.
                  </p>
                </div>
                <button onClick={() => setActiveDashboardView('myFarms')} className="ui-button ui-button-primary">
                  <MapPinned size={17} />
                  <span>Open My Farm</span>
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <StatTile title="Active Farms" value={activeFarms} icon={<MapPinned size={18} />} meta="Managed farm profiles." />
                <StatTile title="Active Cycles" value={activeCycleCards.length} tone="blue" icon={<Leaf size={18} />} meta="Crop cycles in motion." />
                <StatTile title="Pending Tasks" value={pendingTaskCount} tone="amber" icon={<ClipboardList size={18} />} meta="Tasks not completed yet." />
                <StatTile title="Plant Health Avg" value={`${avgHealthScore}%`} tone="forest" icon={<ShieldCheck size={18} />} meta="Tracked plant recovery average." />
                <StatTile title="Weather Alert" value={predictions.length || crowdAlert ? 'Watch' : 'Clear'} tone={predictions.length || crowdAlert ? 'red' : 'forest'} icon={<ShieldAlert size={18} />} meta="Weather and regional disease pressure." />
              </div>
            </SurfaceCard>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <SurfaceCard className="p-6">
                <SectionHeading
                  eyebrow="Today’s Smart Tasks"
                  title="Only what needs action now"
                  description="Generated tasks keep their source visible and stay linked to a farm and crop cycle."
                  icon={<ClipboardList size={14} />}
                />
                <div className="mt-5 space-y-3">
                  {todaySmartTasks.length > 0 ? todaySmartTasks.map(task => (
                    <div key={`${task.farmName}-${task.taskName}-${task.date}`} className="smart-dashboard-task">
                      <div>
                        <p>{task.taskName}</p>
                        <span>{task.farmName} → {task.cycleName} · {task.source}</span>
                      </div>
                      <StatusChip tone={task.date < todayIso ? 'red' : 'amber'}>{task.date < todayIso ? 'Overdue' : 'Today'}</StatusChip>
                    </div>
                  )) : (
                    <EmptyPanel title="No urgent smart tasks" description="Create a crop cycle plan to generate irrigation, fertilizing, inspection, and harvest tasks." icon={<ClipboardList size={20} />} className="!py-8" />
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <SectionHeading
                  eyebrow="Weather Impact"
                  title="Suggestions need approval"
                  description="The system can recommend changes, but it will not modify tasks without user consent."
                  icon={<ShieldAlert size={14} />}
                />
                <div className="mt-5 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4">
                  <p className="text-sm font-bold leading-6 text-[var(--ag-text)]">{weatherImpactText}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusChip tone={predictions.length ? 'amber' : 'forest'}>{predictions.length ? 'Review recommended' : 'Stable'}</StatusChip>
                    <StatusChip>Manual approval required</StatusChip>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <SurfaceCard className="p-6">
                <SectionHeading
                  eyebrow="Active Crop Cycles"
                  title="Progress and farm health"
                  description="Quick view of crops currently driving the farm schedule."
                  icon={<Leaf size={14} />}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {activeCycleCards.length > 0 ? activeCycleCards.map(cycle => (
                    <button key={cycle.id} onClick={() => { setSelectedFarmId(cycle.id); setActiveDashboardView('farmDetail'); }} className="smart-dashboard-cycle">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p>{cycle.crop}</p>
                          <span>{cycle.farmName} · Harvest: {cycle.harvest}</span>
                        </div>
                        <StatusChip tone={cycle.health < 55 ? 'red' : cycle.health < 75 ? 'amber' : 'forest'}>{cycle.health}% health</StatusChip>
                      </div>
                      <div className="mt-4">
                        <ProgressBar value={cycle.progress} />
                      </div>
                    </button>
                  )) : (
                    <EmptyPanel title="No active crop cycles" description="Open My Farm and add a cycle to start the smart farm journey." icon={<Leaf size={20} />} className="!py-8 md:col-span-2" />
                  )}
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <SectionHeading
                  eyebrow="Alerts"
                  title="Important only"
                  description="Critical signals are kept short to avoid dashboard noise."
                  icon={<ShieldAlert size={14} />}
                />
                <div className="mt-5 space-y-3">
                  {alertItems.length > 0 ? alertItems.map(alert => (
                    <div key={alert} className="smart-dashboard-alert">
                      <ShieldAlert size={15} />
                      <span>{alert}</span>
                    </div>
                  )) : (
                    <EmptyPanel title="No critical alerts" description="Everything important looks stable right now." icon={<ShieldCheck size={20} />} className="!py-8" />
                  )}
                </div>
              </SurfaceCard>
            </div>

            <SurfaceCard className="p-6">
              <SectionHeading
                eyebrow="Recent Plant Diagnoses"
                title="Latest Plant Doctor results"
                description="Recent diagnosis evidence is separated from farm planning so the dashboard stays easy to scan."
                icon={<Activity size={14} />}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {diagnosisHistory.length > 0 ? diagnosisHistory.slice(0, 4).map(entry => (
                  <div key={entry.id} className="smart-dashboard-diagnosis">
                    <img src={entry.image} alt={entry.plantName} />
                    <div>
                      <p>{entry.plantName}</p>
                      <span>{entry.diagnosis.diseaseName}</span>
                      <StatusChip tone={entry.diagnosis.isHealthy ? 'forest' : 'red'}>
                        {entry.diagnosis.healthPercentage}% health
                      </StatusChip>
                    </div>
                  </div>
                )) : (
                  <EmptyPanel title="No diagnoses yet" description="Run Plant Doctor to connect diagnosis results with treatment tasks." icon={<Activity size={20} />} className="!py-8 md:col-span-2 xl:col-span-4" />
                )}
              </div>
            </SurfaceCard>

          </div>
        );
      case 'myFarms':
        return (
          <MyFarmsView
            onFarmSelect={(farmId) => {
              setSelectedFarmId(farmId);
              setActiveDashboardView('farmDetail');
            }}
          />
        );
      case 'farmDetail': {
        const farm = farms.find(f => f.id === selectedFarmId);
        if (!farm) return <MyFarmsView onFarmSelect={(farmId) => { setSelectedFarmId(farmId); setActiveDashboardView('farmDetail'); }} />;
        return (
          <FarmDetailView
            farm={farm}
            onBack={() => setActiveDashboardView('myFarms')}
            onOpenPlantDoctor={() => setActiveView('doctor')}
          />
        );
      }
      case 'tracking':
        return <TrackedPlantsView />;
      case 'satellite':
        return <SatelliteMonitoringView />;
      case 'mapRadar':
        return <MapRadarView />;
      case 'finance':
        return <FinanceView />;
      case 'store':
        return <AgriStore />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div className="ui-reveal">
      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="ui-surface-dark h-full min-h-[calc(100vh-14rem)] rounded-[2rem] p-5">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <IconBadge tone="forest" className="!bg-white/12 !text-white !border-white/12">
                <Leaf size={18} />
              </IconBadge>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">Operations hub</p>
                <p className="mt-1 text-sm font-bold text-white">{user.name}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip className="ui-chip-dark">{activeFarms} farms</StatusChip>
              <StatusChip className="ui-chip-dark">{trackedPlants.length} monitored</StatusChip>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems.map(item => (
              <DashboardNavButton
                key={item.key}
                active={activeDashboardView === item.key}
                icon={item.icon}
                label={t(`dashboard.sidebar.${item.key}`)}
                onClick={() => setActiveDashboardView(item.key)}
                notificationCount={undefined}
              />
            ))}
          </nav>

          <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/58">Operational health</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-white">{avgHealthScore}%</p>
              </div>
              <IconBadge tone="forest" className="!bg-white/12 !text-white !border-white/12">
                <ShieldCheck size={18} />
              </IconBadge>
            </div>
            <div className="mt-4">
              <ProgressBar value={avgHealthScore} />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">
              {needsAttention > 0
                ? `${needsAttention} monitored plants are below the healthy threshold and should be reviewed.`
                : 'Current monitored assets show a healthy portfolio baseline.'}
            </p>
          </div>

          <button onClick={() => setActiveView('doctor')} className="ui-button ui-button-primary mt-5 w-full">
            <ShieldAlert size={18} />
            <span>{t('app.buttons.doctor')}</span>
          </button>
        </aside>

        <main className="min-w-0">{renderContent()}</main>
      </div>
    </div>
  );
};

const DashboardNavButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  notificationCount?: number;
  onClick: () => void;
}> = ({ icon, label, active, notificationCount, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-[1.2rem] px-4 py-3 text-left transition-all ${
      active
        ? 'bg-white/14 text-white shadow-[0_20px_40px_rgba(0,0,0,0.16)]'
        : 'text-white/72 hover:bg-white/8 hover:text-white'
    }`}
  >
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${active ? 'border-white/12 bg-white/10' : 'border-transparent bg-white/6'}`}>
      {icon}
    </span>
    <span className="flex-1 truncate text-sm font-bold">{label}</span>
    {notificationCount ? (
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white">
        {notificationCount}
      </span>
    ) : null}
  </button>
);

const ProductivityChart: React.FC<{ analytics: PerformanceAnalyticsData | null; isLoading: boolean }> = ({ analytics, isLoading }) => {
  const { t } = useTranslation();
  const labels = analytics?.yieldTrend?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const datasets = analytics?.yieldTrend?.datasets || [
    { crop: 'Tomato', data: [65, 59, 80, 81, 56, 55] },
    { crop: 'Lettuce', data: [45, 48, 40, 58, 62, 75] },
  ];

  const width = 640;
  const height = 320;
  const padding = { top: 24, right: 24, bottom: 34, left: 42 };
  const safeDatasets = datasets.map(dataset => ({
    ...dataset,
    data: dataset.data.map(value => (typeof value === 'number' && isFinite(value) ? value : 0)),
  }));
  const allValues = safeDatasets.flatMap(dataset => dataset.data);
  const maxY = allValues.length > 0 ? Math.max(...allValues) * 1.2 || 120 : 120;
  const divisor = labels.length > 1 ? labels.length - 1 : 1;

  const getX = (index: number) => padding.left + (index / divisor) * (width - padding.left - padding.right);
  const getY = (value: number) => height - padding.bottom - ((value || 0) / maxY) * (height - padding.top - padding.bottom);

  // Use CSS custom properties so chart colors adapt to light/dark mode.
  // CSS variables work in inline SVG fill/stroke/stopColor in all modern browsers.
  const palette = ['var(--ag-forest)', 'var(--ag-blue)', 'var(--ag-amber)'];

  return (
    <SurfaceCard className="ui-surface p-6">
      <SectionHeading
        eyebrow={t('dashboard.productivityChart.title')}
        title="Yield and productivity trends"
        description="A visual readout of yield momentum across your crop portfolio, designed for quick executive review."
        icon={<LineChart size={14} />}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        {safeDatasets.map((dataset, index) => (
          <StatusChip key={dataset.crop} tone={index === 0 ? 'forest' : index === 1 ? 'blue' : 'amber'}>
            <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index] || palette[0] }} />
            <span>{dataset.crop}</span>
          </StatusChip>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full h-auto">
            {Array.from({ length: 5 }).map((_, index) => {
              const y = getY((maxY / 4) * index);
              return (
                <line
                  key={index}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(98, 121, 108, 0.16)"
                  strokeDasharray="4 8"
                />
              );
            })}

            {labels.map((label, index) => (
              <text
                key={label}
                x={getX(index)}
                y={height - 10}
                textAnchor="middle"
                fill="currentColor"
                className="text-xs text-[var(--ag-text-soft)]"
              >
                {label}
              </text>
            ))}

            {safeDatasets.map((dataset, index) => {
              const color = palette[index] || palette[0];
              const pathData = dataset.data.map((point, pointIndex) => `${getX(pointIndex)},${getY(point)}`).join(' L ');
              const areaData = `M ${getX(0)},${height - padding.bottom} L ${pathData} L ${getX(labels.length - 1)},${height - padding.bottom} Z`;

              return (
                <g key={dataset.crop}>
                  <defs>
                    <linearGradient id={`dashboard-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaData} fill={`url(#dashboard-grad-${index})`} />
                  <path d={`M ${pathData}`} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  {dataset.data.map((point, pointIndex) => (
                    <circle key={`${dataset.crop}-${pointIndex}`} cx={getX(pointIndex)} cy={getY(point)} r="4.5" fill="var(--ag-ivory)" stroke={color} strokeWidth="2.5" />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </SurfaceCard>
  );
};

const getStatusText = (status: string, lang: string) => {
  const isArabic = lang === 'ar';
  switch (status) {
    case 'locating':
      return isArabic ? 'جارٍ تحديد الموقع...' : 'Locating...';
    case 'permission_denied':
      return isArabic ? 'تم رفض إذن الموقع' : 'Location Permission Denied';
    case 'unable_to_locate':
      return isArabic ? 'تعذر تحديد الموقع' : 'Unable to Locate';
    case 'farm_weather':
      return isArabic ? 'يتم عرض طقس المزرعة' : 'Showing Farm Weather';
    case 'profile_location':
      return isArabic ? 'يتم عرض طقس موقع الحساب' : 'Showing Profile Weather';
    case 'approximate':
      return isArabic ? 'يتم عرض موقع تقريبي' : 'Showing Approximate Location';
    case 'device_location':
      return isArabic ? 'يتم عرض طقس موقعك الفعلي' : 'Showing Device Weather';
    default:
      return '';
  }
};

const WeatherOverviewCard: React.FC<{
  weather: WeatherData | null;
  isLoading: boolean;
  locationStatus: 'locating' | 'permission_denied' | 'unable_to_locate' | 'farm_weather' | 'profile_location' | 'approximate' | 'device_location';
  lastUpdated: string | null;
  onRefresh: () => void;
}> = ({ weather, isLoading, locationStatus, lastUpdated, onRefresh }) => {
  const { language } = useTranslation();
  const locale = language === 'ar' ? 'ar' : 'en';

  if (isLoading) {
    return (
      <SurfaceCard className="p-6 flex items-center justify-center h-48 border border-gray-150/70 dark:border-gray-700/65">
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <span className="text-xs text-gray-400">
            {locale === 'ar' ? 'جاري تحميل بيانات الطقس والموقع...' : 'Loading weather & location data...'}
          </span>
        </div>
      </SurfaceCard>
    );
  }

  if (!weather) return null;

  // Rule-based advice
  const isHighWind = weather.wind > 20;
  const isRainy = weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('مطر') || weather.condition.toLowerCase().includes('سحاب') || weather.condition.toLowerCase().includes('cloud');
  
  let adviceAr = 'الطقس مستقر ومناسب تماماً للعمل الميداني والرش والري.';
  let adviceEn = 'Weather is stable and perfectly suitable for field work, spraying, and irrigation.';

  if (isHighWind) {
    adviceAr = 'الرياح نشطة نسبياً (أكثر من 20 كم/ساعة)، يرجى تجنب رش المبيدات لتفادي الانجراف.';
    adviceEn = 'Winds are active (above 20 km/h). Please avoid spraying pesticides to prevent drift.';
  } else if (isRainy) {
    adviceAr = 'يتوقع هطول أمطار أو غيوم كثيفة؛ ننصح بمراجعة رطوبة التربة وتعديل مواعيد الري.';
    adviceEn = 'Rain or heavy clouds forecasted. Consider checking soil moisture and delaying irrigation.';
  }

  return (
    <SurfaceCard className="relative overflow-hidden border border-gray-150/60 dark:border-gray-700/60 p-6 md:p-7 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 dark:from-emerald-950/20 dark:to-transparent">
      {/* Background radial highlight */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-brand-green/10 dark:bg-brand-green/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        
        {/* Main temperature and location */}
        <div className="flex items-center gap-4 md:gap-5">
          <div className="text-4xl md:text-5xl p-3 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 shadow-sm flex items-center justify-center shrink-0">
            {weather.icon || '☀️'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-green uppercase tracking-wider">
                <Navigation className="w-3.5 h-3.5 text-brand-green animate-pulse" />
                <span>{weather.location}</span>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md tracking-wider ${
                locationStatus === 'permission_denied' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                locationStatus === 'unable_to_locate' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                locationStatus === 'farm_weather' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                locationStatus === 'profile_location' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                locationStatus === 'approximate' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {getStatusText(locationStatus, locale)}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {Math.round(weather.temperature)}°C
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-450 ml-1">
                ({locale === 'ar' ? 'المحسوسة' : 'Feels'} {Math.round(weather.feels_like ?? weather.temperature)}°C)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 capitalize">
                {weather.condition}
              </p>
              {lastUpdated && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                  • {locale === 'ar' ? 'تحديث: ' : 'Updated: '}{lastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic AI Advice strip */}
        <div className="flex-1 lg:max-w-md bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-750 shadow-sm flex items-start gap-3">
          <div className="p-1.5 bg-brand-green/10 dark:bg-brand-green/20 rounded-xl text-brand-green mt-0.5 shrink-0">
            <Info className="w-4 h-4 text-brand-green" />
          </div>
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
              {locale === 'ar' ? 'توصيات العمل الميداني والري' : 'Field Work & Irrigation Advisory'}
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-350 leading-relaxed mt-1 font-semibold">
              {locale === 'ar' ? adviceAr : adviceEn}
            </p>
          </div>
        </div>

        {/* Detailed parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 min-w-[280px]">
          <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750/50 flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              {locale === 'ar' ? 'الرطوبة' : 'Humidity'}
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-white mt-1">
              {weather.humidity}%
            </span>
          </div>

          <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750/50 flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-455 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-500" />
              {locale === 'ar' ? 'الرياح' : 'Wind Speed'}
            </span>
            <span className="text-xs font-bold text-gray-800 dark:text-white mt-1">
              {weather.wind} km/h
            </span>
          </div>

          <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750/50 flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-455 flex items-center gap-1">
              <Sunrise className="w-3.5 h-3.5 text-amber-500" />
              {locale === 'ar' ? 'الشروق والغروب' : 'Sun Times'}
            </span>
            <span className="text-[10px] font-bold text-gray-800 dark:text-white mt-1">
              {weather.sunrise} / {weather.sunset}
            </span>
          </div>

          <div className="bg-gray-50/60 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-750/50 flex flex-col justify-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-455 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              {locale === 'ar' ? 'الضغط' : 'Pressure'}
            </span>
            <span className="text-[10px] font-extrabold text-gray-800 dark:text-white mt-1">
              {weather.pressure} hPa ({Math.round(weather.temp_min ?? 0)}°-{Math.round(weather.temp_max ?? 0)}°)
            </span>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex items-center lg:self-stretch justify-center lg:justify-end">
          <button 
            onClick={onRefresh} 
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green animate-pulse"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>{locale === 'ar' ? 'تحديث الطقس' : 'Refresh Weather'}</span>
          </button>
        </div>

      </div>
    </SurfaceCard>
  );
};

export default Dashboard;
