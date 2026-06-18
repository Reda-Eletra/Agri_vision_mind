
import React, { useEffect, useRef, useState } from 'react';
import type { Farm } from '../types';

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
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<LeafletMap | null>(null);
    const markersRef = useRef<LeafletLayer[]>([]);
    const polygonRef = useRef<LeafletLayer | null>(null);
    const [currentPoints, setCurrentPoints] = useState<{ lat: number; lng: number }[]>(coordinates || []);

    // Initial Map Setup
    useEffect(() => {
        if (!mapRef.current || leafletMapRef.current) return;

        const L = getLeaflet();
        if (!L) return;

        const defaultCenter = center ? [center.lat, center.lng] : [30.0444, 31.2357];
        const map = L.map(mapRef.current).setView(defaultCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

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
            {mode === 'edit' && (
                <div className="absolute top-2 right-2 z-[1000] flex gap-2">
                    <button
                        onClick={() => {
                            setCurrentPoints([]);
                            if (onCoordinatesChange) onCoordinatesChange([]);
                        }}
                        className="px-3 py-1 rounded shadow text-sm font-bold border border-[var(--ag-border)] bg-[var(--ag-surface)] text-[var(--ag-red)]"
                    >
                        Clear Map
                    </button>
                </div>
            )}
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
