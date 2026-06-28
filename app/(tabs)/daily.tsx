import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image,
  ScrollView, Animated, Easing, Dimensions,
  Modal, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OptimizedImage from '../../components/ui/OptimizedImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useWorkoutTimer } from '../../contexts/WorkoutTimerContext';
import ActionModal from '../../components/ui/ActionModal';
import DatePicker from '../../components/ui/DatePicker';
import { DailySkeleton } from '../../components/ui/Skeleton';
import { api } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { formatDuration, formatDateTime, isSameDay, isToday, parseUTC } from '../../utils/datetime';
import { useUnits } from '../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../utils/units';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const s = (n: number) => Math.round((SCREEN_W / 390) * n);
const vs = (n: number) => Math.round((SCREEN_H / 844) * n);
const fs = (n: number) => Math.round((Math.min(SCREEN_W, 500) / 390) * n);
const REST_LABELS: Record<string, { label: string; sublabel: string; color: string; icon: string }> = {
  fatigue:       { label: 'Normal Fatigue Rest', sublabel: 'Post-workout recovery — muscles need time to rebuild.', color: '#3B82F6', icon: 'bed-clock' },
  sick:          { label: 'Sick Day', sublabel: 'Under the weather — health always comes first.', color: '#F59E0B', icon: 'thermometer' },
  injury:        { label: 'Injury Rest', sublabel: 'Dealing with a physical injury — recover safely.', color: '#EF4444', icon: 'bandage' },
  after_workout: { label: 'After Workout Rest', sublabel: 'Resting after hitting weekly workout goals.', color: '#14B8A6', icon: 'calendar-check-outline' },
  late:          { label: 'Late / Busy Day', sublabel: 'Life got in the way today — happens to everyone.', color: '#8B5CF6', icon: 'clock-outline' },
  other:         { label: 'Other Rest', sublabel: 'Every rest day counts towards recovery.', color: '#6B7280', icon: 'dots-horizontal-circle-outline' },
};

const REST_TYPES = [
  {
    key: 'fatigue',
    label: 'Normal Fatigue Rest',
    sublabel: 'Post-workout recovery — muscles need time to rebuild.',
    letter: 'F',
    color: '#3B82F6',
    icon: 'bed-outline' as const,
    streakNote: '✅ Streak preserved — rest is part of training!',
    affectsStreak: false,
  },
  {
    key: 'sick',
    label: 'Sick Day',
    sublabel: 'Under the weather — health always comes first.',
    letter: 'S',
    color: '#F59E0B',
    icon: 'thermometer' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'injury',
    label: 'Injury Rest',
    sublabel: 'Dealing with a physical injury — recover safely.',
    letter: 'I',
    color: '#EF4444',
    icon: 'bandage' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'after_workout',
    label: 'After Workout Rest',
    sublabel: 'Resting after hitting weekly workout goals.',
    letter: 'A',
    color: '#14B8A6',
    icon: 'calendar-check-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'late',
    label: 'Late / Busy Day',
    sublabel: 'Life got in the way today — happens to everyone.',
    letter: 'L',
    color: '#8B5CF6',
    icon: 'clock-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'other',
    label: 'Other',
    sublabel: 'A rest day for another reason.',
    letter: 'O',
    color: '#6B7280',
    icon: 'dots-horizontal-circle-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
];

// Profile gate colors
const G = {
  bg:      '#04282B',
  bgDeep:  '#021518',
  primary: '#2596BE',
  gold:    '#F7CB16',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.62)',
  soft:    'rgba(255,255,255,0.28)',
  border:  'rgba(37,150,190,0.28)',
};

function getSplitPreviewImage(split: any) {
  if (typeof split?.cover_image_url === 'string' && split.cover_image_url.trim().length > 0) {
    return split.cover_image_url;
  }

  const images = Array.isArray(split?.exercise_images)
    ? split.exercise_images.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  return images[0] || null;
}

function getWorkoutDisplay(item: any) {
  const rawTitle = typeof item?.title === 'string' ? item.title.trim() : '';
  const splitName = typeof item?.split_name === 'string' ? item.split_name.trim() : '';
  const sessionName = typeof item?.session_name === 'string' ? item.session_name.trim() : '';

  let title = sessionName || rawTitle || splitName || 'Workout';

  if (!sessionName && rawTitle && splitName) {
    const rawLower = rawTitle.toLowerCase();
    const splitLower = splitName.toLowerCase();

    if (rawLower === splitLower) {
      title = splitName;
    } else if (rawLower.startsWith(splitLower)) {
      const trimmed = rawTitle.slice(splitName.length).replace(/^[\s\-–—:|]+/, '').trim();
      if (trimmed) title = trimmed;
    }
  }

  const splitLabel = splitName && splitName !== title ? splitName : '';

  return {
    title,
    splitLabel,
  };
}

export default function DailyTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSplits, setLoadingSplits] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
  // Deletion
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { activeWorkoutId, endWorkoutSession } = useWorkoutTimer();
  const { unitSystem } = useUnits();

  // Rest day modal state
  const [showRestModal, setShowRestModal] = useState(false);
  const [loggingRest, setLoggingRest] = useState(false);
  const [selectedRestType, setSelectedRestType] = useState<string | null>(null);

  const handleRestDay = async (restType: string) => {
    setLoggingRest(true);
    try {
      const token = await getToken();
      await api.post('/daily/rest-day', { rest_type: restType }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowRestModal(false);
      const cfg = REST_LABELS[restType];
      showToast(`${cfg?.label || 'Rest day'} logged!`, 'success');
      fetchWorkouts();
    } catch (err) {
      console.error('Error logging rest day:', err);
      showToast('Failed to log rest day', 'error');
    } finally {
      setLoggingRest(false);
    }
  };

  // ── XP Celebration Modal ──
  const [xpModal, setXpModal] = useState<{ earned_xp: number; new_level: number | null; leveled_up: boolean } | null>(null);
  const xpModalFade = useRef(new Animated.Value(0)).current;
  const xpModalScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('pendingXPModal');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.earned_xp > 0) {
          setXpModal(data);
          Animated.parallel([
            Animated.timing(xpModalFade, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(xpModalScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start();
        }
        AsyncStorage.removeItem('pendingXPModal').catch(() => {});
      }
    })();
  }, []);

  // Date filter
  const [selectedDate, setSelectedDate] = useState(new Date());
  const loggedDates = React.useMemo(() => {
    const datesSet = new Set<string>();
    workouts.forEach(w => {
      if (w.status === 'completed' && w.started_at) {
        const d = parseUTC(w.started_at);
        if (d) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const dayVal = String(d.getDate()).padStart(2, '0');
          datesSet.add(`${year}-${month}-${dayVal}`);
        }
      }
    });
    return Array.from(datesSet);
  }, [workouts]);

  const restDayMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    workouts.forEach(w => {
      if (w.status === 'rest' && w.started_at) {
        const d = parseUTC(w.started_at);
        if (d) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const dayVal = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${dayVal}`;
          map[dateStr] = w.rest_type || 'fatigue';
        }
      }
    });
    return map;
  }, [workouts]);

  const filteredWorkouts = workouts.filter(w => {
    if (!w.started_at) return false;
    const d = parseUTC(w.started_at);
    if (!d) return false;
    return isSameDay(d, selectedDate);
  });

  const pastWorkouts = workouts
    .filter(w => {
      if (w.status === 'active') return false;
      if (!w.started_at) return false;
      const d = parseUTC(w.started_at);
      if (!d) return false;
      return !isSameDay(d, selectedDate);
    })
    .slice(0, 2);

  const isSelectedToday = isToday(selectedDate);

  const checkProfileCompletion = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('userData');
      const cached = userStr ? JSON.parse(userStr) : null;
      // Fast-path: trust cache if already completed
      if (cached?.onboarding_completed) {
        setProfileComplete(true);
        setUserId(cached.id);
        return;
      }
      // Otherwise hit the API for fresh data
      const token = await getToken();
      if (!token) { setProfileComplete(false); return; }
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const completed = !!res.data.onboarding_completed;
      setProfileComplete(completed);
      // Update local cache
      await AsyncStorage.setItem('userData', JSON.stringify(res.data));
      setUserId(res.data.id);
    } catch {
      setProfileComplete(false);
    }
  }, []);

  const fetchSplits = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get('/workouts/splits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplits(res.data);
    } catch (err) {
      console.error('Error fetching splits:', err);
    } finally {
      setLoadingSplits(false);
    }
  }, []);

  const fetchWorkouts = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get('/daily/workouts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkouts(res.data.workouts);
    } catch (err) {
      console.error('Error fetching daily workouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    Promise.all([checkProfileCompletion(), fetchWorkouts(), fetchSplits()]);
  }, [checkProfileCompletion, fetchWorkouts, fetchSplits]));

  const handleDeleteWorkout = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/daily/workouts/${deletingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeWorkoutId === String(deletingId)) {
        endWorkoutSession();
      }
      showToast('Workout deleted successfully');
      setWorkouts(prev => prev.filter(w => w.id !== deletingId));
    } catch (err) {
      console.error('Error deleting workout:', err);
      showToast('Failed to delete workout', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const renderWorkout = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'completed';
    const isRest = item.status === 'rest';

    if (isRest) {
      const restType = item.rest_type || 'fatigue';
      const restCfg = REST_LABELS[restType] || REST_LABELS.fatigue;

      return (
        <View
          style={[styles.card, isDark && { borderColor: colors.border, borderWidth: 1 }]}
        >
          <LinearGradient 
            colors={isDark ? ['#051525', '#020A12'] : ['#E8F0FE', '#D2E3FC']} 
            style={styles.cardGradient}
          >
            <View style={styles.cardRow}>
              <View style={styles.imageContainer}>
                <LinearGradient 
                  colors={isDark ? ['#1A365D', '#0A1D37'] : ['#C2D7FA', '#AECBFA']} 
                  style={styles.workoutImgPlaceholder}
                >
                  <MaterialCommunityIcons name={restCfg.icon as any} size={32} color={restCfg.color} />
                </LinearGradient>
                <View style={[styles.statusBadge, { backgroundColor: restCfg.color }]}>
                  <Text style={styles.statusText}>REST</Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.dateText, { color: isDark ? colors.textMuted : '#5F6368' }]}>{formatDateTime(item.started_at)}</Text>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => setDeletingId(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={isDark ? colors.textMuted : "#5F6368"} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardTitle, { color: isDark ? colors.text : restCfg.color }]}>
                  {restCfg.label}
                </Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: isDark ? colors.textMuted : '#5F6368', marginTop: 4 }} numberOfLines={2}>
                  {restCfg.sublabel}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    const totalExs = parseInt(item.exercise_count || 0);
    const totalSets = parseInt(item.total_sets || 0);
    const hasPhoto = !!item.cover_photo_url || !!item.completion_photo_url;
    const { title, splitLabel } = getWorkoutDisplay(item);

    return (
      <TouchableOpacity
        style={[styles.card, isDark && { borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => {
          if (item.status === 'completed') {
            router.push(`/daily/view/${item.id}`);
          } else {
            router.push(`/daily/${item.id}`);
          }
        }}
        activeOpacity={0.85}
      >
        <LinearGradient 
          colors={isDark ? ['#0D0D0D', '#050505'] : [P.cta, P.ctaDark]} 
          style={styles.cardGradient}
        >
          <View style={styles.cardRow}>
            <View style={styles.imageContainer}>
              {hasPhoto ? (
                <OptimizedImage uri={item.cover_photo_url || item.completion_photo_url} style={styles.workoutImg} />
              ) : (
                <LinearGradient 
                  colors={isDark ? [colors.inputBg, '#000000'] : [P.ctaDark, P.ctaDeep]} 
                  style={styles.workoutImgPlaceholder}
                >
                  <MaterialCommunityIcons name="arm-flex" size={32} color={isDark ? colors.primary : "rgba(247,203,22,0.55)"} />
                </LinearGradient>
              )}
              <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#10B981' : '#E00000' }]}>
                <Text style={styles.statusText}>{isCompleted ? 'DONE' : 'LIVE'}</Text>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.cardHeader}>
                <Text style={[styles.dateText, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>{formatDateTime(item.started_at)}</Text>
                <View style={styles.cardHeaderActions}>
                  {item.rating !== null && item.rating !== undefined && (
                    <View style={styles.ratingWrap}>
                      <Ionicons name="star" size={12} color={P.sun} />
                      <Text style={styles.ratingText}>{item.rating}/10</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => setDeletingId(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={isDark ? colors.textMuted : "rgba(255,255,255,0.85)"} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.cardTitle, { color: isDark ? colors.text : '#FFF' }]}>
                {title}
              </Text>
              {!!splitLabel && <Text style={[styles.splitNameText, { color: isDark ? colors.primary : P.sun }]}>{splitLabel}</Text>}

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{totalExs}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>Exs</Text>
                </View>
                <View style={[styles.statLine, { backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.18)' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{totalSets}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>Sets</Text>
                </View>
                <View style={[styles.statLine, { backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.18)' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{formatWeightValue(Math.round(item.total_volume), unitSystem)}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>{weightUnit(unitSystem)}</Text>
                </View>
                <View style={[styles.statLine, { backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.18)' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{formatDuration(item.total_duration_seconds)}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>Time</Text>
                </View>
              </View>
              {item.report_id && (
                <TouchableOpacity
                  style={[styles.reportLink, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)', borderTopWidth: 1, marginTop: 8 }]}
                  onPress={() => router.push(`/daily/report/${item.report_id}`)}
                >
                  {item.report_status === 'generating' ? (
                    <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="document-text-outline" size={14} color="#10B981" />
                  )}
                  <Text style={{ color: item.report_status === 'generating' ? '#F59E0B' : '#10B981', fontFamily: FONTS.bodyBold, fontSize: 12 }}>
                    {item.report_status === 'generating' ? 'AI Report Generating...' : 'View AI Report'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={item.report_status === 'generating' ? '#F59E0B' : '#10B981'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── Profile incomplete gate ───────────────────────────────────────────────
  if (profileComplete === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (loading) return <DailySkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderWorkout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
            <View style={styles.header}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Daily Log</Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your workout history</Text>
              </View>

            </View>

            <View style={styles.splitsSection}>
              {loadingSplits ? (
                <ActivityIndicator color={P.sun} style={{ marginVertical: 20 }} />
              ) : splits.length === 0 ? (
                <TouchableOpacity 
                  style={[
                    styles.emptySplitsBtn,
                    isDark && {
                      borderColor: colors.border,
                      backgroundColor: colors.inputBg,
                    }
                  ]}
                  onPress={() => router.push('/splits/create')}
                >
                  <Ionicons name="layers-outline" size={20} color={isDark ? colors.primary : "#FFF"} />
                  <Text style={[styles.emptySplitsText, isDark && { color: colors.primary }]}>Setup your workout split</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitsScroll}>
                  {splits.map(split => (
                    <TouchableOpacity 
                      key={split.id} 
                      style={[
                        styles.splitMenuCard,
                        isDark && { borderColor: colors.border, shadowColor: '#000000' }
                      ]}
                      onPress={() => router.push(`/splits/${split.id}`)}
                    >
                      <LinearGradient 
                        colors={isDark ? ['#0D0D0D', '#050505'] : [P.cta, P.ctaDark]} 
                        style={styles.splitMenuCardBg}
                      >
                        <View style={styles.splitMenuImageWrap}>
                          <View style={styles.splitMenuImageFrame}>
                            {getSplitPreviewImage(split) ? (
                              <OptimizedImage
                                uri={getSplitPreviewImage(split) as string}
                                style={styles.splitMenuImage}
                                contentFit="contain"
                              />
                            ) : (
                              <LinearGradient 
                                colors={isDark ? [colors.inputBg, '#000000'] : [P.ctaDark, P.ctaDeep]} 
                                style={styles.splitMenuImagePlaceholder}
                              >
                                <MaterialCommunityIcons name="dumbbell" size={28} color={isDark ? colors.primary : P.sun} />
                              </LinearGradient>
                            )}
                          </View>
                        </View>
                        <View style={styles.splitMenuContent}>
                          <Text style={[styles.splitMenuName, isDark && { color: colors.text }]} numberOfLines={2}>{split.name}</Text>
                          <View style={styles.splitMenuMetaRow}>
                            <Ionicons name="calendar-outline" size={14} color={isDark ? colors.textMuted : "rgba(255,255,255,0.82)"} />
                            <Text style={[styles.splitMenuMeta, isDark && { color: colors.textMuted }]}>{split.session_count} Sessions</Text>
                          </View>
                          {split.original_creator_name && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                              {split.original_creator_pic ? (
                                <OptimizedImage uri={split.original_creator_pic} style={{ width: 14, height: 14, borderRadius: 7 }} />
                              ) : (
                                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: isDark ? colors.primary : 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="person" size={8} color="#FFF" />
                                </View>
                              )}
                              <Text style={[styles.splitMenuMeta, isDark && { color: colors.textMuted }]} numberOfLines={1}>
                                @{split.original_creator_name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.addSplitCard,
                      isDark && { borderColor: colors.border, shadowColor: '#000000' }
                    ]}
                    onPress={() => router.push('/(tabs)/splits')}
                    activeOpacity={0.86}
                  >
                    <LinearGradient colors={isDark ? ['#0D0D0D', '#050505'] : [P.ctaLight, '#FFFFFF']} style={styles.addSplitCardInner}>
                      <View style={[styles.addSplitIconWrap, isDark && { backgroundColor: 'rgba(247,203,22,0.12)' }]}>
                        <Ionicons name="compass-outline" size={26} color={isDark ? colors.primary : P.cta} />
                      </View>
                      <View style={styles.addSplitCopy}>
                        <Text style={[styles.addSplitTitle, { color: isDark ? '#F1F5F9' : P.ctaDeep }]}>Explore Programs</Text>
                        <Text style={[styles.addSplitMeta, { color: isDark ? 'rgba(241,245,249,0.5)' : P.muted }]}>Browse all programs</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* Date Picker */}
            <View style={{ marginBottom: 20 }}>
              <DatePicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                variant="nutrition"
                backgroundImage={require('../../assets/coach/workoutlog.jpg')}
                loggedDates={loggedDates}
                restDayMap={restDayMap}
                showStatusMarkers={true}
              />
            </View>

            {/* Workouts for selected date */}
            <View style={styles.historyHeader}>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isSameDay(selectedDate, new Date()) ? "Today's Workouts" : "Workouts"}
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                  {filteredWorkouts.length} session{filteredWorkouts.length !== 1 ? "s" : ""} logged
                </Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={pastWorkouts.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <View style={styles.historyHeader}>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Workouts</Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Recent sessions from other days</Text>
              </View>
              {userId && (
                <TouchableOpacity onPress={() => router.push(`/profile/workouts/${userId}`)}>
                  <Text style={{ color: colors.primary, fontFamily: FONTS.bodyBold, fontSize: 13 }}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {pastWorkouts.map((item: any) => (
              <View key={item.id}>{renderWorkout({ item })}</View>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={(
          workouts.length === 0 ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="calendar-plus" size={64} color={colors.border} style={{ marginTop: 24 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workouts Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Start your first workout session and track your progress daily.
              </Text>
              {!isSelectedToday && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.emptySub, { color: colors.textMuted, marginBottom: 0 }]}>Can only log for today</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.centered, { paddingVertical: 32 }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.border} style={{ marginTop: 24 }} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 20 }]}>No Workouts This Day</Text>
              {!isSelectedToday && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.emptySub, { color: colors.textMuted, marginBottom: 0 }]}>Can only log for today</Text>
                </View>
              )}
            </View>
          )
        )}
      />

      <ActionModal
        visible={deletingId !== null}
        type="delete"
        title="Delete Workout?"
        message="This will permanently remove this session and all associated photos. Are you sure?"
        confirmText={isDeleting ? "DELETING..." : "YES, DELETE"}
        onConfirm={handleDeleteWorkout}
        onCancel={() => setDeletingId(null)}
      />

      {/* ═══ XP CELEBRATION MODAL ═══ */}
      {xpModal && (
        <Animated.View style={[xpStyles.overlay, { opacity: xpModalFade }]}>
          <Animated.View style={[xpStyles.card, { transform: [{ scale: xpModalScale }] }]}>
            <LinearGradient colors={['#065F46', '#059669']} style={xpStyles.cardBg}>
              <View style={xpStyles.iconRow}>
                <View style={xpStyles.bigIconBox}>
                  <Ionicons name="flash" size={36} color="#FBBF24" />
                </View>
                <Text style={xpStyles.badgeText}>XP EARNED</Text>
              </View>
               <Text style={xpStyles.xpAmount}>+{xpModal.earned_xp.toLocaleString()}</Text>
              {xpModal.leveled_up && (
                <View style={xpStyles.levelUpRow}>
                  <Text style={xpStyles.levelUpLabel}>LEVEL UP!</Text>
                  <Text style={xpStyles.levelUpNum}>LV.{xpModal.new_level}</Text>
                </View>
              )}
              <TouchableOpacity
                style={xpStyles.dismissBtn}
                onPress={() => {
                  Animated.parallel([
                    Animated.timing(xpModalFade, { toValue: 0, duration: 200, useNativeDriver: true }),
                    Animated.timing(xpModalScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                  ]).start(() => setXpModal(null));
                }}
              >
                <Text style={xpStyles.dismissText}>AWESOME!</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Rest Day Type Modal ── */}
      <Modal
        visible={showRestModal}
        transparent
        animationType="none"
        onRequestClose={() => !loggingRest && setShowRestModal(false)}
      >
        <Pressable style={restModalStyles.modalOverlay} onPress={() => !loggingRest && setShowRestModal(false)}>
          <Pressable onPress={() => {}} style={[restModalStyles.modalSheet, { backgroundColor: colors.bg }]}>
            {/* Handle */}
            <View style={restModalStyles.modalHandle} />
            <View style={[restModalStyles.modalHandleBar, { backgroundColor: colors.textMuted + '40' }]} />

            {/* Header */}
            <View style={restModalStyles.modalHeader}>
              <Text style={[restModalStyles.modalTitle, { color: colors.text }]}>Log Rest Day</Text>
              <Text style={[restModalStyles.modalSubtitle, { color: colors.textMuted }]}>
                Select the reason for resting today
              </Text>
            </View>

            {/* Rest type options */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={restModalStyles.modalList}
            >
              {REST_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.key}
                  style={[
                    restModalStyles.restTypeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: selectedRestType === rt.key ? rt.color : colors.border,
                      borderWidth: selectedRestType === rt.key ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedRestType(rt.key)}
                  disabled={loggingRest}
                  activeOpacity={0.75}
                >
                  {/* Letter badge */}
                  <View style={[restModalStyles.restTypeBadge, { backgroundColor: rt.color }]}>
                    <Text style={restModalStyles.restTypeBadgeLetter}>{rt.letter}</Text>
                  </View>

                  {/* Info */}
                  <View style={restModalStyles.restTypeInfo}>
                    <Text style={[restModalStyles.restTypeLabel, { color: colors.text }]}>{rt.label}</Text>
                    <Text style={[restModalStyles.restTypeSublabel, { color: colors.textMuted }]} numberOfLines={2}>
                      {rt.sublabel}
                    </Text>
                    {selectedRestType === rt.key && (
                      <Text style={[restModalStyles.restTypeStreakNote, { color: rt.color }]}>
                        {rt.streakNote}
                      </Text>
                    )}
                  </View>

                  {/* Check */}
                  {selectedRestType === rt.key && (
                    <Ionicons name="checkmark-circle" size={22} color={rt.color} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Confirm button */}
            <View style={[restModalStyles.modalFooter, { paddingBottom: 32 }]}>
              <TouchableOpacity
                style={[
                  restModalStyles.confirmBtn,
                  {
                    backgroundColor: selectedRestType
                      ? (REST_TYPES.find(r => r.key === selectedRestType)?.color ?? colors.primary)
                      : colors.border,
                    opacity: selectedRestType ? 1 : 0.5,
                  },
                ]}
                disabled={!selectedRestType || loggingRest}
                onPress={() => selectedRestType && handleRestDay(selectedRestType)}
              >
                {loggingRest ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="bed-clock" size={20} color="#FFF" />
                    <Text style={restModalStyles.confirmBtnText}>
                      {selectedRestType
                        ? `Log ${REST_TYPES.find(r => r.key === selectedRestType)?.label ?? 'Rest Day'}`
                        : 'Select a type above'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── FAB: Rest Day ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowRestModal(true)}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 176,
          right: 20,
          zIndex: 100,
        }}
      >
        <LinearGradient
          colors={['#DBEAFE', '#BFDBFE']}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }}
        >
          <MaterialCommunityIcons name="bed-clock" size={24} color="#3B82F6" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── FAB: New Workout ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/daily/new')}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 100,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          elevation: 8,
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          zIndex: 100,
        }}
      >
        <LinearGradient
          colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]}
          style={{ width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, marginTop: 10 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  newBtn: { borderRadius: 14, overflow: 'hidden' },
  newBtnGradient: { flexDirection: 'row', height: vs(46), justifyContent: 'center', alignItems: 'center', gap: s(6), paddingHorizontal: s(16), borderRadius: s(14) },
  newBtnText: { fontFamily: FONTS.bodyBold, fontSize: fs(13), color: '#FFF', letterSpacing: 0.5 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, flexGrow: 1 },
  card: {
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.ctaDeep,
    overflow: 'hidden',
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  cardGradient: { padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: {
    width: 100,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  workoutImg: { width: '100%', height: '100%' },
  workoutImgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 0.5 },
  cardInfo: { flex: 1, marginLeft: 16, justifyContent: 'center', flexShrink: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#FFF' },
  deleteBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dateText: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.78)' },
  cardTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 2, color: '#FFF', lineHeight: 20 },
  splitNameText: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 12, color: P.sun, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
  statLbl: { fontFamily: FONTS.body, fontSize: 10, marginTop: 1, color: 'rgba(255,255,255,0.74)' },
  statLine: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 26, marginTop: 20, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 18 },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
  emptyTodayRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginBottom: 8 },
  emptyColBtn: { flex: 1, borderRadius: 16, overflow: 'hidden', height: 72 },
  emptyColBtnGradient: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyColBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.4 },
  listHeader: { marginBottom: 10 },
  splitsSection: { marginBottom: 20 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  splitsScroll: { gap: 12, paddingRight: 20, alignItems: 'stretch' },
  splitMenuCard: {
    width: 272,
    height: 118,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: P.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    elevation: 4,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  splitMenuCardBg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  splitMenuImageWrap: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    alignSelf: 'stretch',
  },
  splitMenuImageFrame: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitMenuImage: {
    width: '100%',
    height: '100%',
  },
  splitMenuImagePlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitMenuContent: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  splitMenuName: {
    color: '#FFF',
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 8,
  },
  splitMenuMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitMenuMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  addSplitCard: {
    width: 220,
    height: 118,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: P.border,
    flexDirection: 'row',
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  addSplitCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  addSplitIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,150,190,0.12)',
    marginRight: 12,
  },
  addSplitCopy: { flex: 1 },
  addSplitTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: P.ctaDeep,
  },
  addSplitMeta: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: P.muted,
    marginTop: 6,
  },
  emptySplitsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderRadius: 18,
    borderColor: P.border,
    backgroundColor: P.ctaLight,
  },
  emptySplitsText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: P.ctaDeep },
  historyHeader: {
    marginBottom: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  headerIconBtnGradient: {
    width: vs(46),
    height: vs(46),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: s(14),
  },
  emptyRestBtn: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    width: '80%',
    maxWidth: 280,
  },
  emptyRestBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  emptyRestBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

// ── Gate styles ──────────────────────────────────────────────────
const gateStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // Decorative background rings
  ring1: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.12)',
    top: '15%',
  },
  ring2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(247,203,22,0.10)',
    top: '22%',
  },
  // Wordmark
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: G.gold,
    marginRight: 6,
  },
  wordSpot: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: G.text,
  },
  wordMe: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: G.gold,
  },
  // Icon
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(247,203,22,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,203,22,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  // Copy
  title: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    color: G.text,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: G.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  // Steps row
  stepsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 36,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.22)',
  },
  stepIcon: {},
  stepLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: G.muted,
  },
  // CTA
  cta: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ctaGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: G.bgDeep,
  },
  time: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: G.soft,
  },
});

const xpStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    width: SCREEN_W * 0.82,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardBg: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  bigIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
  },
  xpAmount: {
    fontFamily: FONTS.heading,
    fontSize: 48,
    color: '#FBBF24',
    marginVertical: 8,
  },
  levelUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    marginBottom: 8,
  },
  levelUpLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  levelUpNum: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#FBBF24',
  },
  dismissBtn: {
    marginTop: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dismissText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFF',
    letterSpacing: 1.5,
  },
});

const restModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: 400,
    paddingTop: 10,
  },
  modalHandle: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  modalList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 16,
  },
  restTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  restTypeBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  restTypeBadgeLetter: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#FFF',
  },
  restTypeInfo: {
    flex: 1,
  },
  restTypeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  restTypeSublabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 17,
  },
  restTypeStreakNote: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    marginTop: 6,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  confirmBtn: {
    borderRadius: 18,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
