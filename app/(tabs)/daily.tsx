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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

function formatDuration(seconds: number) {
  if (!seconds) return '0m';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    // Backend now stores UTC — append Z so browser treats it as UTC, then getHours() gives local time
    const normalized = dateStr.replace(' ', 'T');
    const utcStr = (normalized.endsWith('Z') || normalized.includes('+')) ? normalized : `${normalized}Z`;
    const date = new Date(utcStr);
    if (isNaN(date.getTime())) return dateStr;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
}

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
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSplits, setLoadingSplits] = useState(true);
  
  // Deletion
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fetchSplits = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
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
      const token = await AsyncStorage.getItem('userToken');
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
    fetchWorkouts(); 
    fetchSplits();
  }, [fetchWorkouts, fetchSplits]));

  const handleDeleteWorkout = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
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
        style={styles.card}
        onPress={() => {
          if (item.status === 'completed') {
            router.push(`/daily/view/${item.id}`);
          } else {
            router.push(`/daily/${item.id}`);
          }
        }}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[P.cta, P.ctaDark]} style={styles.cardGradient}>
          <View style={styles.cardRow}>
            <View style={styles.imageContainer}>
              {hasPhoto ? (
                <Image source={{ uri: item.cover_photo_url || item.completion_photo_url }} style={styles.workoutImg} />
              ) : (
                <LinearGradient colors={[P.ctaDark, P.ctaDeep]} style={styles.workoutImgPlaceholder}>
                  <MaterialCommunityIcons name="arm-flex" size={32} color="rgba(247,203,22,0.55)" />
                </LinearGradient>
              )}
              <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#10B981' : '#E00000' }]}>
                <Text style={styles.statusText}>{isCompleted ? 'DONE' : 'LIVE'}</Text>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{formatDate(item.started_at)}</Text>
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
                    <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.85)" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardTitle}>
                {title}
              </Text>
              {!!splitLabel && <Text style={styles.splitNameText}>{splitLabel}</Text>}

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{totalExs}</Text>
                  <Text style={styles.statLbl}>Exs</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{totalSets}</Text>
                  <Text style={styles.statLbl}>Sets</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{Math.round(item.total_volume)}</Text>
                  <Text style={styles.statLbl}>kg</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{formatDuration(item.total_duration_seconds)}</Text>
                  <Text style={styles.statLbl}>Time</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={loading ? [] : workouts}
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
              <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/daily/new')}>
                <LinearGradient colors={[P.cta, P.ctaDark]} style={styles.newBtnGradient}>
                  <Ionicons name="add" size={24} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.splitsSection}>
              {loadingSplits ? (
                <ActivityIndicator color={P.sun} style={{ marginVertical: 20 }} />
              ) : splits.length === 0 ? (
                <TouchableOpacity 
                  style={styles.emptySplitsBtn}
                  onPress={() => router.push('/splits/create')}
                >
                  <Ionicons name="layers-outline" size={20} color="#FFF" />
                  <Text style={styles.emptySplitsText}>Setup your workout split</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitsScroll}>
                  {splits.map(split => (
                    <TouchableOpacity 
                      key={split.id} 
                      style={styles.splitMenuCard}
                      onPress={() => router.push(`/splits/${split.id}`)}
                    >
                      <LinearGradient colors={[P.cta, P.ctaDark]} style={styles.splitMenuCardBg}>
                        <View style={styles.splitMenuImageWrap}>
                        <View style={styles.splitMenuImageFrame}>
                          {getSplitPreviewImage(split) ? (
                            <Image
                              source={{ uri: getSplitPreviewImage(split) as string }}
                              style={styles.splitMenuImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <LinearGradient colors={[P.ctaDark, P.ctaDeep]} style={styles.splitMenuImagePlaceholder}>
                              <MaterialCommunityIcons name="dumbbell" size={28} color={P.sun} />
                            </LinearGradient>
                          )}
                        </View>
                        </View>
                        <View style={styles.splitMenuContent}>
                          <Text style={styles.splitMenuName} numberOfLines={2}>{split.name}</Text>
                          <View style={styles.splitMenuMetaRow}>
                            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.82)" />
                            <Text style={styles.splitMenuMeta}>{split.session_count} Sessions</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.addSplitCard}
                    onPress={() => router.push('/splits/create')}
                    activeOpacity={0.86}
                  >
                    <LinearGradient colors={[P.ctaLight, '#FFFFFF']} style={styles.addSplitCardInner}>
                      <View style={styles.addSplitIconWrap}>
                        <Ionicons name="add" size={26} color={P.cta} />
                      </View>
                      <View style={styles.addSplitCopy}>
                        <Text style={styles.addSplitTitle}>Add Program</Text>
                        <Text style={styles.addSplitMeta}>Create a new split</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            <View style={styles.historyHeader}>
              <View style={styles.sectionCopy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Your latest logged workout sessions</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#E00000" />
            </View>
          ) : (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="calendar-plus" size={80} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workouts Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Start your first workout session and track your progress daily.
              </Text>
              <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/daily/new')}>
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.startBtnGradient}>
                  <Ionicons name="play" size={18} color="#FFF" />
                  <Text style={styles.startBtnText}>START TODAY'S WORKOUT</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  },
});
