export interface DiagnosisHistoryEntry {
  id: string;
  date: string;
  plantName: string;
  image: string; // dataUrl of the primary image used for diagnosis
  diagnosis: PlantDiagnosis;
}

export interface HumanConsumptionAdvisory {
  isEdible: boolean;
  safetyStatus: "safe" | "caution" | "toxic" | "unknown";
  title: string;
  summary: string;
  symptoms?: string[];
  severity?: "Low" | "Medium" | "High";
  whatToDo?: string;
}

export interface PlantDiagnosis {
  plantName: string;
  isHealthy: boolean;
  healthPercentage: number;
  diseaseName: string;
  cause: string;
  symptoms: string[] | null;
  treatment: string[] | null;
  recommendedProducts:
    | {
        productName: string;
        description: string;
        type: string;
      }[]
    | null;
  prevention: string[] | null;
  confidenceScore: number;
  visualCues: string;
  secondaryDiagnosis: {
    diseaseName: string;
    confidenceScore: number;
    reasoning: string;
  } | null;
  growthStage: string;
  growthStageReasoning: string;
  humanConsumptionAdvisory: HumanConsumptionAdvisory;
}

export interface SoilAnalysis {
  soilType: string;
  drynessLevel: string;
  composition: string;
  potentialIssues: string[];
  initialAdvice: string[];
  suitableCrops: string[];
  confidenceScore: number;
}

export interface ScientificClassification {
  kingdom: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

export interface GrowthGuideData {
  found: boolean;
  plantName: string;
  scientificName: string;
  scientificClassification: ScientificClassification;
  origin: string;
  description: string;
  plantingInstructions: string[];
  careDetails: {
    watering: string;
    sunlight: string;
    soil: string;
    fertilizer: string;
    pruning: string;
    pestsAndDiseases: string;
  };
  healthBenefits: string[];
  culinaryUses: string[];
  culturalSignificance: string;
  toxicity: string;
  funFacts: string[];
}

export interface User {
  id?: string;
  name: string;
  email: string;
  profilePicture: string;
  role?: "user" | "admin";
  location?: string;
  phone?: string;
  bio?: string;
}

export interface ProgressLogEntry {
  date: string;
  notes: string;
  image?: string;
  recoveryProgressPercentage: number;
}

export interface TrackedPlant {
  id: string;
  name: string;
  image: string;
  diagnosis: PlantDiagnosis | null;
  progressLog: ProgressLogEntry[];
  lastCheckDate: string;
  recoveryProgressPercentage: number;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ScheduleTask {
  date: string; // ISO Date
  taskName: string;
  taskType: "Watering" | "Fertilizing" | "Harvest" | "Pruning" | "General";
  completed: boolean;
  weatherAdjusted?: boolean; // If true, AI changed this based on weather
}

export interface FarmResponse {
  id: string;
  name: string;
  location?: string;
  area: number;
  areaUnit: "acre" | "hectare";
  soilType: string;
  imageUrl?: string;
  satellitePolygonId?: string;
  coordinates: { lat: number; lng: number }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFarmInput {
  name: string;
  location?: string;
  area: number;
  areaUnit: "acre" | "hectare";
  soilType?: string;
  imageUrl?: string;
  satellitePolygonId?: string;
  coordinates?: { lat: number; lng: number }[];
}

export type UpdateFarmInput = Partial<CreateFarmInput>;

export interface CreateFarmCommand extends CreateFarmInput {
  crop?: string;
  season?: string;
  plantingDate?: string;
}

export interface Farm extends FarmResponse {
  crop?: string; // Derived from the preferred farm cycle.
  season?: string; // Derived from the preferred farm cycle.
  plantingDate?: string; // Derived from the preferred farm cycle.
  // Client-side analytics/demo fields; they are not farm API fields.
  yield?: number;
  yieldUnit?: string;
  harvestPrediction?: {
    estimatedHarvestDate: string;
    daysRemaining: number;
    progress: number; // 0-100
    status: "Growing" | "Ready to Harvest" | "Overdue";
  };
  schedule?: ScheduleTask[];
}

export interface PerformanceAnalyticsData {
  kpis: {
    averageYield: string;
    bestPerformingCrop: string;
    worstPerformingCrop: string;
    mostProductiveSoil: string;
    totalFarms: number;
  };
  cropPerformance: {
    crop: string;
    averageYield: number;
    totalArea: number;
    yieldUnit: string;
    areaUnit: string;
  }[];
  soilPerformance: {
    soilType: string;
    averageYield: number;
    cropsGrown: string[];
    yieldUnit: string;
    areaUnit: string;
  }[];
  insights: {
    type: "positive" | "negative" | "recommendation";
    text: string;
  }[];
  prediction: {
    predictedYield: string;
    reasoning: string;
  };
  yieldTrend: {
    labels: string[]; // Seasons/Years
    datasets: {
      crop: string;
      data: number[]; // Yield data corresponding to labels
    }[];
    yieldUnit: string;
  };
}

export interface DiseaseInfo {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  imageUrl?: string;
  category?: string;
  hosts?: string[];
  scientificName?: string;
  language?: string;
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceArticleId?: string;
  isImported?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranscriptEntry {
  speaker: "user" | "model";
  text: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  pressure: number;
  humidity: number;
  wind: number;
  forecast: {
    day: string;
    temp_high: number;
    temp_low: number;
    condition: string;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  totalFarms: number;
  totalPlants: number;
}

// Community Types
export type PostCategory = "general" | "question" | "tips" | "showcase";

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  category: PostCategory;
  imageUrl?: string;
  likes: number;
  likedByMe: boolean;
  comments: Comment[];
  timestamp: string;
}

export interface GeoAgriData {
  soilType: string;
  suitableCrops: string[];
  commonDiseases: string[];
  climateSummary: string;
}

export interface LiveAnalysisResult {
  detected: boolean;
  issues: string[]; // e.g. "Yellowing Leaves", "Aphids"
  confidence: number;
  action: string;
}

export interface GrowthAnalysisResult {
  estimatedHeight: string;
  growthStage: string;
  healthStatus: string;
  recommendation: string;
}

export interface Outbreak {
  id: string;
  diseaseName: string;
  affectedCrop: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  distance: string; // e.g., "3.5 km"
  reportsCount: number; // e.g., 50 farmers reported this
  advice: string;
  coordinates: { lat: number; lng: number }; // Mock coordinates for visual
}

export interface RegionalStrategy {
  regionName: string;
  riskSummary: string;
  recommendedActions: string[];
  cropAdvice: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  // Internal DB articles have full content; legacy static articles use url + source
  content?: string;
  imageUrl?: string | null;
  category?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isImported?: boolean;
  sourceUrl?: string;
  sourceArticleId?: string;
  // Legacy static-data fields (kept for backward compat)
  url?: string;
  publishedDate?: string;
  source?: string;
}

// --- Finance Types ---
export type TransactionType = "income" | "expense";
export type TransactionCategory =
  | "Seeds"
  | "Fertilizers"
  | "Labor"
  | "Fuel"
  | "Equipment"
  | "Sale"
  | "Other";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  farmId?: string; // Optional linkage to specific farm
}

export interface StoreCategory {
  id: string;
  sourceId: "harraz" | "orkida";
  source: string;
  name: string;
  slug: string;
  count?: number;
}

export interface StoreProduct {
  id: string;
  sourceId: "harraz" | "orkida";
  name: string;
  description: string;
  productUrl: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  currency: string;
  onSale: boolean;
  inStock: boolean;
  purchasable: boolean;
  categories: Array<Pick<StoreCategory, "id" | "name" | "slug">>;
  source: string;
}

export interface FinancialAnalysis {
  netProfit: number;
  profitMargin: string;
  costBreakdown: { category: string; amount: number; percentage: number }[];
  aiInsights: {
    title: string;
    message: string;
    type: "warning" | "success" | "tip";
  }[];
  costPerUnit?: string; // e.g., "Cost per Kg of Corn"
}

// --- Predictive Analytics Type ---
export interface DiseasePrediction {
  riskLevel: "Low" | "Medium" | "High";
  diseaseName: string;
  affectedCrop: string;
  probability: number;
  reasoning: string; // e.g. "High humidity + 25°C favors fungal growth"
  preventiveAction: string;
  forecastDate: string;
}

// ─── Farm Cycles (cycle-based farming hierarchy) ─────────────
export interface FarmCycle {
  id: string;
  farmId: string;
  crop: string;
  season: string;
  plantingDate: string; // planting_date from database
  harvestDate: string | null; // harvest_date from database
  status: "active" | "completed" | "paused";
  createdAt: string;
  updatedAt: string;
}

// Tasks linked to a farm cycle (schedule_tasks table)
export interface CycleTask {
  id: string;
  cycleId: string;
  taskName: string; // task_name from database
  taskType: "watering" | "fertilizing" | "harvesting" | "spraying" | "other";
  date: string; // date from database (when the task is due)
  completed: boolean; // completed from database
  createdAt: string;
  updatedAt: string;
}

// Plants linked to a farm cycle (tracked_plants table)
export interface CyclePlant {
  id: string;
  cycleId: string;
  userDefinedName: string; // user_defined_name - custom name given by farmer
  speciesName: string; // species_name - scientific/common species name
  imageUrl: string | null; // image_url
  lastCheckDate: string | null; // last_check_date
  recoveryProgressPercent: number; // recovery_progress_percent (0-100)
  createdAt: string;
}

// AI scan result saved in diagnosis_history
export interface DiagnosisRecord {
  id: string;
  plantId: string;
  imageUrl: string | null;
  diseaseName: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical" | null;
  recommendations: string | null;
  createdAt: string;
}

// Progress log entry for a tracked plant
export interface ProgressLog {
  id: string;
  plantId: string;
  note: string | null;
  imageUrl: string | null;
  recoveryPercent: number | null;
  loggedAt: string;
}

export type NdviHealthStatus =
  | "Critical"
  | "Poor"
  | "Moderate"
  | "Good"
  | "Excellent";

export interface NdviStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  p25: number;
  p75: number;
  pixelCount: number;
}

export interface SatelliteNdviInsight {
  farmId: string;
  polygonId: string;
  capturedAt: string; // ISO date string
  source: string; // e.g. Sentinel-2
  cloudCoverage: number; // percentage
  status: NdviHealthStatus;
  ndvi: NdviStats;
  ndviImageUrl: string;
  trueColorImageUrl: string;
  ndviTileTemplate?: string;
}

export interface GrowthGuidePlant {
  id: string;
  slug: string;
  name: string;
  scientificName: string | null;
  category: 'vegetables' | 'fruits' | 'herbs' | 'trees' | 'flowers' | 'other';
  summary: string | null;
  description: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  canonicalUrl: string | null;
  sunlight: string | null;
  soil: string | null;
  watering: string | null;
  planting: string | null;
  sowing: string | null;
  spacing: string | null;
  care: string | null;
  harvesting: string | null;
  commonProblems: string | null;
  pests: string | null;
  diseases: string | null;
  additionalDetails: Record<string, any>;
  language: string;
  isActive: boolean;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;

  // Bilingual / Database explicit properties
  name_en?: string;
  name_ar?: string;
  summary_en?: string;
  summary_ar?: string;
  description_en?: string;
  description_ar?: string;
  sunlight_en?: string;
  sunlight_ar?: string;
  soil_en?: string;
  soil_ar?: string;
  watering_en?: string;
  watering_ar?: string;
  planting_en?: string;
  planting_ar?: string;
  sowing_en?: string;
  sowing_ar?: string;
  spacing_en?: string;
  spacing_ar?: string;
  care_en?: string;
  care_ar?: string;
  harvesting_en?: string;
  harvesting_ar?: string;
  common_problems_en?: string;
  common_problems_ar?: string;
  pests_en?: string;
  pests_ar?: string;
  diseases_en?: string;
  diseases_ar?: string;
  is_visible?: boolean;
  deleted_at?: string | null;
}

export interface GrowthGuideSyncResponse {
  scanned: number;
  created: number;
  updated: number;
  failed: number;
  syncedAt: string;
}

export interface GrowthGuideSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastResult: GrowthGuideSyncResponse | null;
  lastError: string | null;
  totalPlantsInDb: number;
  sources: {
    [key: string]: {
      scanned: number;
      created: number;
      updated: number;
      failed: number;
      status: string;
      error: string | null;
    };
  };
}
