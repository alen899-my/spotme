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
import { MachineConfig } from '../types';
import { MACHINE_WEIGHTS_KG, getPlateOptions, plateConfigFromSideWeight } from '../equipmentUtils';
import { PlateChip } from './PlateChip';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// Realistic Selectorized Machine Weight Stack SVG
// ─────────────────────────────────────────────────────────────────────────────

interface MachineStackSvgProps {
  selectedKg: number;
  isImperial: boolean;
  width: number;
}

const MachineStackSvg = React.memo(({
  selectedKg, isImperial, width: svgWidth,
}: MachineStackSvgProps) => {
  const viewBoxWidth = 360;
  const viewBoxHeight = 220;

  // We display 12 stack plates centered in the tower
  const stackPlates = useMemo(() => {
    return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130];
  }, []);

  // Find index of plate closest to selectedKg
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
  }, [selectedKg, stackPlates]);

  const STACK_X = 110;
  const STACK_W = 140;
  const PLATE_H = 11;
  const PLATE_GAP = 2;
  const STACK_START_Y = 56;
  const ROD_L_X = STACK_X + 22;
  const ROD_R_X = STACK_X + STACK_W - 22;

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        {/* Chrome Guide Rod Gradient */}
        <LinearGradient id="chromeRod" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4b5563" />
          <Stop offset="0.3" stopColor="#d1d5db" />
          <Stop offset="0.6" stopColor="#f3f4f6" />
          <Stop offset="0.85" stopColor="#9ca3af" />
          <Stop offset="1" stopColor="#374151" />
        </LinearGradient>
        {/* Cast Iron Stack Plate Gradient */}
        <LinearGradient id="stackPlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#374151" />
          <Stop offset="0.3" stopColor="#1f2937" />
          <Stop offset="0.75" stopColor="#18202b" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
        {/* Active Plate Gradient */}
        <LinearGradient id="activeStackPlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1d4ed8" />
          <Stop offset="0.4" stopColor="#0284c7" />
          <Stop offset="1" stopColor="#0369a1" />
        </LinearGradient>
        {/* Steel Cable Gradient */}
        <LinearGradient id="cableGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#64748b" />
          <Stop offset="0.5" stopColor="#e2e8f0" />
          <Stop offset="1" stopColor="#475569" />
        </LinearGradient>
        {/* Pulley Wheel */}
        <LinearGradient id="pulleyWheel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#334155" />
          <Stop offset="0.5" stopColor="#0f172a" />
          <Stop offset="1" stopColor="#1e293b" />
        </LinearGradient>
        {/* Pin Knob (Bright Yellow / Neon) */}
        <LinearGradient id="pinKnob" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fde047" />
          <Stop offset="0.7" stopColor="#eab308" />
          <Stop offset="1" stopColor="#a16207" />
        </LinearGradient>
      </Defs>

      {/* Frame Uprights (Tower structure) */}
      <Rect x={80} y={16} width={8} height={196} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
      <Rect x={272} y={16} width={8} height={196} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
      {/* Top Crossbar */}
      <Rect x={76} y={14} width={208} height={12} rx={3} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
      {/* Bottom Base */}
      <Rect x={72} y={204} width={216} height={12} rx={3} fill="#0f172a" />

      {/* Top Pulley Wheel & Bracket */}
      <Rect x={170} y={12} width={20} height={14} fill="#0f172a" rx={2} />
      <Circle cx={180} cy={26} r={14} fill="url(#pulleyWheel)" stroke="#475569" strokeWidth={1.5} />
      <Circle cx={180} cy={26} r={5} fill="#94a3b8" />

      {/* Chrome Dual Guide Rods */}
      <Rect x={ROD_L_X - 3} y={26} width={6} height={178} rx={2} fill="url(#chromeRod)" />
      <Rect x={ROD_R_X - 3} y={26} width={6} height={178} rx={2} fill="url(#chromeRod)" />

      {/* Steel Cable running down from pulley into center selector stem */}
      <Line x1={180} y1={26} x2={180} y2={STACK_START_Y + selectedIdx * (PLATE_H + PLATE_GAP)} stroke="url(#cableGrad)" strokeWidth={2.5} />

      {/* Stack Plates */}
      {stackPlates.map((w, idx) => {
        const y = STACK_START_Y + idx * (PLATE_H + PLATE_GAP);
        const isActive = idx === selectedIdx;
        const isAboveActive = idx < selectedIdx;

        return (
          <G key={`stack-${w}`}>
            {/* Plate Body */}
            <Rect
              x={STACK_X}
              y={y}
              width={STACK_W}
              height={PLATE_H}
              rx={2.5}
              fill={isActive ? 'url(#activeStackPlate)' : 'url(#stackPlate)'}
              stroke={isActive ? '#38bdf8' : '#293548'}
              strokeWidth={isActive ? 1.2 : 0.8}
            />

            {/* Guide Rod cutouts */}
            <Circle cx={ROD_L_X} cy={y + PLATE_H / 2} r={3.6} fill="#0f172a" />
            <Circle cx={ROD_R_X} cy={y + PLATE_H / 2} r={3.6} fill="#0f172a" />

            {/* Center Selector Pin Hole */}
            <Circle
              cx={STACK_X + STACK_W / 2}
              cy={y + PLATE_H / 2}
              r={3}
              fill={isActive ? '#0284c7' : '#090d13'}
              stroke="#475569"
              strokeWidth={0.5}
            />

            {/* Weight Stamp Label */}
            <SvgText
              x={STACK_X + 10}
              y={y + PLATE_H - 2.5}
              fontFamily="sans-serif"
              fontSize={7.5}
              fontWeight="bold"
              fill={isActive ? '#ffffff' : '#94a3b8'}
            >
              {w}
            </SvgText>

            {/* Magnetic Selector Pin at Active Index */}
            {isActive && (
              <G>
                {/* Pin Shaft entering center hole from right */}
                <Line
                  x1={STACK_X + STACK_W / 2}
                  y1={y + PLATE_H / 2}
                  x2={STACK_X + STACK_W + 12}
                  y2={y + PLATE_H / 2}
                  stroke="#e2e8f0"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* High-visibility Yellow Knob */}
                <Circle
                  cx={STACK_X + STACK_W + 14}
                  cy={y + PLATE_H / 2}
                  r={6}
                  fill="url(#pinKnob)"
                  stroke="#78350f"
                  strokeWidth={1}
                />
                {/* Lanyard coil */}
                <Path
                  d={`M ${STACK_X + STACK_W + 14} ${y + PLATE_H / 2 + 6} Q ${STACK_X + STACK_W + 22} ${y + PLATE_H / 2 + 18} ${STACK_X + STACK_W + 10} ${y + PLATE_H / 2 + 24}`}
                  stroke="#eab308"
                  strokeWidth={1.2}
                  fill="none"
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
// MachineBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface MachineBuilderProps {
  initialConfig: MachineConfig;
  onWeightChange: (weightKg: number) => void;
}

const MachineBuilder = React.memo(({ initialConfig, onWeightChange }: MachineBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [selectedKg, setSelectedKg] = useState<number>(initialConfig.selectedWeightKg || 40);

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
      const next = Math.min(250, Math.round((prev + plateWeightKg) * 10) / 10);
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
      const next = Math.max(0, Math.min(250, Math.round((prev + deltaKg) * 10) / 10));
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
            {displayVal} {unit.toUpperCase()} · PIN SELECTOR
          </Text>
        </View>

        <MachineStackSvg
          selectedKg={selectedKg}
          isImperial={isImperial}
          width={svgWidth}
        />
      </View>

      {/* Weight Selector Card - Plate Chips like for Barbell */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Insert weight plates
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} loaded on machine
            </Text>
          </View>

          {/* Micro stepper */}
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

        {/* Quick Stack Presets */}
        <View style={styles.quickPresetHead}>
          <Text style={[styles.quickPresetTitle, { color: isDark ? '#929ba5' : '#64748B' }]}>
            Quick stack presets
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
          {MACHINE_WEIGHTS_KG.slice(0, 16).map(kg => {
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

export default MachineBuilder;

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
