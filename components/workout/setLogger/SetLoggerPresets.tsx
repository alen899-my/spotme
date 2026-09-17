import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUnits } from '../../../contexts/UnitContext';
import { FONTS } from '../../../constants/theme';
import { EquipmentPreset, PlateSwatch } from './types';
import { formatWeightValue, weightUnit } from '../../../utils/units';

interface SetLoggerPresetsProps {
  presets: EquipmentPreset[];
  onSelectPreset: (preset: EquipmentPreset) => void;
}

const SetLoggerPresets = React.memo(({ presets, onSelectPreset }: SetLoggerPresetsProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const unit = weightUnit(unitSystem);

  if (!presets || presets.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
      <View style={styles.secHead}>
        <View>
          <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
            Recent
          </Text>
          <Text style={[styles.secNote, { color: isDark ? '#626b75' : '#94A3B8' }]}>
            Tap to load a previous set
          </Text>
        </View>
      </View>

      <View style={styles.presetList}>
        {presets.map((p, idx) => {
          const displayWeight = formatWeightValue(p.totalWeightKg, unitSystem);

          return (
            <TouchableOpacity
              key={p.id ?? `preset-${idx}`}
              style={[
                styles.presetItem,
                { backgroundColor: isDark ? '#070809' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' },
              ]}
              onPress={() => onSelectPreset(p)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Load preset ${p.label}, ${p.reps} reps, ${displayWeight} ${unit}`}
            >
              <View style={styles.presetMain}>
                {/* Plate Swatches */}
                {p.swatches && p.swatches.length > 0 && (
                  <View style={styles.swatchesRow}>
                    {p.swatches.map((sw, sIdx) => (
                      <View
                        key={`sw-${sIdx}`}
                        style={[styles.swatch, { backgroundColor: sw.color }]}
                      />
                    ))}
                  </View>
                )}

                {/* Text breakdown */}
                <Text style={[styles.presetText, { color: isDark ? '#f5f7f8' : '#0F172A' }]} numberOfLines={1}>
                  {p.label}{' '}
                  <Text style={[styles.presetReps, { color: isDark ? '#626b75' : '#94A3B8' }]}>
                    × {p.reps}
                  </Text>
                </Text>
              </View>

              {/* Total weight tag */}
              <Text style={[styles.presetMeta, { color: isDark ? '#929ba5' : '#64748B' }]}>
                {displayWeight} {unit}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

export default SetLoggerPresets;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  presetMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  swatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 10,
    height: 20,
    borderRadius: 3,
    marginRight: -3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  presetText: {
    fontFamily: FONTS.heading,
    fontSize: 13.5,
    flex: 1,
  },
  presetReps: {
    fontFamily: FONTS.body,
  },
  presetMeta: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    flexShrink: 0,
    marginLeft: 8,
  },
});
