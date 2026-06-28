import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnitSystem } from '../utils/units';

interface UnitContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  isMetric: boolean;
}

const UnitContext = createContext<UnitContextType>({
  unitSystem: 'metric',
  setUnitSystem: () => {},
  isMetric: true,
});

export const UnitProvider = ({ children }: { children: ReactNode }) => {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');

  useEffect(() => {
    loadUnitSystem();
  }, []);

  const loadUnitSystem = async () => {
    try {
      const saved = await AsyncStorage.getItem('unit_system');
      if (saved === 'metric' || saved === 'imperial') {
        setUnitSystemState(saved);
      }
    } catch {}
  };

  const setUnitSystem = async (system: UnitSystem) => {
    setUnitSystemState(system);
    try {
      await AsyncStorage.setItem('unit_system', system);
    } catch {}
  };

  return (
    <UnitContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        isMetric: unitSystem === 'metric',
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

export const useUnits = () => useContext(UnitContext);
