import { createFarmPopupContent } from '../components/FarmMap';
import { expect, test } from 'vitest';

test('farm popup renders hostile farm text without parsing HTML', () => {
  const hostileName = '<img src=x onerror="window.__xss=true">';
  const popup = createFarmPopupContent({
    id: 'farm-1',
    name: hostileName,
    area: 1,
    areaUnit: 'acre',
    soilType: 'Loam',
    coordinates: [],
  }, 0.42);

  expect(popup.textContent).toContain(hostileName);
  expect(popup.querySelector('img')).toBeNull();
  expect(popup.innerHTML).toContain('&lt;img');
  expect((window as typeof window & { __xss?: boolean }).__xss).not.toBe(true);
});
