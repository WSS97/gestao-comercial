import { supabase } from './supabase';

/**
 * Re-checks is_read_only from the database right before a mutation.
 * Returns true if the device is read-only (operation should be blocked).
 */
export async function isDeviceReadOnlyNow(deviceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('authorized_devices')
    .select('is_read_only')
    .eq('id', deviceId)
    .maybeSingle();
  return Boolean(data?.is_read_only);
}

/** Convenience: reads the cached device from localStorage. */
export function isReadOnlyCached(): boolean {
  const raw = window.localStorage.getItem('device_info');
  if (!raw) return false;
  try {
    const device = JSON.parse(raw);
    return Boolean(device?.is_read_only);
  } catch {
    return false;
  }
}
