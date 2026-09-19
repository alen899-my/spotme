import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Ellipse, Line, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import {
  PlateLoadedMachineConfig, PlateOption, PlateQuantityMap,
} from '../types';
import {
  getPlateOptions, getPlateSpec, plateConfigFromSideWeight,
} from '../equipmentUtils';
import { calculateEquipmentWeight, calcPlatesTotal } from '../weightUtils';
import { PlateChip } from './PlateChip';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// 3D Realistic Plate-Loaded Machine Horn SVG
// Shows a heavy-duty chrome Olympic weight peg on a structural machine arm
// loaded with authentic Olympic bumper plates and a quick clamp.
// ─────────────────────────────────────────────────────────────────────────────

interface PlateLoadedMachineSvgProps {
  plateQuantities: PlateQuantityMap;
  availablePlates: PlateOption[];
  isImperial: boolean;
  isDark: boolean;
  width: number;
}

const PlateLoadedMachineSvg = React.memo(({
  plateQuantities,
  availablePlates,
  isImperial,
  isDark,
  width: svgWidth,
}: PlateLoadedMachineSvgProps) => {
  const viewBoxWidth = 360;
  const viewBoxHeight = 150;
  const CY = 75;
  const HORN_START_X = 90;
  const HORN_LENGTH = 200;

  // Ordered list of plates on one horn (heaviest first, closest to backstop)
  const plateList: PlateOption[] = useMemo(() => {
    const list: PlateOption[] = [];
    const sorted = [...availablePlates].sort((a, b) => b.weightKg - a.weightKg);
    for (const p of sorted) {
      const count = plateQuantities[p.weightKg] ?? 0;
      for (let i = 0; i < count; i++) {
        list.push(p);
      }
    }
    return list;
  }, [plateQuantities, availablePlates]);

  // Compute position for each plate stacked outward from backstop
  let curX = HORN_START_X + 18;
  const renderedPlates = plateList.map((p, idx) => {
    const spec = getPlateSpec(p, isImperial);
    const x = curX;
    curX += spec.t + 3;
    return { plate: p, spec, x, idx };
  });

  const clampX = curX + 2;

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        {/* Chrome Horn Gradient */}
        <LinearGradient id="hornChrome" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#475569" />
          <Stop offset="0.25" stopColor="#e2e8f0" />
          <Stop offset="0.5" stopColor="#94a3b8" />
          <Stop offset="0.8" stopColor="#475569" />
          <Stop offset="1" stopColor="#1e293b" />
        </LinearGradient>

        {/* Structural Arm Frame */}
        <LinearGradient id="machineArm" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1e293b" />
          <Stop offset="0.5" stopColor="#334155" />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>

        {/* Dynamic plate gradients */}
        {availablePlates.map(p => {
          const spec = getPlateSpec(p, isImperial);
          const safeKey = String(p.label).replace('.', '_');
          return (
            <LinearGradient key={`plm_grad_${safeKey}`} id={`plm_grad_${safeKey}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={spec.edge} />
              <Stop offset="0.35" stopColor={spec.face} />
              <Stop offset="1" stopColor={spec.deep} />
            </LinearGradient>
          );
        })}
      </Defs>

      {/* Ground shadow */}
      <Ellipse cx={180} cy={140} rx={140} ry={6} fill="#000" opacity={0.25} />

      {/* Machine Structural Mounting Arm */}
      <Rect x={36} y={16} width={38} height={118} rx={6} fill="url(#machineArm)" stroke="#0f172a" strokeWidth={1} />
      <Rect x={68} y={32} width={18} height={86} rx={3} fill="#0f172a" />
      {/* Heavy-duty pivot bolt */}
      <Circle cx={55} cy={42} r={8} fill="#475569" stroke="#94a3b8" strokeWidth={1.5} />
      <Circle cx={55} cy={42} r={3} fill="#0f172a" />

      {/* Horn Backstop Rubber Bumper */}
      <Rect x={HORN_START_X} y={CY - 40} width={16} height={80} rx={4} fill="#18181b" stroke="#27272a" strokeWidth={1} />
      <Line x1={HORN_START_X + 16} y1={CY - 38} x2={HORN_START_X + 16} y2={CY + 38} stroke="#3f3f46" strokeWidth={1.5} />

      {/* Chrome Weight Horn / Peg */}
      <Rect x={HORN_START_X + 16} y={CY - 14} width={HORN_LENGTH} height={28} rx={4} fill="url(#hornChrome)" stroke="#334155" strokeWidth={1} />
      {/* Horn rounded end-cap */}
      <Ellipse cx={HORN_START_X + 16 + HORN_LENGTH} cy={CY} rx={4} ry={14} fill="#64748b" stroke="#334155" strokeWidth={1} />

      {/* Empty State indicator */}
      {renderedPlates.length === 0 && (
        <G>
          <Circle
            cx={HORN_START_X + 50}
            cy={CY}
            r={48}
            fill="none"
            stroke={isDark ? '#262b32' : '#CBD5E1'}
            strokeWidth={1.6}
            strokeDasharray="5,4"
          />
          <SvgText
            x={HORN_START_X + 50}
            y={CY + 4}
            textAnchor="middle"
            fill={isDark ? '#525d6a' : '#94A3B8'}
            fontSize={11}
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            EMPTY HORN
          </SvgText>
        </G>
      )}

      {/* Stacked Olympic Plates */}
      {renderedPlates.map(({ plate, spec, x, idx }) => {
        const safeKey = String(plate.label).replace('.', '_');
        return (
          <G key={`horn-plate-${idx}-${plate.weightKg}`}>
            {/* Plate Face (vertical rectangular slice with 3D rounded corners) */}
            <Rect
              x={x}
              y={CY - spec.ry}
              width={spec.t}
              height={spec.ry * 2}
              rx={3}
              fill={`url(#plm_grad_${safeKey})`}
              stroke={spec.edge}
              strokeWidth={0.9}
            />
            {/* Inner rim ridge */}
            <Line
              x1={x + 2}
              y1={CY - spec.ry + 6}
              x2={x + 2}
              y2={CY + spec.ry - 6}
              stroke={spec.edge}
              strokeWidth={0.8}
              opacity={0.6}
            />
            {/* Weight label along vertical edge if wide enough */}
            {spec.t >= 9 && (
              <SvgText
                x={x + spec.t / 2}
                y={CY + spec.ry - 8}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontSize={8}
                fontWeight="bold"
                fill={spec.ink}
              >
                {plate.label}
              </SvgText>
            )}
          </G>
        );
      })}

      {/* Quick-Clamp Lock-Jaw Collar on Horn */}
      {renderedPlates.length > 0 && clampX + 12 < HORN_START_X + 16 + HORN_LENGTH && (
        <G>
          <Rect x={clampX} y={CY - 18} width={10} height={36} rx={3} fill="#18181b" stroke="#3f3f46" strokeWidth={1} />
          <Rect x={clampX + 2} y={CY - 22} width={6} height={6} rx={1.5} fill="#ef4444" />
        </G>
      )}
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PlateLoadedMachineBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface PlateLoadedMachineBuilderProps {
  initialConfig: PlateLoadedMachineConfig;
  onWeightChange: (weightKg: number) => void;
}

const PlateLoadedMachineBuilder = React.memo(({
  initialConfig,
  onWeightChange,
}: PlateLoadedMachineBuilderProps) => {
  const { isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [plateQuantities, setPlateQuantities] = useState<PlateQuantityMap>(
    initialConfig.plateQuantities || {},
  );

  const prevConfigRef = useRef(initialConfig);
  useEffect(() => {
    if (initialConfig && initialConfig !== prevConfigRef.current) {
      prevConfigRef.current = initialConfig;
      setPlateQuantities(initialConfig.plateQuantities || {});
    }
  }, [initialConfig]);

  const availablePlates = useMemo(() => getPlateOptions(isImperial), [isImperial]);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 500)
      : Math.min(windowWidth - 32, 420);
    return Math.max(280, maxW);
  }, [windowWidth]);

  // Current weight calculation
  const totalWeightKg = useMemo(() => {
    return calcPlatesTotal(plateQuantities);
  }, [plateQuantities]);

  const perSideKg = useMemo(() => {
    return Math.round((totalWeightKg / 2) * 100) / 100;
  }, [totalWeightKg]);

  const handlePlateChange = useCallback((plateWeightKg: number, delta: number) => {
    setPlateQuantities(prev => {
      const current = prev[plateWeightKg] ?? 0;
      const nextCount = Math.max(0, current + delta);
      const nextMap = { ...prev };
      if (nextCount === 0) {
        delete nextMap[plateWeightKg];
      } else {
        nextMap[plateWeightKg] = nextCount;
      }
      const newTotal = calcPlatesTotal(nextMap);
      onWeightChange(newTotal);
      return nextMap;
    });
  }, [onWeightChange]);

  const handleStep = useCallback((deltaKg: number) => {
    const nextTotal = Math.max(0, Math.round((totalWeightKg + deltaKg) * 10) / 10);
    const sideW = nextTotal / 2;
    const nextMap = plateConfigFromSideWeight(sideW, availablePlates);
    setPlateQuantities(nextMap);
    onWeightChange(nextTotal);
  }, [totalWeightKg, availablePlates, onWeightChange]);

  const handleSelectPreset = useCallback((presetTotalKg: number) => {
    const sideW = presetTotalKg / 2;
    const nextMap = plateConfigFromSideWeight(sideW, availablePlates);
    setPlateQuantities(nextMap);
    onWeightChange(presetTotalKg);
  }, [availablePlates, onWeightChange]);

  const displayTotal = formatWeightValue(totalWeightKg, unitSystem);
  const displaySide = formatWeightValue(perSideKg, unitSystem);

  return (
    <View style={styles.container}>
      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: isDark ? '#070809' : '#EDE9FE', color: isDark ? '#929ba5' : '#6D28D9', borderColor: isDark ? '#22262a' : '#DDD6FE' }]}>
            {displayTotal} {unit.toUpperCase()} · PLATE-LOADED MACHINE
          </Text>
        </View>

        <PlateLoadedMachineSvg
          plateQuantities={plateQuantities}
          availablePlates={availablePlates}
          isImperial={isImperial}
          isDark={isDark}
          width={svgWidth}
        />
      </View>

      {/* Weight Selector Card - Olympic Plates on Horns */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Load machine horns
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displaySide} {unit}/horn · {displayTotal} {unit} total
            </Text>
          </View>

          {/* Stepper */}
          <View style={[styles.miniStepper, { backgroundColor: isDark ? '#171a1d' : '#F1F5F9', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? -2.5 * 0.453592 : -2.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
            >
              <Text style={[styles.miniStepBtnText, { color: isDark ? '#929ba5' : '#64748B' }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.miniStepVal, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>{displayTotal}</Text>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => handleStep(isImperial ? 2.5 * 0.453592 : 2.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Increase weight"
            >
              <Text style={[styles.miniStepBtnText, { color: '#16a9ff' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plate Chips with +/- per side */}
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
              quantity={plateQuantities[p.weightKg] ?? 0}
              onAdd={() => handlePlateChange(p.weightKg, 1)}
              onRemove={() => handlePlateChange(p.weightKg, -1)}
              isImperial={isImperial}
            />
          ))}
        </ScrollView>

        {/* Quick presets */}
        <View style={styles.quickPresetHead}>
          <Text style={[styles.quickPresetTitle, { color: isDark ? '#929ba5' : '#64748B' }]}>
            Quick presets
          </Text>
          {totalWeightKg > 0 && (
            <TouchableOpacity onPress={() => handleSelectPreset(0)}>
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
          {(isImperial ? [45, 90, 135, 180, 225, 270, 315] : [20, 40, 60, 80, 100, 120, 140]).map(val => {
            const kg = isImperial ? val * 0.453592 : val;
            const isSelected = Math.abs(kg - totalWeightKg) < 0.2;
            return (
              <TouchableOpacity
                key={`plm-pre-${val}`}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(22, 169, 255, 0.15)'
                      : isDark ? '#171a1d' : '#F1F5F9',
                    borderColor: isSelected
                      ? '#16a9ff'
                      : isDark ? '#22262a' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSelectPreset(kg)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${val} ${unit} preset`}
              >
                <Text style={[styles.presetChipNum, { color: isSelected ? '#16a9ff' : (isDark ? '#f5f7f8' : '#0F172A') }]}>
                  {val}
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

export default PlateLoadedMachineBuilder;

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
