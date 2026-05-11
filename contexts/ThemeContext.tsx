import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  inputBg: string;
  tabBar: string;
  tabBarBorder: string;
  pill: string;
  activeBg: string;
  iconCircle: string;
  primary: string;
  primaryDark: string;
  error: string;
  success: string;
}

const LIGHT_COLORS: ThemeColors = {
  bg: '#FBFBFB',
  card: '#FFFFFF',
  text: '#111111',
  textMuted: '#666666',
  textDim: '#999999',
  border: '#EEEEEE',
  inputBg: '#F7F7F7',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5E5',
  pill: '#F9F9F9',
  activeBg: '#FFFFFF',
  iconCircle: '#F5F5F5',
  primary: '#E00000',
  primaryDark: '#8B0000',
  error: '#E00000',
  success: '#4CAF50',
};

const DARK_COLORS: ThemeColors = {
  bg: '#000000',
  card: '#000000',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.6)',
  textDim: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.12)',
  inputBg: '#09090b',
  tabBar: '#000000',
  tabBarBorder: 'rgba(255,255,255,0.12)',
  pill: '#09090b',
  activeBg: '#111111',
  iconCircle: 'rgba(224,0,0,0.15)',
  primary: '#E00000',
  primaryDark: '#8B0000',
  error: '#E00000',
  success: '#4CAF50',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  isDark: false,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    } catch {}
  };

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      await AsyncStorage.setItem('app_theme', next);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: theme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
        toggleTheme,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
