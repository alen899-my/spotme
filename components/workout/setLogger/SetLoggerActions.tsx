import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONTS } from '../../../constants/theme';

interface SetLoggerActionsProps {
  isEditing: boolean;
  isCardio: boolean;
  loadingLogSet: boolean;
  loadingEditSet: boolean;
  loadingSkip: boolean;
  onLogSet: () => void;
  onEditSet: () => void;
  onSkipSet: () => void;
}

const SetLoggerActions = React.memo(({
  isEditing,
  isCardio,
  loadingLogSet,
  loadingEditSet,
  loadingSkip,
  onLogSet,
  onEditSet,
  onSkipSet,
}: SetLoggerActionsProps) => {
  const { colors, isDark } = useTheme();

  const isLoading = loadingLogSet || loadingEditSet;

  return (
    <View style={styles.row}>
      {/* Skip — only shown when logging a new set (not editing) */}
      {!isEditing && (
        <TouchableOpacity
          style={[
            styles.skipBtn,
            { borderColor: colors.border, opacity: loadingSkip ? 0.5 : 1, backgroundColor: colors.inputBg },
          ]}
          onPress={onSkipSet}
          disabled={loadingSkip || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Skip set"
        >
          {loadingSkip ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="play-skip-forward" size={16} color={colors.textMuted} />
              <Text style={[styles.skipText, { color: colors.textMuted }]}>SKIP</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Save / Update Button */}
      <TouchableOpacity
        style={[styles.saveBtn, { opacity: isLoading ? 0.8 : 1 }]}
        onPress={isEditing ? onEditSet : onLogSet}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isEditing ? 'Update set' : isCardio ? 'Save duration' : 'Save set'}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={isEditing ? ['#3B82F6', '#2563EB'] : ['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveBtnGrad}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveText}>
                {isEditing ? 'UPDATE' : isCardio ? 'SAVE DURATION' : 'SAVE SET'}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

export default SetLoggerActions;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  skipBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    minWidth: 90,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  skipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  saveBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtnGrad: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
    letterSpacing: 1,
  },
});
