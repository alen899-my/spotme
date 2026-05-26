import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image, Modal,
  ScrollView, TextInput, Platform, Vibration,
  Dimensions, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ExercisePreviewModal from '../../components/modals/ExercisePreviewModal';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Rating config ──
const RATING_ICONS: string[] = [
  'sad-outline',         // 1
  'thumbs-down-outline', // 2
  'remove-outline',      // 3
  'ellipse-outline',     // 4
  'checkmark-outline',   // 5
  'happy-outline',       // 6
  'barbell-outline',     // 7
  'flash-outline',       // 8
  'flame-outline',       // 9
  'trophy-outline',      // 10
];
const LABELS = [
  'Terrible', 'Very Bad', 'Okayish', 'Decent', 'Good',
  'Very Good', 'Strong Lift', 'Amazing', 'Beast Mode', 'Legendary!',
];
// Single accent colour for selected state — vivid indigo
const RATING_ACCENT = '#7C6EF7';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseCard
// ─────────────────────────────────────────────────────────────────────────────
const ExerciseCard = React.memo(({
  item, colors, workoutStatus, activeExerciseId,
  setTimer, setTimerRunning,
  openGuide, removeExercise, removeSet,
  handleSkipExercise, openSetModal, handleRateExercise,
  loadingSkip, loadingLogSet,
}: {
  item: any; colors: any; workoutStatus: string;
  activeExerciseId: number | null; setTimer: number; setTimerRunning: boolean;
  openGuide: (item: any) => void; removeExercise: (id: number) => void;
  removeSet: (id: number) => void; handleSkipExercise: (id: number) => void;
  openSetModal: (item: any) => void; handleRateExercise: (id: number, rating: number) => Promise<void>;
  loadingSkip: boolean; loadingLogSet: boolean;
}) => {
  const [localRating, setLocalRating] = useState<number | null>(item.rating || null);
  // ── 2. Accordion state ──
  const [expanded, setExpanded] = useState(true);
  // ── 6. Rating accordion ──
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => { setLocalRating(item.rating || null); }, [item.rating]);

  const completedSets = item.sets?.length || 0;
  const targetSets = item.target_sets || 3;
  const isDone = item.is_completed;
  const isSkipped = item.is_skipped;

  const onRate = (num: number) => {
    setLocalRating(num);
    handleRateExercise(item.id, num);
  };

  return (
    <View style={[
      styles.exCard,
      { backgroundColor: P.cta, borderColor: isSkipped ? P.border : (isDone ? '#10B981' : P.ctaDark) },
      isSkipped && { opacity: 0.7 },
    ]}>
      {/* ── HEADER (always visible) ── */}
      <TouchableOpacity
        style={styles.exHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.image_url }} style={styles.exImage} />
        <View style={{ flex: 1 }}>
          {/* ── 3. Title wraps, no truncation ── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.exName}>{item.name}</Text>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); openGuide(item); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="information-circle-outline" size={16} color={P.sun} style={{ marginTop: 3 }} />
            </TouchableOpacity>
          </View>
          {/* ── 4. Progress bar instead of meta text ── */}
          <View style={styles.headerProgressWrap}>
            <View style={[styles.headerProgressBar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <View style={[
                styles.headerProgressFill,
                {
                  width: `${Math.min((completedSets / targetSets) * 100, 100)}%` as any,
                  backgroundColor: isDone ? '#10B981' : P.sun,
                },
              ]} />
            </View>
            <Text style={styles.headerProgressLabel}>{completedSets}/{targetSets} sets</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {isDone && !isSkipped && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
          {isSkipped && <Text style={styles.skipLabel}>SKIPPED</Text>}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.6)" />
        </View>
        {workoutStatus === 'active' && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); removeExercise(item.id); }}
            style={{ padding: 6, marginLeft: 4 }}
          >
            <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.72)" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ── ACCORDION BODY ── */}
      {expanded && (
        <>
          {/* Sets table */}
          {item.sets && item.sets.length > 0 && (
            <View style={styles.setsTable}>
              <View style={styles.tableHeader}>
                {['SET', 'KG', 'REPS', 'TIME', ''].map((h, i) => (
                  <Text key={i} style={[styles.tableHeaderText, i === 4 && { flex: 0.4 }]}>{h}</Text>
                ))}
              </View>
              {item.sets.map((s: any) => (
                <View key={s.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, s.is_skipped && styles.tableCellMuted]}>{s.set_number}</Text>
                  <Text style={[styles.tableCell, s.is_skipped && styles.tableCellMuted]}>{s.weight}</Text>
                  <Text style={[styles.tableCell, s.is_skipped && styles.tableCellMuted]}>{s.is_skipped ? 'SKIP' : s.reps}</Text>
                  <Text style={[styles.tableCell, s.is_skipped && styles.tableCellMuted]}>{formatTime(s.duration_seconds || 0)}</Text>
                  {/* ── 5. Solid red delete button ── */}
                  <View style={{ flex: 0.4, alignItems: 'center' }}>
                    {workoutStatus === 'active' && (
                      <TouchableOpacity
                        onPress={() => removeSet(s.id)}
                        style={styles.setDeleteBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash" size={13} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Rating accordion ── */}
          {isDone && !isSkipped && (
            <View style={styles.ratingBanner}>
              {/* Yellow header strip */}
              <TouchableOpacity
                style={styles.ratingBannerHeader}
                onPress={() => setRatingOpen(v => !v)}
                activeOpacity={0.85}
              >
                <Ionicons name="star" size={15} color="#92610A" />
                <Text style={styles.ratingBannerTitle}>RATE THIS EXERCISE</Text>
                {localRating ? (
                  <View style={styles.ratingBannerBadge}>
                    <Text style={styles.ratingBannerBadgeText}>{localRating}/10 · {LABELS[localRating - 1]}</Text>
                  </View>
                ) : null}
                <Ionicons name={ratingOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#92610A" />
              </TouchableOpacity>

              {/* Dark card grid — only when open */}
              {ratingOpen && (
                <View style={styles.ratingGrid}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = localRating === num;
                    const baseOpacity = 0.22 + (num - 1) * 0.07;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.ratingCard,
                          isSelected
                            ? { backgroundColor: RATING_ACCENT, borderColor: RATING_ACCENT }
                            : { backgroundColor: `rgba(255,255,255,${baseOpacity * 0.13})`, borderColor: `rgba(255,255,255,${baseOpacity})` },
                        ]}
                        onPress={() => onRate(num)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={RATING_ICONS[num - 1] as any}
                          size={16}
                          color={isSelected ? '#FFF' : `rgba(255,255,255,${0.45 + (num - 1) * 0.058})`}
                        />
                        <Text style={[
                          styles.ratingCardNum,
                          { color: isSelected ? '#FFF' : `rgba(255,255,255,${0.55 + (num - 1) * 0.05})` },
                        ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.exFooter}>
            {!isDone && !isSkipped && workoutStatus === 'active' && (
              <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                <TouchableOpacity
                  style={[styles.skipBtn, { borderColor: 'rgba(255,255,255,0.3)', opacity: loadingSkip ? 0.5 : 1 }]}
                  onPress={() => handleSkipExercise(item.id)}
                  disabled={loadingSkip}
                >
                  <Text style={styles.skipBtnText}>{loadingSkip ? '...' : 'SKIP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logSetBtn, { opacity: loadingLogSet ? 0.8 : 1, flex: 1 }]}
                  onPress={() => openSetModal(item)}
                  disabled={loadingLogSet}
                >
                  <View style={styles.logSetBtnGrad}>
                    {loadingLogSet ? <ActivityIndicator size="small" color="#FFF" /> : (
                      <>
                        <Ionicons name={activeExerciseId === item.id && setTimer > 0 ? 'play' : 'add'} size={16} color="#FFF" />
                        <Text style={styles.logSetBtnText}>
                          {activeExerciseId === item.id && setTimerRunning ? 'CONTINUE SET' : `LOG SET ${completedSets + 1}`}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RestShakeIcon — ① animated shake when rest hits 0
// ─────────────────────────────────────────────────────────────────────────────
const RestShakeIcon = ({ restTimer, restRunning }: { restTimer: number; restRunning: boolean }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevTimer = useRef(restTimer);

  useEffect(() => {
    // Trigger shake when timer reaches 0 while running
    if (restRunning && restTimer === 0 && prevTimer.current > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 40, useNativeDriver: true }),
      ]).start();
    }
    prevTimer.current = restTimer;
  }, [restTimer, restRunning]);

  const isAlert = restTimer === 0 && restRunning;
  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <View style={[styles.dashIconBox, { backgroundColor: isAlert ? '#EF4444' : P.ctaDark }]}>
        <Ionicons name={isAlert ? 'alert-circle' : 'cafe'} size={16} color="#FFF" />
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { id: workoutId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleRateExercise = async (dailyExId: number, rating: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setWorkout((prev: any) => {
        if (!prev || !prev.exercises) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex: any) =>
            ex.id === dailyExId ? { ...ex, rating } : ex
          ),
        };
      });
      await axios.patch(`${API_URL}/daily/exercises/${dailyExId}/rating`, { rating }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Rating saved! 🌟');
    } catch (err) {
      console.error('Error saving exercise rating:', err);
      showToast('Failed to save rating', 'error');
    }
  };

  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const workoutTimerRef = useRef<any>(null);

  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [activeSetNum, setActiveSetNum] = useState(1);
  const [setModalVisible, setSetModalVisible] = useState(false);

  const [setTimer, setSetTimer] = useState(0);
  const [setTimerRunning, setSetTimerRunning] = useState(false);
  const setTimerRef = useRef<any>(null);

  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [totalRestElapsed, setTotalRestElapsed] = useState(0);
  const restTimerRef = useRef<any>(null);

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

  useEffect(() => {
    if (workout?.status === 'completed') {
      router.replace(`/daily/view/${workoutId}`);
    }
  }, [workout?.status]);

  const [guideModalVisible, setGuideModalVisible] = useState(false);
  const [guideExercise, setGuideExercise] = useState<any>(null);

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

  const [finishWater, setFinishWater] = useState(0);
  const [finishWeight, setFinishWeight] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

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

  useFocusEffect(useCallback(() => { fetchWorkout(); }, [fetchWorkout]));

  useEffect(() => {
    let interval: any = null;
    if (workout?.status === 'active' && !setTimerRunning) {
      interval = setInterval(() => { setTotalRestElapsed(prev => prev + 1); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [setTimerRunning, workout?.status]);

  useEffect(() => {
    if (workout?.status === 'completed') {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      setWorkoutElapsed(workout.total_duration_seconds || 0);
      return;
    }
    if (!workoutTimerRef.current && workout?.status === 'active') {
      workoutTimerRef.current = setInterval(() => { setWorkoutElapsed(prev => prev + 1); }, 1000);
    }
    return () => {
      if (workoutTimerRef.current) { clearInterval(workoutTimerRef.current); workoutTimerRef.current = null; }
    };
  }, [workout?.status, workout?.total_duration_seconds]);

  useEffect(() => {
    if (workout?.status !== 'active') return;
    const interval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
          total_duration_seconds: workoutElapsed,
          total_rest_seconds: totalRestElapsed,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) { console.warn('Auto-sync failed:', err); }
    }, 15000);
    return () => clearInterval(interval);
  }, [workoutId, workoutElapsed, totalRestElapsed, workout?.status]);

  const toggleSetTimer = () => {
    if (setTimerRunning) {
      clearInterval(setTimerRef.current);
      setSetTimerRunning(false);
    } else {
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
          // ── 1. No toast — shake animation handled in RestShakeIcon ──
          clearInterval(restTimerRef.current);
          setRestRunning(false);
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
    if (setTimerRunning) { clearInterval(setTimerRef.current); setSetTimerRunning(false); }
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
      setSetTimer(0);
      setSetTimerRunning(false);
      fetchWorkout();
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
        set_number: activeSetNum, weight: 0, reps: 0, duration_seconds: 0,
        rest_seconds: 0, workout_duration: workoutElapsed, is_skipped: true,
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
        headers: { Authorization: `Bearer ${token}` },
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

  const openGuide = (exercise: any) => { setGuideExercise(exercise); setGuideModalVisible(true); };

  const openAddExercise = async () => {
    setAddExModalVisible(true);
    setBrowseCategory(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/exercises/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data);
    } catch (err) { console.error('Error fetching categories:', err); }
  };

  const selectCategory = async (cat: string) => {
    setBrowseCategory(cat);
    setSearchQuery('');
    setPage(0);
    setHasMore(true);
    fetchExtraExercises('', cat, 0);
  };

  const fetchExtraExercises = async (q: string, cat: string | null, p: number = 0) => {
    if (p === 0) setLoadingExs(true); else setLoadingMore(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const offset = p * LIMIT;
      const res = await axios.get(`${API_URL}/workouts/exercises/search`, {
        params: { q, category: cat, limit: LIMIT, offset },
        headers: { Authorization: `Bearer ${token}` },
      });
      const newExs = res.data;
      if (p === 0) {
        if (cat) setExercisesInCategory(newExs); else setSearchResults(newExs);
      } else {
        if (cat) setExercisesInCategory(prev => [...prev, ...newExs]);
        else setSearchResults(prev => [...prev, ...newExs]);
      }
      setHasMore(newExs.length === LIMIT);
      setPage(p);
    } catch (err) { console.error('Error fetching extra exercises:', err); }
    finally { setLoadingExs(false); setLoadingMore(false); }
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
    if (!loadingExs && !loadingMore && hasMore) fetchExtraExercises(searchQuery, browseCategory, page + 1);
  };

  const addExtraExercise = async (ex: any) => {
    if (loadingAddEx) return;
    setLoadingAddEx(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/daily/workouts/${workoutId}/exercises`, {
        exercise_id: ex.id, target_sets: 3, target_reps: '10-12', target_weight: 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(`${ex.name} added to session!`);
      setAddExModalVisible(false);
      fetchWorkout();
    } catch (err) {
      console.error('Error adding extra exercise:', err);
      showToast('Failed to add exercise', 'error');
    } finally { setLoadingAddEx(false); }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) setIsSearching(true);
    else if (text.length === 0) setIsSearching(false);
  };

  const handleSaveAndExit = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
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
    } finally { setUpdatingMetrics(false); }
  };

  const removeExercise = (dailyExId: number) => { setDeleteId(dailyExId); setShowDeleteModal(true); };
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/exercises/${deleteId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Exercise removed');
      setShowDeleteModal(false);
      setDeleteId(null);
      fetchWorkout();
    } catch (err) {
      console.error('Error removing exercise:', err);
      showToast('Failed to remove exercise', 'error');
    }
  };

  const removeSet = (setId: number) => { setDeleteSetId(setId); setShowDeleteSetModal(true); };
  const handleConfirmDeleteSet = async () => {
    if (!deleteSetId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/sets/${deleteSetId}`, { headers: { Authorization: `Bearer ${token}` } });
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
      case 'workout':   return { title: 'TOTAL WORKOUT',   value: formatTime(workoutElapsed),   color: P.cta,      icon: 'timer-outline' };
      case 'rest':      return { title: 'CURRENT REST',    value: formatTime(restTimer),         color: P.ctaDark,  icon: 'cafe-outline'  };
      case 'totalRest': return { title: 'TOTAL REST TAKEN', value: formatTime(totalRestElapsed), color: '#10B981',  icon: 'hourglass-outline' };
      default:          return { title: '', value: '', color: '#000', icon: 'help' };
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutId) { showToast('Workout ID missing', 'error'); return; }
    setFinishing(true);
    if (workoutTimerRef.current) { clearInterval(workoutTimerRef.current); workoutTimerRef.current = null; }
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
      }, { headers: { Authorization: `Bearer ${token}` } });
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
        if (isAvailable) { await Sharing.shareAsync(uri); }
        else showToast('Sharing not available', 'error');
      } catch (err) { console.error('Download error:', err); showToast('Failed to download photo', 'error'); }
    }
  };

  const handleUpdatePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      if (!workoutId) { showToast('Workout ID not found', 'error'); return; }
      const newUris = result.assets.map(a => a.uri);
      setUploadingPhotos(newUris);
      setLoadingPhotos(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        for (const [index, asset] of result.assets.entries()) {
          const uri = asset.uri;
          if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('photos', blob, `photo_${Date.now()}_${index}.jpg`);
          } else {
            const name = uri.split('/').pop() || `photo_${index}.jpg`;
            const match = /\.(\w+)$/.exec(name);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            formData.append('photos', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name, type } as any);
          }
        }
        await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        showToast('Photos uploaded!');
        fetchWorkout();
      } catch (err) {
        console.error('Error uploading photos:', err);
        showToast('Failed to upload photos', 'error');
      } finally { setLoadingPhotos(false); setUploadingPhotos([]); }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/photos/${photoId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Photo removed');
      fetchWorkout();
    } catch (err) { console.error('Error deleting photo:', err); showToast('Failed to remove photo', 'error'); }
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
    } catch (err) { console.error('Error updating metrics:', err); showToast('Failed to update metrics', 'error'); }
    finally { setUpdatingMetrics(false); }
  };

  const openEditMetrics = () => {
    setFinishWater(Number(workout?.water_intake_liters) || 0);
    setFinishWeight(String(workout?.post_workout_weight || ''));
    setShowEditMetricsModal(true);
  };

  const completedCount = workout?.exercises?.filter((e: any) => e.is_completed).length || 0;
  const totalCount = workout?.exercises?.length || 0;

  const renderExercise = useCallback(({ item }: { item: any }) => (
    <ExerciseCard
      item={item} colors={colors} workoutStatus={workout?.status}
      activeExerciseId={activeExercise?.id} setTimer={setTimer} setTimerRunning={setTimerRunning}
      openGuide={openGuide} removeExercise={removeExercise} removeSet={removeSet}
      handleSkipExercise={handleSkipExercise} openSetModal={openSetModal}
      handleRateExercise={handleRateExercise} loadingSkip={loadingSkip} loadingLogSet={loadingLogSet}
    />
  ), [colors, workout?.status, activeExercise?.id, setTimer, setTimerRunning, openGuide,
    removeExercise, removeSet, handleSkipExercise, openSetModal, handleRateExercise, loadingSkip, loadingLogSet]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={P.cta} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
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

        {/* ── Dashboard row with ① rest shake icon ── */}
        {workout?.status === 'active' && (
          <View style={[styles.dashboardRow, { backgroundColor: colors.bg }]}>
            <View style={styles.dashboardPill}>
              <TouchableOpacity style={styles.dashSegment} onPress={() => openTimerDetail('workout')}>
                <View style={[styles.dashIconBox, { backgroundColor: P.sun }]}>
                  <Ionicons name="timer" size={16} color="#FFF" />
                </View>
                <View style={styles.dashTextWrap}>
                  <Text style={styles.dashLabel}>WORKOUT</Text>
                  <Text style={styles.dashText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatTime(workoutElapsed)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dashDivider} />

              {/* ① Shake icon instead of toast */}
              <TouchableOpacity style={styles.dashSegment} onPress={() => openTimerDetail('rest')}>
                <RestShakeIcon restTimer={restTimer} restRunning={restRunning} />
                <View style={styles.dashTextWrap}>
                  <Text style={styles.dashLabel}>REST</Text>
                  <Text style={[styles.dashText, restTimer === 0 && restRunning ? { color: '#EF4444' } : null]}
                    numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {formatTime(restTimer)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dashDivider} />

              <TouchableOpacity style={styles.dashSegment} onPress={() => openTimerDetail('totalRest')}>
                <View style={[styles.dashIconBox, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="hourglass" size={16} color="#FFF" />
                </View>
                <View style={styles.dashTextWrap}>
                  <Text style={styles.dashLabel}>TOTAL REST</Text>
                  <Text style={styles.dashText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatTime(totalRestElapsed)}</Text>
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
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.workoutTitle, { color: colors.text }]}>{workout?.title || workout?.session_name || 'Workout Session'}</Text>
              <View style={styles.progressRow}>
                <Text style={[styles.progressText, { color: colors.textMuted }]}>
                  {completedCount} of {totalCount} exercises completed
                </Text>
                <Text style={[styles.progressPercent, { color: P.cta }]}>
                  {Math.round((completedCount / (totalCount || 1)) * 100)}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${(completedCount / (totalCount || 1)) * 100}%` as any }]} />
              </View>

              {(workout?.photos?.length > 0 || uploadingPhotos.length > 0) && (
                <View style={{ marginTop: 24, marginBottom: 10 }}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="camera" size={18} color={P.cta} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>SESSION PHOTOS</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 10 }}>
                    {workout?.photos?.map((p: any) => (
                      <TouchableOpacity key={p.id} style={styles.photoThumbWrap} onPress={() => { setViewerUri(p.photo_url); setViewerVisible(true); }}>
                        <Image source={{ uri: p.photo_url }} style={styles.photoThumb} />
                        <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleDeletePhoto(p.id)}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {uploadingPhotos.map((uri, idx) => (
                      <View key={`uploading-${idx}`} style={[styles.photoThumbWrap, { opacity: 0.6 }]}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                          <ActivityIndicator size="small" color="#FFF" />
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          }
          ListFooterComponent={workout?.status === 'active' ? (
            <View style={styles.footerContainer}>
              <TouchableOpacity style={[styles.addExFooterBtn, { borderColor: colors.border }]} onPress={openAddExercise}>
                <Ionicons name="add-circle-outline" size={20} color={P.cta} />
                <Text style={[styles.addExFooterText, { color: colors.text }]}>ADD EXTRA EXERCISE</Text>
              </TouchableOpacity>
            </View>
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
            <View style={styles.clockWrap}>
              <Text style={[styles.clockTime, { color: colors.text }]}>{formatTime(setTimer)}</Text>
              <TouchableOpacity style={styles.clockBtn} onPress={toggleSetTimer}>
                <LinearGradient colors={setTimerRunning ? [P.ctaDark, P.ctaDeep] : [P.cta, P.ctaDark]} style={styles.clockBtnGrad}>
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
              <TouchableOpacity style={[styles.modalSkipBtn, { borderColor: colors.border, opacity: loadingSkip ? 0.5 : 1 }]} onPress={handleSkipSet} disabled={loadingSkip}>
                <Text style={[styles.modalSkipBtnText, { color: colors.textMuted }]}>{loadingSkip ? 'SKIPPING...' : 'SKIP SET'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveSetBtn, { opacity: loadingLogSet ? 0.8 : 1 }]} onPress={handleLogSet} disabled={loadingLogSet}>
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

      <ConfirmationModal visible={showFinishModal} title="Finish Session?" message="Are you sure you want to end this workout? All your stats will be finalized." confirmText={finishing ? 'FINISHING...' : 'YES, FINISH'} confirmColor="#10B981" onConfirm={handleFinishWorkout} onCancel={() => setShowFinishModal(false)} />
      <ConfirmationModal visible={showExitModal} title="Save & Exit?" message="Your workout is in progress. Save current progress and continue later?" confirmText={updatingMetrics ? 'SAVING...' : 'SAVE & EXIT'} confirmColor="#3B82F6" onConfirm={handleSaveAndExit} onCancel={() => setShowExitModal(false)} />
      <ConfirmationModal visible={showDeleteModal} title="Remove Exercise?" message="Are you sure you want to remove this movement from today's session? This won't affect your main split." confirmText="REMOVE" confirmColor="#EF4444" onConfirm={handleConfirmDelete} onCancel={() => { setShowDeleteModal(false); setDeleteId(null); }} />
      <ConfirmationModal visible={showDeleteSetModal} title="Delete Set?" message="Are you sure you want to remove this set? Your volume and stats will be updated." confirmText="DELETE" confirmColor="#EF4444" onConfirm={handleConfirmDeleteSet} onCancel={() => { setShowDeleteSetModal(false); setDeleteSetId(null); }} />

      <ExercisePreviewModal visible={guideModalVisible} exercise={guideExercise} onClose={() => setGuideModalVisible(false)} />

      {/* Add Exercise Modal */}
      <Modal visible={addExModalVisible} transparent animationType="slide" onRequestClose={() => setAddExModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{browseCategory ? browseCategory : (searchQuery ? 'Search Results' : 'Add Exercise')}</Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>{browseCategory || searchQuery ? 'Select an exercise' : 'Choose category or search'}</Text>
              </View>
              <TouchableOpacity onPress={() => { if (browseCategory) setBrowseCategory(null); else if (searchQuery) { setSearchQuery(''); setIsSearching(false); } else setAddExModalVisible(false); }}>
                <Ionicons name={(browseCategory || searchQuery) ? 'arrow-back' : 'close'} size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="search" size={18} color={colors.textDim} />
              <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder={browseCategory ? `Search in ${browseCategory}...` : 'Search exercises...'} placeholderTextColor={colors.textDim} value={searchQuery} onChangeText={handleSearch} autoCorrect={false} />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); }}><Ionicons name="close-circle" size={18} color={colors.textDim} /></TouchableOpacity>}
            </View>
            {browseCategory || isSearching ? (
              loadingExs ? <ActivityIndicator color={P.cta} style={{ marginTop: 40 }} /> : (
                <FlatList style={{ flex: 1 }} data={browseCategory ? exercisesInCategory : searchResults} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} onEndReached={loadMoreExtra} onEndReachedThreshold={0.5}
                  ListFooterComponent={loadingMore ? <ActivityIndicator color={P.cta} style={{ marginVertical: 20 }} /> : null}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.browserItem, { borderBottomColor: colors.border }]} onPress={() => addExtraExercise(item)}>
                      <Image source={{ uri: item.image_url }} style={styles.browserImg} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.browserName, { color: colors.text }]}>{item.name}</Text>
                          {item.avg_rating !== undefined && item.avg_rating !== null && (
                            <View style={[styles.avgRatingBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                              <Ionicons name="star" size={10} color="#F59E0B" />
                              <Text style={[styles.avgRatingText, { color: colors.text }]}>{item.avg_rating}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.browserMeta, { color: colors.textMuted }]}>{item.equipment} • {item.target}</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={P.cta} />
                    </TouchableOpacity>
                  )}
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

      {/* Photo Viewer Modal */}
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.timerModalOverlay} activeOpacity={1} onPress={() => setTimerModalVisible(false)}>
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
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, marginBottom: 8 },
  finishBtn:       { backgroundColor: P.cta, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  finishBtnText:   { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF', letterSpacing: 1 },

  // Dashboard
  dashboardRow:    { paddingHorizontal: 20, marginBottom: 24 },
  dashboardPill:   { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, elevation: 4, shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, backgroundColor: P.cta, borderColor: P.ctaDark },
  dashSegment:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  dashIconBox:     { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dashTextWrap:    { flex: 1, minWidth: 0 },
  dashLabel:       { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, color: 'rgba(255,255,255,0.72)' },
  dashText:        { fontFamily: FONTS.heading, fontSize: 14, letterSpacing: 0.3, color: '#FFF' },
  dashDivider:     { width: 1, height: 24, marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.16)' },

  // List
  listContent:     { paddingHorizontal: 20, paddingBottom: 40 },
  listHeader:      { marginBottom: 20 },
  workoutTitle:    { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 6 },
  progressRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  progressText:    { fontFamily: FONTS.body, fontSize: 13 },
  progressPercent: { fontFamily: FONTS.heading, fontSize: 16 },
  progressBar:     { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: P.cta, borderRadius: 3 },

  // Exercise card
  exCard:          { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  exHeader:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  exImage:         { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 16 },
  // ── 3. Name wraps ──
  exName:          { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 4, color: P.sun, flexShrink: 1 },
  // ── 4. Header progress ──
  headerProgressWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  headerProgressBar:   { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  headerProgressFill:  { height: '100%', borderRadius: 3 },
  headerProgressLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.72)', minWidth: 48 },

  // Sets table
  setsTable:         { borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  tableHeader:       { flexDirection: 'row', marginBottom: 10 },
  tableHeaderText:   { flex: 1, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.5, color: 'rgba(255,255,255,0.72)' },
  tableRow:          { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  tableCell:         { flex: 1, textAlign: 'center', fontFamily: FONTS.bodySemiBold, fontSize: 15, color: '#FFF' },
  tableCellMuted:    { color: 'rgba(255,255,255,0.42)' },
  // ── 5. Solid red delete ──
  setDeleteBtn:      { width: 26, height: 26, borderRadius: 7, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },

  // ── Rating banner ──
  ratingBanner:           { marginTop: 4, marginBottom: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F5C842' },
  ratingBannerHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#FEF3C7' },
  ratingBannerTitle:      { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 12, color: '#92610A', letterSpacing: 0.8 },
  ratingBannerBadge:      { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  ratingBannerBadgeText:  { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#FFF' },
  ratingGrid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 7, padding: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  ratingCard:             { width: (SCREEN_WIDTH - 40 - 40 - 67) / 5, aspectRatio: 1, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 3 },
  ratingCardNum:          { fontFamily: FONTS.heading, fontSize: 13 },

  // Footer
  exFooter:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  skipLabel:         { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.72)' },
  skipBtn:           { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  skipBtnText:       { fontFamily: FONTS.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.78)' },
  logSetBtn:         { borderRadius: 12, overflow: 'hidden' },
  logSetBtnGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: P.ctaDark },
  logSetBtnText:     { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF' },

  // Footer add button
  footerContainer:   { gap: 20, marginTop: 10, marginBottom: 40 },
  addExFooterBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderStyle: 'dashed', borderWidth: 1.5, borderRadius: 20, marginTop: 10, marginBottom: 40 },
  addExFooterText:   { fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 0.5 },

  // Photos
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle:      { fontFamily: FONTS.bodyBold, fontSize: 14, flex: 1 },
  photoThumbWrap:    { width: 120, height: 160, borderRadius: 16, overflow: 'hidden' },
  photoThumb:        { width: '100%', height: '100%' },
  removePhotoBtn:    { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(224,0,0,0.8)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  // Modals
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  timerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle:        { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 2 },
  modalSub:          { fontFamily: FONTS.body, fontSize: 13 },
  clockWrap:         { alignItems: 'center', marginBottom: 28 },
  clockTime:         { fontFamily: FONTS.heading, fontSize: 60, letterSpacing: 2, marginBottom: 16 },
  clockBtn:          { borderRadius: 40, overflow: 'hidden', marginBottom: 10 },
  clockBtnGrad:      { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  resetText:         { fontFamily: FONTS.body, fontSize: 13 },
  inputRow:          { flexDirection: 'row', gap: 16, marginBottom: 20 },
  inputGroup:        { flex: 1 },
  inputLabel:        { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  numInput:          { height: 60, borderRadius: 14, borderWidth: 1, textAlign: 'center', fontFamily: FONTS.heading, fontSize: 28 },
  saveSetBtn:        { flex: 1.2, borderRadius: 18, overflow: 'hidden' },
  saveSetBtnGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58 },
  saveSetBtnText:    { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  modalSkipBtn:      { flex: 0.8, height: 58, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  modalSkipBtnText:  { fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 1 },

  // Browse
  catGrid:       { gap: 12 },
  catCard:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16 },
  catText:       { fontFamily: FONTS.bodyBold, fontSize: 15, textTransform: 'capitalize' },
  browserItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  browserImg:    { width: 50, height: 50, borderRadius: 10, marginRight: 14, backgroundColor: '#FFF' },
  browserName:   { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  browserMeta:   { fontFamily: FONTS.body, fontSize: 12 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 16, marginBottom: 20, gap: 10 },
  searchInput:   { flex: 1, fontFamily: FONTS.body, fontSize: 15, padding: 0 },
  avgRatingBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 4 },
  avgRatingText: { fontFamily: FONTS.bodyBold, fontSize: 10 },

  // Viewer
  viewerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose:     { position: 'absolute', top: 50, right: 20, zIndex: 100 },
  viewerImage:     { width: '100%', height: '80%' },
  downloadBtn:     { position: 'absolute', bottom: 40, borderRadius: 20, overflow: 'hidden' },
  downloadBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },

  // Timer detail
  timerDetailCard:      { width: SCREEN_WIDTH * 0.8, padding: 30, borderRadius: 32, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
  timerDetailTitle:     { fontFamily: FONTS.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 20, letterSpacing: 2 },
  timerDetailValue:     { fontFamily: FONTS.heading, fontSize: 48, color: '#FFF', marginVertical: 10 },
  timerDetailClose:     { marginTop: 20, paddingHorizontal: 30, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },
  timerDetailCloseText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },

  // Metrics modal
  finishSection: { marginBottom: 24 },
});