import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Ellipse, Line, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import { DumbbellConfig } from '../types';
import {
  DUMBBELL_WEIGHTS_KG,
  getDumbbellStyle,
} from '../equipmentUtils';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// Neat Side-View Dumbbells SVG (Old Method, Refined)
// ─────────────────────────────────────────────────────────────────────────────

interface DualDumbbellsSideViewSvgProps {
  weightPerDbKg: number;
  isImperial: boolean;
  width: number;
}

const DualDumbbellsSideViewSvg = React.memo(({
  weightPerDbKg, isImperial, width: svgWidth,
}: DualDumbbellsSideViewSvgProps) => {
  const viewBoxWidth = 420;
  const viewBoxHeight = 150;
  const CY = 75;
  const styleSpec = useMemo(() => getDumbbellStyle(weightPerDbKg), [weightPerDbKg]);
  const disp = formatWeightValue(weightPerDbKg, isImperial ? 'imperial' : 'metric');

  const headH = Math.min(84, Math.max(48, styleSpec.headHeight * 1.35));
  const headW = Math.min(40, Math.max(22, styleSpec.headWidth * 1.25));
  const headY = CY - headH / 2;

  const renderDumbbell = (cx: number, key: string) => {
    return (
      <G key={key}>
        {/* Soft rack shelf drop shadow */}
        <Ellipse
          cx={cx}
          cy={CY + headH / 2 + 3}
          rx={headW + 36}
          ry={6}
          fill="#000"
          opacity={0.35}
        />

        {/* Chrome Grip Handle (Side View) */}
        <Rect
          x={cx - 32}
          y={CY - 6}
          width={64}
          height={12}
          rx={3}
          fill="url(#dbSteelSide)"
        />

        {/* Knurling Grip Texture */}
        {[cx - 24, cx - 18, cx - 12, cx - 6, cx, cx + 6, cx + 12, cx + 18, cx + 24].map(kx => (
          <Line
            key={`knurl-${key}-${kx}`}
            x1={kx}
            y1={CY - 5}
            x2={kx}
            y2={CY + 5}
            stroke="#21272d"
            strokeOpacity={0.6}
            strokeWidth={1.2}
          />
        ))}

        {/* Machined Inner Collars */}
        <Rect
          x={cx - 36}
          y={CY - 9}
          width={6}
          height={18}
          rx={2}
          fill="url(#dbCollarSide)"
          stroke="#0f172a"
          strokeWidth={0.8}
        />
        <Rect
          x={cx + 30}
          y={CY - 9}
          width={6}
          height={18}
          rx={2}
          fill="url(#dbCollarSide)"
          stroke="#0f172a"
          strokeWidth={0.8}
        />

        {/* Left Head (Side View) */}
        <Rect
          x={cx - 36 - headW}
          y={headY}
          width={headW}
          height={headH}
          rx={styleSpec.cornerRadius}
          fill={styleSpec.color}
          stroke={styleSpec.accent}
          strokeWidth={1.5}
        />
        {/* Left Head Specular Sheen */}
        <Rect
          x={cx - 36 - headW + 2}
          y={headY + 2}
          width={headW - 4}
          height={headH * 0.32}
          rx={styleSpec.cornerRadius - 1}
          fill="#ffffff"
          opacity={0.22}
        />
        {/* Left Head Stamped Weight */}
        <SvgText
          x={cx - 36 - headW / 2}
          y={CY + 3.5}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize={disp.length > 3 ? 9 : 11}
          fontWeight="bold"
          fill="#ffffff"
        >
          {disp}
        </SvgText>

        {/* Right Head (Side View) */}
        <Rect
          x={cx + 36}
          y={headY}
          width={headW}
          height={headH}
          rx={styleSpec.cornerRadius}
          fill={styleSpec.color}
          stroke={styleSpec.accent}
          strokeWidth={1.5}
        />
        {/* Right Head Specular Sheen */}
        <Rect
          x={cx + 36 + 2}
          y={headY + 2}
          width={headW - 4}
          height={headH * 0.32}
          rx={styleSpec.cornerRadius - 1}
          fill="#ffffff"
          opacity={0.22}
        />
        {/* Right Head Stamped Weight */}
        <SvgText
          x={cx + 36 + headW / 2}
          y={CY + 3.5}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize={disp.length > 3 ? 9 : 11}
          fontWeight="bold"
          fill="#ffffff"
        >
          {disp}
        </SvgText>

        {/* Handle Center Stamped Badge */}
        <Circle cx={cx} cy={CY} r={9.5} fill="#111416" stroke="#475569" strokeWidth={1} />
        <SvgText
          x={cx}
          y={CY + 3}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize={disp.length > 3 ? 6 : 7.5}
          fontWeight="bold"
          fill="#38bdf8"
        >
          {disp}
        </SvgText>
      </G>
    );
  };

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        <LinearGradient id="dbSteelSide" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3d444b" />
          <Stop offset="0.2" stopColor="#d5dee5" />
          <Stop offset="0.5" stopColor="#8d97a0" />
          <Stop offset="0.8" stopColor="#5a636b" />
          <Stop offset="1" stopColor="#252a2f" />
        </LinearGradient>
        <LinearGradient id="dbCollarSide" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4b545c" />
          <Stop offset="0.25" stopColor="#b4bec6" />
          <Stop offset="0.55" stopColor="#717c85" />
          <Stop offset="1" stopColor="#1e2327" />
        </LinearGradient>
      </Defs>

      {/* Gym Rack Rails behind dumbbells */}
      <Rect x={18} y={20} width={384} height={8} rx={3} fill="#1a1e22" stroke="#2a3036" strokeWidth={0.8} />
      <Rect x={18} y={122} width={384} height={8} rx={3} fill="#1a1e22" stroke="#2a3036" strokeWidth={0.8} />

      {/* Left Dumbbell of Pair */}
      {renderDumbbell(115, 'db-left')}

      {/* Right Dumbbell of Pair */}
      {renderDumbbell(305, 'db-right')}
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Dumbbell Front-View Weight Chip (Face-On Disc Showcasing Big Weight)
// ─────────────────────────────────────────────────────────────────────────────

interface DumbbellFrontViewChipProps {
  kg: number;
  isSelected: boolean;
  unitSystem: any;
  unit: string;
  isDark: boolean;
  onSelect: (kg: number) => void;
}

const DumbbellFrontViewChip = React.memo(({
  kg, isSelected, unitSystem, unit, isDark, onSelect,
}: DumbbellFrontViewChipProps) => {
  const chipDisplay = formatWeightValue(kg, unitSystem);
  const styleSpec = useMemo(() => getDumbbellStyle(kg), [kg]);

  // Radius scales with weight for authentic dumbbell head sizing
  const r = Math.min(25, Math.max(17, 15 + Math.sqrt(kg) * 1.1));
  const center = 28;

  return (
    <TouchableOpacity
      style={[
        styles.dbFrontChip,
        {
          backgroundColor: isSelected
            ? (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC')
            : (isDark ? '#0d1012' : '#FFFFFF'),
          borderColor: isSelected
            ? styleSpec.color
            : (isDark ? '#22262a' : '#E2E8F0'),
          shadowColor: isSelected ? styleSpec.color : '#000',
          shadowOpacity: isSelected ? 0.45 : 0.08,
          shadowRadius: isSelected ? 8 : 3,
          elevation: isSelected ? 4 : 1,
        },
      ]}
      onPress={() => onSelect(kg)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Select ${chipDisplay} ${unit} dumbbell`}
    >
      {/* Front View of Dumbbell Head (Solid Colored Face-On Disc) */}
      <Svg width={56} height={56} viewBox="0 0 56 56">
        {/* Ambient Floor Shadow */}
        <Ellipse
          cx={center}
          cy={center + r + 1}
          rx={r * 0.95}
          ry={3}
          fill="#000"
          opacity={isDark ? 0.45 : 0.2}
        />

        {/* Solid Molded Urethane Dumbbell Head */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill={styleSpec.color}
          stroke={styleSpec.accent}
          strokeWidth={1.3}
        />

        {/* Outer Highlight Bevel */}
        <Circle
          cx={center}
          cy={center}
          r={r * 0.88}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.22}
          strokeWidth={1}
        />

        {/* Molded Inner Groove on Solid Face */}
        <Circle
          cx={center}
          cy={center}
          r={r * 0.78}
          fill="none"
          stroke="#000000"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {/* BIG STAMPED WEIGHT NUMBER (Directly on Solid Colored Face) */}
        <SvgText
          x={center}
          y={center - (chipDisplay.length > 3 ? 1.5 : 2.5)}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize={chipDisplay.length > 3 ? 11 : 13}
          fontWeight="900"
          fill="#ffffff"
          letterSpacing={-0.3}
        >
          {chipDisplay}
        </SvgText>

        {/* STAMPED UNIT */}
        <SvgText
          x={center}
          y={center + 8.5}
          textAnchor="middle"
          fontFamily="sans-serif"
          fontSize={6.8}
          fontWeight="800"
          fill="rgba(255, 255, 255, 0.9)"
          letterSpacing={0.8}
        >
          {unit.toUpperCase()}
        </SvgText>
      </Svg>

      {/* Showcased Weight Label underneath */}
      <View style={styles.dbChipLabelRow}>
        <Text
          style={[
            styles.dbChipNum,
            {
              color: isSelected ? styleSpec.color : (isDark ? '#f5f7f8' : '#0F172A'),
              fontWeight: isSelected ? 'bold' : '600',
            },
          ]}
        >
          {chipDisplay}
        </Text>
        <Text style={[styles.dbChipUnit, { color: isDark ? '#626b75' : '#94A3B8' }]}>
          {unit}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DumbbellBuilder
// ─────────────────────────────────────────────────────────────────────────────

interface DumbbellBuilderProps {
  initialConfig: DumbbellConfig;
  onWeightChange: (weightKg: number) => void;
}

const DumbbellBuilder = React.memo(({ initialConfig, onWeightChange }: DumbbellBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [weightPerDbKg, setWeightPerDbKg] = useState<number>(
    initialConfig.weightPerDumbbell || 10,
  );

  // Synchronize when initialConfig updates from preset or set change without remounting
  const prevConfigWeightRef = useRef(initialConfig.weightPerDumbbell);
  useEffect(() => {
    if (
      initialConfig.weightPerDumbbell !== undefined &&
      initialConfig.weightPerDumbbell !== prevConfigWeightRef.current
    ) {
      prevConfigWeightRef.current = initialConfig.weightPerDumbbell;
      setWeightPerDbKg(initialConfig.weightPerDumbbell);
    }
  }, [initialConfig.weightPerDumbbell]);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 520)
      : Math.min(windowWidth - 32, 440);
    return Math.max(300, maxW);
  }, [windowWidth]);

  const handleSelectWeight = useCallback((kg: number) => {
    const rounded = Math.round(kg * 10) / 10;
    setWeightPerDbKg(rounded);
    onWeightChange(rounded * 2); // Total = both dumbbells
  }, [onWeightChange]);

  const handleStep = useCallback((deltaKg: number) => {
    setWeightPerDbKg(prev => {
      const next = Math.max(0.5, Math.round((prev + deltaKg) * 10) / 10);
      onWeightChange(next * 2);
      return next;
    });
  }, [onWeightChange]);

  const displayVal = formatWeightValue(weightPerDbKg, unitSystem);
  const totalVal = formatWeightValue(weightPerDbKg * 2, unitSystem);
  const currentStyleSpec = useMemo(() => getDumbbellStyle(weightPerDbKg), [weightPerDbKg]);

  return (
    <View style={styles.container}>
      {/* Hero Visual Card - Neat Side View of Pair */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.badge}>
          <View style={[
            styles.badgePill,
            {
              backgroundColor: isDark ? '#070809' : '#EDE9FE',
              borderColor: isDark ? '#22262a' : '#DDD6FE',
            }
          ]}>
            <View style={[styles.badgeDot, { backgroundColor: currentStyleSpec.color }]} />
            <Text style={[styles.badgeText, { color: isDark ? '#f5f7f8' : '#6D28D9' }]}>
              {displayVal} {unit.toUpperCase()} EACH · PAIR
            </Text>
          </View>
        </View>

        <DualDumbbellsSideViewSvg
          weightPerDbKg={weightPerDbKg}
          isImperial={isImperial}
          width={svgWidth}
        />
      </View>

      {/* Quick Weights Selector Card */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Weight per dumbbell
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} each · {totalVal} {unit} lifted total
            </Text>
          </View>
          {/* Fine-tuning stepper */}
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

        {/* Quick weight chips - Showcased Front View of dumbbell head */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {DUMBBELL_WEIGHTS_KG.map(kg => {
            const isSelected = Math.abs(kg - weightPerDbKg) < 0.2;
            return (
              <DumbbellFrontViewChip
                key={kg}
                kg={kg}
                isSelected={isSelected}
                unitSystem={unitSystem}
                unit={unit}
                isDark={isDark}
                onSelect={handleSelectWeight}
              />
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

export default DumbbellBuilder;

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
    marginBottom: 6,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
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
    minWidth: 26,
    textAlign: 'center',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
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
  dbChip: {
    width: 82,
    height: 92,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dbFrontChip: {
    width: 76,
    height: 86,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingTop: 6,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dbChipLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 2,
  },
  dbChipNum: {
    fontFamily: FONTS.heading,
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  dbChipUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
  },
});
