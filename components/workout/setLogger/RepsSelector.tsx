import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONTS } from '../../../constants/theme';

const REP_OPTIONS = [4, 5, 6, 8, 10, 12, 15, 20];

interface RepsSelectorProps {
  value: string;
  onChange: (reps: string) => void;
  isCardio?: boolean;
}

const RepsSelector = React.memo(({ value, onChange, isCardio }: RepsSelectorProps) => {
  const { isDark } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  const numericValue = parseInt(value, 10) || 10;
  const isPreset = REP_OPTIONS.includes(numericValue);
  const [customVal, setCustomVal] = useState(numericValue);

  const handleSelect = useCallback((reps: number) => {
    onChange(String(reps));
  }, [onChange]);

  const handleOpenCustom = useCallback(() => {
    setCustomVal(numericValue);
    setSheetOpen(true);
  }, [numericValue]);

  const handleConfirmCustom = useCallback(() => {
    onChange(String(customVal));
    setSheetOpen(false);
  }, [customVal, onChange]);

  if (isCardio) return null;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111416' : '#FFFFFF', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
      {/* Card Header */}
      <View style={styles.secHead}>
        <Text style={[styles.secTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
          Reps
        </Text>
      </View>

      {/* Reps Scroll Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.repsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {REP_OPTIONS.map(r => {
          const isSelected = numericValue === r;
          return (
            <TouchableOpacity
              key={r}
              style={[
                styles.repBtn,
                {
                  backgroundColor: isSelected
                    ? 'rgba(22, 169, 255, 0.14)'
                    : isDark ? '#070809' : '#F8FAFC',
                  borderColor: isSelected
                    ? '#16a9ff'
                    : isDark ? '#22262a' : '#E2E8F0',
                },
              ]}
              onPress={() => handleSelect(r)}
              accessibilityRole="button"
              accessibilityLabel={`${r} reps`}
            >
              <Text style={[styles.repBtnText, { color: isSelected ? '#16a9ff' : (isDark ? '#929ba5' : '#475569') }]}>
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Custom Button */}
        <TouchableOpacity
          style={[
            styles.repBtn,
            styles.customRepBtn,
            {
              backgroundColor: !isPreset && numericValue > 0
                ? 'rgba(22, 169, 255, 0.14)'
                : isDark ? '#070809' : '#F8FAFC',
              borderColor: !isPreset && numericValue > 0
                ? '#16a9ff'
                : isDark ? '#22262a' : '#E2E8F0',
            },
          ]}
          onPress={handleOpenCustom}
          accessibilityRole="button"
          accessibilityLabel="Custom rep count"
        >
          <Text style={[styles.customBtnText, { color: !isPreset && numericValue > 0 ? '#16a9ff' : (isDark ? '#929ba5' : '#64748B') }]}>
            {!isPreset && numericValue > 0 ? `${numericValue} reps` : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Reps Modal Sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={styles.modalScrim}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#171a1d' : '#FFFFFF', borderColor: isDark ? '#292e33' : '#E2E8F0' }]}>
            <View style={[styles.grabHandle, { backgroundColor: isDark ? '#292e33' : '#CBD5E1' }]} />

            <Text style={[styles.modalTitle, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
              Custom reps
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? '#929ba5' : '#64748B' }]}>
              Set an exact target for this set
            </Text>

            {/* Stepper */}
            <View style={[styles.bigStepper, { backgroundColor: isDark ? '#070809' : '#F8FAFC', borderColor: isDark ? '#22262a' : '#E2E8F0' }]}>
              <TouchableOpacity
                style={[styles.bigStepBtn, { backgroundColor: isDark ? '#1d2126' : '#E2E8F0' }]}
                onPress={() => setCustomVal(prev => Math.max(1, prev - 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.bigStepBtnText, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>−</Text>
              </TouchableOpacity>

              <View style={styles.bigValWrap}>
                <Text style={[styles.bigValNum, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>
                  {customVal}
                </Text>
                <Text style={[styles.bigValUnit, { color: isDark ? '#626b75' : '#94A3B8' }]}>
                  REPS
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.bigStepBtn, { backgroundColor: isDark ? '#1d2126' : '#E2E8F0' }]}
                onPress={() => setCustomVal(prev => Math.min(100, prev + 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.bigStepBtnText, { color: isDark ? '#f5f7f8' : '#0F172A' }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtnGhost, { backgroundColor: isDark ? '#1d2126' : '#F1F5F9' }]}
                onPress={() => setSheetOpen(false)}
              >
                <Text style={[styles.modalBtnGhostText, { color: isDark ? '#929ba5' : '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: '#16a9ff' }]}
                onPress={handleConfirmCustom}
              >
                <Text style={styles.modalBtnConfirmText}>Use this</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default RepsSelector;

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
  repsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  repBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRepBtn: {
    width: 'auto' as any,
    paddingHorizontal: 16,
    minWidth: 70,
  },
  repBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  customBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 13.5,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  bigStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    marginVertical: 12,
  },
  bigStepBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigStepBtnText: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    lineHeight: 26,
  },
  bigValWrap: {
    alignItems: 'center',
  },
  bigValNum: {
    fontFamily: FONTS.heading,
    fontSize: 44,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  bigValUnit: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtnGhost: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhostText: {
    fontFamily: FONTS.heading,
    fontSize: 14.5,
  },
  modalBtnConfirm: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnConfirmText: {
    fontFamily: FONTS.heading,
    fontSize: 14.5,
    color: '#04121c',
  },
});
