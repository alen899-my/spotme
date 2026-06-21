import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { FONTS } from '../../../../constants/theme';
import { P } from '../../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '../../../../contexts/ToastContext';
import ExercisePreviewModal from '../../../../components/modals/ExercisePreviewModal';
import ExerciseBrowser from '../../../../components/exercises/ExerciseBrowser';
import { API_URL } from '../../../../utils/api';
import { getToken as getSecureToken } from '../../../../utils/tokenStorage';

export default function AddSessionExercisesScreen() {
  const router = useRouter();
  const { id: sessionId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [previewEx, setPreviewEx] = useState<any>(null);

  const handleAdd = async (exerciseId: string) => {
    setAddingId(exerciseId);
    try {
      const token = await getSecureToken();
      await axios.post(
        `${API_URL}/workouts/sessions/${sessionId}/exercises`,
        { exercise_id: exerciseId, sets: 3, reps: '8-12', rest_time: '60s' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Exercise added to session!');
    } catch (err) {
      console.error('Error adding exercise:', err);
      showToast('Failed to add exercise', 'error');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Exercises</Text>
          <View style={{ width: 28 }} />
        </View>

        <ExerciseBrowser
          apiEndpoint="/workouts/exercises/search"
          variant="add"
          onSelectExercise={(exercise) => setPreviewEx(exercise)}
          onAddExercise={(exercise) => handleAdd(exercise.id)}
          addingId={addingId}
          emptyMessage="No exercises found"
        />

        <ExercisePreviewModal
          visible={previewEx !== null}
          exercise={previewEx}
          onClose={() => setPreviewEx(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
});
