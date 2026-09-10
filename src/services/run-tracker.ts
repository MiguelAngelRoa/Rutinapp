import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  haversineMeters,
  type RunRoutePoint,
} from '@/services/run-storage';

/** Minimum distance (meters) between two fixes to consider we actually moved.
 *  Matches the `distanceInterval` of the location task so slow paces still
 *  accumulate points while standing-still jitter is dropped. */
export const MIN_DISTANCE_M = 3;
/** Fixes with a worse accuracy radius than this are treated as noise. */
export const MIN_ACCURACY_M = 18;
/** A fix this far away from the previous one in a very short time is a glitch. */
export const MAX_SPURIOUS_JUMP_M = 40;
export const SPURIOUS_JUMP_TIME_MS = 2000;

const ACTIVE_RUN_KEY = 'rutinapp:active-run:v1';

export type GpsFix = {
  latitude: number;
  longitude: number;
  /** Accuracy radius in meters; `null` when unknown. */
  accuracy: number | null;
  /** Epoch timestamp in milliseconds. */
  timestampMs: number;
};

/** State of the current run, shared between the UI and the background task. */
export type ActiveRun = {
  /** Epoch ms when the running clock started; `null` while paused. */
  startedAt: number | null;
  /** Elapsed milliseconds accumulated before the last pause. */
  pausedElapsedMs: number;
  distanceM: number;
  route: RunRoutePoint[];
  lastPoint: RunRoutePoint | null;
  lastFixAt: number;
};

export function createActiveRun(startedAt: number): ActiveRun {
  return {
    startedAt,
    pausedElapsedMs: 0,
    distanceM: 0,
    route: [],
    lastPoint: null,
    lastFixAt: 0,
  };
}

export function runElapsedMs(run: ActiveRun, now: number): number {
  return (
    run.pausedElapsedMs + (run.startedAt != null ? now - run.startedAt : 0)
  );
}

/**
 * Applies the noise filters to a new GPS fix and, when it is accepted,
 * appends it to the run state. Returns the new route/distance snapshot to
 * broadcast, or `null` when the fix should be ignored.
 */
export function addFix(
  run: ActiveRun,
  fix: GpsFix,
): { route: RunRoutePoint[]; distanceM: number } | null {
  if (fix.accuracy !== null && fix.accuracy > MIN_ACCURACY_M) return null;

  const point: RunRoutePoint = {
    latitude: fix.latitude,
    longitude: fix.longitude,
    timestamp: runElapsedMs(run, fix.timestampMs),
  };

  const last = run.lastPoint;
  if (!last) {
    run.lastPoint = point;
    run.route = [point];
    run.lastFixAt = fix.timestampMs;
    return { route: run.route, distanceM: run.distanceM };
  }

  const diff = haversineMeters(
    last.latitude,
    last.longitude,
    point.latitude,
    point.longitude,
  );
  if (diff < MIN_DISTANCE_M) return null;

  const timeGapMs = fix.timestampMs - run.lastFixAt;
  if (timeGapMs < SPURIOUS_JUMP_TIME_MS && diff > MAX_SPURIOUS_JUMP_M) {
    return null;
  }

  run.lastPoint = point;
  run.route = [...run.route, point];
  run.distanceM += diff;
  run.lastFixAt = fix.timestampMs;
  return { route: run.route, distanceM: run.distanceM };
}

export async function loadActiveRun(): Promise<ActiveRun | null> {
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ActiveRun;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray(parsed.route)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveRun(run: ActiveRun): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
  } catch {
    // Best effort: never crash on a failed persistence write.
  }
}

export async function clearActiveRun(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
  } catch {
    // Best effort.
  }
}

export type RunStateUpdate = {
  route: RunRoutePoint[];
  distanceM: number;
  lastPoint: RunRoutePoint | null;
  lastFixAt: number;
};

type RunStateListener = (update: RunStateUpdate) => void;

const listeners = new Set<RunStateListener>();

export function subscribeRunState(listener: RunStateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitRunState(update: RunStateUpdate): void {
  for (const listener of listeners) {
    listener(update);
  }
}

export type RunCoords = { latitude: number; longitude: number };

type RunCoordsListener = (coords: RunCoords) => void;

const coordsListeners = new Set<RunCoordsListener>();

export function subscribeRunCoords(listener: RunCoordsListener): () => void {
  coordsListeners.add(listener);
  return () => {
    coordsListeners.delete(listener);
  };
}

export function emitRunCoords(coords: RunCoords): void {
  for (const listener of coordsListeners) {
    listener(coords);
  }
}