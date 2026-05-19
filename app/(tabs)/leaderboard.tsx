import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, ActivityIndicator,
  Dimensions, Animated, ScrollView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Tier config (mirrors backend) ────────────────────────────────────────────
const TIERS = [
  { name: 'All',         color: '#888',    gradient: ['#555','#333'] as [string,string],         icon: 'trophy' },
  { name: 'Bronze',      color: '#CD7F32', gradient: ['#CD7F32','#8B4513'] as [string,string],   icon: 'medal' },
  { name: 'Silver',      color: '#C0C0C0', gradient: ['#C0C0C0','#808080'] as [string,string],   icon: 'medal' },
  { name: 'Gold',        color: '#FFD700', gradient: ['#FFD700','#B8860B'] as [string,string],   icon: 'medal' },
  { name: 'Platinum',    color: '#00C9C8', gradient: ['#00C9C8','#007BFF'] as [string,string],   icon: 'diamond' },
  { name: 'Diamond',     color: '#B9F2FF', gradient: ['#B9F2FF','#00BFFF'] as [string,string],  icon: 'diamond' },
  { name: 'Master',      color: '#9B59B6', gradient: ['#9B59B6','#6C3483'] as [string,string],   icon: 'crown' },
  { name: 'Grandmaster', color: '#E91E63', gradient: ['#E91E63','#880E4F'] as [string,string],   icon: 'crown' },
  { name: 'Elite',       color: '#FF5722', gradient: ['#FF5722','#BF360C'] as [string,string],   icon: 'flame' },
  { name: 'Champion',    color: '#E00000', gradient: ['#E00000','#7F0000'] as [string,string],   icon: 'flame' },
  { name: 'Legend',      color: '#FFD700', gradient: ['#FF9900','#E00000'] as [string,string],   icon: 'star' },
];

function getTier(name: string) {
  return TIERS.find(t => t.name === name) ?? TIERS[1];
}

// ── Avatar placeholder ────────────────────────────────────────────────────────
function Avatar({ uri, size, border }: { uri?: string; size: number; border: string }) {
  const { colors } = useTheme();
  const [err, setErr] = useState(false);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: border, overflow: 'hidden', backgroundColor: colors.inputBg }}>
      {uri && !err ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} onError={() => setErr(true)} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="person" size={size * 0.5} color={border} />
        </View>
      )}
    </View>
  );
}

// ── Podium position card (top-3) ──────────────────────────────────────────────
function PodiumCard({ item, position, heightFactor }: { item: any; position: number; heightFactor: number }) {
  const { colors } = useTheme();
  const tier = getTier(item.league_tier);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const medalColors: Record<number, string[]> = {
    1: ['#FFD700', '#FFA500'],
    2: ['#C0C0C0', '#808080'],
    3: ['#CD7F32', '#8B4513'],
  };
  const podiumH = 90 * heightFactor;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, delay: position * 120, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, []);

  return (
    <Animated.View style={[styles.podiumCard, { transform: [{ scale: scaleAnim }] }]}>
      {/* Rank crown */}
      {position === 1 && (
        <Text style={styles.crownEmoji}>👑</Text>
      )}

      {/* Avatar */}
      <Avatar uri={item.profile_pic_url} size={position === 1 ? 66 : 54} border={tier.color} />

      {/* XP glow badge */}
      <LinearGradient colors={tier.gradient} style={styles.podiumXpBadge}>
        <Text style={styles.podiumXpText}>{item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp} XP</Text>
      </LinearGradient>

      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
        {item.full_name?.split(' ')[0] ?? 'User'}
      </Text>
      <Text style={[styles.podiumTier, { color: tier.color }]}>{item.league_tier}</Text>

      {/* Podium platform */}
      <LinearGradient
        colors={medalColors[position] as [string, string]}
        style={[styles.podiumPlatform, { height: podiumH }]}
      >
        <Text style={styles.podiumRankNum}>#{position}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Single leaderboard row ────────────────────────────────────────────────────
function LeaderRow({ item, isMe, index }: { item: any; isMe: boolean; index: number }) {
  const { colors, isDark } = useTheme();
  const tier = getTier(item.league_tier);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, delay: index * 40, duration: 280, useNativeDriver: true }).start();
  }, []);

  const rank = Number(item.global_rank);
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : undefined;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <LinearGradient
        colors={isMe ? [isDark ? 'rgba(224,0,0,0.18)' : 'rgba(224,0,0,0.08)', isDark ? 'rgba(224,0,0,0.06)' : 'rgba(224,0,0,0.02)'] : ['transparent', 'transparent']}
        style={[styles.leaderRow, isMe && { borderWidth: 1, borderColor: isDark ? 'rgba(224,0,0,0.35)' : 'rgba(224,0,0,0.2)' }]}
      >
        {/* Rank */}
        <View style={styles.rankCol}>
          {rankColor ? (
            <LinearGradient colors={[rankColor, rankColor + '88']} style={styles.rankMedal}>
              <Text style={styles.rankMedalNum}>{rank}</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.rankNum, { color: isMe ? colors.primary : colors.textMuted }]}>#{rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <Avatar uri={item.profile_pic_url} size={44} border={isMe ? colors.primary : tier.color} />

        {/* Info */}
        <View style={styles.leaderInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.leaderName, { color: isMe ? colors.primary : colors.text }]} numberOfLines={1}>
              {item.full_name ?? 'User'} {isMe ? '(You)' : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LinearGradient colors={tier.gradient} style={styles.tierPillSmall}>
              <Text style={styles.tierPillText}>{item.league_tier}</Text>
            </LinearGradient>
            {item.current_streak > 0 && (
              <View style={[styles.streakPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.streakPillText, { color: colors.text }]}>🔥 {item.current_streak}</Text>
              </View>
            )}
          </View>
        </View>

        {/* XP */}
        <Text style={[styles.leaderXP, { color: tier.color }]}>
          {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}
          {'\n'}<Text style={[styles.leaderXPLabel, { color: colors.textMuted }]}>XP</Text>
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState('All');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [top3, setTop3] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setMyId(JSON.parse(userData).id);

      const headers = { Authorization: `Bearer ${token}` };

      const [topRes, boardRes, meRes] = await Promise.all([
        axios.get(`${API_URL}/leaderboard/top`, { headers }),
        axios.get(`${API_URL}/leaderboard`, { params: { tier: tab, limit: 50 }, headers }),
        axios.get(`${API_URL}/leaderboard/me`, { headers }),
      ]);

      setTop3(topRes.data.slice(0, 3));
      setLeaders(boardRes.data.data ?? []);
      setMe(meRes.data);

      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const myTier = me ? getTier(me.league_tier ?? 'Bronze') : TIERS[1];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Dark gradient BG */}
      {isDark && <LinearGradient colors={['#0A0A0A', '#111', '#1A0000']} style={StyleSheet.absoluteFill} />}
      {!isDark && <LinearGradient colors={[colors.bg, colors.inputBg, colors.bg]} style={StyleSheet.absoluteFill} />}

      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={loading ? [] : leaders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* ── MY RANK HERO CARD ─────────────────────────────────────────── */}
              {me && (
                <Animated.View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(224,0,0,0.3)' : 'rgba(224,0,0,0.15)', opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                  <LinearGradient colors={isDark ? ['rgba(224,0,0,0.25)', 'rgba(0,0,0,0)'] : ['rgba(224,0,0,0.1)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.heroLeft}>
                    <Avatar uri={me.profile_pic_url} size={56} border={myTier.color} />
                    <View style={{ marginLeft: 14 }}>
                      <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{me.full_name ?? 'You'}</Text>
                      <LinearGradient colors={myTier.gradient} style={styles.heroTierBadge}>
                        <Text style={styles.heroTierText}>{me.league_tier}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                  <View style={styles.heroRight}>
                    <Text style={[styles.heroRank, { color: myTier.color }]}>#{me.global_rank}</Text>
                    <Text style={[styles.heroRankLabel, { color: colors.textMuted }]}>GLOBAL</Text>
                  </View>
                </Animated.View>
              )}

              {/* ── XP PROGRESS BAR ───────────────────────────────────────────── */}
              {me && (
                <View style={styles.xpBarWrap}>
                  <View style={styles.xpBarLabels}>
                    <Text style={[styles.xpBarCurrentTier, { color: colors.textMuted }]}>{me.league_tier}</Text>
                    <Text style={[styles.xpBarXP, { color: colors.text }]}>{me.xp?.toLocaleString()} XP</Text>
                    {me.next_tier && <Text style={[styles.xpBarNextTier, { color: colors.textMuted }]}>{me.next_tier.name}</Text>}
                  </View>
                  <View style={[styles.xpBarTrack, { backgroundColor: colors.inputBg }]}>
                    <LinearGradient
                      colors={myTier.gradient}
                      style={[styles.xpBarFill, { width: `${me.tier_progress ?? 0}%` }]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                  </View>
                  {me.xp_to_next != null && (
                    <Text style={[styles.xpToNext, { color: colors.textMuted }]}>{me.xp_to_next.toLocaleString()} XP to {me.next_tier?.name}</Text>
                  )}
                </View>
              )}

              {/* ── PODIUM (Top 3) ────────────────────────────────────────────── */}
              {top3.length >= 3 && tab === 'All' && (
                <View style={styles.podiumRow}>
                  <PodiumCard item={top3[1]} position={2} heightFactor={0.75} />
                  <PodiumCard item={top3[0]} position={1} heightFactor={1.0} />
                  <PodiumCard item={top3[2]} position={3} heightFactor={0.55} />
                </View>
              )}

              {/* ── TIER FILTER TABS ──────────────────────────────────────────── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tierTabsContent}
                style={styles.tierTabs}
              >
                {TIERS.map((t) => {
                  const active = tab === t.name;
                  return (
                    <TouchableOpacity key={t.name} onPress={() => setTab(t.name)} activeOpacity={0.75}>
                      {active ? (
                        <LinearGradient colors={t.gradient} style={styles.tierTabActive}>
                          <Text style={styles.tierTabTextActive}>{t.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.tierTabInactive, { borderColor: t.color + '55', backgroundColor: colors.inputBg }]}>
                          <Text style={[styles.tierTabText, { color: t.color }]}>{t.name}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Rankings List Header */}
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: colors.textMuted }]}>
                  {tab === 'All' ? '🌍 Global Rankings' : `${tab} League`}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading rankings…</Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.textDim} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No warriors in this tier yet</Text>
              </View>
            )
          }
          renderItem={({ item, index }) => <LeaderRow item={item} isMe={item.id === myId} index={index} />}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero (my rank)
  heroCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 22, borderWidth: 1,
    overflow: 'hidden',
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  heroName: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 4 },
  heroTierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  heroTierText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF' },
  heroRight: { alignItems: 'center' },
  heroRank: { fontFamily: FONTS.heading, fontSize: 36, lineHeight: 38 },
  heroRankLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 2 },

  // XP Progress
  xpBarWrap: { marginHorizontal: 16, marginBottom: 6 },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpBarCurrentTier: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  xpBarXP: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  xpBarNextTier: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  xpBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4, minWidth: 8 },
  xpToNext: { fontFamily: FONTS.body, fontSize: 10, marginTop: 3, textAlign: 'center' },

  // Podium
  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    marginHorizontal: 12, marginTop: 8, gap: 4,
  },
  podiumCard: { alignItems: 'center', flex: 1 },
  crownEmoji: { fontSize: 22, marginBottom: 2 },
  podiumXpBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    marginVertical: 4,
  },
  podiumXpText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF' },
  podiumName: { fontFamily: FONTS.bodyBold, fontSize: 12, marginTop: 4, maxWidth: 80, textAlign: 'center' },
  podiumTier: { fontFamily: FONTS.body, fontSize: 9, marginBottom: 4 },
  podiumPlatform: {
    width: '90%', borderTopLeftRadius: 8, borderTopRightRadius: 8,
    justifyContent: 'flex-start', alignItems: 'center', paddingTop: 8,
  },
  podiumRankNum: { fontFamily: FONTS.heading, fontSize: 26, color: '#000' },

  // Tier filter tabs
  tierTabs: { marginTop: 8 },
  tierTabsContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 6 },
  tierTabActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tierTabTextActive: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#FFF' },
  tierTabInactive: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1,
  },
  tierTabText: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  // Leader list
  listContent: { paddingHorizontal: 12, paddingBottom: 120 },
  listHeader: { marginBottom: 8, marginTop: 4 },
  listHeaderText: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },

  leaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 16, marginBottom: 6,
  },

  rankCol: { width: 38, alignItems: 'center' },
  rankNum: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  rankMedal: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  rankMedalNum: { fontFamily: FONTS.heading, fontSize: 16, color: '#000' },

  leaderInfo: { flex: 1 },
  leaderName: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  tierPillSmall: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tierPillText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: '#FFF' },
  streakPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  streakPillText: { fontFamily: FONTS.body, fontSize: 10 },

  leaderXP: { fontFamily: FONTS.heading, fontSize: 18, textAlign: 'center', lineHeight: 20 },
  leaderXPLabel: { fontFamily: FONTS.bodyBold, fontSize: 8 },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 40 },
  loadingText: { fontFamily: FONTS.body, fontSize: 14 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
});
