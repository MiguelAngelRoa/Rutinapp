'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppMode = 'entrenar' | 'runner';

/** First (home) tab shown in the bottom menu for the given mode. */
export function modeHomeRoute(mode: AppMode): '/routine' | '/runner' {
  return mode === 'runner' ? '/runner' : '/routine';
}

type ModeContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
};

const STORAGE_KEY = 'rutinapp:mode:v1';

const ModeContext = createContext<ModeContextValue | null>(null);

function parseMode(value: string | null): AppMode {
  return value === 'runner' ? 'runner' : 'entrenar';
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('entrenar');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active) setMode(parseMode(value));
      })
      .catch(() => {
        // Best-effort: keep the default mode.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Best-effort: the choice just won't persist.
    });
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}