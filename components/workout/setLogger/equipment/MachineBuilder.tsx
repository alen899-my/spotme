import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Line, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import { MachineConfig } from '../types';
import {
  MACHINE_STACK_WEIGHTS_KG,
  MACHINE_STACK_WEIGHTS_LBS,
  LB_TO_KG,
} from '../equipmentUtils';
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

  // 12 stack plates centered in the tower
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
        <LinearGradient id="chromeRod" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4b5563" />
          <Stop offset="0.3" stopColor="#d1d5db" />
          <Stop offset="0.6" stopColor="#f3f4f6" />
          <Stop offset="0.85" stopColor="#9ca3af" />
          <Stop offset="1" stopColor="#374151" />
        </LinearGradient>
        <LinearGradient id="stackPlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#374151" />
          <Stop offset="0.3" stopColor="#1f2937" />
          <Stop offset="0.75" stopColor="#18202b" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
        <LinearGradient id="activeStackPlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1d4ed8" />
          <Stop offset="0.4" stopColor="#0284c7" />
          <Stop offset="1" stopColor="#0369a1" />
        </LinearGradient>
        <LinearGradient id="cableGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#64748b" />
          <Stop offset="0.5" stopColor="#e2e8f0" />
          <Stop offset="1" stopColor="#475569" />
        </LinearGradient>
        <LinearGradient id="pulleyWheel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#334155" />
          <Stop offset="0.5" stopColor="#0f172a" />
          <Stop offset="1" stopColor="#1e293b" />
        </LinearGradient>
        <LinearGradient id="pinKnob" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fde047" />
          <Stop offset="0.5" stopColor="#eab308" />
          <Stop offset="1" stopColor="#ca8a04" />
        </LinearGradient>
        <LinearGradient id="towerFrame" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0f172a" />
          <Stop offset="0.5" stopColor="#1e293b" />
          <Stop offset="1" stopColor="#0a0f1d" />
        </LinearGradient>
      </Defs>

      {/* Outer Cage Frame */}
      <Rect x={88} y={10} width={184} height={204} rx={14} fill="none" stroke="url(#towerFrame)" strokeWidth={7} />
      <Rect x={76} y={208} width={208} height={10} rx={4} fill="#090d16" />
      <Rect x={86} y={12} width={188} height={10} rx={3} fill="#0f172a" />

      {/* Chrome Guide Rods */}
      <Rect x={ROD_L_X - 2.5} y={22} width={5} height={186} rx={2.5} fill="url(#chromeRod)" />
      <Rect x={ROD_R_X - 2.5} y={22} width={5} height={186} rx={2.5} fill="url(#chromeRod)" />

      {/* Center Selector Stem */}
      <Rect x={178.5} y={22} width={3} height={186} rx={1.5} fill="url(#chromeRod)" />

      {/* Weight Stack Plates */}
      {stackPlates.map((w, idx) => {
        const y = STACK_START_Y + idx * (PLATE_H + PLATE_GAP);
        const isActive = idx === selectedIdx;
        const displayW = isImperial ? Math.round(w / LB_TO_KG) : w;

        return (
          <G key={`m-stack-${w}`}>
            <Rect
              x={STACK_X}
              y={y}
              width={STACK_W}
              height={PLATE_H}
              rx={2}
              fill={isActive ? 'url(#activeStackPlate)' : 'url(#stackPlate)'}
              stroke={isActive ? '#38bdf8' : '#334155'}
              strokeWidth={isActive ? 1.4 : 0.8}
            />

            {/* Guide Rod cutouts */}
            <Circle cx={ROD_L_X} cy={y + PLATE_H / 2} r={3.2} fill="#0f172a" />
            <Circle cx={ROD_R_X} cy={y + PLATE_H / 2} r={3.2} fill="#0f172a" />

            {/* Center Pin Hole */}
            <Circle cx={180} cy={y + PLATE_H / 2} r={2.5} fill="#090d16" />

            {/* Weight label on plate */}
            <SvgText
              x={STACK_X + 12}
              y={y + PLATE_H - 2}
              fontFamily="sans-serif"
              fontSize={7.5}
              fontWeight="bold"
              fill={isActive ? '#ffffff' : '#94a3b8'}
            >
              {displayW}
            </SvgText>

            {/* Selector Pin */}
            {isActive && (
              <G>
                <Line
                  x1={180}
                  y1={y + PLATE_H / 2}
                  x2={STACK_X + STACK_W + 12}
                  y2={y + PLATE_H / 2}
                  stroke="#e2e8f0"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <Circle
                  cx={STACK_X + STACK_W + 13}
                  cy={y + PLATE_H / 2}
                  r={5.5}
                  fill="url(#pinKnob)"
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
// Machine Stack Pin Chip Component
// ─────────────────────────────────────────────────────────────────────────────

interface MachineStackChipProps {
  weightVal: number;
  weightKg: number;
  isSelected: boolean;
  onSelect: () => void;
  unit: string;
  isDark: boolean;
  plateIndex: number;
}

const MachineStackChip = React.memo(({
  weightVal,
  isSelected,
  onSelect,
  unit,
  isDark,
  plateIndex,
}: MachineStackChipProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onSelect}
      style={[
        styles.stackChip,
        {
          backgroundColor: isSelected
            ? (isDark ? '#0c2840' : '#E0F2FE')
            : (isDark ? '#14171a' : '#F1F5F9'),
          borderColor: isSelected
            ? '#0284c7'
            : (isDark ? '#23282d' : '#CBD5E1'),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Select machine plate ${plateIndex + 1}, ${weightVal} ${unit}`}
    >
      <View style={styles.stackChipHeader}>
        <Text style={[styles.plateIndexText, { color: isSelected ? '#0284c7' : (isDark ? '#626b75' : '#94A3B8') }]}>
          #{plateIndex + 1}
        </Text>
        <View
          style={[
            styles.pinSlot,
            {
              backgroundColor: isSelected ? '#FACC15' : (isDark ? '#090b0d' : '#94A3B8'),
              borderColor: isSelected ? '#CA8A04' : (isDark ? '#22262a' : '#E2E8F0'),
            },
          ]}
        >
          {isSelected && <View style={styles.pinGlow} />}
        </View>
      </View>

      <View style={styles.stackChipBody}>
        <Text
          style={[
            styles.stackChipNum,
            {
              color: isSelected ? '#0284c7' : (isDark ? '#F8FAFC' : '#0F172A'),
            },
          ]}
          numberOfLines={1}
        >
          {weightVal}
        </Text>
        <Text style={[styles.stackChipUnit, { color: isSelected ? '#0284c7' : (isDark ? '#8d979f' : '#64748B') }]}>
          {unit}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MachineBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface MachineBuilderProps {
  initialConfig: MachineConfig;
  onWeightChange: (weightKg: number) => void;
}

const MachineBuilder = React.memo(({
  initialConfig,
  onWeightChange,
}: MachineBuilderProps) => {
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [selectedKg, setSelectedKg] = useState<number>(initialConfig.selectedWeightKg || 40);

  const prevInitWeightRef = useRef(initialConfig.selectedWeightKg);
  useEffect(() => {
    if (
      initialConfig.selectedWeightKg !== undefined &&
      initialConfig.selectedWeightKg !== prevInitWeightRef.current
    ) {
      prevInitWeightRef.current = initialConfig.selectedWeightKg;
      setSelectedKg(initialConfig.selectedWeightKg);
    }
  }, [initialConfig.selectedWeightKg]);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 480)
      : Math.min(windowWidth - 32, 400);
    return Math.max(280, maxW);
  }, [windowWidth]);

  // Realistic selectorized machine stack weights
  const stackOptions = useMemo(() => {
    if (isImperial) {
      return MACHINE_STACK_WEIGHTS_LBS.map(lbs => ({
        val: lbs,
        kg: Math.round(lbs * LB_TO_KG * 10) / 10,
      }));
    }
    return MACHINE_STACK_WEIGHTS_KG.map(kg => ({
      val: kg,
      kg,
    }));
  }, [isImperial]);

  const handleSelectWeight = useCallback((kg: number) => {
    setSelectedKg(kg);
    onWeightChange(kg);
  }, [onWeightChange]);

  const handleStep = useCallback((deltaKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0, Math.min(250, Math.round((prev + deltaKg) * 10) / 10));
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const handleAddFractional = useCallback((addKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0, Math.min(250, Math.round((prev + addKg) * 10) / 10));
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
            {displayVal} {unit.toUpperCase()} · PIN SELECTOR STACK
          </Text>
        </View>

        <MachineStackSvg
          selectedKg={selectedKg}
          isImperial={isImperial}
          width={svgWidth}
        />
      </View>

      {/* Weight Selector Card - Selectorized Pin Stack */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Machine Weight Stack Pin
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} selectorized stack
            </Text>
          </View>

          {/* Micro stepper */}
          <View style={[styles.miniStepper, { backgroundColor: isDark ? '#171a1d' : '#F1F5F9', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? -0.5 * LB_TO_KG : -0.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
            >
              <Text style={[styles.miniStepBtnText, { color: isDark ? '#929ba5' : '#64748B' }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.miniStepVal, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>{displayVal}</Text>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? 0.5 * LB_TO_KG : 0.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Increase weight"
            >
              <Text style={[styles.miniStepBtnText, { color: '#0284c7' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stack Pin Plate Chips Scroller */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {stackOptions.map((opt, idx) => {
            const isSelected = Math.abs(opt.kg - selectedKg) < 0.25;
            return (
              <MachineStackChip
                key={`machine-opt-${opt.val}`}
                plateIndex={idx}
                weightVal={opt.val}
                weightKg={opt.kg}
                isSelected={isSelected}
                onSelect={() => handleSelectWeight(opt.kg)}
                unit={unit}
                isDark={isDark}
              />
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
    paddingVertical: 4,
  },
  stackChip: {
    width: 78,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  stackChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateIndexText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
  },
  pinSlot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  stackChipBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  stackChipNum: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  stackChipUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  addonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  addonLabel: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
  },
  addonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  addonChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addonChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
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
    height: 36,
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
});
