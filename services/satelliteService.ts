import type { Farm, NdviHealthStatus, SatelliteNdviInsight } from '../types';

const AGRO_API_BASE = (import.meta.env.VITE_AGRO_API_BASE?.trim() || 'https://api.agromonitoring.com').replace(/\/+$/, '');
const AGRO_API_KEY = import.meta.env.VITE_AGRO_API_KEY?.trim() || '';
const SATELLITE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const satelliteCache = new Map<string, { data: SatelliteNdviInsight; timestamp: number }>();

interface AgroPolygonResponse {
    id: string;
}

interface AgroImageResponse {
    dt: number;
    type?: string;
    cl?: number;
    image?: {
        ndvi?: string;
        truecolor?: string;
    };
    stats?: {
        ndvi?: string;
    };
    tile?: {
        ndvi?: string;
    };
}

interface AgroNdviStatsResponse {
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
    p25: number;
    p75: number;
    num: number;
}

const nowUnix = (): number => Math.floor(Date.now() / 1000);

const getCacheKey = (farm: Farm): string => {
    const coords = (farm.coordinates || []).map(point => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join('|');
    return `${farm.id}_${farm.satellitePolygonId || 'none'}_${coords}`;
};

const getCachedInsight = (cacheKey: string): SatelliteNdviInsight | null => {
    const entry = satelliteCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > SATELLITE_CACHE_TTL) {
        satelliteCache.delete(cacheKey);
        return null;
    }
    return entry.data;
};

const setCachedInsight = (cacheKey: string, data: SatelliteNdviInsight): void => {
    satelliteCache.set(cacheKey, { data, timestamp: Date.now() });
};

const assertApiKey = (): void => {
    if (!AGRO_API_KEY) {
        throw new Error('Missing VITE_AGRO_API_KEY in .env.local');
    }
};

const buildApiUrl = (path: string, params: Record<string, string | number>): string => {
    const url = new URL(`${AGRO_API_BASE}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
    });
    return url.toString();
};

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const requestInit: RequestInit = { ...init };
    if (init?.body) {
        requestInit.headers = {
            'Content-Type': 'application/json',
            ...(init.headers || {})
        };
    }

    const response = await fetch(url, requestInit);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Satellite API request failed (${response.status}): ${errorText || 'No details'}`);
    }
    return response.json() as Promise<T>;
};

const normalizeAgroUrl = (url: string | undefined): string => {
    if (!url) return '';
    return url.replace(/^http:\/\//i, 'https://');
};

const toClosedPolygonRing = (coordinates: { lat: number; lng: number }[]): [number, number][] => {
    if (coordinates.length < 3) {
        throw new Error('Farm must contain at least 3 boundary points for satellite analysis.');
    }

    const ring: [number, number][] = coordinates.map(point => [
        Number(point.lng.toFixed(6)),
        Number(point.lat.toFixed(6))
    ]);

    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring[ring.length - 1];

    if (firstLng !== lastLng || firstLat !== lastLat) {
        ring.push([firstLng, firstLat]);
    }

    return ring;
};

const createPolygonForFarm = async (farm: Farm): Promise<string> => {
    const ring = toClosedPolygonRing(farm.coordinates || []);
    const payload = {
        name: `AVM-${farm.id}`,
        geo_json: {
            type: 'Feature',
            properties: { farmId: farm.id },
            geometry: {
                type: 'Polygon',
                coordinates: [ring]
            }
        }
    };

    const response = await fetchJson<AgroPolygonResponse>(
        buildApiUrl('/agro/1.0/polygons', { appid: AGRO_API_KEY }),
        {
            method: 'POST',
            body: JSON.stringify(payload)
        }
    );

    if (!response?.id) {
        throw new Error('Failed to create satellite polygon for farm.');
    }

    return response.id;
};

export const ensureFarmSatellitePolygon = async (farm: Farm): Promise<string> => {
    if (farm.satellitePolygonId) return farm.satellitePolygonId;
    return createPolygonForFarm(farm);
};

const pickBestImage = (images: AgroImageResponse[]): AgroImageResponse | null => {
    const candidates = images
        .filter(img => img.image?.ndvi && img.image?.truecolor && img.stats?.ndvi)
        .sort((a, b) => b.dt - a.dt);

    if (candidates.length === 0) return null;
    return candidates.find(candidate => (candidate.cl ?? 100) <= 60) || candidates[0];
};

export const classifyNdviHealth = (mean: number): NdviHealthStatus => {
    if (mean < 0.15) return 'Critical';
    if (mean < 0.3) return 'Poor';
    if (mean < 0.45) return 'Moderate';
    if (mean < 0.65) return 'Good';
    return 'Excellent';
};

export const getNdviHealthColor = (mean: number): string => {
    if (mean < 0.15) return '#dc2626';
    if (mean < 0.3) return '#f97316';
    if (mean < 0.45) return '#facc15';
    if (mean < 0.65) return '#22c55e';
    return '#15803d';
};

export const getFarmSatelliteNdviInsight = async (farm: Farm, lookbackDays = 90): Promise<SatelliteNdviInsight> => {
    assertApiKey();

    const coordinates = farm.coordinates || [];
    if (coordinates.length < 3) {
        throw new Error('Farm boundaries are missing. Draw a polygon first.');
    }

    const cacheKey = getCacheKey(farm);
    const cached = getCachedInsight(cacheKey);
    if (cached) return cached;

    const polygonId = await ensureFarmSatellitePolygon(farm);

    const end = nowUnix() - 2 * 60 * 60; // Keep safely before "now" to avoid API time-range errors.
    const start = end - lookbackDays * 24 * 60 * 60;
    const images = await fetchJson<AgroImageResponse[]>(
        buildApiUrl('/agro/1.0/image/search', {
            start,
            end,
            polyid: polygonId,
            appid: AGRO_API_KEY
        })
    );

    const selectedImage = pickBestImage(images);
    if (!selectedImage?.stats?.ndvi || !selectedImage.image?.ndvi || !selectedImage.image?.truecolor) {
        throw new Error('No satellite imagery found for this farm in the selected time range.');
    }

    const stats = await fetchJson<AgroNdviStatsResponse>(normalizeAgroUrl(selectedImage.stats.ndvi));
    const mean = Number(stats.mean ?? 0);

    const result: SatelliteNdviInsight = {
        farmId: farm.id,
        polygonId,
        capturedAt: new Date((selectedImage.dt || end) * 1000).toISOString(),
        source: selectedImage.type || 'Unknown',
        cloudCoverage: Number((selectedImage.cl ?? 0).toFixed(1)),
        status: classifyNdviHealth(mean),
        ndvi: {
            mean,
            median: Number(stats.median ?? mean),
            min: Number(stats.min ?? mean),
            max: Number(stats.max ?? mean),
            std: Number(stats.std ?? 0),
            p25: Number(stats.p25 ?? mean),
            p75: Number(stats.p75 ?? mean),
            pixelCount: Number(stats.num ?? 0)
        },
        ndviImageUrl: normalizeAgroUrl(selectedImage.image.ndvi),
        trueColorImageUrl: normalizeAgroUrl(selectedImage.image.truecolor),
        ndviTileTemplate: normalizeAgroUrl(selectedImage.tile?.ndvi)
    };

    setCachedInsight(cacheKey, result);
    return result;
};
