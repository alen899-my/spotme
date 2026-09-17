import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useUnits } from '../../../../contexts/UnitContext';
import { FONTS } from '../../../../constants/theme';
import { GenericConfig } from '../types';
import { STANDARD_WEIGHT_CHIPS_KG, getPlateOptions, plateConfigFromSideWeight } from '../equipmentUtils';
import { PlateChip } from './PlateChip';
import { formatWeightValue, weightUnit } from '../../../../utils/units';

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

  const [weightKg, setWeightKg] = useState(initialConfig.selectedWeightKg || 20);

  const availablePlates = useMemo(() => getPlateOptions(isImperial), [isImperial]);

  const plateCounts = useMemo(() => {
    return plateConfigFromSideWeight(weightKg, availablePlates);
  }, [weightKg, availablePlates]);

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

        <View style={styles.iconHero}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#171a1d' : '#FFFFFF', borderColor: isDark ? '#292e33' : '#E2E8F0' }]}>
            <Ionicons name="barbell-outline" size={44} color="#16a9ff" />
          </View>
        </View>
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
  iconHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
