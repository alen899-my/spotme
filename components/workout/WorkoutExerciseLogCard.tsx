import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../ui/OptimizedImage';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnits } from '../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../utils/units';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export interface WorkoutExerciseLogCardProps {
  exercise: any;
  defaultExpanded?: boolean;
  onOpenGuide?: (exercise: any) => void;
}

export const WorkoutExerciseLogCard: React.FC<WorkoutExerciseLogCardProps> = React.memo(({
  exercise,
  defaultExpanded = true,
  onOpenGuide,
}) => {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!exercise) return null;

  const sets = exercise.sets || [];
  const completedSets = sets.filter((s: any) => !s.is_skipped).length;
  const targetSets = exercise.target_sets || Math.max(sets.length, 3);
  const isSkipped = exercise.is_skipped;
  const isDone = exercise.is_completed || completedSets > 0;

  const isCardio = exercise.category?.toLowerCase() === 'cardio';
  const isBodyweight = exercise.equipment?.toLowerCase() === 'body weight';

  const totalCardioTime = sets.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);

  const activeSets = sets.filter((s: any) => !s.is_skipped);
  const maxWeight = (isCardio || isBodyweight) ? 0 : Math.max(0, ...activeSets.map((x: any) => Number(x.weight) || 0));

  const getBadgeColor = (set: any) => {
    if (isCardio || isBodyweight || maxWeight === 0) return colors.primary;
    const intensity = Math.min(1, (Number(set.weight) || 0) / maxWeight);
    const alpha = Math.round((0.35 + intensity * 0.65) * 255).toString(16).padStart(2, '0');
    return colors.primary + alpha;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: isDark
            ? (isSkipped ? 'rgba(255,255,255,0.1)' : isDone ? 'rgba(16,185,129,0.35)' : colors.border)
            : (isSkipped ? '#E2E8F0' : isDone ? '#A7F3D0' : '#E2E8F0'),
        },
        isSkipped && completedSets === 0 && { opacity: 0.7 },
      ]}
    >
      {/* ── HEADER ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.75}
      >
        {/* Exercise Thumbnail */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (onOpenGuide) onOpenGuide(exercise);
          }}
          activeOpacity={0.7}
          style={styles.imageWrap}
        >
          <OptimizedImage
            uri={exercise.gif_url || exercise.image_url}
            style={styles.image}
          />
        </TouchableOpacity>

        {/* Exercise Info */}
        <View style={styles.headerInfo}>
          {/* Title & Status Badges */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.name,
                { color: isDark ? colors.text : '#0F172A' },
              ]}
              numberOfLines={2}
            >
              {exercise.name}
            </Text>

            <View style={styles.badgeRow}>
              {isDone && !isSkipped && (
                <View style={[styles.statusPill, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkmark-circle" size={11} color="#FFF" />
                  <Text style={styles.statusPillText}>DONE</Text>
                </View>
              )}
              {isSkipped && (
                <View style={[styles.statusPill, { backgroundColor: isDark ? '#475569' : '#94A3B8' }]}>
                  <Text style={styles.statusPillText}>SKIPPED</Text>
                </View>
              )}
              {exercise.is_world_record && (
                <View style={[styles.statusPill, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="earth" size={10} color="#FFF" />
                  <Text style={styles.statusPillText}>WORLD PR</Text>
                </View>
              )}
              {exercise.is_personal_record && !exercise.is_world_record && (
                <View style={[styles.statusPill, { backgroundColor: P.sun }]}>
                  <Ionicons name="ribbon" size={10} color="#1a1a1a" />
                  <Text style={[styles.statusPillText, { color: '#1a1a1a' }]}>NEW PR</Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress / Meta Bar */}
          {isCardio ? (
            <View style={styles.progressWrap}>
              <Ionicons name="stopwatch-outline" size={13} color={isDark ? colors.textMuted : '#64748B'} />
              <Text style={[styles.progressLabel, { color: isDark ? colors.textMuted : '#64748B' }]}>
                {formatTime(totalCardioTime)} logged
              </Text>
            </View>
          ) : (
            <View style={styles.progressWrap}>
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min((completedSets / targetSets) * 100, 100)}%` as any,
                      backgroundColor: isDone ? '#10B981' : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: isDark ? colors.textMuted : '#64748B' }]}>
                {completedSets}/{targetSets} sets
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevronWrap}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={isDark ? colors.textMuted : '#94A3B8'}
          />
        </View>
      </TouchableOpacity>

      {/* ── ACCORDION BODY: SETS LIST ── */}
      {expanded && (
        <View style={styles.body}>
          {sets && sets.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: isDark ? colors.textMuted : '#94A3B8' }]}>
                  SETS
                </Text>
              </View>

              {sets.map((s: any, idx: number) => {
                const setNum = s.set_number || idx + 1;
                if (s.is_skipped) {
                  return (
                    <View
                      key={s.id || `set-${idx}`}
                      style={[
                        styles.setCard,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                          borderColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2',
                        },
                      ]}
                    >
                      <View style={styles.setCardBody}>
                        <View style={[styles.setCardBadge, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                          <Text style={[styles.setCardBadgeText, { color: '#EF4444' }]}>{setNum}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="close-circle-outline" size={16} color="rgba(239,68,68,0.7)" />
                          <Text style={styles.setCardSkippedLabel}>Skipped</Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={s.id || `set-${idx}`}
                    style={[
                      styles.setCard,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                      },
                    ]}
                  >
                    <View style={styles.setCardBody}>
                      <View style={[styles.setCardBadge, { backgroundColor: getBadgeColor(s) }]}>
                        <Text style={styles.setCardBadgeText}>{setNum}</Text>
                      </View>

                      <View style={styles.setCardInfo}>
                        <Text style={[styles.setCardMainStat, { color: isDark ? colors.text : '#0F172A' }]}>
                          {isCardio
                            ? formatTime(s.duration_seconds || 0)
                            : isBodyweight
                              ? `${s.reps || 0} reps`
                              : `${formatWeightValue(Number(s.weight), unitSystem)} ${weightUnit(unitSystem)} × ${s.reps || 0} reps`
                          }
                        </Text>
                        {!isCardio && (s.duration_seconds > 0) && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Ionicons name="time-outline" size={12} color={isDark ? colors.textMuted : '#94A3B8'} />
                            <Text style={[styles.setCardSubStat, { color: isDark ? colors.textMuted : '#64748B' }]}>
                              {formatTime(s.duration_seconds)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.noSetsWrap}>
              <Text style={[styles.noSetsText, { color: isDark ? colors.textMuted : '#94A3B8' }]}>
                No sets recorded for this exercise
              </Text>
            </View>
          )}

          {/* ── EXERCISE RATING PILL ── */}
          {exercise.rating !== null && exercise.rating !== undefined && (
            <View
              style={[
                styles.ratingPill,
                {
                  backgroundColor: isDark ? colors.inputBg : '#FEF3C7',
                  borderColor: isDark ? colors.border : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="star" size={15} color={P.sun} />
              <Text style={[styles.ratingPillTitle, { color: P.sun }]}>
                EXERCISE RATING
              </Text>
              <View style={[styles.ratingPillBadge, { backgroundColor: P.sun }]}>
                <Text style={[styles.ratingPillBadgeText, { color: '#000' }]}>
                  {exercise.rating}/10
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 74,
    height: 74,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    gap: 4,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  chevronWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  body: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableHeaderText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  setCard: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  setCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  setCardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  setCardBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
  },
  setCardInfo: {
    flex: 1,
  },
  setCardMainStat: {
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  setCardSubStat: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  setCardSkippedLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: 'rgba(239,68,68,0.7)',
    letterSpacing: 0.3,
  },
  noSetsWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noSetsText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontStyle: 'italic',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  ratingPillTitle: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  ratingPillBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratingPillBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
});

export default WorkoutExerciseLogCard;
