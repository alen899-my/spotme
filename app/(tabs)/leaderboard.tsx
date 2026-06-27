import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ImageBackground, ActivityIndicator,
  Dimensions, Animated, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import OptimizedImage from '../../components/ui/OptimizedImage';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { P } from '../../constants/homeTheme';
import { LeaderboardSkeleton } from '../../components/ui/Skeleton';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import CheerCard from '../../components/modals/CheerCard';

const { width: W } = Dimensions.get('window');
const TOP_COUNT    = 10;     // always-visible top rows
const NEARBY_COUNT = 3;      // rows above & below user
const PAGE_SIZE    = 20;
const POLL_MS      = 60_000;
const SHOW_MORE_STEP = 10;

// ── Tier config ───────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'All',         color: P.cta,     textDark: false, gradient: [P.cta, P.ctaDark] as [string,string],         mcIcon: 'earth'            },
  { name: 'Bronze',      color: '#CD7F32', textDark: false, gradient: ['#CD7F32','#8B4513'] as [string,string],       mcIcon: 'shield'           },
  { name: 'Silver',      color: '#B0B8C1', textDark: true,  gradient: ['#C0C0C0','#808080'] as [string,string],       mcIcon: 'shield-half-full' },
  { name: 'Gold',        color: '#F7CB16', textDark: true,  gradient: ['#FFD700','#B8860B'] as [string,string],       mcIcon: 'trophy'           },
  { name: 'Platinum',    color: '#00C9C8', textDark: false, gradient: ['#00C9C8','#007BFF'] as [string,string],       mcIcon: 'diamond-stone'    },
  { name: 'Diamond',     color: '#7DD4F8', textDark: true,  gradient: ['#B9F2FF','#00BFFF'] as [string,string],       mcIcon: 'diamond'          },
  { name: 'Master',      color: '#9B59B6', textDark: false, gradient: ['#9B59B6','#6C3483'] as [string,string],       mcIcon: 'crown'            },
  { name: 'Grandmaster', color: '#E91E63', textDark: false, gradient: ['#E91E63','#880E4F'] as [string,string],       mcIcon: 'crown-outline'    },
  { name: 'Elite',       color: '#FF5722', textDark: false, gradient: ['#FF5722','#BF360C'] as [string,string],       mcIcon: 'sword-cross'      },
  { name: 'Champion',    color: '#E00000', textDark: false, gradient: ['#E00000','#7F0000'] as [string,string],       mcIcon: 'fire'             },
  { name: 'Legend',      color: '#FF9900', textDark: true,  gradient: ['#FF9900','#E00000'] as [string,string],       mcIcon: 'star-four-points' },
];

function getTier(name: string) {
  return TIERS.find(t => t.name === name) ?? TIERS[1];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deduplicate by id — first-write wins (fresh/poll rows come first so they take priority) */
function dedupe(arr: any[]): any[] {
  const seen = new Map<number, any>();
  for (const item of arr) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return Array.from(seen.values());
}

/**
 * Merge fresh top-page rows into the existing list, preserving page 2+ rows.
 * We identify "page 2+" rows as those whose id was NOT in the previous first page.
 * This avoids the fragile index-based check that caused rank positions to flicker.
 */
function mergePollResults(existing: any[], fresh: any[]): any[] {
  const freshIds = new Set(fresh.map(r => r.id));
  // Tail = rows that are not present in the fresh first page (i.e. page 2+)
  const tail = existing.filter(r => !freshIds.has(r.id));
  // fresh first so dedupe keeps fresh data over any stale tail duplicate
  return dedupe([...fresh, ...tail]);
}

// ── Tier Badge ────────────────────────────────────────────────────────────────
function TierBadge({ tierName, size = 16 }: { tierName: string; size?: number }) {
  const tier = getTier(tierName);
  return (
    <LinearGradient
      colors={tier.gradient}
      style={{ width: size + 10, height: size + 10, borderRadius: (size + 10) / 2, justifyContent: 'center', alignItems: 'center' }}
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
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: border, overflow: 'hidden', backgroundColor: colors.inputBg }}>
      {uri && !err
        ? <OptimizedImage uri={uri} style={{ width: '100%', height: '100%' }} onError={() => setErr(true)} />
        : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="person" size={size * 0.5} color={border} />
          </View>
      }
    </View>
  );
}

// ── SVG Crown ─────────────────────────────────────────────────────────────────
function CrownSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Path d="M 20,130 L 20,80 L 55,100 L 100,55 L 145,100 L 180,80 L 180,130 Z" fill="#F7CB16" stroke="#B8960E" strokeWidth={3} />
      <Circle cx="100" cy="55" r="14" fill="#D4A800" />
      <Circle cx="100" cy="55" r="7" fill="#FFF" opacity={0.7} />
      <Circle cx="100" cy="55" r="3" fill="#B8960E" />
      <Circle cx="55" cy="100" r="5" fill="#FFF" opacity={0.3} />
      <Circle cx="145" cy="100" r="5" fill="#FFF" opacity={0.3} />
      <Path d="M 20,130 L 100,115 L 180,130" stroke="#B8960E" strokeWidth={2} fill="none" opacity={0.5} />
    </Svg>
  );
}

// ── Medal SVG ─────────────────────────────────────────────────────────────────
function MedalSvg({ position, size = 34 }: { position: number; size?: number }) {
  const c: Record<number, string>  = { 1: '#F7CB16', 2: '#C8D6E5', 3: '#E67E22' };
  const ic: Record<number, string> = { 1: '#D4A800', 2: '#8395A7', 3: '#A04000' };
  const rc: Record<number, string> = { 1: '#B8960E', 2: '#6B7A85', 3: '#8A3E00' };
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 34 38">
      <Path d="M 6,20 L 17,28 L 28,20 V 34 L 17,38 L 6,34 Z" fill={rc[position]} opacity={0.6} />
      <Circle cx="17" cy="15" r="13" fill={c[position]} />
      <Circle cx="17" cy="15" r="10" fill="none" stroke="#FFF" strokeWidth={1.2} opacity={0.4} />
      <Circle cx="17" cy="15" r="5" fill="#FFF" opacity={0.85} />
      <Circle cx="17" cy="15" r="2" fill={ic[position]} />
    </Svg>
  );
}

// ── Podium Block ──────────────────────────────────────────────────────────────
function PodiumBlockView({ position, heightFactor }: { position: number; heightFactor: number }) {
  const blockH = Math.max(80 * heightFactor, 50);
  const cols: Record<number, { main: string; dark: string; light: string }> = {
    1: { main: '#F7CB16', dark: '#B8960E', light: '#FFF8DC' },
    2: { main: '#C8D6E5', dark: '#9EA8B0', light: '#F0F4F8' },
    3: { main: '#E67E22', dark: '#B85E10', light: '#FDEBD0' },
  };
  const c = cols[position];
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: '86%', height: blockH, backgroundColor: c.dark, borderRadius: 14, position: 'absolute', bottom: -5, opacity: 0.8 }} />
      <View style={{ width: '86%', height: blockH, backgroundColor: c.main, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: blockH * 0.35, backgroundColor: c.light, opacity: 0.2, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
        <MedalSvg position={position} size={30} />
        <Text style={{ fontFamily: FONTS.heading, fontSize: 15, color: 'rgba(0,0,0,0.4)', marginTop: 3 }}>#{position}</Text>
      </View>
    </View>
  );
}

// ── Podium Card ───────────────────────────────────────────────────────────────
function PodiumCard({ item, position, heightFactor }: { item: any; position: number; heightFactor: number }) {
  const { colors } = useTheme();
  const tier = getTier(item.league_tier);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const medalBorder = position === 1 ? '#F7CB16' : position === 2 ? '#B0B8C1' : '#CD7F32';

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, delay: position * 150, useNativeDriver: true, tension: 55, friction: 7 }).start();
  }, []);

  return (
    <Animated.View style={[styles.podiumCard, { transform: [{ scale: scaleAnim }] }]}>
      {position === 1 && <View style={styles.crownWrap}><CrownSvg size={36} /></View>}
      <View style={styles.podiumAvatarWrap}>
        <View style={[styles.podiumAvatarGlow, { backgroundColor: medalBorder + '30' }]} />
        <Avatar uri={item.profile_pic_url} size={position === 1 ? 64 : 52} border={medalBorder} />
        <View style={styles.podiumTierBadge}><TierBadge tierName={item.league_tier} size={10} /></View>
      </View>
      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{item.full_name?.split(' ')[0] ?? 'User'}</Text>
      <Text style={[styles.podiumXP, { color: tier.color }]}>{item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp} XP</Text>
      <View style={styles.podiumBlock}><PodiumBlockView position={position} heightFactor={heightFactor} /></View>
    </Animated.View>
  );
}

// ── Rank Change ───────────────────────────────────────────────────────────────
function RankChange({ change }: { change: number }) {
  if (change === 0) {
    return <View style={styles.changeBadge}><Text style={[styles.changeText, { color: '#888' }]}>—</Text></View>;
  }
  const isUp = change > 0;
  return (
    <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
      <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={11} color={isUp ? '#10B981' : '#EF4444'} />
      <Text style={[styles.changeText, { color: isUp ? '#10B981' : '#EF4444' }]}>{Math.abs(change)}</Text>
    </View>
  );
}

// ── Leader Row ────────────────────────────────────────────────────────────────
function LeaderRow({
  item, isMe, index, liveChange, highlight,
}: {
  item: any; isMe: boolean; index: number; liveChange: number; highlight?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const tier = getTier(item.league_tier);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevChange = useRef(liveChange);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, delay: Math.min(index, 10) * 30, duration: 240, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, delay: Math.min(index, 10) * 30, duration: 240, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (liveChange !== prevChange.current) {
      prevChange.current = liveChange;
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
    }
  }, [liveChange]);

  const rank   = Number(item.global_rank);
  const isTop3 = rank <= 3;
  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';

  const flashBg = flashAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      'rgba(0,0,0,0)',
      liveChange > 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
    ],
  });

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Animated.View style={{ backgroundColor: flashBg }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/profile/${item.id}`)}
          style={[
            styles.leaderRowCard,
            { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
            isMe && { backgroundColor: isDark ? `${P.cta}18` : `${P.cta}0F` },
            highlight && !isMe && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
          ]}
        >
          {isMe && <View style={[styles.lrYouAccent, { backgroundColor: P.cta }]} />}

          <View style={styles.lrRank}>
            {isTop3
              ? <Text style={styles.lrMedal}>{medalEmoji}</Text>
              : <Text style={[styles.lrRankNum, { color: colors.textMuted }]}>{rank}</Text>
            }
          </View>

          <Avatar uri={item.profile_pic_url} size={40} border={tier.color} />

          <View style={styles.lrInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.lrName, { color: colors.text }]} numberOfLines={1}>{item.full_name ?? 'Athlete'}</Text>
              {isMe && <Text style={[styles.lrYouTag, { color: P.cta }]}>YOU</Text>}
            </View>
            <View style={styles.lrTierRow}>
              <LinearGradient colors={tier.gradient} style={styles.lrTierBadge}>
                <MaterialCommunityIcons name={tier.mcIcon as any} size={8} color={tier.textDark ? '#021518' : '#FFF'} />
                <Text style={[styles.lrTierText, { color: tier.textDark ? '#021518' : '#FFF' }]}>{item.league_tier.toUpperCase()}</Text>
              </LinearGradient>
              {item.current_streak > 0 && (
                <View style={styles.lrStreak}>
                  <Ionicons name="flame" size={10} color="#FF9F43" />
                  <Text style={styles.lrStreakText}>{item.current_streak}</Text>
                </View>
              )}
            </View>
          </View>

          <RankChange change={liveChange} />

          <View style={styles.lrXP}>
            <Text style={[styles.lrXPText, { color: colors.text }]}>{item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}</Text>
            <Text style={[styles.lrXPLabel, { color: colors.textMuted }]}>XP</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ── Gap Separator ─────────────────────────────────────────────────────────────
function GapSeparator({ rankStart, rankEnd, isDark }: { rankStart: number; rankEnd: number; isDark: boolean }) {
  return (
    <View style={styles.gapWrap}>
      <View style={[styles.gapLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
      <View style={[styles.gapPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <MaterialCommunityIcons name="dots-vertical" size={12} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} />
        <Text style={[styles.gapText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)' }]}>
          {rankStart === rankEnd ? rankStart : `${rankStart} – ${rankEnd}`}
        </Text>
        <MaterialCommunityIcons name="dots-vertical" size={12} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} />
      </View>
      <View style={[styles.gapLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
    </View>
  );
}

// ── Show More Button ──────────────────────────────────────────────────────────
function ShowMoreButton({ onPress, loading, isDark }: { onPress: () => void; loading: boolean; isDark: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={loading}
      style={[styles.showMoreBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
    >
      {loading
        ? <ActivityIndicator size="small" color={P.cta} />
        : <>
            <MaterialCommunityIcons name="chevron-double-down" size={16} color={P.cta} />
            <Text style={[styles.showMoreText, { color: P.cta }]}>Show Next 10</Text>
          </>
      }
    </TouchableOpacity>
  );
}

// ── Row Skeleton ──────────────────────────────────────────────────────────────
function LeaderRowSkeleton() {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const bg = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)';
  const Box = ({ w, h, r = 6 }: { w: number; h: number; r?: number }) => (
    <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: bg, opacity }} />
  );
  return (
    <View style={[styles.leaderRowCard, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
      <View style={styles.lrRank}><Box w={22} h={14} r={5} /></View>
      <Box w={40} h={40} r={20} />
      <View style={[styles.lrInfo, { gap: 7 }]}>
        <Box w={115} h={13} />
        <Box w={58} h={10} r={5} />
      </View>
      <Box w={34} h={22} r={8} />
      <View style={[styles.lrXP, { gap: 3 }]}>
        <Box w={36} h={13} r={5} />
        <Box w={16} h={8} r={4} />
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [tab, setTab]       = useState('All');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [top3, setTop3]     = useState<any[]>([]);
  const [myId, setMyId]     = useState<number | null>(null);

  const [loading, setLoading]         = useState(true);
  const [filtering, setFiltering]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [total, setTotal]   = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ── Nearby section state ────────────────────────────────────────────────────
  const [myRank, setMyRank]           = useState<number | null>(null);
  const [nearbyAbove, setNearbyAbove] = useState<any[]>([]);
  const [nearbyMe, setNearbyMe]       = useState<any | null>(null);
  const [nearbyBelow, setNearbyBelow] = useState<any[]>([]);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const [showMoreOffset, setShowMoreOffset] = useState(0); // extra rows to skip below user
  const [extraBelow, setExtraBelow]   = useState<any[]>([]); // accumulated "show more" rows
  const [loadingShowMore, setLoadingShowMore] = useState(false);

  // ── Live rank tracking ──────────────────────────────────────────────────────
  const baselineRanks = useRef<Map<number, number>>(new Map());
  const [liveChanges, setLiveChanges] = useState<Map<number, number>>(new Map());
  const pollTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollRunning = useRef(false);
  const lastFetchTime = useRef(0);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState('');
  const tabCache = useRef<Record<string, { rows: any[]; total: number; ts: number }>>({});

  // Update "last updated" label every 30s
  useEffect(() => {
    const tick = () => {
      if (!lastFetchTime.current) { setLastUpdatedLabel(''); return; }
      const sec = Math.floor((Date.now() - lastFetchTime.current) / 1000);
      if (sec < 5) setLastUpdatedLabel('Updated just now');
      else if (sec < 60) setLastUpdatedLabel(`Updated ${sec}s ago`);
      else setLastUpdatedLabel(`Updated ${Math.floor(sec / 60)}m ago`);
    };
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]         = useState(false);
  const searchTimer = useRef<any>(null);

  // ── Tier Promotion Overlay ──────────────────────────────────────────────────
  const [showTierPromo, setShowTierPromo] = useState(false);
  const [promoTierName, setPromoTierName] = useState('Diamond');
  const [promoXp, setPromoXp] = useState(0);
  const [promoXpNeeded, setPromoXpNeeded] = useState(0);

  const openTierPromo = useCallback(() => {
    const name = nearbyMe?.league_tier;
    if (!name || !nearbyMe) return;

    const tierIdx = TIERS.findIndex(t => t.name === name);
    if (tierIdx < 0 || tierIdx >= TIERS.length - 1) return;

    const tierMins = [0, 2000, 6000, 12000, 24000, 40000, 60000, 80000, 120000, 200000];
    const userXp = nearbyMe.xp ?? 0;
    const nextMin = tierMins[tierIdx] ?? 200000;

    setPromoXp(userXp);
    setPromoXpNeeded(nextMin);
    setPromoTierName(name);
    setShowTierPromo(true);
  }, [nearbyMe]);

  const closeTierPromo = useCallback(() => {
    setShowTierPromo(false);
  }, []);

  // ── Auto-show promotion when user progresses to next tier ──
  useEffect(() => {
    if (!nearbyMe?.league_tier) return;
    AsyncStorage.getItem('lastSeenTier').then(lastSeen => {
      if (!lastSeen) {
        AsyncStorage.setItem('lastSeenTier', nearbyMe.league_tier);
        return;
      }
      const newIdx = TIERS.findIndex(t => t.name === nearbyMe.league_tier);
      const oldIdx = TIERS.findIndex(t => t.name === lastSeen);
      if (newIdx > oldIdx) openTierPromo();
    });
  }, [nearbyMe]);

  // ── Save viewed tier when modal dismisses ──
  useEffect(() => {
    if (showTierPromo || !nearbyMe?.league_tier) return;
    AsyncStorage.setItem('lastSeenTier', nearbyMe.league_tier);
  }, [showTierPromo, nearbyMe?.league_tier]);

  const isFetching  = useRef(false);
  const currentTab  = useRef('All');

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const snapshotBaseline = useCallback((rows: any[]) => {
    const map = new Map<number, number>();
    for (const r of rows) map.set(r.id, Number(r.global_rank));
    baselineRanks.current = map;
    setLiveChanges(new Map());
  }, []);

  const applyPollDelta = useCallback((freshRows: any[]) => {
    const deltas = new Map<number, number>();
    for (const r of freshRows) {
      const base = baselineRanks.current.get(r.id);
      if (base !== undefined) {
        const delta = base - Number(r.global_rank);
        if (delta !== 0) deltas.set(r.id, delta);
      }
    }
    setLiveChanges(deltas);
  }, []);

  // ── Fetch nearby section ────────────────────────────────────────────────────
  const fetchNearby = useCallback(async (extraOffset = 0, append = false) => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/leaderboard/nearby`, {
        params: { count: NEARBY_COUNT, extraOffset },
        headers: { Authorization: `Bearer ${token}` },
      });
      const { myRank: rank, above, me, below, hasMoreBelow: hasMore } = res.data;
      setMyRank(rank);
      setNearbyAbove(above);
      setNearbyMe(me);
      setHasMoreBelow(hasMore);
      if (append) {
        setExtraBelow(prev => dedupe([...prev, ...below]));
      } else {
        setNearbyBelow(below);
        setExtraBelow([]);
      }
    } catch (err) {
      console.error('fetchNearby error:', err);
    }
  }, []);

  // ── Core page fetch ─────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (tier: string, pageOffset: number, isFirstPage: boolean) => {
    if (isFetching.current) return;
    isFetching.current = true;

    if (isFirstPage) setFiltering(true);
    else setLoadingMore(true);

    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/leaderboard`, {
        params: { tier, limit: PAGE_SIZE, offset: pageOffset },
        headers,
      });
      const rows: any[]       = res.data.data ?? [];
      const serverTotal: number = res.data.total ?? 0;

      setTotal(serverTotal);
      setLeaders(prev => {
        const next = isFirstPage ? rows : dedupe([...prev, ...rows]);
        return next;
      });
      setOffset(pageOffset + rows.length);
      setHasMore(pageOffset + rows.length < serverTotal);

      if (isFirstPage) {
        tabCache.current[tier] = { rows, total: serverTotal, ts: Date.now() };
        snapshotBaseline(rows);
      }
    } catch (err) {
      console.error('Leaderboard page fetch error:', err);
    } finally {
      setFiltering(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  }, [snapshotBaseline]);

  // ── Live poll — only fetches page 1 silently ──────────────────────────────
  const pollTopPage = useCallback(async () => {
    if (isPollRunning.current || isFetching.current) return;
    // Skip if we fetched recently — backend cache handles freshness
    if (Date.now() - lastFetchTime.current < 30_000) return;
    isPollRunning.current = true;
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/leaderboard`, {
        params: { tier: currentTab.current, limit: PAGE_SIZE, offset: 0 },
        headers,
      });
      const freshRows: any[] = res.data.data ?? [];
      lastFetchTime.current = Date.now();
      setLeaders(prev => dedupe(mergePollResults(prev, freshRows)));
      setTotal(res.data.total ?? 0);
      applyPollDelta(freshRows);
    } catch {
      // Silent
    } finally {
      isPollRunning.current = false;
    }
  }, [applyPollDelta]);

  // ── Initial load ────────────────────────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setMyId(JSON.parse(userData).id);
      const headers = { Authorization: `Bearer ${token}` };

      const [topRes, boardRes] = await Promise.all([
        axios.get(`${API_URL}/leaderboard/top`, { headers }),
        axios.get(`${API_URL}/leaderboard`, { params: { tier: 'All', limit: PAGE_SIZE, offset: 0 }, headers }),
      ]);

      const rows: any[]       = boardRes.data.data ?? [];
      const serverTotal: number = boardRes.data.total ?? 0;

      setTop3(topRes.data.slice(0, 3));
      setLeaders(rows);
      setTab('All');
      currentTab.current = 'All';
      setTotal(serverTotal);
      setOffset(rows.length);
      setHasMore(rows.length < serverTotal);
      snapshotBaseline(rows);

      // fetch nearby section in parallel
      await fetchNearby(0, false);
    } catch (err) {
      console.error('Leaderboard init error:', err);
    } finally {
      lastFetchTime.current = Date.now();
      setLoading(false);
    }
  }, [snapshotBaseline, fetchNearby]);

  // ── Focus: start/stop polling ───────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      isFetching.current = false;
      isPollRunning.current = false;
      fetchInitial();
      pollTimer.current = setInterval(pollTopPage, POLL_MS);
      return () => {
        if (pollTimer.current) clearInterval(pollTimer.current);
      };
    }, [fetchInitial, pollTopPage])
  );

  // ── Tab change callback ──────────────────────────────────────────────────────
  const changeTab = useCallback((newTab: string) => {
    setFiltering(true);
    setTab(newTab);
    currentTab.current = newTab;
    setLiveChanges(new Map());
    baselineRanks.current = new Map();
    isFetching.current = false;

    const cached = tabCache.current[newTab];
    if (cached && Date.now() - cached.ts < 60_000) {
      // Restore from cache immediately
      setLeaders(cached.rows);
      setTotal(cached.total);
      setOffset(cached.rows.length);
      setHasMore(cached.rows.length < cached.total);
      setFiltering(false);
      // Refresh in background
      fetchPage(newTab, 0, true);
    } else {
      setLeaders([]);
      setOffset(0);
      setHasMore(true);
      setTotal(0);
      fetchPage(newTab, 0, true);
    }
  }, [fetchPage]);

  // ── Infinite scroll ─────────────────────────────────────────────────────────
  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore || filtering || isFetching.current) return;
    fetchPage(tab, offset, false);
  }, [hasMore, loadingMore, filtering, tab, offset, fetchPage]);

  // ── Show More (nearby below section) ───────────────────────────────────────
  const handleShowMore = useCallback(async () => {
    setLoadingShowMore(true);
    const nextOffset = showMoreOffset + SHOW_MORE_STEP;
    setShowMoreOffset(nextOffset);
    await fetchNearby(nextOffset, true);
    setLoadingShowMore(false);
  }, [showMoreOffset, fetchNearby]);

  // ── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/leaderboard/search`, {
          params: { q: searchQuery.trim() },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(res.data);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (loading) return <LeaderboardSkeleton />;

  const isSearching = searchQuery.trim() !== '';

  // ── Determine if we need nearby section ────────────────────────────────────
  // Get the rank of the last loaded row in the main list
  const lastTopRank = leaders.length > 0 ? Number(leaders[leaders.length - 1].global_rank) : 0;

  // Show nearby only when: not searching, in "All" tab, user is beyond current loaded ranks
  const showNearbySec = !isSearching && tab === 'All' && myRank !== null && myRank > lastTopRank;

  // Filter nearby rows to avoid duplicates with the loaded leaders list
  const filteredNearbyAbove = nearbyAbove.filter(item => item.global_rank > lastTopRank);

  const gapStart = lastTopRank + 1;
  const gapEnd = filteredNearbyAbove.length > 0
    ? filteredNearbyAbove[0].global_rank - 1
    : (nearbyMe ? nearbyMe.global_rank - 1 : gapStart);

  // List data: always show the full loaded list (leaders) to support normal scroll and pagination
  const listData = isSearching ? [] : (filtering ? [] : leaders);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={isDark ? ['#000000', '#000000'] : ['#EBF3FB', '#F5F9FC', '#EBF3FB']}
        style={StyleSheet.absoluteFill}
      />

      <FlatList
        data={listData}
        keyExtractor={(item) => `lb-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        ListFooterComponent={
          !isSearching ? (
            <View>
              {/* ── Nearby / User Position Section ── */}
              {showNearbySec && nearbyMe && (
                <View style={styles.nearbySection}>
                  {/* Gap indicator between top-10 and user's neighborhood */}
                  {gapEnd >= gapStart && (
                    <GapSeparator
                      rankStart={gapStart}
                      rankEnd={gapEnd}
                      isDark={isDark}
                    />
                  )}

                  {/* Your neighborhood section header */}
                  <View style={[styles.neighborhoodHeader, { borderColor: isDark ? `${P.cta}30` : `${P.cta}20` }]}>
                    <LinearGradient
                      colors={isDark ? [`${P.cta}20`, `${P.cta}08`] : [`${P.cta}15`, `${P.cta}05`]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                    <View style={[styles.neighborhoodDot, { backgroundColor: P.cta }]} />
                    <Text style={[styles.neighborhoodTitle, { color: P.cta }]}>Your Neighborhood</Text>
                    <Text style={[styles.neighborhoodRank, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>
                      Rank #{myRank} of {total.toLocaleString()}
                    </Text>
                  </View>

                  {/* Rows above user */}
                  {filteredNearbyAbove.map((item, i) => (
                    <LeaderRow
                      key={`na-${item.id}`}
                      item={item}
                      isMe={item.id === myId}
                      index={i}
                      liveChange={liveChanges.get(item.id) ?? 0}
                      highlight
                    />
                  ))}

                  {/* USER row (highlighted) */}
                  <LeaderRow
                    key={`nm-${nearbyMe.id}`}
                    item={nearbyMe}
                    isMe
                    index={filteredNearbyAbove.length}
                    liveChange={liveChanges.get(nearbyMe.id) ?? 0}
                    highlight
                  />

                  {/* Rows below user */}
                  {nearbyBelow.map((item, i) => (
                    <LeaderRow
                      key={`nb-${item.id}`}
                      item={item}
                      isMe={item.id === myId}
                      index={filteredNearbyAbove.length + 1 + i}
                      liveChange={liveChanges.get(item.id) ?? 0}
                      highlight
                    />
                  ))}

                  {/* Extra rows loaded via "show more" */}
                  {extraBelow.map((item, i) => (
                    <LeaderRow
                      key={`ne-${item.id}`}
                      item={item}
                      isMe={item.id === myId}
                      index={filteredNearbyAbove.length + nearbyBelow.length + 1 + i}
                      liveChange={liveChanges.get(item.id) ?? 0}
                      highlight
                    />
                  ))}

                  {/* Show more button */}
                  {hasMoreBelow && (
                    <ShowMoreButton
                      onPress={handleShowMore}
                      loading={loadingShowMore}
                      isDark={isDark}
                    />
                  )}
                </View>
              )}

              {/* Standard footer for the top section */}
              {!showNearbySec && !hasMore && total > 0 && (
                <View style={styles.footerLoader}>
                  <Text style={[styles.footerText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>· {total} athletes ·</Text>
                </View>
              )}
              {!showNearbySec && loadingMore && (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={P.cta} />
                  <Text style={[styles.footerText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>Loading more...</Text>
                </View>
              )}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View>
            {/* ── PAGE TITLE ── */}
            <View style={styles.pageHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.pageTitle, { color: colors.text }]}>LEADERBOARD</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/leaderboard/xp-guide')}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/leaderboard/xp-history')}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                  {tab === 'All' ? 'Global Rankings' : `${tab} League`}
                </Text>
                {lastUpdatedLabel !== '' && (
                  <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>{lastUpdatedLabel}</Text>
                )}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/leaderboard/xp-guide')}
                style={[styles.pageTitleIcon, { backgroundColor: isDark ? 'rgba(247,203,22,0.12)' : 'rgba(247,203,22,0.15)' }]}
              >
                <MaterialCommunityIcons name="trophy" size={26} color={P.sun} />
              </TouchableOpacity>
            </View>

            {/* ── SEARCH BAR ── */}
            <View style={[styles.searchWrap, { backgroundColor: isDark ? colors.inputBg : '#FFF', borderColor: isDark ? colors.border : 'rgba(37,150,190,0.2)' }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search athletes..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── SEARCH RESULTS ── */}
            {isSearching && (
              <View style={styles.searchResultsWrap}>
                {searching ? (
                  <View style={styles.searchingWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.searchingText, { color: colors.textMuted }]}>Searching...</Text>
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.searchingWrap}>
                    <Ionicons name="search-outline" size={24} color={colors.textDim} />
                    <Text style={[styles.searchingText, { color: colors.textMuted }]}>No athletes found</Text>
                  </View>
                ) : (
                  searchResults.map((item) => {
                    const stier = getTier(item.league_tier);
                    return (
                      <TouchableOpacity
                        key={`sr-${item.id}`}
                        style={[styles.searchRow, { borderColor: colors.border }]}
                        onPress={() => router.push(`/profile/${item.id}`)}
                        activeOpacity={0.7}
                      >
                        <Avatar uri={item.profile_pic_url} size={36} border={stier.color} />
                        <View style={styles.searchInfo}>
                          <Text style={[styles.searchName, { color: colors.text }]} numberOfLines={1}>{item.full_name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <LinearGradient colors={stier.gradient} style={styles.searchTierBadge}>
                              <MaterialCommunityIcons name={stier.mcIcon as any} size={7} color={stier.textDark ? '#021518' : '#FFF'} />
                            </LinearGradient>
                            <Text style={[styles.searchTierText, { color: stier.color }]}>{item.league_tier}</Text>
                          </View>
                        </View>
                        <Text style={[styles.searchXP, { color: colors.textMuted }]}>
                          {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp} XP
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ── NORMAL CONTENT ── */}
            {!isSearching && (
              <>
                {/* ── PODIUM ── */}
                {top3.length >= 3 && tab === 'All' && (
                  <View style={styles.podiumWrap}>
                    <ImageBackground
                      source={require('../../assets/coach/workoutlog.jpg')}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <View style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)'}} pointerEvents="none" />
                    <View style={styles.podiumRow}>
                      <PodiumCard item={top3[1]} position={2} heightFactor={0.72} />
                      <PodiumCard item={top3[0]} position={1} heightFactor={1.0} />
                      <PodiumCard item={top3[2]} position={3} heightFactor={0.52} />
                    </View>
                  </View>
                )}

                {/* ── TIER CHIPS ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierTabsContent} style={styles.tierTabs}>
                  {TIERS.map((t) => {
                    const active = tab === t.name;
                    const textColor = t.textDark ? '#021518' : '#FFF';
                    return (
                      <TouchableOpacity
                        key={`tier-${t.name}`}
                        onPress={() => {
                          if (!filtering && tab !== t.name) {
                            changeTab(t.name);
                          }
                        }}
                        activeOpacity={0.75}
                        style={[
                          styles.tierChip,
                          {
                            backgroundColor: active ? t.color : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                            borderColor: active ? t.color : (isDark ? 'rgba(255,255,255,0.1)' : t.color + '55'),
                            opacity: filtering && !active ? 0.45 : 1,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name={t.mcIcon as any} size={13} color={active ? textColor : t.color} />
                        <Text style={[styles.tierChipText, { color: active ? textColor : (isDark ? colors.text : t.color) }]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ── COLUMN HEADERS ── */}
                <View style={styles.listHeaderRow}>
                  <Text style={[styles.listHeaderRank,   { color: colors.textMuted }]}>#</Text>
                  <Text style={[styles.listHeaderPlayer, { color: colors.textMuted }]}>ATHLETE</Text>
                  <Text style={[styles.listHeaderChange, { color: colors.textMuted }]}>CHG</Text>
                  <Text style={[styles.listHeaderXP,     { color: colors.textMuted }]}>XP</Text>
                </View>

                {/* ── TIER-SWITCH SKELETON ── */}
                {filtering && (
                  <View>
                    {Array.from({ length: 8 }).map((_, i) => <LeaderRowSkeleton key={`sk-${i}`} />)}
                  </View>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          (!filtering && !isSearching) ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.textDim} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No one in this tier yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <LeaderRow
            item={item}
            isMe={item.id === myId}
            index={index}
            liveChange={liveChanges.get(item.id) ?? 0}
          />
        )}
      />

      {/* ── TIER PROMOTION OVERLAY ── */}
      <CheerCard visible={showTierPromo} tierName={promoTierName} xp={promoXp} xpNeeded={promoXpNeeded} onClose={closeTierPromo} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingBottom: 130, flexGrow: 1 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14, height: '100%' },
  searchResultsWrap: { marginBottom: 12, gap: 2 },
  searchingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  searchingText: { fontFamily: FONTS.body, fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInfo: { flex: 1, gap: 2 },
  searchName: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  searchTierBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  searchTierText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  searchXP: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 16, paddingBottom: 12 },
  pageTitle: { fontFamily: FONTS.heading, fontSize: 28, letterSpacing: 1.5 },
  pageSubtitle: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  lastUpdated: { fontFamily: FONTS.body, fontSize: 10, marginTop: 2, letterSpacing: 0.3, opacity: 0.6 },
  pageTitleIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  podiumWrap: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(247,203,22,0.25)',
  },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 16, gap: 4 },
  podiumCard: { alignItems: 'center', flex: 1, paddingHorizontal: 2 },
  crownWrap: { marginBottom: 2, shadowColor: '#F7CB16', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 },
  podiumAvatarWrap: { position: 'relative', marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarGlow: { position: 'absolute', width: 72, height: 72, borderRadius: 36, top: -4 },
  podiumTierBadge: { position: 'absolute', bottom: -2, right: -2 },
  podiumName: { fontFamily: FONTS.bodyBold, fontSize: 11, maxWidth: 80, textAlign: 'center', marginBottom: 2 },
  podiumXP: { fontFamily: FONTS.bodyBold, fontSize: 9, marginBottom: 6 },
  podiumBlock: { width: '100%', alignItems: 'center' },

  tierTabs: { marginBottom: 10 },
  tierTabsContent: { gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  tierChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1.5 },
  tierChipText: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  listHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4 },
  listHeaderRank:   { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 36, textAlign: 'center' },
  listHeaderPlayer: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, flex: 1, marginLeft: 8 },
  listHeaderChange: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 44, textAlign: 'center' },
  listHeaderXP:     { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 44, textAlign: 'right' },

  leaderRowCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lrYouAccent: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  lrRank: { width: 30, alignItems: 'center', justifyContent: 'center' },
  lrMedal: { fontSize: 16, lineHeight: 20 },
  lrRankNum: { fontFamily: FONTS.heading, fontSize: 14, letterSpacing: -0.5 },
  lrInfo: { flex: 1, marginLeft: 10, marginRight: 8, minWidth: 0 },
  lrName: { fontFamily: FONTS.bodyBold, fontSize: 13.5, letterSpacing: 0.2 },
  lrYouTag: { fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 0.8 },
  lrTierRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  lrTierBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  lrTierText: { fontFamily: FONTS.bodyBold, fontSize: 7.5, letterSpacing: 0.6 },
  lrStreak: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lrStreakText: { fontFamily: FONTS.bodyBold, fontSize: 8, color: '#FF9F43' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, minWidth: 34, justifyContent: 'center' },
  changeText: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.2 },
  lrXP: { alignItems: 'flex-end', minWidth: 40 },
  lrXPText: { fontFamily: FONTS.heading, fontSize: 13, letterSpacing: 0.3 },
  lrXPLabel: { fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 0.5, marginTop: 1 },

  // ── Nearby section ──────────────────────────────────────────────────────────
  nearbySection: { marginTop: 8 },

  gapWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  gapLine: { flex: 1, height: 1 },
  gapPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  gapText: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.3 },

  neighborhoodHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    marginBottom: 4, overflow: 'hidden',
  },
  neighborhoodDot: { width: 7, height: 7, borderRadius: 4 },
  neighborhoodTitle: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.5, flex: 1 },
  neighborhoodRank: { fontFamily: FONTS.body, fontSize: 11 },

  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, marginBottom: 4,
    paddingVertical: 13, borderRadius: 14, borderWidth: 1,
  },
  showMoreText: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.3 },

  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  footerText: { fontFamily: FONTS.body, fontSize: 12 },

  centered: { justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontFamily: FONTS.body, fontSize: 14 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },

});
