import type { SavedRoutine, WeekSchedule } from '@/types/workout';
import { formatTime12 } from '@/utils/format';

export type AgendaNotification = {
  id: string;
  /** Calendar weekday for expo-notifications: 1 = Sunday ... 7 = Saturday. */
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
  data: { kind: 'agenda'; dayIndex: number; routineId: string | null };
};

/**
 * expo-notifications weekdays are 1-based with Sunday as 1 (matching
 * `Date.getDay()` + 1). Our schedule is Monday-first, so index 0 = Lunes.
 */
export function weekdayForScheduleIndex(index: number): number {
  return ((index + 1) % 7) + 1;
}

/** Minutes before an event start time that the reminder fires. */
const REMINDER_MINUTES = 30;

/**
 * Weekly slot for a reminder that fires `REMINDER_MINUTES` before the event.
 * Events starting inside the first `REMINDER_MINUTES` of the day roll the
 * reminder back to the previous weekday (e.g. Monday 00:00 -> Sunday 23:30).
 */
function reminderSlot(
  dayIndex: number,
  hour: number,
  minute: number,
): { weekday: number; hour: number; minute: number } {
  const minutesBefore = hour * 60 + minute - REMINDER_MINUTES;
  if (minutesBefore < 0) {
    return {
      weekday: weekdayForScheduleIndex((dayIndex + 6) % 7),
      hour: 23,
      minute: 60 + minutesBefore,
    };
  }
  return {
    weekday: weekdayForScheduleIndex(dayIndex),
    hour: Math.floor(minutesBefore / 60),
    minute: minutesBefore % 60,
  };
}

export function buildAgendaNotifications(
  schedule: WeekSchedule,
  routines: SavedRoutine[],
): AgendaNotification[] {
  const result: AgendaNotification[] = [];

  schedule.forEach((day, dayIndex) => {
    if (day.isRest) return;

    day.events.forEach((event) => {
      const slot = reminderSlot(dayIndex, event.startTime.hour, event.startTime.minute);
      const time = formatTime12(event.startTime.hour, event.startTime.minute);

      if (event.routineId) {
        const routine = routines.find((item) => item.id === event.routineId);
        result.push({
          id: `agenda-${dayIndex}-${event.id}`,
          weekday: slot.weekday,
          hour: slot.hour,
          minute: slot.minute,
          title: '¡Hora de entrenar!',
          body: routine ? `${routine.name} a las ${time}` : `Entrenamiento a las ${time}`,
          data: { kind: 'agenda', dayIndex, routineId: event.routineId },
        });
        return;
      }

      const activity = (event.activity ?? '').trim();
      if (activity) {
        result.push({
          id: `agenda-${dayIndex}-${event.id}`,
          weekday: slot.weekday,
          hour: slot.hour,
          minute: slot.minute,
          title: `¡Hora de ${activity}!`,
          body: `Tienes ${activity} a las ${time}.`,
          data: { kind: 'agenda', dayIndex, routineId: null },
        });
      }
    });
  });

  return result;
}
