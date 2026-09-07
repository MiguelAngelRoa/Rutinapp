import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import {
  haversineMeters,
  type RunRoutePoint,
} from '@/services/run-storage';

export type RunnerStatus = 'idle' | 'running' | 'paused';

export type RunSnapshot = {
  elapsedMs: number;
  distanceM: number;
  route: RunRoutePoint[];
};

/** Minimum distance between two fixes to consider we actually moved.
 *  Filters out the +/-1m GPS noise while the runner stands still. */
const MIN_DISTANCE_M = 2;

export function useRunner() {
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [route, setRoute] = useState<RunRoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const lastPointRef = useRef<RunRoutePoint | null>(null);

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
  const totalElapsedMs = () =>
    accumulatedMsRef.current +
    (status === 'running' ? Date.now() - startedAtRef.current : 0);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      locationSubRef.current?.remove();
    };
  }, []);

  const startTicker = () => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      setElapsedMs(totalElapsedMs);
    }, 500);
  };

  const stopTicker = () => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  };

  const handleLocation = (location: Location.LocationObject) => {
    const coords = location.coords;
    setCurrentLocation(coords);
    const point: RunRoutePoint = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: totalElapsedMs(),
    };
    const last = lastPointRef.current;
    if (last) {
      const diff = haversineMeters(
        last.latitude,
        last.longitude,
        point.latitude,
        point.longitude,
      );
      if (diff < MIN_DISTANCE_M) return;
      setDistanceM((current) => current + diff);
      setRoute((currentRoute) => [...currentRoute, point]);
    } else {
      setRoute([point]);
    }
    lastPointRef.current = point;
  };

  const startLocationWatch = async () => {
    if (Platform.OS === 'web') return;
    locationSubRef.current?.remove();
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 3,
      },
      handleLocation,
      (_error) => {
        // GPS errors are transient; keep the run alive.
      },
    );
  };

  const stopWatches = () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  };

  const start = async () => {
    stopTicker();
    stopWatches();
    accumulatedMsRef.current = 0;
    lastPointRef.current = null;
    setElapsedMs(0);
    setDistanceM(0);
    setRoute([]);
    setStatus('running');
    startedAtRef.current = Date.now();
    startTicker();
    await startLocationWatch();
  };

  const pause = () => {
    if (status !== 'running') return;
    accumulatedMsRef.current = totalElapsedMs();
    stopTicker();
    stopWatches();
    setStatus('paused');
  };

  const resume = async () => {
    if (status !== 'paused') return;
    setStatus('running');
    startedAtRef.current = Date.now();
    startTicker();
    await startLocationWatch();
  };

  const finish = (): RunSnapshot => {
    const finalElapsed = totalElapsedMs();
    stopTicker();
    stopWatches();
    accumulatedMsRef.current = 0;
    lastPointRef.current = null;
    setStatus('idle');
    setElapsedMs(finalElapsed);
    return {
      elapsedMs: finalElapsed,
      distanceM,
      route,
    };
  };

  return {
    status,
    elapsedMs,
    distanceM,
    route,
    currentLocation,
    refreshLocation,
    start,
    pause,
    resume,
    finish,
  };
}