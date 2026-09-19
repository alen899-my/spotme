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
import { CableConfig } from '../types';
import {
  CABLE_STACK_WEIGHTS_KG,
  CABLE_STACK_WEIGHTS_LBS,
  LB_TO_KG,
} from '../equipmentUtils';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Pure Realistic Weight Stack SVG (No Pulley UI, Pure Centered Weight Stack)
// ─────────────────────────────────────────────────────────────────────────────

interface WeightStackSvgProps {
  selectedKg: number;
  isImperial: boolean;
  width: number;
}

const WeightStackSvg = React.memo(({
  selectedKg,
  isImperial,
  width: svgWidth,
}: WeightStackSvgProps) => {
  const viewBoxWidth = 320;
  const viewBoxHeight = 180;

  const stackPlates = useMemo(() => {
    if (isImperial) {
      return [10, 20, 30, 40, 50, 60, 70, 80, 100, 120, 150, 180];
    }
    return [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 90];
  }, [isImperial]);

  const selectedIdx = useMemo(() => {
    let bestIdx = 0;
    let minDiff = Infinity;
    stackPlates.forEach((w, i) => {
      const kg = isImperial ? w * LB_TO_KG : w;
      const diff = Math.abs(kg - selectedKg);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [selectedKg, stackPlates, isImperial]);

  const STACK_X = 75;
  const STACK_W = 150;
  const PLATE_H = 10;
  const PLATE_GAP = 2;
  const STACK_START_Y = 24;
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
        <LinearGradient id="cableRods" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#4b5563" />
          <Stop offset="0.3" stopColor="#e2e8f0" />
          <Stop offset="0.6" stopColor="#f8fafc" />
          <Stop offset="0.85" stopColor="#94a3b8" />
          <Stop offset="1" stopColor="#374151" />
        </LinearGradient>
        <LinearGradient id="cablePlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#334155" />
          <Stop offset="0.35" stopColor="#1e293b" />
          <Stop offset="0.8" stopColor="#111827" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
        <LinearGradient id="cableActivePlate" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0284c7" />
          <Stop offset="0.4" stopColor="#0369a1" />
          <Stop offset="1" stopColor="#075985" />
        </LinearGradient>
        <LinearGradient id="cablePin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fef08a" />
          <Stop offset="0.4" stopColor="#facc15" />
          <Stop offset="1" stopColor="#ca8a04" />
        </LinearGradient>
        <LinearGradient id="topPlateGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#475569" />
          <Stop offset="0.5" stopColor="#1e293b" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
      </Defs>

      {/* Chrome Guide Rods */}
      <Rect x={ROD_L_X - 2.5} y={10} width={5} height={160} rx={2.5} fill="url(#cableRods)" />
      <Rect x={ROD_R_X - 2.5} y={10} width={5} height={160} rx={2.5} fill="url(#cableRods)" />

      {/* Center Selector Stem */}
      <Rect x={158} y={12} width={4} height={158} rx={2} fill="url(#cableRods)" />

      {/* Top Header Plate */}
      <Rect x={STACK_X} y={12} width={STACK_W} height={9} rx={2} fill="url(#topPlateGrad)" stroke="#334155" strokeWidth={0.8} />

      {/* Bottom Shock Absorption Base */}
      <Rect x={STACK_X - 10} y={170} width={STACK_W + 20} height={7} rx={3} fill="#090d16" />
      <Rect x={ROD_L_X - 7} y={166} width={14} height={4} rx={2} fill="#18181b" />
      <Rect x={ROD_R_X - 7} y={166} width={14} height={4} rx={2} fill="#18181b" />

      {/* Pure Weight Stack Plates */}
      {stackPlates.map((w, idx) => {
        const y = STACK_START_Y + idx * (PLATE_H + PLATE_GAP);
        const isActive = idx === selectedIdx;

        return (
          <G key={`stack-plate-${w}`}>
            <Rect
              x={STACK_X}
              y={y}
              width={STACK_W}
              height={PLATE_H}
              rx={2}
              fill={isActive ? 'url(#cableActivePlate)' : 'url(#cablePlate)'}
              stroke={isActive ? '#38bdf8' : '#334155'}
              strokeWidth={isActive ? 1.3 : 0.7}
            />

            {/* Guide Rod cutouts */}
            <Circle cx={ROD_L_X} cy={y + PLATE_H / 2} r={3} fill="#090d16" />
            <Circle cx={ROD_R_X} cy={y + PLATE_H / 2} r={3} fill="#090d16" />

            {/* Center Pin Hole */}
            <Circle cx={160} cy={y + PLATE_H / 2} r={2.5} fill="#05080e" />

            {/* Plate Weight Label */}
            <SvgText
              x={STACK_X + 10}
              y={y + PLATE_H - 2}
              fontFamily="sans-serif"
              fontSize={7.5}
              fontWeight="bold"
              fill={isActive ? '#ffffff' : '#94a3b8'}
            >
              {w}
            </SvgText>

            {/* Magnetic Selector Pin */}
            {isActive && (
              <G>
                {/* Silver pin shaft sliding into center selector hole */}
                <Line
                  x1={160}
                  y1={y + PLATE_H / 2}
                  x2={STACK_X + STACK_W + 12}
                  y2={y + PLATE_H / 2}
                  stroke="#e2e8f0"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                {/* Gold Magnetic Selector Knob */}
                <Circle
                  cx={STACK_X + STACK_W + 13}
                  cy={y + PLATE_H / 2}
                  r={5}
                  fill="url(#cablePin)"
                  stroke="#ca8a04"
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
// Cable Stack Pin Chip Component
// Represents an individual cast-iron stack plate with an authentic magnetic pin hole
// ─────────────────────────────────────────────────────────────────────────────

interface CableStackChipProps {
  weightVal: number;
  weightKg: number;
  isSelected: boolean;
  onSelect: () => void;
  unit: string;
  isDark: boolean;
  plateIndex: number;
}

const CableStackChip = React.memo(({
  weightVal,
  isSelected,
  onSelect,
  unit,
  isDark,
  plateIndex,
}: CableStackChipProps) => {
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
      accessibilityLabel={`Select plate ${plateIndex + 1}, ${weightVal} ${unit}`}
    >
      {/* Top row: plate index and pin indicator */}
      <View style={styles.stackChipHeader}>
        <Text style={[styles.plateIndexText, { color: isSelected ? '#0284c7' : (isDark ? '#626b75' : '#94A3B8') }]}>
          #{plateIndex + 1}
        </Text>

        {/* Magnetic Selector Pin Visual */}
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

      {/* Main weight label */}
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
// CableBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface CableBuilderProps {
  initialConfig: CableConfig;
  onWeightChange: (weightKg: number) => void;
}

const CableBuilder = React.memo(({
  initialConfig,
  onWeightChange,
}: CableBuilderProps) => {
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [selectedKg, setSelectedKg] = useState<number>(initialConfig.selectedWeightKg || 20);

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

  // Realistic selectorized stack weights
  const stackOptions = useMemo(() => {
    if (isImperial) {
      return CABLE_STACK_WEIGHTS_LBS.map(lbs => ({
        val: lbs,
        kg: Math.round(lbs * LB_TO_KG * 10) / 10,
      }));
    }
    return CABLE_STACK_WEIGHTS_KG.map(kg => ({
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
      const next = Math.max(0, Math.min(180, Math.round((prev + deltaKg) * 10) / 10));
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const handleAddFractional = useCallback((addKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0, Math.min(180, Math.round((prev + addKg) * 10) / 10));
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const displayVal = formatWeightValue(selectedKg, unitSystem);

  return (
    <View style={styles.container}>
      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        

        <WeightStackSvg
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
              Weight Stack Pin
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} cable resistance
            </Text>
          </View>

          {/* Micro stepper for fractional weights */}
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
              <CableStackChip
                key={`cable-opt-${opt.val}`}
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
