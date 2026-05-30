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
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#0F1923',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  pill: '#F1F5F9',
  activeBg: '#FFFFFF',
  iconCircle: '#EFF6FF',
  primary: '#2596BE',
  primaryDark: '#1a6e8a',
  error: '#EF4444',
  success: '#10B981',
};

const DARK_COLORS: ThemeColors = {
  // Pure black background — the hero of dark mode
  bg:           '#000000',
  // Elevated card surface — barely lifted zinc-950
  card:         '#0D0D0D',
  // Text
  text:         '#F1F5F9',
  textMuted:    'rgba(241,245,249,0.55)',
  textDim:      'rgba(241,245,249,0.30)',
  // Borders — subtle glass-like
  border:       'rgba(255,255,255,0.07)',
  // Inputs — one step above card
  inputBg:      '#1A1A1A',
  // Tab bar
  tabBar:       '#000000',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  // Misc surfaces
  pill:         '#111111',
  activeBg:     '#111111',
  iconCircle:   'rgba(37,150,190,0.18)',
  // Brand
  primary:      '#2596BE',
  primaryDark:  '#1a6e8a',
  error:        '#F87171',
  success:      '#34D399',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: DARK_COLORS,
  toggleTheme: () => {},
  isDark: true,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('dark');

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
