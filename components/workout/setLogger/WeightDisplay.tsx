import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONTS } from '../../../constants/theme';
import { WeightCalculationResult } from './types';

interface WeightDisplayProps {
  result: WeightCalculationResult;
  isBodyweight: boolean;
  isCardio: boolean;
}

const WeightDisplay = React.memo(({ result, isBodyweight, isCardio }: WeightDisplayProps) => {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevWeight = useRef(result.totalWeightKg);

  useEffect(() => {
    if (prevWeight.current !== result.totalWeightKg) {
      prevWeight.current = result.totalWeightKg;
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [result.totalWeightKg]);

  if (isBodyweight || isCardio) return null;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
      <View style={styles.row}>
        {/* Left: Total Weight Number */}
        <View style={styles.left}>
          <Text style={[styles.label, { color: isDark ? '#626b75' : '#94A3B8' }]}>
            TOTAL WEIGHT
          </Text>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text style={[styles.val, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              {result.displayWeight}
            </Text>
          </Animated.View>
        </View>

        {/* Right: Breakdown Details */}
        {result.details ? (
          <View style={styles.right}>
            <Text style={[styles.breakdown, { color: isDark ? '#929ba5' : '#64748B' }]}>
              {result.details}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export default WeightDisplay;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  val: {
    fontFamily: FONTS.heading,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.2,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  breakdown: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'right',
  },
});
