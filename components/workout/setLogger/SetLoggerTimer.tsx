import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONTS } from '../../../constants/theme';

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface SetLoggerTimerProps {
  setTimer: number;
  setTimerRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const SetLoggerTimer = React.memo(({
  setTimer,
  setTimerRunning,
  onToggle,
  onReset,
}: SetLoggerTimerProps) => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
      <View style={styles.durationRow}>
        <View style={styles.textWrap}>
          <Text style={[styles.durationLabel, { color: isDark ? '#626b75' : '#94A3B8' }]}>
            DURATION
          </Text>
          <Text style={[styles.durationNum, { color: setTimerRunning ? '#16a9ff' : (isDark ? '#f5f7f8' : '#0F172A') }]}>
            {formatClock(setTimer)}
          </Text>
        </View>

        <View style={styles.controlsWrap}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={setTimerRunning ? 'Pause timer' : 'Start timer'}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={setTimerRunning ? ['#0284c7', '#0369a1'] : ['#16a9ff', '#0090e3']}
              style={[styles.playBtnGrad, setTimerRunning && styles.playBtnActiveGlow]}
            >
              <Ionicons name={setTimerRunning ? 'pause' : 'play'} size={22} color="#04121c" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset timer"
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Ionicons name="refresh" size={14} color={isDark ? '#626b75' : '#94A3B8'} />
            <Text style={[styles.resetText, { color: isDark ? '#626b75' : '#94A3B8' }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default SetLoggerTimer;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textWrap: {
    justifyContent: 'center',
  },
  durationLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  durationNum: {
    fontFamily: FONTS.heading,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
  },
  controlsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    borderRadius: 26,
  },
  playBtnGrad: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActiveGlow: {
    shadowColor: '#16a9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  resetText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
  },
});
