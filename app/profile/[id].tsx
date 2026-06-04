import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { P, getXPProgress, TIER_COLORS } from '../../constants/homeTheme';
import { UserProfileSkeleton } from '../../components/ui/Skeleton';

const { width: SW } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const TIERS = [
  { name: 'Bronze',      color: '#CD7F32', gradient: ['#CD7F32','#8B4513'] as [string,string], mcIcon: 'shield' },
  { name: 'Silver',      color: '#B0B8C1', gradient: ['#C0C0C0','#808080'] as [string,string], mcIcon: 'shield-half-full' },
  { name: 'Gold',        color: '#F7CB16', gradient: ['#FFD700','#B8860B'] as [string,string], mcIcon: 'trophy' },
  { name: 'Platinum',    color: '#00C9C8', gradient: ['#00C9C8','#007BFF'] as [string,string], mcIcon: 'diamond-stone' },
  { name: 'Diamond',     color: '#7DD4F8', gradient: ['#B9F2FF','#00BFFF'] as [string,string], mcIcon: 'diamond' },
  { name: 'Master',      color: '#9B59B6', gradient: ['#9B59B6','#6C3483'] as [string,string], mcIcon: 'crown' },
  { name: 'Grandmaster', color: '#E91E63', gradient: ['#E91E63','#880E4F'] as [string,string], mcIcon: 'crown-outline' },
  { name: 'Elite',       color: '#FF5722', gradient: ['#FF5722','#BF360C'] as [string,string], mcIcon: 'sword-cross' },
  { name: 'Champion',    color: '#E00000', gradient: ['#E00000','#7F0000'] as [string,string], mcIcon: 'fire' },
  { name: 'Legend',      color: '#FF9900', gradient: ['#FF9900','#E00000'] as [string,string], mcIcon: 'star-four-points' },
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
function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [canViewFull, setCanViewFull] = useState(true);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [hasPendingFromTarget, setHasPendingFromTarget] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setMyId(JSON.parse(userData).id);

      const res = await axios.get(`${API_URL}/profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
      setWorkouts(res.data.workouts || []);
      setCanViewFull(res.data.can_view_full !== false);
      setFollowStatus(res.data.follow_status);
      setHasPendingFromTarget(res.data.has_pending_from_target || false);
    } catch (err: any) {
      console.error('Profile fetch error:', err?.response?.status, err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    const prevStatus = followStatus;
    const optimistic = followStatus === 'accepted' ? null : (user?.is_private ? 'pending' : 'accepted');
    setFollowStatus(optimistic);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (prevStatus === 'accepted') {
        await axios.post(`${API_URL}/profile/${id}/unfollow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/profile/${id}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      setFollowStatus(prevStatus);
    }
  };

  const handleAccept = async () => {
    const prevPending = hasPendingFromTarget;
    setHasPendingFromTarget(false);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/profile/${id}/accept-follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setHasPendingFromTarget(prevPending);
    }
  };

  const handleDeny = async () => {
    const prevPending = hasPendingFromTarget;
    setHasPendingFromTarget(false);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/profile/${id}/deny-follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setHasPendingFromTarget(prevPending);
    }
  };

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="account-off-outline" size={72} color={P.border} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Athlete not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backPill, isDark && { backgroundColor: colors.primary }]}>
          <Ionicons name="chevron-back" size={16} color="#FFF" />
          <Text style={styles.backPillText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tier = getTier(user.league_tier ?? 'Bronze');
  const xpInfo = getXPProgress(user.league_tier ?? 'Bronze', user.xp ?? 0);
  const isDarkText = ['Silver','Gold','Diamond','Legend'].includes(user.league_tier ?? '');
  const isOwnProfile = myId === Number(id);

  const getFollowButton = () => {
    if (isOwnProfile) return null;

    if (hasPendingFromTarget && followStatus !== 'accepted') {
      return (
        <View style={styles.followActions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={14} color="#FFF" />
            <Text style={styles.followBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={handleDeny}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={14} color="#FFF" />
            <Text style={styles.followBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (followStatus === 'accepted') {
      return (
        <TouchableOpacity
          style={[styles.followBtn, { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
          onPress={handleFollow}
          activeOpacity={0.8}
        >
          <Ionicons name="person-remove" size={16} color="#FFF" />
          <Text style={styles.followBtnText}>Following</Text>
        </TouchableOpacity>
      );
    }

    if (followStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.followBtn, { backgroundColor: 'rgba(247,203,22,0.2)', borderWidth: 1, borderColor: P.sun }]}
          onPress={handleFollow}
          activeOpacity={0.8}
        >
          <Ionicons name="time" size={16} color={P.sun} />
          <Text style={[styles.followBtnText, { color: P.sun }]}>Requested</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.followBtn, { backgroundColor: colors.primary }]}
        onPress={handleFollow}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={16} color="#FFF" />
        <Text style={styles.followBtnText}>Follow</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[
        styles.header, 
        { 
          backgroundColor: isDark ? colors.bg : colors.primary,
          paddingTop: insets.top,
          paddingBottom: 8,
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerBack, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO CARD (always shown) ── */}
        <TouchableOpacity activeOpacity={1} style={[styles.heroCardWrap, { borderColor: isDark ? colors.border : 'rgba(37,150,190,0.2)' }]}>
          <LinearGradient
            colors={isDark ? ['#0D0D0D', '#050505'] : ['#2596BE', '#0d4d65']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroRow}>
              <View style={styles.heroAvatarWrap}>
                <View style={[styles.avatarRing, { borderColor: tier.color }]}>
                  {user.profile_pic_url ? (
                    <Image source={{ uri: user.profile_pic_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                      <Ionicons name="person" size={36} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.tierBadgeWrap}>
                  <LinearGradient colors={tier.gradient} style={styles.tierBadge}>
                    <MaterialCommunityIcons
                      name={tier.mcIcon as any}
                      size={11}
                      color={isDarkText ? '#021518' : '#FFF'}
                    />
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: isDark ? colors.text : '#FFF' }]} numberOfLines={1}>{user.full_name ?? 'Athlete'}</Text>
                <Text style={[styles.heroTier, { color: tier.color }]}>
                  {(user.league_tier ?? 'Bronze').toUpperCase()} LEAGUE
                </Text>
                {user.fitness_goal ? (
                  <View style={[styles.goalBadge, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(255, 255, 255, 0.15)' }]}>
                    <Ionicons name="flag-outline" size={10} color={isDark ? colors.primary : '#FFF'} />
                    <Text style={[styles.goalText, { color: isDark ? colors.primary : '#FFF' }]} numberOfLines={1}>{user.fitness_goal}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.heroXPBlock}>
                <Text style={[styles.heroXPVal, { color: isDark ? colors.text : '#FFF' }]}>
                  {(user.xp ?? 0) >= 1000
                    ? `${((user.xp ?? 0) / 1000).toFixed(1)}k`
                    : String(user.xp ?? 0)}
                </Text>
                <Text style={[styles.heroXPLabel, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.7)' }]}>XP</Text>
              </View>
            </View>

            <View style={styles.xpBarArea}>
              <View style={styles.xpBarLabels}>
                <Text style={[styles.xpBarTierText, { color: tier.color }]}>{user.league_tier}</Text>
                <Text style={[styles.xpBarNextText, { color: isDark ? colors.textMuted : 'rgba(255, 255, 255, 0.8)' }]}>
                  {xpInfo.xpToNext.toLocaleString()} XP to {xpInfo.nextTier}
                </Text>
                <Text style={[styles.xpBarTierText, { color: isDark ? colors.textMuted : 'rgba(255, 255, 255, 0.7)' }]}>{xpInfo.nextTier}</Text>
              </View>
              <View style={[styles.xpBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.2)' }]}>
                <LinearGradient
                  colors={tier.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.xpBarFill, { width: `${Math.round(xpInfo.progress * 100)}%` }]}
                />
              </View>
            </View>

            {/* Follow button in hero card */}
            {!isOwnProfile && (
              <View style={styles.heroFollowRow}>
                {getFollowButton()}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── PRIVATE PROFILE LOCK MESSAGE ── */}
        {!canViewFull && !isOwnProfile && (
          <View style={[styles.lockedCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
            <Ionicons name="lock-closed" size={40} color={colors.textMuted} />
            <Text style={[styles.lockedTitle, { color: colors.text }]}>Private Profile</Text>
            <Text style={[styles.lockedSub, { color: colors.textMuted }]}>
              {followStatus === 'pending'
                ? 'Follow request sent. Wait for approval to see full details.'
                : 'Follow this athlete to see their full profile details.'}
            </Text>
          </View>
        )}

        {/* ── FULL PROFILE CONTENT (only when canViewFull) ── */}
        {canViewFull && (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="flame" size={18} color="#FF9F43" />
                  <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>STREAK</Text>
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {user.current_streak || 0}
                </Text>
                <Text style={[styles.statCardUnit, { color: colors.textDim }]}>days</Text>
                <View style={[styles.statCardDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.statCardFooter, { color: colors.textMuted }]}>
                  Last active: {formatDate(user.last_workout_date)}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
                <View style={styles.statIconRow}>
                  <MaterialCommunityIcons name="dumbbell" size={18} color={colors.primary} />
                  <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>WORKOUTS</Text>
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {workouts.length}
                </Text>
                <Text style={[styles.statCardUnit, { color: colors.textDim }]}>logged</Text>
                <View style={[styles.statCardDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.statCardFooter, { color: colors.textMuted }]}>
                  {user.experience_level?.split('(')[0]?.trim() || 'Intermediate'}
                </Text>
              </View>
            </View>

            {/* Physical Metrics */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Physical Metrics</Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
            </View>

            <View style={styles.metricsGrid}>
              {[
                { label: 'Height', value: user.height ? `${user.height} cm` : '—', icon: 'human-male-height' },
                { label: 'Weight', value: user.weight ? `${user.weight} kg` : '—', icon: 'scale-bathroom' },
                { label: 'Age',    value: user.age    ? `${user.age} yrs`  : '—', icon: 'calendar-account' },
                { label: 'Gender', value: user.gender || '—',                      icon: 'gender-male-female' },
              ].map((m) => (
                <View key={m.label} style={[styles.metricTile, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)', shadowColor: isDark ? '#000000' : P.ctaDeep }]}>
                  <MaterialCommunityIcons name={m.icon as any} size={20} color={colors.primary} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent Workouts */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Workouts</Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
            </View>

            {workouts.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)' }]}>
                <MaterialCommunityIcons name="calendar-plus" size={52} color={colors.primary} />
                <Text style={[styles.emptyCardTitle, { color: colors.text }]}>No Workouts Yet</Text>
                <Text style={[styles.emptyCardSub, { color: colors.textMuted }]}>This athlete hasn't logged any workouts.</Text>
              </View>
            ) : (
              workouts.map((w) => {
                const totalExs  = parseInt(w.exercise_count   || 0);
                const totalSets = parseInt(w.total_sets       || 0);
                const vol       = formatVolume(w.total_volume);
                const dur       = formatDuration(w.total_duration_seconds);
                const hasPhoto  = !!(w.cover_photo_url || w.completion_photo_url);
                const title     = w.session_name || w.title || 'Workout Session';
                const split     = w.split_name && w.split_name !== title ? w.split_name : '';

                return (
                  <View key={w.id} style={[styles.wCard, { borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)', backgroundColor: colors.card, shadowColor: isDark ? '#000000' : P.ctaDeep }]}>
                    <View style={styles.wCardGradient}>
                      <View style={styles.wCardRow}>
                        <View style={[styles.wImgWrap, { borderColor: colors.border }]}>
                          {hasPhoto ? (
                            <Image source={{ uri: w.cover_photo_url || w.completion_photo_url }} style={styles.wImg} />
                          ) : (
                            <View style={[styles.wImgPlaceholder, { backgroundColor: colors.inputBg }]}>
                              <MaterialCommunityIcons name="arm-flex" size={28} color={colors.primary} />
                            </View>
                          )}
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>DONE</Text>
                          </View>
                        </View>

                        <View style={styles.wInfo}>
                          <Text style={[styles.wDate, { color: colors.textMuted }]}>{formatShortDate(w.completed_at || w.started_at)}</Text>
                          <Text style={[styles.wTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                          {!!split && <Text style={[styles.wSplit, { color: colors.primary }]}>{split}</Text>}

                          <View style={styles.wStatsRow}>
                            <View style={styles.wStatItem}>
                              <Text style={[styles.wStatVal, { color: colors.text }]}>{totalExs}</Text>
                              <Text style={[styles.wStatLbl, { color: colors.textMuted }]}>Exs</Text>
                            </View>
                            <View style={[styles.wStatLine, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : 'rgba(37,150,190,0.15)' }]} />
                            <View style={styles.wStatItem}>
                              <Text style={[styles.wStatVal, { color: colors.text }]}>{totalSets}</Text>
                              <Text style={[styles.wStatLbl, { color: colors.textMuted }]}>Sets</Text>
                            </View>
                            <View style={[styles.wStatLine, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : 'rgba(37,150,190,0.15)' }]} />
                            <View style={styles.wStatItem}>
                              <Text style={[styles.wStatVal, { color: colors.text }]}>{vol}</Text>
                              <Text style={[styles.wStatLbl, { color: colors.textMuted }]}>kg</Text>
                            </View>
                            <View style={[styles.wStatLine, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : 'rgba(37,150,190,0.15)' }]} />
                            <View style={styles.wStatItem}>
                              <Text style={[styles.wStatVal, { color: colors.text }]}>{dur}</Text>
                              <Text style={[styles.wStatLbl, { color: colors.textMuted }]}>Time</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  loadingText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22 },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: P.cta, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
  },
  backPillText: { fontFamily: FONTS.bodyBold, color: '#FFF', fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },

  heroCardWrap: {
    borderRadius: 24, marginTop: 16, marginBottom: 14,
    borderWidth: 1, borderColor: P.ctaDeep,
    overflow: 'hidden',
    shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  heroCard: { padding: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroAvatarWrap: { position: 'relative', marginRight: 14 },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2.5, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tierBadgeWrap: { position: 'absolute', bottom: -2, right: -2 },
  tierBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },
  heroInfo: { flex: 1, gap: 3 },
  heroName: { fontFamily: FONTS.heading, color: '#FFF', fontSize: 19, lineHeight: 22 },
  heroTier: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.4 },
  goalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: 'rgba(247,203,22,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start',
  },
  goalText: { fontFamily: FONTS.bodyBold, color: P.sun, fontSize: 9, letterSpacing: 0.3 },
  heroXPBlock: { alignItems: 'center', marginLeft: 10 },
  heroXPVal: { fontFamily: FONTS.heading, fontSize: 28, lineHeight: 30 },
  heroXPLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 },

  heroFollowRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  followBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#FFF',
  },
  followActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },

  xpBarArea: { marginTop: 14 },
  xpBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5,
  },
  xpBarTierText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  xpBarNextText: { fontFamily: FONTS.body, fontSize: 9, color: 'rgba(255,255,255,0.45)' },
  xpBarTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 4, minWidth: 6 },

  // Private locked card
  lockedCard: {
    borderRadius: 24, padding: 36,
    alignItems: 'center', gap: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  lockedTitle: { fontFamily: FONTS.heading, fontSize: 20 },
  lockedSub: { fontFamily: FONTS.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: P.ctaDeep,
    shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statCardLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 },
  statCardValue: { fontFamily: FONTS.heading, fontSize: 36, lineHeight: 38 },
  statCardUnit: { fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: -2 },
  statCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 },
  statCardFooter: { fontFamily: FONTS.bodyBold, fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 16, letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: 1 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  metricTile: {
    width: (SW - 32 - 10) / 2,
    borderRadius: 18, padding: 16,
    alignItems: 'flex-start', gap: 6,
    borderWidth: 1, borderColor: P.ctaDeep,
    shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  metricValue: { fontFamily: FONTS.heading, color: '#FFF', fontSize: 20 },
  metricLabel: { fontFamily: FONTS.bodyBold, color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },

  wCard: {
    borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: P.ctaDeep,
    overflow: 'hidden',
    shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 16, elevation: 6,
  },
  wCardGradient: { padding: 12 },
  wCardRow: { flexDirection: 'row', alignItems: 'center' },
  wImgWrap: {
    width: 90, height: 110, borderRadius: 14,
    overflow: 'hidden', position: 'relative',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  wImg: { width: '100%', height: '100%' },
  wImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  doneBadge: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: '#10B981',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  doneBadgeText: { fontFamily: FONTS.bodyBold, color: '#FFF', fontSize: 7.5, letterSpacing: 0.5 },
  wInfo: { flex: 1, marginLeft: 14, justifyContent: 'center', flexShrink: 1 },
  wDate: { fontFamily: FONTS.body, fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginBottom: 3 },
  wTitle: { fontFamily: FONTS.heading, fontSize: 17, color: '#FFF', lineHeight: 20, marginBottom: 2 },
  wSplit: { fontFamily: FONTS.bodyBold, fontSize: 12, color: P.sun, marginBottom: 10, lineHeight: 16 },
  wStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  wStatItem: { alignItems: 'center' },
  wStatVal: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
  wStatLbl: { fontFamily: FONTS.body, fontSize: 9.5, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  wStatLine: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.18)' },

  emptyCard: {
    borderRadius: 24, padding: 36,
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: P.ctaDeep,
    shadowColor: P.ctaDeep, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  emptyCardTitle: { fontFamily: FONTS.heading, color: '#FFF', fontSize: 20 },
  emptyCardSub: { fontFamily: FONTS.body, color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
});
