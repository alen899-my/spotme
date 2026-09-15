import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import WorkoutExerciseLogCard from './WorkoutExerciseLogCard';
import ExercisePreviewModal from '../modals/ExercisePreviewModal';

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

  const handleOpenGuide = (ex: any) => {
    setSelectedExercise(ex);
    setPreviewVisible(true);
  };

  const handleCloseGuide = () => {
    setPreviewVisible(false);
    setSelectedExercise(null);
  };

  if (!exercises || exercises.length === 0) {
    return (
      <View style={[styles.container, containerStyle]}>
        {!hideTitle && (
          <Text style={[styles.sectionLabel, { color: colors.text }, titleStyle]}>
            {title}
          </Text>
        )}
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: isDark ? colors.card : '#F8FAFC',
              borderColor: isDark ? colors.border : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name="barbell-outline"
            size={28}
            color={isDark ? colors.textMuted : '#94A3B8'}
          />
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
        <Text style={[styles.sectionLabel, { color: colors.text }, titleStyle]}>
          {title}
        </Text>
      )}

      {exercises.map((ex: any, idx: number) => (
        <WorkoutExerciseLogCard
          key={ex.id || `exercise-${idx}`}
          exercise={ex}
          defaultExpanded={defaultExpanded}
          onOpenGuide={handleOpenGuide}
        />
      ))}

      {/* Exercise Preview / Instructions Modal */}
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
    borderWidth: 1,
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
});

export default WorkoutMovementSummaryList;
