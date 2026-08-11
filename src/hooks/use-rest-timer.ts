import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type RestPhase = 'idle' | 'resting' | 'finished';

const REST_CHANNEL_ID = 'rest';

async function ensureRestChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
    name: 'Descanso entre series',
    description: 'Avisa cuando termina el descanso',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

function canPresent(permission: Notifications.NotificationPermissionsStatus): boolean {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensurePermission(): Promise<boolean> {
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'undetermined') {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  return canPresent(permission);
}

export function useRestTimer() {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduledNotificationRef = useRef<string | null>(null);
  const scheduleTokenRef = useRef(0);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      scheduleTokenRef.current += 1;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (scheduledNotificationRef.current) {
        Notifications.cancelScheduledNotificationAsync(
          scheduledNotificationRef.current,
        ).catch(() => {
          // Best-effort: nothing else to clean up.
        });
        scheduledNotificationRef.current = null;
      }
    };
  }, []);

  const scheduleRestFinishedNotification = useCallback(
    async (target: Date, token: number) => {
      if (Platform.OS === 'web') return;
      try {
        if (!(await ensurePermission())) return;
        await ensureRestChannel();
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '¡Descanso terminado!',
            body: 'Es hora de la siguiente serie.',
            data: { kind: 'rest' },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId: REST_CHANNEL_ID,
            date: target,
          },
        });
        if (scheduleTokenRef.current !== token) {
          // The rest was stopped/restarted while scheduling: discard it.
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {
            // Best-effort: the notification may already be cancelled.
          });
          return;
        }
        scheduledNotificationRef.current = id;
      } catch {
        // Best-effort: the rest timer works even without notifications.
      }
    },
    [],
  );

  const triggerRestFinishedNotification = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (!(await ensurePermission())) return;
      await ensureRestChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Descanso terminado!',
          body: 'Es hora de la siguiente serie.',
          data: { kind: 'rest' },
          sound: 'default',
        },
        trigger: null, // Trigger immediately
      });
    } catch {
      // Best-effort
    }
  }, []);

  const start = useCallback(
    (durationSeconds: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const endTimeMs = Date.now() + durationSeconds * 1000;
      endTimeRef.current = endTimeMs;
      setEndTime(endTimeMs);
      setNow(Date.now());
      intervalRef.current = setInterval(() => setNow(Date.now()), 250);
      scheduleRestFinishedNotification(
        new Date(endTimeMs),
        ++scheduleTokenRef.current,
      );
    },
    [scheduleRestFinishedNotification],
  );

  const stop = useCallback(() => {
    scheduleTokenRef.current += 1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const restAlreadyEnded =
      endTimeRef.current != null && Date.now() >= endTimeRef.current;
    endTimeRef.current = null;
    setEndTime(null);
    if (scheduledNotificationRef.current) {
      const id = scheduledNotificationRef.current;
      scheduledNotificationRef.current = null;
      if (!restAlreadyEnded) {
        // Only cancel while the rest is still running: if it already finished
        // the notification has fired (or is about to fire) and should stay.
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {
          // Best-effort: the notification may have already fired.
        });
      }
    }
  }, []);

  const finish = useCallback(() => {
    stop();
    triggerRestFinishedNotification();
  }, [stop, triggerRestFinishedNotification]);

  const phase: RestPhase = endTime == null ? 'idle' : now >= endTime ? 'finished' : 'resting';
  const remainingSeconds = endTime == null ? 0 : Math.max(0, Math.ceil((endTime - now) / 1000));

  return { phase, remainingSeconds, start, stop, finish };
}
