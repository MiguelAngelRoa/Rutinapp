import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import {
  addFix,
  emitRunCoords,
  emitRunState,
  loadActiveRun,
  saveActiveRun,
  type ActiveRun,
  type GpsFix,
} from '@/services/run-tracker';

export const LOCATION_TASK_NAME = 'rutinapp-location-task';

const LOCATION_TASK_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 2000,
  distanceInterval: 3,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Carrera en curso',
    notificationBody: 'Grabando tu ruta en segundo plano.',
    notificationColor: '#A3E635',
    killServiceOnDestroy: false,
  },
};

let activeRun: ActiveRun | null = null;

function toFix(location: Location.LocationObject): GpsFix {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestampMs: location.timestamp ?? Date.now(),
  };
}

async function handleLocations(locations: Location.LocationObject[]) {
  if (Platform.OS === 'web' || locations.length === 0) return;

  let run = activeRun;
  if (!run) {
    run = await loadActiveRun();
    activeRun = run;
  }
  if (!run || run.startedAt === null) return;

  for (const location of locations) {
    emitRunCoords({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    const update = addFix(run, toFix(location));
    if (update) {
      emitRunState({
        route: update.route,
        distanceM: update.distanceM,
        lastPoint: run.lastPoint,
        lastFixAt: run.lastFixAt,
      });
      await saveActiveRun(run);
    }
  }
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // GPS/provider errors are transient; keep the run alive.
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] })
    ?.locations;
  if (!Array.isArray(locations)) return;
  try {
    await handleLocations(locations);
  } catch {
    // Best effort: the foreground hook keeps the UI consistent.
  }
});

/** Reloads the persisted run before the background task starts appending. */
export function beginLocationTask(): Promise<void> {
  activeRun = null;
  if (Platform.OS === 'web') return Promise.resolve();
  return Location.startLocationUpdatesAsync(
    LOCATION_TASK_NAME,
    LOCATION_TASK_OPTIONS,
  ).catch(() => {});
}

export function stopLocationTask(): Promise<void> {
  activeRun = null;
  if (Platform.OS === 'web') return Promise.resolve();
  return Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
}