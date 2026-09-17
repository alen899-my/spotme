import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Line, G, Text as SvgText, Path,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import { CableConfig } from '../types';
import { CABLE_WEIGHTS_KG, getPlateOptions, plateConfigFromSideWeight } from '../equipmentUtils';
import { PlateChip } from './PlateChip';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Cable Column SVG
// ─────────────────────────────────────────────────────────────────────────────

interface CableColumnSvgProps {
  selectedKg: number;
  width: number;
}

const CableColumnSvg = React.memo(({ selectedKg, width: svgWidth }: CableColumnSvgProps) => {
  const viewBoxWidth = 360;
  const viewBoxHeight = 220;

  const stackPlates = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 90];

  const selectedIdx = useMemo(() => {
    let bestIdx = 0;
    let minDiff = Infinity;
    stackPlates.forEach((w, i) => {
      const diff = Math.abs(w - selectedKg);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [selectedKg]);

  const STACK_X = 80;
  const STACK_W = 110;
  const PLATE_H = 10;
  const PLATE_GAP = 2;
  const STACK_START_Y = 58;

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        <LinearGradient id="cableTower" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#1e293b" />
          <Stop offset="0.5" stopColor="#334155" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
        <LinearGradient id="cableRods" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4b5563" />
          <Stop offset="0.4" stopColor="#f3f4f6" />
          <Stop offset="1" stopColor="#374151" />
        </LinearGradient>
        <LinearGradient id="cablePlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#334155" />
          <Stop offset="0.4" stopColor="#1e293b" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
        <LinearGradient id="cableActivePlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0284c7" />
          <Stop offset="0.5" stopColor="#0369a1" />
          <Stop offset="1" stopColor="#075985" />
        </LinearGradient>
        <LinearGradient id="cablePin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fde047" />
          <Stop offset="1" stopColor="#ca8a04" />
        </LinearGradient>
        <LinearGradient id="wireGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#94a3b8" />
          <Stop offset="0.5" stopColor="#f1f5f9" />
          <Stop offset="1" stopColor="#64748b" />
        </LinearGradient>
      </Defs>

      {/* Outer Column Upright */}
      <Rect x={60} y={16} width={8} height={196} rx={3} fill="url(#cableTower)" />
      <Rect x={206} y={16} width={8} height={196} rx={3} fill="url(#cableTower)" />
      <Rect x={56} y={14} width={162} height={10} rx={3} fill="#0f172a" />
      <Rect x={52} y={204} width={170} height={12} rx={3} fill="#0f172a" />

      {/* Guide Rods */}
      <Rect x={STACK_X + 16} y={24} width={4} height={180} rx={2} fill="url(#cableRods)" />
      <Rect x={STACK_X + STACK_W - 20} y={24} width={4} height={180} rx={2} fill="url(#cableRods)" />

      {/* Top Main Pulley Wheel */}
      <Circle cx={135} cy={26} r={13} fill="#0f172a" stroke="#475569" strokeWidth={1.5} />
      <Circle cx={135} cy={26} r={4.5} fill="#94a3b8" />

      {/* Output Pulley on right column */}
      <Circle cx={256} cy={88} r={12} fill="#0f172a" stroke="#475569" strokeWidth={1.5} />
      <Circle cx={256} cy={88} r={4} fill="#94a3b8" />

      {/* Cable Wire: from weight stack -> top pulley -> carriage pulley -> handle */}
      <Line x1={135} y1={26} x2={135} y2={STACK_START_Y + selectedIdx * (PLATE_H + PLATE_GAP)} stroke="url(#wireGrad)" strokeWidth={2.4} />
      <Line x1={135} y1={13} x2={256} y2={76} stroke="url(#wireGrad)" strokeWidth={2.4} />
      <Line x1={256} y1={100} x2={294} y2={142} stroke="url(#wireGrad)" strokeWidth={2.4} />

      {/* Carabiner & D-Handle */}
      <G transform="translate(290, 138) rotate(35)">
        {/* Carabiner clip */}
        <Circle cx={4} cy={4} r={4.5} fill="none" stroke="#e2e8f0" strokeWidth={1.6} />
        {/* Handle web strap */}
        <Rect x={2} y={8} width={4} height={14} rx={1} fill="#0f172a" />
        {/* Handle grip bar */}
        <Rect x={-8} y={22} width={24} height={6} rx={3} fill="#475569" stroke="#94a3b8" strokeWidth={0.8} />
      </G>

      {/* Weight Stack Plates */}
      {stackPlates.map((w, idx) => {
        const y = STACK_START_Y + idx * (PLATE_H + PLATE_GAP);
        const isActive = idx === selectedIdx;

        return (
          <G key={`c-stack-${w}`}>
            <Rect
              x={STACK_X}
              y={y}
              width={STACK_W}
              height={PLATE_H}
              rx={2}
              fill={isActive ? 'url(#cableActivePlate)' : 'url(#cablePlate)'}
              stroke={isActive ? '#38bdf8' : '#334155'}
              strokeWidth={isActive ? 1.2 : 0.7}
            />

            {/* Guide Rod cutouts */}
            <Circle cx={STACK_X + 18} cy={y + PLATE_H / 2} r={3} fill="#0f172a" />
            <Circle cx={STACK_X + STACK_W - 18} cy={y + PLATE_H / 2} r={3} fill="#0f172a" />

            {/* Center Pin Hole */}
            <Circle cx={STACK_X + STACK_W / 2} cy={y + PLATE_H / 2} r={2.5} fill="#090d13" />

            {/* Plate Label */}
            <SvgText
              x={STACK_X + 8}
              y={y + PLATE_H - 2}
              fontFamily="sans-serif"
              fontSize={7}
              fontWeight="bold"
              fill={isActive ? '#ffffff' : '#94a3b8'}
            >
              {w}
            </SvgText>

            {/* Selector Pin */}
            {isActive && (
              <G>
                <Line
                  x1={STACK_X + STACK_W / 2}
                  y1={y + PLATE_H / 2}
                  x2={STACK_X + STACK_W + 10}
                  y2={y + PLATE_H / 2}
                  stroke="#e2e8f0"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                <Circle
                  cx={STACK_X + STACK_W + 11}
                  cy={y + PLATE_H / 2}
                  r={5}
                  fill="url(#cablePin)"
                  stroke="#854d0e"
                  strokeWidth={0.8}
                />
              </G>
            )}
          </G>
        );
      })}
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CableBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface CableBuilderProps {
  initialConfig: CableConfig;
  onWeightChange: (weightKg: number) => void;
}

const CableBuilder = React.memo(({ initialConfig, onWeightChange }: CableBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [selectedKg, setSelectedKg] = useState<number>(initialConfig.selectedWeightKg || 20);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 480)
      : Math.min(windowWidth - 32, 400);
    return Math.max(280, maxW);
  }, [windowWidth]);

  const availablePlates = useMemo(() => getPlateOptions(isImperial), [isImperial]);

  const plateCounts = useMemo(() => {
    return plateConfigFromSideWeight(selectedKg, availablePlates);
  }, [selectedKg, availablePlates]);

  const handleSelectWeight = useCallback((kg: number) => {
    setSelectedKg(kg);
    onWeightChange(kg);
  }, [onWeightChange]);

  const handleAddPlate = useCallback((plateWeightKg: number) => {
    setSelectedKg(prev => {
      const next = Math.min(180, Math.round((prev + plateWeightKg) * 10) / 10);
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const handleRemovePlate = useCallback((plateWeightKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0, Math.round((prev - plateWeightKg) * 10) / 10);
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const handleStep = useCallback((deltaKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0, Math.min(180, Math.round((prev + deltaKg) * 10) / 10));
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const displayVal = formatWeightValue(selectedKg, unitSystem);

  return (
    <View style={styles.container}>
      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: isDark ? '#070809' : '#EDE9FE', color: isDark ? '#929ba5' : '#6D28D9', borderColor: isDark ? '#22262a' : '#DDD6FE' }]}>
            {displayVal} {unit.toUpperCase()} · RATIO 1:1
          </Text>
        </View>

        <CableColumnSvg
          selectedKg={selectedKg}
          width={svgWidth}
        />
      </View>

      {/* Weight Selector Card - Plate Chips like Barbell */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Insert weight plates
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} cable load
            </Text>
          </View>

          {/* Stepper */}
          <View style={[styles.miniStepper, { backgroundColor: isDark ? '#171a1d' : '#F1F5F9', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? -0.5 * 0.453592 : -0.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
            >
              <Text style={[styles.miniStepBtnText, { color: isDark ? '#929ba5' : '#64748B' }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.miniStepVal, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>{displayVal}</Text>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? 0.5 * 0.453592 : 0.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Increase weight"
            >
              <Text style={[styles.miniStepBtnText, { color: '#16a9ff' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plate Chips Scroller with Steppers (+ / −) like Barbell */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {availablePlates.map(p => (
            <PlateChip
              key={p.weightKg}
              plate={p}
              quantity={plateCounts[p.weightKg] ?? 0}
              onAdd={() => handleAddPlate(p.weightKg)}
              onRemove={() => handleRemovePlate(p.weightKg)}
              isImperial={isImperial}
            />
          ))}
        </ScrollView>

        {/* Quick presets */}
        <View style={styles.quickPresetHead}>
          <Text style={[styles.quickPresetTitle, { color: isDark ? '#929ba5' : '#64748B' }]}>
            Quick presets
          </Text>
          {selectedKg > 0 && (
            <TouchableOpacity onPress={() => handleSelectWeight(0)}>
              <Text style={styles.clearBtnText}>Reset to 0</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {CABLE_WEIGHTS_KG.slice(0, 16).map(kg => {
            const isSelected = Math.abs(kg - selectedKg) < 0.2;
            const chipDisplay = formatWeightValue(kg, unitSystem);
            return (
              <TouchableOpacity
                key={kg}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(22, 169, 255, 0.12)'
                      : isDark ? '#171a1d' : '#F1F5F9',
                    borderColor: isSelected
                      ? '#16a9ff'
                      : isDark ? '#22262a' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSelectWeight(kg)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${chipDisplay} ${unit} preset`}
              >
                <Text style={[styles.presetChipNum, { color: isSelected ? '#16a9ff' : (isDark ? '#f5f7f8' : '#0F172A') }]}>
                  {chipDisplay}
                </Text>
                <Text style={[styles.presetChipUnit, { color: isDark ? '#626b75' : '#94A3B8' }]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

export default CableBuilder;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  secTitle: {
    fontFamily: FONTS.heading,
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  secNote: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 1,
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  miniStepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    lineHeight: 20,
  },
  miniStepVal: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    minWidth: 28,
    textAlign: 'center',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  quickPresetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  quickPresetTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  clearBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ef4444',
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  presetChipNum: {
    fontFamily: FONTS.heading,
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  presetChipUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
  },
  weightChip: {
    width: 62,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  weightChipNum: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  weightChipUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
});
