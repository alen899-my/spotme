import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../../contexts/ThemeContext';
import { PlateOption } from '../types';
import { getPlateSpec } from '../equipmentUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Circular Mini Plate SVG (Authentic Olympic Disc)
// ─────────────────────────────────────────────────────────────────────────────

interface MiniPlateSvgProps {
  plate: PlateOption;
  isImperial: boolean;
  size?: number;
}

export const MiniPlateSvg = React.memo(({ plate, isImperial, size = 44 }: MiniPlateSvgProps) => {
  const spec = getPlateSpec(plate, isImperial);
  const num = parseFloat(plate.label);
  const rMap: Record<number, number> = isImperial
    ? { 45: 19, 35: 17.5, 25: 16, 10: 14, 5: 12, 2.5: 10, 1.25: 9.5, 0.5: 9, 0.25: 8.5 }
    : { 25: 20, 20: 19, 15: 17.5, 10: 16, 5: 14, 2.5: 12, 1.25: 10.5, 0.5: 9, 0.25: 8.5 };
  const baseR = rMap[num] ?? 14;
  const r = baseR * (size / 44);
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Floor drop shadow */}
      <Circle cx={center} cy={center + 1.2} r={r} fill="#000" opacity={0.35} />
      {/* Plate Face */}
      <Circle
        cx={center}
        cy={center}
        r={r}
        fill={spec.face}
        stroke={spec.edge}
        strokeOpacity={0.65}
        strokeWidth={1.2}
      />
      {/* Outer ridge ring */}
      <Circle
        cx={center}
        cy={center}
        r={r * 0.74}
        fill="none"
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth={1.3}
      />
      {/* Inner highlight bevel */}
      <Circle
        cx={center}
        cy={center}
        r={r * 0.68}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.18}
        strokeWidth={0.9}
      />
      {/* Center collar hub */}
      <Circle cx={center} cy={center} r={Math.max(3, r * 0.3)} fill="#1b1f23" />
      <Circle cx={center} cy={center} r={Math.max(1.8, r * 0.17)} fill="#08090a" />
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Barbell-Style Plate Chip Component (Supports Stepper & Tap Modes)
// ─────────────────────────────────────────────────────────────────────────────

interface PlateChipProps {
  plate: PlateOption;
  quantity?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  onSelect?: (weightKg: number) => void;
  isImperial: boolean;
  isSelected?: boolean;
  mode?: 'stepper' | 'tap';
}

export const PlateChip = React.memo(({
  plate,
  quantity = 0,
  onAdd,
  onRemove,
  onSelect,
  isImperial,
  isSelected = false,
  mode = 'stepper',
}: PlateChipProps) => {
  const { colors, isDark } = useTheme();
  const isActive = mode === 'stepper' ? quantity > 0 : isSelected;

  if (mode === 'tap') {
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          styles.tapChip,
          {
            backgroundColor: isSelected
              ? (isDark ? 'rgba(22, 169, 255, 0.14)' : '#EFF6FF')
              : (isDark ? '#0d1012' : '#FFFFFF'),
            borderColor: isSelected
              ? '#16a9ff'
              : (isDark ? '#22262a' : '#E2E8F0'),
            shadowColor: isSelected ? '#16a9ff' : '#000',
            shadowOpacity: isSelected ? 0.35 : 0.08,
            shadowRadius: isSelected ? 6 : 3,
            elevation: isSelected ? 4 : 1,
          },
        ]}
        onPress={() => onSelect?.(plate.weightKg)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Select ${plate.label} ${isImperial ? 'lb' : 'kg'} plate`}
      >
        <View style={styles.chipArt}>
          <MiniPlateSvg plate={plate} isImperial={isImperial} size={40} />
        </View>
        <View style={styles.tapLabelRow}>
          <Text
            style={[
              styles.chipLabelText,
              {
                color: isSelected ? '#16a9ff' : (isDark ? '#f5f7f8' : '#0F172A'),
                fontWeight: isSelected ? 'bold' : '600',
              },
            ]}
          >
            {plate.label}
          </Text>
          <Text style={[styles.chipUnitText, { color: isDark ? '#626b75' : '#94A3B8' }]}>
            {isImperial ? 'lb' : 'kg'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isActive
            ? 'rgba(22, 169, 255, 0.08)'
            : isDark ? '#0d1012' : '#FFFFFF',
          borderColor: isActive
            ? 'rgba(22, 169, 255, 0.55)'
            : isDark ? '#22262a' : '#E2E8F0',
        },
      ]}
    >
      {/* Mini Plate Artwork */}
      <View style={styles.chipArt}>
        <MiniPlateSvg plate={plate} isImperial={isImperial} size={44} />
      </View>

      {/* Label */}
      <Text style={[styles.chipLabel, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
        {plate.label}
        <Text style={[styles.chipUnit, { color: isDark ? '#626b75' : '#94A3B8' }]}>
          {' '}{isImperial ? 'lb' : 'kg'}
        </Text>
      </Text>

      {/* Stepper */}
      <View
        style={[
          styles.stepper,
          {
            backgroundColor: isDark ? '#171a1d' : '#F1F5F9',
            borderColor: isDark ? '#22262a' : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.stepBtn, quantity === 0 && styles.stepBtnDisabled]}
          onPress={onRemove}
          disabled={quantity === 0}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${plate.label} plate`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.stepBtnText,
              {
                color: quantity === 0
                  ? (isDark ? '#475569' : '#CBD5E1')
                  : (isDark ? '#929ba5' : '#64748B'),
              },
            ]}
          >
            −
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            styles.qtyText,
            {
              color: isActive
                ? (isDark ? '#FFF' : '#0F172A')
                : (isDark ? '#626b75' : '#94A3B8'),
            },
          ]}
        >
          {quantity}
        </Text>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${plate.label} plate`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.stepBtnText, { color: '#16a9ff', fontWeight: 'bold' }]}>
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default PlateChip;

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 10,
    minWidth: 78,
  },
  tapChip: {
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipArt: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipUnit: {
    fontSize: 10,
    fontWeight: '400',
  },
  tapLabelRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chipLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipUnitText: {
    fontSize: 10,
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  stepBtnText: {
    fontSize: 14,
    lineHeight: 16,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
});
