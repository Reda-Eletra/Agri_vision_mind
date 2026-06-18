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
  MapPinned,
  Orbit,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { WeatherWidget } from './WeatherWidget';
import { computePerformanceAnalytics } from '../services/analyticsService';
import { getWeatherData, predictDiseaseRisks } from '../services/weatherService';
import { getRegionalOutbreaks } from '../services/staticDataService';
import type { DiseasePrediction, Outbreak, PerformanceAnalyticsData, WeatherData } from '../types';
import { Spinner } from './Spinner';
import { AnalyticsView } from './AnalyticsView';
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

export type DashboardView = 'overview' | 'myFarms' | 'farmDetail' | 'satellite' | 'tracking' | 'analytics' | 'finance' | 'store' | 'settings';

const navItems: Array<{ key: DashboardView; icon: React.ReactNode }> = [
  { key: 'overview', icon: <LayoutDashboard size={18} /> },
  { key: 'myFarms', icon: <MapPinned size={18} /> },
  { key: 'satellite', icon: <Orbit size={18} /> },
  { key: 'tracking', icon: <Activity size={18} /> },
  { key: 'analytics', icon: <LineChart size={18} /> },
  { key: 'finance', icon: <DollarSign size={18} /> },
  { key: 'store', icon: <ShoppingBag size={18} /> },
  { key: 'settings', icon: <Settings size={18} /> },
];

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

  useEffect(() => {
    const runPredictions = async () => {
      if (farms.length === 0) return;
      setLoadingPredictions(true);
      try {
        const weatherData: WeatherData = await getWeatherData(30.0444, 31.2357, language);
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
  }, [farms, language, activeDashboardView]);

  useEffect(() => {
    const outbreaks = getRegionalOutbreaks(30.0444, 31.2357, language);
    const critical  = outbreaks.find(o => o.riskLevel === 'High' || o.riskLevel === 'Critical');
    if (critical) setCrowdAlert(critical);
  }, [language]);

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
      case 'analytics':
        return <AnalyticsView />;
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
        <aside className="ui-surface-dark h-fit rounded-[2rem] p-5 xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
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

export default Dashboard;
