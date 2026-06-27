import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../components/ui/OptimizedImage';
import { FONTS } from '../constants/theme';
import { P } from '../constants/homeTheme';
import { useTheme } from '../contexts/ThemeContext';
import { formatDurationFull as formatDuration, formatDateTime } from '../utils/datetime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const METRIC_COLORS: Record<string, string> = {
  DURATION: '#2596BE',
  'ACTIVE TIME': '#00C9C8',
  CALORIES: '#EF4444',
  VOLUME: '#10B981',
  'REST TIME': '#F59E0B',
  SETS: '#8B5CF6',
  'BODY WEIGHT': '#10B981',
  EXERCISES: '#2596BE',
  'BEST SET': '#FBBF24',
  'AVG RATING': '#F59E0B',
};

// ── Apple-Style Exercise Carousel Card ──────────────────────────────────────
const CAROUSEL_CARD_W = SCREEN_WIDTH - 64;
const CAROUSEL_SNAP = CAROUSEL_CARD_W + 12;

function ExerciseCarouselCard({ ex, colors, isDark }: { ex: any; colors: any; isDark: boolean }) {
  const isSkipped = ex.is_skipped;
  const isCardio = ex.category?.toLowerCase() === 'cardio';
  const isBodyweight = ex.equipment?.toLowerCase() === 'body weight';
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
        styles.exCard,
        {
          width: CAROUSEL_CARD_W,
          marginBottom: 0,
          backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          borderWidth: 1,
        },
        isSkipped && !hasCompletedData && { opacity: 0.55 },
      ]}
    >
      {/* Header */}
      <View style={styles.exHeader}>
        <OptimizedImage uri={ex.image_url} style={styles.exImage} />
        <View style={styles.exMeta}>
          <Text style={[styles.exName, { color: colors.text }]} numberOfLines={2}>{ex.name}</Text>
          <Text style={[styles.exSetsSub, { color: colors.textMuted }]}>
            {isSkipped && !hasCompletedData ? 'Movement skipped' : isSkipped && hasCompletedData ? `Partially completed — ${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} logged, then skipped` : isCardio ? `${formatTime(totalTime)} logged` : `${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} completed`}
          </Text>
        </View>
        {isSkipped && (
          <View style={styles.badgeSkipped}>
            <Text style={styles.badgeText}>SKIPPED</Text>
          </View>
        )}
        {!isSkipped && ex.is_world_record && (
          <View style={styles.badgeWorld}>
            <Ionicons name="earth" size={10} color="#FFF" style={{ marginRight: 3 }} />
            <Text style={styles.badgeText}>WORLD PR</Text>
          </View>
        )}
        {!isSkipped && !ex.is_world_record && ex.is_personal_record && (
          <View style={styles.badgePR}>
            <Ionicons name="ribbon" size={10} color="#1a1a1a" style={{ marginRight: 3 }} />
            <Text style={[styles.badgeText, { color: '#1a1a1a' }]}>NEW PR</Text>
          </View>
        )}
        {!isSkipped && !ex.is_world_record && !ex.is_personal_record && ex.rating !== null && ex.rating !== undefined && (
          <View style={styles.badgeRating}>
            <Ionicons name="star" size={10} color={P.sun} style={{ marginRight: 3 }} />
            <Text style={[styles.badgeText, { color: P.sun }]}>{ex.rating}/10</Text>
          </View>
        )}
      </View>

      {/* Record row (non-cardio, has completed data) */}
      {!isCardio && hasCompletedData && (
        <View style={styles.recordRow}>
          <View style={[styles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.recordPillLabel, { color: colors.textMuted }]}>BEST SET</Text>
            <Text style={[styles.recordPillVal, { color: colors.text }]}>
              {isBodyweight ? `${ex.best_set_reps || 0} reps` : `${Number(ex.best_set_weight || 0).toFixed(1)}kg × ${ex.best_set_reps || 0}`}
            </Text>
          </View>
          <View style={[styles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.recordPillLabel, { color: colors.textMuted }]}>MY PR</Text>
            <Text style={[styles.recordPillVal, { color: colors.text }]}>
              {formatRecord(ex.record_metric_type, ex.personal_record_value)}
            </Text>
          </View>
          <View style={[styles.recordPill, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.recordPillLabel, { color: colors.textMuted }]}>WORLD PR</Text>
            <Text style={[styles.recordPillVal, { color: colors.text }]}>
              {formatRecord(ex.record_metric_type, ex.world_record_value)}
            </Text>
          </View>
        </View>
      )}

      {/* Stats grid — show for non-skipped OR skipped with completed data */}
      {(!isSkipped || hasCompletedData) && completedSets.length > 0 && (
        <View style={styles.exStatsGrid}>
          {isCardio ? (
            <>
              <View style={[styles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.exStatLabel, { color: colors.textMuted }]}>TOTAL TIME</Text>
                <Text style={[styles.exStatValue, { color: colors.text }]}>{formatTime(totalTime)}</Text>
              </View>
              <View style={[styles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.exStatLabel, { color: colors.textMuted }]}>AVG TIME</Text>
                <Text style={[styles.exStatValue, { color: colors.text }]}>{formatTime(avgTime)}</Text>
              </View>
            </>
          ) : isBodyweight ? (
            <>
              <View style={[styles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.exStatLabel, { color: colors.textMuted }]}>TOTAL REPS</Text>
                <Text style={[styles.exStatValue, { color: colors.text }]}>{totalReps}</Text>
              </View>
              <View style={[styles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.exStatLabel, { color: colors.textMuted }]}>AVG TIME</Text>
                <Text style={[styles.exStatValue, { color: colors.text }]}>{formatTime(avgTime)}</Text>
              </View>
            </>
          ) : (
            [
              { label: 'TOTAL WEIGHT', value: `${Math.round(totalWeight)}kg` },
              { label: 'AVG / SET', value: `${avgWeight}kg` },
              { label: 'TOTAL REPS', value: `${totalReps}` },
              { label: 'AVG TIME / SET', value: formatTime(avgTime) },
            ].map((item, idx) => (
              <View key={idx} style={[styles.exStatCell, { backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.exStatLabel, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.exStatValue, { color: colors.text }]}>{item.value}</Text>
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
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_SNAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}
        style={{ marginLeft: -20, marginRight: -20 }}
        onMomentumScrollEnd={onScroll}
      >
        {exercises.map((ex: any) => (
          <ExerciseCarouselCard key={ex.id} ex={ex} colors={colors} isDark={isDark} />
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
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                  width: i === activeIdx ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface WorkoutSummaryProps {
  workout: any;
  displayDuration?: number;
  displayVolume?: number;
  displayRest?: number;
  uploadingPhotos?: string[];
  loadingPhotos?: boolean;
  onAddPhotos?: () => void;
  onDeletePhoto?: (id: number) => void;
  onOpenViewer?: (uri: string) => void;
  onEditMetrics?: () => void;
  showBodyWeight?: boolean;
  hideEditButton?: boolean;
}

export default function WorkoutSummary({
  workout,
  displayDuration,
  displayVolume,
  displayRest,
  uploadingPhotos = [],
  loadingPhotos = false,
  onAddPhotos,
  onDeletePhoto,
  onOpenViewer,
  onEditMetrics,
  showBodyWeight = true,
  hideEditButton = false,
}: WorkoutSummaryProps) {
  const { colors, isDark } = useTheme();

  const duration = displayDuration ?? workout?.total_duration_seconds ?? 0;
  const volume = displayVolume ?? workout?.total_volume ?? 0;
  const rest = displayRest ?? workout?.total_rest_seconds ?? 0;
  const caloriesBurned = Number(workout?.calories_burned) || 0;

  const activeTime = workout?.exercises?.reduce((acc: number, ex: any) =>
    acc + (ex.sets?.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) || 0), 0) || 0;

  const calculatedTotalSets = workout?.exercises?.reduce((acc: number, ex: any) =>
    acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0), 0) || 0;
  const totalSets = workout?.total_sets || calculatedTotalSets || 0;

  const totalExercises = workout?.exercises?.length || 0;
  const skippedExercises = workout?.exercises?.filter((e: any) => e.is_skipped).length || 0;
  const completedExercises = workout?.exercises?.filter((e: any) => e.is_completed && !e.is_skipped).length || 0;

  let bestSet: any = null;
  if (workout?.exercises) {
    for (const ex of workout.exercises) {
      if (ex.is_skipped) continue;
      for (const set of (ex.sets || [])) {
        if (set.is_skipped) continue;
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.reps) || 0;
        if (!bestSet || (w * r) > (bestSet.w * bestSet.r)) {
          bestSet = { w, r, name: ex.name };
        }
      }
    }
  }

  const ratingsList = workout?.exercises
    ? workout.exercises.map((e: any) => e.rating).filter((r: any) => r !== null && r !== undefined)
    : [];
  const avgRating = ratingsList.length > 0
    ? (ratingsList.reduce((a: number, b: number) => a + b, 0) / ratingsList.length).toFixed(1)
    : null;

  const stats: Array<{ key: string; icon: string; value: string; sub: string }> = [
    { key: 'DURATION', icon: 'time-outline', value: formatDuration(duration), sub: 'Total session' },
    { key: 'ACTIVE TIME', icon: 'stopwatch-outline', value: formatDuration(activeTime), sub: 'Active exercising' },
    { key: 'REST TIME', icon: 'hourglass-outline', value: formatDuration(rest), sub: 'Recovery' },
    { key: 'CALORIES', icon: 'flame-outline', value: `${caloriesBurned} kcal`, sub: 'Est. burn' },
    { key: 'VOLUME', icon: 'barbell-outline', value: `${Math.round(volume)}kg`, sub: 'Weight lifted' },
    { key: 'SETS', icon: 'layers-outline', value: `${totalSets}`, sub: 'Completed sets' },
    {
      key: 'EXERCISES',
      icon: 'fitness-outline',
      value: `${completedExercises}/${totalExercises}`,
      sub: skippedExercises > 0 ? `${skippedExercises} skipped` : 'All completed',
    },
    ...(bestSet ? [{ key: 'BEST SET', icon: 'trophy-outline', value: `${bestSet.w}kg × ${bestSet.r}`, sub: bestSet.name }] : []),

    ...(showBodyWeight ? [{ key: 'BODY WEIGHT', icon: 'scale-outline', value: `${workout?.post_workout_weight || 0}kg`, sub: 'Current mass' }] : []),
  ];

  return (
    <View>
      {/* ── Header ── */}
      <View style={styles.summaryHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.summaryDate, { color: colors.textMuted }]}>
              {formatDateTime(workout?.started_at || workout?.created_at)}
            </Text>
            {workout?.rating !== null && workout?.rating !== undefined && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={P.sun} />
                <Text style={styles.ratingBadgeText}>{workout.rating}/10</Text>
              </View>
            )}
          </View>
        </View>

      </View>

      {/* ── Photos Gallery ── */}
      {(workout?.photos?.length > 0 || uploadingPhotos.length > 0 || onAddPhotos) && (
        <View style={[styles.photoSection, { backgroundColor: isDark ? '#0D0D0D' : colors.card, borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {workout?.photos?.map((p: any) => (
              <TouchableOpacity key={p.id} style={styles.photoThumbWrap} onPress={() => onOpenViewer?.(p.photo_url)}>
                <OptimizedImage uri={p.photo_url} style={styles.photoThumb} />
                {onDeletePhoto && (
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => onDeletePhoto(p.id)}>
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            {uploadingPhotos.map((uri, idx) => (
              <View key={`uploading-${idx}`} style={[styles.photoThumbWrap, { opacity: 0.6 }]}>
                <OptimizedImage uri={uri} style={styles.photoThumb} />
                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              </View>
            ))}
            {onAddPhotos && (
              <TouchableOpacity
                style={[styles.photoAddBtn, { borderColor: isDark ? '#383838' : '#D0D0D0', backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
                onPress={onAddPhotos}
                disabled={loadingPhotos}
              >
                {loadingPhotos ? <ActivityIndicator size="small" color={isDark ? '#888' : '#999'} /> : <Ionicons name="add" size={24} color={isDark ? '#888' : '#999'} />}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Stats Grid ── */}
      <View style={styles.statsGrid}>
        {stats.map((s) => {
          const color = METRIC_COLORS[s.key] || P.cta;
          const isBodyWeight = s.key === 'BODY WEIGHT';
          const card = (
            <View
              key={s.key}
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                  borderWidth: 1,
                },
                isBodyWeight && onEditMetrics && { borderColor: colors.primary || P.cta, borderWidth: 1.5 },
              ]}
            >
              <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${color}18` }]}>
                <Ionicons name={s.icon as any} size={18} color={color} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.key}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statSub, { color: colors.textDim }]}>{s.sub}</Text>
              {isBodyWeight && onEditMetrics && (
                <View style={styles.weightEditBadge}>
                  <Ionicons name="create-outline" size={12} color="#FFF" />
                </View>
              )}
            </View>
          );
          if (isBodyWeight && onEditMetrics) {
            return (
              <TouchableOpacity key={`${s.key}-btn`} onPress={onEditMetrics} activeOpacity={0.7}>
                {card}
              </TouchableOpacity>
            );
          }
          return card;
        })}
      </View>

      {/* ── Exercise Cards ── */}
      <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 12 }]}>Movement Summary</Text>

      {workout?.exercises?.length > 0 && (
        <ExerciseCarousel exercises={workout.exercises} colors={colors} isDark={isDark} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryDate: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: P.sun,
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: P.cta,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  // ── Photos ──
  photoSection: {
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  photoThumbWrap: {
    width: 100,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoAddBtn: {
    width: 100,
    height: 130,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 1,
    flexWrap: 'wrap',
  },
  statSub: {
    fontFamily: FONTS.body,
    fontSize: 10,
    marginTop: 2,
  },

  // ── Section Label ──
  sectionLabel: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    marginBottom: 16,
  },

  // ── Exercise Cards ──
  exCard: {
    borderRadius: 20,
    padding: 16,
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
    gap: 12,
    marginBottom: 12,
  },
  exImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  exMeta: {
    flex: 1,
    paddingTop: 2,
  },
  exName: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  exSetsSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },

  // Badges
  badgeSkipped: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeWorld: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgePR: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Record row
  recordRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  recordPill: {
    flex: 1,
    minWidth: 90,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  recordPillLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  recordPillVal: {
    fontFamily: FONTS.heading,
    fontSize: 13,
  },

  // 2×2 stat grid
  exStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exStatCell: {
    width: '47%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  exStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weightEditBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: P.cta,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
