import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { getToken } from '../utils/tokenStorage';

interface WorkoutTimerContextType {
  activeWorkoutId: string | null;
  workoutElapsed: number;
  restTimer: number;
  restRunning: boolean;
  totalRestElapsed: number;
  isWorkoutActive: boolean;
  startWorkoutSession: (id: string, existingElapsed?: number, existingTotalRest?: number) => void;
  endWorkoutSession: () => void;
  startRestTimer: (seconds: number) => Promise<void>;
  stopRestTimer: () => void;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType>({
  activeWorkoutId: null,
  workoutElapsed: 0,
  restTimer: 0,
  restRunning: false,
  totalRestElapsed: 0,
  isWorkoutActive: false,
  startWorkoutSession: () => {},
  endWorkoutSession: () => {},
  startRestTimer: async () => {},
  stopRestTimer: () => {},
});

export const WorkoutTimerProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [totalRestElapsed, setTotalRestElapsed] = useState(0);

  const workoutStartedAtRef = useRef<number>(Date.now());
  const workoutTimerRef = useRef<any>(null);
  const restTimerRef = useRef<any>(null);
  const restTimerEndAtRef = useRef<number>(Date.now());
  const totalRestAccumulatedRef = useRef<number>(0);
  const totalRestPeriodStartRef = useRef<number | null>(null);

  const totalRestTimerRef = useRef<any>(null);

  const startWorkoutTimer = useCallback(() => {
    if (workoutTimerRef.current) return;
    // Tick both workout elapsed and total rest every second
    workoutTimerRef.current = setInterval(() => {
      setWorkoutElapsed(Math.floor((Date.now() - workoutStartedAtRef.current) / 1000));
      if (totalRestPeriodStartRef.current !== null) {
        const currentPeriod = Math.floor((Date.now() - totalRestPeriodStartRef.current) / 1000);
        setTotalRestElapsed(totalRestAccumulatedRef.current + currentPeriod);
      }
    }, 1000);
  }, []);

  const stopWorkoutTimer = useCallback(() => {
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
  }, []);

  const startWorkoutSession = useCallback((id: string, existingElapsed?: number, existingTotalRest?: number) => {
    const isResume = activeWorkoutId === id;
    if (!isResume) {
      setActiveWorkoutId(id);
      if (existingElapsed && existingElapsed > 0) {
        setWorkoutElapsed(existingElapsed);
        workoutStartedAtRef.current = Date.now() - (existingElapsed * 1000);
      } else {
        setWorkoutElapsed(0);
        workoutStartedAtRef.current = Date.now();
      }
      if (existingTotalRest && existingTotalRest > 0) {
        setTotalRestElapsed(existingTotalRest);
        totalRestAccumulatedRef.current = existingTotalRest;
      } else {
        setTotalRestElapsed(0);
        totalRestAccumulatedRef.current = 0;
      }
      totalRestPeriodStartRef.current = Date.now();
    }
    startWorkoutTimer();
  }, [activeWorkoutId, startWorkoutTimer]);

  const endWorkoutSession = useCallback(() => {
    stopWorkoutTimer();
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    // Finalize total rest
    if (totalRestPeriodStartRef.current !== null) {
      const elapsed = Math.floor((Date.now() - totalRestPeriodStartRef.current) / 1000);
      totalRestAccumulatedRef.current += elapsed;
      totalRestPeriodStartRef.current = null;
    }
    setActiveWorkoutId(null);
    setWorkoutElapsed(0);
    setRestTimer(0);
    setRestRunning(false);
    setTotalRestElapsed(0);
    totalRestAccumulatedRef.current = 0;
    AsyncStorage.multiRemove(['restTimerEndAt', 'restNotifId']).catch(() => {});
  }, [stopWorkoutTimer]);

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
        if (totalRestPeriodStartRef.current !== null) {
          const currentPeriod = Math.floor((Date.now() - totalRestPeriodStartRef.current) / 1000);
          setTotalRestElapsed(totalRestAccumulatedRef.current + currentPeriod);
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
        await axios.patch(`${API_URL}/daily/workouts/${activeWorkoutId}/metrics`, {
          total_duration_seconds: Math.floor((Date.now() - workoutStartedAtRef.current) / 1000),
          total_rest_seconds: totalRestPeriodStartRef.current !== null
            ? totalRestAccumulatedRef.current + Math.floor((Date.now() - totalRestPeriodStartRef.current) / 1000)
            : totalRestAccumulatedRef.current,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [activeWorkoutId]);

  return (
    <WorkoutTimerContext.Provider
      value={{
        activeWorkoutId,
        workoutElapsed,
        restTimer,
        restRunning,
        totalRestElapsed,
        isWorkoutActive: activeWorkoutId !== null,
        startWorkoutSession,
        endWorkoutSession,
        startRestTimer,
        stopRestTimer,
      }}
    >
      {children}
    </WorkoutTimerContext.Provider>
  );
};

export const useWorkoutTimer = () => useContext(WorkoutTimerContext);
