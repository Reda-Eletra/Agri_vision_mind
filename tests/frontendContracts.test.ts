import { beforeEach, expect, test, vi } from 'vitest';
import {
  updateBackendPassword,
  updateBackendProfile,
} from '../services/backendAuthService';
import { serializeFarmInput } from '../services/apiService';
import { ensureFarmSatellitePolygon, getFarmSatelliteNdviInsight } from '../services/satelliteService';
import type { Farm } from '../types';

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

test('password update sends confirmation to the backend', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{}', { status: 200 })
  );

  await updateBackendPassword('token', {
    current_password: 'old-password',
    new_password: 'new-password',
    confirm_password: 'new-password',
  });

  const request = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(String(request.body))).toEqual({
    current_password: 'old-password',
    new_password: 'new-password',
    confirm_password: 'new-password',
  });
});

test('farm serializer excludes client-only legacy fields', () => {
  const farm: Farm = {
    id: 'farm-1',
    name: 'North Field',
    area: 12,
    areaUnit: 'acre',
    soilType: 'Loam',
    satellitePolygonId: 'polygon-1',
    coordinates: [{ lat: 30, lng: 31 }],
    yield: 50,
    schedule: [],
  };
  const payload = serializeFarmInput(farm);

  expect(payload).toEqual({
    name: 'North Field',
    area: 12,
    area_unit: 'acre',
    soil_type: 'Loam',
    satellite_polygon_id: 'polygon-1',
  });
});

test('avatar profile update uses FormData without a manual content type', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({
      data: {
        id: 'user-1',
        name: 'Farmer',
        email: 'farmer@example.com',
        avatar_url: '/uploads/avatar.png',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  );
  const avatar = new File(['image'], 'avatar.png', { type: 'image/png' });

  await updateBackendProfile('token', { name: 'Farmer', avatar });

  const request = fetchMock.mock.calls[0][1] as RequestInit;
  expect(request.body).toBeInstanceOf(FormData);
  expect(new Headers(request.headers).has('Content-Type')).toBe(false);
  expect((request.body as FormData).get('avatar')).toBe(avatar);
});

test('stored satellite polygon is verified before reuse', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'stored-polygon' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const polygonId = await ensureFarmSatellitePolygon({
    id: 'farm-1',
    name: 'Farm',
    area: 1,
    areaUnit: 'acre',
    soilType: 'Loam',
    coordinates: [],
    satellitePolygonId: 'stored-polygon',
  });

  expect(polygonId).toBe('stored-polygon');
  expect(String(fetchMock.mock.calls[0][0])).toContain('/agro/1.0/polygons/stored-polygon');
});

test('satellite insight uses AgroMonitoring stats for each available index', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url.includes('/agro/1.0/polygons/stored-real-polygon')) {
      return new Response(JSON.stringify({ id: 'stored-real-polygon' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/agro/1.0/image/search')) {
      return new Response(JSON.stringify([{
        dt: 1717200000,
        type: 'Sentinel-2',
        cl: 12,
        dc: 96,
        image: {
          ndvi: 'http://api.agromonitoring.com/image/ndvi',
          truecolor: 'http://api.agromonitoring.com/image/truecolor',
          falsecolor: 'http://api.agromonitoring.com/image/falsecolor',
        },
        stats: {
          ndvi: 'http://api.agromonitoring.com/stats/ndvi',
          evi: 'http://api.agromonitoring.com/stats/evi',
        },
        tile: {
          ndvi: 'http://api.agromonitoring.com/tile/ndvi',
        },
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/stats/ndvi')) {
      return new Response(JSON.stringify({
        mean: 0.42,
        median: 0.41,
        min: 0.12,
        max: 0.73,
        std: 0.08,
        p25: 0.31,
        p75: 0.55,
        num: 2400,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/stats/evi')) {
      return new Response(JSON.stringify({
        mean: 0.35,
        median: 0.34,
        min: 0.1,
        max: 0.6,
        std: 0.07,
        p25: 0.25,
        p75: 0.45,
        num: 2400,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/agro/1.0/soil')) {
      return new Response(JSON.stringify({ moisture: 0.31, t10: 293.15 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', { status: 404 });
  });

  const insight = await getFarmSatelliteNdviInsight({
    id: 'farm-real-stats',
    name: 'Farm',
    area: 2,
    areaUnit: 'hectare',
    soilType: 'Loam',
    coordinates: [
      { lat: 30, lng: 31 },
      { lat: 30, lng: 31.02 },
      { lat: 30.02, lng: 31.02 },
      { lat: 30.02, lng: 31 },
    ],
    satellitePolygonId: 'stored-real-polygon',
  });

  expect(insight.source).toBe('Sentinel-2');
  expect(insight.cloudCoverage).toBe(12);
  expect(insight.ndvi.mean).toBe(0.42);
  expect(insight.evi?.mean).toBe(0.35);
  expect(insight.evi2).toBeUndefined();
  expect(insight.soilData).toEqual({ moisture: 31, temperature: 20 });
  expect(insight.ndviImageUrl).toBe('https://api.agromonitoring.com/image/ndvi');
});
