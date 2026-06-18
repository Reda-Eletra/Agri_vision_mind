import type { User } from '../types';
import { createAvatar } from './avatarService';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  phone?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  auth_provider?: 'local' | 'google' | string;
}

interface BackendAuthData {
  user: BackendUser;
  token: string;
}

interface BackendAuthResponse {
  message?: string;
  data: BackendAuthData;
}

interface BackendProfileResponse {
  message?: string;
  data: BackendUser;
}

interface BackendUpdateProfileResponse {
  message?: string;
  data: BackendUser;
}

interface BackendUpdateEmailResponse {
  message?: string;
  data: {
    token: string;
  };
}

// ─── Token is stored in sessionStorage (not localStorage) ────
// sessionStorage clears when the browser tab/window is closed,
// which is more secure than localStorage for auth tokens.
const TOKEN_KEY = 'smartagri_auth_token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '');

const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const getBackendOrigin = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}`;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

export const toAbsoluteAssetUrl = (assetPath?: string | null): string | null => {
  if (!assetPath) return null;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;
  if (assetPath.startsWith('data:') || assetPath.startsWith('blob:')) return assetPath;
  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) return assetPath;
  const withLeadingSlash = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${backendOrigin}${withLeadingSlash}`;
};

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
};

const getCurrentLanguageHeader = (): string => {
  if (typeof document !== 'undefined') {
    return document.documentElement.lang?.startsWith('ar') ? 'ar' : 'en';
  }
  return 'en';
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', getCurrentLanguageHeader());
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(buildApiUrl(path), { ...init, headers });
  const payload  = await parseJsonResponse(response);
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload as T;
};

// ─── Public helpers ───────────────────────────────────────────
export const isBackendAuthEnabled = (): boolean =>
  (import.meta.env.VITE_USE_BACKEND_AUTH || 'true').toLowerCase() !== 'false';

/** Save JWT to sessionStorage (cleared on tab/browser close). */
export const saveAuthToken = (token: string) => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

/** Read JWT from sessionStorage. */
export const getAuthToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);

/** Remove JWT from sessionStorage. */
export const clearAuthToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
};

export const mapBackendUserToAppUser = (backendUser: BackendUser): User => ({
  id:             backendUser.id,
  name:           backendUser.name,
  email:          backendUser.email,
  role:           backendUser.role || 'user',
  location:       backendUser.location || '',
  phone:          backendUser.phone || '',
  profilePicture:
    toAbsoluteAssetUrl(backendUser.avatar_url) ||
    createAvatar(backendUser.name || backendUser.email),
});

export const registerWithBackend = async (payload: {
  name: string;
  email: string;
  password: string;
  location?: string;
  phone?: string;
}) => {
  const response = await request<BackendAuthResponse>('/auth/register', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
  return response.data;
};

export const loginWithBackend = async (payload: { email: string; password: string }) => {
  const response = await request<BackendAuthResponse>('/auth/login', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
  return response.data;
};

export const fetchBackendProfile = async (token: string) => {
  const response = await request<BackendProfileResponse>('/users/profile', {
    method:  'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateBackendProfile = async (
  token: string,
  payload: { name?: string; location?: string; phone?: string; avatar?: File }
) => {
  const hasAvatar = Boolean(payload.avatar);
  const body = hasAvatar ? new FormData() : JSON.stringify({
    name: payload.name,
    location: payload.location,
    phone: payload.phone,
  });
  if (body instanceof FormData) {
    if (payload.name !== undefined) body.append('name', payload.name);
    if (payload.location !== undefined) body.append('location', payload.location);
    if (payload.phone !== undefined) body.append('phone', payload.phone);
    if (payload.avatar) body.append('avatar', payload.avatar);
  }

  const response = await request<BackendUpdateProfileResponse>('/users/profile', {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  return response.data;
};

export const updateBackendPassword = async (
  token: string,
  payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }
) => {
  await request<{ message?: string }>('/users/update-password', {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(payload),
  });
};

export const updateBackendEmail = async (
  token: string,
  payload: { new_email: string; password: string }
) => {
  const response = await request<BackendUpdateEmailResponse>('/users/update-email', {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(payload),
  });
  return response.data;
};

export const getGoogleAuthUrl = () => buildApiUrl('/auth/google');

/** Generic authenticated API fetch – used by apiService.ts */
export const authFetch = async <T>(
  path: string,
  init: RequestInit = {},
  token?: string | null
): Promise<T> => {
  const headers = new Headers(init.headers);
  const tok = token || getAuthToken();
  if (tok) headers.set('Authorization', `Bearer ${tok}`);
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', getCurrentLanguageHeader());
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(buildApiUrl(path), { ...init, headers });
  const payload  = await parseJsonResponse(response);
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
};
