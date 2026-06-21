
import React, { useEffect, useRef, useState } from 'react';
import type { Farm } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

// Leaflet is injected as a global CDN script — minimal typing to avoid `any`
interface LeafletLayer {
    addTo(map: LeafletMap): LeafletLayer;
    remove(): void;
    bindPopup(content: HTMLElement): LeafletLayer;
}
interface LeafletMap {
    setView(center: number[], zoom: number): LeafletMap;
    on(event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void): void;
    remove(): void;
    removeLayer(layer: LeafletLayer): void;
    fitBounds(bounds: number[][][]): void;
    eachLayer(cb: (layer: LeafletLayer & { constructor?: { name?: string } }) => void): void;
}
interface LeafletLib {
    map(el: HTMLElement): LeafletMap;
    tileLayer(url: string, opts: Record<string, unknown>): LeafletLayer;
    circleMarker(latlng: number[], opts: Record<string, unknown>): LeafletLayer;
    polygon(latlngs: number[][], opts: Record<string, unknown>): LeafletLayer;
    Polygon: unknown;
    Marker: unknown;
}
const getLeaflet = (): LeafletLib | null =>
    (window as Window & { L?: LeafletLib }).L ?? null;

interface FarmMapProps {
    mode: 'view' | 'edit';
    coordinates?: { lat: number; lng: number }[];
    onCoordinatesChange?: (coords: { lat: number; lng: number }[]) => void;
    farms?: Farm[];
    center?: { lat: number; lng: number };
    ndviByFarmId?: Record<string, number>;
}

const getColorFromNdvi = (mean?: number): string => {
    if (typeof mean !== 'number' || Number.isNaN(mean)) return '#94a3b8';
    if (mean < 0.15) return '#dc2626';
    if (mean < 0.3) return '#f97316';
    if (mean < 0.45) return '#facc15';
    if (mean < 0.65) return '#22c55e';
    return '#15803d';
};

export const createFarmPopupContent = (farm: Farm, ndviMean?: number): HTMLElement => {
    const popup = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = farm.crop || farm.name;
    popup.append(title, document.createElement('br'));

    const ndviText = typeof ndviMean === 'number'
        ? `NDVI Mean: ${ndviMean.toFixed(3)}`
        : 'NDVI data unavailable';
    popup.append(document.createTextNode(ndviText));
    return popup;
};

export const FarmMap: React.FC<FarmMapProps> = ({ mode, coordinates, onCoordinatesChange, farms, center, ndviByFarmId }) => {
    const { language } = useTranslation();
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<LeafletMap | null>(null);
    const tileLayerRef = useRef<LeafletLayer | null>(null);
    const markersRef = useRef<LeafletLayer[]>([]);
    const polygonRef = useRef<LeafletLayer | null>(null);
    const [currentPoints, setCurrentPoints] = useState<{ lat: number; lng: number }[]>(coordinates || []);
    const [mapMode, setMapMode] = useState<'satellite' | 'roadmap'>('satellite');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Initial Map Setup
    useEffect(() => {
        if (!mapRef.current || leafletMapRef.current) return;

        const L = getLeaflet();
        if (!L) return;

        const defaultCenter = center ? [center.lat, center.lng] : [30.0444, 31.2357];
        const map = L.map(mapRef.current).setView(defaultCenter, 13);

        const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        const layer = L.tileLayer(satelliteUrl, {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
        }).addTo(map);

        tileLayerRef.current = layer;
        leafletMapRef.current = map;

        if (mode === 'edit') {
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                setCurrentPoints(prev => {
                    const newPoints = [...prev, { lat, lng }];
                    if (onCoordinatesChange) onCoordinatesChange(newPoints);
                    return newPoints;
                });
            });
        }

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Dynamic layer swap when mapMode changes
    useEffect(() => {
        const map = leafletMapRef.current;
        const L = getLeaflet();
        if (!map || !L) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const url = mapMode === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const attribution = mapMode === 'satellite'
            ? 'Tiles &copy; Esri'
            : '© OpenStreetMap contributors';

        const layer = L.tileLayer(url, {
            attribution,
            maxZoom: 19,
        }).addTo(map);

        tileLayerRef.current = layer;
    }, [mapMode]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !leafletMapRef.current) return;
        
        setIsSearching(true);
        setSearchError('');
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                leafletMapRef.current.setView([Number(lat), Number(lon)], 16);
            } else {
                setSearchError(language === 'ar' ? 'لم يتم العثور على الموقع' : 'Location not found');
            }
        } catch (err) {
            console.error('Geocoding error:', err);
            setSearchError(language === 'ar' ? 'فشل البحث' : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    // Handle Drawing Logic (Edit Mode)
    useEffect(() => {
        const map = leafletMapRef.current;
        if (!map || mode !== 'edit') return;

        const L = getLeaflet();
        if (!L) return;

        markersRef.current.forEach(m => map.removeLayer(m));
        if (polygonRef.current) map.removeLayer(polygonRef.current);
        markersRef.current = [];

        currentPoints.forEach(p => {
            const marker = L.circleMarker([p.lat, p.lng], {
                radius: 5,
                color: '#3CB371',
                fillColor: '#fff',
                fillOpacity: 1,
            }).addTo(map);
            markersRef.current.push(marker);
        });

        if (currentPoints.length > 1) {
            const latlngs = currentPoints.map(p => [p.lat, p.lng]);
            polygonRef.current = L.polygon(latlngs, { color: '#3CB371' }).addTo(map);
        }
    }, [currentPoints, mode]);

    // Handle Viewing Logic (View Mode - NDVI Simulation)
    useEffect(() => {
        const map = leafletMapRef.current;
        if (!map || mode !== 'view' || !farms) return;

        const L = getLeaflet();
        if (!L) return;

        map.eachLayer(layer => {
            if (layer instanceof (L.Polygon as new (...args: unknown[]) => LeafletLayer) ||
                layer instanceof (L.Marker as new (...args: unknown[]) => LeafletLayer)) {
                map.removeLayer(layer);
            }
        });

        const bounds: number[][][] = [];

        farms.forEach(farm => {
            if (farm.coordinates && farm.coordinates.length > 2) {
                const latlngs = farm.coordinates.map(p => [p.lat, p.lng]);
                const ndviMean = ndviByFarmId?.[farm.id];
                const color = getColorFromNdvi(ndviMean);
                L.polygon(latlngs, {
                    color,
                    fillColor: color,
                    fillOpacity: 0.5,
                }).addTo(map).bindPopup(createFarmPopupContent(farm, ndviMean));

                bounds.push(latlngs);
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds.flat() as unknown as number[][][]);
        }
    }, [farms, mode, ndviByFarmId]);

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden z-0">
            <div ref={mapRef} className="w-full h-full min-h-[300px]" />
            
            {/* Search Overlay */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1 max-w-sm w-[260px] sm:w-[300px]">
                <form onSubmit={handleSearch} className="flex w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (searchError) setSearchError('');
                        }}
                        placeholder={language === 'ar' ? 'ابحث عن مدينة أو منطقة...' : 'Search city or region...'}
                        className="flex-1 px-3 py-1.5 text-xs bg-transparent text-gray-800 dark:text-white border-none focus:outline-none focus:ring-0"
                    />
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="px-3 bg-brand-green text-white text-xs font-bold hover:bg-brand-green/90 transition-colors shrink-0 disabled:opacity-50"
                    >
                        {isSearching ? (language === 'ar' ? '...' : '...') : (language === 'ar' ? 'بحث' : 'Search')}
                    </button>
                </form>
                {searchError && (
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow w-fit">
                        {searchError}
                    </div>
                )}
            </div>

            {/* Map Controls */}
            <div className="absolute top-3 right-3 z-[1000] flex gap-2">
                <button
                    onClick={() => setMapMode(mapMode === 'satellite' ? 'roadmap' : 'satellite')}
                    className="px-3 py-1.5 rounded-xl shadow-md text-xs font-extrabold border border-gray-200 dark:border-gray-750 bg-white/95 dark:bg-gray-850/95 backdrop-blur text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                    {mapMode === 'satellite'
                        ? (language === 'ar' ? '🗺️ خريطة طرق' : '🗺️ Roadmap')
                        : (language === 'ar' ? '🛰️ قمر صناعي' : '🛰️ Satellite')}
                </button>
                {mode === 'edit' && currentPoints.length > 0 && (
                    <button
                        onClick={() => {
                            setCurrentPoints([]);
                            if (onCoordinatesChange) onCoordinatesChange([]);
                        }}
                        className="px-3 py-1.5 rounded-xl shadow-md text-xs font-extrabold border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                    >
                        {language === 'ar' ? 'مسح التحديد' : 'Clear Points'}
                    </button>
                )}
            </div>
            {mode === 'view' && (
                <div className="absolute bottom-4 left-4 z-[1000] p-2 rounded-lg text-xs border border-[var(--ag-border)]" style={{ background: 'var(--ag-surface-strong)', color: 'var(--ag-text)' }}>
                    <div className="font-bold mb-1" style={{ color: 'var(--ag-text)' }}>NDVI Index (Live)</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-700 rounded-full"></div> Excellent</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Good</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Moderate</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Poor</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded-full"></div> Critical</div>
                </div>
            )}
        </div>
    );
};
