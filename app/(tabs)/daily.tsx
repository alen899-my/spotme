import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Dimensions, Image,
  Alert, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
    // The DB stores local time (via NOW()), NOT UTC — parse directly as local
    const normalized = dateStr.replace(' ', 'T');
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${displayHours}:${displayMinutes} ${ampm}`;
  } catch (e) {
    return dateStr;
  }
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

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          if (item.status === 'completed') {
            router.push(`/daily/view/${item.id}`);
          } else {
            router.push(`/daily/${item.id}`);
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          {/* Workout Image / Placeholder */}
          <View style={styles.imageContainer}>
            {hasPhoto ? (
              <Image source={{ uri: item.cover_photo_url || item.completion_photo_url }} style={styles.workoutImg} />
            ) : (
              <LinearGradient colors={['#333', '#111']} style={styles.workoutImgPlaceholder}>
                <MaterialCommunityIcons name="arm-flex" size={32} color="rgba(224,0,0,0.4)" />
              </LinearGradient>
            )}
            <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#10B981' : '#E00000' }]}>
              <Text style={styles.statusText}>{isCompleted ? 'DONE' : 'LIVE'}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(item.started_at)}</Text>
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={() => setDeletingId(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textDim} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || item.session_name || 'Workout'}
            </Text>
            <Text style={[styles.splitNameText, { color: '#E00000' }]}>{item.split_name || 'Quick Session'}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{totalExs}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Exs</Text>
              </View>
              <View style={styles.statLine} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{totalSets}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Sets</Text>
              </View>
              <View style={styles.statLine} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{Math.round(item.total_volume)}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>kg</Text>
              </View>
              <View style={styles.statLine} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{formatDuration(item.total_duration_seconds)}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Time</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Log</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Your workout history</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/daily/new')}>
            <LinearGradient colors={['#E00000', '#B00000']} style={styles.newBtnGradient}>
              <Ionicons name="add" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#E00000" /></View>
        ) : workouts.length === 0 ? (
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
        ) : (
          <FlatList
            data={workouts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderWorkout}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={(
              <View style={styles.listHeader}>
                {/* Training Splits Section */}
                <View style={styles.splitsSection}>
                  <View style={styles.splitsHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Programs</Text>
                    <TouchableOpacity onPress={() => router.push('/splits/create')}>
                      <Ionicons name="add-circle" size={24} color="#E00000" />
                    </TouchableOpacity>
                  </View>
                  
                  {loadingSplits ? (
                    <ActivityIndicator color="#E00000" style={{ marginVertical: 20 }} />
                  ) : splits.length === 0 ? (
                    <TouchableOpacity 
                      style={[styles.emptySplitsBtn, { borderColor: colors.border }]}
                      onPress={() => router.push('/splits/create')}
                    >
                      <Ionicons name="layers-outline" size={20} color={colors.textDim} />
                      <Text style={[styles.emptySplitsText, { color: colors.textDim }]}>Setup your workout split</Text>
                    </TouchableOpacity>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitsScroll}>
                      {splits.map(split => (
                        <TouchableOpacity 
                          key={split.id} 
                          style={styles.splitMenuCard}
                          onPress={() => router.push(`/splits/${split.id}`)}
                        >
                          <LinearGradient colors={['#E00000', '#B00000']} style={styles.splitMenuGrad}>
                            <MaterialCommunityIcons name="folder-zip-outline" size={20} color="#FFF" />
                            <Text style={styles.splitMenuName} numberOfLines={1}>{split.name}</Text>
                            <Text style={styles.splitMenuMeta}>{split.session_count} Sessions</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <ConfirmationModal
        visible={deletingId !== null}
        title="Delete Workout?"
        message="This will permanently remove this session and all associated photos. Are you sure?"
        confirmText={isDeleting ? "DELETING..." : "YES, DELETE"}
        confirmColor="#EF4444"
        onConfirm={handleDeleteWorkout}
        onCancel={() => setDeletingId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, marginTop: 10 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  newBtn: { borderRadius: 14, overflow: 'hidden' },
  newBtnGradient: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  card: { borderRadius: 24, padding: 12, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  imageContainer: { width: 100, height: 120, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  workoutImg: { width: '100%', height: '100%' },
  workoutImgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 0.5 },
  cardInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deleteBtn: { padding: 4 },
  dateText: { fontFamily: FONTS.body, fontSize: 11 },
  cardTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 2 },
  splitNameText: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  statLbl: { fontFamily: FONTS.body, fontSize: 10, marginTop: 1 },
  statLine: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.06)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 26, marginTop: 20, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 18 },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },
  listHeader: { marginBottom: 10 },
  splitsSection: { marginBottom: 24 },
  splitsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18 },
  splitsScroll: { gap: 12, paddingRight: 20 },
  splitMenuCard: { width: 140, borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  splitMenuGrad: { padding: 16, height: 100, justifyContent: 'center' },
  splitMenuName: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 14, marginTop: 8 },
  splitMenuMeta: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.body, fontSize: 10, marginTop: 2 },
  emptySplitsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, borderStyle: 'dashed', borderWidth: 1.5, borderRadius: 18 },
  emptySplitsText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  historyHeader: { marginBottom: 16, marginTop: 8 },
});
