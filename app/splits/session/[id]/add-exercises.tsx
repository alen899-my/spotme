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
  const { id: sessionId, replaceWseId, replaceSnapshot } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [previewEx, setPreviewEx] = useState<any>(null);

  const replacing = !!replaceWseId;

  const handleAdd = async (exerciseId: string) => {
    setAddingId(exerciseId);
    try {
      const token = await getSecureToken();
      let snapshot: any = null;
      try { snapshot = replaceSnapshot ? JSON.parse(String(replaceSnapshot)) : null; } catch { snapshot = null; }
      const created = await axios.post(
        `${API_URL}/workouts/sessions/${sessionId}/exercises`,
        {
          exercise_id: exerciseId,
          sets: snapshot?.sets ? parseInt(snapshot.sets) : 3,
          reps: snapshot?.reps || '8-12',
          rest_time: snapshot?.rest_time || '60s',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (snapshot?.weight !== undefined && snapshot?.weight !== null && String(snapshot.weight).trim() !== '') {
        await axios.put(`${API_URL}/workouts/exercises/${created.data.id}`, { weight: String(snapshot.weight) }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (replacing) {
        await axios.delete(`${API_URL}/workouts/exercises/${replaceWseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Exercise swapped!');
      } else {
        showToast('Exercise added to session!');
      }
      router.back();
    } catch (err) {
      console.error('Error adding exercise:', err);
      showToast(replacing ? 'Failed to swap exercise' : 'Failed to add exercise', 'error');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{replacing ? 'Swap Exercise' : 'Add Exercises'}</Text>
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
