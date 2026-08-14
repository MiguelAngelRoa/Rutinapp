export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type Routine = {
  name: string;
  exercises: Exercise[];
};

export type SavedRoutine = {
  id: string;
  name: string;
  exercises: Exercise[];
  updatedAt: number;
};

export type TimeOfDay = {
  hour: number;
  minute: number;
};

export type DayPlan = {
  routineId: string | null;
  /** Custom activity label that doesn't reference a saved routine, e.g. "Jiu Jitsu". */
  activity: string;
  startTime: TimeOfDay | null;
  isRest: boolean;
  notes: string;
};

export type WeekSchedule = DayPlan[];

/** Format identifier used when routines are shared/imported as files or links. */
export const ROUTINE_SHARE_FORMAT = 'rutinapp-routine' as const;

/** Versioned payload exchanged when sharing a routine. */
export type RoutineSharePayload = {
  format: typeof ROUTINE_SHARE_FORMAT;
  version: 1;
  routine: Routine;
};

export function isExercise(value: unknown): value is Exercise {
  if (typeof value !== 'object' || value == null) return false;
  const exercise = value as Partial<Exercise>;
  return (
    typeof exercise.id === 'string' &&
    typeof exercise.name === 'string' &&
    typeof exercise.sets === 'number' &&
    typeof exercise.reps === 'number' &&
    typeof exercise.restSeconds === 'number'
  );
}

export function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value == null) return false;
  const routine = value as Partial<Routine>;
  return (
    typeof routine.name === 'string' &&
    Array.isArray(routine.exercises) &&
    routine.exercises.every(isExercise)
  );
}

export const WEEKDAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export function createEmptyDayPlan(): DayPlan {
  return {
    routineId: null,
    activity: '',
    startTime: null,
    isRest: false,
    notes: '',
  };
}

export function createEmptyWeek(): WeekSchedule {
  return Array.from({ length: 7 }, () => createEmptyDayPlan());
}

/** JavaScript getDay() (0 = Sunday) mapped to a Monday-first index (0 = Lunes). */
export function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function createExercise(partial: Partial<Exercise> = {}): Exercise {
  return {
    id: partial.id ?? createId(),
    name: partial.name ?? '',
    sets: partial.sets ?? 3,
    reps: partial.reps ?? 10,
    restSeconds: partial.restSeconds ?? 60,
  };
}

export function createRoutine(name: string, exercises: Exercise[]): SavedRoutine {
  return {
    id: createId(),
    name,
    exercises: exercises.map((exercise) => ({ ...exercise })),
    updatedAt: Date.now(),
  };
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_ROUTINE: Routine = {
  name: 'Mi rutina',
  exercises: [],
};
