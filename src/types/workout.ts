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

export function createExercise(partial: Partial<Exercise> = {}): Exercise {
  return {
    id: partial.id ?? createId(),
    name: partial.name ?? '',
    sets: partial.sets ?? 3,
    reps: partial.reps ?? 10,
    restSeconds: partial.restSeconds ?? 60,
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
