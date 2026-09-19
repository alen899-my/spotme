import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, Animated,
  Platform, useWindowDimensions, TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnits } from '../../contexts/UnitContext';
import { FONTS } from '../../constants/theme';

import { SetLoggerModalProps, EquipmentPreset } from './setLogger/types';
import { normalizeEquipment, getBarWeightKg, getDefaultPresets } from './setLogger/equipmentUtils';

import SetLoggerHeader from './setLogger/SetLoggerHeader';
import SetLoggerTimer from './setLogger/SetLoggerTimer';
import EquipmentRenderer from './setLogger/EquipmentRenderer';
import RepsSelector from './setLogger/RepsSelector';
import SetLoggerPresets from './setLogger/SetLoggerPresets';
import SetLoggerActions from './setLogger/SetLoggerActions';

// ─────────────────────────────────────────────────────────────────────────────
// SetLoggerModal
// ─────────────────────────────────────────────────────────────────────────────

const SetLoggerModal = React.memo(({
  visible,
  activeExercise,
  activeSetNum,
  editingSet,
  setTimer,
  setTimerRunning,
  inputWeight,
  inputReps,
  loadingLogSet,
  loadingEditSet,
  loadingSkip,
  keyboardHeight,
  workoutElapsed,
  restTimer,
  setModalSlideAnim,
  setModalFadeAnim,
  onClose,
  onToggleTimer,
  onResetTimer,
  onChangeWeight,
  onChangeReps,
  onLogSet,
  onEditSet,
  onSkipSet,
}: SetLoggerModalProps) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && windowWidth >= 768;

  const equipmentType = useMemo(
    () => normalizeEquipment(activeExercise?.equipment),
    [activeExercise?.equipment],
  );
  const isCardio = activeExercise?.category?.toLowerCase() === 'cardio' || equipmentType === 'cardio';
  const isBodyweight = equipmentType === 'body_weight';
  const isEditing = !!editingSet;

  // ── Internal weight state (kg) managed by equipment builders ────────────────
  const [internalWeightKg, setInternalWeightKg] = useState<number>(
    parseFloat(inputWeight) || 0,
  );



  // ── Weight change from equipment builder ──────────────────────────────────
  const handleEquipmentWeightChange = useCallback((kg: number) => {
    setInternalWeightKg(kg);
    onChangeWeight(String(kg));
  }, [onChangeWeight]);

  // Sync when modal re-opens with a different set
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const w = parseFloat(inputWeight) || 0;
      setInternalWeightKg(w);
    }
    prevVisibleRef.current = visible;
  }, [visible, inputWeight]);

  // ── Recent Presets ────────────────────────────────────────────────────────
  const presets = useMemo(() => {
    if (isCardio || isBodyweight) return [];
    const barWeight = getBarWeightKg(equipmentType);
    return getDefaultPresets(
      equipmentType,
      barWeight,
      unitSystem === 'imperial',
      activeExercise?.sets || [],
    );
  }, [equipmentType, isCardio, isBodyweight, unitSystem, activeExercise?.sets]);

  const handleSelectPreset = useCallback((preset: EquipmentPreset) => {
    handleEquipmentWeightChange(preset.totalWeightKg);
    onChangeReps(String(preset.reps));
  }, [handleEquipmentWeightChange, onChangeReps]);

  // ── Web Escape key support ────────────────────────────────────────────────
  useEffect(() => {
    if (!isWeb) return;
    const handleKeyDown = (e: any) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose, isWeb]);

  // ── Layout calculations ────────────────────────────────────────────────────
  const panelMaxWidth = isDesktopWeb ? Math.min(windowWidth - 48, 540) : windowWidth;
  const bottomPad = Math.max(insets.bottom, 16) + (isDesktopWeb ? 16 : keyboardHeight > 0 ? keyboardHeight : 16);

  // Explicit responsive sheet height for mobile to prevent React Native Yoga flex collapse
  const sheetHeight = isDesktopWeb
    ? undefined
    : isCardio
      ? Math.round(windowHeight * 0.52)
      : isBodyweight
        ? Math.round(windowHeight * 0.58)
        : Math.min(Math.round(windowHeight * 0.88), 780);

  const translateY = setModalSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  // ─── Content ─────────────────────────────────────────────────────────────

  const content = (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: isDark ? '#070809' : '#F1F5F9',
          paddingBottom: bottomPad,
          maxWidth: panelMaxWidth,
          width: isDesktopWeb ? panelMaxWidth : '100%',
          height: sheetHeight,
          maxHeight: isDesktopWeb ? ('88vh' as any) : sheetHeight,
          borderTopLeftRadius: isDesktopWeb ? 24 : 26,
          borderTopRightRadius: isDesktopWeb ? 24 : 26,
          borderBottomLeftRadius: isDesktopWeb ? 24 : 0,
          borderBottomRightRadius: isDesktopWeb ? 24 : 0,
          borderWidth: isDesktopWeb ? 1 : 0,
          borderColor: isDark ? '#22262a' : '#E2E8F0',
        },
      ]}
    >
      {/* Drag handle (mobile only) */}
      {!isDesktopWeb && (
        <View style={styles.dragHandle}>
          <View style={[styles.dragBar, { backgroundColor: isDark ? '#292e33' : '#CBD5E1' }]} />
        </View>
      )}

      {/* Header */}
      <SetLoggerHeader
        exercise={activeExercise}
        setNumber={activeSetNum}
        totalSets={activeExercise?.target_sets ?? 3}
        isEditing={isEditing}
        editingSetNumber={editingSet?.set_number}
        isCardio={isCardio}
        onClose={onClose}
      />

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.scrollContentDesktop,
        ]}
      >
        {/* Timer Card */}
        <SetLoggerTimer
          setTimer={setTimer}
          setTimerRunning={setTimerRunning}
          onToggle={onToggleTimer}
          onReset={onResetTimer}
        />

        {/* Equipment Hero Visual + Controls */}
        {!isCardio && (
          <EquipmentRenderer
            key={`equip-${equipmentType}`}
            rawEquipment={activeExercise?.equipment}
            storedWeightKg={internalWeightKg}
            isEditing={isEditing || internalWeightKg > 0}
            onWeightChange={handleEquipmentWeightChange}
          />
        )}



        {/* Cardio message */}
        {isCardio && (
          <View style={styles.cardioMsg}>
            <Text style={[styles.cardioEmoji]}>🏃</Text>
            <Text style={[styles.cardioText, { color: isDark ? '#929ba5' : '#64748B' }]}>
              Use the timer above to track your duration
            </Text>
          </View>
        )}

        {/* Reps Selector */}
        <RepsSelector
          value={inputReps}
          onChange={onChangeReps}
          isCardio={isCardio}
        />

        {/* Recent Presets */}
        {!isCardio && !isBodyweight && presets.length > 0 && (
          <SetLoggerPresets
            presets={presets}
            onSelectPreset={handleSelectPreset}
          />
        )}

        {/* Desktop: actions inline in scroll */}
        {isDesktopWeb && (
          <View style={styles.desktopActionsGap}>
            <SetLoggerActions
              isEditing={isEditing}
              isCardio={isCardio}
              loadingLogSet={loadingLogSet}
              loadingEditSet={loadingEditSet}
              loadingSkip={loadingSkip}
              onLogSet={onLogSet}
              onEditSet={onEditSet}
              onSkipSet={onSkipSet}
            />
          </View>
        )}
      </ScrollView>

      {/* Mobile sticky footer */}
      {!isDesktopWeb && (
        <View style={[styles.mobileFooter, { backgroundColor: isDark ? '#070809' : '#F1F5F9' }]}>
          <SetLoggerActions
            isEditing={isEditing}
            isCardio={isCardio}
            loadingLogSet={loadingLogSet}
            loadingEditSet={loadingEditSet}
            loadingSkip={loadingSkip}
            onLogSet={onLogSet}
            onEditSet={onEditSet}
            onSkipSet={onSkipSet}
          />
        </View>
      )}
    </View>
  );

  // ─── Web Desktop Modal ─────────────────────────────────────────────────────
  if (isDesktopWeb) {
    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View style={[styles.overlay, { opacity: setModalFadeAnim }]}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <ScrollView
            style={styles.webScrollContainer}
            contentContainerStyle={styles.desktopCenter}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.desktopPanelWrap,
                  { maxWidth: panelMaxWidth, transform: [{ translateY }] },
                ]}
              >
                {content}
              </Animated.View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  }

  // ─── Mobile Bottom Sheet ───────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: setModalFadeAnim }]}>
        <Animated.View
          style={[
            styles.mobileSheet,
            { transform: [{ translateY }] },
          ]}
        >
          {content}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

export default SetLoggerModal;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mobileSheet: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  webScrollContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  desktopCenter: {
    minHeight: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  desktopPanelWrap: {
    width: '100%',
    alignItems: 'center',
  },
  panel: {
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  dragBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 16,
    gap: 14,
  },
  scrollContentDesktop: {
    paddingHorizontal: 0,
  },
  cardioMsg: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  cardioEmoji: {
    fontSize: 48,
  },
  cardioText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  desktopActionsGap: {
    marginTop: 8,
    marginBottom: 4,
  },
  mobileFooter: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
