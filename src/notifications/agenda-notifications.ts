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

export function buildAgendaNotifications(
  schedule: WeekSchedule,
  routines: SavedRoutine[],
): AgendaNotification[] {
  const result: AgendaNotification[] = [];

  schedule.forEach((day, dayIndex) => {
    if (day.isRest || !day.startTime) return;

    const time = formatTime12(day.startTime.hour, day.startTime.minute);

    if (day.routineId) {
      const routine = routines.find((item) => item.id === day.routineId);
      result.push({
        id: `agenda-${dayIndex}`,
        weekday: weekdayForScheduleIndex(dayIndex),
        hour: day.startTime.hour,
        minute: day.startTime.minute,
        title: '¡Hora de entrenar!',
        body: routine ? `${routine.name} a las ${time}` : `Entrenamiento a las ${time}`,
        data: { kind: 'agenda', dayIndex, routineId: day.routineId },
      });
      return;
    }

    const activity = (day.activity ?? '').trim();
    if (activity) {
      result.push({
        id: `agenda-${dayIndex}`,
        weekday: weekdayForScheduleIndex(dayIndex),
        hour: day.startTime.hour,
        minute: day.startTime.minute,
        title: `¡Hora de ${activity}!`,
        body: `Tienes ${activity} a las ${time}.`,
        data: { kind: 'agenda', dayIndex, routineId: null },
      });
    }
  });

  return result;
}
