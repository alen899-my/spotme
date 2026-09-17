import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, useWindowDimensions, Platform,
} from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Circle, Ellipse, Line, G, Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import {
  BarbellConfig, PlateOption, PlateQuantityMap, PlateSpec,
} from '../types';
import {
  getPlateOptions, getPlateSpec, plateConfigFromSideWeight,
} from '../equipmentUtils';
import { calculateEquipmentWeight } from '../weightUtils';
import { PlateChip } from './PlateChip';

// ─────────────────────────────────────────────────────────────────────────────
// 3D Realistic Barbell SVG Visual
// ─────────────────────────────────────────────────────────────────────────────

interface BarbellSvgProps {
  config: BarbellConfig;
  availablePlates: PlateOption[];
  isImperial: boolean;
  width: number;
}

const BarbellSvg = React.memo(({ config, availablePlates, isImperial, width: svgWidth }: BarbellSvgProps) => {
  const CY = 82;
  const viewBoxWidth = 420;
  const viewBoxHeight = 164;

  // Ordered list of plates (heaviest first = innermost against collar)
  const plateList: PlateOption[] = useMemo(() => {
    const list: PlateOption[] = [];
    const sorted = [...availablePlates].sort((a, b) => b.weightKg - a.weightKg);
    for (const p of sorted) {
      const count = config.plateQuantities[p.weightKg] ?? 0;
      for (let i = 0; i < count; i++) {
        list.push(p);
      }
    }
    return list;
  }, [config.plateQuantities, availablePlates]);

  // Gradient definitions for metallic steel and each plate
  const renderedDefs = useMemo(() => {
    return (
      <Defs>
        <LinearGradient id="barSteel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3d444b" />
          <Stop offset="0.18" stopColor="#cfd8de" />
          <Stop offset="0.42" stopColor="#8d979f" />
          <Stop offset="0.72" stopColor="#5b646c" />
          <Stop offset="1" stopColor="#262b30" />
        </LinearGradient>
        <LinearGradient id="barSleeve" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#454c53" />
          <Stop offset="0.22" stopColor="#b9c3ca" />
          <Stop offset="0.52" stopColor="#78828a" />
          <Stop offset="1" stopColor="#20252a" />
        </LinearGradient>
        <LinearGradient id="barHub" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9aa4ac" />
          <Stop offset="0.55" stopColor="#4a5158" />
          <Stop offset="1" stopColor="#1b1f23" />
        </LinearGradient>

        {availablePlates.map(p => {
          const spec = getPlateSpec(p, isImperial);
          const safeKey = String(p.label).replace('.', '_');
          return (
            <React.Fragment key={safeKey}>
              <LinearGradient id={`f_${safeKey}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={spec.edge} stopOpacity={0.85} />
                <Stop offset="0.26" stopColor={spec.face} />
                <Stop offset="0.72" stopColor={spec.face} />
                <Stop offset="1" stopColor={spec.deep} />
              </LinearGradient>
              <LinearGradient id={`r_${safeKey}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={spec.deep} />
                <Stop offset="0.20" stopColor={spec.face} />
                <Stop offset="0.55" stopColor={spec.deep} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0.85} />
              </LinearGradient>
            </React.Fragment>
          );
        })}
      </Defs>
    );
  }, [availablePlates, isImperial]);

  // Knurling lines helper
  const renderKnurl = (x1: number, x2: number) => {
    const lines: React.ReactNode[] = [];
    for (let x = x1; x < x2; x += 3.2) {
      lines.push(
        <Line
          key={`knurl-${x}`}
          x1={x}
          y1={CY - 4.6}
          x2={x}
          y2={CY + 4.6}
          stroke="#20262b"
          strokeOpacity={0.55}
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  // 3D stacked plates renderer for left and right
  const renderPlateStack = (anchorX: number, side: 'l' | 'r', maxLen: number) => {
    if (!plateList.length) return null;

    const gap = 1.1;
    let rawTotal = 0;
    plateList.forEach(p => {
      const spec = getPlateSpec(p, isImperial);
      rawTotal += spec.t + gap;
    });
    const scaleK = rawTotal > maxLen ? maxLen / rawTotal : 1;

    let cursor = anchorX;
    return plateList.map((p, idx) => {
      const spec = getPlateSpec(p, isImperial);
      const safeKey = String(p.label).replace('.', '_');
      const thick = Math.max(2.4, spec.t * scaleK);
      const ry = spec.ry;
      const rx = Math.max(2.5, Math.min(6.5, thick * 0.45));
      const x0 = side === 'l' ? cursor - thick : cursor;
      const frontX = side === 'l' ? x0 : x0 + thick;
      const backX = side === 'l' ? x0 + thick : x0;
      const hubRy = Math.max(7, ry * 0.19);
      const hubRx = Math.max(2.2, rx * 0.62);
      const showText = thick >= 8.5 && ry >= 36;
      const cxRim = x0 + thick / 2;

      cursor = side === 'l' ? cursor - thick - gap * scaleK : cursor + thick + gap * scaleK;

      return (
        <G key={`${side}-${idx}`}>
          {/* Back edge of cylinder */}
          <Ellipse cx={backX} cy={CY} rx={rx} ry={ry} fill={spec.deep} />
          {/* Outer cylinder body */}
          <Rect
            x={x0}
            y={CY - ry}
            width={thick}
            height={ry * 2}
            fill={`url(#r_${safeKey})`}
          />
          {/* Front face of disc */}
          <Ellipse
            cx={frontX}
            cy={CY}
            rx={rx}
            ry={ry}
            fill={`url(#f_${safeKey})`}
            stroke={spec.edge}
            strokeOpacity={0.5}
            strokeWidth={0.9}
          />
          {/* Beveled groove lines */}
          <Ellipse
            cx={frontX}
            cy={CY}
            rx={rx * 0.68}
            ry={ry * 0.78}
            fill="none"
            stroke="#000"
            strokeOpacity={0.28}
            strokeWidth={1}
          />
          <Ellipse
            cx={frontX}
            cy={CY}
            rx={rx * 0.62}
            ry={ry * 0.72}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.13}
            strokeWidth={0.8}
          />
          {/* Center hub */}
          <Ellipse
            cx={frontX}
            cy={CY}
            rx={hubRx}
            ry={hubRy}
            fill="url(#barHub)"
          />
          {/* Top cylinder specular sheen */}
          <Rect
            x={x0}
            y={CY - ry}
            width={thick}
            height={ry * 0.5}
            fill="#fff"
            opacity={0.07}
          />
          {/* Stamped weight text on rim */}
          {showText && (
            <SvgText
              x={cxRim}
              y={CY + ry * 0.58}
              transform={`rotate(-90 ${cxRim} ${CY + ry * 0.58})`}
              fontFamily="sans-serif"
              fontSize={7.5}
              fontWeight="bold"
              letterSpacing={0.5}
              textAnchor="middle"
              fill={spec.ink}
              opacity={0.8}
            >
              {p.label}
            </SvgText>
          )}
        </G>
      );
    });
  };

    const gap = 1.1;
    let rawTotal = 0;
    plateList.forEach(p => {
      const spec = getPlateSpec(p, isImperial);
      rawTotal += spec.t + gap;
    });
    const maxLen = 66;
    const scaleK = rawTotal > maxLen ? maxLen / rawTotal : 1;
    const totalStackThick = plateList.reduce(
      (sum, p) => sum + Math.max(2.4, getPlateSpec(p, isImperial).t * scaleK) + gap * scaleK,
      0,
    );
    const clampLx = Math.max(18, 84 - totalStackThick - 8);
    const clampRx = Math.min(394, 336 + totalStackThick);

    return (
      <Svg
        viewBox="0 0 420 160"
        width={svgWidth}
        height={Math.round(svgWidth * (160 / 420))}
        style={{ alignSelf: 'center' }}
      >
        {renderedDefs}

        {/* Floor / Rack Ambient Shadow */}
        <Ellipse cx={210} cy={CY + 54} rx={160} ry={7} fill="#000" opacity={0.25} />

        {/* Gym Rack J-Cups Supporting the Bar */}
        <G>
          {/* Left J-Cup */}
          <Rect x={118} y={CY + 5} width={12} height={20} rx={2} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
          <Rect x={115} y={CY - 5} width={4} height={11} rx={1} fill="#334155" />
          <Rect x={118} y={CY + 4} width={12} height={3} fill="#0f172a" />

          {/* Right J-Cup */}
          <Rect x={290} y={CY + 5} width={12} height={20} rx={2} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
          <Rect x={301} y={CY - 5} width={4} height={11} rx={1} fill="#334155" />
          <Rect x={290} y={CY + 4} width={12} height={3} fill="#0f172a" />
        </G>

        {/* Outer steel sleeves */}
        <Rect x={18} y={CY - 7.5} width={66} height={15} rx={2.5} fill="url(#barSleeve)" />
        <Rect x={336} y={CY - 7.5} width={66} height={15} rx={2.5} fill="url(#barSleeve)" />

        {/* Machined Olympic sleeve ribs */}
        {[28, 38, 48, 58, 68, 78].map(x => (
          <Line key={`rib-l-${x}`} x1={x} y1={CY - 7.5} x2={x} y2={CY + 7.5} stroke="#2a3239" strokeOpacity={0.4} strokeWidth={0.8} />
        ))}
        {[346, 356, 366, 376, 386, 396].map(x => (
          <Line key={`rib-r-${x}`} x1={x} y1={CY - 7.5} x2={x} y2={CY + 7.5} stroke="#2a3239" strokeOpacity={0.4} strokeWidth={0.8} />
        ))}

        {/* End caps */}
        <Rect x={10} y={CY - 8.5} width={8} height={17} rx={2} fill="url(#barSteel)" />
        <Circle cx={14} cy={CY} r={4} fill="#1e3a8a" />
        <Rect x={402} y={CY - 8.5} width={8} height={17} rx={2} fill="url(#barSteel)" />
        <Circle cx={406} cy={CY} r={4} fill="#1e3a8a" />

        {/* Main shaft */}
        <Rect x={94} y={CY - 5} width={232} height={10} rx={2.5} fill="url(#barSteel)" />

        {/* Knurled grip sections with Olympic Ring markers */}
        {renderKnurl(106, 148)}
        {renderKnurl(156, 196)}
        {renderKnurl(224, 264)}
        {renderKnurl(272, 314)}

        {/* Smooth Olympic power ring markers at 148-156 and 264-272 */}
        <Rect x={148} y={CY - 5} width={8} height={10} fill="url(#barSteel)" />
        <Rect x={264} y={CY - 5} width={8} height={10} fill="url(#barSteel)" />

        {/* Inner collars */}
        <Rect x={84} y={CY - 13} width={10} height={26} rx={3} fill="url(#barSteel)" stroke="#0d1012" strokeWidth={0.8} />
        <Rect x={326} y={CY - 13} width={10} height={26} rx={3} fill="url(#barSteel)" stroke="#0d1012" strokeWidth={0.8} />

        {/* Plates Stack: left side stacks outward from 84, right side from 336 */}
        {renderPlateStack(84, 'l', 66)}
        {renderPlateStack(336, 'r', 66)}

        {/* Lock-Jaw quick clamp on outer sleeve if plates present */}
        {plateList.length > 0 && (
          <G>
            <Rect x={clampLx} y={CY - 10} width={8} height={20} rx={2} fill="#18181b" stroke="#3f3f46" strokeWidth={0.8} />
            <Rect x={clampLx + 1.5} y={CY - 12} width={5} height={4} rx={1} fill="#ef4444" />
            <Rect x={clampRx} y={CY - 10} width={8} height={20} rx={2} fill="#18181b" stroke="#3f3f46" strokeWidth={0.8} />
            <Rect x={clampRx + 1.5} y={CY - 12} width={5} height={4} rx={1} fill="#ef4444" />
          </G>
        )}
      </Svg>
    );
  });

// ─────────────────────────────────────────────────────────────────────────────
// BarbellBuilder
// ─────────────────────────────────────────────────────────────────────────────

interface BarbellBuilderProps {
  equipmentType: 'barbell' | 'ez_barbell' | 'olympic_barbell' | 'trap_bar';
  initialConfig: BarbellConfig;
  isApproximate?: boolean;
  onWeightChange: (weightKg: number) => void;
}

const BarbellBuilder = React.memo(({
  equipmentType, initialConfig, isApproximate, onWeightChange,
}: BarbellBuilderProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const { width: windowWidth } = useWindowDimensions();
  const isImperial = unitSystem === 'imperial';

  const [config, setConfig] = useState<BarbellConfig>(initialConfig);
  const configRef = useRef(config);

  const availablePlates = useMemo(() => getPlateOptions(isImperial), [isImperial]);

  const svgWidth = useMemo(() => {
    const maxW = Platform.OS === 'web'
      ? Math.min(windowWidth - 48, 520)
      : Math.min(windowWidth - 32, 440);
    return Math.max(300, maxW);
  }, [windowWidth]);

  const calcResult = useMemo(
    () => calculateEquipmentWeight(config, unitSystem),
    [config, unitSystem],
  );

  // Notify parent whenever weight changes
  useEffect(() => {
    if (config !== configRef.current) {
      configRef.current = config;
      onWeightChange(calcResult.totalWeightKg);
    }
  }, [calcResult.totalWeightKg, onWeightChange, config]);

  const handleAdd = useCallback((plate: PlateOption) => {
    setConfig(prev => {
      const current = prev.plateQuantities[plate.weightKg] ?? 0;
      return {
        ...prev,
        plateQuantities: { ...prev.plateQuantities, [plate.weightKg]: current + 1 },
      };
    });
  }, []);

  const handleRemove = useCallback((plate: PlateOption) => {
    setConfig(prev => {
      const current = prev.plateQuantities[plate.weightKg] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev.plateQuantities };
      if (current === 1) delete next[plate.weightKg];
      else next[plate.weightKg] = current - 1;
      return { ...prev, plateQuantities: next };
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      plateQuantities: {},
    }));
  }, []);

  const handleStepTotal = useCallback((deltaKg: number) => {
    setConfig(prev => {
      const currentTotal = calcResult.totalWeightKg;
      const nextTotal = Math.max(prev.barWeightKg, Math.round((currentTotal + deltaKg) * 10) / 10);
      const sideWeight = (nextTotal - prev.barWeightKg) / 2;
      const newQuantities = sideWeight > 0 ? plateConfigFromSideWeight(sideWeight, availablePlates) : {};
      return {
        ...prev,
        plateQuantities: newQuantities,
      };
    });
  }, [calcResult.totalWeightKg, availablePlates]);

  const barLabel = equipmentType === 'ez_barbell' ? 'EZ Bar' :
    equipmentType === 'trap_bar' ? 'Trap Bar' :
    equipmentType === 'olympic_barbell' ? 'Olympic Bar' : 'Barbell';

  return (
    <View style={styles.container}>
      {/* Approximate warning */}
      {isApproximate && (
        <View style={[styles.approxBanner, { backgroundColor: isDark ? '#171a1d' : '#FEF3C7', borderColor: isDark ? '#292e33' : '#FDE68A' }]}>
          <Text style={[styles.approxText, { color: isDark ? '#929ba5' : '#92400E' }]}>
            Approximate visual — original logged weight preserved
          </Text>
        </View>
      )}

      {/* Hero Visual Card */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? '#111416' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.barBadge}>
          <Text style={[styles.barBadgeText, { backgroundColor: isDark ? '#070809' : '#EDE9FE', color: isDark ? '#929ba5' : '#6D28D9', borderColor: isDark ? '#22262a' : '#DDD6FE' }]}>
            {calcResult.displayWeight} · {barLabel.toUpperCase()}
          </Text>
        </View>

        <View style={styles.svgWrap}>
          <BarbellSvg
            config={config}
            availablePlates={availablePlates}
            isImperial={isImperial}
            width={svgWidth}
          />
        </View>
      </View>

      {/* Add Plates Card */}
      <View style={[styles.platesCard, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
        <View style={styles.secHead}>
          <View>
            <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Add plates
            </Text>
            <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
              Each side of the bar
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.miniStepper, { backgroundColor: isDark ? '#171a1d' : '#F1F5F9', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
              <TouchableOpacity
                style={styles.miniStepBtn}
                onPress={() => handleStepTotal(isImperial ? -0.5 * 0.453592 : -0.5)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Decrease total weight by 0.5"
              >
                <Text style={[styles.miniStepBtnText, { color: isDark ? '#929ba5' : '#64748B' }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.miniStepVal, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>±0.5</Text>
              <TouchableOpacity
                style={styles.miniStepBtn}
                onPress={() => handleStepTotal(isImperial ? 0.5 * 0.453592 : 0.5)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Increase total weight by 0.5"
              >
                <Text style={[styles.miniStepBtnText, { color: '#16a9ff' }]}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleClearAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear all plates"
            >
              <Text style={styles.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Horizontal scroll of plate chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {availablePlates.map(plate => (
            <PlateChip
              key={plate.label}
              plate={plate}
              quantity={config.plateQuantities[plate.weightKg] ?? 0}
              onAdd={() => handleAdd(plate)}
              onRemove={() => handleRemove(plate)}
              isImperial={isImperial}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
});

export default BarbellBuilder;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  approxBanner: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  approxText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    textAlign: 'center',
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
  barBadge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  barBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  platesCard: {
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
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    lineHeight: 18,
  },
  miniStepVal: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    minWidth: 26,
    textAlign: 'center',
  },
  clearBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: '#16a9ff',
  },
  chipsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  chip: {
    width: 90,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  chipArt: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  chipUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    lineHeight: 18,
  },
  qtyText: {
    fontFamily: FONTS.heading,
    fontSize: 13.5,
    minWidth: 16,
    textAlign: 'center',
  },
});
