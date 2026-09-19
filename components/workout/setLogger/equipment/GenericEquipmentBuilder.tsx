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
import { GenericConfig, PlateOption } from '../types';
import {
  STANDARD_WEIGHT_CHIPS_KG,
  getPlateOptions,
  getPlateSpec,
  plateConfigFromSideWeight,
} from '../equipmentUtils';
import { PlateChip } from './PlateChip';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

// ─────────────────────────────────────────────────────────────────────────────
// Loaded Plates Preview SVG (Authentic Olympic Bumper & Competition Discs)
// ─────────────────────────────────────────────────────────────────────────────

interface LoadedPlatesPreviewSvgProps {
  weightKg: number;
  availablePlates: PlateOption[];
  plateCounts: Record<number, number>;
  isImperial: boolean;
  isDark: boolean;
  width: number;
}

const getPlateRadius = (plate: PlateOption, isImperial: boolean): number => {
  const num = parseFloat(plate.label);
  if (isImperial) {
    if (num >= 45) return 46;
    if (num >= 35) return 43;
    if (num >= 25) return 40;
    if (num >= 10) return 35;
    if (num >= 5) return 30;
    if (num >= 2.5) return 25;
    return 21;
  }
  if (num >= 25) return 46;
  if (num >= 20) return 44;
  if (num >= 15) return 41;
  if (num >= 10) return 37;
  if (num >= 5) return 32;
  if (num >= 2.5) return 27;
  if (num >= 1.25) return 23;
  return 19;
};

const LoadedPlatesPreviewSvg = React.memo(({
  weightKg,
  availablePlates,
  plateCounts,
  isImperial,
  isDark,
  width: svgWidth,
}: LoadedPlatesPreviewSvgProps) => {
  const viewBoxWidth = 320;
  const viewBoxHeight = 118;
  const floorY = 106;

  // Flatten plate counts into ordered plate items
  const loadedPlates = useMemo(() => {
    const list: PlateOption[] = [];
    for (const p of availablePlates) {
      const count = plateCounts[p.weightKg] ?? 0;
      for (let i = 0; i < count; i++) {
        list.push(p);
      }
    }
    if (weightKg > 0 && list.length === 0) {
      list.push({
        weightKg,
        label: formatWeightValue(weightKg, isImperial ? 'imperial' : 'metric'),
        color: '#16a9ff',
        ringColor: '#38bdf8',
      });
    }
    return list;
  }, [availablePlates, plateCounts, weightKg, isImperial]);

  const N = loadedPlates.length;
  const maxRender = Math.min(N, 6);
  const platesToRender = loadedPlates.slice(0, maxRender);

  // Compute horizontal centers for plates
  const platePositions = useMemo(() => {
    if (N === 0) return [];
    if (N === 1) return [160];
    if (N === 2) return [118, 202];
    if (N === 3) return [92, 160, 228];
    if (N === 4) return [74, 131, 189, 246];
    
    // 5 or more plates: distribute across available width
    const minX = 64;
    const maxX = 256;
    const step = (maxX - minX) / (platesToRender.length - 1);
    return platesToRender.map((_, i) => minX + i * step);
  }, [N, platesToRender]);

  return (
    <Svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={svgWidth}
      height={Math.round(svgWidth * (viewBoxHeight / viewBoxWidth))}
      style={{ alignSelf: 'center' }}
    >
      <Defs>
        {/* Universal Steel Hub Gradient */}
        <LinearGradient id="steelHubGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#e2e8f0" />
          <Stop offset="0.3" stopColor="#94a3b8" />
          <Stop offset="0.7" stopColor="#cbd5e1" />
          <Stop offset="1" stopColor="#475569" />
        </LinearGradient>

        {/* Specific plate body gradients */}
        {availablePlates.map(p => {
          const spec = getPlateSpec(p, isImperial);
          const safeKey = String(p.label).replace('.', '_');
          return (
            <LinearGradient key={`grad_${safeKey}`} id={`plGrad_${safeKey}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={spec.edge} />
              <Stop offset="0.35" stopColor={spec.face} />
              <Stop offset="1" stopColor={spec.deep} />
            </LinearGradient>
          );
        })}
      </Defs>

      {/* Gym Floor Runner */}
      <Line
        x1={24}
        y1={floorY}
        x2={296}
        y2={floorY}
        stroke={isDark ? '#262d35' : '#CBD5E1'}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {N === 0 ? (
        /* Empty Plate Station State */
        <G>
          {/* Post and peg */}
          <Rect x={156} y={52} width={8} height={54} rx={2} fill={isDark ? '#222830' : '#E2E8F0'} />
          <Rect x={145} y={54} width={30} height={8} rx={4} fill={isDark ? '#333c46' : '#CBD5E1'} />
          {/* Floor Shadow */}
          <Ellipse cx={160} cy={floorY} rx={42} ry={4} fill="#000" opacity={0.15} />
          {/* Ghost Plate Silhouette */}
          <Circle
            cx={160}
            cy={58}
            r={46}
            fill="none"
            stroke={isDark ? '#2a323d' : '#E2E8F0'}
            strokeWidth={1.8}
            strokeDasharray="5,4"
          />
          <Circle
            cx={160}
            cy={58}
            r={14}
            fill="none"
            stroke={isDark ? '#2a323d' : '#E2E8F0'}
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
          <Circle cx={160} cy={58} r={6} fill={isDark ? '#1a2026' : '#F1F5F9'} />
          <SvgText
            x={160}
            y={62}
            textAnchor="middle"
            fill={isDark ? '#525d6a' : '#94A3B8'}
            fontSize={11}
            fontWeight="700"
            letterSpacing={0.8}
          >
            0 {isImperial ? 'LB' : 'KG'}
          </SvgText>
        </G>
      ) : (
        /* Loaded Olympic Plates */
        <G>
          {platesToRender.map((plate, idx) => {
            const spec = getPlateSpec(plate, isImperial);
            const safeKey = String(plate.label).replace('.', '_');
            const R = getPlateRadius(plate, isImperial);
            const cx = platePositions[idx] ?? 160;
            const cy = floorY - R;

            return (
              <G key={`loaded-plate-${idx}`}>
                {/* Floor contact shadow */}
                <Ellipse cx={cx} cy={floorY} rx={R * 0.88} ry={4.5} fill="#000" opacity={0.38} />

                {/* Outer Plate Body with Specular Gradient & Rim */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill={`url(#plGrad_${safeKey})`}
                  stroke={spec.edge}
                  strokeWidth={1.5}
                />

                {/* Outer Chamfer Groove */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={R * 0.88}
                  fill="none"
                  stroke="#000"
                  strokeOpacity={0.3}
                  strokeWidth={1.6}
                />

                {/* Recessed Inner Dish */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={R * 0.85}
                  fill={spec.face}
                />

                {/* Inner Highlight Ring */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={R * 0.82}
                  fill="none"
                  stroke="#fff"
                  strokeOpacity={0.16}
                  strokeWidth={1}
                />

                {/* Ergonomic Hand Grip Slots (for medium & large plates) */}
                {R >= 34 && (
                  <G opacity={0.65}>
                    <Rect
                      x={cx - R * 0.62}
                      y={cy - 4}
                      width={Math.max(6, R * 0.22)}
                      height={8}
                      rx={4}
                      fill="#07090b"
                    />
                    <Rect
                      x={cx + R * 0.40}
                      y={cy - 4}
                      width={Math.max(6, R * 0.22)}
                      height={8}
                      rx={4}
                      fill="#07090b"
                    />
                  </G>
                )}

                {/* Stainless Steel Center Collar Hub */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(6, R * 0.28)}
                  fill="url(#steelHubGrad)"
                  stroke="#475569"
                  strokeWidth={1}
                />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(4, R * 0.21)}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={0.8}
                />
                {/* 50.4mm Olympic Center Bore Hole */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={Math.max(3, R * 0.15)}
                  fill="#07090b"
                  stroke="#0f172a"
                  strokeWidth={0.8}
                />

                {/* Bold Stamped Weight Label */}
                {R >= 24 ? (
                  <G>
                    <SvgText
                      x={cx}
                      y={cy - R * 0.34}
                      textAnchor="middle"
                      fill={spec.ink}
                      fontSize={Math.max(8.5, R * 0.34)}
                      fontWeight="900"
                    >
                      {plate.label}
                    </SvgText>
                    <SvgText
                      x={cx}
                      y={cy + R * 0.58}
                      textAnchor="middle"
                      fill={spec.ink}
                      fontSize={Math.max(6, R * 0.2)}
                      fontWeight="800"
                      letterSpacing={0.8}
                      opacity={0.85}
                    >
                      {isImperial ? 'LB' : 'KG'}
                    </SvgText>
                  </G>
                ) : (
                  <SvgText
                    x={cx}
                    y={cy - R * 0.3}
                    textAnchor="middle"
                    fill={spec.ink}
                    fontSize={8}
                    fontWeight="900"
                  >
                    {plate.label}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* More plates overflow badge if N > 6 */}
          {N > 6 && (
            <G>
              <Rect x={266} y={35} width={36} height={20} rx={10} fill="#16a9ff" />
              <SvgText
                x={284}
                y={49}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={9.5}
                fontWeight="800"
              >
                +{N - 6}
              </SvgText>
            </G>
          )}
        </G>
      )}
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Generic Equipment Builder (Free Weight & Resistance)
// ─────────────────────────────────────────────────────────────────────────────

interface GenericEquipmentBuilderProps {
  initialConfig: GenericConfig;
  onWeightChange: (weightKg: number) => void;
}

const GenericEquipmentBuilder = React.memo(({
  initialConfig, onWeightChange,
}: GenericEquipmentBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const isImperial = unitSystem === 'imperial';
  const unit = weightUnit(unitSystem);
  const { width: screenWidth } = useWindowDimensions();
  const svgWidth = Math.min(360, Math.max(280, screenWidth - 48));

  const [weightKg, setWeightKg] = useState(initialConfig.selectedWeightKg || 20);

  const prevInitWeightRef = useRef(initialConfig.selectedWeightKg);
  useEffect(() => {
    if (
      initialConfig.selectedWeightKg !== undefined &&
      initialConfig.selectedWeightKg !== prevInitWeightRef.current
    ) {
      prevInitWeightRef.current = initialConfig.selectedWeightKg;
      setWeightKg(initialConfig.selectedWeightKg);
    }
  }, [initialConfig.selectedWeightKg]);

  const availablePlates = useMemo(() => getPlateOptions(isImperial), [isImperial]);

  const plateCounts = useMemo(() => {
    return plateConfigFromSideWeight(weightKg, availablePlates);
  }, [weightKg, availablePlates]);

  const plateBreakdown = useMemo(() => {
    const breakdown: Array<{ weightKg: number; label: string; count: number; color: string }> = [];
    for (const p of availablePlates) {
      const count = plateCounts[p.weightKg] ?? 0;
      if (count > 0) {
        breakdown.push({
          weightKg: p.weightKg,
          label: p.label,
          count,
          color: p.color,
        });
      }
    }
    return breakdown;
  }, [availablePlates, plateCounts]);

  const change = useCallback((delta: number) => {
    setWeightKg(prev => {
      const next = Math.max(0, Math.round((prev + delta) * 10) / 10);
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const selectWeight = useCallback((kg: number) => {
    setWeightKg(kg);
    onWeightChange(kg);
  }, [onWeightChange]);

  const handleAddPlate = useCallback((plateWeightKg: number) => {
    setWeightKg(prev => {
      const next = Math.min(300, Math.round((prev + plateWeightKg) * 10) / 10);
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const handleRemovePlate = useCallback((plateWeightKg: number) => {
    setWeightKg(prev => {
      const next = Math.max(0, Math.round((prev - plateWeightKg) * 10) / 10);
      onWeightChange(next);
      return next;
    });
  }, [onWeightChange]);

  const displayVal = formatWeightValue(weightKg, unitSystem);

  return (
    <View style={styles.container}>
      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { backgroundColor: isDark ? '#070809' : '#EDE9FE', color: isDark ? '#929ba5' : '#6D28D9', borderColor: isDark ? '#22262a' : '#DDD6FE' }]}>
            {displayVal} {unit.toUpperCase()} · FREE WEIGHT / RESISTANCE
          </Text>
        </View>

        {/* Loaded Plates Graphic Preview (NO PREVIEW ICONS) */}
        <View style={styles.plateHero}>
          <LoadedPlatesPreviewSvg
            weightKg={weightKg}
            availablePlates={availablePlates}
            plateCounts={plateCounts}
            isImperial={isImperial}
            isDark={isDark}
            width={svgWidth}
          />
        </View>

        {/* Compact Loaded Plates Breakdown */}
        {plateBreakdown.length > 0 ? (
          <View style={styles.breakdownRow}>
            {plateBreakdown.map(item => (
              <View
                key={item.weightKg}
                style={[
                  styles.breakdownPill,
                  {
                    backgroundColor: isDark ? '#171a1d' : '#FFFFFF',
                    borderColor: isDark ? '#292e33' : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                <Text style={[styles.breakdownText, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                  {item.count} × {item.label} {unit}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyPromptText, { color: isDark ? '#626b75' : '#94A3B8' }]}>
            No plates loaded · Tap + on plate chips below
          </Text>
        )}
      </View>

      {/* Selector Card - Barbell-style Plate Chips */}
      <View style={[styles.selectorCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Load plates
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              {displayVal} {unit} total resistance
            </Text>
          </View>

          {/* Stepper */}
          <View style={[styles.miniStepper, { backgroundColor: isDark ? '#171a1d' : '#F1F5F9', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => change(isImperial ? -0.5 * 0.453592 : -0.5)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
            >
              <Text style={[styles.miniStepBtnText, { color: isDark ? '#929ba5' : '#64748B' }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.miniStepVal, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>{displayVal}</Text>
            <TouchableOpacity
              style={styles.miniStepBtn}
              onPress={() => change(isImperial ? 0.5 * 0.453592 : 0.5)}
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
          {weightKg > 0 && (
            <TouchableOpacity onPress={() => selectWeight(0)}>
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
          {STANDARD_WEIGHT_CHIPS_KG.slice(0, 16).map(kg => {
            const isSelected = Math.abs(kg - weightKg) < 0.2;
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
                onPress={() => selectWeight(kg)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${chipDisplay} ${unit} weight`}
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

export default GenericEquipmentBuilder;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    marginBottom: 12,
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
  plateHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  breakdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  emptyPromptText: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
    marginTop: 6,
    textAlign: 'center',
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
