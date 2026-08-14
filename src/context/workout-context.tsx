'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createRoutine,
  DEFAULT_ROUTINE,
  createExercise,
  createEmptyWeek,
  isExercise,
  isRoutine,
  type DayPlan,
  type Exercise,
  type Routine,
  type SavedRoutine,
  type TimeOfDay,
  type WeekSchedule,
} from '@/types/workout';
import { localDateKey } from '@/utils/format';

const STORAGE_KEY = 'rutinapp:routines:v1';
const LEGACY_KEY = 'rutinapp:routine:v2';
const SCHEDULE_KEY = 'rutinapp:schedule:v1';
const ACTIVITIES_KEY = 'rutinapp:activities:v1';
const PLAN_DISMISSAL_KEY = 'rutinapp:dismissed-plan-date:v1';

type WorkoutContextValue = {
  routine: Routine;
  routines: SavedRoutine[];
  activeRoutineId: string | null;
  schedule: WeekSchedule;
  activities: string[];
  /** Local date (YYYY-MM-DD) for which the "Hoy toca" card was dismissed. */
  dismissedPlanDate: string | null;
  /** Routine awaiting confirmation before being imported (file or deep link). */
  pendingImport: Routine | null;
  updateRoutineName: (name: string) => void;
  addExercise: () => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  clearRoutine: () => void;
  updateDay: (index: number, patch: Partial<DayPlan>) => void;
  addActivity: (name: string) => void;
  saveRoutine: (name: string) => { id: string; overwrote: boolean };
  loadRoutine: (id: string) => void;
  deleteRoutine: (id: string) => void;
  importRoutine: (routine: Routine) => { id: string; overwrote: boolean };
  setPendingImport: (routine: Routine | null) => void;
  dismissTodayPlan: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function isSavedRoutine(value: unknown): value is SavedRoutine {
  if (typeof value !== 'object' || value == null) return false;
  const saved = value as Partial<SavedRoutine>;
  return (
    typeof saved.id === 'string' &&
    typeof saved.name === 'string' &&
    typeof saved.updatedAt === 'number' &&
    Array.isArray(saved.exercises) &&
    saved.exercises.every(isExercise)
  );
}

function parsePersisted(value: unknown): {
  routines: SavedRoutine[];
  activeRoutineId: string | null;
  workingRoutine: Routine;
} | null {
  if (typeof value !== 'object' || value == null) return null;
  const data = value as {
    routines?: unknown;
    activeRoutineId?: unknown;
    workingRoutine?: unknown;
  };
  if (!Array.isArray(data.routines) || data.routines.length === 0) return null;
  if (!data.routines.every(isSavedRoutine)) return null;
  if (!isRoutine(data.workingRoutine)) return null;
  const activeRoutineId =
    typeof data.activeRoutineId === 'string' &&
    data.routines.some((routine) => routine.id === data.activeRoutineId)
      ? data.activeRoutineId
      : data.routines[0].id;
  return {
    routines: data.routines,
    activeRoutineId,
    workingRoutine: data.workingRoutine,
  };
}

function isTimeOfDay(value: unknown): value is TimeOfDay {
  if (typeof value !== 'object' || value == null) return false;
  const time = value as Partial<TimeOfDay>;
  return (
    typeof time.hour === 'number' &&
    time.hour >= 0 &&
    time.hour <= 23 &&
    typeof time.minute === 'number' &&
    time.minute >= 0 &&
    time.minute <= 59
  );
}

function parseActivities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function isDayPlan(value: unknown): value is DayPlan {
  if (typeof value !== 'object' || value == null) return false;
  const day = value as Partial<DayPlan>;
  return (
    (day.routineId == null || typeof day.routineId === 'string') &&
    (day.activity == null || typeof day.activity === 'string') &&
    (day.startTime == null || isTimeOfDay(day.startTime)) &&
    typeof day.isRest === 'boolean' &&
    typeof day.notes === 'string'
  );
}

function parseSchedule(value: unknown): WeekSchedule | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  if (!value.every(isDayPlan)) return null;
  return value.map((day) => ({
    routineId: day.routineId,
    activity: day.activity ?? '',
    startTime: day.startTime,
    isRest: day.isRest,
    notes: day.notes,
  }));
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [routine, setRoutine] = useState<Routine>(DEFAULT_ROUTINE);
  const [routines, setRoutines] = useState<SavedRoutine[]>(() => [
    createRoutine(DEFAULT_ROUTINE.name, []),
  ]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WeekSchedule>(() => createEmptyWeek());
  const [activities, setActivities] = useState<string[]>([]);
  const [dismissedPlanDate, setDismissedPlanDate] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Routine | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      let nextRoutines: SavedRoutine[] = [createRoutine(DEFAULT_ROUTINE.name, [])];
      let nextActiveId: string | null = nextRoutines[0].id;
      let nextRoutine: Routine = { ...DEFAULT_ROUTINE };
      let nextSchedule: WeekSchedule = createEmptyWeek();
      let nextActivities: string[] = [];
      let nextDismissedPlanDate: string | null = null;

      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const restored = stored != null ? parsePersisted(JSON.parse(stored)) : null;
        if (restored) {
          nextRoutines = restored.routines;
          nextActiveId = restored.activeRoutineId;
          nextRoutine = restored.workingRoutine;
        } else {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          const legacyRoutine = legacy != null ? JSON.parse(legacy) : null;
          if (isRoutine(legacyRoutine)) {
            const seeded = createRoutine(legacyRoutine.name, legacyRoutine.exercises);
            nextRoutines = [seeded];
            nextActiveId = seeded.id;
            nextRoutine = { name: legacyRoutine.name, exercises: legacyRoutine.exercises };
          }
        }

        const scheduleStored = await AsyncStorage.getItem(SCHEDULE_KEY);
        const restoredSchedule =
          scheduleStored != null ? parseSchedule(JSON.parse(scheduleStored)) : null;
        if (restoredSchedule) nextSchedule = restoredSchedule;

        const activitiesStored = await AsyncStorage.getItem(ACTIVITIES_KEY);
        if (activitiesStored != null) {
          nextActivities = parseActivities(JSON.parse(activitiesStored));
        }

        const dismissalStored = await AsyncStorage.getItem(PLAN_DISMISSAL_KEY);
        if (dismissalStored != null && dismissalStored.length > 0) {
          nextDismissedPlanDate = dismissalStored;
        }
      } catch {
        // Corrupt or unreadable data: fall back to defaults.
      }

      if (active) {
        setRoutines(nextRoutines);
        setActiveRoutineId(nextActiveId);
        setRoutine(nextRoutine);
        setSchedule(nextSchedule);
        setActivities(nextActivities);
        setDismissedPlanDate(nextDismissedPlanDate);
        setIsHydrated(true);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const payload = { routines, activeRoutineId, workingRoutine: routine };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {
      // Ignore write failures: state stays in memory for this session.
    });
    AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule)).catch(() => {
      // Ignore write failures: state stays in memory for this session.
    });
    AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities)).catch(() => {
      // Ignore write failures: state stays in memory for this session.
    });
    AsyncStorage.setItem(PLAN_DISMISSAL_KEY, dismissedPlanDate ?? '').catch(() => {
      // Ignore write failures: state stays in memory for this session.
    });
  }, [routine, routines, activeRoutineId, schedule, activities, dismissedPlanDate, isHydrated]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      routine,
      routines,
      activeRoutineId,
      schedule,
      activities,
      dismissedPlanDate,
      pendingImport,
      updateRoutineName: (name) => setRoutine((current) => ({ ...current, name })),
      addExercise: () =>
        setRoutine((current) => ({
          ...current,
          exercises: [...current.exercises, createExercise()],
        })),
      removeExercise: (id) =>
        setRoutine((current) => ({
          ...current,
          exercises: current.exercises.filter((exercise) => exercise.id !== id),
        })),
      updateExercise: (id, patch) =>
        setRoutine((current) => ({
          ...current,
          exercises: current.exercises.map((exercise) =>
            exercise.id === id ? { ...exercise, ...patch } : exercise,
          ),
        })),
      clearRoutine: () =>
        setRoutine({ name: DEFAULT_ROUTINE.name, exercises: [] }),
      updateDay: (index, patch) =>
        setSchedule((current) =>
          current.map((day, i) => (i === index ? { ...day, ...patch } : day)),
        ),
      addActivity: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setActivities((current) =>
          current.includes(trimmed) ? current : [...current, trimmed],
        );
      },
      saveRoutine: (name) => {
        const trimmed = name.trim() || DEFAULT_ROUTINE.name;
        const existing = routines.find((item) => item.name === trimmed);
        if (existing) {
          const updated: SavedRoutine = {
            ...existing,
            name: trimmed,
            exercises: routine.exercises.map((exercise) => ({ ...exercise })),
            updatedAt: Date.now(),
          };
          setRoutines((current) =>
            current.map((item) => (item.id === existing.id ? updated : item)),
          );
          setActiveRoutineId(existing.id);
          return { id: existing.id, overwrote: true };
        }
        const created = createRoutine(trimmed, routine.exercises);
        setRoutines((current) => [...current, created]);
        setActiveRoutineId(created.id);
        return { id: created.id, overwrote: false };
      },
      loadRoutine: (id) => {
        const found = routines.find((item) => item.id === id);
        if (!found) return;
        setRoutine({ name: found.name, exercises: found.exercises.map((e) => ({ ...e })) });
        setActiveRoutineId(id);
      },
      deleteRoutine: (id) => {
        setRoutines((current) => current.filter((item) => item.id !== id));
        setActiveRoutineId((current) => (current === id ? null : current));
        setSchedule((current) =>
          current.map((day) => (day.routineId === id ? { ...day, routineId: null } : day)),
        );
      },
      importRoutine: (routine) => {
        const name = routine.name.trim() || DEFAULT_ROUTINE.name;
        const exercises = routine.exercises.map((exercise) => ({ ...exercise }));
        const existing = routines.find((item) => item.name === name);
        if (existing) {
          const updated: SavedRoutine = {
            ...existing,
            name,
            exercises,
            updatedAt: Date.now(),
          };
          setRoutines((current) =>
            current.map((item) => (item.id === existing.id ? updated : item)),
          );
          setActiveRoutineId(existing.id);
          setRoutine({ name, exercises });
          return { id: existing.id, overwrote: true };
        }
        const created = createRoutine(name, exercises);
        setRoutines((current) => [...current, created]);
        setActiveRoutineId(created.id);
        setRoutine({ name, exercises });
        return { id: created.id, overwrote: false };
      },
      setPendingImport,
      dismissTodayPlan: () => setDismissedPlanDate(localDateKey(new Date())),
    }),
    [routine, routines, activeRoutineId, schedule, activities, dismissedPlanDate, pendingImport],
  );

  if (!isHydrated) return null;

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
