import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Map, MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { FarmModal } from './FarmModal';
import { FarmMap } from './FarmMap';
import type { Farm } from '../types';
import { ensureFarmSatellitePolygon, getFarmSatelliteNdviInsight } from '../services/satelliteService';
import { EmptyPanel, ProgressBar, SectionHeading, StatTile, StatusChip, SurfaceCard } from './WorkspacePrimitives';

interface MyFarmsViewProps {
  onFarmSelect?: (farmId: string) => void;
}

export const MyFarmsView: React.FC<MyFarmsViewProps> = ({ onFarmSelect }) => {
  const { farms, addFarm, updateFarm, deleteFarm } = useAuth();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [ndviByFarmId, setNdviByFarmId] = useState<Record<string, number>>({});
  const [isNdviLoading, setIsNdviLoading] = useState(false);

  const totalArea = useMemo(() => farms.reduce((acc, farm) => acc + Number(farm.area || 0), 0), [farms]);
  const diversity = useMemo(() => new Set(farms.map(farm => farm.crop).filter(Boolean)).size, [farms]);
  const mappedFarms = useMemo(() => farms.filter(farm => (farm.coordinates?.length || 0) >= 3).length, [farms]);
  const getFarmImage = (farm: Farm) => farm.imageUrl || '/images/avm-3d/home-greenhouse-ai.png';
  const getFarmHealth = (farm: Farm, ndviPercent: number | null) => {
    if (typeof ndviPercent === 'number') return ndviPercent;
    if (farm.harvestPrediction?.progress) return Math.max(45, Math.min(92, 100 - Math.round(farm.harvestPrediction.progress / 3)));
    return 78;
  };

  const handleAddClick = () => {
    setEditingFarm(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (farm: Farm) => {
    setEditingFarm(farm);
    setIsModalOpen(true);
  };

  const handleSave = async (farmData: Farm) => {
    if (editingFarm) {
      await updateFarm(farmData);
    } else {
      const { id, ...newFarm } = farmData;
      await addFarm(newFarm);
    }
    setIsModalOpen(false);
    setEditingFarm(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this farm?')) {
      deleteFarm(id);
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const farmsWithBoundaries = farms.filter(farm => (farm.coordinates?.length || 0) >= 3);

    if (viewMode !== 'map' || farmsWithBoundaries.length === 0) {
      setNdviByFarmId({});
      setIsNdviLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadNdvi = async () => {
      setIsNdviLoading(true);
      const entries = await Promise.all(
        farmsWithBoundaries.map(async farm => {
          try {
            const polygonId = await ensureFarmSatellitePolygon(farm);
            let persistedFarm = farm;
            if (farm.satellitePolygonId !== polygonId) {
              persistedFarm = await updateFarm({ ...farm, satellitePolygonId: polygonId });
            }
            if (!isMounted) return null;
            const insight = await getFarmSatelliteNdviInsight(persistedFarm);
            return [farm.id, insight.ndvi.mean] as const;
          } catch (err) {
            console.error(`NDVI fetch failed for farm ${farm.id}`, err);
            return null;
          }
        }),
      );

      if (!isMounted) return;
      const liveNdvi: Record<string, number> = {};
      entries.forEach(entry => {
        if (entry) {
          liveNdvi[entry[0]] = entry[1];
        }
      });
      setNdviByFarmId(liveNdvi);
      setIsNdviLoading(false);
    };

    void loadNdvi();
    return () => {
      isMounted = false;
    };
  }, [viewMode, farms, updateFarm]);

  return (
    <div className="ui-reveal space-y-6">
      <SectionHeading
        eyebrow={t('dashboard.myFarms')}
        title="Managed agricultural assets"
        description="A portfolio-style view of your farms with area, crop, operational metadata, and map coverage in one place."
        actions={
          <>
            <div className="ui-pill-toggle">
              <button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>
                <MapPinned size={16} className="mr-1 inline-flex" />
                List
              </button>
              <button type="button" className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}>
                <Map size={16} className="mr-1 inline-flex" />
                Map
              </button>
            </div>
            <button onClick={handleAddClick} className="ui-button ui-button-primary">
              <Plus size={18} />
              <span>{t('modals.farm.addTitle')}</span>
            </button>
          </>
        }
      />

      <div className="ui-kpi-grid">
        <StatTile title={t('modals.farm.area')} value={totalArea || 0} meta="Total land area recorded in the current portfolio." icon={<MapPinned size={18} />} />
        <StatTile title="Crop diversity" value={diversity || 0} tone="blue" meta="Distinct crop types tracked across all farm assets." icon={<CalendarDays size={18} />} />
        <StatTile title="Mapped boundaries" value={mappedFarms || 0} tone="amber" meta="Farms with polygon data ready for NDVI map overlays." icon={<Map size={18} />} />
      </div>

      {farms.length === 0 ? (
        <EmptyPanel
          title={t('dashboard.noFarms')}
          description={t('dashboard.noFarmsSub')}
          icon={<Plus size={22} />}
          action={
            <button onClick={handleAddClick} className="ui-button ui-button-primary">
              {t('dashboard.addFarm')}
            </button>
          }
        />
      ) : viewMode === 'list' ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {farms.map(farm => {
            const ndviValue = ndviByFarmId[farm.id];
            const ndviPercent = typeof ndviValue === 'number' ? Math.round(ndviValue * 100) : null;
            const healthScore = getFarmHealth(farm, ndviPercent);
            const pendingTasks = farm.schedule?.filter(task => !task.completed).length ?? 0;
            const overdueTasks = farm.schedule?.filter(task => !task.completed && new Date(task.date).getTime() < Date.now()).length ?? 0;
            const activeCycles = farm.crop ? 1 : 0;
            const trackedCount = Math.max(0, (farm.schedule?.length || 0) - pendingTasks + activeCycles);

            return (
              <SurfaceCard key={farm.id} className="ui-card-hover overflow-hidden">
                <div className="relative h-52 overflow-hidden">
                  <img src={getFarmImage(farm)} alt={farm.crop || farm.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                    <StatusChip className="ui-chip-dark">{farm.season || 'No active cycle'}</StatusChip>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(farm)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/12 text-white backdrop-blur-lg transition-colors hover:bg-white/18"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(farm.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/12 text-white backdrop-blur-lg transition-colors hover:bg-red-500/80"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-2xl font-extrabold tracking-[-0.04em] text-white">{farm.name || farm.crop}</p>
                    <p className="mt-1 text-sm text-white/72">{farm.location || 'Location not set'} - {farm.soilType} soil profile</p>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[var(--ag-surface-muted)] p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">{t('modals.farm.area')}</p>
                      <p className="mt-2 text-lg font-extrabold text-[var(--ag-text)]">
                        {farm.area} {t(`modals.farm.${farm.areaUnit}s`)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--ag-surface-muted)] p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">{t('modals.farm.plantingDate')}</p>
                      <p className="mt-2 text-sm font-bold text-[var(--ag-text)]">{farm.plantingDate || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="smart-farm-mini-stat">
                      <span>Active cycles</span>
                      <strong>{activeCycles}</strong>
                    </div>
                    <div className="smart-farm-mini-stat">
                      <span>Tracked plants</span>
                      <strong>{trackedCount}</strong>
                    </div>
                    <div className="smart-farm-mini-stat">
                      <span>Open tasks</span>
                      <strong>{pendingTasks}{overdueTasks ? `/${overdueTasks} late` : ''}</strong>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--ag-border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Farm health</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--ag-text-muted)]">
                          {typeof ndviPercent === 'number' ? `NDVI score ${ndviPercent}%` : 'Estimated from current cycle and task activity.'}
                        </p>
                      </div>
                      <StatusChip tone={healthScore < 45 ? 'red' : healthScore < 70 ? 'amber' : 'forest'}>
                        {healthScore}%
                      </StatusChip>
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={healthScore} />
                    </div>
                  </div>

                  <div className="smart-farm-activity">
                    <div>
                      <span>Weather</span>
                      <strong>28C, humidity watch</strong>
                    </div>
                    <div>
                      <span>Latest activity</span>
                      <strong>{farm.schedule?.[0]?.taskName || farm.crop || 'Ready for first cycle'}</strong>
                    </div>
                  </div>

                  {farm.schedule && farm.schedule.length > 0 ? (
                    <div className="rounded-2xl bg-[var(--ag-surface-muted)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
                        <CalendarDays size={14} />
                        <span>{t('dashboard.smartSchedule')}</span>
                      </div>
                      <div className="space-y-3">
                        {farm.schedule.slice(0, 2).map((task, index) => (
                          <div key={`${task.taskName}-${index}`} className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-white/5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-[var(--ag-text)]">{task.taskName}</p>
                                <p className="mt-1 text-xs text-[var(--ag-text-muted)]">{task.date}</p>
                              </div>
                              <StatusChip tone="forest">{task.taskType}</StatusChip>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {onFarmSelect && (
                    <button
                      onClick={() => onFarmSelect(farm.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-green/25 bg-brand-green/5 py-3 text-sm font-bold text-brand-green-dark transition-colors hover:bg-brand-green/10 dark:text-brand-green-light"
                    >
                      <span>View Farm Details</span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      ) : (
        <SurfaceCard className="overflow-hidden p-0">
          <div className="relative h-[620px]">
            <FarmMap mode="view" farms={farms} ndviByFarmId={ndviByFarmId} />
            <div className="absolute left-4 top-4 z-[500] max-w-sm rounded-[1.4rem] border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] p-4 shadow-[0_20px_40px_rgba(18,34,26,0.14)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">Interactive map intelligence</p>
              <h3 className="mt-2 text-lg font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">Portfolio NDVI overview</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ag-text-muted)]">
                Review farm polygons and live vegetation health signals to identify underperforming zones before field inspections.
              </p>
              {isNdviLoading ? <p className="mt-3 text-sm font-semibold text-brand-green-dark">Updating NDVI from satellite API...</p> : null}
            </div>
          </div>
        </SurfaceCard>
      )}

      {isModalOpen ? (
        <FarmModal
          mode={editingFarm ? 'edit' : 'add'}
          farm={editingFarm}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
};
