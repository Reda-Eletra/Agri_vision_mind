import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Droplets,
  Leaf,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  ShieldCheck,
  Shovel,
  Sparkles,
  Sprout,
  Trash2,
  Zap,
} from "lucide-react";
import { cycleApi, cyclePlantApi, cycleTaskApi } from "../services/apiService";
import { generateSmartSchedule } from "../services/staticDataService";
import type {
  CyclePlant,
  CycleTask,
  DiagnosisRecord,
  Farm,
  FarmCycle,
} from "../types";
import {
  EmptyPanel,
  ProgressBar,
  SectionHeading,
  StatTile,
  StatusChip,
  SurfaceCard,
} from "./WorkspacePrimitives";

// ─── helpers ─────────────────────────────────────────────────
const taskStatusColor = (s: boolean) => {
  // completed = true (done), completed = false (pending)
  return s ? "forest" : "amber";
};

const recoveryColor = (r: number) => {
  if (r >= 80) return "forest";
  if (r >= 50) return "amber";
  return "red";
};

const confidencePct = (c: number) => `${Math.round(c * 100)}%`;

const isArabicUi = () =>
  typeof document !== "undefined" &&
  document.documentElement.lang.toLowerCase().startsWith("ar");

const formatScanAlert = (alert: string) => {
  if (!isArabicUi()) return alert;

  const diseaseMatch = alert.match(/detected:\s*(.*?)\s*\(/i);
  const percentMatch = alert.match(/\((\d+)%\)/);
  if (diseaseMatch || percentMatch) {
    return `تم اكتشاف مشكلة في النبات بثقة عالية: ${diseaseMatch?.[1] || "غير محددة"} (${percentMatch?.[1] || "0"}%). يفضل اتخاذ إجراء سريع.`;
  }

  return alert;
};

// ─── sub-types for modal forms ────────────────────────────────
type CycleForm = {
  crop: string;
  season: string;
  planting_date: string;
  harvest_date: string;
};
type TaskForm = { task_name: string; task_type: string; date: string };
type PlantForm = {
  user_defined_name: string;
  species_name: string;
  image_url: string;
};

type CropRequirementPlan = {
  crop: string;
  image: string;
  durationDays: number;
  idealPlantingWindow: string;
  soil: string[];
  ph: string;
  watering: string;
  irrigationCadence: string;
  fertilizer: string;
  sun: string;
  temperature: string;
  growthStages: string[];
  diseases: string[];
  warnings: string[];
  productHints: string[];
};

const EMPTY_CYCLE: CycleForm = {
  crop: "",
  season: "",
  planting_date: "",
  harvest_date: "",
};
const EMPTY_TASK: TaskForm = { task_name: "", task_type: "watering", date: "" };
const EMPTY_PLANT: PlantForm = {
  user_defined_name: "",
  species_name: "",
  image_url: "",
};

const cropPlans: Record<string, CropRequirementPlan> = {
  tomato: {
    crop: "Tomato",
    image: "/images/avm-3d/disease-leaf-early-blight.png",
    durationDays: 90,
    idealPlantingWindow: "February-April or August-September in warm climates",
    soil: ["loam", "sandy loam", "alluvial", "well drained"],
    ph: "6.0 - 6.8",
    watering: "Keep soil evenly moist; avoid wetting leaves.",
    irrigationCadence: "Drip irrigation every 2-3 days, adjusted by heat and rainfall.",
    fertilizer: "Balanced starter NPK, then potassium/calcium during flowering.",
    sun: "6-8 hours direct sun",
    temperature: "18-30C",
    growthStages: ["Transplanting", "Vegetative growth", "Flowering", "Fruit set", "Harvest"],
    diseases: ["Early blight", "Late blight", "Powdery mildew", "Aphids"],
    warnings: ["High humidity increases fungal risk.", "Calcium deficiency can cause blossom-end rot."],
    productHints: ["Copper fungicide", "Calcium-potassium foliar feed", "Drip irrigation kit"],
  },
  wheat: {
    crop: "Wheat",
    image: "/images/avm-3d/news-wheat.png",
    durationDays: 125,
    idealPlantingWindow: "November-December for winter wheat",
    soil: ["clay", "silty loam", "loam", "alluvial"],
    ph: "6.0 - 7.5",
    watering: "Moderate irrigation at tillering, booting, and grain filling.",
    irrigationCadence: "Deep irrigation every 12-18 days depending on soil moisture.",
    fertilizer: "Nitrogen split applications with phosphorus at planting.",
    sun: "Full sun",
    temperature: "12-25C",
    growthStages: ["Germination", "Tillering", "Stem elongation", "Heading", "Grain filling", "Harvest"],
    diseases: ["Yellow rust", "Powdery mildew", "Leaf blight"],
    warnings: ["High humidity around flag leaf stage requires rust scouting."],
    productHints: ["Seed drill", "Nitrogen fertilizer", "Rust fungicide"],
  },
  corn: {
    crop: "Corn",
    image: "/images/avm-3d/news-smart-farming.png",
    durationDays: 115,
    idealPlantingWindow: "March-May when soil is warm",
    soil: ["loam", "sandy loam", "well drained", "alluvial"],
    ph: "5.8 - 7.0",
    watering: "Higher water demand during tasseling and silking.",
    irrigationCadence: "Irrigate every 5-7 days during heat, less in cooler periods.",
    fertilizer: "Phosphorus at planting and nitrogen side-dress around V4-V6.",
    sun: "Full sun",
    temperature: "20-32C",
    growthStages: ["Emergence", "V4", "V8", "Tasseling", "Silking", "Grain fill", "Harvest"],
    diseases: ["Corn borer", "Leaf blight", "Rust"],
    warnings: ["Drought during silking can sharply reduce yield."],
    productHints: ["Nitrogen fertilizer", "Moisture sensor", "Borer trap"],
  },
  potato: {
    crop: "Potato",
    image: "/images/avm-3d/disease-leaf-powdery.png",
    durationDays: 105,
    idealPlantingWindow: "January-March or September-October",
    soil: ["sandy loam", "loam", "well drained"],
    ph: "5.2 - 6.5",
    watering: "Consistent moisture without waterlogging.",
    irrigationCadence: "Light irrigation every 4-6 days after emergence.",
    fertilizer: "Potassium-rich program with controlled nitrogen.",
    sun: "Full sun to light shade",
    temperature: "15-24C",
    growthStages: ["Sprouting", "Vegetative", "Tuber initiation", "Bulking", "Maturity"],
    diseases: ["Late blight", "Root rot", "Aphids"],
    warnings: ["Poor drainage raises tuber rot risk."],
    productHints: ["Potassium fertilizer", "Copper fungicide", "Soil conditioner"],
  },
  cucumber: {
    crop: "Cucumber",
    image: "/images/avm-3d/disease-leaf-aphids.png",
    durationDays: 65,
    idealPlantingWindow: "February-April or protected greenhouse cycles",
    soil: ["loam", "sandy loam", "well drained"],
    ph: "6.0 - 7.0",
    watering: "Frequent light irrigation; never allow dry stress.",
    irrigationCadence: "Daily or every other day in warm greenhouse conditions.",
    fertilizer: "Balanced fertigation with potassium during fruiting.",
    sun: "6+ hours sun",
    temperature: "20-30C",
    growthStages: ["Germination", "Vining", "Flowering", "Fruit set", "Harvest"],
    diseases: ["Powdery mildew", "Downy mildew", "Aphids", "Whitefly"],
    warnings: ["Leaf wetness encourages mildew."],
    productHints: ["Neem oil", "Sticky traps", "Drip fertigation kit"],
  },
};

const fallbackCropPlan: CropRequirementPlan = {
  crop: "General Crop",
  image: "/images/avm-3d/hero-seedling-hand.png",
  durationDays: 90,
  idealPlantingWindow: "Use your local agricultural calendar for the best window.",
  soil: ["loam", "well drained", "alluvial"],
  ph: "6.0 - 7.2",
  watering: "Keep soil moisture stable and avoid waterlogging.",
  irrigationCadence: "Inspect soil moisture twice weekly and adjust by weather.",
  fertilizer: "Start with soil test, then apply balanced NPK in split doses.",
  sun: "Full sun or crop-specific partial shade",
  temperature: "18-30C",
  growthStages: ["Planting", "Establishment", "Vegetative growth", "Flowering", "Harvest"],
  diseases: ["Leaf blight", "Root rot", "Aphids"],
  warnings: ["Confirm soil suitability before committing to large-scale planting."],
  productHints: ["Soil test kit", "Balanced NPK", "Plant Doctor scan"],
};

const addDaysIso = (date: string, days: number) => {
  const base = date ? new Date(date) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
};

const findCropPlan = (crop: string): CropRequirementPlan => {
  const normalized = crop.trim().toLowerCase();
  const key =
    Object.keys(cropPlans).find((candidate) =>
      normalized.includes(candidate)
    ) || "";
  return key ? cropPlans[key] : { ...fallbackCropPlan, crop: crop || fallbackCropPlan.crop };
};

const getTaskIcon = (type: CycleTask["taskType"]) => {
  if (type === "watering") return <Droplets size={16} />;
  if (type === "fertilizing") return <Sprout size={16} />;
  if (type === "spraying") return <ShieldCheck size={16} />;
  if (type === "harvesting") return <Shovel size={16} />;
  return <CalendarDays size={16} />;
};

const normalizeTaskType = (type: string): CycleTask["taskType"] => {
  const lower = type.toLowerCase();
  if (lower.includes("water")) return "watering";
  if (lower.includes("fertiliz")) return "fertilizing";
  if (lower.includes("harvest")) return "harvesting";
  if (lower.includes("spray") || lower.includes("fungicide")) return "spraying";
  return "other";
};

const getTreatmentProducts = (diagnosis?: DiagnosisRecord) => {
  const disease = `${diagnosis?.diseaseName || ""} ${diagnosis?.recommendations || ""}`.toLowerCase();
  if (!diagnosis || diagnosis.diseaseName === "No Image Provided") {
    return [
      { name: "Clear plant photo guide", type: "Diagnosis", query: "how to take clear plant disease photo" },
      { name: "Plant disease inspection kit", type: "Tool", query: "plant disease inspection kit agriculture" },
    ];
  }
  if (disease.includes("blight") || disease.includes("fung") || disease.includes("mildew") || disease.includes("rust")) {
    return [
      { name: "Copper fungicide", type: "Fungicide", query: "copper fungicide agriculture" },
      { name: "Mancozeb fungicide", type: "Fungicide", query: "mancozeb fungicide agriculture" },
      { name: "Neem oil spray", type: "Organic", query: "neem oil plant disease spray" },
    ];
  }
  if (disease.includes("aphid") || disease.includes("whitefly") || disease.includes("mite") || disease.includes("insect") || disease.includes("pest")) {
    return [
      { name: "Insecticidal soap", type: "Pesticide", query: "insecticidal soap agriculture aphids" },
      { name: "Neem oil insect control", type: "Organic", query: "neem oil aphids whitefly agriculture" },
      { name: "Yellow sticky traps", type: "Monitoring", query: "yellow sticky traps agriculture" },
    ];
  }
  if (disease.includes("deficiency") || disease.includes("nutrient") || disease.includes("calcium") || disease.includes("potassium")) {
    return [
      { name: "Calcium foliar fertilizer", type: "Fertilizer", query: "calcium foliar fertilizer agriculture" },
      { name: "Balanced NPK fertilizer", type: "Fertilizer", query: "balanced npk fertilizer agriculture" },
      { name: "Soil pH test kit", type: "Soil test", query: "soil ph test kit agriculture" },
    ];
  }
  return [
    { name: "Broad-spectrum plant treatment", type: "Treatment", query: `${diagnosis.diseaseName} plant treatment product` },
    { name: "Soil pH test kit", type: "Soil test", query: "soil ph test kit agriculture" },
    { name: "Plant Doctor follow-up scan", type: "Follow-up", query: "plant disease treatment agriculture" },
  ];
};

// ─── mini modal ───────────────────────────────────────────────
const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-3xl overflow-hidden rounded-[1.6rem] border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] shadow-[0_40px_80px_rgba(12,22,16,0.22)]">
      <div className="flex items-center justify-between border-b border-[var(--ag-border)] px-6 py-4">
        <h3 className="text-base font-extrabold tracking-[-0.03em] text-[var(--ag-text)]">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-[var(--ag-text-muted)] hover:bg-black/5 dark:hover:bg-white/5"
        >
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ─── field helper ─────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
      {label}
    </label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (
  props
) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-3 py-2.5 text-sm text-[var(--ag-text)] outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 ${
      props.className ?? ""
    }`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (
  props
) => (
  <select
    {...props}
    className="w-full rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] px-3 py-2.5 text-sm text-[var(--ag-text)] outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30"
  />
);

// ─── MAIN COMPONENT ───────────────────────────────────────────
interface FarmDetailViewProps {
  farm: Farm;
  onBack: () => void;
  onOpenPlantDoctor?: () => void;
}

export const FarmDetailView: React.FC<FarmDetailViewProps> = ({
  farm,
  onBack,
  onOpenPlantDoctor,
}) => {
  // ── state ──────────────────────────────────────────────────
  const [cycles, setCycles] = useState<FarmCycle[]>([]);
  const [tasks, setTasks] = useState<CycleTask[]>([]);
  const [plants, setPlants] = useState<CyclePlant[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<FarmCycle | null>(null);
  const [scanResults, setScanResults] = useState<
    Record<string, DiagnosisRecord>
  >({});
  const [scanAlerts, setScanAlerts] = useState<Record<string, string | null>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [treatmentTaskStatus, setTreatmentTaskStatus] = useState<Record<string, "idle" | "saving" | "created">>({});
  const [weatherSuggestion, setWeatherSuggestion] = useState<"visible" | "ignored" | "accepted">("visible");
  const [actionError, setActionError] = useState<string | null>(null);

  // ── modals ──────────────────────────────────────────────────
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [cycleForm, setCycleForm] = useState<CycleForm>(EMPTY_CYCLE);
  const [taskForm, setTaskForm] = useState<TaskForm>(EMPTY_TASK);
  const [plantForm, setPlantForm] = useState<PlantForm>(EMPTY_PLANT);
  const [saving, setSaving] = useState(false);

  // ── load cycles ────────────────────────────────────────────
  const loadCycles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cycleApi.getAll(farm.id);
      setCycles(data);
      // auto-select first active cycle
      const active = data.find((c) => c.status === "active") ?? data[0] ?? null;
      setSelectedCycle(active);
    } catch (err) {
      console.error("Failed to load cycles", err);
    } finally {
      setLoading(false);
    }
  }, [farm.id]);

  // ── load tasks + plants for selected cycle ──────────────────
  const loadCycleData = useCallback(async (cycle: FarmCycle) => {
    setCycleLoading(true);
    try {
      const [t, p] = await Promise.allSettled([
        cycleTaskApi.getAll(cycle.id),
        cyclePlantApi.getAll(cycle.id),
      ]);
      if (t.status === "fulfilled") setTasks(t.value);
      if (p.status === "fulfilled") setPlants(p.value);
    } catch (err) {
      console.error("Failed to load cycle data", err);
    } finally {
      setCycleLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCycles();
  }, [loadCycles]);
  useEffect(() => {
    if (selectedCycle) void loadCycleData(selectedCycle);
    else {
      setTasks([]);
      setPlants([]);
    }
  }, [selectedCycle, loadCycleData]);

  // ── stats ──────────────────────────────────────────────────
  const completedTasks = tasks.filter((t) => t.completed).length;
  const avgRecovery =
    plants.length > 0
      ? Math.round(
          plants.reduce((a, p) => a + p.recoveryProgressPercent, 0) /
            plants.length
        )
      : 0;
  const activeCyclePlan = selectedCycle ? findCropPlan(selectedCycle.crop) : null;
  const cyclePlanPreview = useMemo(() => {
    if (!cycleForm.crop.trim() || !cycleForm.planting_date) return null;
    const plan = findCropPlan(cycleForm.crop);
    const farmSoil = farm.soilType.toLowerCase();
    const soilMatches = plan.soil.some((soil) => {
      const normalizedSoil = soil.toLowerCase();
      return farmSoil.includes(normalizedSoil) || normalizedSoil.includes(farmSoil);
    });

    return {
      plan,
      harvestDate: cycleForm.harvest_date || addDaysIso(cycleForm.planting_date, plan.durationDays),
      soilMatches,
      tasks: generateSmartSchedule(plan.crop, cycleForm.planting_date, "en").slice(0, 9),
    };
  }, [cycleForm.crop, cycleForm.harvest_date, cycleForm.planting_date, farm.soilType]);

  // ── add cycle ──────────────────────────────────────────────
  const handleAddCycle = async (approvePlan = false) => {
    if (
      !cycleForm.crop.trim() ||
      !cycleForm.season.trim() ||
      !cycleForm.planting_date
    )
      return;
    setSaving(true);
    try {
      const plan = findCropPlan(cycleForm.crop);
      const harvestDate = cycleForm.harvest_date || addDaysIso(cycleForm.planting_date, plan.durationDays);
      const created = await cycleApi.create(farm.id, {
        crop: cycleForm.crop,
        season: cycleForm.season,
        planting_date: cycleForm.planting_date,
        harvest_date: harvestDate,
      });
      let createdTasks: CycleTask[] = [];
      if (approvePlan) {
        const generatedTasks = generateSmartSchedule(plan.crop, cycleForm.planting_date, "en").map((task) => ({
          task_name: `${task.taskName} - Source: Cycle Plan`,
          task_type: normalizeTaskType(task.taskType),
          date: task.date,
        }));
        createdTasks = await Promise.all(
          [
            ...generatedTasks,
            {
              task_name: "Review weather impact before irrigation/spraying - Source: Weather Update",
              task_type: "other" as const,
              date: addDaysIso(cycleForm.planting_date, 1),
            },
          ].map((task) => cycleTaskApi.create(created.id, task))
        );
      }
      setCycles((prev) => [created, ...prev]);
      setSelectedCycle(created);
      if (approvePlan) setTasks(createdTasks);
      setShowCycleModal(false);
      setCycleForm(EMPTY_CYCLE);
    } catch (err) {
      console.error("Create cycle failed", err);
    } finally {
      setSaving(false);
    }
  };

  // ── add task ───────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!selectedCycle || !taskForm.task_name.trim() || !taskForm.date) return;
    setSaving(true);
    try {
      const created = await cycleTaskApi.create(selectedCycle.id, {
        task_name: taskForm.task_name,
        task_type: taskForm.task_type,
        date: taskForm.date,
      });
      setTasks((prev) => [...prev, created]);
      setShowTaskModal(false);
      setTaskForm(EMPTY_TASK);
    } catch (err) {
      console.error("Create task failed", err);
    } finally {
      setSaving(false);
    }
  };

  // ── complete task ──────────────────────────────────────────
  const handleCompleteTask = async (taskId: string) => {
    try {
      const updated = await cycleTaskApi.complete(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Complete task failed", err);
    }
  };

  // ── delete task ────────────────────────────────────────────
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await cycleTaskApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Delete task failed", err);
    }
  };

  // ── add plant ──────────────────────────────────────────────
  const handleDeleteCycle = async (cycleId: string) => {
    if (!confirm("Delete this cycle and all tracked plants, tasks, and scans inside it?")) return;
    setActionError(null);
    try {
      await cycleApi.delete(cycleId);
      setCycles((prev) => {
        const next = prev.filter((cycle) => cycle.id !== cycleId);
        if (selectedCycle?.id === cycleId) {
          setSelectedCycle(next.find((cycle) => cycle.status === "active") ?? next[0] ?? null);
          setTasks([]);
          setPlants([]);
          setScanResults({});
          setScanAlerts({});
          setTreatmentTaskStatus({});
        }
        return next;
      });
    } catch (err) {
      console.error("Delete cycle failed", err);
      setActionError(
        err instanceof Error
          ? err.message
          : "Cycle could not be deleted. Please try again."
      );
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    if (!confirm("Delete this tracked plant and its scan history?")) return;
    setActionError(null);
    try {
      await cyclePlantApi.delete(plantId);
      setPlants((prev) => prev.filter((plant) => plant.id !== plantId));
      setScanResults((prev) => {
        const next = { ...prev };
        delete next[plantId];
        return next;
      });
      setScanAlerts((prev) => {
        const next = { ...prev };
        delete next[plantId];
        return next;
      });
      setTreatmentTaskStatus((prev) => {
        const next = { ...prev };
        delete next[plantId];
        return next;
      });
    } catch (err) {
      console.error("Delete plant failed", err);
      setActionError(
        err instanceof Error
          ? err.message
          : "Tracked plant could not be deleted. Please try again."
      );
    }
  };

  const handleAddPlant = async () => {
    if (
      !selectedCycle ||
      !plantForm.user_defined_name.trim() ||
      !plantForm.species_name.trim()
    )
      return;
    setSaving(true);
    try {
      const created = await cyclePlantApi.create(selectedCycle.id, {
        user_defined_name: plantForm.user_defined_name,
        species_name: plantForm.species_name,
        image_url: plantForm.image_url || undefined,
      });
      setPlants((prev) => [created, ...prev]);
      setShowPlantModal(false);
      setPlantForm(EMPTY_PLANT);
    } catch (err) {
      console.error("Create plant failed", err);
    } finally {
      setSaving(false);
    }
  };

  // ── AI scan ────────────────────────────────────────────────
  const handleCreateTreatmentTasks = async (plant: CyclePlant, diagnosis?: DiagnosisRecord) => {
    if (!selectedCycle || !diagnosis) return;
    setTreatmentTaskStatus((prev) => ({ ...prev, [plant.id]: "saving" }));
    try {
      const today = new Date();
      const due = (offset: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
      };
      const severityOffset = diagnosis.severity === "high" || diagnosis.severity === "critical" ? 0 : 1;
      const planTasks = [
        {
          task_name: `Apply recommended treatment for ${plant.userDefinedName} - Source: Plant Doctor Diagnosis`,
          task_type: "spraying",
          date: due(severityOffset),
        },
        {
          task_name: `Remove infected leaves and clean tools for ${plant.userDefinedName} - Source: Plant Doctor Diagnosis`,
          task_type: "other",
          date: due(1),
        },
        {
          task_name: `Upload follow-up image for ${plant.userDefinedName} after treatment - Source: Plant Doctor Diagnosis`,
          task_type: "other",
          date: due(2),
        },
        {
          task_name: `Adjust irrigation and inspect recovery for ${plant.userDefinedName} - Source: Plant Doctor Diagnosis`,
          task_type: "watering",
          date: due(3),
        },
      ];
      const created = await Promise.all(planTasks.map((task) => cycleTaskApi.create(selectedCycle.id, task)));
      setTasks((prev) => [...prev, ...created]);
      setTreatmentTaskStatus((prev) => ({ ...prev, [plant.id]: "created" }));
    } catch (err) {
      console.error("Create treatment tasks failed", err);
      setTreatmentTaskStatus((prev) => ({ ...prev, [plant.id]: "idle" }));
    }
  };

  const handleAcceptWeatherSuggestion = async () => {
    if (!selectedCycle) return;
    setSaving(true);
    try {
      const created = await cycleTaskApi.create(selectedCycle.id, {
        task_name: "Humidity/rain risk inspection before irrigation or spraying - Source: Weather Update",
        task_type: "other",
        date: new Date().toISOString().split("T")[0],
      });
      setTasks((prev) => [created, ...prev]);
      setWeatherSuggestion("accepted");
    } catch (err) {
      console.error("Create weather task failed", err);
    } finally {
      setSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="ui-reveal space-y-6">
      {/* ── Header ── */}
      <SectionHeading
        eyebrow="Farm Details"
        title={selectedCycle?.crop || "Active Cycle"}
        description={`${farm.soilType} soil · ${farm.area} ${farm.areaUnit}`}
        actions={
          <button onClick={onBack} className="ui-button ui-button-secondary">
            <ArrowLeft size={16} />
            <span>Back to Farms</span>
          </button>
        }
      />

      {actionError ? (
        <div className="rounded-2xl border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-[var(--ag-red)]">
          {actionError}
        </div>
      ) : null}

      {/* ── Farm Info Banner ── */}
      <SurfaceCard className="overflow-hidden p-0">
        <div className="relative h-48">
          <img
            src={farm.imageUrl || "/images/farm-default.svg"}
            alt={selectedCycle?.crop || "Farm"}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold tracking-[-0.04em] text-white">
                {selectedCycle?.crop || "Farm"}
              </p>
              <p className="mt-1 text-sm text-white/72">
                {farm.soilType} · {farm.area} {farm.areaUnit}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusChip className="ui-chip-dark">
                {selectedCycle?.season}
              </StatusChip>
              {selectedCycle?.plantingDate ? (
                <StatusChip className="ui-chip-dark">
                  {selectedCycle.plantingDate}
                </StatusChip>
              ) : null}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <SurfaceCard className="smart-farm-journey">
          <div className="smart-farm-journey-line" aria-hidden="true" />
          {[
            ["01", "Farm Details", farm.name || "Farm profile"],
            ["02", "Crop Cycles", `${cycles.length} active/recorded cycles`],
            ["03", "Tracked Plants", `${plants.length} plants linked to selected cycle`],
            ["04", "Smart Tasks", `${tasks.filter((task) => !task.completed).length} pending tasks`],
          ].map((step) => (
            <div key={step[0]} className="smart-farm-journey-step">
              <span>{step[0]}</span>
              <strong>{step[1]}</strong>
              <small>{step[2]}</small>
            </div>
          ))}
        </SurfaceCard>

        <SurfaceCard className="smart-weather-consent">
          <div className="flex items-start gap-3">
            <div className="smart-weather-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[var(--ag-text)]">Weather-aware suggestions</p>
              <p className="mt-1 text-sm leading-6 text-[var(--ag-text-muted)]">
                The system will suggest irrigation or spraying changes when rain, heat, wind, or humidity affects tasks. It will ask before changing anything.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ── Stats Bar ── */}
      <div className="ui-kpi-grid">
        <StatTile
          title="Plants"
          value={plants.length}
          icon={<Leaf size={18} />}
          meta="Tracked in selected cycle"
        />
        <StatTile
          title="Tasks"
          value={tasks.length}
          tone="blue"
          icon={<CalendarDays size={18} />}
          meta="Total tasks in cycle"
        />
        <StatTile
          title="Completed"
          value={completedTasks}
          tone="forest"
          icon={<CheckCircle2 size={18} />}
          meta="Tasks marked done"
        />
        <StatTile
          title="Avg Recovery"
          value={`${avgRecovery}%`}
          tone="amber"
          icon={<Activity size={18} />}
          meta="Average plant recovery progress"
        />
      </div>

      {/* ── Cycles ── */}
      <SurfaceCard>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
              Growing Cycles
            </p>
            <p className="mt-1 text-base font-bold text-[var(--ag-text)]">
              {cycles.length} cycle{cycles.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button
            onClick={() => setShowCycleModal(true)}
            className="ui-button ui-button-primary"
          >
            <Plus size={16} />
            <span>New Cycle</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-brand-green" />
          </div>
        ) : cycles.length === 0 ? (
          <EmptyPanel
            title="No cycles yet"
            description="Create a growing cycle to start tracking tasks and plants."
            icon={<CircleDot size={20} />}
            action={
              <button
                onClick={() => setShowCycleModal(true)}
                className="ui-button ui-button-secondary"
              >
                <Plus size={16} />
                <span>New Cycle</span>
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cycles.map((cycle) => {
              const plan = findCropPlan(cycle.crop);
              const start = new Date(cycle.plantingDate).getTime();
              const end = cycle.harvestDate ? new Date(cycle.harvestDate).getTime() : start + plan.durationDays * 86400000;
              const now = Date.now();
              const progress = Math.round(((now - start) / Math.max(1, end - start)) * 100);
              const boundedProgress = Math.max(0, Math.min(100, progress));
              const isSelected = selectedCycle?.id === cycle.id;

              return (
                <article
                  key={cycle.id}
                  onClick={() => setSelectedCycle(cycle)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedCycle(cycle);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`smart-cycle-card ${isSelected ? "is-selected" : ""}`}
                >
                  <img src={plan.image} alt={cycle.crop} />
                  <div className="smart-cycle-card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-extrabold text-[var(--ag-text)]">{cycle.crop}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--ag-text-muted)]">{cycle.season}</p>
                      </div>
                      <StatusChip
                        tone={cycle.status === "active" ? "forest" : cycle.status === "completed" ? "blue" : "amber"}
                      >
                        {cycle.status}
                      </StatusChip>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteCycle(cycle.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-300/45 bg-red-500/10 px-3 py-1.5 text-xs font-extrabold text-[var(--ag-red)] transition hover:bg-red-500/15"
                        title="Delete cycle"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs text-[var(--ag-text-muted)]">
                      <span>Planting: <strong>{cycle.plantingDate || "Not set"}</strong></span>
                      <span>Harvest: <strong>{cycle.harvestDate || addDaysIso(cycle.plantingDate, plan.durationDays)}</strong></span>
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-[11px] font-bold text-[var(--ag-text-soft)]">
                        <span>{plan.growthStages[Math.min(plan.growthStages.length - 1, Math.floor((boundedProgress / 100) * plan.growthStages.length))]}</span>
                        <span>{boundedProgress}%</span>
                      </div>
                      <ProgressBar value={boundedProgress} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      {selectedCycle && activeCyclePlan ? (
        <SurfaceCard className="smart-cycle-plan-card">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <img src={activeCyclePlan.image} alt={activeCyclePlan.crop} className="h-full min-h-48 w-full rounded-2xl object-cover" />
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Crop requirement analysis</p>
                  <h3 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">{activeCyclePlan.crop} plan</h3>
                </div>
                <StatusChip tone={activeCyclePlan.soil.some((soil) => farm.soilType.toLowerCase().includes(soil.toLowerCase())) ? "forest" : "amber"}>
                  {activeCyclePlan.soil.some((soil) => farm.soilType.toLowerCase().includes(soil.toLowerCase())) ? "Soil suitable" : "Review soil"}
                </StatusChip>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="smart-plan-metric"><span>Duration</span><strong>{activeCyclePlan.durationDays} days</strong></div>
                <div className="smart-plan-metric"><span>pH</span><strong>{activeCyclePlan.ph}</strong></div>
                <div className="smart-plan-metric"><span>Temperature</span><strong>{activeCyclePlan.temperature}</strong></div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Water & fertilizer</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ag-text-muted)]">{activeCyclePlan.irrigationCadence} {activeCyclePlan.fertilizer}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Common risks</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ag-text-muted)]">{activeCyclePlan.diseases.join(", ")}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">Recommended products for this cycle</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeCyclePlan.productHints.map((product) => (
                    <a
                      key={product}
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${product} agriculture product`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-brand-green/25 bg-brand-green/8 px-3 py-1.5 text-xs font-bold text-brand-green-dark hover:bg-brand-green/14 dark:text-brand-green-light"
                    >
                      {product}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {/* ── Tasks + Plants for selected cycle ── */}
      {selectedCycle && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Tasks ── */}
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
                  Tasks · {selectedCycle.crop}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--ag-text)]">
                  {completedTasks}/{tasks.length} completed
                </p>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="ui-button ui-button-primary !px-3 !py-2 !text-xs"
              >
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            </div>

            {weatherSuggestion === "visible" && tasks.some((task) => !task.completed && (task.taskType === "watering" || task.taskType === "spraying")) ? (
              <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[var(--ag-text)]">Weather impact suggestion</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ag-text-muted)]">
                      Humidity/rain risk may affect irrigation or spraying. Add a review task before changing any schedule.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="ui-button ui-button-primary !px-3 !py-2 !text-xs" onClick={() => void handleAcceptWeatherSuggestion()} disabled={saving}>
                        Accept suggestion
                      </button>
                      <button type="button" className="ui-button ui-button-secondary !px-3 !py-2 !text-xs" onClick={() => setWeatherSuggestion("ignored")}>
                        Ignore
                      </button>
                      <button type="button" className="ui-button ui-button-secondary !px-3 !py-2 !text-xs" onClick={() => setShowTaskModal(true)}>
                        Manual edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : weatherSuggestion === "accepted" ? (
              <div className="mb-4 rounded-2xl border border-brand-green/20 bg-brand-green/8 p-3 text-sm font-bold text-brand-green-dark dark:text-brand-green-light">
                Weather review task added. No existing task was changed automatically.
              </div>
            ) : null}

            {cycleLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-brand-green" />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyPanel
                title="No tasks yet"
                description="Schedule watering, fertilizing, or harvesting tasks."
                icon={<CalendarDays size={18} />}
                action={
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="ui-button ui-button-primary"
                  >
                    <Plus size={14} />
                    <span>Add Task</span>
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4"
                  >
                    <div className="smart-task-icon" aria-hidden="true">
                      {getTaskIcon(task.taskType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-bold ${
                            task.completed
                              ? "line-through text-[var(--ag-text-soft)]"
                              : "text-[var(--ag-text)]"
                          }`}
                        >
                          {task.taskName}
                        </p>
                        <StatusChip tone={taskStatusColor(task.completed)}>
                          {task.completed ? "Done" : "Pending"}
                        </StatusChip>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--ag-text-muted)]">
                        <span className="capitalize">{task.taskType}</span>
                        <span>·</span>
                        <span>{task.date}</span>
                        <span>·</span>
                        <span>Farm: {farm.name}</span>
                        <span>·</span>
                        <span>Cycle: {selectedCycle.crop}</span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">
                        {task.taskName.includes("Source:")
                          ? `Source: ${task.taskName.split("Source:").at(-1)?.trim()}`
                          : "Source: Manual"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!task.completed && (
                        <button
                          onClick={() => void handleCompleteTask(task.id)}
                          title="Mark complete"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ag-border)] text-brand-green-dark transition-colors hover:bg-brand-green/10 dark:text-brand-green-light"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => void handleDeleteTask(task.id)}
                        title="Delete"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ag-border)] text-[var(--ag-text-muted)] transition-colors hover:bg-red-50 hover:text-[var(--ag-red)] dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* ── Plants ── */}
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
                  Plants · {selectedCycle.crop}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--ag-text)]">
                  {plants.length} tracked plant{plants.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={onOpenPlantDoctor}
                  className="ui-button ui-button-primary !px-3 !py-2 !text-xs"
                >
                  <Zap size={14} />
                  <span>Scan in Plant Doctor</span>
                </button>
                <button
                  onClick={() => setShowPlantModal(true)}
                  className="ui-button ui-button-secondary !px-3 !py-2 !text-xs"
                >
                  <Plus size={14} />
                  <span>Track only</span>
                </button>
              </div>
            </div>

            {cycleLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-brand-green" />
              </div>
            ) : plants.length === 0 ? (
              <EmptyPanel
                title="No plants tracked"
                description="Run Plant Doctor first, then save the result here, or add a plant manually for tracking only."
                icon={<Leaf size={18} />}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={onOpenPlantDoctor}
                      className="ui-button ui-button-primary"
                    >
                      <Zap size={14} />
                      <span>Open Plant Doctor</span>
                    </button>
                    <button
                      onClick={() => setShowPlantModal(true)}
                      className="ui-button ui-button-secondary"
                    >
                      <Plus size={14} />
                      <span>Track only</span>
                    </button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-3">
                {plants.map((plant) => {
                  const diag = scanResults[plant.id];
                  const alert = scanAlerts[plant.id];

                  return (
                    <div
                      key={plant.id}
                      className="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <img
                          src={plant.imageUrl || activeCyclePlan?.image || "/images/tracked-plant.svg"}
                          alt={plant.userDefinedName}
                          className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div>
                              <p className="text-sm font-bold text-[var(--ag-text)]">
                                {plant.userDefinedName}
                              </p>
                              <p className="text-xs text-[var(--ag-text-muted)]">
                                {plant.speciesName}
                              </p>
                            </div>
                            <StatusChip
                              tone={recoveryColor(
                                plant.recoveryProgressPercent
                              )}
                            >
                              {Math.round(plant.recoveryProgressPercent)}%
                            </StatusChip>
                          </div>
                          <div className="mt-2">
                            <ProgressBar
                              value={plant.recoveryProgressPercent}
                            />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--ag-text-muted)]">
                            {plant.lastCheckDate ? (
                              <span>Last checked {plant.lastCheckDate}</span>
                            ) : null}
                          </div>
                        </div>
                        <button
                          onClick={onOpenPlantDoctor}
                          title="Open Plant Doctor"
                          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--ag-border)] bg-[var(--ag-surface-strong)] px-3 py-1.5 text-xs font-bold text-brand-green-dark transition-colors hover:bg-brand-green/10 disabled:opacity-50 dark:text-brand-green-light"
                        >
                          <Zap size={12} />
                          <span>Plant Doctor</span>
                        </button>
                        <button
                          onClick={() => void handleDeletePlant(plant.id)}
                          title="Delete tracked plant"
                          className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-300/45 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-[var(--ag-red)] transition-colors hover:bg-red-500/15"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Recovery bar */}
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-[11px] font-bold text-[var(--ag-text-soft)]">
                          <span>Recovery</span>
                          <span>{plant.recoveryProgressPercent}%</span>
                        </div>
                        <ProgressBar value={plant.recoveryProgressPercent} />
                      </div>

                      {/* AI scan result */}
                      {diag && (
                        <div className="mt-3 rounded-xl border border-brand-green/20 bg-brand-green/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <MapPinned
                                size={13}
                                className="text-brand-green-dark"
                              />
                              <p className="text-xs font-extrabold text-[var(--ag-text)]">
                                {diag.diseaseName}
                              </p>
                            </div>
                            <StatusChip
                              tone={
                                diag.severity === "high" ||
                                diag.severity === "critical"
                                  ? "red"
                                  : diag.severity === "medium"
                                  ? "amber"
                                  : "forest"
                              }
                            >
                              {confidencePct(diag.confidence)} conf.
                            </StatusChip>
                          </div>
                          {diag.recommendations ? (
                            <p className="mt-1.5 text-xs text-[var(--ag-text-muted)]">
                              {diag.recommendations}
                            </p>
                          ) : null}
                          <div className="mt-3 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface)] p-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">
                              Recommended medicine from Store
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              {getTreatmentProducts(diag).map((product) => (
                                <a
                                  key={product.name}
                                  href={`https://www.google.com/search?q=${encodeURIComponent(product.query)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl border border-brand-green/20 bg-brand-green/8 px-3 py-2 text-xs font-bold text-brand-green-dark hover:bg-brand-green/14 dark:text-brand-green-light"
                                >
                                  <span className="block">{product.name}</span>
                                  <small className="mt-1 block text-[var(--ag-text-muted)]">{product.type}</small>
                                </a>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">
                              Farm → {farm.name} · Cycle → {selectedCycle.crop} · Plant Doctor result
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleCreateTreatmentTasks(plant, diag)}
                              disabled={treatmentTaskStatus[plant.id] === "saving" || treatmentTaskStatus[plant.id] === "created"}
                              className="ui-button ui-button-primary !px-3 !py-2 !text-xs"
                            >
                              {treatmentTaskStatus[plant.id] === "saving" ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Plus size={13} />
                              )}
                              <span>
                                {treatmentTaskStatus[plant.id] === "created"
                                  ? "Treatment tasks added"
                                  : "Add treatment plan to tasks"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Alert */}
                      {alert && (
                        <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-800/40 dark:bg-red-900/15">
                          <AlertTriangle
                            size={13}
                            className="mt-0.5 shrink-0 text-[var(--ag-red)]"
                          />
                          <p className="text-xs font-semibold text-[var(--ag-red)]">
                            {formatScanAlert(alert)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* ── Cycle Detail (no cycle selected) ── */}
      {!loading && cycles.length > 0 && !selectedCycle && (
        <EmptyPanel
          title="Select a cycle"
          description="Click a cycle above to view its tasks and plants."
          icon={<ChevronDown size={18} />}
        />
      )}

      {/* ── Refresh button ── */}
      {selectedCycle && (
        <div className="flex justify-end">
          <button
            onClick={() => void loadCycleData(selectedCycle)}
            className="ui-button ui-button-secondary"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* ──────────────── MODALS ──────────────── */}

      {/* Add Cycle Modal */}
      {showCycleModal && (
        <Modal
          title="New Growing Cycle"
          onClose={() => setShowCycleModal(false)}
        >
          <div className="space-y-4">
            <Field label="Crop Name *">
              <Input
                placeholder="e.g. Tomato"
                value={cycleForm.crop}
                onChange={(e) =>
                  setCycleForm((f) => ({ ...f, crop: e.target.value }))
                }
              />
            </Field>
            <Field label="Season *">
              <Input
                placeholder="e.g. Spring 2025"
                value={cycleForm.season}
                onChange={(e) =>
                  setCycleForm((f) => ({ ...f, season: e.target.value }))
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Planting Date *">
                <Input
                  type="date"
                  value={cycleForm.planting_date}
                  onChange={(e) =>
                    setCycleForm((f) => ({
                      ...f,
                      planting_date: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Harvest Date">
                <Input
                  type="date"
                  value={cycleForm.harvest_date}
                  onChange={(e) =>
                    setCycleForm((f) => ({
                      ...f,
                      harvest_date: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            {cyclePlanPreview ? (
              <div className="smart-cycle-preview">
                <div className="flex items-start gap-3">
                  <img src={cyclePlanPreview.plan.image} alt={cyclePlanPreview.plan.crop} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ag-text-soft)]">
                          Plan preview before creating tasks
                        </p>
                        <h4 className="mt-1 text-base font-extrabold text-[var(--ag-text)]">
                          {cyclePlanPreview.plan.crop} cycle plan
                        </h4>
                      </div>
                      <StatusChip tone={cyclePlanPreview.soilMatches ? "forest" : "amber"}>
                        {cyclePlanPreview.soilMatches ? "Soil match" : "Soil warning"}
                      </StatusChip>
                    </div>
                    {!cyclePlanPreview.soilMatches ? (
                      <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
                        Warning: the current farm soil ({farm.soilType || "unknown"}) is not ideal for {cyclePlanPreview.plan.crop}. Best soil: {cyclePlanPreview.plan.soil.join(", ")}. You can continue, but results may be lower than expected.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div><span>Harvest</span><strong>{cyclePlanPreview.harvestDate}</strong></div>
                  <div><span>pH</span><strong>{cyclePlanPreview.plan.ph}</strong></div>
                  <div><span>Duration</span><strong>{cyclePlanPreview.plan.durationDays} days</strong></div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">Requirements</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--ag-text-muted)]">
                      <li>Water: {cyclePlanPreview.plan.irrigationCadence}</li>
                      <li>Fertilizer: {cyclePlanPreview.plan.fertilizer}</li>
                      <li>Sun/heat: {cyclePlanPreview.plan.sun}, {cyclePlanPreview.plan.temperature}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ag-text-soft)]">Generated smart tasks</p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-auto pr-1 text-xs leading-5 text-[var(--ag-text-muted)]">
                      {cyclePlanPreview.tasks.map((task) => (
                        <li key={`${task.taskName}-${task.date}`}>
                          {task.date} - {task.taskName}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCycleModal(false)}
                className="ui-button ui-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddCycle(false)}
                disabled={saving || !cycleForm.crop.trim() || !cycleForm.season.trim() || !cycleForm.planting_date}
                className="ui-button ui-button-secondary"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                <span>Create only</span>
              </button>
              <button
                onClick={() => void handleAddCycle(true)}
                disabled={saving || !cycleForm.crop.trim() || !cycleForm.season.trim() || !cycleForm.planting_date}
                className="ui-button ui-button-secondary"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>Approve plan & create tasks</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <Modal title="New Task" onClose={() => setShowTaskModal(false)}>
          <div className="space-y-4">
            <Field label="Task Name *">
              <Input
                placeholder="e.g. Irrigate north section"
                value={taskForm.task_name}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, task_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Task Type">
              <Select
                value={taskForm.task_type}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, task_type: e.target.value }))
                }
              >
                {[
                  "watering",
                  "fertilizing",
                  "harvesting",
                  "spraying",
                  "other",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date *">
              <Input
                type="date"
                value={taskForm.date}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTaskModal(false)}
                className="ui-button ui-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddTask()}
                disabled={
                  saving || !taskForm.task_name.trim() || !taskForm.date
                }
                className="ui-button ui-button-primary"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Plant Modal */}
      {showPlantModal && (
        <Modal title="Track New Plant" onClose={() => setShowPlantModal(false)}>
          <div className="space-y-4">
            <Field label="Plant Name *">
              <Input
                placeholder="e.g. My prized tomato"
                value={plantForm.user_defined_name}
                onChange={(e) =>
                  setPlantForm((f) => ({
                    ...f,
                    user_defined_name: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Species Name *">
              <Input
                placeholder="e.g. Solanum lycopersicum (Tomato)"
                value={plantForm.species_name}
                onChange={(e) =>
                  setPlantForm((f) => ({ ...f, species_name: e.target.value }))
                }
              />
            </Field>
            <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm font-semibold text-[var(--ag-text-muted)]">
              To diagnose a plant, open Plant Doctor, run the scan, then save the diagnosis to this cycle. This form is only for manual tracking.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPlantModal(false);
                }}
                className="ui-button ui-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddPlant()}
                disabled={
                  saving ||
                  !plantForm.user_defined_name.trim() ||
                  !plantForm.species_name.trim()
                }
                className="ui-button ui-button-secondary"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                <span>Track only</span>
              </button>
              <button
                onClick={onOpenPlantDoctor}
                className="ui-button ui-button-primary"
              >
                <Zap size={15} />
                <span>Open Plant Doctor</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
