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
import { useUnits } from '../contexts/UnitContext';
import { formatWeight, formatWeightValue, formatRecordValue, formatBodyWeight, weightUnit } from '../utils/units';
import WorkoutMovementSummaryList from './workout/WorkoutMovementSummaryList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
  const { unitSystem } = useUnits();

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
    { key: 'VOLUME', icon: 'barbell-outline', value: `${formatWeightValue(Math.round(volume), unitSystem)}${weightUnit(unitSystem)}`, sub: 'Weight lifted' },
    { key: 'SETS', icon: 'layers-outline', value: `${totalSets}`, sub: 'Completed sets' },
    {
      key: 'EXERCISES',
      icon: 'fitness-outline',
      value: `${completedExercises}/${totalExercises}`,
      sub: skippedExercises > 0 ? `${skippedExercises} skipped` : 'All completed',
    },
    ...(bestSet ? [{ key: 'BEST SET', icon: 'trophy-outline', value: `${formatWeightValue(bestSet.w, unitSystem)}${weightUnit(unitSystem)} × ${bestSet.r}`, sub: bestSet.name }] : []),

    ...(showBodyWeight ? [{ key: 'BODY WEIGHT', icon: 'scale-outline', value: `${formatBodyWeight(workout?.post_workout_weight || 0, unitSystem)}`, sub: 'Current mass' }] : []),
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

      {/* ── Movement Summary ── */}
      <WorkoutMovementSummaryList
        exercises={workout?.exercises}
        title="Movement Summary"
        containerStyle={{ marginTop: 8 }}
      />
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
