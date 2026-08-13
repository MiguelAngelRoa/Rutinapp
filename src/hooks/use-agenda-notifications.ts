'use client';

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useWorkout } from '@/context/workout-context';
import { buildAgendaNotifications } from '@/notifications/agenda-notifications';

const CHANNEL_ID = 'agenda';

// Set the global notification handler once at module load. It must never be
// cleared: if no handler is set, expo-notifications silently drops
// notifications received while the app is in the foreground (easy to hit in a
// dev client during reloads/Fast Refresh).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Rest-finish notifications are shown as native notifications even in
      // the foreground. Their sound is left to the in-app beep to avoid a
      // double alert; agenda notifications stay list-only as before.
      const isRest = notification.request.content.data?.kind === 'rest';
      return {
        shouldShowBanner: isRest,
        shouldShowList: true,
        shouldPlaySound: isRest ? false : true,
        shouldSetBadge: false,
      };
    },
  });
}

function canPresent(permission: Notifications.NotificationPermissionsStatus): boolean {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Agenda de entrenamiento',
    description: 'Recordatorios de tus entrenamientos y actividades',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export function useAgendaNotifications() {
  const { schedule, routines } = useWorkout();
  const scheduledIdsRef = useRef<Set<string>>(new Set());
  const syncTokenRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Create the channel before asking for permission: Android 13+ only shows
    // the notification prompt once at least one channel exists.
    const request = async () => {
      try {
        await ensureChannel();
        const permission = await Notifications.getPermissionsAsync();
        if (__DEV__) {
          console.log('[notifications] permission:', permission.status, 'granted=', permission.granted);
        }
        if (permission.status === 'undetermined') {
          const result = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
          if (__DEV__) {
            console.log('[notifications] permission after request:', result.status, 'granted=', result.granted);
          }
        }
      } catch (error) {
        // Best-effort: permission can also be granted later.
        if (__DEV__) {
          console.warn('[notifications] permission setup failed:', error);
        }
      }
    };
    request();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    const sync = async () => {
      if (!active) return;
      const token = ++syncTokenRef.current;
      try {
        // Only cancel the agenda reminders we scheduled last time, never all
        // notifications (that would also wipe the rest-finished alert).
        const previousIds = scheduledIdsRef.current;
        scheduledIdsRef.current = new Set();
        await Promise.all(
          [...previousIds].map((id) =>
            Notifications.cancelScheduledNotificationAsync(id).catch(() => {
              // Best-effort: the notification may already have fired.
            }),
          ),
        );

        const plans = buildAgendaNotifications(schedule, routines);
        if (__DEV__) {
          console.log(`[notifications] agenda plans: ${plans.length}`, plans);
        }
        if (plans.length === 0) return;

        await ensureChannel();
        let permission = await Notifications.getPermissionsAsync();
        if (permission.status === 'undetermined') {
          permission = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
        }
        if (__DEV__) {
          console.log('[notifications] scheduling, permission:', permission.status, 'granted=', permission.granted);
        }
        if (!canPresent(permission) || !active || token !== syncTokenRef.current) return;

        for (const plan of plans) {
          if (token !== syncTokenRef.current) break;
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: plan.title,
              body: plan.body,
              data: plan.data,
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              channelId: CHANNEL_ID,
              weekday: plan.weekday,
              hour: plan.hour,
              minute: plan.minute,
            },
          });
          if (token === syncTokenRef.current) {
            scheduledIdsRef.current.add(id);
          } else {
            Notifications.cancelScheduledNotificationAsync(id).catch(() => {
              // Best-effort: the notification may already have fired.
            });
          }
        }
        if (__DEV__) {
          console.log('[notifications] scheduled agenda reminders:', scheduledIdsRef.current.size);
          try {
            const all = await Notifications.getAllScheduledNotificationsAsync();
            console.log(
              '[notifications] total scheduled on device:',
              all.map((n) => n.identifier).join(', ') || 'NONE',
            );
          } catch (error) {
            console.warn('[notifications] could not list scheduled notifications:', error);
          }
        }
      } catch (error) {
        // Notifications are best-effort: ignore permission or scheduling failures.
        if (__DEV__) {
          console.warn('[notifications] sync failed:', error);
        }
      }
    };

    sync();
    return () => {
      active = false;
      syncTokenRef.current += 1;
    };
  }, [schedule, routines]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    const redirect = (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      if (response.notification.request.content.data?.kind !== 'agenda') return;
      router.navigate('/');
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (active && response) redirect(response);
      })
      .catch(() => {
        // Ignore: no initial notification response available.
      });

    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
