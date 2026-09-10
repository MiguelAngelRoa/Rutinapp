import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { beginLocationTask, stopLocationTask } from '@/services/location-task';
import {
  clearActiveRun,
  createActiveRun,
  loadActiveRun,
  runElapsedMs,
  saveActiveRun,
  subscribeRunCoords,
  subscribeRunState,
  type ActiveRun,
  type RunCoords,
  type RunStateUpdate,
} from '@/services/run-tracker';
import type { RunRoutePoint } from '@/services/run-storage';

export type RunnerStatus = 'idle' | 'running' | 'paused';

export type RunSnapshot = {
  elapsedMs: number;
  distanceM: number;
  route: RunRoutePoint[];
};

export function useRunner() {
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const statusRef = useRef<RunnerStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [route, setRoute] = useState<RunRoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const runRef = useRef<ActiveRun | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /** Fetches the current GPS position without starting a run, so the marker and
   *  the map are visible as soon as the runner view opens. */
  const refreshLocation = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location.coords);
    } catch {
      // Best-effort: the map simply stays empty until the run starts.
    }
  }, []);

  /** Elapsed time accounting for the running clock plus any paused time. */
  const totalElapsedMs = useCallback(() => {
    const run = runRef.current;
    if (!run) return 0;
    return runElapsedMs(run, Date.now());
  }, []);

  const applyRouteUpdate = useCallback((update: RunStateUpdate) => {
    setDistanceM(update.distanceM);
    setRoute(update.route);
    if (runRef.current) {
      runRef.current.route = update.route;
      runRef.current.distanceM = update.distanceM;
      runRef.current.lastPoint = update.lastPoint;
      runRef.current.lastFixAt = update.lastFixAt;
    }
  }, []);

  const applyCoords = useCallback((coords: RunCoords) => {
    setCurrentLocation(coords);
  }, []);

  useEffect(() => {
    const unsubscribeState = subscribeRunState(applyRouteUpdate);
    const unsubscribeCoords = subscribeRunCoords(applyCoords);
    return () => {
      unsubscribeState();
      unsubscribeCoords();
    };
  }, [applyRouteUpdate, applyCoords]);

  const startTicker = useCallback(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      setElapsedMs(totalElapsedMs);
    }, 500);
  }, [totalElapsedMs]);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTicker();
    };
  }, [stopTicker]);

  const start = async () => {
    await stopLocationTask();
    const run = createActiveRun(Date.now());
    runRef.current = run;
    await saveActiveRun(run);
    setStatus('running');
    setElapsedMs(0);
    setDistanceM(0);
    setRoute([]);
    startTicker();
    await beginLocationTask();
  };

  const pause = async () => {
    if (statusRef.current !== 'running') return;
    const run = runRef.current;
    if (!run) return;
    run.pausedElapsedMs = runElapsedMs(run, Date.now());
    run.startedAt = null;
    await saveActiveRun(run);
    setElapsedMs(run.pausedElapsedMs);
    stopTicker();
    setStatus('paused');
    await stopLocationTask();
  };

  const resume = async () => {
    if (statusRef.current !== 'paused') return;
    let run = runRef.current;
    if (!run) {
      run = createActiveRun(Date.now());
      runRef.current = run;
    }
    run.startedAt = Date.now();
    await saveActiveRun(run);
    setStatus('running');
    startTicker();
    await beginLocationTask();
  };

  const finish = async (): Promise<RunSnapshot> => {
    const persisted = await loadActiveRun();
    const run = persisted ?? runRef.current;
    const finalElapsed = run ? runElapsedMs(run, Date.now()) : elapsedMs;
    const finalDistance = run ? run.distanceM : distanceM;
    const finalRoute = run ? run.route : route;
    await stopLocationTask();
    await clearActiveRun();
    runRef.current = null;
    stopTicker();
    setStatus('idle');
    setElapsedMs(0);
    setDistanceM(0);
    setRoute([]);
    setCurrentLocation(null);
    return {
      elapsedMs: finalElapsed,
      distanceM: finalDistance,
      route: finalRoute,
    };
  };

  /** Reconciles the UI with the buffer written by the background task,
   *  e.g. when the app returns to the foreground after being backgrounded. */
  const hydrate = useCallback(async () => {
    setIsHydrating(true);
    try {
      const persisted = await loadActiveRun();
      if (!persisted) return;
      const wasRunning = persisted.startedAt !== null;
      runRef.current = persisted;
      setDistanceM(persisted.distanceM);
      setRoute(persisted.route);
      setElapsedMs(runElapsedMs(persisted, Date.now()));
      const last = persisted.route[persisted.route.length - 1];
      if (last) {
        setCurrentLocation({
          latitude: last.latitude,
          longitude: last.longitude,
        });
      }
      setStatus(wasRunning ? 'running' : 'paused');
      if (wasRunning) {
        startTicker();
        await beginLocationTask();
      }
    } finally {
      setIsHydrating(false);
    }
  }, [startTicker]);

  return {
    status,
    elapsedMs,
    distanceM,
    route,
    currentLocation,
    isHydrating,
    refreshLocation,
    start,
    pause,
    resume,
    finish,
    hydrate,
  };
}