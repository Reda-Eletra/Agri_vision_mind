import React, { useMemo, useState } from 'react';
import { Activity, CalendarDays, Leaf, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { TrackedPlantModal } from './TrackedPlantModal';
import type { TrackedPlant } from '../types';
import { EmptyPanel, ProgressBar, SectionHeading, StatTile, StatusChip, SurfaceCard } from './WorkspacePrimitives';

export const TrackedPlantsView: React.FC = () => {
  const { trackedPlants, updateTrackedPlant, deleteTrackedPlant } = useAuth();
  const { t } = useTranslation();
  const [selectedPlant, setSelectedPlant] = useState<TrackedPlant | null>(null);

  const averageRecovery = useMemo(
    () =>
      trackedPlants.length > 0
        ? Math.round(trackedPlants.reduce((acc, plant) => acc + plant.recoveryProgressPercentage, 0) / trackedPlants.length)
        : 0,
    [trackedPlants],
  );
  const criticalCount = useMemo(() => trackedPlants.filter(plant => plant.recoveryProgressPercentage < 45).length, [trackedPlants]);
  const improvingCount = useMemo(() => trackedPlants.filter(plant => plant.recoveryProgressPercentage >= 80).length, [trackedPlants]);

  const handleSave = (updatedPlant: TrackedPlant) => {
    updateTrackedPlant(updatedPlant);
    setSelectedPlant(updatedPlant);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('modals.trackedPlant.deleteTracking') + '?')) {
      deleteTrackedPlant(id);
      setSelectedPlant(null);
    }
  };

  const getPlantImage = (image?: string) => image?.trim() || '/images/avm-3d/hero-seedling-hand.png';
  const getLastCheckLabel = (lastCheckDate?: string) => lastCheckDate?.trim() || 'Not checked yet';

  return (
    <div className="ui-reveal space-y-6">
      <SectionHeading
        eyebrow={t('dashboard.tracking.title')}
        title="Live plant monitoring workspace"
        description={t('dashboard.tracking.subtitle')}
      />

      <div className="ui-kpi-grid">
        <StatTile title="Monitored plants" value={trackedPlants.length} icon={<Leaf size={18} />} meta="Active plants under observation or treatment." />
        <StatTile title="Average recovery" value={`${averageRecovery}%`} tone="blue" icon={<Activity size={18} />} meta="Mean recovery score across all tracked plants." />
        <StatTile title="Critical attention" value={criticalCount} tone="red" icon={<ShieldAlert size={18} />} meta="Plants below the healthy threshold and needing intervention." />
        <StatTile title="Strong improvement" value={improvingCount} tone="forest" icon={<CalendarDays size={18} />} meta="Plants approaching healthy recovery status." />
      </div>

      {trackedPlants.length === 0 ? (
        <EmptyPanel
          title={t('dashboard.tracking.noPlants')}
          description={t('dashboard.tracking.noPlantsSub')}
          icon={<Activity size={22} />}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {trackedPlants.map(plant => (
            <SurfaceCard
              key={plant.id}
              className="ui-card-hover cursor-pointer overflow-hidden"
            >
              <button onClick={() => setSelectedPlant(plant)} className="w-full text-left">
                <div className="relative h-52 overflow-hidden">
                  <img src={getPlantImage(plant.image)} alt={plant.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/12 to-transparent" />
                  <div className="absolute right-4 top-4">
                    <StatusChip tone={plant.recoveryProgressPercentage >= 80 ? 'forest' : plant.recoveryProgressPercentage >= 45 ? 'amber' : 'red'}>
                      {plant.recoveryProgressPercentage}% health
                    </StatusChip>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xl font-extrabold tracking-[-0.04em] text-white">{plant.name}</p>
                    <p className="mt-1 text-sm text-white/72">{plant.diagnosis?.diseaseName}</p>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="rounded-2xl bg-[var(--ag-surface-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Recovery progress</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--ag-text-muted)]">Continuous treatment and field observation score.</p>
                      </div>
                      <span className="text-lg font-extrabold text-[var(--ag-text)]">{plant.recoveryProgressPercentage}%</span>
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={plant.recoveryProgressPercentage} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--ag-border)] p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Growth stage</p>
                      <p className="mt-2 text-sm font-bold text-[var(--ag-text)]">{plant.diagnosis?.growthStage}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--ag-border)] p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Last check</p>
                      <p className="mt-2 text-sm font-bold text-[var(--ag-text)]">{getLastCheckLabel(plant.lastCheckDate)}</p>
                    </div>
                  </div>
                </div>
              </button>
            </SurfaceCard>
          ))}
        </div>
      )}

      {selectedPlant ? (
        <TrackedPlantModal plant={selectedPlant} onClose={() => setSelectedPlant(null)} onSave={handleSave} onDelete={handleDelete} />
      ) : null}
    </div>
  );
};
