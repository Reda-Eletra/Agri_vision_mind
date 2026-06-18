const AVATAR_COLORS = [
  '#3CB371',
  '#2E8B57',
  '#0EA5A4',
  '#2563EB',
  '#EA580C',
  '#A855F7',
];

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const getInitials = (seed: string): string => {
  const trimmed = seed.trim();
  if (!trimmed) return 'U';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

export const createAvatar = (seed: string, size = 128): string => {
  const safeSeed = seed || 'User';
  const initials = getInitials(safeSeed);
  const color = AVATAR_COLORS[hashSeed(safeSeed) % AVATAR_COLORS.length];
  const fontSize = Math.floor(size * 0.36);
  const radius = Math.floor(size / 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#1F2937"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/><circle cx="${Math.floor(size * 0.78)}" cy="${Math.floor(size * 0.22)}" r="${Math.floor(size * 0.14)}" fill="rgba(255,255,255,0.25)"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF">${initials}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
