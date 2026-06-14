import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkoutTimer } from '../../contexts/WorkoutTimerContext';
import { FONTS } from '../../constants/theme';

const TAB_BAR_HEIGHT = 58;

const P = {
  cta: '#2596BE',
  ctaDark: '#1A6E8A',
  ctaDeep: '#0F4A5E',
  sun: '#F5C842',
  ink: '#04282B',
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function FloatingTimerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    activeWorkoutId,
    workoutElapsed,
    restTimer,
    restRunning,
    isWorkoutActive,
  } = useWorkoutTimer();

  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const prevActive = useRef(false);

  const isWorkoutScreen = pathname.startsWith('/daily/');
  const bottomOffset = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 4;

  useEffect(() => {
    if (isWorkoutActive && !isWorkoutScreen && !prevActive.current) {
      slideAnim.setValue(80);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if ((!isWorkoutActive || isWorkoutScreen) && prevActive.current) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevActive.current = isWorkoutActive && !isWorkoutScreen;
  }, [isWorkoutActive, isWorkoutScreen]);

  if (!isWorkoutActive || isWorkoutScreen) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/daily/${activeWorkoutId}` as any)}
        style={[
          styles.pill,
          {
            backgroundColor: isDark ? colors.card : P.cta,
            borderColor: isDark ? colors.border : P.ctaDark,
            borderWidth: isDark ? 1 : 1,
            shadowColor: isDark ? 'transparent' : P.ctaDeep,
          },
        ]}
      >
        {/* WORKOUT */}
        <View style={styles.segment}>
          <View style={[styles.iconBox, { backgroundColor: P.sun }]}>
            <Ionicons name="timer" size={14} color={isDark ? P.ink : '#FFF'} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>WORKOUT</Text>
            <Text style={[styles.value, { color: isDark ? colors.text : '#FFF' }]}>{formatTime(workoutElapsed)}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.16)' }]} />

        {/* REST */}
        <View style={styles.segment}>
          <View style={[styles.iconBox, { backgroundColor: restTimer === 0 && restRunning ? '#EF4444' : P.ctaDark }]}>
            <Ionicons
              name={restTimer === 0 && restRunning ? 'alert-circle' : 'cafe'}
              size={14}
              color="#FFF"
            />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.label, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>REST</Text>
            <Text
              style={[
                styles.value,
                { color: isDark ? colors.text : '#FFF' },
                restTimer === 0 && restRunning ? { color: '#EF4444' } : null,
              ]}
            >
              {formatTime(restTimer)}
            </Text>
          </View>
        </View>

        {/* Tap indicator */}
        <View style={styles.tapHint}>
          <Ionicons name="chevron-up" size={14} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.5)'} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 8,
  },
  tapHint: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
