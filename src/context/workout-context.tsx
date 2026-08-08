'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_ROUTINE, createExercise, type Exercise, type Routine } from '@/types/workout';

const STORAGE_KEY = 'rutinapp:routine';

type WorkoutContextValue = {
  routine: Routine;
  updateRoutineName: (name: string) => void;
  addExercise: () => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  restoreRoutine: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value == null) return false;
  const routine = value as Partial<Routine>;
  return (
    typeof routine.name === 'string' &&
    Array.isArray(routine.exercises) &&
    routine.exercises.every(
      (exercise) =>
        typeof exercise === 'object' &&
        exercise != null &&
        typeof exercise.id === 'string' &&
        typeof exercise.name === 'string' &&
        typeof exercise.sets === 'number' &&
        typeof exercise.reps === 'number' &&
        typeof exercise.restSeconds === 'number',
    )
  );
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [routine, setRoutine] = useState<Routine>(DEFAULT_ROUTINE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || stored == null) return;
        const parsed: unknown = JSON.parse(stored);
        if (isRoutine(parsed)) setRoutine(parsed);
      })
      .catch(() => {
        // Corrupt or unreadable data: fall back to the default routine.
      })
      .finally(() => {
        if (active) setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routine)).catch(() => {
      // Ignore write failures: the routine stays in memory for this session.
    });
  }, [routine, isHydrated]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      routine,
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
      restoreRoutine: () => setRoutine(DEFAULT_ROUTINE),
    }),
    [routine],
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
