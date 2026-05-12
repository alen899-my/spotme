import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Image, Modal,
  ScrollView, TextInput, Platform, Alert, Vibration,
  Dimensions,
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
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  const [totalRestElapsed, setTotalRestElapsed] = useState(0);
  const restTimerRef = useRef<any>(null);

  // Set input values
  const [inputWeight, setInputWeight] = useState('');
  const [inputReps, setInputReps] = useState('');

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showEditMetricsModal, setShowEditMetricsModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [updatingMetrics, setUpdatingMetrics] = useState(false);
  const [loadingLogSet, setLoadingLogSet] = useState(false);
  const [loadingSkip, setLoadingSkip] = useState(false);
  const [loadingAddEx, setLoadingAddEx] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [selectedTimerType, setSelectedTimerType] = useState<'workout' | 'rest' | 'totalRest' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteSetModal, setShowDeleteSetModal] = useState(false);
  const [deleteSetId, setDeleteSetId] = useState<number | null>(null);

  // New Performance Summary Component
  const WorkoutPerformanceSummary = ({ data }: { data: any }) => {
    if (!data) return null;

    const stats = [
      { label: 'DURATION', val: formatTime(data.total_duration_seconds || 0), icon: 'time', color: '#EF4444', sub: 'Total active time' },
      { label: 'VOLUME', val: `${Math.round(data.total_volume || 0)}kg`, icon: 'barbell', color: '#10B981', sub: 'Total weight lifted' },
      { label: 'REST TIME', val: formatTime(data.total_rest_seconds || 0), icon: 'hourglass', color: '#F59E0B', sub: 'Recovery between sets' },
      { label: 'SETS', val: `${data.total_sets || 0}`, icon: 'layers', color: '#8B5CF6', sub: 'Total sets completed' },
      { label: 'HYDRATION', val: `${Number(data.water_intake_liters || 0).toFixed(1)}L`, icon: 'water', color: '#3B82F6', sub: 'Water intake' },
      { label: 'BODY WEIGHT', val: `${data.post_workout_weight || 0}kg`, icon: 'scale', color: '#10B981', sub: 'Current body mass' },
    ];

    const startTime = (data.started_at || data.created_at) ? new Date(data.started_at || data.created_at).toLocaleString([], { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    }) : '';

    return (
      <View style={styles.perfContainer}>
        <View style={styles.perfHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.perfTitle, { color: colors.text }]}>{data.title || data.session_name || 'Workout Summary'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.perfSub, { color: colors.textMuted }]}>{startTime}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={openEditMetrics} style={styles.perfEditBtn}>
            <Ionicons name="options-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.perfGrid}>
          {stats.map((item, idx) => (
            <View key={idx} style={[
              styles.perfCard, 
              { 
                backgroundColor: item.color, 
                borderRightColor: 'rgba(255,255,255,0.3)',
                borderRightWidth: 4,
                borderWidth: 0
              }
            ]}>
              <View style={[styles.perfIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={item.icon as any} size={18} color="#FFF" />
              </View>
              <View style={styles.perfContent}>
                <Text style={[styles.perfLabel, { color: 'rgba(255,255,255,0.7)' }]}>{item.label}</Text>
                <Text style={[styles.perfValue, { color: '#FFF' }]}>{item.val}</Text>
                <Text style={[styles.perfSubLabel, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

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

  // Finish Workflow States
  const [finishWater, setFinishWater] = useState(0);
  const [finishWeight, setFinishWeight] = useState('');
  const [finishPhotos, setFinishPhotos] = useState<string[]>([]);

  // Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const fetchWorkout = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(res.data);
      if (res.data.total_duration_seconds > 0 && workoutElapsed === 0) {
        setWorkoutElapsed(res.data.total_duration_seconds);
      }
      if (res.data.total_rest_seconds > 0 && totalRestElapsed === 0) {
        setTotalRestElapsed(res.data.total_rest_seconds);
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

  // Total Rest Accumulator Effect
  useEffect(() => {
    let interval: any = null;
    if (workout?.status === 'active' && !setTimerRunning) {
      interval = setInterval(() => {
        setTotalRestElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [setTimerRunning, workout?.status]);

  useEffect(() => {
    if (workout?.status === 'completed') {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
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

  // Periodic Auto-Sync
  useEffect(() => {
    if (workout?.status !== 'active') return;
    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
          total_duration_seconds: workoutElapsed,
          total_rest_seconds: totalRestElapsed,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        console.warn('Auto-sync failed:', err);
      }
    }, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [workoutId, workoutElapsed, totalRestElapsed, workout?.status]);

  const toggleSetTimer = () => {
    if (setTimerRunning) {
      clearInterval(setTimerRef.current);
      setSetTimerRunning(false);
    } else {
      // Auto-stop rest when starting a set
      if (restRunning) {
        setRestRunning(false);
        if (restTimerRef.current) clearInterval(restTimerRef.current);
      }
      setTimerRef.current = setInterval(() => setSetTimer(prev => prev + 1), 1000);
      setSetTimerRunning(true);
    }
  };

  const startRest = (seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer(seconds);
    setRestRunning(true);
    restTimerRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          Vibration.vibrate([0, 500, 200, 500]);
          showToast('Rest Over! Start your next set! 🔥', 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const openSetModal = (ex: any) => {
    if (activeExercise?.id !== ex.id && !setTimerRunning) {
      setSetTimer(0);
      setInputWeight('');
      setInputReps('');
    }
    setActiveExercise(ex);
    setActiveSetNum((ex.sets?.length || 0) + 1);
    setSetModalVisible(true);
  };

  const handleLogSet = async () => {
    if (loadingLogSet) return;
    if (!inputReps || parseInt(inputReps) === 0) {
      showToast('Enter reps completed', 'info');
      return;
    }
    setLoadingLogSet(true);
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
        workout_duration: workoutElapsed,
        total_rest_duration: totalRestElapsed,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`Set ${activeSetNum} logged! 🔥`);
      setSetModalVisible(false);
      setSetTimer(0); // Reset only after successful log
      setSetTimerRunning(false);
      fetchWorkout();
      
      // Fix: Use target_rest_time instead of target_reps
      const restMatch = (activeExercise.target_rest_time || '60s').match(/\d+/);
      const restSec = restMatch ? parseInt(restMatch[0]) : 60;
      startRest(restSec);
    } catch (err) {
      console.error('Error logging set:', err);
      showToast('Failed to log set', 'error');
    } finally {
      setLoadingLogSet(false);
    }
  };

  const handleSkipSet = async () => {
    if (loadingSkip) return;
    setLoadingSkip(true);
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
    } finally {
      setLoadingSkip(false);
    }
  };

  const handleSkipExercise = async (exerciseId: number) => {
    if (loadingSkip) return;
    setLoadingSkip(true);
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
    } finally {
      setLoadingSkip(false);
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
    if (loadingAddEx) return;
    setLoadingAddEx(true);
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
    } finally {
      setLoadingAddEx(false);
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

  const handleSaveAndExit = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Final sync of timers before exiting
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
        total_duration_seconds: workoutElapsed,
        total_rest_seconds: totalRestElapsed,
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showToast('Workout saved in progress!', 'info');
      setShowExitModal(false);
      router.back();
    } catch (err) {
      console.error('Error saving and exiting:', err);
      showToast('Failed to save workout', 'error');
      // Still exit if it's just a sync failure? Maybe not.
    } finally {
      setUpdatingMetrics(false);
    }
  };

  const removeExercise = (dailyExId: number) => {
    setDeleteId(dailyExId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/exercises/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Exercise removed');
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchWorkout();
    } catch (err) {
      console.error('Error removing exercise:', err);
      showToast('Failed to remove exercise', 'error');
    }
  };

  const removeSet = (setId: number) => {
    setDeleteSetId(setId);
    setShowDeleteSetModal(true);
  };

  const handleConfirmDeleteSet = async () => {
    if (!deleteSetId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/sets/${deleteSetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Set removed');
      setShowDeleteSetModal(false);
      setDeleteSetId(null);
      fetchWorkout();
    } catch (err) {
      console.error('Error removing set:', err);
      showToast('Failed to remove set', 'error');
    }
  };

  const openTimerDetail = (type: 'workout' | 'rest' | 'totalRest') => {
    setSelectedTimerType(type);
    setTimerModalVisible(true);
  };

  const getTimerModalDetails = () => {
    switch (selectedTimerType) {
      case 'workout':
        return { title: 'TOTAL WORKOUT', value: formatTime(workoutElapsed), color: '#E00000', icon: 'timer-outline' };
      case 'rest':
        return { title: 'CURRENT REST', value: formatTime(restTimer), color: '#3B82F6', icon: 'cafe-outline' };
      case 'totalRest':
        return { title: 'TOTAL REST TAKEN', value: formatTime(totalRestElapsed), color: '#10B981', icon: 'hourglass-outline' };
      default:
        return { title: '', value: '', color: '#000', icon: 'help' };
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutId) {
      showToast('Workout ID missing', 'error');
      return;
    }
    setFinishing(true);
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      let totalVolume = 0;
      if (workout?.exercises) {
        for (const ex of workout.exercises) {
          if (ex.sets) {
            for (const s of ex.sets) {
              totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            }
          }
        }
      }

      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, {
        total_duration_seconds: workoutElapsed,
        total_rest_seconds: totalRestElapsed,
        total_volume: Math.round(totalVolume),
        water_intake_liters: finishWater,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Workout finished! Great job! 🏆');
      router.replace(`/daily/complete?id=${workoutId}&duration=${workoutElapsed}&volume=${totalVolume}&water=${finishWater}&rest=${totalRestElapsed}`);
    } catch (err: any) {
      console.error('Error finishing workout:', err);
      showToast('Failed to save workout', 'error');
      workoutTimerRef.current = setInterval(() => setWorkoutElapsed(prev => prev + 1), 1000);
      setFinishing(false);
    }
  };

  const handleDownload = async (uri: string) => {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri;
      link.download = `spotme-workout-${Date.now()}.jpg`;
      link.click();
    } else {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          showToast('Sharing not available', 'error');
        }
      } catch (err) {
        console.error('Download error:', err);
        showToast('Failed to download photo', 'error');
      }
    }
  };

  const handleUpdatePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      if (!workoutId) {
        showToast('Workout ID not found', 'error');
        return;
      }
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        
        for (const [index, asset] of result.assets.entries()) {
          const uri = asset.uri;
          
          if (Platform.OS === 'web') {
            // For Web: fetch the blob from the URI
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = uri.split('/').pop() || `photo_${index}.jpg`;
            formData.append('photos', blob, filename);
          } else {
            // For Native: use the uri/name/type object
            const name = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(name || '');
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            formData.append('photos', {
              uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
              name: name || `photo_${index}.jpg`,
              type: type,
            } as any);
          }
        }

        await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
          }
        });
        showToast('Photos uploaded!');
        fetchWorkout();
      } catch (err) {
        console.error('Error uploading photos:', err);
        showToast('Failed to upload photos', 'error');
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Photo removed');
      fetchWorkout();
    } catch (err) {
      console.error('Error deleting photo:', err);
      showToast('Failed to remove photo', 'error');
    }
  };

  const handleUpdateMetrics = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
        water_intake_liters: finishWater,
        post_workout_weight: parseFloat(finishWeight) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Metrics updated!');
      setShowEditMetricsModal(false);
      fetchWorkout();
    } catch (err) {
      console.error('Error updating metrics:', err);
      showToast('Failed to update metrics', 'error');
    } finally {
      setUpdatingMetrics(false);
    }
  };

  const openEditMetrics = () => {
    setFinishWater(Number(workout?.water_intake_liters) || 0);
    setFinishWeight(String(workout?.post_workout_weight || ''));
    setShowEditMetricsModal(true);
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
              {item.target_sets} sets × {item.target_reps} reps • {item.target_weight}kg target • {item.target_rest_time} rest
            </Text>
          </View>
          {isDone && !isSkipped && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
          {isSkipped && <Text style={[styles.skipLabel, { color: colors.textMuted }]}>SKIPPED</Text>}
          {workout?.status === 'active' && (
            <TouchableOpacity 
              onPress={(e) => { e.stopPropagation(); removeExercise(item.id); }} 
              style={{ padding: 6, marginLeft: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
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
                {workout?.status === 'active' && (
                  <TouchableOpacity onPress={() => removeSet(s.id)} style={{ paddingHorizontal: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
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
                style={[styles.skipBtn, { borderColor: colors.border, opacity: loadingSkip ? 0.5 : 1 }]}
                onPress={() => handleSkipExercise(item.id)}
                disabled={loadingSkip}
              >
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>{loadingSkip ? '...' : 'SKIP'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.logSetBtn, { opacity: loadingLogSet ? 0.8 : 1 }]} 
                onPress={() => openSetModal(item)}
                disabled={loadingLogSet}
              >
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.logSetBtnGrad}>
                  {loadingLogSet ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <>
                      <Ionicons name={activeExercise?.id === item.id && setTimer > 0 ? "play" : "add"} size={16} color="#FFF" />
                      <Text style={styles.logSetBtnText}>
                        {activeExercise?.id === item.id && setTimerRunning ? 'CONTINUE SET' : `LOG SET ${completedSets + 1}`}
                      </Text>
                    </>
                  )}
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => workout?.status === 'completed' ? router.back() : setShowExitModal(true)}>
            <Ionicons name={workout?.status === 'completed' ? 'arrow-back' : 'close'} size={28} color={colors.text} />
          </TouchableOpacity>
          
          {workout?.status === 'active' ? (
            <TouchableOpacity 
              style={[styles.finishBtn, { opacity: finishing ? 0.7 : 1 }]} 
              onPress={() => setShowFinishModal(true)}
              disabled={finishing}
            >
              {finishing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.finishBtnText}>FINISH</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {workout?.status === 'active' && (
          <View style={[styles.dashboardRow, { backgroundColor: colors.bg }]}>
            <View style={[styles.dashboardPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Workout Segment */}
              <TouchableOpacity 
                style={styles.dashSegment}
                onPress={() => openTimerDetail('workout')}
              >
                <View style={[styles.dashIconBox, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="timer" size={16} color="#FFF" />
                </View>
                <View>
                  <Text style={[styles.dashLabel, { color: colors.textMuted }]}>WORKOUT</Text>
                  <Text style={[styles.dashText, { color: colors.text }]}>{formatTime(workoutElapsed)}</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.dashDivider, { backgroundColor: colors.border }]} />

              {/* Rest Segment */}
              <TouchableOpacity 
                style={styles.dashSegment}
                onPress={() => openTimerDetail('rest')}
              >
                <View style={[styles.dashIconBox, { backgroundColor: restTimer === 0 && restRunning ? "#EF4444" : "#3B82F6" }]}>
                  <Ionicons 
                    name={restTimer === 0 && restRunning ? "alert-circle" : "cafe"} 
                    size={16} 
                    color="#FFF" 
                  />
                </View>
                <View>
                  <Text style={[styles.dashLabel, { color: colors.textMuted }]}>REST</Text>
                  <Text style={[
                    styles.dashText, 
                    { color: restTimer === 0 && restRunning ? "#EF4444" : colors.text },
                  ]}>
                    {formatTime(restTimer)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.dashDivider, { backgroundColor: colors.border }]} />

              {/* Total Rest Segment */}
              <TouchableOpacity 
                style={styles.dashSegment}
                onPress={() => openTimerDetail('totalRest')}
              >
                <View style={[styles.dashIconBox, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="hourglass" size={16} color="#FFF" />
                </View>
                <View>
                  <Text style={[styles.dashLabel, { color: colors.textMuted }]}>TOTAL REST</Text>
                  <Text style={[styles.dashText, { color: colors.text }]}>{formatTime(totalRestElapsed)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <FlatList
          data={workout?.exercises || []}
          keyExtractor={item => String(item.id)}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={workout?.status === 'completed' ? (
            <View style={{ marginBottom: 20 }}>
              {/* Photo Gallery */}
              {workout.photos && workout.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0, gap: 12, marginBottom: 20 }}>
                  {workout.photos.map((p: any) => (
                    <TouchableOpacity 
                      key={p.id} 
                      style={styles.photoThumbWrap} 
                      onPress={() => { setViewerUri(p.photo_url); setViewerVisible(true); }}
                    >
                      <Image source={{ uri: p.photo_url }} style={styles.photoThumb} />
                      <TouchableOpacity 
                        style={styles.removePhotoBtn} 
                        onPress={() => handleDeletePhoto(p.id)}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity 
                    style={[styles.photoThumbWrap, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }]} 
                    onPress={handleUpdatePhotos}
                  >
                    <Ionicons name="add" size={24} color={colors.textDim} />
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <TouchableOpacity 
                  style={[styles.photoContainer, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border, marginHorizontal: 0 }]} 
                  onPress={handleUpdatePhotos}
                >
                  <Ionicons name="camera" size={40} color={colors.textDim} />
                  <Text style={{ color: colors.textDim, fontFamily: FONTS.bodyBold, marginTop: 10 }}>ADD SESSION PHOTOS</Text>
                </TouchableOpacity>
              )}

              {/* New Professional Performance Dashboard */}
              <WorkoutPerformanceSummary data={workout} />
            </View>
          ) : null}
          ListFooterComponent={workout?.status === 'active' ? (
            <View style={styles.footerContainer}>
              <TouchableOpacity style={[styles.addExFooterBtn, { borderColor: colors.border }]} onPress={openAddExercise}>
                <Ionicons name="add-circle-outline" size={20} color="#E00000" />
                <Text style={[styles.addExFooterText, { color: colors.text }]}>ADD EXTRA EXERCISE</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      </View>

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
            <View style={styles.clockWrap}>
              <Text style={[styles.clockTime, { color: colors.text }]}>{formatTime(setTimer)}</Text>
              <TouchableOpacity style={styles.clockBtn} onPress={toggleSetTimer}>
                <LinearGradient colors={setTimerRunning ? ['#EF4444', '#B91C1C'] : ['#E00000', '#B00000']} style={styles.clockBtnGrad}>
                  <Ionicons name={setTimerRunning ? 'pause' : 'play'} size={28} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSetTimer(0); clearInterval(setTimerRef.current); setSetTimerRunning(false); }}>
                <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>WEIGHT (kg)</Text>
                <TextInput style={[styles.numInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="decimal-pad" value={inputWeight} onChangeText={setInputWeight} placeholder="0" placeholderTextColor={colors.textDim} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>REPS DONE</Text>
                <TextInput style={[styles.numInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} keyboardType="numeric" value={inputReps} onChangeText={setInputReps} placeholder="0" placeholderTextColor={colors.textDim} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.modalSkipBtn, { borderColor: colors.border, opacity: loadingSkip ? 0.5 : 1 }]} 
                onPress={handleSkipSet}
                disabled={loadingSkip}
              >
                <Text style={[styles.modalSkipBtnText, { color: colors.textMuted }]}>{loadingSkip ? 'SKIPPING...' : 'SKIP SET'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveSetBtn, { opacity: loadingLogSet ? 0.8 : 1 }]} 
                onPress={handleLogSet}
                disabled={loadingLogSet}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.saveSetBtnGrad}>
                  {loadingLogSet ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="checkmark" size={22} color="#FFF" />
                      <Text style={styles.saveSetBtnText}>SAVE SET</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showFinishModal}
        title="Finish Session?"
        message="Are you sure you want to end this workout? All your stats will be finalized."
        confirmText={finishing ? 'FINISHING...' : 'YES, FINISH'}
        confirmColor="#10B981"
        onConfirm={handleFinishWorkout}
        onCancel={() => setShowFinishModal(false)}
      />

      <ConfirmationModal
        visible={showExitModal}
        title="Save & Exit?"
        message="Your workout is in progress. Save current progress and continue later?"
        confirmText={updatingMetrics ? 'SAVING...' : 'SAVE & EXIT'}
        confirmColor="#3B82F6"
        onConfirm={handleSaveAndExit}
        onCancel={() => setShowExitModal(false)}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Remove Exercise?"
        message="Are you sure you want to remove this movement from today's session? This won't affect your main split."
        confirmText="REMOVE"
        confirmColor="#EF4444"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setShowDeleteModal(false); setDeleteId(null); }}
      />

      <ConfirmationModal
        visible={showDeleteSetModal}
        title="Delete Set?"
        message="Are you sure you want to remove this set? Your volume and stats will be updated."
        confirmText="DELETE"
        confirmColor="#EF4444"
        onConfirm={handleConfirmDeleteSet}
        onCancel={() => { setShowDeleteSetModal(false); setDeleteSetId(null); }}
      />

      <Modal visible={guideModalVisible} transparent animationType="fade" onRequestClose={() => setGuideModalVisible(false)}>
        <View style={styles.guideOverlay}>
          <View style={[styles.guideContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.closeGuide} onPress={() => setGuideModalVisible(false)}><Ionicons name="close-circle" size={32} color="rgba(0,0,0,0.5)" /></TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: guideExercise?.gif_url || guideExercise?.image_url }} style={styles.guideGif} resizeMode="contain" />
              <View style={styles.guideBody}>
                <Text style={[styles.guideName, { color: colors.text }]}>{guideExercise?.name}</Text>
                <View style={styles.guideMetaRow}>
                  <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}><Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{guideExercise?.equipment}</Text></View>
                  <View style={[styles.guideBadge, { backgroundColor: colors.inputBg }]}><Text style={[styles.guideBadgeText, { color: colors.textMuted }]}>{guideExercise?.target}</Text></View>
                </View>
                <Text style={[styles.guideSectionTitle, { color: colors.text }]}>Instructions</Text>
                <Text style={[styles.guideText, { color: colors.textMuted }]}>{guideExercise?.instructions_en || 'No instructions available.'}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.gotItBtn} onPress={() => setGuideModalVisible(false)}>
              <LinearGradient colors={['#E00000', '#B00000']} style={styles.gotItBtnGrad}><Text style={styles.gotItBtnText}>GOT IT, LET'S GO!</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addExModalVisible} transparent animationType="slide" onRequestClose={() => setAddExModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{browseCategory ? browseCategory : (searchQuery ? 'Search Results' : 'Add Exercise')}</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>{browseCategory || searchQuery ? 'Select an exercise' : 'Choose category or search'}</Text>
              </View>
              <TouchableOpacity onPress={() => { if (browseCategory) setBrowseCategory(null); else if (searchQuery) { setSearchQuery(''); setIsSearching(false); } else setAddExModalVisible(false); }}><Ionicons name={(browseCategory || searchQuery) ? "arrow-back" : "close"} size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="search" size={18} color={colors.textDim} />
              <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder={browseCategory ? `Search in ${browseCategory}...` : "Search exercises..."} placeholderTextColor={colors.textDim} value={searchQuery} onChangeText={handleSearch} autoCorrect={false} />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); }}><Ionicons name="close-circle" size={18} color={colors.textDim} /></TouchableOpacity>}
            </View>
            {browseCategory || isSearching ? (
              loadingExs ? <ActivityIndicator color="#E00000" style={{ marginTop: 40 }} /> : (
                <FlatList style={{ flex: 1 }} data={browseCategory ? exercisesInCategory : searchResults} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} onEndReached={loadMoreExtra} onEndReachedThreshold={0.5} ListFooterComponent={loadingMore ? <ActivityIndicator color="#E00000" style={{ marginVertical: 20 }} /> : null} renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.browserItem, { borderBottomColor: colors.border }]} onPress={() => addExtraExercise(item)}>
                    <Image source={{ uri: item.image_url }} style={styles.browserImg} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.browserName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.browserMeta, { color: colors.textMuted }]}>{item.equipment} • {item.target}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#E00000" />
                  </TouchableOpacity>
                )} />
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

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}><Ionicons name="close" size={32} color="#FFF" /></TouchableOpacity>
          {viewerUri && (
            <>
              <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
              <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(viewerUri)}>
                <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']} style={styles.downloadBtnGrad}>
                  <Ionicons name="download-outline" size={24} color="#FFF" />
                  <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold, marginLeft: 10 }}>DOWNLOAD / SHARE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Edit Metrics Modal */}
      <Modal visible={showEditMetricsModal} transparent animationType="slide" onRequestClose={() => setShowEditMetricsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Workout Metrics</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>Update your session data</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditMetricsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, minHeight: 300 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.finishSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="scale" size={20} color="#10B981" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Weight</Text>
                  </View>
                  <TextInput
                    style={[styles.numInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'left', paddingHorizontal: 16 }]}
                    placeholder="Enter weight in kg (e.g. 75.5)"
                    placeholderTextColor={colors.textDim}
                    keyboardType="decimal-pad"
                    value={finishWeight}
                    onChangeText={setFinishWeight}
                  />
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity style={[styles.saveSetBtn, { marginTop: 20 }]} onPress={handleUpdateMetrics} disabled={updatingMetrics}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.saveSetBtnGrad}>
                {updatingMetrics ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark-done" size={22} color="#FFF" />
                    <Text style={styles.saveSetBtnText}>UPDATE METRICS</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Timer Detail Modal */}
      <Modal visible={timerModalVisible} transparent animationType="fade" onRequestClose={() => setTimerModalVisible(false)}>
        <TouchableOpacity 
          style={styles.timerModalOverlay} 
          activeOpacity={1} 
          onPress={() => setTimerModalVisible(false)}
        >
          {selectedTimerType && (
            <View style={[styles.timerDetailCard, { backgroundColor: getTimerModalDetails().color }]}>
              <Ionicons name={getTimerModalDetails().icon as any} size={48} color="#FFF" />
              <Text style={styles.timerDetailTitle}>{getTimerModalDetails().title}</Text>
              <Text style={styles.timerDetailValue}>{getTimerModalDetails().value}</Text>
              <TouchableOpacity style={styles.timerDetailClose} onPress={() => setTimerModalVisible(false)}>
                <Text style={styles.timerDetailCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
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
  exCard: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  exImage: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F5F5F5', marginRight: 16 },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 4 },
  exMeta: { fontFamily: FONTS.body, fontSize: 13 },
  setsTable: { borderRadius: 16, padding: 16, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', marginBottom: 10 },
  tableHeaderText: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  tableCell: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodySemiBold, fontSize: 15 },
  exFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exProgress: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  exProgressFill: { height: '100%', borderRadius: 3 },
  setsCount: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  logSetBtn: { borderRadius: 12, overflow: 'hidden' },
  logSetBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  logSetBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  timerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
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
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  finishSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, flex: 1 },
  sectionVal: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  finishPhotoPrev: { width: '100%', height: 180, borderRadius: 16 },
  finishPhotoPlaceholder: { width: '100%', height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  changePhotoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  photoThumbWrap: { width: 120, height: 160, borderRadius: 16, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },
  finishPhotoWrap: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  finishPhotoThumb: { width: '100%', height: '100%' },
  finishPhotoAdd: { width: 100, height: 100, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(224,0,0,0.8)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 100 },
  viewerImage: { width: '100%', height: '80%' },
  downloadBtn: { position: 'absolute', bottom: 40, borderRadius: 20, overflow: 'hidden' },
  downloadBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  listHeader: { marginBottom: 20 },
  footerContainer: { gap: 20, marginTop: 10, marginBottom: 40, width: '100%' },
  waterTracker: { padding: 16, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.1)' },
  waterInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  waterTitle: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  waterVal: { fontFamily: FONTS.heading, fontSize: 18 },
  headerTimers: { flexDirection: 'row', gap: 8, marginLeft: 15 },
  dashboardRow: { paddingHorizontal: 20, marginBottom: 20 },
  dashboardPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dashSegment: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dashIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dashLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5 },
  dashText: { fontFamily: FONTS.heading, fontSize: 15, letterSpacing: 0.5 },
  dashDivider: { width: 1, height: 24, marginHorizontal: 10 },
  headerTimerCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  headerTimerText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: '#FFF', marginTop: 1 },
  timerDetailCard: { width: SCREEN_WIDTH * 0.8, padding: 30, borderRadius: 32, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
  timerDetailTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 20, letterSpacing: 2 },
  timerDetailValue: { fontFamily: FONTS.heading, fontSize: 48, color: '#FFF', marginVertical: 10 },
  timerDetailClose: { marginTop: 20, paddingHorizontal: 30, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },
  timerDetailCloseText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
  viewerStatSquare: { 
    width: (SCREEN_WIDTH - 76) / 3, 
    aspectRatio: 1, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
    padding: 8
  },
  squareIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  squareVal: { fontFamily: FONTS.bodyBold, fontSize: 11, textAlign: 'center' },
  perfContainer: { marginBottom: 10 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  perfTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  perfSub: { fontFamily: FONTS.body, fontSize: 13 },
  perfEditBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E00000', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  perfCard: { width: (SCREEN_WIDTH - 52) / 2, padding: 16, borderRadius: 20, overflow: 'hidden' },
  perfIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  perfContent: { gap: 2 },
  perfLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1 },
  perfValue: { fontFamily: FONTS.heading, fontSize: 18 },
  perfSubLabel: { fontFamily: FONTS.body, fontSize: 10 },
  progressPercent: { fontFamily: FONTS.heading, fontSize: 16 },
  browserImg: { width: 50, height: 50, borderRadius: 10, marginRight: 14, backgroundColor: '#FFF' },
  browserName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  browserMeta: { fontFamily: FONTS.body, fontSize: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 16, marginBottom: 20, gap: 10, borderWidth: 0 },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 15, padding: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
});
