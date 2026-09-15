import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import WorkoutExerciseLogCard from './WorkoutExerciseLogCard';
import ExercisePreviewModal from '../modals/ExercisePreviewModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH - 64;
const SNAP = CARD_W + 12;

export interface WorkoutMovementSummaryListProps {
  exercises?: any[];
  title?: string;
  defaultExpanded?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  hideTitle?: boolean;
}

export const WorkoutMovementSummaryList: React.FC<WorkoutMovementSummaryListProps> = ({
  exercises = [],
  title = 'Movement Summary',
  defaultExpanded = true,
  containerStyle,
  titleStyle,
  hideTitle = false,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleOpenGuide = (ex: any) => {
    setSelectedExercise(ex);
    setPreviewVisible(true);
  };

  const handleCloseGuide = () => {
    setPreviewVisible(false);
    setSelectedExercise(null);
  };

  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    setActiveIdx(idx);
  };

  if (!exercises || exercises.length === 0) {
    return (
      <View style={[styles.container, containerStyle]}>
        {!hideTitle && (
          <Text style={[styles.sectionLabel, { color: colors.text }, titleStyle]}>
            {title}
          </Text>
        )}
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
          <Ionicons name="barbell-outline" size={28} color={isDark ? colors.textMuted : '#94A3B8'} />
          <Text style={[styles.emptyText, { color: isDark ? colors.textMuted : '#64748B' }]}>
            No movements logged for this workout session.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {!hideTitle && (
        <Text style={[styles.sectionLabel, { color: colors.text, marginLeft: 20 }, titleStyle]}>
          {title}
        </Text>
      )}

      {/* Horizontal snap carousel */}
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
      >
        {exercises.map((ex: any, idx: number) => (
          <WorkoutExerciseLogCard
            key={ex.id || `exercise-${idx}`}
            exercise={ex}
            cardWidth={CARD_W}
            defaultExpanded={defaultExpanded}
            onOpenGuide={handleOpenGuide}
          />
        ))}
      </ScrollView>

      {/* Pagination dots */}
      {exercises.length > 1 && (
        <View style={styles.dotRow}>
          {exercises.map((_: any, i: number) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIdx
                    ? P.cta
                    : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'),
                  width: i === activeIdx ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}

      <ExercisePreviewModal
        visible={previewVisible}
        exercise={selectedExercise}
        onClose={handleCloseGuide}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionLabel: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});

export default WorkoutMovementSummaryList;
