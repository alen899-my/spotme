import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Platform, ActivityIndicator,
  TextInput, Dimensions, Animated, Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import OptimizedImage from '../../components/ui/OptimizedImage';
import { optimizeImage } from '../../utils/imageOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import StreakIcon from '../../components/ui/StreakIcon';
import { CompleteSkeleton } from '../../components/ui/Skeleton';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { formatDurationShort as formatDuration } from '../../utils/datetime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Responsive helpers ──────────────────────────────────────────────────────
const BASE_W = 390;
const BASE_H = 844;
const s = (n: number) => Math.round((SCREEN_WIDTH / BASE_W) * n);
const vs = (n: number) => Math.round((SCREEN_HEIGHT / BASE_H) * n);
const fs = (n: number) => Math.round((Math.min(SCREEN_WIDTH, 500) / BASE_W) * n);



// ── Confetti Particle ───────────────────────────────────────────────────────
const PARTICLE_COLORS = ['#F7CB16', '#2596BE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fall, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sway, { toValue: 1, duration: 400 + Math.random() * 300, useNativeDriver: true }),
            Animated.timing(sway, { toValue: -1, duration: 400 + Math.random() * 300, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-20, vs(180)] });
  const translateX = sway.interpolate({ inputRange: [-1, 0, 1], outputRange: [-s(18), 0, s(18)] });
  const size = s(4 + Math.random() * 4);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: vs(10),
        left: startX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

// ── Bento Tile ──────────────────────────────────────────────────────────────
function BentoTile({
  icon, iconColor, label, value, sub, wide, colors, isDark,
}: {
  icon: string; iconColor: string; label: string; value: string;
  sub: string; wide?: boolean; colors: any; isDark: boolean;
}) {
  const tileWidth = wide
    ? SCREEN_WIDTH - s(32)
    : (SCREEN_WIDTH - s(32) - s(12)) / 2;

  return (
    <View
      style={[
        bentoStyles.tile,
        {
          width: tileWidth,
          backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={[bentoStyles.tileIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${iconColor}18` }]}>
        <Ionicons name={icon as any} size={fs(18)} color={iconColor} />
      </View>
      <Text style={[bentoStyles.tileLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#94A3B8' }]}>{label}</Text>
      <Text style={[bentoStyles.tileValue, { color: isDark ? '#F1F5F9' : '#0F1923', fontSize: fs(wide ? 26 : 20) }]}>
        {value}
      </Text>
      <Text style={[bentoStyles.tileSub, { color: isDark ? 'rgba(241,245,249,0.30)' : '#94A3B8' }]}>{sub}</Text>
    </View>
  );
}

const CAROUSEL_CARD_W = SCREEN_WIDTH - s(64);
const CAROUSEL_SNAP = CAROUSEL_CARD_W + s(12);

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatRecord(metricType?: string, value?: number | string) {
  const numeric = Number(value) || 0;
  if (!numeric) return '0';
  if (metricType === 'max_reps') return `${Math.round(numeric)} reps`;
  return `${numeric.toFixed(1)} kg est. 1RM`;
}

function ExerciseCarouselCard({ ex, colors, isDark }: { ex: any; colors: any; isDark: boolean }) {
  const isSkipped = ex.is_skipped;
  const isCardio = ex.category?.toLowerCase() === 'cardio';
  const completedSets = ex.sets?.filter((s: any) => !s.is_skipped) || [];
  const hasCompletedData = completedSets.length > 0;
  const totalReps = completedSets.reduce((acc: number, s: any) => acc + (parseInt(s.reps) || 0), 0);
  const totalWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  const totalSetWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0), 0);
  const totalTime = completedSets.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
  const avgWeight = completedSets.length > 0 ? (totalSetWeight / completedSets.length).toFixed(1) : '0';
  const avgTime = completedSets.length > 0 ? Math.round(totalTime / completedSets.length) : 0;

  return (
    <View
      style={[
        carouselStyles.card,
        {
          width: CAROUSEL_CARD_W,
          backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          opacity: isSkipped && !hasCompletedData ? 0.55 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={carouselStyles.exHeader}>
        <OptimizedImage uri={ex.image_url} style={carouselStyles.exImage} />
        <View style={carouselStyles.exMeta}>
          <Text style={[carouselStyles.exName, { color: isDark ? '#F1F5F9' : '#0F1923' }]} numberOfLines={2}>
            {ex.name}
          </Text>
          <Text style={[carouselStyles.exSetsSub, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>
            {isSkipped && !hasCompletedData ? 'Movement skipped' : isSkipped && hasCompletedData ? `Partially completed — ${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} logged, then skipped` : isCardio ? `${formatTime(totalTime)} logged` : `${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} completed`}
          </Text>
        </View>
        {isSkipped && (
          <View style={carouselStyles.badgeSkipped}>
            <Text style={carouselStyles.badgeText}>SKIPPED</Text>
          </View>
        )}
        {!isSkipped && ex.is_world_record && (
          <View style={carouselStyles.badgeWorld}>
            <Ionicons name="earth" size={10} color="#FFF" style={{ marginRight: 3 }} />
            <Text style={carouselStyles.badgeText}>WORLD PR</Text>
          </View>
        )}
        {!isSkipped && !ex.is_world_record && ex.is_personal_record && (
          <View style={carouselStyles.badgePR}>
            <Ionicons name="ribbon" size={10} color="#1a1a1a" style={{ marginRight: 3 }} />
            <Text style={[carouselStyles.badgeText, { color: '#1a1a1a' }]}>NEW PR</Text>
          </View>
        )}
        {!isSkipped && !ex.is_world_record && !ex.is_personal_record && ex.rating !== null && ex.rating !== undefined && (
          <View style={carouselStyles.badgeRating}>
            <Ionicons name="star" size={10} color={P.sun} style={{ marginRight: 3 }} />
            <Text style={[carouselStyles.badgeText, { color: P.sun }]}>{ex.rating}/10</Text>
          </View>
        )}
      </View>

      {/* Record row (non-cardio, has completed data) */}
      {!isCardio && (hasCompletedData || !isSkipped) && (
        <View style={carouselStyles.recordRow}>
          <View style={[carouselStyles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[carouselStyles.recordPillLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>BEST SET</Text>
            <Text style={[carouselStyles.recordPillVal, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>
              {Number(ex.best_set_weight || 0).toFixed(1)}kg × {ex.best_set_reps || 0}
            </Text>
          </View>
          <View style={[carouselStyles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[carouselStyles.recordPillLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>MY PR</Text>
            <Text style={[carouselStyles.recordPillVal, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>
              {formatRecord(ex.record_metric_type, ex.personal_record_value)}
            </Text>
          </View>
          <View style={[carouselStyles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[carouselStyles.recordPillLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>WORLD PR</Text>
            <Text style={[carouselStyles.recordPillVal, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>
              {formatRecord(ex.record_metric_type, ex.world_record_value)}
            </Text>
          </View>
        </View>
      )}

      {/* Stats grid — show for non-skipped OR skipped with completed data */}
      {(!isSkipped || hasCompletedData) && completedSets.length > 0 && (
        <View style={carouselStyles.exStatsGrid}>
          {isCardio ? (
            <>
              <View style={[carouselStyles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[carouselStyles.exStatLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>TOTAL TIME</Text>
                <Text style={[carouselStyles.exStatValue, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>{formatTime(totalTime)}</Text>
              </View>
              <View style={[carouselStyles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[carouselStyles.exStatLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>AVG TIME</Text>
                <Text style={[carouselStyles.exStatValue, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>{formatTime(avgTime)}</Text>
              </View>
            </>
          ) : (
            [
              { label: 'TOTAL WEIGHT', value: `${Math.round(totalWeight)}kg` },
              { label: 'AVG / SET', value: `${avgWeight}kg` },
              { label: 'TOTAL REPS', value: `${totalReps}` },
              { label: 'AVG TIME / SET', value: formatTime(avgTime) },
            ].map((item, idx) => (
              <View key={idx} style={[carouselStyles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[carouselStyles.exStatLabel, { color: isDark ? 'rgba(241,245,249,0.45)' : '#64748B' }]}>{item.label}</Text>
                <Text style={[carouselStyles.exStatValue, { color: isDark ? '#F1F5F9' : '#0F1923' }]}>{item.value}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ── Exercise Carousel with pagination dots ──────────────────────────────────
function ExerciseCarousel({ exercises, colors, isDark }: { exercises: any[]; colors: any; isDark: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_SNAP);
    setActiveIdx(idx);
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_SNAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: s(16), paddingRight: s(16), gap: s(12) }}
        onMomentumScrollEnd={onScroll}
      >
        {exercises.map((ex: any) => (
          <ExerciseCarouselCard key={ex.id} ex={ex} colors={colors} isDark={isDark} />
        ))}
      </ScrollView>
      {/* Pagination dots */}
      {exercises.length > 1 && (
        <View style={carouselStyles.dotRow}>
          {exercises.map((_: any, i: number) => (
            <View
              key={i}
              style={[
                carouselStyles.dot,
                {
                  backgroundColor: i === activeIdx
                    ? P.cta
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                  width: i === activeIdx ? s(20) : s(6),
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const workoutId = params.id as string;
  const duration = parseInt(params.duration as string || '0');
  const volume = parseFloat(params.volume as string || '0');
  const rest = parseInt(params.rest as string || '0');

  const [weight, setWeight] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [showStreakOverlay, setShowStreakOverlay] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [displayedXP, setDisplayedXP] = useState(0);

  // ── Hero animations ──
  const heroScale = useRef(new Animated.Value(0.5)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const xpFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── XP counter animation ──
  useEffect(() => {
    if (earnedXP <= 0) return;
    const duration = 1200;
    const startTime = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplayedXP(Math.round(eased * earnedXP));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [earnedXP]);

  useEffect(() => { fetchWorkout(); }, []);

  const fetchWorkout = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(response.data);
      if (response.data.post_workout_weight) setWeight(String(response.data.post_workout_weight));
      if (response.data.streak_at_completion > 0) {
        setNewStreak(response.data.streak_at_completion);
      }
    } catch (err) {
      console.error('Error fetching workout summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Photo pickers ──
  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera permission is required to take photos', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await getToken();

      if (photos.length > 0) {
        showToast(`Uploading ${photos.length} photos...`, 'info');
        const results = await Promise.allSettled(
          photos.map(async (uri, index) => {
            const optimizedUri = await optimizeImage(uri, 'workout');
            const formData = new FormData();
            if (Platform.OS === 'web') {
              const response = await fetch(optimizedUri);
              const blob = await response.blob();
              formData.append('photos', blob, `photo_${Date.now()}_${index}.jpg`);
            } else {
              const name = optimizedUri.split('/').pop() || `photo_${index}.jpg`;
              const match = /\.(\w+)$/.exec(name);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              formData.append('photos', {
                uri: Platform.OS === 'android' ? optimizedUri : optimizedUri.replace('file://', ''),
                name,
                type,
              } as any);
            }
            return await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
              timeout: 30000,
            });
          })
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed === 0) showToast('All photos uploaded successfully!');
        else if (succeeded > 0) showToast(`Uploaded ${succeeded}/${photos.length} photos. ${failed} failed.`, 'warning');
        else showToast('Failed to upload photos', 'error');
      }

      const payload: any = {
        total_duration_seconds: duration,
        total_volume: volume,
      };
      if (weight.trim()) {
        const parsedWeight = parseFloat(weight);
        if (!isNaN(parsedWeight)) payload.post_workout_weight = parsedWeight;
      }

      const completeRes = await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(completeRes.data);

      // ─── XP counter animation ───
      const xpAmount = completeRes.data.earned_xp || 0;
      setEarnedXP(xpAmount);
      setNewLevel(completeRes.data.new_level || null);
      setLeveledUp(!!completeRes.data.leveled_up);

      if (xpAmount > 0) {
        Animated.timing(xpFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }).start();
        AsyncStorage.setItem('pendingXPModal', JSON.stringify({
          earned_xp: xpAmount,
          new_level: completeRes.data.new_level,
          leveled_up: !!completeRes.data.leveled_up,
        })).catch(() => {});
      }

      if (completeRes.data.new_streak !== undefined) {
        setNewStreak(completeRes.data.new_streak);
        if (completeRes.data.new_streak > 0) setShowStreakOverlay(true);
      }

      showToast('Workout finalized! Great job! 🏆');

      // Trigger AI report generation in background
      axios.post(`${API_URL}/daily/workouts/${workoutId}/generate-report`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch((err) => {
        console.error('Auto AI report generation failed:', err.response?.data || err.message);
      });

      setTimeout(() => {
        router.replace('/(tabs)/daily');
      }, completeRes.data.new_streak > 0 ? 3500 : 1500);
    } catch (err: any) {
      console.error('Error saving final metrics:', err);
      showToast(err.response?.data?.error || 'Failed to update metrics', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Computed stats ──
  const displayDuration = workout?.total_duration_seconds || duration;
  const displayVolume = workout?.total_volume || volume;
  const displayRest = workout?.total_rest_seconds || rest;
  const caloriesBurned = Number(workout?.calories_burned) || 0;
  const totalSets = useMemo(() => {
    if (workout?.total_sets) return workout.total_sets;
    return workout?.exercises?.reduce((acc: number, ex: any) =>
      acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0), 0) || 0;
  }, [workout]);

  const exerciseStats = useMemo(() => {
    if (!workout?.exercises) return { total: 0, completed: 0, skipped: 0 };
    const total = workout.exercises.length;
    const skipped = workout.exercises.filter((e: any) => e.is_skipped).length;
    const completed = workout.exercises.filter((e: any) => e.is_completed && !e.is_skipped).length;
    return { total, completed, skipped };
  }, [workout]);

  const bestSet = useMemo(() => {
    if (!workout?.exercises) return null;
    let best: any = null;
    for (const ex of workout.exercises) {
      if (ex.is_skipped) continue;
      for (const set of (ex.sets || [])) {
        if (set.is_skipped) continue;
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.reps) || 0;
        if (!best || (w * r) > (best.w * best.r)) {
          best = { w, r, name: ex.name };
        }
      }
    }
    return best;
  }, [workout]);

  const avgRating = useMemo(() => {
    if (!workout?.exercises) return null;
    const ratings = workout.exercises
      .map((e: any) => e.rating)
      .filter((r: any) => r !== null && r !== undefined);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1);
  }, [workout]);

  // ── Confetti particles ──
  const confettiParticles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 800,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      startX: Math.random() * SCREEN_WIDTH,
    })),
    []
  );

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  if (loading) return <CompleteSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[st.scrollContent, { paddingBottom: vs(150) + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HERO SECTION ═══ */}
        <View style={[st.heroWrap, { height: vs(260) + insets.top }]}>
          <LinearGradient colors={['#065F46', '#059669']} style={StyleSheet.absoluteFill} />

            <Image
              source={require('../../assets/coach/fit-cartoon-character-training.png')}
              style={[st.heroImage, { width: s(200), height: vs(280), bottom: vs(-30) }]}
              resizeMode="contain"
            />

          {/* Confetti */}
          {confettiParticles.map(p => (
            <ConfettiParticle key={p.id} delay={p.delay} color={p.color} startX={p.startX} />
          ))}

          {/* Glow ring */}
          <Animated.View
            style={[
              st.glowRing,
              {
                opacity: glowOpacity,
                width: s(140),
                height: s(140),
                borderRadius: s(70),
                borderColor: 'rgba(255,255,255,0.3)',
              },
            ]}
          />

          {/* Left content */}
          <View style={[st.heroContent, { paddingTop: insets.top + vs(20) }]}>
            <Animated.View style={{ transform: [{ scale: heroScale }], opacity: heroOpacity }}>
              <View style={[st.trophyCircle]}>
                <Ionicons name="trophy" size={fs(48)} color="#FBBF24" />
              </View>
            </Animated.View>

            <Text style={[st.heroTitle, { fontSize: fs(30), color: '#FFF' }]}>
              Workout Complete!
            </Text>
            <Text style={[st.heroSub, { fontSize: fs(14), color: 'rgba(255,255,255,0.85)' }]}>
              You crushed it today 💪
            </Text>
            {workout?.title && (
              <View style={[st.heroPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[st.heroPillText, { fontSize: fs(11), color: 'rgba(255,255,255,0.9)' }]}>
                  {workout.title}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══ XP COUNTER ═══ */}
        {earnedXP > 0 && (
          <Animated.View style={[st.xpContainer, { opacity: xpFadeAnim, transform: [{ scale: xpFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
            <LinearGradient colors={['#047857', '#059669']} style={st.xpGradient}>
              <View style={st.xpRow}>
                <View style={st.xpIconBox}>
                  <Ionicons name="flash" size={fs(22)} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.xpLabel}>XP EARNED</Text>
                  <Text style={st.xpValue}>+{displayedXP.toLocaleString()}</Text>
                </View>
                {leveledUp && (
                  <View style={st.levelUpBadge}>
                    <Text style={st.levelUpText}>LV.{newLevel} ↑</Text>
                  </View>
                )}
              </View>
              <View style={st.xpBarBg}>
                <Animated.View
                  style={[
                    st.xpBarFill,
                    {
                      width: xpFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ═══ BENTO GRID ═══ */}
        <View style={[st.bentoContainer, { paddingHorizontal: s(16) }]}>
          <Text style={[st.sectionLabel, { color: colors.text, fontSize: fs(18) }]}>Session Summary</Text>
          <View style={st.bentoGrid}>
            <BentoTile icon="time-outline" iconColor="#2596BE" label="DURATION" value={formatDuration(displayDuration)} sub="Total session" colors={colors} isDark={isDark} />
            <BentoTile icon="stopwatch-outline" iconColor="#00C9C8" label="Active time" value={formatDuration(Math.max(0, displayDuration - displayRest))} sub="Active exercising" colors={colors} isDark={isDark} />
            <BentoTile icon="hourglass-outline" iconColor="#F59E0B" label="REST TIME" value={formatDuration(displayRest)} sub="Recovery" colors={colors} isDark={isDark} />
            <BentoTile icon="flame-outline" iconColor="#EF4444" label="CALORIES" value={`${caloriesBurned}`} sub="Est. kcal burn" colors={colors} isDark={isDark} />
            <BentoTile icon="barbell-outline" iconColor="#10B981" label="TOTAL VOLUME" value={`${Math.round(displayVolume)} kg`} sub="Weight lifted" wide colors={colors} isDark={isDark} />
            <BentoTile icon="layers-outline" iconColor="#8B5CF6" label="TOTAL SETS" value={`${totalSets}`} sub="Completed" colors={colors} isDark={isDark} />
            <BentoTile
              icon="fitness-outline" iconColor="#2596BE" label="EXERCISES"
              value={`${exerciseStats.completed}/${exerciseStats.total}`}
              sub={exerciseStats.skipped > 0 ? `${exerciseStats.skipped} skipped` : 'All completed'}
              wide colors={colors} isDark={isDark}
            />
            {bestSet && (
              <BentoTile icon="trophy-outline" iconColor="#FBBF24" label="BEST SET" value={`${bestSet.w}kg × ${bestSet.r}`} sub={bestSet.name} colors={colors} isDark={isDark} />
            )}
            {avgRating !== null && (
              <BentoTile icon="star-outline" iconColor="#F59E0B" label="AVG RATING" value={`${avgRating}/10`} sub="Exercise quality" colors={colors} isDark={isDark} />
            )}
          </View>

          {/* ═══ EXERCISE CAROUSEL ═══ */}
          {workout?.exercises?.length > 0 && (
            <>
              <Text style={[st.sectionLabel, { color: colors.text, fontSize: fs(18), marginTop: vs(8) }]}>Exercises</Text>
            </>
          )}
        </View>

        {/* Carousel lives outside the padded container for edge-to-edge snap */}
        {workout?.exercises?.length > 0 && (
          <ExerciseCarousel exercises={workout.exercises} colors={colors} isDark={isDark} />
        )}

        {/* Reopen padded container for remaining sections */}
        <View style={{ paddingHorizontal: s(16) }}>

          {/* ═══ BODY WEIGHT ═══ */}
          <View style={[st.weightCard, { backgroundColor: isDark ? '#0D0D0D' : '#FEF3C7', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <View style={st.weightCardTop}>
              <View style={[st.weightIconBox, { backgroundColor: isDark ? 'rgba(217,119,6,0.15)' : 'rgba(120,53,15,0.15)' }]}>
                <Ionicons name="scale-outline" size={fs(20)} color={isDark ? '#F59E0B' : '#78350F'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.weightTitle, { color: isDark ? colors.text : '#78350F', fontSize: fs(16) }]}>Post-Workout Weight</Text>
                <Text style={[st.weightSub, { color: isDark ? colors.textMuted : 'rgba(120,53,15,0.75)', fontSize: fs(11) }]}>Track your body weight over time</Text>
              </View>
            </View>
            <View style={[st.weightInputWrap, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.45)', borderColor: isDark ? colors.border : 'rgba(255,255,255,0.7)' }]}>
              <TextInput
                style={[st.weightInput, { color: isDark ? colors.text : '#78350F', fontSize: fs(24), height: vs(56), paddingVertical: 0, textAlignVertical: 'center' }]}
                placeholder="e.g. 75.5"
                placeholderTextColor={isDark ? colors.textDim : 'rgba(120,53,15,0.45)'}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <View style={[st.weightUnit, { backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : 'rgba(120,53,15,0.12)', height: vs(56) }]}>
                <Text style={[st.weightUnitText, { color: isDark ? '#F59E0B' : '#92400E', fontSize: fs(14) }]}>kg</Text>
              </View>
            </View>
            {!!weight && (
              <Text style={[st.weightHint, { color: isDark ? '#F59E0B' : '#92400E', fontSize: fs(12) }]}>
                Logged: <Text style={{ fontFamily: FONTS.bodyBold }}>{weight} kg</Text> ✓
              </Text>
            )}
          </View>

          {/* ═══ SESSION PHOTOS ═══ */}
          <View style={[st.photoSection, { backgroundColor: isDark ? '#0D0D0D' : colors.card, borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}>
            <View style={st.photoHeader}>
              <View style={[st.photoIconBox, { backgroundColor: 'rgba(37,150,190,0.12)' }]}>
                <Ionicons name="camera" size={fs(18)} color={P.cta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.photoTitle, { color: colors.text, fontSize: fs(16) }]}>Session Photos</Text>
                <Text style={[st.photoSub, { color: colors.textMuted, fontSize: fs(11) }]}>Show off those gains! ({photos.length}/10)</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.photoList}>
              {photos.map((uri, idx) => (
                <View key={idx} style={[st.photoWrap, { width: s(90), height: s(120) }]}>
                  <Image source={{ uri }} style={st.photo} />
                  <TouchableOpacity style={st.removeBtn} onPress={() => removePhoto(idx)}>
                    <Ionicons name="close" size={fs(11)} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 10 && (
                <View style={{ gap: s(8), flexDirection: 'row' }}>
                  {/* Camera button */}
                  <TouchableOpacity
                    style={[st.addPhotoBtn, { width: s(90), height: s(120), backgroundColor: isDark ? colors.inputBg : 'rgba(37,150,190,0.06)', borderColor: isDark ? colors.border : 'rgba(37,150,190,0.25)' }]}
                    onPress={takePhoto}
                  >
                    <View style={[st.addPhotoBtnIconCircle, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.12)' }]}>
                      <Ionicons name="camera-outline" size={fs(22)} color={P.cta} />
                    </View>
                    <Text style={[st.addPhotoBtnLabel, { color: isDark ? colors.textMuted : P.ctaDark, fontSize: fs(10) }]}>Camera</Text>
                  </TouchableOpacity>
                  {/* Gallery button */}
                  <TouchableOpacity
                    style={[st.addPhotoBtn, { width: s(90), height: s(120), backgroundColor: isDark ? colors.inputBg : 'rgba(139,92,246,0.06)', borderColor: isDark ? colors.border : 'rgba(139,92,246,0.25)' }]}
                    onPress={pickPhotos}
                  >
                    <View style={[st.addPhotoBtnIconCircle, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.12)' }]}>
                      <Ionicons name="images-outline" size={fs(22)} color="#8B5CF6" />
                    </View>
                    <Text style={[st.addPhotoBtnLabel, { color: isDark ? colors.textMuted : '#6D28D9', fontSize: fs(10) }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* ═══ STICKY FOOTER ═══ */}
      <View style={[st.footer, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) + vs(12) }]}>
        <TouchableOpacity style={st.saveFooterBtn} onPress={handleFinalSave} disabled={saving}>
          <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]} style={[st.saveBtnGradient, { height: vs(58) }]}>
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={fs(20)} color="#FFF" />
                <Text style={[st.saveBtnText, { fontSize: fs(14) }]}>SAVE & FINISH</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={st.skipLink} onPress={() => router.replace('/(tabs)/daily')} disabled={saving}>
          <Text style={[st.skipLinkText, { color: colors.textMuted, fontSize: fs(13) }]}>I'll do this later</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ STREAK OVERLAY ═══ */}
      {showStreakOverlay && (
        <View style={st.streakOverlay}>
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
          <Animated.View style={st.streakPopup}>
            <StreakIcon streak={newStreak || 0} size={s(120)} />
            <Text style={[st.streakPopupTitle, { fontSize: fs(34) }]}>STREAK UP!</Text>
            <Text style={[st.streakPopupSub, { fontSize: fs(15) }]}>Consistency is key. Keep it up!</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  scrollContent: { flexGrow: 1 },

  // ── Hero ──
  heroWrap: {
    position: 'relative',
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: s(20),
    zIndex: 3,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
    zIndex: 2,
  },
  trophyCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(12),
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    marginBottom: vs(4),
  },
  heroSub: {
    fontFamily: FONTS.body,
    marginBottom: vs(8),
  },
  heroPill: {
    paddingHorizontal: s(14),
    paddingVertical: vs(4),
    borderRadius: s(20),
    marginTop: vs(4),
    alignSelf: 'flex-start',
  },
  heroPillText: {
    fontFamily: FONTS.bodySemiBold,
  },

  // ── XP Counter ──
  xpContainer: {
    paddingHorizontal: s(16),
    marginTop: vs(16),
    marginBottom: vs(4),
  },
  xpGradient: {
    borderRadius: s(18),
    padding: s(16),
    overflow: 'hidden',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  xpIconBox: {
    width: s(44),
    height: s(44),
    borderRadius: s(12),
    backgroundColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(10),
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    marginBottom: vs(2),
  },
  xpValue: {
    fontFamily: FONTS.heading,
    fontSize: fs(28),
    color: '#FBBF24',
  },
  levelUpBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  levelUpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(12),
    color: '#FBBF24',
  },
  xpBarBg: {
    height: vs(4),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: s(2),
    marginTop: vs(12),
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#FBBF24',
    borderRadius: s(2),
  },

  // ── Bento ──
  bentoContainer: {
    paddingTop: vs(16),
    gap: vs(10),
  },
  sectionLabel: {
    fontFamily: FONTS.heading,
    marginBottom: vs(6),
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(12),
  },

  // ── Weight ──
  weightCard: {
    borderRadius: s(20),
    padding: s(16),
    marginTop: vs(20),
  },
  weightCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(12),
    marginBottom: vs(12),
  },
  weightIconBox: {
    width: s(38),
    height: s(38),
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightTitle: {
    fontFamily: FONTS.heading,
    marginBottom: vs(2),
  },
  weightSub: {
    fontFamily: FONTS.body,
    lineHeight: vs(16),
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: s(14),
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  weightInput: {
    flex: 1,
    paddingHorizontal: s(16),
    fontFamily: FONTS.heading,
  },
  weightUnit: {
    width: s(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightUnitText: {
    fontFamily: FONTS.bodyBold,
  },
  weightHint: {
    marginTop: vs(8),
    fontFamily: FONTS.body,
    textAlign: 'center',
  },

  // ── Photos ──
  photoSection: {
    borderRadius: s(20),
    padding: s(16),
    borderWidth: 1,
    marginTop: vs(20),
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    marginBottom: vs(14),
  },
  photoIconBox: {
    width: s(38),
    height: s(38),
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTitle: {
    fontFamily: FONTS.heading,
  },
  photoSub: {
    fontFamily: FONTS.body,
    marginTop: vs(2),
  },
  photoList: {
    gap: s(10),
    alignItems: 'center',
  },
  photoWrap: {
    borderRadius: s(14),
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: s(5),
    right: s(5),
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: 'rgba(224,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    borderRadius: s(14),
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: vs(6),
  },
  addPhotoBtnIconCircle: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtnLabel: {
    fontFamily: FONTS.bodySemiBold,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: s(20),
    paddingTop: vs(12),
    gap: vs(10),
    borderTopWidth: 1,
  },
  saveFooterBtn: {
    borderRadius: s(18),
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
  },
  saveBtnText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
    letterSpacing: 1,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: vs(8),
  },
  skipLinkText: {
    fontFamily: FONTS.body,
    textDecorationLine: 'underline',
  },

  // ── Streak overlay ──
  streakOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakPopup: {
    alignItems: 'center',
    gap: vs(8),
  },
  streakPopupTitle: {
    fontFamily: FONTS.heading,
    color: '#FFF',
    letterSpacing: 2,
    marginTop: vs(16),
  },
  streakPopupSub: {
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});

const bentoStyles = StyleSheet.create({
  tile: {
    borderRadius: s(20),
    padding: s(14),
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tileIconBox: {
    width: s(34),
    height: s(34),
    borderRadius: s(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  tileLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(9),
    letterSpacing: 1.2,
    marginBottom: vs(1),
  },
  tileValue: {
    fontFamily: FONTS.heading,
    flexWrap: 'wrap',
  },
  tileSub: {
    fontFamily: FONTS.body,
    fontSize: fs(10),
    marginTop: vs(2),
  },
});

const carouselStyles = StyleSheet.create({
  card: {
    borderRadius: s(20),
    padding: s(16),
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(12),
    marginBottom: vs(12),
  },
  exImage: {
    width: s(52),
    height: s(52),
    borderRadius: s(12),
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  exMeta: {
    flex: 1,
    paddingTop: vs(2),
  },
  exName: {
    fontFamily: FONTS.heading,
    fontSize: fs(15),
    lineHeight: fs(20),
    marginBottom: vs(4),
  },
  exSetsSub: {
    fontFamily: FONTS.body,
    fontSize: fs(12),
  },
  badgeSkipped: {
    backgroundColor: '#374151',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
    alignSelf: 'flex-start',
  },
  badgeWorld: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
    alignSelf: 'flex-start',
  },
  badgePR: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
    alignSelf: 'flex-start',
  },
  badgeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: s(6),
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(9),
    color: '#FFF',
    letterSpacing: 0.5,
  },
  recordRow: {
    flexDirection: 'row',
    gap: s(8),
    marginBottom: vs(12),
    flexWrap: 'wrap',
  },
  recordPill: {
    flex: 1,
    minWidth: s(90),
    borderRadius: s(10),
    paddingVertical: vs(8),
    paddingHorizontal: s(10),
  },
  recordPillLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(9),
    letterSpacing: 0.8,
    marginBottom: vs(3),
  },
  recordPillVal: {
    fontFamily: FONTS.heading,
    fontSize: fs(13),
  },
  exStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
  },
  exStatCell: {
    width: '47%',
    borderRadius: s(12),
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
  },
  exStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: fs(8),
    letterSpacing: 0.8,
    marginBottom: vs(4),
  },
  exStatValue: {
    fontFamily: FONTS.heading,
    fontSize: fs(18),
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(5),
    marginTop: vs(12),
    paddingBottom: vs(4),
  },
  dot: {
    height: s(6),
    borderRadius: s(3),
  },
});
