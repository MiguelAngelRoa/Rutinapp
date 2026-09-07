import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rutinapp:runs:v1';

export type RunRoutePoint = {
  latitude: number;
  longitude: number;
  /** Session-relative time in milliseconds. */
  timestamp: number;
};

export type RunSession = {
  id: string;
  startedAt: string;
  endedAt: string;
  /** Total elapsed time including pauses, in milliseconds. */
  durationMs: number;
  /** Distance covered in meters. */
  distanceM: number;
  route: RunRoutePoint[];
};

export async function loadRuns(): Promise<RunSession[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as RunSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveRun(session: RunSession): Promise<void> {
  try {
    const runs = await loadRuns();
    const next = [session, ...runs];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best effort: never crash on a failed persistence write.
  }
}

export async function deleteRun(id: string): Promise<void> {
  try {
    const runs = await loadRuns();
    const next = runs.filter((run) => run.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best effort.
  }
}

/**
 * Distance in meters between two coordinates using the Haversine formula.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}