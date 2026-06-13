import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator,
  Dimensions, Animated, ScrollView, TextInput,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

const { width: W } = Dimensions.get('window');


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

// ── SVG Crown ─────────────────────────────────────────────────────────────────
function CrownSvg({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s * 0.75} viewBox="0 0 200 150">
      <Path
        d="M 20,130 L 20,80 L 55,100 L 100,55 L 145,100 L 180,80 L 180,130 Z"
        fill="#F7CB16"
        stroke="#B8960E"
        strokeWidth={3}
      />
      <Circle cx="100" cy="55" r="14" fill="#D4A800" />
      <Circle cx="100" cy="55" r="7" fill="#FFF" opacity={0.7} />
      <Circle cx="100" cy="55" r="3" fill="#B8960E" />
      <Circle cx="55" cy="100" r="5" fill="#FFF" opacity={0.3} />
      <Circle cx="145" cy="100" r="5" fill="#FFF" opacity={0.3} />
      <Path d="M 20,130 L 100,115 L 180,130" stroke="#B8960E" strokeWidth={2} fill="none" opacity={0.5} />
    </Svg>
  );
}

// ── SVG Medal ──────────────────────────────────────────────────────────────────
function MedalSvg({ position, size = 34 }: { position: number; size?: number }) {
  const colors: Record<number, string> = {
    1: '#F7CB16', 2: '#C8D6E5', 3: '#E67E22',
  };
  const innerColors: Record<number, string> = {
    1: '#D4A800', 2: '#8395A7', 3: '#A04000',
  };
  const ribbonColors: Record<number, string> = {
    1: '#B8960E', 2: '#6B7A85', 3: '#8A3E00',
  };
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 34 38">
      <Path
        d="M 6,20 L 17,28 L 28,20 V 34 L 17,38 L 6,34 Z"
        fill={ribbonColors[position]}
        opacity={0.6}
      />
      <Circle cx="17" cy="15" r="13" fill={colors[position]} />
      <Circle cx="17" cy="15" r="10" fill="none" stroke="#FFF" strokeWidth={1.2} opacity={0.4} />
      <Circle cx="17" cy="15" r="5" fill="#FFF" opacity={0.85} />
      <Circle cx="17" cy="15" r="2" fill={innerColors[position]} />
    </Svg>
  );
}

// ── 3D Podium Block (Views) ───────────────────────────────────────────────────
function PodiumBlockView({ position, heightFactor }: { position: number; heightFactor: number }) {
  const blockH = Math.max(80 * heightFactor, 50);
  const colors: Record<number, { main: string; dark: string; light: string }> = {
    1: { main: '#F7CB16', dark: '#B8960E', light: '#FFF8DC' },
    2: { main: '#C8D6E5', dark: '#9EA8B0', light: '#F0F4F8' },
    3: { main: '#E67E22', dark: '#B85E10', light: '#FDEBD0' },
  };
  const c = colors[position];
  const medalLabel = position === 1 ? '1' : position === 2 ? '2' : '3';

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      {/* Depth block (offset for 3D effect) */}
      <View style={{
        width: '86%',
        height: blockH,
        backgroundColor: c.dark,
        borderRadius: 14,
        position: 'absolute',
        bottom: -5,
        opacity: 0.8,
      }} />
      {/* Main block */}
      <View style={{
        width: '86%',
        height: blockH,
        backgroundColor: c.main,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
      }}>
        {/* Light top strip */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: blockH * 0.35,
          backgroundColor: c.light, opacity: 0.2,
          borderTopLeftRadius: 14, borderTopRightRadius: 14,
        }} />
        <MedalSvg position={position} size={30} />
        <Text style={{
          fontFamily: FONTS.heading,
          fontSize: 15,
          color: 'rgba(0,0,0,0.4)',
          marginTop: 3,
        }}>#{medalLabel}</Text>
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
  const avatarSize = position === 1 ? 64 : 52;
  const isTop = position === 1;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, delay: position * 150,
      useNativeDriver: true, tension: 55, friction: 7,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.podiumCard, { transform: [{ scale: scaleAnim }] }]}>
      {isTop && (
        <View style={styles.crownWrap}>
          <CrownSvg size={36} />
        </View>
      )}

      {/* Avatar */}
      <View style={styles.podiumAvatarWrap}>
        <View style={[styles.podiumAvatarGlow, { backgroundColor: medalBorder + '30' }]} />
        <Avatar uri={item.profile_pic_url} size={avatarSize} border={medalBorder} />
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

      {/* 3D Podium Block */}
      <View style={styles.podiumBlock}>
        <PodiumBlockView position={position} heightFactor={heightFactor} />
      </View>
    </Animated.View>
  );
}

// ── Rank Change Badge ─────────────────────────────────────────────────────────
function RankChange({ change }: { change: number }) {
  if (change === 0) {
    return (
      <View style={styles.changeBadge}>
        <Text style={[styles.changeText, { color: '#888' }]}>—</Text>
      </View>
    );
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
function LeaderRow({ item, isMe, index }: { item: any; isMe: boolean; index: number }) {
  const { colors, isDark } = useTheme();
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
  const medalEmoji  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  const rankChange = Number(item.rank_change) || 0;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/profile/${item.id}`)}
        style={[
          styles.leaderRowCard,
          {
            borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          },
          isMe && { backgroundColor: isDark ? `${P.cta}12` : `${P.cta}08` },
        ]}
      >
        {/* "You" left accent */}
        {isMe && <View style={[styles.lrYouAccent, { backgroundColor: P.cta }]} />}

        {/* ── RANK ── */}
        <View style={styles.lrRank}>
          {isTop3 ? (
            <Text style={styles.lrMedal}>{medalEmoji}</Text>
          ) : (
            <Text style={[styles.lrRankNum, { color: colors.textMuted }]}>{rank}</Text>
          )}
        </View>

        {/* ── AVATAR ── */}
        <Avatar uri={item.profile_pic_url} size={40} border={tier.color} />

        {/* ── NAME + TIER ── */}
        <View style={styles.lrInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.lrName, { color: colors.text }]} numberOfLines={1}>
              {item.full_name ?? 'Athlete'}
            </Text>
            {isMe && <Text style={[styles.lrYouTag, { color: P.cta }]}>YOU</Text>}
          </View>
          <View style={styles.lrTierRow}>
            <LinearGradient colors={tier.gradient} style={styles.lrTierBadge}>
              <MaterialCommunityIcons name={tier.mcIcon as any} size={8} color={tier.textDark ? '#021518' : '#FFF'} />
              <Text style={[styles.lrTierText, { color: tier.textDark ? '#021518' : '#FFF' }]}>
                {item.league_tier.toUpperCase()}
              </Text>
            </LinearGradient>
            {item.current_streak > 0 && (
              <View style={styles.lrStreak}>
                <Ionicons name="flame" size={10} color="#FF9F43" />
                <Text style={styles.lrStreakText}>{item.current_streak}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CHANGE ── */}
        <RankChange change={rankChange} />

        {/* ── XP ── */}
        <View style={styles.lrXP}>
          <Text style={[styles.lrXPText, { color: colors.text }]}>
            {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}
          </Text>
          <Text style={[styles.lrXPLabel, { color: colors.textMuted }]}>XP</Text>
        </View>
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
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async (selectedTab?: string) => {
    const tier = selectedTab ?? tab;
    const isTabChange = selectedTab !== undefined;
    if (isTabChange) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const token = await getToken();
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setMyId(JSON.parse(userData).id);
      const headers = { Authorization: `Bearer ${token}` };
      const [topRes, boardRes, meRes] = await Promise.all([
        axios.get(`${API_URL}/leaderboard/top`, { headers }),
        axios.get(`${API_URL}/leaderboard`, { params: { tier, limit: 50 }, headers }),
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
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  useEffect(() => {
    if (!loading) fetchData(tab);
  }, [tab]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/leaderboard/search`, {
          params: { q: searchQuery.trim() },
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

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
        data={searchQuery.trim() ? [] : leaders}
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
            {searchQuery.trim() !== '' && (
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
                        key={item.id}
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

            {/* ── HIDE NORMAL CONTENT WHEN SEARCHING ── */}
            {searchQuery.trim() === '' && (
            <>
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
              <Text style={[styles.listHeaderRank, { color: colors.textMuted }]}>#</Text>
              <Text style={[styles.listHeaderPlayer, { color: colors.textMuted }]}>ATHLETE</Text>
              <Text style={[styles.listHeaderChange, { color: colors.textMuted }]}>CHG</Text>
              <Text style={[styles.listHeaderXP, { color: colors.textMuted }]}>XP</Text>
            </View>
            {refreshing && (
              <View style={styles.refreshBar}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            </>
            )}
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
  listContent: { paddingHorizontal: 14, paddingBottom: 130, flexGrow: 1 },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    height: '100%',
  },
  searchResultsWrap: {
    marginBottom: 12,
    gap: 2,
  },
  searchingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  searchingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInfo: {
    flex: 1,
    gap: 2,
  },
  searchName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  searchTierBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchTierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  searchXP: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

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

  // Podium
  podiumWrap: {
    marginBottom: 16,
  },
  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingTop: 16, gap: 4,
  },
  podiumCard: { alignItems: 'center', flex: 1, paddingHorizontal: 2 },
  crownWrap: {
    marginBottom: 2,
    shadowColor: '#F7CB16', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  podiumAvatarWrap: {
    position: 'relative', marginBottom: 6, alignItems: 'center', justifyContent: 'center',
  },
  podiumAvatarGlow: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    top: -4,
  },
  podiumTierBadge: {
    position: 'absolute', bottom: -2, right: -2,
  },
  podiumName: {
    fontFamily: FONTS.bodyBold, fontSize: 11, maxWidth: 80, textAlign: 'center',
    marginBottom: 2,
  },
  podiumXP: {
    fontFamily: FONTS.bodyBold, fontSize: 9, marginBottom: 6,
  },
  podiumBlock: {
    width: '100%',
    alignItems: 'center',
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
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4,
  },
  listHeaderRank: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 36, textAlign: 'center' },
  listHeaderPlayer: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, flex: 1, marginLeft: 8 },
  listHeaderChange: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 44, textAlign: 'center' },
  listHeaderXP: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, width: 44, textAlign: 'right' },
  refreshBar: { alignItems: 'center', paddingVertical: 8 },

  // ── Leader Row ────────────────────────────────────────────────────────────
  leaderRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  lrYouAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  lrRank: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lrMedal: {
    fontSize: 16,
    lineHeight: 20,
  },
  lrRankNum: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: -0.5,
  },
  lrInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    minWidth: 0,
  },
  lrName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    letterSpacing: 0.2,
  },
  lrYouTag: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  lrTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  lrTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lrTierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7.5,
    letterSpacing: 0.6,
  },
  lrStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lrStreakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: '#FF9F43',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 34,
    justifyContent: 'center',
  },
  changeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  lrXP: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  lrXPText: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  lrXPLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // States
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 60 },
  loadingText: { fontFamily: FONTS.body, fontSize: 14 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
});
