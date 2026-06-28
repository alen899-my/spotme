import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnits } from '../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../utils/units';

const STEP_OPTIONS = [0.1, 0.5, 1, 2.5, 5];

interface WeightScaleProps {
  value: number;
  onChange: (value: number) => void;
  onSave: () => void;
  saving?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export default function WeightScale({
  value,
  onChange,
  onSave,
  saving = false,
  min = 20,
  max = 300,
}: WeightScaleProps) {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const [currentStep, setCurrentStep] = useState(0.1);

  const cycleStep = useCallback(() => {
    setCurrentStep(prev => {
      const idx = STEP_OPTIONS.indexOf(prev);
      return STEP_OPTIONS[(idx + 1) % STEP_OPTIONS.length];
    });
  }, []);

  const adjust = (delta: number) => {
    const next = Math.round((value + delta) / currentStep) * currentStep;
    onChange(Math.max(min, Math.min(max, next)));
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#fff', borderColor: isDark ? '#222' : '#e5e5e0' }]}>
      {/* Value display */}
      <View style={styles.valueRow}>
        <TouchableOpacity onPress={() => adjust(-currentStep)} style={[styles.stepperBtn, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0eb', borderColor: isDark ? '#333' : '#ddd' }]}>
          <Ionicons name="remove" size={scale(20)} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.valueWrap}>
          <Text style={[styles.weightValue, { color: colors.text }]}>
            {formatWeightValue(value, unitSystem)}
          </Text>
          <Text style={[styles.weightUnit, { color: colors.textMuted }]}>{weightUnit(unitSystem)}</Text>
        </View>

        <TouchableOpacity onPress={() => adjust(currentStep)} style={[styles.stepperBtn, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0eb', borderColor: isDark ? '#333' : '#ddd' }]}>
          <Ionicons name="add" size={scale(20)} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Step chips */}
      <View style={styles.stepRow}>
        {STEP_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setCurrentStep(s)}
            style={[
              styles.stepChip,
              currentStep === s
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: 'transparent', borderColor: isDark ? '#333' : '#ddd' },
            ]}
          >
            <Text
              style={[
                styles.stepChipText,
                { color: currentStep === s ? '#fff' : colors.textMuted },
              ]}
            >
              ±{s.toFixed(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save button */}
      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.85}
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
      >
        <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'} size={scale(18)} color="#fff" />
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Weight'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(18),
    borderWidth: 1,
    padding: scale(20),
    gap: vs(16),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(16),
  },
  stepperBtn: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueWrap: {
    alignItems: 'center',
    gap: vs(2),
  },
  weightValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(48),
    letterSpacing: -1,
    lineHeight: scale(52),
  },
  weightUnit: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    letterSpacing: 1,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
  },
  stepChip: {
    paddingHorizontal: scale(14),
    paddingVertical: vs(6),
    borderRadius: scale(20),
    borderWidth: 1,
  },
  stepChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: vs(14),
    borderRadius: scale(14),
  },
  saveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    color: '#fff',
    letterSpacing: 1,
  },
});
