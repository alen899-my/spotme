import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { FONTS } from '../../../constants/theme';
import OptimizedImage from '../../ui/OptimizedImage';

interface SetLoggerHeaderProps {
  exercise: any;
  setNumber: number;
  totalSets: number;
  isEditing: boolean;
  editingSetNumber?: number;
  isCardio: boolean;
  onClose: () => void;
}

const SetLoggerHeader = React.memo(({
  exercise,
  setNumber,
  totalSets,
  isEditing,
  editingSetNumber,
  isCardio,
  onClose,
}: SetLoggerHeaderProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.header}>
      {/* Close button */}
      <TouchableOpacity
        style={[
          styles.iconBtn,
          {
            backgroundColor: isDark ? '#171a1d' : '#F1F5F9',
            borderColor: isDark ? '#22262a' : '#E2E8F0',
          },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close exercise logger"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={20} color={isDark ? '#f5f7f8' : '#0F172A'} />
      </TouchableOpacity>

      {/* Mid Info: Thumbnail + Title + Subtitle */}
      <View style={styles.midWrap}>
        <View
          style={[
            styles.thumbFrame,
            {
              backgroundColor: isDark ? '#171a1d' : '#F8FAFC',
              borderColor: isDark ? '#22262a' : '#E2E8F0',
            },
          ]}
        >
          {exercise?.gif_url || exercise?.image_url ? (
            <OptimizedImage
              uri={exercise.gif_url || exercise.image_url}
              style={styles.thumbImage}
            />
          ) : (
            <Ionicons name="barbell-outline" size={20} color="#16a9ff" />
          )}
        </View>

        <View style={styles.textWrap}>
          <Text
            style={[styles.exName, { color: isDark ? '#f5f7f8' : '#0F172A' }]}
            numberOfLines={1}
          >
            {exercise?.name ?? 'Set Logger'}
          </Text>
          <Text style={[styles.exSub, { color: isDark ? '#626b75' : '#64748B' }]}>
            {isEditing ? (
              `Editing Set ${editingSetNumber ?? setNumber}`
            ) : isCardio ? (
              'Log duration'
            ) : (
              <>
                Set{' '}
                <Text style={{ color: isDark ? '#f5f7f8' : '#0F172A', fontWeight: 'bold' }}>
                  {setNumber}
                </Text>{' '}
                of {totalSets}
              </>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
});

export default SetLoggerHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  thumbFrame: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  exName: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  exSub: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    marginTop: 1,
  },
});
