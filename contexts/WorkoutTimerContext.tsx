import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { getToken } from '../utils/tokenStorage';

interface WorkoutTimerContextType {
  activeWorkoutId: string | null;
  workoutElapsed: number;
  restTimer: number;
  restRunning: boolean;
  isWorkoutActive: boolean;
  startWorkoutSession: (id: string, existingElapsed?: number, existingIdle?: number) => void;
  endWorkoutSession: () => void;
  startRestTimer: (seconds: number) => Promise<void>;
  stopRestTimer: () => void;
  pauseIdleTimer: () => void;
  resumeIdleTimer: () => void;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType>({
  activeWorkoutId: null,
  workoutElapsed: 0,
  restTimer: 0,
  restRunning: false,
  isWorkoutActive: false,
  startWorkoutSession: () => {},
  endWorkoutSession: () => {},
  startRestTimer: async () => {},
  stopRestTimer: () => {},
  pauseIdleTimer: () => {},
  resumeIdleTimer: () => {},
});

export const WorkoutTimerProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);

  const workoutStartedAtRef = useRef<number>(Date.now());
  const workoutTimerRef = useRef<any>(null);
  const restTimerRef = useRef<any>(null);
  const restTimerEndAtRef = useRef<number>(Date.now());

  // Idle timer tracking
  const idleAccumulatedRef = useRef<number>(0);
  const idlePeriodStartRef = useRef<number | null>(null);

  const startWorkoutTimer = useCallback(() => {
    if (workoutTimerRef.current) return;
    workoutTimerRef.current = setInterval(() => {
      setWorkoutElapsed(Math.floor((Date.now() - workoutStartedAtRef.current) / 1000));
      if (idlePeriodStartRef.current !== null) {
        const currentPeriod = Math.floor((Date.now() - idlePeriodStartRef.current) / 1000);
        setIdleAccumulated(idleAccumulatedRef.current + currentPeriod);
      }
      }, 5000);
  }, []);

  const stopWorkoutTimer = useCallback(() => {
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
  }, []);

  const getCurrentIdle = useCallback(() => {
    if (idlePeriodStartRef.current !== null) {
      const currentPeriod = Math.floor((Date.now() - idlePeriodStartRef.current) / 1000);
      return idleAccumulatedRef.current + currentPeriod;
    }
    return idleAccumulatedRef.current;
  }, []);

  const [idleAccumulated, setIdleAccumulated] = useState(0);

  const flushIdlePeriod = useCallback(() => {
    if (idlePeriodStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - idlePeriodStartRef.current) / 1000);
      idleAccumulatedRef.current += elapsed;
      idlePeriodStartRef.current = null;
    }
  }, []);

  const startWorkoutSession = useCallback((id: string, existingElapsed?: number, existingIdle?: number) => {
    setActiveWorkoutId(id);
    if (existingElapsed && existingElapsed > 0) {
      setWorkoutElapsed(existingElapsed);
      workoutStartedAtRef.current = Date.now() - (existingElapsed * 1000);
    } else {
      setWorkoutElapsed(0);
      workoutStartedAtRef.current = Date.now();
    }
    if (existingIdle && existingIdle > 0) {
      idleAccumulatedRef.current = existingIdle;
      setIdleAccumulated(existingIdle);
    } else {
      idleAccumulatedRef.current = 0;
      setIdleAccumulated(0);
    }
    // Start idle accumulation immediately (counts warmup/setup/talking)
    idlePeriodStartRef.current = Date.now();
    startWorkoutTimer();
  }, [startWorkoutTimer]);

  const endWorkoutSession = useCallback(() => {
    stopWorkoutTimer();
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    flushIdlePeriod();
    setActiveWorkoutId(null);
    setWorkoutElapsed(0);
    setRestTimer(0);
    setRestRunning(false);
    setIdleAccumulated(0);
    idleAccumulatedRef.current = 0;
    AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
  }, [stopWorkoutTimer, flushIdlePeriod]);

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestRunning(false);
    setRestTimer(0);
    AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
  }, []);

  const startRestTimer = useCallback(async (seconds: number) => {
    stopRestTimer();

    const endAt = Date.now() + (seconds * 1000);
    restTimerEndAtRef.current = endAt;
    setRestTimer(seconds);
    setRestRunning(true);
    await AsyncStorage.setItem('restTimerEndAt', String(endAt));

    restTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((restTimerEndAtRef.current - Date.now()) / 1000));
      setRestTimer(remaining);
      if (remaining <= 0) {
        if (restTimerRef.current) {
          clearInterval(restTimerRef.current);
          restTimerRef.current = null;
        }
        setRestRunning(false);
        AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
      }
    }, 1000);
  }, [stopRestTimer]);

  // Pause idle — call when user opens the set-logging modal
  const pauseIdleTimer = useCallback(() => {
    flushIdlePeriod();
    setIdleAccumulated(idleAccumulatedRef.current);
  }, [flushIdlePeriod]);

  // Resume idle — call when set is saved and modal closes
  const resumeIdleTimer = useCallback(() => {
    idlePeriodStartRef.current = Date.now();
  }, []);

  // Resume rest timer from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const savedEndAt = await AsyncStorage.getItem('restTimerEndAt');
      if (!savedEndAt) return;
      const endAt = parseInt(savedEndAt);
      const remaining = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      if (remaining <= 0) {
        AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
        return;
      }
      restTimerEndAtRef.current = endAt;
      setRestTimer(remaining);
      setRestRunning(true);
      restTimerRef.current = setInterval(() => {
        const rem = Math.max(0, Math.floor((restTimerEndAtRef.current - Date.now()) / 1000));
        setRestTimer(rem);
        if (rem <= 0) {
          if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          setRestRunning(false);
          AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
        }
      }, 1000);
    })();
  }, []);

  // AppState handler for foreground recalculation
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (activeWorkoutId) {
          setWorkoutElapsed(Math.floor((Date.now() - workoutStartedAtRef.current) / 1000));
        }
        if (restRunning) {
          const remaining = Math.max(0, Math.floor((restTimerEndAtRef.current - Date.now()) / 1000));
          setRestTimer(remaining);
          if (remaining <= 0) setRestRunning(false);
        }
        if (idlePeriodStartRef.current !== null) {
          const currentPeriod = Math.floor((Date.now() - idlePeriodStartRef.current) / 1000);
          setIdleAccumulated(idleAccumulatedRef.current + currentPeriod);
        }
      }
    });
    return () => subscription.remove();
  }, [activeWorkoutId, restRunning]);

  // Auto-sync to API every 15s
  useEffect(() => {
    if (!activeWorkoutId) return;
    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        const totalIdle = getCurrentIdle();
        await api.patch(`/daily/workouts/${activeWorkoutId}/metrics`, {
          total_duration_seconds: Math.floor((Date.now() - workoutStartedAtRef.current) / 1000),
          total_rest_seconds: totalIdle,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [activeWorkoutId, getCurrentIdle]);

  return (
    <WorkoutTimerContext.Provider
      value={{
        activeWorkoutId,
        workoutElapsed,
        restTimer,
        restRunning,
        isWorkoutActive: activeWorkoutId !== null,
        startWorkoutSession,
        endWorkoutSession,
        startRestTimer,
        stopRestTimer,
        pauseIdleTimer,
        resumeIdleTimer,
      }}
    >
      {children}
    </WorkoutTimerContext.Provider>
  );
};

export const useWorkoutTimer = () => useContext(WorkoutTimerContext);
