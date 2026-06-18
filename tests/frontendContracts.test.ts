import { beforeEach, expect, test, vi } from 'vitest';
import {
  updateBackendPassword,
  updateBackendProfile,
} from '../services/backendAuthService';
import { serializeFarmInput } from '../services/apiService';
import { ensureFarmSatellitePolygon } from '../services/satelliteService';
import type { Farm } from '../types';

beforeEach(() => {
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

test('stored satellite polygon is reused without a remote request', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
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
  expect(fetchMock).not.toHaveBeenCalled();
});
