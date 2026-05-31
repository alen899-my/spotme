import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';

const STEP_OPTIONS = [0.1, 0.5, 1, 2.5, 5];
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { P, scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';

interface WeightScaleProps {
  value: number;
  onChange: (value: number) => void;
  onSave: () => void;
  saving?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const TICK_COUNT = 21;

export default function WeightScale({
  value,
  onChange,
  onSave,
  saving = false,
  min = 20,
  max = 300,
  step = 0.1,
}: WeightScaleProps) {
  const { colors, isDark } = useTheme();
  const digitAnim = useRef(new Animated.Value(0)).current;
  const prevValueRef = useRef(value);
  const [currentStep, setCurrentStep] = useState(step);
  const [pressedPlus, setPressedPlus] = useState(false);
  const [pressedMinus, setPressedMinus] = useState(false);
  const savePulse = useRef(new Animated.Value(1)).current;
  const platformShake = useRef(new Animated.Value(0)).current;

  // Digit flip animation on value change
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      Animated.sequence([
        Animated.timing(digitAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.spring(digitAnim, { toValue: 0, tension: 300, friction: 8, useNativeDriver: true }),
      ]).start();
      // Light platform shake
      Animated.sequence([
        Animated.timing(platformShake, { toValue: 2, duration: 50, useNativeDriver: true }),
        Animated.timing(platformShake, { toValue: -2, duration: 50, useNativeDriver: true }),
        Animated.timing(platformShake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  // Save button breathing
  useEffect(() => {
    if (!saving) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(savePulse, { toValue: 1.03, duration: 1400, useNativeDriver: true }),
          Animated.timing(savePulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [saving]);

  const cycleStep = useCallback(() => {
    setCurrentStep(prev => {
      const idx = STEP_OPTIONS.indexOf(prev);
      return STEP_OPTIONS[(idx + 1) % STEP_OPTIONS.length];
    });
  }, []);

  const adjust = (delta: number) => {
    const next = Math.round((value + delta) / currentStep) * currentStep;
    onChange(Math.max(min, Math.min(max, next)));
  };

  const progress = (value - min) / (max - min);
  const centerTick = Math.round(progress * (TICK_COUNT - 1));

  // LCD digit color
  const lcdBg = isDark ? '#0a1a14' : '#c8dcc8';
  const lcdText = isDark ? '#39ff8a' : '#1a4a2a';
  const lcdDim = isDark ? '#0d2a1d' : '#a8c4a8';

  // Platform colors
  const platformTop = isDark ? '#1a1a1a' : '#e8e8e8';
  const platformEdge = isDark ? '#111' : '#ccc';
  const platformShadow = isDark ? '#000' : '#aaa';

  return (
    <View style={styles.outerWrap}>
      {/* Scale Body */}
      <Animated.View style={[styles.scaleBody, { transform: [{ translateX: platformShake }] }]}>

        {/* LCD Display Panel */}
        <View style={[styles.displayPanel, { backgroundColor: isDark ? '#141414' : '#d0d0d0', borderColor: isDark ? '#2a2a2a' : '#b0b0b0' }]}>
          <LinearGradient
            colors={isDark ? ['#0a1a14', '#081510'] : ['#c8dcc8', '#b0ccb0']}
            style={styles.lcdScreen}
          >
            {/* LCD ghost digits (background) */}
            <Text style={[styles.lcdGhost, { color: lcdDim }]}>888.8</Text>
            {/* Real value */}
            <Animated.Text style={[styles.lcdValue, { color: lcdText, transform: [{ translateY: digitAnim }] }]}>
              {value.toFixed(1)}
            </Animated.Text>
            <Text style={[styles.lcdUnit, { color: lcdText }]}>kg</Text>
          </LinearGradient>

          {/* LCD label */}
          <View style={styles.displayFooter}>
            <View style={[styles.indicatorDot, { backgroundColor: saving ? '#f59e0b' : lcdText }]} />
            <Text style={[styles.displayLabel, { color: isDark ? '#555' : '#888' }]}>WEIGHT</Text>
            <Text style={[styles.displayLabel, { color: isDark ? '#555' : '#888' }]}>
              {saving ? 'SAVING' : 'READY'}
            </Text>
          </View>
        </View>

        {/* Tick ruler */}
        <View style={styles.rulerWrap}>
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            const isCenter = i === centerTick;
            const isMajor = i % 5 === 0;
            const dist = Math.abs(i - centerTick);
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.7 : dist === 2 ? 0.4 : 0.15;
            return (
              <View key={i} style={styles.tickCol}>
                <View
                  style={[
                    styles.tick,
                    {
                      height: isMajor ? scale(18) : isCenter ? scale(26) : scale(12),
                      backgroundColor: isCenter
                        ? colors.primary
                        : isDark ? '#444' : '#999',
                      width: isCenter ? 2.5 : isMajor ? 1.5 : 1,
                      opacity,
                    },
                  ]}
                />
              </View>
            );
          })}
          {/* Center needle */}
          <View style={[styles.needle, { borderBottomColor: colors.primary }]} />
        </View>

        {/* Range labels */}
        <View style={styles.rangeRow}>
          <Text style={[styles.rangeLabel, { color: isDark ? '#444' : '#aaa' }]}>{min}</Text>
          <Text style={[styles.rangeLabel, { color: colors.primary, fontFamily: FONTS.bodyBold }]}>
            {value.toFixed(1)} kg
          </Text>
          <Text style={[styles.rangeLabel, { color: isDark ? '#444' : '#aaa' }]}>{max}</Text>
        </View>

        {/* Control buttons */}
        <View style={styles.controlRow}>
          {/* − button */}
          <Pressable
            onPressIn={() => setPressedMinus(true)}
            onPressOut={() => setPressedMinus(false)}
            onPress={() => adjust(-currentStep)}
            style={({ pressed }) => [
              styles.physBtn,
              {
                backgroundColor: isDark ? '#1c1c1c' : '#d8d8d8',
                borderColor: isDark ? '#333' : '#b8b8b8',
                transform: [{ translateY: pressed || pressedMinus ? 3 : 0 }],
                shadowOffset: { width: 0, height: pressed || pressedMinus ? 1 : 4 },
                shadowOpacity: pressed || pressedMinus ? 0.1 : 0.3,
              },
            ]}
          >
            <LinearGradient
              colors={isDark
                ? pressedMinus ? ['#222', '#1a1a1a'] : ['#2a2a2a', '#1c1c1c']
                : pressedMinus ? ['#c8c8c8', '#d0d0d0'] : ['#e0e0e0', '#c8c8c8']}
              style={styles.physBtnInner}
            >
              <Ionicons name="remove" size={scale(22)} color={isDark ? colors.primary : P.ctaDark} />
              <Text style={[styles.physBtnLabel, { color: isDark ? '#666' : '#aaa' }]}>-{currentStep.toFixed(1)}</Text>
            </LinearGradient>
          </Pressable>

          {/* Step selector — tap to cycle */}
          <Pressable onPress={cycleStep} style={[styles.stepPanel, { backgroundColor: isDark ? '#0f0f0f' : '#e0e0e0', borderColor: isDark ? '#222' : '#c0c0c0' }]}>
            <Text style={[styles.stepLabel, { color: isDark ? '#555' : '#999' }]}>STEP</Text>
            <Text style={[styles.stepValue, { color: colors.primary }]}>{currentStep.toFixed(1)}</Text>
            <Text style={[styles.stepHint, { color: isDark ? '#444' : '#bbb' }]}>tap</Text>
          </Pressable>

          {/* + button */}
          <Pressable
            onPressIn={() => setPressedPlus(true)}
            onPressOut={() => setPressedPlus(false)}
            onPress={() => adjust(currentStep)}
            style={({ pressed }) => [
              styles.physBtn,
              {
                backgroundColor: isDark ? '#1c1c1c' : '#d8d8d8',
                borderColor: isDark ? '#333' : '#b8b8b8',
                transform: [{ translateY: pressed || pressedPlus ? 3 : 0 }],
                shadowOffset: { width: 0, height: pressed || pressedPlus ? 1 : 4 },
                shadowOpacity: pressed || pressedPlus ? 0.1 : 0.3,
              },
            ]}
          >
            <LinearGradient
              colors={isDark
                ? pressedPlus ? ['#222', '#1a1a1a'] : ['#2a2a2a', '#1c1c1c']
                : pressedPlus ? ['#c8c8c8', '#d0d0d0'] : ['#e0e0e0', '#c8c8c8']}
              style={styles.physBtnInner}
            >
              <Ionicons name="add" size={scale(22)} color={isDark ? colors.primary : P.ctaDark} />
              <Text style={[styles.physBtnLabel, { color: isDark ? '#666' : '#aaa' }]}>+{currentStep.toFixed(1)}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Log button */}
        <Animated.View style={[styles.logBtnWrap, { transform: [{ scale: saving ? 1 : savePulse }] }]}>
          <TouchableOpacity onPress={onSave} disabled={saving} activeOpacity={0.85} style={styles.logBtnTouch}>
            <LinearGradient
              colors={saving
                ? [isDark ? '#333' : '#bbb', isDark ? '#222' : '#aaa']
                : [colors.primary, colors.primaryDark || '#1a6e8a']}
              style={styles.logBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.logBtnInner}>
                <Ionicons
                  name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'}
                  size={scale(20)}
                  color="#fff"
                />
                <Text style={styles.logBtnText}>
                  {saving ? 'Saving...' : 'Save Weight'}
                </Text>
              </View>
              {/* Button ridge detail */}
              <View style={styles.logBtnRidge} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Platform base shadow/edge */}
        <View style={[styles.platformEdge, { backgroundColor: isDark ? '#0a0a0a' : '#c0c0c0' }]} />
      </Animated.View>

      {/* Foot shadow */}
      <View style={[styles.footShadow, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    alignItems: 'center',
    width: '100%',
  },
  scaleBody: {
    width: '100%',
    borderRadius: scale(20),
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  displayPanel: {
    borderRadius: scale(16),
    borderWidth: 1,
    margin: scale(2),
    marginBottom: 0,
    overflow: 'hidden',
  },
  lcdScreen: {
    paddingVertical: vs(18),
    paddingHorizontal: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lcdGhost: {
    position: 'absolute',
    fontFamily: FONTS.heading,
    fontSize: scale(58),
    letterSpacing: 4,
    opacity: 0.3,
  },
  lcdValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(58),
    letterSpacing: 2,
    lineHeight: scale(64),
  },
  lcdUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(16),
    letterSpacing: 2,
    marginTop: vs(-4),
    opacity: 0.7,
  },
  displayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: vs(6),
  },
  indicatorDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  displayLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    letterSpacing: 2,
  },
  rulerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: vs(14),
    paddingBottom: vs(4),
    position: 'relative',
  },
  tickCol: {
    flex: 1,
    alignItems: 'center',
  },
  tick: {
    borderRadius: 1,
  },
  needle: {
    position: 'absolute',
    bottom: vs(4),
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: scale(10),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: vs(14),
  },
  rangeLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    letterSpacing: 0.5,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    gap: scale(10),
    marginBottom: vs(14),
  },
  physBtn: {
    flex: 1,
    borderRadius: scale(14),
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowRadius: 0,
    elevation: 4,
    overflow: 'hidden',
  },
  physBtnInner: {
    paddingVertical: vs(14),
    alignItems: 'center',
    gap: vs(2),
  },
  physBtnLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    letterSpacing: 1,
  },
  stepPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: vs(12),
    borderRadius: scale(12),
    borderWidth: 1,
    gap: vs(2),
  },
  stepLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    letterSpacing: 2,
  },
  stepValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    letterSpacing: 1,
  },
  stepHint: {
    fontFamily: FONTS.body,
    fontSize: scale(8),
    letterSpacing: 1,
    marginTop: vs(1),
  },
  logBtnWrap: {
    marginHorizontal: scale(16),
    marginBottom: vs(16),
    borderRadius: scale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logBtnTouch: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  logBtn: {
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(14),
    position: 'relative',
  },
  logBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  logBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    color: '#fff',
    letterSpacing: 2,
  },
  logBtnRidge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: scale(14),
    borderTopRightRadius: scale(14),
  },
  platformEdge: {
    height: scale(10),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    marginHorizontal: scale(4),
    marginTop: -scale(2),
  },
  footShadow: {
    width: '80%',
    height: scale(10),
    borderRadius: scale(10),
    marginTop: vs(2),
  },
});