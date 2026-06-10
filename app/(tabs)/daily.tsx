import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import DatePicker from '../../components/ui/DatePicker';
import { DailySkeleton } from '../../components/ui/Skeleton';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { formatDuration, formatDateTime, isSameDay, isToday } from '../../utils/datetime';


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

  // Date filter
  const [selectedDate, setSelectedDate] = useState(new Date());

  const filteredWorkouts = workouts.filter(w => {
    if (!w.started_at) return false;
    const d = new Date(w.started_at.replace(' ', 'T'));
    return isSameDay(d, selectedDate);
  });

  const pastWorkouts = workouts
    .filter(w => {
      if (!w.started_at) return false;
      const d = new Date(w.started_at.replace(' ', 'T'));
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
      const res = await axios.get(`${API_URL}/auth/me`, {
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
      const res = await axios.get(`${API_URL}/workouts/splits`, {
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
      const res = await axios.get(`${API_URL}/daily/workouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkouts(res.data);
    } catch (err) {
      console.error('Error fetching daily workouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    checkProfileCompletion();
    fetchWorkouts();
    fetchSplits();
  }, [checkProfileCompletion, fetchWorkouts, fetchSplits]));

  const handleDeleteWorkout = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/daily/workouts/${deletingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
                <Image source={{ uri: item.cover_photo_url || item.completion_photo_url }} style={styles.workoutImg} />
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
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{Math.round(item.total_volume)}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>kg</Text>
                </View>
                <View style={[styles.statLine, { backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.18)' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: isDark ? colors.text : '#FFF' }]}>{formatDuration(item.total_duration_seconds)}</Text>
                  <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.72)' }]}>Time</Text>
                </View>
              </View>
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
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Log</Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your workout history</Text>
              </View>
              {isSelectedToday && (
                <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/daily/new')}>
                  <LinearGradient 
                    colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]} 
                    style={styles.newBtnGradient}
                  >
                    <Ionicons name="add" size={24} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
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
                              <Image
                                source={{ uri: getSplitPreviewImage(split) as string }}
                                style={styles.splitMenuImage}
                                resizeMode="contain"
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
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.addSplitCard,
                      isDark && { borderColor: colors.border, shadowColor: '#000000' }
                    ]}
                    onPress={() => router.push('/splits/create')}
                    activeOpacity={0.86}
                  >
                    <LinearGradient colors={isDark ? ['#0D0D0D', '#050505'] : [P.ctaLight, '#FFFFFF']} style={styles.addSplitCardInner}>
                      <View style={[styles.addSplitIconWrap, isDark && { backgroundColor: 'rgba(247,203,22,0.12)' }]}>
                        <Ionicons name="add" size={26} color={isDark ? colors.primary : P.cta} />
                      </View>
                      <View style={styles.addSplitCopy}>
                        <Text style={[styles.addSplitTitle, { color: isDark ? '#F1F5F9' : P.ctaDeep }]}>Add Program</Text>
                        <Text style={[styles.addSplitMeta, { color: isDark ? 'rgba(241,245,249,0.5)' : P.muted }]}>Create a new split</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* Date Picker */}
            <View style={{ marginBottom: 20 }}>
              <DatePicker selectedDate={selectedDate} onSelectDate={setSelectedDate} variant="nutrition" />
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
              <MaterialCommunityIcons name="calendar-plus" size={80} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workouts Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Start your first workout session and track your progress daily.
              </Text>
              {isSelectedToday ? (
                <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/daily/new')}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.startBtnGradient}>
                    <Ionicons name="play" size={18} color="#FFF" />
                    <Text style={styles.startBtnText}>START TODAY'S WORKOUT</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>Can only log workouts for today</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.centered, { paddingVertical: 32 }]}>
              <Ionicons name="calendar-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 20 }]}>No Workouts This Day</Text>
              {isSelectedToday ? (
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Pick another date or log a new session.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    Can only log workouts for Past
                  </Text>
                </View>
              )}
            </View>
          )
        )}
      />

      <ConfirmationModal
        visible={deletingId !== null}
        title="Delete Workout?"
        message="This will permanently remove this session and all associated photos. Are you sure?"
        confirmText={isDeleting ? "DELETING..." : "YES, DELETE"}
        confirmColor="#EF4444"
        onConfirm={handleDeleteWorkout}
        onCancel={() => setDeletingId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, marginTop: 10 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  newBtn: { borderRadius: 14, overflow: 'hidden' },
  newBtnGradient: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 26, marginTop: 20, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 18 },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
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
