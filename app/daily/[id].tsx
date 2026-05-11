import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Image, Modal,
  ScrollView, TextInput, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { id: workoutId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Workout-level timer
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const workoutTimerRef = useRef<any>(null);

  // Set logger modal
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [activeSetNum, setActiveSetNum] = useState(1);
  const [setModalVisible, setSetModalVisible] = useState(false);

  // Set timer (per set)
  const [setTimer, setSetTimer] = useState(0);
  const [setTimerRunning, setSetTimerRunning] = useState(false);
  const setTimerRef = useRef<any>(null);

  // Rest timer
  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const restTimerRef = useRef<any>(null);

  // Set input values
  const [inputWeight, setInputWeight] = useState('');
  const [inputReps, setInputReps] = useState('');

  // Completion
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Guide Modal
  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [guideExercise, setGuideExercise] = useState<any>(null);

  // Add Extra Exercise Modals
  const [addExModalVisible, setAddExModalVisible] = useState(false);
  const [browseCategory, setBrowseCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [exercisesInCategory, setExercisesInCategory] = useState<any[]>([]);
  const [loadingExs, setLoadingExs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 20;

  const fetchWorkout = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(res.data);
      // Initialize timer from saved state if not already running or if we want to sync
      if (res.data.total_duration_seconds > 0 && workoutElapsed === 0) {
        setWorkoutElapsed(res.data.total_duration_seconds);
      }
    } catch (err) {
      console.error('Error fetching workout:', err);
    } finally {
      setLoading(false);
    }
  }, [workoutId, workoutElapsed]);

  useFocusEffect(useCallback(() => {
    fetchWorkout();
  }, [fetchWorkout]));

  // Start/Stop workout timer
  useEffect(() => {
    if (workout?.status === 'completed') {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      // Ensure local timer matches saved duration for completed workouts
      setWorkoutElapsed(workout.total_duration_seconds || 0);
      return;
    }

    if (!workoutTimerRef.current && workout?.status === 'active') {
      workoutTimerRef.current = setInterval(() => {
        setWorkoutElapsed(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (workoutTimerRef.current) {
        clearInterval(workoutTimerRef.current);
        workoutTimerRef.current = null;
      }
    };
  }, [workout?.status, workout?.total_duration_seconds]);

  // Set timer toggle
  const toggleSetTimer = () => {
    if (setTimerRunning) {
      clearInterval(setTimerRef.current);
      setSetTimerRunning(false);
    } else {
      setTimerRef.current = setInterval(() => setSetTimer(prev => prev + 1), 1000);
      setSetTimerRunning(true);
    }
  };

  // Start rest timer
  const startRest = (seconds: number) => {
    setRestTimer(seconds);
    setRestRunning(true);
    restTimerRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current);
          setRestRunning(false);
          showToast('Rest complete! Time to go! 💪');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const openSetModal = (exercise: any) => {
    const nextSet = (exercise.sets?.length || 0) + 1;
    setActiveExercise(exercise);
    setActiveSetNum(nextSet);
    setInputWeight(exercise.target_weight || '0');
    setInputReps('');
    setSetTimer(0);
    setSetTimerRunning(false);
    if (setTimerRef.current) clearInterval(setTimerRef.current);
    setSetModalVisible(true);
  };

  const handleLogSet = async () => {
    if (!inputReps || parseInt(inputReps) === 0) {
      showToast('Enter reps completed', 'info');
      return;
    }
    if (setTimerRunning) {
      clearInterval(setTimerRef.current);
      setSetTimerRunning(false);
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/daily/exercises/${activeExercise.id}/sets`, {
        set_number: activeSetNum,
        weight: parseFloat(inputWeight) || 0,
        reps: parseInt(inputReps),
        duration_seconds: setTimer,
        rest_seconds: 0,
        workout_duration: workoutElapsed, // Sync overall duration
      }, { headers: { Authorization: `Bearer ${token}` } });

      showToast(`Set ${activeSetNum} logged! 🔥`);
      setSetModalVisible(false);
      fetchWorkout();

      // Start rest timer (parse from target_reps format like '60s' or '90')
      const restMatch = (activeExercise.target_reps || '60s').match(/\d+/);
      const restSec = restMatch ? parseInt(restMatch[0]) : 60;
      startRest(restSec);
    } catch (err) {
      console.error('Error logging set:', err);
      showToast('Failed to log set', 'error');
    }
  };

  const handleSkipSet = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/daily/exercises/${activeExercise.id}/sets`, {
        set_number: activeSetNum,
        weight: 0,
        reps: 0,
        duration_seconds: 0,
        rest_seconds: 0,
        workout_duration: workoutElapsed,
        is_skipped: true,
      }, { headers: { Authorization: `Bearer ${token}` } });

      showToast(`Set ${activeSetNum} skipped`);
      setSetModalVisible(false);
      fetchWorkout();
    } catch (err) {
      console.error('Error skipping set:', err);
      showToast('Failed to skip set', 'error');
    }
  };

  const handleSkipExercise = async (exerciseId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${API_URL}/daily/exercises/${exerciseId}/skip`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Exercise skipped');
      fetchWorkout();
    } catch (err) {
      console.error('Error skipping exercise:', err);
      showToast('Failed to skip exercise', 'error');
    }
  };

  const openGuide = (exercise: any) => {
    setGuideExercise(exercise);
    setGuideModalVisible(true);
  };

  const openAddExercise = async () => {
    setAddExModalVisible(true);
    setBrowseCategory(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/exercises/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const selectCategory = async (cat: string) => {
    setBrowseCategory(cat);
    setSearchQuery('');
    setPage(0);
    setHasMore(true);
    fetchExtraExercises('', cat, 0);
  };

  const fetchExtraExercises = async (q: string, cat: string | null, p: number = 0) => {
    if (p === 0) setLoadingExs(true);
    else setLoadingMore(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const offset = p * LIMIT;
      const url = `${API_URL}/workouts/exercises/search`;
      
      const res = await axios.get(url, {
        params: { q, category: cat, limit: LIMIT, offset },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newExs = res.data;
      if (p === 0) {
        if (cat) setExercisesInCategory(newExs);
        else setSearchResults(newExs);
      } else {
        if (cat) setExercisesInCategory(prev => [...prev, ...newExs]);
        else setSearchResults(prev => [...prev, ...newExs]);
      }
      setHasMore(newExs.length === LIMIT);
      setPage(p);
    } catch (err) {
      console.error('Error fetching extra exercises:', err);
    } finally {
      setLoadingExs(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!addExModalVisible) return;
    const timeout = setTimeout(() => {
      if (searchQuery.length >= 2 || (addExModalVisible && !browseCategory && searchQuery === '')) {
        fetchExtraExercises(searchQuery, browseCategory, 0);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, browseCategory, addExModalVisible]);

  const loadMoreExtra = () => {
    if (!loadingExs && !loadingMore && hasMore) {
      fetchExtraExercises(searchQuery, browseCategory, page + 1);
    }
  };

  const addExtraExercise = async (ex: any) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/daily/workouts/${workoutId}/exercises`, {
        exercise_id: ex.id,
        target_sets: 3,
        target_reps: '10-12',
        target_weight: 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showToast(`${ex.name} added to session!`);
      setAddExModalVisible(false);
      fetchWorkout();
    } catch (err) {
      console.error('Error adding extra exercise:', err);
      showToast('Failed to add exercise', 'error');
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      setIsSearching(true);
    } else if (text.length === 0) {
      setIsSearching(false);
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutId) {
      showToast('Workout ID missing', 'error');
      return;
    }
    setFinishing(true);
    // Always stop the workout timer
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
    if (restTimerRef.current) clearInterval(restTimerRef.current);

    try {
      const token = await AsyncStorage.getItem('userToken');

      // Safely calculate total volume
      let totalVolume = 0;
      const exercises = workout?.exercises || [];
      for (const ex of exercises) {
        for (const s of (ex.sets || [])) {
          totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
        }
      }

      const response = await axios.patch(
        `${API_URL}/daily/workouts/${workoutId}/complete`,
        {
          total_duration_seconds: workoutElapsed,
          total_volume: Math.round(totalVolume * 100) / 100,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        if (response.data.status === 'completed') {
          router.replace(`/daily/complete?id=${workoutId}&duration=${workoutElapsed}&volume=${totalVolume.toFixed(1)}`);
        } else {
          showToast('Progress saved! You can finish this workout later. 💪');
          router.replace('/(tabs)/daily');
        }
      } else {
        throw new Error('No data returned from server');
      }
    } catch (err: any) {
      console.error('Error finishing workout:', err?.response?.data || err);
      const data = err?.response?.data;
      const msg = data?.details || data?.error || 'Failed to save workout';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
      // Restart the timer since we failed
      workoutTimerRef.current = setInterval(() => setWorkoutElapsed(prev => prev + 1), 1000);
      setFinishing(false);
    }
  };

  const completedCount = workout?.exercises?.filter((e: any) => e.is_completed).length || 0;
  const totalCount = workout?.exercises?.length || 0;

  const renderExercise = ({ item }: { item: any }) => {
    const completedSets = item.sets?.length || 0;
    const targetSets = item.target_sets || 3;
    const isDone = item.is_completed;
    const isSkipped = item.is_skipped;

    return (
      <View style={[
        styles.exCard,
        { backgroundColor: colors.card, borderColor: isSkipped ? colors.border : (isDone ? '#10B981' : colors.border) },
        isSkipped && { opacity: 0.6 }
      ]}>
        <TouchableOpacity style={styles.exHeader} onPress={() => openGuide(item)} activeOpacity={0.7}>
          <Image source={{ uri: item.image_url }} style={styles.exImage} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.exName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Ionicons name="information-circle-outline" size={16} color="#E00000" />
            </View>
            <Text style={[styles.exMeta, { color: colors.textMuted }]}>
              {item.target_sets} sets × {item.target_reps} reps • {item.target_weight}kg target
            </Text>
          </View>
          {isDone && !isSkipped && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
          {isSkipped && <Text style={[styles.skipLabel, { color: colors.textMuted }]}>SKIPPED</Text>}
        </TouchableOpacity>

        {/* View mode indicator */}
        {workout?.status === 'completed' && isDone && !isSkipped && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>COMPLETED</Text>
          </View>
        )}

        {/* Sets logged */}
        {item.sets && item.sets.length > 0 && (
          <View style={[styles.setsTable, { backgroundColor: colors.inputBg }]}>
            <View style={styles.tableHeader}>
              {['SET', 'KG', 'REPS', 'TIME'].map(h => (
                <Text key={h} style={[styles.tableHeaderText, { color: colors.textMuted }]}>{h}</Text>
              ))}
            </View>
            {item.sets.map((s: any) => (
              <View key={s.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { color: colors.text }]}>{s.set_number}</Text>
                <Text style={[styles.tableCell, { color: s.is_skipped ? colors.textDim : colors.text }]}>{s.weight}</Text>
                <Text style={[styles.tableCell, { color: s.is_skipped ? colors.textDim : colors.text }]}>{s.is_skipped ? 'SKIPPED' : s.reps}</Text>
                <Text style={[styles.tableCell, { color: s.is_skipped ? colors.textDim : colors.text }]}>{formatTime(s.duration_seconds || 0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress + Log Set button */}
        <View style={styles.exFooter}>
          <View style={[styles.exProgress, { backgroundColor: colors.border }]}>
            <View style={[styles.exProgressFill, {
              width: `${Math.min((completedSets / targetSets) * 100, 100)}%` as any,
              backgroundColor: isDone ? '#10B981' : '#E00000'
            }]} />
          </View>
          <Text style={[styles.setsCount, { color: colors.textMuted }]}>{completedSets}/{targetSets}</Text>
          {!isDone && !isSkipped && workout?.status === 'active' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: colors.border }]}
                onPress={() => handleSkipExercise(item.id)}
              >
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>SKIP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logSetBtn} onPress={() => openSetModal(item)}>
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.logSetBtnGrad}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.logSetBtnText}>LOG SET {completedSets + 1}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E00000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => workout?.status === 'completed' ? router.back() : setShowFinishModal(true)}>
            <Ionicons name={workout?.status === 'completed' ? 'arrow-back' : 'close'} size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.timerPill}>
            <Ionicons name={workout?.status === 'completed' ? 'checkmark-done' : 'timer-outline'} size={16} color={workout?.status === 'completed' ? '#10B981' : '#E00000'} />
            <Text style={[styles.timerText, { color: colors.text }]}>
              {workout?.status === 'completed' ? 'COMPLETED' : formatTime(workoutElapsed)}
            </Text>
          </View>
          {workout?.status === 'active' ? (
            <TouchableOpacity style={styles.finishBtn} onPress={() => setShowFinishModal(true)}>
              <Text style={styles.finishBtnText}>FINISH</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Completion Photo if exists */}
        {workout?.status === 'completed' && workout?.completion_photo_url && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: workout.completion_photo_url }} style={styles.completionPhoto} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>Session Completed ✨</Text>
            </LinearGradient>
          </View>
        )}

        {/* Progress overview */}
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.workoutTitle, { color: colors.text }]} numberOfLines={1}>
            {workout?.title || 'Workout'}
          </Text>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {completedCount}/{totalCount} exercises complete
            </Text>
            {restRunning && (
              <View style={styles.restPill}>
                <Ionicons name="bed-outline" size={12} color="#3B82F6" />
                <Text style={styles.restPillText}>REST {formatTime(restTimer)}</Text>
              </View>
            )}
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` as any : '0%' }]} />
          </View>
        </View>

        <FlatList
          data={workout?.exercises || []}
          keyExtractor={item => String(item.id)}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={workout?.status === 'active' ? (
            <TouchableOpacity style={[styles.addExFooterBtn, { borderColor: colors.border }]} onPress={openAddExercise}>
              <Ionicons name="add-circle-outline" size={20} color="#E00000" />
              <Text style={[styles.addExFooterText, { color: colors.text }]}>ADD EXTRA EXERCISE</Text>
            </TouchableOpacity>
          ) : null}
        />
      </View>

      {/* Set Logger Modal */}
      <Modal visible={setModalVisible} transparent animationType="slide" onRequestClose={() => setSetModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{activeExercise?.name}</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>Set {activeSetNum} of {activeExercise?.target_sets}</Text>
              </View>
              <TouchableOpacity onPress={() => setSetModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Digital Clock */}
            <View style={styles.clockWrap}>
              <Text style={[styles.clockTime, { color: colors.text }]}>{formatTime(setTimer)}</Text>
              <TouchableOpacity style={styles.clockBtn} onPress={toggleSetTimer}>
                <LinearGradient
                  colors={setTimerRunning ? ['#EF4444', '#B91C1C'] : ['#E00000', '#B00000']}
                  style={styles.clockBtnGrad}
                >
                  <Ionicons name={setTimerRunning ? 'pause' : 'play'} size={28} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSetTimer(0); clearInterval(setTimerRef.current); setSetTimerRunning(false); }}>
                <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Input fields */}
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>WEIGHT (kg)</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  keyboardType="decimal-pad"
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>REPS DONE</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={inputReps}
                  onChangeText={setInputReps}
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.modalSkipBtn, { borderColor: colors.border }]} onPress={handleSkipSet}>
                <Text style={[styles.modalSkipBtnText, { color: colors.textMuted }]}>SKIP SET</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveSetBtn} onPress={handleLogSet}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.saveSetBtnGrad}>
                  <Ionicons name="checkmark" size={22} color="#FFF" />
                  <Text style={styles.saveSetBtnText}>SAVE SET</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Workout Confirmation */}
      <ConfirmationModal
        visible={showFinishModal}
        title="Finish Workout?"
        message={`You've completed ${completedCount} of ${totalCount} exercises. Save and end this session?`}
        confirmText={finishing ? 'SAVING...' : 'FINISH & SAVE'}
        confirmColor="#10B981"
        onConfirm={handleFinishWorkout}
        onCancel={() => setShowFinishModal(false)}
      />

      {/* Exercise Guide Modal */}
      <Modal visible={guideModalVisible} transparent animationType="fade" onRequestClose={() => setGuideModalVisible(false)}>
        <View style={styles.guideOverlay}>
          <View style={[styles.guideContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.closeGuide} onPress={() => setGuideModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="rgba(0,0,0,0.5)" />
            </TouchableOpacity>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: guideExercise?.gif_url || guideExercise?.image_url }} style={styles.guideGif} resizeMode="contain" />
              
              <View style={styles.guideBody}>
                <Text style={[styles.guideName, { color: colors.text }]}>{guideExercise?.name}</Text>
                
                <View style={styles.guideMetaRow}>
                  <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{guideExercise?.equipment}</Text>
                  </View>
                  <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{guideExercise?.target}</Text>
                  </View>
                </View>

                <Text style={[styles.guideSectionTitle, { color: colors.text }]}>Instructions</Text>
                <Text style={[styles.guideText, { color: colors.textMuted }]}>
                  {guideExercise?.instructions_en || 'No instructions available for this exercise.'}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.gotItBtn} onPress={() => setGuideModalVisible(false)}>
              <LinearGradient colors={['#E00000', '#B00000']} style={styles.gotItBtnGrad}>
                <Text style={styles.gotItBtnText}>GOT IT, LET'S GO!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Extra Exercise Modal */}
      <Modal visible={addExModalVisible} transparent animationType="slide" onRequestClose={() => setAddExModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {browseCategory ? browseCategory : (searchQuery ? 'Search Results' : 'Add Exercise')}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {browseCategory || searchQuery ? 'Select an exercise to add' : 'Choose a category or search'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                if (browseCategory) setBrowseCategory(null);
                else if (searchQuery) { setSearchQuery(''); setIsSearching(false); }
                else setAddExModalVisible(false);
              }}>
                <Ionicons name={(browseCategory || searchQuery) ? "arrow-back" : "close"} size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="search" size={18} color={colors.textDim} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={browseCategory ? `Search in ${browseCategory}...` : "Search exercises..."}
                placeholderTextColor={colors.textDim}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); }}>
                  <Ionicons name="close-circle" size={18} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>

            {browseCategory || isSearching ? (
              loadingExs ? (
                <ActivityIndicator color="#E00000" style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  style={{ flex: 1 }}
                  data={browseCategory ? exercisesInCategory : searchResults}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  onEndReached={loadMoreExtra}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={loadingMore ? <ActivityIndicator color="#E00000" style={{ marginVertical: 20 }} /> : null}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.browserItem, { borderBottomColor: colors.border }]} onPress={() => addExtraExercise(item)}>
                      <Image source={{ uri: item.image_url }} style={styles.browserImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.browserName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.browserMeta, { color: colors.textMuted }]}>{item.equipment} • {item.target}</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color="#E00000" />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Text style={{ color: colors.textMuted, fontFamily: FONTS.body }}>No exercises found.</Text>
                    </View>
                  }
                />
              )
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.catGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.catCard, { backgroundColor: colors.inputBg }]} onPress={() => selectCategory(cat)}>
                      <Text style={[styles.catText, { color: colors.text }]}>{cat}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(224,0,0,0.08)', borderRadius: 20 },
  timerText: { fontFamily: FONTS.bodyBold, fontSize: 16, letterSpacing: 1 },
  finishBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  finishBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF', letterSpacing: 1 },
  progressCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1 },
  workoutTitle: { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontFamily: FONTS.body, fontSize: 13 },
  restPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F615', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  restPillText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#3B82F6' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E00000', borderRadius: 3 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  exCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1.5 },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exImage: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5', marginRight: 14 },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 3 },
  exMeta: { fontFamily: FONTS.body, fontSize: 12 },
  setsTable: { borderRadius: 12, padding: 12, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', marginBottom: 6 },
  tableHeaderText: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 5 },
  tableCell: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  exFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exProgress: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  exProgressFill: { height: '100%', borderRadius: 2 },
  setsCount: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  logSetBtn: { borderRadius: 10, overflow: 'hidden' },
  logSetBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9 },
  logSetBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FFF' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 2 },
  modalSub: { fontFamily: FONTS.body, fontSize: 13 },
  clockWrap: { alignItems: 'center', marginBottom: 28 },
  clockTime: { fontFamily: FONTS.heading, fontSize: 60, letterSpacing: 2, marginBottom: 16 },
  clockBtn: { borderRadius: 40, overflow: 'hidden', marginBottom: 10 },
  clockBtnGrad: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  resetText: { fontFamily: FONTS.body, fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  inputGroup: { flex: 1 },
  inputLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  numInput: { height: 60, borderRadius: 14, borderWidth: 1, textAlign: 'center', fontFamily: FONTS.heading, fontSize: 28 },
  saveSetBtn: { flex: 1.2, borderRadius: 18, overflow: 'hidden' },
  saveSetBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58 },
  saveSetBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  doneBadge: { backgroundColor: '#10B98115', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, position: 'absolute', top: 16, right: 16 },
  doneBadgeText: { color: '#10B981', fontFamily: FONTS.bodyBold, fontSize: 10 },
  photoContainer: { marginHorizontal: 20, height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  completionPhoto: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, justifyContent: 'center', paddingHorizontal: 20 },
  photoOverlayText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 16 },
  skipLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 1 },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  skipBtnText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  modalSkipBtn: { flex: 0.8, height: 58, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modalSkipBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 1 },
  // Guide Modal
  guideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  guideContent: { borderRadius: 32, overflow: 'hidden', maxHeight: '85%' },
  closeGuide: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  guideGif: { width: '100%', height: 250, backgroundColor: '#FFF' },
  guideBody: { padding: 24 },
  guideName: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 12 },
  guideMetaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  guideBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  guideBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, textTransform: 'uppercase' },
  guideSectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 10 },
  guideText: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 24 },
  gotItBtn: { margin: 24, marginTop: 0, borderRadius: 16, overflow: 'hidden' },
  gotItBtnGrad: { height: 56, justifyContent: 'center', alignItems: 'center' },
  gotItBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
  addExFooterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderStyle: 'dashed', borderWidth: 1.5, borderRadius: 20, marginTop: 10, marginBottom: 40 },
  addExFooterText: { fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 0.5 },
  catGrid: { gap: 12 },
  catCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16 },
  catText: { fontFamily: FONTS.bodyBold, fontSize: 15, textTransform: 'capitalize' },
  browserItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  browserImg: { width: 50, height: 50, borderRadius: 10, marginRight: 14, backgroundColor: '#FFF' },
  browserName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  browserMeta: { fontFamily: FONTS.body, fontSize: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 16, marginBottom: 20, gap: 10, borderWidth: 0 },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 15, padding: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
});
