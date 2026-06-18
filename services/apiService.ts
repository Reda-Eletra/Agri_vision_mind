/**
 * apiService.ts
 * Centralised, typed API client for the Smart Agriculture Backend.
 * All data operations go through here – no localStorage, no direct fetch calls
 * scattered across components.
 */

import { authFetch, getAuthToken, toAbsoluteAssetUrl } from "./backendAuthService";
import type {
  Farm,
  TrackedPlant,
  DiagnosisHistoryEntry,
  Post,
  Comment,
  Transaction,
  AdminStats,
  User,
  DiseaseInfo,
  FarmCycle,
  CycleTask,
  CyclePlant,
  DiagnosisRecord,
  PlantDiagnosis,
  GrowthGuidePlant,
  GrowthGuideSyncResponse,
  GrowthGuideSyncStatus,
  StoreCategory,
  StoreProduct,
  FarmResponse,
  CreateFarmInput,
  UpdateFarmInput,
} from "../types";

// ─── Generic helper ──────────────────────────────────────────
type ApiList<T> = { message: string; data: T[] };
type ApiItem<T> = { message: string; data: T };
type ApiPagedList<T> = {
  message: string;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
};

const tok = () => getAuthToken();

// ─────────────────────────────────────────────────────────────
// FARMS
// ─────────────────────────────────────────────────────────────

export const serializeFarmInput = (farm: UpdateFarmInput) => {
  const payload: Record<string, unknown> = {};
  if (farm.name !== undefined) payload.name = farm.name;
  if (farm.location !== undefined) payload.location = farm.location;
  if (farm.area !== undefined) payload.area = farm.area;
  if (farm.areaUnit !== undefined) payload.area_unit = farm.areaUnit;
  if (farm.soilType !== undefined) payload.soil_type = farm.soilType;
  if (farm.imageUrl !== undefined) payload.image_url = farm.imageUrl;
  if (farm.satellitePolygonId !== undefined) {
    payload.satellite_polygon_id = farm.satellitePolygonId;
  }
  return payload;
};

export const mapFarmResponse = (farm: FarmResponse): Farm => ({
  ...farm,
  area: Number(farm.area),
  soilType: farm.soilType || "",
  coordinates: farm.coordinates || [],
});

export const farmApi = {
  getAll: async (): Promise<Farm[]> => {
    const res = await authFetch<ApiList<FarmResponse>>("/farms", {}, tok());
    return res.data.map(mapFarmResponse);
  },

  create: async (farm: CreateFarmInput): Promise<Farm> => {
    const res = await authFetch<ApiItem<FarmResponse>>(
      "/farms",
      {
        method: "POST",
        body: JSON.stringify(serializeFarmInput(farm)),
      },
      tok()
    );
    const created = mapFarmResponse(res.data);
    // Save boundary coordinates if provided
    if (farm.coordinates && farm.coordinates.length > 0) {
      await farmApi.saveCoordinates(created.id, farm.coordinates);
      return { ...created, coordinates: farm.coordinates };
    }
    return created;
  },

  update: async (farmId: string, farm: UpdateFarmInput): Promise<Farm> => {
    const res = await authFetch<ApiItem<FarmResponse>>(
      `/farms/${farmId}`,
      {
        method: "PATCH",
        body: JSON.stringify(serializeFarmInput(farm)),
      },
      tok()
    );
    const updated = mapFarmResponse(res.data);
    // Replace boundary coordinates if caller provided them
    if (farm.coordinates !== undefined) {
      await farmApi.replaceCoordinates(farmId, farm.coordinates);
      return { ...updated, coordinates: farm.coordinates };
    }
    return updated;
  },

  delete: async (farmId: string): Promise<void> => {
    await authFetch(`/farms/${farmId}`, { method: "DELETE" }, tok());
  },

  /** Fetch all boundary coordinates for a farm. */
  getCoordinates: async (
    farmId: string
  ): Promise<{ id: string; lat: number; lng: number }[]> => {
    const res = await authFetch<{
      data: { id: string; latitude: number; longitude: number }[];
    }>(`/farms/${farmId}/coordinates`, {}, tok());
    return res.data.map((c) => ({
      id: c.id,
      lat: c.latitude,
      lng: c.longitude,
    }));
  },

  /** Delete a single coordinate point by its UUID. */
  deleteCoordinate: async (coordId: string): Promise<void> => {
    await authFetch(`/coordinates/${coordId}`, { method: "DELETE" }, tok());
  },

  /** Clear all existing coordinates then save the new set. */
  replaceCoordinates: async (
    farmId: string,
    coords: { lat: number; lng: number }[]
  ): Promise<void> => {
    try {
      const existing = await farmApi.getCoordinates(farmId);
      await Promise.all(existing.map((c) => farmApi.deleteCoordinate(c.id)));
    } catch {
      /* if none exist yet, that's fine */
    }
    if (coords.length > 0) {
      await farmApi.saveCoordinates(farmId, coords);
    }
  },

  /** Add boundary coordinate points (one per request, as the backend requires). */
  saveCoordinates: async (
    farmId: string,
    coords: { lat: number; lng: number }[]
  ): Promise<void> => {
    await Promise.all(
      coords.map((c, idx) =>
        authFetch(
          `/farms/${farmId}/coordinates`,
          {
            method: "POST",
            body: JSON.stringify({
              latitude: c.lat,
              longitude: c.lng,
              order_index: idx,
            }),
          },
          tok()
        )
      )
    );
  },
};

// ─────────────────────────────────────────────────────────────
// TRACKED PLANTS (standalone – /my-plants endpoints)
// ─────────────────────────────────────────────────────────────

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const normalizeDateString = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") return value.includes("T") ? value.split("T")[0] : value;

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
};

const mapTrackedPlant = (row: Partial<TrackedPlant> & Record<string, unknown>): TrackedPlant => ({
  id: String(row.id || ""),
  name: String(row.name || ""),
  image: toAbsoluteAssetUrl((row.image as string) || (row.image_url as string) || null) || "/images/tracked-plant.svg",
  diagnosis: parseJsonValue<TrackedPlant["diagnosis"]>(row.diagnosis ?? row.diagnosis_json, null),
  progressLog: Array.isArray(parseJsonValue(row.progressLog ?? row.progress_log_json, []))
    ? parseJsonValue<TrackedPlant["progressLog"]>(row.progressLog ?? row.progress_log_json, [])
    : [],
  lastCheckDate: normalizeDateString(row.lastCheckDate ?? row.last_check_date),
  recoveryProgressPercentage: Number.parseFloat(String(row.recoveryProgressPercentage ?? row.recovery_progress_percent ?? 0)) || 0,
});

const plantToPayload = (plant: Partial<TrackedPlant>) => ({
  name: plant.name,
  species_name: plant.diagnosis?.plantName,
  image_url: plant.image,
  health_status: plant.diagnosis?.isHealthy ? "healthy" : "infected",
  recovery_progress_percent: plant.recoveryProgressPercentage,
  last_check_date: plant.lastCheckDate,
  diagnosis_json: plant.diagnosis,
  progress_log_json: plant.progressLog,
});

export const plantApi = {
  getAll: async (): Promise<TrackedPlant[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>("/my-plants", {}, tok());
    return res.data.map(mapTrackedPlant);
  },

  create: async (
    plant: Omit<
      TrackedPlant,
      "id" | "lastCheckDate" | "recoveryProgressPercentage"
    >
  ): Promise<TrackedPlant> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      "/my-plants",
      {
        method: "POST",
        body: JSON.stringify(plantToPayload(plant)),
      },
      tok()
    );
    return mapTrackedPlant(res.data);
  },

  update: async (plant: TrackedPlant): Promise<TrackedPlant> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/my-plants/${plant.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(plantToPayload(plant)),
      },
      tok()
    );
    return mapTrackedPlant(res.data);
  },

  delete: async (plantId: string): Promise<void> => {
    await authFetch(`/my-plants/${plantId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// DIAGNOSIS HISTORY
// ─────────────────────────────────────────────────────────────

export const diagnosisApi = {
  getAll: async (): Promise<DiagnosisHistoryEntry[]> => {
    const res = await authFetch<ApiList<DiagnosisHistoryEntry>>(
      "/diagnosis-history",
      {},
      tok()
    );
    return res.data;
  },

  create: async (
    entry: Omit<DiagnosisHistoryEntry, "id" | "date">
  ): Promise<DiagnosisHistoryEntry> => {
    const res = await authFetch<ApiItem<DiagnosisHistoryEntry>>(
      "/diagnosis-history",
      {
        method: "POST",
        body: JSON.stringify({
          plant_name: entry.plantName,
          image_url: entry.image,
          diagnosis: entry.diagnosis,
        }),
      },
      tok()
    );
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────
// COMMUNITY POSTS
// ─────────────────────────────────────────────────────────────

export const communityApi = {
  getPosts: async (): Promise<Post[]> => {
    const res = await authFetch<ApiList<Post>>("/posts", {}, tok());
    return res.data;
  },

  createPost: async (
    post: Omit<Post, "id" | "timestamp" | "likes" | "comments" | "likedByMe" | "authorId">
  ): Promise<Post> => {
    const res = await authFetch<ApiItem<Post>>(
      "/posts",
      {
        method: "POST",
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          category: post.category,
          imageUrl: post.imageUrl,
        }),
      },
      tok()
    );
    return res.data;
  },

  deletePost: async (postId: string): Promise<void> => {
    await authFetch(`/posts/${postId}`, { method: "DELETE" }, tok());
  },

  likePost: async (postId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await authFetch<ApiItem<{ likesCount: number; likedByMe: boolean }>>(
      `/posts/${postId}/like`,
      { method: "POST" },
      tok()
    );
    return response.data;
  },

  unlikePost: async (postId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await authFetch<ApiItem<{ likesCount: number; likedByMe: boolean }>>(
      `/posts/${postId}/like`,
      { method: "DELETE" },
      tok()
    );
    return response.data;
  },

  addComment: async (postId: string, content: string): Promise<Comment> => {
    const res = await authFetch<ApiItem<Comment>>(
      `/posts/${postId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
      tok()
    );
    return res.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await authFetch(`/comments/${commentId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────

interface TransactionResponse {
  message: string;
  data: Transaction[];
  summary?: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
  };
}

const mapTransaction = (row: Partial<Transaction> & Record<string, unknown>): Transaction => ({
  id: String(row.id || ""),
  date: normalizeDateString(row.date) || new Date().toISOString().split("T")[0],
  amount: Number.parseFloat(String(row.amount ?? 0)) || 0,
  type: row.type === "income" ? "income" : "expense",
  category: (row.category as Transaction["category"]) || "Other",
  description: String(row.description || ""),
  farmId: ((row.farmId as string) || (row.farm_id as string) || undefined) || undefined,
});

export const transactionApi = {
  getAll: async (): Promise<Transaction[]> => {
    const res = await authFetch<TransactionResponse>(
      "/transactions",
      {},
      tok()
    );
    return res.data.map(mapTransaction);
  },

  create: async (tx: Omit<Transaction, "id">): Promise<Transaction> => {
    const res = await authFetch<ApiItem<Transaction>>(
      "/transactions",
      {
        method: "POST",
        body: JSON.stringify({
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          description: tx.description,
          date: tx.date,
          farm_id: tx.farmId || null,
        }),
      },
      tok()
    );
    return mapTransaction(res.data);
  },

  delete: async (txId: string): Promise<void> => {
    await authFetch(`/transactions/${txId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await authFetch<ApiItem<AdminStats>>("/admin/stats", {}, tok());
    return res.data;
  },

  getUsers: async (): Promise<User[]> => {
    const res = await authFetch<ApiList<User>>("/admin/users", {}, tok());
    return res.data;
  },

  updateUser: async (
    userId: string,
    data: { name?: string; email?: string; password?: string }
  ): Promise<User> => {
    const res = await authFetch<ApiItem<User>>(
      `/admin/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      tok()
    );
    return res.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await authFetch(`/admin/users/${userId}`, { method: "DELETE" }, tok());
  },

  getUserDiagnoses: async (
    userId: string
  ): Promise<Record<string, unknown>[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>(
      `/admin/users/${userId}/diagnoses`,
      {},
      tok()
    );
    return res.data;
  },

  getAllPosts: async (): Promise<Record<string, unknown>[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>(
      "/admin/posts",
      {},
      tok()
    );
    return res.data;
  },

  deleteAnyPost: async (postId: string): Promise<void> => {
    await authFetch(`/admin/posts/${postId}`, { method: "DELETE" }, tok());
  },

  getGrowthGuides: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    trash?: boolean;
  }): Promise<{
    data: GrowthGuidePlant[];
    pagination: { page: number; limit: number; total: number };
  }> => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.trash !== undefined) q.append("trash", String(params.trash));

    return authFetch<{
      data: GrowthGuidePlant[];
      pagination: { page: number; limit: number; total: number };
    }>(`/admin/growth-guides?${q.toString()}`, {}, tok());
  },

  createGrowthGuide: async (data: Partial<GrowthGuidePlant>): Promise<{ message: string; id: string }> => {
    const res = await authFetch<ApiItem<{ message: string; id: string }>>(
      "/admin/growth-guides",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      tok()
    );
    return res.data;
  },

  updateGrowthGuide: async (id: string, data: Partial<GrowthGuidePlant> & { restore?: boolean }): Promise<void> => {
    await authFetch(
      `/admin/growth-guides/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      tok()
    );
  },

  deleteGrowthGuide: async (id: string, force?: boolean): Promise<void> => {
    const q = force ? "?force=true" : "";
    await authFetch(`/admin/growth-guides/${id}${q}`, { method: "DELETE" }, tok());
  },

  toggleGrowthGuideVisibility: async (id: string): Promise<{ is_visible: boolean }> => {
    const res = await authFetch<ApiItem<{ is_visible: boolean }>>(
      `/admin/growth-guides/${id}/toggle-visibility`,
      { method: "PATCH" },
      tok()
    );
    return res.data;
  },

  syncGrowthGuides: async (): Promise<void> => {
    await authFetch("/admin/growth-guides/sync", { method: "POST" }, tok());
  },

  getGrowthGuidesSyncStatus: async (): Promise<GrowthGuideSyncStatus & { logs?: any[] }> => {
    const res = await authFetch<ApiItem<GrowthGuideSyncStatus & { logs?: any[] }>>(
      "/admin/growth-guides/sync-status",
      {},
      tok()
    );
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────
// NEWS
// ─────────────────────────────────────────────────────────────

import type { NewsArticle } from "../types";

export interface NewsListParams {
  page?: number;
  limit?: number;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface NewsListResponse {
  data: NewsArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    sources: string[];
  };
}

const normalizeNewsArticle = (article: NewsArticle): NewsArticle => ({
  ...article,
  imageUrl: toAbsoluteAssetUrl(article.imageUrl) || article.imageUrl,
});

export const newsApi = {
  getAll: async (): Promise<NewsArticle[]> => {
    const res = await authFetch<ApiList<NewsArticle>>("/news", {}, tok());
    return res.data.map(normalizeNewsArticle);
  },

  getList: async (params?: NewsListParams): Promise<NewsListResponse> => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.source) q.append("source", params.source);
    if (params?.dateFrom) q.append("dateFrom", params.dateFrom);
    if (params?.dateTo) q.append("dateTo", params.dateTo);

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const res = await authFetch<NewsListResponse>(`/news${queryStr}`, {}, tok());
    return {
      ...res,
      data: res.data.map(normalizeNewsArticle),
      filters: {
        sources: res.filters?.sources || [],
      },
    };
  },

  getById: async (id: string): Promise<NewsArticle> => {
    const res = await authFetch<ApiItem<NewsArticle>>(`/news/${id}`, {}, tok());
    return normalizeNewsArticle(res.data);
  },

  getAdminAll: async (): Promise<NewsArticle[]> => {
    const res = await authFetch<ApiPagedList<NewsArticle>>("/admin/news?limit=100", {}, tok());
    return res.data.map(normalizeNewsArticle);
  },

  create: async (data: {
    title: string;
    summary: string;
    content: string;
    category?: string;
    image_url?: string;
  }): Promise<NewsArticle> => {
    const res = await authFetch<ApiItem<NewsArticle>>(
      "/admin/news",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      tok()
    );
    return res.data;
  },

  sync: async (): Promise<{
    scanned: number;
    created: number;
    updated: number;
    failed: number;
    perSource: Array<{
      source: string;
      scanned: number;
      created: number;
      updated: number;
      failed: number;
      error?: string;
    }>;
    syncedAt: string;
  }> => {
    const res = await authFetch<
      ApiItem<{
        scanned: number;
        created: number;
        updated: number;
        failed: number;
        perSource: Array<{
          source: string;
          scanned: number;
          created: number;
          updated: number;
          failed: number;
          error?: string;
        }>;
        syncedAt: string;
      }>
    >(
      "/admin/news/sync",
      {
        method: "POST",
      },
      tok()
    );
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await authFetch(`/admin/news/${id}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// DISEASE LIBRARY
// ─────────────────────────────────────────────────────────────

export const diseaseLibraryApi = {
  getAll: async (language: string): Promise<DiseaseInfo[]> => {
    const lang = language === "ar" ? "ar" : "en";
    const limit = 500;
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const allDiseases: DiseaseInfo[] = [];

    while (allDiseases.length < total) {
      const res = await authFetch<ApiPagedList<DiseaseInfo>>(
        `/disease-library?lang=${encodeURIComponent(lang)}&page=${page}&limit=${limit}`,
        { headers: { "Accept-Language": lang } },
        tok()
      );

      allDiseases.push(...res.data);
      total = res.pagination?.total ?? allDiseases.length;

      if (!res.pagination || res.data.length === 0 || allDiseases.length >= total) break;
      page += 1;
    }

    return allDiseases.map((disease) => ({
      ...disease,
      imageUrl: toAbsoluteAssetUrl(disease.imageUrl) || undefined,
    }));
  },

  getById: async (id: string): Promise<DiseaseInfo> => {
    const res = await authFetch<ApiItem<DiseaseInfo>>(`/disease-library/${id}`, {}, tok());
    return {
      ...res.data,
      imageUrl: toAbsoluteAssetUrl(res.data.imageUrl) || undefined,
    };
  },

  getAdminAll: async (): Promise<DiseaseInfo[]> => {
    const res = await authFetch<ApiPagedList<DiseaseInfo>>(
      "/admin/disease-library?limit=1000",
      {},
      tok()
    );
    return res.data.map((disease) => ({
      ...disease,
      imageUrl: toAbsoluteAssetUrl(disease.imageUrl) || undefined,
    }));
  },

  sync: async (): Promise<{
    scanned: number;
    created: number;
    updated: number;
    failed: number;
    perSource: Array<{
      source: string;
      scanned: number;
      created: number;
      updated: number;
      failed: number;
      error?: string;
    }>;
    syncedAt: string;
  }> => {
    const res = await authFetch<
      ApiItem<{
        scanned: number;
        created: number;
        updated: number;
        failed: number;
        perSource: Array<{
          source: string;
          scanned: number;
          created: number;
          updated: number;
          failed: number;
          error?: string;
        }>;
        syncedAt: string;
      }>
    >(
      "/admin/disease-library/sync",
      {
        method: "POST",
      },
      tok()
    );
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────
// FARM CYCLES  (POST/GET /farms/:farmId/cycles, PATCH /cycles/:id)
// ─────────────────────────────────────────────────────────────

/** Map backend snake_case cycle row → FarmCycle */
const mapCycle = (row: Record<string, unknown>): FarmCycle => ({
  id: row.id as string,
  farmId: row.farm_id as string,
  crop: row.crop as string,
  season: row.season as string,
  plantingDate: row.planting_date as string,
  harvestDate: row.harvest_date as string | null,
  status: (row.status as FarmCycle["status"]) || "active",
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export const cycleApi = {
  getAll: async (farmId: string): Promise<FarmCycle[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>(
      `/farms/${farmId}/cycles`,
      {},
      tok()
    );
    return res.data.map(mapCycle);
  },

  create: async (
    farmId: string,
    data: {
      crop: string;
      season: string;
      planting_date: string;
      harvest_date?: string;
      status?: string;
    }
  ): Promise<FarmCycle> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/farms/${farmId}/cycles`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      tok()
    );
    return mapCycle(res.data);
  },

  update: async (
    cycleId: string,
    data: Partial<{
      crop: string;
      season: string;
      planting_date: string;
      harvest_date: string;
      status: string;
    }>
  ): Promise<FarmCycle> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/cycles/${cycleId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      tok()
    );
    return mapCycle(res.data);
  },

  delete: async (cycleId: string): Promise<void> => {
    await authFetch(`/cycles/${cycleId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// CYCLE TASKS  (POST/GET /cycles/:id/tasks, PATCH/DELETE /tasks/:id)
// ─────────────────────────────────────────────────────────────

/** Map backend snake_case task row → CycleTask */
const mapTask = (row: Record<string, unknown>): CycleTask => ({
  id: row.id as string,
  cycleId: row.farm_cycle_id as string,
  taskName: row.task_name as string,
  taskType: (row.task_type as CycleTask["taskType"]) || "other",
  date: row.date as string,
  completed: row.completed as boolean,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export const cycleTaskApi = {
  getAll: async (cycleId: string): Promise<CycleTask[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>(
      `/cycles/${cycleId}/tasks`,
      {},
      tok()
    );
    return res.data.map(mapTask);
  },

  create: async (
    cycleId: string,
    data: {
      task_name: string;
      task_type: string;
      date: string;
      completed?: boolean;
    }
  ): Promise<CycleTask> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/cycles/${cycleId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      tok()
    );
    return mapTask(res.data);
  },

  update: async (
    taskId: string,
    data: Partial<{
      task_name: string;
      task_type: string;
      date: string;
      completed: boolean;
    }>
  ): Promise<CycleTask> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      tok()
    );
    return mapTask(res.data);
  },

  complete: async (taskId: string): Promise<CycleTask> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ completed: true }),
      },
      tok()
    );
    return mapTask(res.data);
  },

  delete: async (taskId: string): Promise<void> => {
    await authFetch(`/tasks/${taskId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// CYCLE PLANTS  (POST/GET /cycles/:id/plants, GET /plants/:id, POST /plants/:id/scan)
// ─────────────────────────────────────────────────────────────

/** Map backend snake_case plant row → CyclePlant */
const mapCyclePlant = (row: Record<string, unknown>): CyclePlant => ({
  id: row.id as string,
  cycleId: row.farm_cycle_id as string,
  userDefinedName: row.user_defined_name as string,
  speciesName: row.species_name as string,
  imageUrl: row.image_url as string | null,
  lastCheckDate: row.last_check_date as string | null,
  recoveryProgressPercent: parseFloat(
    String(row.recovery_progress_percent ?? 0)
  ),
  createdAt: row.created_at as string,
});

/** Map backend diagnosis row → DiagnosisRecord */
const mapDiagnosis = (row: Record<string, unknown>): DiagnosisRecord => ({
  id: row.id as string,
  plantId: row.plant_id as string,
  imageUrl: toAbsoluteAssetUrl(row.image_url as string | null),
  diseaseName: row.disease_name as string,
  confidence: parseFloat(String(row.confidence ?? 0)),
  severity: (row.severity as DiagnosisRecord["severity"]) || null,
  recommendations: row.recommendations as string | null,
  createdAt: row.created_at as string,
});

interface ScanResult {
  diagnosis: DiagnosisRecord;
  plantUpdated: {
    recoveryProgressPercent: number;
  };
  alert: string | null;
}

export const cyclePlantApi = {
  getAll: async (cycleId: string): Promise<CyclePlant[]> => {
    const res = await authFetch<ApiList<Record<string, unknown>>>(
      `/cycles/${cycleId}/plants`,
      {},
      tok()
    );
    return res.data.map(mapCyclePlant);
  },

  getById: async (plantId: string): Promise<CyclePlant> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/plants/${plantId}`,
      {},
      tok()
    );
    return mapCyclePlant(res.data);
  },

  create: async (
    cycleId: string,
    data: {
      user_defined_name: string;
      species_name: string;
      image_url?: string;
      recovery_progress_percent?: number;
    }
  ): Promise<CyclePlant> => {
    const res = await authFetch<ApiItem<Record<string, unknown>>>(
      `/cycles/${cycleId}/plants`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      tok()
    );
    return mapCyclePlant(res.data);
  },

  createFromDiagnosis: async (
    cycleId: string,
    data: {
      user_defined_name: string;
      species_name: string;
      image_url?: string;
      recovery_progress_percent?: number;
      diagnosis: PlantDiagnosis;
    }
  ): Promise<{ plant: CyclePlant; diagnosis: DiagnosisRecord }> => {
    try {
      const res = await authFetch<
        ApiItem<{
          plant: Record<string, unknown>;
          diagnosis: Record<string, unknown>;
        }>
      >(
        `/cycles/${cycleId}/plants/from-diagnosis`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        tok()
      );
      return {
        plant: mapCyclePlant(res.data.plant),
        diagnosis: mapDiagnosis(res.data.diagnosis),
      };
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const message = error instanceof Error ? error.message : "";
      const isMissingRoute =
        status === 404 && /route .*not found|not found/i.test(message);
      if (!isMissingRoute) throw error;

      const plant = await cyclePlantApi.create(cycleId, {
        user_defined_name: data.user_defined_name,
        species_name: data.species_name,
        image_url: data.image_url,
        recovery_progress_percent:
          data.recovery_progress_percent ?? data.diagnosis.healthPercentage,
      });
      return {
        plant,
        diagnosis: {
          id: `local-diagnosis-${plant.id}`,
          plantId: plant.id,
          imageUrl: data.image_url || null,
          diseaseName: data.diagnosis.isHealthy
            ? "Healthy"
            : data.diagnosis.diseaseName || "Unknown Disease",
          confidence: data.diagnosis.confidenceScore ?? 0,
          severity: data.diagnosis.isHealthy ? "low" : "medium",
          recommendations: Array.isArray(data.diagnosis.treatment)
            ? data.diagnosis.treatment.join(" ")
            : String(data.diagnosis.treatment || data.diagnosis.prevention || ""),
          createdAt: new Date().toISOString(),
        },
      };
    }
  },

  /** Upload image and run AI scan. Returns diagnosis + updated plant fields. */
  scan: async (plantId: string, imageFile?: File): Promise<ScanResult> => {
    type ScanResponse = {
      data: {
        diagnosis: Record<string, unknown>;
        plantUpdated: { recovery_progress_percent: number };
        alert: string | null;
      };
    };

    const body: BodyInit = imageFile
      ? (() => {
          const f = new FormData();
          f.append("image", imageFile);
          return f;
        })()
      : JSON.stringify({});

    const res = await authFetch<ScanResponse>(
      `/plants/${plantId}/scan`,
      { method: "POST", body },
      tok()
    );
    return {
      diagnosis: mapDiagnosis(res.data.diagnosis),
      plantUpdated: {
        recoveryProgressPercent: parseFloat(
          String(res.data.plantUpdated?.recovery_progress_percent ?? 0)
        ),
      },
      alert: res.data.alert,
    };
  },

  delete: async (plantId: string): Promise<void> => {
    await authFetch(`/plants/${plantId}`, { method: "DELETE" }, tok());
  },
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  getOverview: async () => {
    const res = await authFetch<ApiItem<Record<string, number>>>(
      "/dashboard/overview",
      {},
      tok()
    );
    return res.data;
  },

  getRecentScans: async () => {
    const res = await authFetch<ApiList<unknown>>(
      "/dashboard/recent-scans",
      {},
      tok()
    );
    return res.data;
  },

  getUpcomingTasks: async () => {
    const res = await authFetch<ApiList<unknown>>(
      "/dashboard/upcoming-tasks",
      {},
      tok()
    );
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────
// GROWTH GUIDES
// ─────────────────────────────────────────────────────────────

export const storeApi = {
  getProducts: async (params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    source?: "all" | "harraz" | "orkida";
  }): Promise<{
    data: StoreProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      totalExact: boolean;
      hasNext: boolean;
    };
    sources: Array<{ id: string; name: string; url: string }>;
  }> => {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    if (params.source) query.set("source", params.source);
    return authFetch(`/store/products?${query.toString()}`, {}, tok());
  },

  getCategories: async (): Promise<{
    data: StoreCategory[];
    sources: Array<{ id: string; name: string; url: string }>;
  }> => authFetch("/store/categories", {}, tok()),
};

const normalizeGrowthGuidePlant = (plant: GrowthGuidePlant): GrowthGuidePlant => ({
  ...plant,
  imageUrl: toAbsoluteAssetUrl(plant.imageUrl) || plant.imageUrl,
});

export const growthGuideApi = {
  getPlants: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    source?: string;
    sort?: string;
    language?: string;
  }): Promise<{
    data: GrowthGuidePlant[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      categories: string[];
      sources: string[];
    };
  }> => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", String(params.page));
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.source) q.append("source", params.source);
    if (params?.sort) q.append("sort", params.sort);
    const lang = params?.language === "ar" ? "ar" : "en";
    q.append("lang", lang);

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const res = await authFetch<{
      data: GrowthGuidePlant[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      filters: {
        categories: string[];
        sources: string[];
      };
    }>(`/growth-guides${queryStr}`, { headers: { "Accept-Language": lang } }, tok());

    return {
      ...res,
      data: res.data.map(normalizeGrowthGuidePlant),
    };
  },

  getPlant: async (idOrSlug: string, language?: string): Promise<GrowthGuidePlant> => {
    const lang = language === "ar" ? "ar" : "en";
    const res = await authFetch<ApiItem<GrowthGuidePlant>>(
      `/growth-guides/${encodeURIComponent(idOrSlug)}?lang=${encodeURIComponent(lang)}`,
      { headers: { "Accept-Language": lang } },
      tok()
    );
    return normalizeGrowthGuidePlant(res.data);
  },

  sync: async (): Promise<GrowthGuideSyncResponse> => {
    const res = await authFetch<ApiItem<GrowthGuideSyncResponse>>(
      "/admin/growth-guides/sync",
      {
        method: "POST",
      },
      tok()
    );
    return res.data;
  },

  getSyncStatus: async (): Promise<GrowthGuideSyncStatus> => {
    const res = await authFetch<ApiItem<GrowthGuideSyncStatus>>(
      "/admin/growth-guides/sync-status",
      {},
      tok()
    );
    return res.data;
  },
};
