import { useEffect, useRef, useState } from 'react';

export type RestPhase = 'idle' | 'resting' | 'finished';

export function useRestTimer() {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const start = (durationSeconds: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setEndTime(Date.now() + durationSeconds * 1000);
    setNow(Date.now());
    intervalRef.current = setInterval(() => setNow(Date.now()), 250);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setEndTime(null);
  };

  const phase: RestPhase = endTime == null ? 'idle' : now >= endTime ? 'finished' : 'resting';
  const remainingSeconds = endTime == null ? 0 : Math.max(0, Math.ceil((endTime - now) / 1000));

  return { phase, remainingSeconds, start, stop };
}
