import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator,
  Dimensions, Animated, ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { P } from '../../constants/homeTheme';
import { LeaderboardSkeleton } from '../../components/ui/Skeleton';

const { width: W } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Tier config ───────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'All',         color: P.cta,     textDark: false, gradient: [P.cta, P.ctaDark] as [string,string],         mcIcon: 'earth'                 },
  { name: 'Bronze',      color: '#CD7F32', textDark: false, gradient: ['#CD7F32','#8B4513'] as [string,string],       mcIcon: 'shield'                },
  { name: 'Silver',      color: '#B0B8C1', textDark: true,  gradient: ['#C0C0C0','#808080'] as [string,string],       mcIcon: 'shield-half-full'      },
  { name: 'Gold',        color: '#F7CB16', textDark: true,  gradient: ['#FFD700','#B8860B'] as [string,string],       mcIcon: 'trophy'                },
  { name: 'Platinum',    color: '#00C9C8', textDark: false, gradient: ['#00C9C8','#007BFF'] as [string,string],       mcIcon: 'diamond-stone'         },
  { name: 'Diamond',     color: '#7DD4F8', textDark: true,  gradient: ['#B9F2FF','#00BFFF'] as [string,string],       mcIcon: 'diamond'               },
  { name: 'Master',      color: '#9B59B6', textDark: false, gradient: ['#9B59B6','#6C3483'] as [string,string],       mcIcon: 'crown'                 },
  { name: 'Grandmaster', color: '#E91E63', textDark: false, gradient: ['#E91E63','#880E4F'] as [string,string],       mcIcon: 'crown-outline'         },
  { name: 'Elite',       color: '#FF5722', textDark: false, gradient: ['#FF5722','#BF360C'] as [string,string],       mcIcon: 'sword-cross'           },
  { name: 'Champion',    color: '#E00000', textDark: false, gradient: ['#E00000','#7F0000'] as [string,string],       mcIcon: 'fire'                  },
  { name: 'Legend',      color: '#FF9900', textDark: true,  gradient: ['#FF9900','#E00000'] as [string,string],       mcIcon: 'star-four-points'      },
];

function getTier(name: string) {
  return TIERS.find(t => t.name === name) ?? TIERS[1];
}

// ── Tier Icon Badge ───────────────────────────────────────────────────────────
function TierBadge({ tierName, size = 16 }: { tierName: string; size?: number }) {
  const tier = getTier(tierName);
  return (
    <LinearGradient
      colors={tier.gradient}
      style={{
        width: size + 10, height: size + 10,
        borderRadius: (size + 10) / 2,
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <MaterialCommunityIcons name={tier.mcIcon as any} size={size} color={tier.textDark ? '#021518' : '#FFF'} />
    </LinearGradient>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ uri, size, border }: { uri?: string; size: number; border: string }) {
  const { colors } = useTheme();
  const [err, setErr] = useState(false);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2.5, borderColor: border,
      overflow: 'hidden', backgroundColor: colors.inputBg,
    }}>
      {uri && !err
        ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} onError={() => setErr(true)} />
        : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="person" size={size * 0.5} color={border} />
          </View>
      }
    </View>
  );
}

// ── Podium Card ───────────────────────────────────────────────────────────────
function PodiumCard({ item, position, heightFactor }: { item: any; position: number; heightFactor: number }) {
  const { colors } = useTheme();
  const tier = getTier(item.league_tier);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const podiumColors: Record<number, [string, string]> = {
    1: ['#F7CB16', '#D4A800'],
    2: ['#C8D6E5', '#8395A7'],
    3: ['#E67E22', '#A04000'],
  };
  const medalBorder = position === 1 ? '#F7CB16' : position === 2 ? '#B0B8C1' : '#CD7F32';
  const podiumH = 80 * heightFactor;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, delay: position * 150,
      useNativeDriver: true, tension: 55, friction: 7,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.podiumCard, { transform: [{ scale: scaleAnim }] }]}>
      {position === 1 && <Text style={styles.crownEmoji}>👑</Text>}

      {/* Medal badge behind avatar */}
      <View style={styles.podiumAvatarWrap}>
        <Avatar uri={item.profile_pic_url} size={position === 1 ? 66 : 54} border={medalBorder} />
        {/* Tier icon bottom-right of avatar */}
        <View style={styles.podiumTierBadge}>
          <TierBadge tierName={item.league_tier} size={10} />
        </View>
      </View>

      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
        {item.full_name?.split(' ')[0] ?? 'User'}
      </Text>
      <Text style={[styles.podiumXP, { color: tier.color }]}>
        {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp} XP
      </Text>

      <LinearGradient
        colors={podiumColors[position]}
        style={[styles.podiumPlatform, { height: podiumH }]}
      >
        <Text style={styles.podiumRankNum}>
          {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
        </Text>
        <Text style={styles.podiumRankLabel}>#{position}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Leader Row ────────────────────────────────────────────────────────────────
const getCardGradient = (tierName: string, rank: number): [string, string] => {
  if (rank === 1) return ['#9A7800', '#3A2000']; // Elegant Dark Golden Amber
  if (rank === 2) return ['#4E5E70', '#1C2836']; // Radiant Slate Platinum
  if (rank === 3) return ['#7E4815', '#2A1404']; // Copper Bronze
  
  switch (tierName) {
    case 'Bronze':      return ['#543620', '#201108']; // Rich Bronze
    case 'Silver':      return ['#3E4C5E', '#16202C']; // Steel Silver
    case 'Gold':        return ['#856006', '#2E1E00']; // Amber Gold
    case 'Platinum':    return ['#086F83', '#02242D']; // Teal Platinum
    case 'Diamond':     return ['#0D6191', '#031E33']; // Sapphire Diamond
    case 'Master':      return ['#6D28D9', '#2E0665']; // Purple Master
    case 'Grandmaster': return ['#B91C1C', '#450616']; // Crimson Grandmaster
    case 'Elite':       return ['#C2410C', '#431407']; // Sunset Orange
    case 'Champion':    return ['#991B1B', '#380202']; // Fiery Crimson
    case 'Legend':      return ['#D97706', '#4C0519']; // Blazing Amber-Red
    default:            return ['#1E293B', '#0F172A']; // Default dark metallic
  }
};

// ── Leader Row ────────────────────────────────────────────────────────────────
function LeaderRow({ item, isMe, index }: { item: any; isMe: boolean; index: number }) {
  const { colors } = useTheme();
  const tier = getTier(item.league_tier);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, delay: index * 35, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, delay: index * 35, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const rank = Number(item.global_rank);
  const isTop3 = rank <= 3;
  const medalColor = rank === 1 ? '#F7CB16' : rank === 2 ? '#B0B8C1' : '#CD7F32';
  const medalEmoji  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';

  const accentColor = isMe ? P.cta : tier.color;
  const cardGradient = getCardGradient(item.league_tier, rank);

  // Border & Glow settings
  const borderCol = isMe 
    ? '#FFFFFF' 
    : isTop3 
      ? medalColor + '90' 
      : accentColor + '30';
  const borderWidth = isMe ? 2 : 1;
  const shadowCol = isMe ? P.sun : isTop3 ? medalColor : accentColor;
  const shadowOpacity = isMe ? 0.65 : isTop3 ? 0.45 : 0.2;
  const shadowRadius = isMe ? 8 : isTop3 ? 6 : 4;
  const elevation = isMe ? 8 : isTop3 ? 6 : 3;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gameCard, {
            borderColor: borderCol,
            borderWidth: borderWidth,
            shadowColor: shadowCol,
            shadowOpacity: shadowOpacity,
            shadowRadius: shadowRadius,
            elevation: elevation,
          }]}
        >
          {/* Top subtle gloss line to make it look 3D and premium */}
          <View style={styles.cardGlossOverlay} />
          
          {/* ── LEFT: Rank Zone ── */}
          <View style={[styles.gameRankPlate, { 
            backgroundColor: isTop3 ? medalColor + '20' : 'rgba(0,0,0,0.25)',
            borderColor: isTop3 ? medalColor + '30' : 'rgba(255,255,255,0.06)'
          }]}>
            {isTop3 ? (
              <View style={styles.topRankBadge}>
                <Text style={styles.medalIconText}>{medalEmoji}</Text>
                <Text style={[styles.gameRankNum, { color: medalColor, fontSize: 13, marginTop: 1 }]}>#{rank}</Text>
              </View>
            ) : (
              <Text style={[styles.gameRankNum, { 
                color: '#FFFFFF',
                fontSize: rank >= 100 ? 12 : rank >= 10 ? 15 : 17,
                opacity: 0.9
              }]}>{rank}</Text>
            )}
          </View>

          {/* ── MIDDLE: Avatar ── */}
          <View style={styles.gameAvatarWrap}>
            <Avatar 
              uri={item.profile_pic_url} 
              size={44} 
              border={isTop3 ? medalColor : accentColor} 
            />
            {isMe && (
              <LinearGradient colors={[P.sun, '#FF8C00']} style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </LinearGradient>
            )}
          </View>

          {/* ── INFO ZONE ── */}
          <View style={styles.gameInfo}>
            <Text style={[styles.gameName, { color: '#FFFFFF' }]} numberOfLines={1}>
              {item.full_name ?? 'Athlete'}
            </Text>
            
            <View style={styles.gameSubInfoRow}>
              {/* Tier capsule */}
              <LinearGradient colors={tier.gradient} style={styles.gameTierBadge}>
                <MaterialCommunityIcons name={tier.mcIcon as any} size={9}
                  color={tier.textDark ? '#021518' : '#FFF'} />
                <Text style={[styles.gameTierText, { color: tier.textDark ? '#021518' : '#FFF' }]}>
                  {item.league_tier.toUpperCase()}
                </Text>
              </LinearGradient>
              
              {/* Streak if any */}
              {item.current_streak > 0 && (
                <View style={styles.gameStreakBadge}>
                  <Ionicons name="flame" size={11} color="#FF9F43" />
                  <Text style={styles.gameStreakText}>{item.current_streak}d streak</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── RIGHT: XP Capsule ── */}
          <View style={[styles.xpCapsule, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Ionicons name="flash" size={10} color={isTop3 ? medalColor : P.sun} />
            <Text style={[styles.gameXP, { color: isTop3 ? medalColor : '#FFFFFF' }]}>
              {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}
            </Text>
            <Text style={styles.gameXPLabel}>XP</Text>
          </View>

        </LinearGradient>
      </TouchableOpacity>
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

  if (loading) return <LeaderboardSkeleton />;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Background */}
      <LinearGradient
        colors={isDark ? ['#000000', '#000000'] : ['#EBF3FB', '#F5F9FC', '#EBF3FB']}
        style={StyleSheet.absoluteFill}
      />

      <FlatList
        data={leaders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── PAGE TITLE ── */}
            <View style={styles.pageHeader}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.text }]}>LEADERBOARD</Text>
                <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                  {tab === 'All' ? 'Global Rankings' : `${tab} League`}
                </Text>
              </View>
              <View style={[styles.pageTitleIcon, { backgroundColor: isDark ? 'rgba(247,203,22,0.12)' : 'rgba(247,203,22,0.15)' }]}>
                <MaterialCommunityIcons name="trophy" size={26} color={P.sun} />
              </View>
            </View>

            {/* ── MY RANK CARD ── */}
            {me && (
              <Animated.View style={[
                styles.heroCard,
                {
                  backgroundColor: isDark ? colors.card : '#FFF',
                  borderColor: isDark ? colors.border : 'rgba(37,150,190,0.2)',
                  opacity: headerAnim,
                  transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
                }
              ]}>
                <View style={[styles.heroAccent, { backgroundColor: myTier.color }]} />
                <View style={styles.heroLeft}>
                  <Avatar uri={me.profile_pic_url} size={52} border={myTier.color} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.heroLabel, { color: colors.textMuted }]}>YOUR RANK</Text>
                    <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{me.full_name ?? 'You'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <TierBadge tierName={me.league_tier} size={11} />
                      <Text style={[styles.heroTierName, { color: myTier.color }]}>{me.league_tier}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.heroRight}>
                  <Text style={[styles.heroRank, { color: myTier.color }]}>#{me.global_rank}</Text>
                  <Text style={[styles.heroRankLabel, { color: colors.textMuted }]}>GLOBAL</Text>
                  <Text style={[styles.heroXP, { color: colors.text }]}>{me.xp?.toLocaleString()} XP</Text>
                </View>
              </Animated.View>
            )}

            {/* ── XP PROGRESS ── */}
            {me && (
              <View style={styles.xpBarWrap}>
                <View style={styles.xpBarLabels}>
                  <Text style={[styles.xpBarTier, { color: myTier.color }]}>{me.league_tier}</Text>
                  {me.xp_to_next != null && (
                    <Text style={[styles.xpBarToNext, { color: colors.textMuted }]}>
                      {me.xp_to_next.toLocaleString()} XP to {me.next_tier?.name}
                    </Text>
                  )}
                  {me.next_tier && <Text style={[styles.xpBarTier, { color: colors.textMuted }]}>{me.next_tier.name}</Text>}
                </View>
                <View style={[styles.xpBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
                  <LinearGradient
                    colors={myTier.gradient}
                    style={[styles.xpBarFill, { width: `${me.tier_progress ?? 0}%` }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            )}

            {/* ── PODIUM ── */}
            {top3.length >= 3 && tab === 'All' && (
              <View style={styles.podiumWrap}>
                <View style={styles.podiumRow}>
                  <PodiumCard item={top3[1]} position={2} heightFactor={0.72} />
                  <PodiumCard item={top3[0]} position={1} heightFactor={1.0} />
                  <PodiumCard item={top3[2]} position={3} heightFactor={0.52} />
                </View>
              </View>
            )}

            {/* ── TIER FILTER CHIPS ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tierTabsContent}
              style={styles.tierTabs}
            >
              {TIERS.map((t) => {
                const active = tab === t.name;
                const textColor = t.textDark ? '#021518' : '#FFF';

                return (
                  <TouchableOpacity
                    key={t.name}
                    onPress={() => setTab(t.name)}
                    activeOpacity={0.75}
                    style={[
                      styles.tierChip,
                      {
                        backgroundColor: active ? t.color : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                        borderColor: active ? t.color : (isDark ? 'rgba(255,255,255,0.1)' : t.color + '55'),
                        opacity: active ? 1 : 0.7,
                      }
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={t.mcIcon as any}
                      size={13}
                      color={active ? textColor : t.color}
                    />
                    <Text style={[
                      styles.tierChipText,
                      { color: active ? textColor : (isDark ? colors.text : t.color) }
                    ]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── LIST HEADER ── */}
            <View style={styles.listHeaderRow}>
              <Text style={[styles.listHeaderRank, { color: colors.textMuted }]}>RANK</Text>
              <Text style={[styles.listHeaderPlayer, { color: colors.textMuted }]}>ATHLETE</Text>
              <Text style={[styles.listHeaderXP, { color: colors.textMuted }]}>XP</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No warriors in this tier yet</Text>
          </View>
        }
        renderItem={({ item, index }) => <LeaderRow item={item} isMe={item.id === myId} index={index} />}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingBottom: 130 },

  // Page Header
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 2, paddingTop: 16, paddingBottom: 12,
  },
  pageTitle: { fontFamily: FONTS.heading, fontSize: 28, letterSpacing: 1.5 },
  pageSubtitle: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  pageTitleIcon: {
    width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  // Hero Card
  heroCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 20, borderWidth: 1,
    marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16,
    overflow: 'hidden',
  },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  heroLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  heroName: { fontFamily: FONTS.heading, fontSize: 17 },
  heroTierName: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  heroRight: { alignItems: 'center', minWidth: 64 },
  heroRank: { fontFamily: FONTS.heading, fontSize: 34, lineHeight: 36 },
  heroRankLabel: { fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 2 },
  heroXP: { fontFamily: FONTS.bodyBold, fontSize: 11, marginTop: 2 },

  // XP Bar
  xpBarWrap: { marginBottom: 10 },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  xpBarTier: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  xpBarToNext: { fontFamily: FONTS.body, fontSize: 10 },
  xpBarTrack: { height: 10, borderRadius: 6, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 6, minWidth: 8 },

  // Podium
  podiumWrap: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 12,
  },
  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingTop: 12, gap: 4,
  },
  podiumCard: { alignItems: 'center', flex: 1 },
  crownEmoji: { fontSize: 24, marginBottom: 4, transform: [{ rotate: '-8deg' }] },
  podiumAvatarWrap: { position: 'relative', marginBottom: 6 },
  podiumTierBadge: {
    position: 'absolute', bottom: -2, right: -2,
  },
  podiumName: { fontFamily: FONTS.bodyBold, fontSize: 11, maxWidth: 78, textAlign: 'center' },
  podiumXP: { fontFamily: FONTS.bodyBold, fontSize: 10, marginBottom: 4 },
  podiumPlatform: {
    width: '92%', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 10, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
  podiumRankNum: { fontSize: 20 },
  podiumRankLabel: {
    fontFamily: FONTS.heading, fontSize: 18,
    color: 'rgba(0,0,0,0.45)',
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  // Tier Filter Chips
  tierTabs: { marginBottom: 10 },
  tierTabsContent: { gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 14, borderWidth: 1.5,
  },
  tierChipText: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  // List Header Row
  listHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 6, marginBottom: 4,
  },
  listHeaderRank: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 46, textAlign: 'center' },
  listHeaderPlayer: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, flex: 1, paddingLeft: 52 },
  listHeaderXP: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 48, textAlign: 'center' },

  // ── Game Cards ─────────────────────────────────────────────────────────────
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 68,
    shadowOffset: { width: 0, height: 4 },
  },
  cardGlossOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  gameRankPlate: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
  },
  topRankBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalIconText: {
    fontSize: 16,
    lineHeight: 18,
    marginBottom: -2,
  },
  gameRankNum: {
    fontFamily: FONTS.heading,
    letterSpacing: -0.5,
  },
  gameAvatarWrap: {
    marginHorizontal: 12,
    position: 'relative',
  },
  youBadge: {
    position: 'absolute',
    bottom: -3, right: -6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  youBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7.5,
    color: '#FFF',
    letterSpacing: 0.8,
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gameName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  gameSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  gameTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  gameTierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  gameStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 67, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2.5,
  },
  gameStreakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8.5,
    color: '#FF9F43',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  xpCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gameXP: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  gameXPLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.45)',
    marginLeft: 1,
  },

  // States
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontFamily: FONTS.body, fontSize: 14 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
});
