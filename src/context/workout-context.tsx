'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_ROUTINE, createExercise, type Exercise, type Routine } from '@/types/workout';

type WorkoutContextValue = {
  routine: Routine;
  updateRoutineName: (name: string) => void;
  addExercise: () => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  restoreRoutine: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [routine, setRoutine] = useState<Routine>(DEFAULT_ROUTINE);

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

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
