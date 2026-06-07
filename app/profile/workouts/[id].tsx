import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const TIERS = [
  { name: 'Bronze',      color: '#CD7F32' },
  { name: 'Silver',      color: '#B0B8C1' },
  { name: 'Gold',        color: '#F7CB16' },
  { name: 'Platinum',    color: '#00C9C8' },
  { name: 'Diamond',     color: '#7DD4F8' },
  { name: 'Master',      color: '#9B59B6' },
  { name: 'Grandmaster', color: '#E91E63' },
  { name: 'Elite',       color: '#FF5722' },
  { name: 'Champion',    color: '#E00000' },
  { name: 'Legend',      color: '#FF9900' },
];
function getTier(name: string) { return TIERS.find(t => t.name === name) ?? TIERS[0]; }

function formatDuration(sec: number) {
  if (!sec) return '0m';
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}
function formatVolume(vol: number) {
  const n = Number(vol || 0);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}
function formatShortDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const normalized = dateStr.replace(' ', 'T');
    const utcStr = (normalized.endsWith('Z') || normalized.includes('+')) ? normalized : `${normalized}Z`;
    const d = new Date(utcStr);
    if (isNaN(d.getTime())) return '—';
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${h % 12 || 12}:${m.toString().padStart(2,'0')} ${ampm}`;
  } catch { return '—'; }
}

export default function UserWorkoutsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/profile/${id}`, {
        params: { limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
      setWorkouts(res.data.workouts || []);
    } catch (err) {
      console.error('Error fetching workouts:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const tier = user ? getTier(user.league_tier) : TIERS[0];

  const renderCard = ({ item: w }: { item: any }) => {
    const totalExs  = parseInt(w.exercise_count   || 0);
    const totalSets = parseInt(w.total_sets       || 0);
    const vol       = formatVolume(w.total_volume);
    const dur       = formatDuration(w.total_duration_seconds);
    const hasPhoto  = !!(w.cover_photo_url || w.completion_photo_url);
    const title     = w.session_name || w.title || 'Workout Session';
    const split     = w.split_name && w.split_name !== title ? w.split_name : '';

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/daily/view/${w.id}?shared=1`)} style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? colors.border : tier.color + '30' }]}>
        <View style={styles.cardInner}>
          <View style={[styles.imgWrap, { borderColor: colors.border }]}>
            {hasPhoto ? (
              <Image source={{ uri: w.cover_photo_url || w.completion_photo_url }} style={styles.img} />
            ) : (
              <View style={[styles.imgPlaceholder, { backgroundColor: colors.inputBg }]}>
                <MaterialCommunityIcons name="arm-flex" size={26} color={tier.color} />
              </View>
            )}
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>DONE</Text>
            </View>
          </View>

          <View style={styles.info}>
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatShortDate(w.completed_at || w.started_at)}</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {!!split && <Text style={[styles.split, { color: tier.color }]}>{split}</Text>}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{totalExs}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Exs</Text>
              </View>
              <View style={[styles.statLine, { backgroundColor: tier.color + '30' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{totalSets}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Sets</Text>
              </View>
              <View style={[styles.statLine, { backgroundColor: tier.color + '30' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{vol}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>kg</Text>
              </View>
              <View style={[styles.statLine, { backgroundColor: tier.color + '30' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.text }]}>{dur}</Text>
                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Time</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {user?.profile_pic_url ? (
              <Image source={{ uri: user.profile_pic_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={16} color={colors.textMuted} />
              </View>
            )}
            <View>
              <Text style={[styles.headerName, { color: colors.text }]}>
                {user?.full_name || 'Athlete'}
              </Text>
              <Text style={[styles.headerCount, { color: colors.textMuted }]}>
                {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons name="calendar-plus" size={52} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No Workouts Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>This athlete hasn't logged any workouts.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  headerCount: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  emptyText: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    textAlign: 'center',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
    flexGrow: 1,
  },

  card: {
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardInner: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  imgWrap: {
    width: 90,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  doneBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  doneBadgeText: { fontFamily: FONTS.bodyBold, color: '#FFF', fontSize: 7.5, letterSpacing: 0.5 },
  info: { flex: 1, marginLeft: 14, justifyContent: 'center', flexShrink: 1 },
  date: { fontFamily: FONTS.body, fontSize: 10.5, marginBottom: 3 },
  title: { fontFamily: FONTS.heading, fontSize: 17, lineHeight: 20, marginBottom: 2 },
  split: { fontFamily: FONTS.bodyBold, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  statLbl: { fontFamily: FONTS.body, fontSize: 9.5, marginTop: 1 },
  statLine: { width: 1, height: 18 },
});
