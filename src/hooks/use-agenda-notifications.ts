'use client';

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useWorkout } from '@/context/workout-context';
import { buildAgendaNotifications } from '@/notifications/agenda-notifications';

const CHANNEL_ID = 'agenda';

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

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return () => {
      Notifications.setNotificationHandler(null);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    const sync = async () => {
      if (!active) return;
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();

        const plans = buildAgendaNotifications(schedule, routines);
        if (plans.length === 0) return;

        await ensureChannel();
        let permission = await Notifications.getPermissionsAsync();
        if (permission.status === 'undetermined') {
          permission = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
        }
        if (!canPresent(permission) || !active) return;

        for (const plan of plans) {
          await Notifications.scheduleNotificationAsync({
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
        }
      } catch {
        // Notifications are best-effort: ignore permission or scheduling failures.
      }
    };

    sync();
    return () => {
      active = false;
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
