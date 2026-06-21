import type { Farm, NdviHealthStatus, SatelliteNdviInsight } from '../types';

const AGRO_API_BASE = (import.meta.env.VITE_AGRO_API_BASE?.trim() || 'https://api.agromonitoring.com').replace(/\/+$/, '');
const AGRO_API_KEY = import.meta.env.VITE_AGRO_API_KEY?.trim() || '';
const SATELLITE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CLOUD_COVERAGE = 60;
const MIN_VALID_COVERAGE = 50;
const GDD_BASE_TEMP_KELVIN = 283.15; // 10C
const satelliteCache = new Map<string, { data: SatelliteNdviInsight; timestamp: number }>();

interface AgroPolygonResponse {
    id: string;
}

type SpectralIndexKey = 'ndvi' | 'evi' | 'evi2' | 'ndwi' | 'dswi' | 'nri';
type OptionalSpectralIndexKey = Exclude<SpectralIndexKey, 'ndvi'>;
type AgroImageKey = SpectralIndexKey | 'truecolor' | 'falsecolor';

interface AgroImageResponse {
    dt: number;
    type?: string;
    dc?: number;
    cl?: number;
    image?: Partial<Record<AgroImageKey, string>>;
    stats?: Partial<Record<SpectralIndexKey, string>>;
    tile?: Partial<Record<AgroImageKey, string>>;
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

interface AgroAccumulatedWeatherPoint {
    temp?: number;
    rain?: number;
}

const OPTIONAL_INDEX_KEYS: OptionalSpectralIndexKey[] = ['evi', 'evi2', 'ndwi', 'dswi', 'nri'];

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

const farmCentroid = (coordinates: { lat: number; lng: number }[]): { lat: number; lng: number } => {
    const lat = coordinates.reduce((sum, point) => sum + point.lat, 0) / coordinates.length;
    const lng = coordinates.reduce((sum, point) => sum + point.lng, 0) / coordinates.length;
    return { lat, lng };
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

const estimatePolygonAreaHa = (coords: { lat: number; lng: number }[]): number => {
    if (coords.length < 3) return 0;
    const latAvg = (coords.reduce((sum, c) => sum + c.lat, 0) / coords.length) * Math.PI / 180;
    const cosLat = Math.cos(latAvg);
    
    let sum = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
        const curr = coords[i];
        const next = coords[(i + 1) % n];
        
        const x1 = curr.lng * 111320 * cosLat;
        const y1 = curr.lat * 110540;
        const x2 = next.lng * 111320 * cosLat;
        const y2 = next.lat * 110540;
        
        sum += (x1 * y2 - x2 * y1);
    }
    
    const areaSqM = Math.abs(sum) / 2;
    return areaSqM / 10000;
};

const createPolygonForFarm = async (farm: Farm): Promise<string> => {
    let coords = farm.coordinates || [];
    const area = estimatePolygonAreaHa(coords);
    
    // AgroMonitoring requires polygon area to be between 1 and 3000 hectares.
    // If the farm is too small, auto-scale it outward from the centroid to reach a safe 1.15 ha.
    if (area > 0 && area < 1.0) {
        const centroidLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        const centroidLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
        const scaleFactor = Math.sqrt(1.15 / area);
        coords = coords.map(c => ({
            lat: centroidLat + (c.lat - centroidLat) * scaleFactor,
            lng: centroidLng + (c.lng - centroidLng) * scaleFactor
        }));
    }

    const ring = toClosedPolygonRing(coords);
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
    if (farm.satellitePolygonId) {
        try {
            assertApiKey();
            await fetchJson(buildApiUrl(`/agro/1.0/polygons/${farm.satellitePolygonId}`, { appid: AGRO_API_KEY }));
            return farm.satellitePolygonId;
        } catch (err) {
            console.warn(`Polygon ${farm.satellitePolygonId} not found or invalid under current API key. Recreating...`, err);
        }
    }
    return createPolygonForFarm(farm);
};

const pickBestImage = (images: AgroImageResponse[]): AgroImageResponse | null => {
    const candidates = images
        .filter(img => img.image?.ndvi && img.image?.truecolor && img.stats?.ndvi)
        .filter(img => (img.cl ?? 100) <= MAX_CLOUD_COVERAGE)
        .filter(img => (img.dc ?? 100) >= MIN_VALID_COVERAGE)
        .sort((a, b) => b.dt - a.dt);

    return candidates[0] || null;
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

const toInsightStats = (stats: AgroNdviStatsResponse) => ({
    mean: Number(stats.mean ?? 0),
    min: Number(stats.min ?? stats.mean ?? 0),
    max: Number(stats.max ?? stats.mean ?? 0)
});

const fetchSpectralStats = async (statsUrl: string | undefined): Promise<AgroNdviStatsResponse | null> => {
    if (!statsUrl) return null;
    return fetchJson<AgroNdviStatsResponse>(normalizeAgroUrl(statsUrl));
};

const fetchOptionalSpectralStats = async (
    statsUrl: string | undefined,
    label: string
): Promise<AgroNdviStatsResponse | null> => {
    try {
        return await fetchSpectralStats(statsUrl);
    } catch (err) {
        console.warn(`Failed to fetch ${label} satellite stats:`, err);
        return null;
    }
};

const latestAccumulatedValue = (points: AgroAccumulatedWeatherPoint[], key: 'rain' | 'temp'): number | undefined => {
    const latestPoint = [...points].reverse().find(point => typeof point[key] === 'number');
    return typeof latestPoint?.[key] === 'number' ? Number(latestPoint[key]?.toFixed(1)) : undefined;
};

const fetchAccumulatedMetrics = async (
    coordinates: { lat: number; lng: number }[],
    start: number,
    end: number
): Promise<{ accumulatedGdd?: number; accumulatedRainfall?: number }> => {
    const centroid = farmCentroid(coordinates);
    const sharedParams = {
        lat: Number(centroid.lat.toFixed(6)),
        lon: Number(centroid.lng.toFixed(6)),
        start,
        end,
        appid: AGRO_API_KEY
    };

    const [temperaturePoints, precipitationPoints] = await Promise.all([
        fetchJson<AgroAccumulatedWeatherPoint[]>(
            buildApiUrl('/agro/1.0/weather/history/accumulated_temperature', {
                ...sharedParams,
                threshold: GDD_BASE_TEMP_KELVIN
            })
        ),
        fetchJson<AgroAccumulatedWeatherPoint[]>(
            buildApiUrl('/agro/1.0/weather/history/accumulated_precipitation', sharedParams)
        )
    ]);

    return {
        accumulatedGdd: latestAccumulatedValue(temperaturePoints, 'temp'),
        accumulatedRainfall: latestAccumulatedValue(precipitationPoints, 'rain')
    };
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
            appid: AGRO_API_KEY,
            clouds_max: MAX_CLOUD_COVERAGE,
            coverage_min: MIN_VALID_COVERAGE
        })
    );

    const selectedImage = pickBestImage(images);

    if (!selectedImage?.stats?.ndvi || !selectedImage.image?.ndvi || !selectedImage.image?.truecolor) {
        throw new Error(`No usable satellite imagery found with <= ${MAX_CLOUD_COVERAGE}% cloud cover and >= ${MIN_VALID_COVERAGE}% valid coverage.`);
    }

    const statsEntries = await Promise.all(
        OPTIONAL_INDEX_KEYS.map(async key => [key, await fetchOptionalSpectralStats(selectedImage.stats?.[key], key)] as const)
    );
    const optionalStats = Object.fromEntries(
        statsEntries
            .filter((entry): entry is readonly [OptionalSpectralIndexKey, AgroNdviStatsResponse] => Boolean(entry[1]))
            .map(([key, stats]) => [key, toInsightStats(stats)])
    ) as Partial<Record<OptionalSpectralIndexKey, { mean: number; min: number; max: number }>>;

    const stats = await fetchSpectralStats(selectedImage.stats.ndvi);
    if (!stats) {
        throw new Error('Satellite imagery response did not include NDVI statistics.');
    }
    const mean = Number(stats.mean ?? 0);
    const min = Number(stats.min ?? mean);
    const max = Number(stats.max ?? mean);

    let soilData: SatelliteNdviInsight['soilData'] | undefined;
    try {
        const soilRes = await fetchJson<any>(
            buildApiUrl('/agro/1.0/soil', {
                polyid: polygonId,
                appid: AGRO_API_KEY
            })
        );
        if (soilRes) {
            soilData = {
                moisture: Number(((soilRes.moisture ?? 0.245) * 100).toFixed(1)),
                temperature: Number(((soilRes.t10 ?? 294.95) - 273.15).toFixed(1))
            };
        }
    } catch (err) {
        console.warn('Failed to fetch AgroMonitoring soil data:', err);
    }

    let accumulatedMetrics: { accumulatedGdd?: number; accumulatedRainfall?: number } = {};
    if (farm.plantingDate) {
        const planting = new Date(farm.plantingDate);
        const plantingUnix = Math.floor(planting.getTime() / 1000);
        if (!Number.isNaN(plantingUnix) && plantingUnix < end) {
            try {
                accumulatedMetrics = await fetchAccumulatedMetrics(coordinates, plantingUnix, end);
            } catch (err) {
                console.warn('Failed to fetch AgroMonitoring accumulated weather metrics:', err);
            }
        }
    }

    const historyEntries = await Promise.all(
        images.slice(0, 10).map(async img => {
            const historyStats = await fetchOptionalSpectralStats(img.stats?.ndvi, 'historical NDVI');
            if (!historyStats) return null;
            return {
                date: new Date((img.dt || end) * 1000).toISOString().split('T')[0],
                ndvi: Number((historyStats.mean ?? 0).toFixed(3))
            };
        })
    );
    const history = historyEntries
        .filter((entry): entry is { date: string; ndvi: number } => Boolean(entry))
        .sort((a, b) => a.date.localeCompare(b.date));

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
            min,
            max,
            std: Number(stats.std ?? 0),
            p25: Number(stats.p25 ?? mean),
            p75: Number(stats.p75 ?? mean),
            pixelCount: Number(stats.num ?? 0)
        },
        ndviImageUrl: normalizeAgroUrl(selectedImage.image.ndvi),
        trueColorImageUrl: normalizeAgroUrl(selectedImage.image.truecolor),
        falseColorImageUrl: selectedImage.image.falsecolor ? normalizeAgroUrl(selectedImage.image.falsecolor) : undefined,
        ndviTileTemplate: normalizeAgroUrl(selectedImage.tile?.ndvi),
        ...optionalStats,
        soilData,
        accumulatedRainfall: accumulatedMetrics.accumulatedRainfall,
        accumulatedGdd: accumulatedMetrics.accumulatedGdd,
        history
    };

    setCachedInsight(cacheKey, result);
    return result;
};
