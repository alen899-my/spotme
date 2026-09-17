import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Ellipse, Path, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import { KettlebellConfig } from '../types';
import { KETTLEBELL_WEIGHTS_KG } from '../equipmentUtils';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// Russian competition kettlebell handle color accents
const KB_ACCENTS: Record<number, string> = {
  8:  '#ec4899', // pink
  12: '#06b6d4', // blue
  16: '#eab308', // yellow
  20: '#a855f7', // purple
  24: '#22c55e', // green
  28: '#f97316', // orange
  32: '#ef4444', // red
  36: '#94a3b8', // grey
  40: '#ffffff', // white
  48: '#eab308', // gold
};

interface KettlebellSvgProps {
  selectedKg: number;
  width: number;
}

const KettlebellSvg = React.memo(({ selectedKg, width: svgWidth }: KettlebellSvgProps) => {
  const viewBoxWidth = 240;
  const viewBoxHeight = 220;

  const accentColor = useMemo(() => {
    return KB_ACCENTS[selectedKg] ?? '#16a9ff';
  }, [selectedKg]);

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        {/* Cast Iron Handle Gradient */}
        <LinearGradient id="kbHandle" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#374151" />
          <Stop offset="0.3" stopColor="#9ca3af" />
          <Stop offset="0.6" stopColor="#f3f4f6" />
          <Stop offset="0.8" stopColor="#6b7280" />
          <Stop offset="1" stopColor="#1f2937" />
        </LinearGradient>
        {/* Cast Iron Body Gradient */}
        <RadialGradient id="kbBody" cx="38%" cy="36%" r="62%">
          <Stop offset="0" stopColor="#4b5563" />
          <Stop offset="0.35" stopColor="#28303b" />
          <Stop offset="0.8" stopColor="#151b22" />
          <Stop offset="1" stopColor="#080b0e" />
        </RadialGradient>
        {/* Embossed Ring */}
        <LinearGradient id="embossRing" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#64748b" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#0f172a" />
        </LinearGradient>
      </Defs>

      {/* Ground Shadow */}
      <Ellipse cx={120} cy={206} rx={60} ry={8} fill="#000" opacity={0.35} />

      {/* Handle Horns */}
      <Path
        d="M 82 108 L 82 52 Q 82 28 120 28 Q 158 28 158 52 L 158 108"
        fill="none"
        stroke="url(#kbHandle)"
        strokeWidth={17}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Color-coded competition bands at handle corners */}
      <Rect x={73} y={74} width={18} height={12} rx={3} fill={accentColor} opacity={0.9} />
      <Rect x={149} y={74} width={18} height={12} rx={3} fill={accentColor} opacity={0.9} />

      {/* Main Spherical Body */}
      <Circle cx={120} cy={140} r={58} fill="url(#kbBody)" stroke="#1e293b" strokeWidth={1.5} />

      {/* Body Specular Highlight Arc */}
      <Path
        d="M 86 112 A 52 52 0 0 1 144 94"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.16}
        strokeWidth={4.5}
        strokeLinecap="round"
      />

      {/* Stamped Center Weight Disc */}
      <Circle cx={120} cy={140} r={30} fill="#141920" stroke="url(#embossRing)" strokeWidth={2} />
      <Circle cx={120} cy={140} r={26} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={1} />

      {/* Stamped Weight Text */}
      <SvgText
        x={120}
        y={145}
        fontFamily="sans-serif"
        fontSize={17}
        fontWeight="bold"
        textAnchor="middle"
        fill="#e2e8f0"
        letterSpacing={0.5}
      >
        {selectedKg}
      </SvgText>
      <SvgText
        x={120}
        y={157}
        fontFamily="sans-serif"
        fontSize={8}
        fontWeight="bold"
        textAnchor="middle"
        fill="#94a3b8"
        letterSpacing={1.2}
      >
        KG
      </SvgText>
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// KettlebellBuilder Component
// ─────────────────────────────────────────────────────────────────────────────

interface KettlebellBuilderProps {
  initialConfig: KettlebellConfig;
  onWeightChange: (weightKg: number) => void;
}

const KettlebellBuilder = React.memo(({ initialConfig, onWeightChange }: KettlebellBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);

  const [selectedKg, setSelectedKg] = useState<number>(initialConfig.selectedWeightKg || 16);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 380)
      : Math.min(windowWidth - 32, 320);
    return Math.max(220, maxW);
  }, [windowWidth]);

  const handleSelectWeight = useCallback((kg: number) => {
    setSelectedKg(kg);
    onWeightChange(kg);
  }, [onWeightChange]);

  const handleStep = useCallback((deltaKg: number) => {
    setSelectedKg(prev => {
      const next = Math.max(0.5, Math.min(100, Math.round((prev + deltaKg) * 10) / 10));
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
            {displayVal} {unit.toUpperCase()} · COMPETITION KETTLEBELL
          </Text>
        </View>

        <KettlebellSvg
          selectedKg={selectedKg}
          width={svgWidth}
        />
      </View>

      {/* Weight Selector Card */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Kettlebell weight
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} single bell
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

        {/* Horizontal scroll of weight chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {KETTLEBELL_WEIGHTS_KG.map(kg => {
            const isSelected = Math.abs(kg - selectedKg) < 0.2;
            const chipDisplay = formatWeightValue(kg, unitSystem);
            return (
              <TouchableOpacity
                key={kg}
                style={[
                  styles.weightChip,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(22, 169, 255, 0.12)'
                      : isDark ? '#0d1012' : '#F8FAFC',
                    borderColor: isSelected
                      ? '#16a9ff'
                      : isDark ? '#22262a' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSelectWeight(kg)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${chipDisplay} ${unit} kettlebell`}
              >
                <Text style={[styles.weightChipNum, { color: isSelected ? '#16a9ff' : (isDark ? '#f5f7f8' : '#0F172A') }]}>
                  {chipDisplay}
                </Text>
                <Text style={[styles.weightChipUnit, { color: isDark ? '#626b75' : '#94A3B8' }]}>
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

export default KettlebellBuilder;

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
