import type { AuthorizedDevice } from './supabase';

const TOKEN_KEY = 'device_token';
const DEVICE_KEY = 'device_info';

export function setDeviceToken(device: AuthorizedDevice) {
  window.localStorage.setItem(TOKEN_KEY, device.id);
  window.localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
}

export function getDeviceToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getDeviceInfo(): AuthorizedDevice | null {
  const raw = window.localStorage.getItem(DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthorizedDevice;
  } catch {
    return null;
  }
}

export function clearDeviceToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(DEVICE_KEY);
}

export function isDeviceAuthorized(): boolean {
  return Boolean(getDeviceToken());
}
