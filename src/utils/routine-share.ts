import {
  isRoutine,
  ROUTINE_SHARE_FORMAT,
  type Routine,
  type RoutineSharePayload,
} from '@/types/workout';

export const ROUTINE_SHARE_MAX_BYTES = 1024 * 1024;
export const ROUTINE_SHARE_MAX_EXERCISES = 50;

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeRoutine(routine: Routine): Routine {
  return {
    name: routine.name.trim().slice(0, 80) || 'Rutina importada',
    exercises: routine.exercises.slice(0, ROUTINE_SHARE_MAX_EXERCISES).map((exercise) => ({
      ...exercise,
      name: exercise.name.trim().slice(0, 120),
      sets: clampInt(exercise.sets, 1, 20),
      reps: clampInt(exercise.reps, 1, 500),
      restSeconds: clampInt(exercise.restSeconds, 0, 60 * 60),
    })),
  };
}

/** Builds the shareable JSON string for a routine (export side). */
export function serializeRoutineToJson(routine: Routine): string {
  const payload: RoutineSharePayload = {
    format: ROUTINE_SHARE_FORMAT,
    version: 1,
    routine,
  };
  return JSON.stringify(payload);
}

/** Parses and validates a shared routine payload. Returns null if invalid. */
export function parseRoutineFromJson(json: string): Routine | null {
  if (typeof json !== 'string' || json.length === 0 || json.length > ROUTINE_SHARE_MAX_BYTES) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed == null) return null;
  const payload = parsed as Partial<RoutineSharePayload>;
  if (payload.format !== ROUTINE_SHARE_FORMAT) return null;
  if (payload.version !== 1) return null;
  if (!isRoutine(payload.routine)) return null;

  const routine = normalizeRoutine(payload.routine);
  if (routine.exercises.length === 0) return null;
  return routine;
}

/** Encodes a routine so it can be embedded in a deep link query string. */
export function encodeRoutineForLink(routine: Routine): string {
  return encodeURIComponent(serializeRoutineToJson(routine));
}

/** Decodes a routine embedded in a deep link query string. */
export function decodeRoutineFromLink(encoded: string): Routine | null {
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > 256 * 1024) {
    return null;
  }
  try {
    return parseRoutineFromJson(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}
