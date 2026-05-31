import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../constants/theme';
import { P } from '../constants/homeTheme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRecord(metricType?: string, value?: number | string) {
  const numeric = Number(value) || 0;
  if (!numeric) return '0';
  if (metricType === 'max_reps') return `${Math.round(numeric)} reps`;
  return `${numeric.toFixed(1)} kg est. 1RM`;
}

const METRIC_COLORS: Record<string, string> = {
  DURATION: '#2596BE',
  CALORIES: '#EF4444',
  VOLUME: '#10B981',
  'REST TIME': '#F59E0B',
  SETS: '#8B5CF6',
  'BODY WEIGHT': '#10B981',
};

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

  const calculatedTotalSets = workout?.exercises?.reduce((acc: number, ex: any) =>
    acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0), 0) || 0;
  const totalSets = workout?.total_sets || calculatedTotalSets || 0;

  const stats = [
    { key: 'DURATION', icon: 'time-outline', value: formatDuration(duration), sub: 'Active time' },
    { key: 'CALORIES', icon: 'flame-outline', value: `${caloriesBurned} kcal`, sub: 'Est. burn' },
    { key: 'VOLUME', icon: 'barbell-outline', value: `${Math.round(volume)}kg`, sub: 'Weight lifted' },
    { key: 'REST TIME', icon: 'hourglass-outline', value: formatDuration(rest), sub: 'Recovery' },
    { key: 'SETS', icon: 'layers-outline', value: `${totalSets}`, sub: 'Completed sets' },
    ...(showBodyWeight ? [{ key: 'BODY WEIGHT' as const, icon: 'scale-outline' as const, value: `${workout?.post_workout_weight || 0}kg`, sub: 'Current mass' }] : []),
  ];

  function formatLocalDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      const normalized = dateStr.replace(' ', 'T');
      const utcStr = (normalized.endsWith('Z') || normalized.includes('+')) ? normalized : `${normalized}Z`;
      const date = new Date(utcStr);
      if (isNaN(date.getTime())) return dateStr;
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const h = date.getHours(), m = date.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
    } catch { return dateStr; }
  }

  return (
    <View>
      {/* ── Header ── */}
      <View style={styles.summaryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {workout?.title || workout?.session_name || 'Workout Summary'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.summaryDate, { color: colors.textMuted }]}>
              {formatLocalDate(workout?.started_at || workout?.created_at)}
            </Text>
            {workout?.rating !== null && workout?.rating !== undefined && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingBadgeText}>{workout.rating}/10</Text>
              </View>
            )}
          </View>
        </View>
        {!hideEditButton && onEditMetrics && (
          <TouchableOpacity
            onPress={onEditMetrics}
            style={[styles.editBtn, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="options-outline" size={20} color={isDark ? colors.primary : "#FFF"} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Photos Gallery ── */}
      {(workout?.photos?.length > 0 || uploadingPhotos.length > 0 || onAddPhotos) && (
        <View style={styles.photoSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {workout?.photos?.map((p: any) => (
              <TouchableOpacity key={p.id} style={styles.photoThumbWrap} onPress={() => onOpenViewer?.(p.photo_url)}>
                <Image source={{ uri: p.photo_url }} style={styles.photoThumb} />
                {onDeletePhoto && (
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => onDeletePhoto(p.id)}>
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                )}
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
            {onAddPhotos && (
              <TouchableOpacity
                style={[styles.photoAddBtn, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={onAddPhotos}
                disabled={loadingPhotos}
              >
                {loadingPhotos ? <ActivityIndicator size="small" color={colors.textDim} /> : <Ionicons name="add" size={24} color={colors.textDim} />}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Stats Grid — Black solid cards ── */}
      <View style={styles.statsGrid}>
        {stats.map((s, i) => {
          const color = METRIC_COLORS[s.key] || P.cta;
          return (
            <View
              key={s.key}
              style={[
                styles.statCard,
                isDark && { backgroundColor: '#0D0D0D', borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${color}20` }]}>
                <Ionicons name={s.icon as any} size={18} color={color} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.key}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statSub, { color: colors.textDim }]}>{s.sub}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Exercise Cards ── */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Movement Summary</Text>

      {workout?.exercises?.map((ex: any) => {
        const isSkipped = ex.is_skipped;
        const isCardio = ex.category?.toLowerCase() === 'cardio';
        const completedSets = ex.sets?.filter((s: any) => !s.is_skipped) || [];
        const totalReps = completedSets.reduce((acc: number, s: any) => acc + (parseInt(s.reps) || 0), 0);
        const totalWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
        const totalSetWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0), 0);
        const totalTime = completedSets.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
        const avgWeight = completedSets.length > 0 ? (totalSetWeight / completedSets.length).toFixed(1) : '0';
        const avgTime = completedSets.length > 0 ? Math.round(totalTime / completedSets.length) : 0;
        const ratings = ex.sets?.map((s: any) => s.rating).filter(Boolean) || [];

        return (
          <View
            key={ex.id}
            style={[
              styles.exCard,
              isSkipped && { opacity: 0.55 },
              isDark && {
                backgroundColor: colors.pill,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.exHeader}>
              <Image source={{ uri: ex.image_url }} style={styles.exImage} />
              <View style={styles.exMeta}>
                <Text style={[styles.exName, isDark && { color: colors.text }]} numberOfLines={2}>{ex.name}</Text>
                <Text style={[styles.exSetsSub, isDark && { color: colors.textMuted }]}>
                  {isSkipped ? 'Movement skipped' : isCardio ? `${formatTime(totalTime)} logged` : `${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} completed`}
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
                  <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 3 }} />
                  <Text style={styles.badgeText}>{ex.rating}/10</Text>
                </View>
              )}
            </View>

            {/* Record row (non-cardio, non-skipped) */}
            {!isSkipped && !isCardio && (
              <View style={styles.recordRow}>
                <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>BEST SET</Text>
                  <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                    {Number(ex.best_set_weight || 0).toFixed(1)}kg × {ex.best_set_reps || 0}
                  </Text>
                </View>
                <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>MY PR</Text>
                  <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                    {formatRecord(ex.record_metric_type, ex.personal_record_value)}
                  </Text>
                </View>
                <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>WORLD PR</Text>
                  <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                    {formatRecord(ex.record_metric_type, ex.world_record_value)}
                  </Text>
                </View>
              </View>
            )}

            {/* Stats grid */}
            {!isSkipped && completedSets.length > 0 && (
              <View style={styles.exStatsGrid}>
                {isCardio ? (
                  <>
                    <View style={[styles.exStatCell, isDark && { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.exStatLabel, isDark && { color: colors.textMuted }]}>TOTAL TIME</Text>
                      <Text style={[styles.exStatValue, isDark && { color: colors.text }]}>{formatTime(totalTime)}</Text>
                    </View>
                    <View style={[styles.exStatCell, isDark && { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.exStatLabel, isDark && { color: colors.textMuted }]}>AVG TIME</Text>
                      <Text style={[styles.exStatValue, isDark && { color: colors.text }]}>{formatTime(avgTime)}</Text>
                    </View>
                  </>
                ) : (
                  [
                    { label: 'TOTAL WEIGHT', value: `${Math.round(totalWeight)}kg` },
                    { label: 'AVG / SET', value: `${avgWeight}kg` },
                    { label: 'TOTAL REPS', value: `${totalReps}` },
                    { label: 'AVG TIME / SET', value: formatTime(avgTime) },
                  ].map((item, idx) => (
                    <View key={idx} style={[styles.exStatCell, isDark && { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.exStatLabel, isDark && { color: colors.textMuted }]}>{item.label}</Text>
                      <Text style={[styles.exStatValue, isDark && { color: colors.text }]}>{item.value}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
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
  summaryTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
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
    color: '#F59E0B',
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
    backgroundColor: 'rgba(37,150,190,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats Grid — Black solid cards ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
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
    backgroundColor: P.cta,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: P.ctaDark,
    overflow: 'hidden',
    marginBottom: 14,
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
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: P.sun,
    lineHeight: 20,
    marginBottom: 4,
  },
  exSetsSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  recordPillLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  recordPillVal: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    color: '#FFF',
  },

  // 2×2 stat grid
  exStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exStatCell: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  exStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: '#FFF',
  },
});
