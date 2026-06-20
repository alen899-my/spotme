import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { P } from '../../constants/homeTheme';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const { width: SW } = Dimensions.get('window');

const TIERS = [
  { name: 'Bronze',      color: '#CD7F32', textDark: false, gradient: ['#CD7F32','#8B4513'] as [string,string],       mcIcon: 'shield'           , desc: 'Starting tier for all gym warriors. Learn the basics and build consistency.' },
  { name: 'Silver',      color: '#B0B8C1', textDark: true,  gradient: ['#C0C0C0','#808080'] as [string,string],       mcIcon: 'shield-half-full' , desc: 'Stepping up. You are logging workouts and getting standard achievements.' },
  { name: 'Gold',        color: '#F7CB16', textDark: true,  gradient: ['#FFD700','#B8860B'] as [string,string],       mcIcon: 'trophy'           , desc: 'Consistency is showing. Highly active athletes with established streaks.' },
  { name: 'Platinum',    color: '#00C9C8', textDark: false, gradient: ['#00C9C8','#007BFF'] as [string,string],       mcIcon: 'diamond-stone'    , desc: 'Advanced status. You are crushing limits and setting heavy volume records.' },
  { name: 'Diamond',     color: '#7DD4F8', textDark: true,  gradient: ['#B9F2FF','#00BFFF'] as [string,string],       mcIcon: 'diamond'          , desc: 'Elite bracket. Dedication to physical metrics, meals, and daily logging.' },
  { name: 'Master',      color: '#9B59B6', textDark: false, gradient: ['#9B59B6','#6C3483'] as [string,string],       mcIcon: 'crown'            , desc: 'True master. Unstoppable workout streak and highly optimized health goals.' },
  { name: 'Grandmaster', color: '#E91E63', textDark: false, gradient: ['#E91E63','#880E4F'] as [string,string],       mcIcon: 'crown-outline'    , desc: 'Gym royalty. Inspiring the community and maintaining high intensity volume.' },
  { name: 'Elite',       color: '#FF5722', textDark: false, gradient: ['#FF5722','#BF360C'] as [string,string],       mcIcon: 'sword-cross'      , desc: 'God-tier discipline. You never miss workouts and push absolute metrics limits.' },
  { name: 'Champion',    color: '#E00000', textDark: false, gradient: ['#E00000','#7F0000'] as [string,string],       mcIcon: 'fire'             , desc: 'Uncontested champion. Reaching the peak of absolute athleticism.' },
  { name: 'Legend',      color: '#FF9900', textDark: true,  gradient: ['#FF9900','#E00000'] as [string,string],       mcIcon: 'star-four-points' , desc: 'Ascended legend. Recognized as an icon of peak performance and consistency.' },
];

const TIER_XP: Record<string, number> = {
  Bronze: 0,
  Silver: 2000,
  Gold: 6000,
  Platinum: 12000,
  Diamond: 24000,
  Master: 40000,
  Grandmaster: 60000,
  Elite: 80000,
  Champion: 120000,
  Legend: 200000,
};

const ACTIVITIES = [
  { name: 'Complete Workout', xp: '+50 XP', desc: 'Awarded when you log and complete a full workout session.', icon: 'dumbbell', color: '#10B981' },
  { name: 'Daily Login', xp: '+10 XP', desc: 'Bonus points for opening SpotMe and staying active daily.', icon: 'calendar-check', color: '#2596BE' },
  { name: 'Reach Water Goal', xp: '+10 XP', desc: 'Awarded when you log and complete your target water intake.', icon: 'water', color: '#3B82F6' },
  { name: 'Complete Exercise', xp: '+10 XP', desc: 'Points awarded for each unique exercise completed in a session.', icon: 'arm-flex', color: '#8B5CF6' },
  { name: 'Log Meal', xp: '+5 XP', desc: 'Fuel tracker bonus for logging your meals and maintaining food plans.', icon: 'food-apple', color: '#F59E0B' },
  { name: 'Rate Exercise', xp: '+5 XP', desc: 'Give feedback on difficulty to calibrate your training load.', icon: 'star', color: '#FBBF24' },
  { name: 'Streak Daily Bonus', xp: '+3 XP/day', desc: 'Multiplied by your active workout streak (e.g. 5-day streak = +15 XP!).', icon: 'flame', color: '#FF9F43' },
];

const PENALTIES = [
  { name: 'Missed Workout Day', xp: '-20 XP', desc: 'Deducted for skipping scheduled workout days without logging rest.', icon: 'calendar-remove', color: '#EF4444' },
  { name: 'Skip Exercises', xp: '-5 XP', desc: 'Penalty applied for each exercise skipped inside your workout session.', icon: 'skip-next', color: '#F87171' },
];

export default function XPGuideScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'activities' | 'leagues'>('activities');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error('Error fetching user for XP guide:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercent = () => {
    if (!user) return 0;
    const level = user.level || 1;
    const currentXp = user.total_xp || 0;
    const xpInCurrentLevel = currentXp % 2000;
    return Math.min(Math.round((xpInCurrentLevel / 2000) * 100), 100);
  };

  const xpToNextLevel = () => {
    if (!user) return 0;
    const currentXp = user.total_xp || 0;
    const nextLevelXp = (user.level || 1) * 2000;
    return Math.max(nextLevelXp - currentXp, 0);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>POINTS Calculation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User XP Header Card */}
        {loading ? (
          <View style={[styles.loaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : user ? (
          <LinearGradient
            colors={isDark ? ['#0D0D0D', '#1A1A1A'] : ['#FFFFFF', '#F1F5F9']}
            style={[styles.userCard, { borderColor: colors.border }]}
          >
            <View style={styles.userCardHeader}>
              <View style={styles.userAvatarContainer}>
                {user.profile_pic_url ? (
                  <Image source={{ uri: user.profile_pic_url }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="person" size={24} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.userTierIndicator}>
                  <MaterialCommunityIcons
                    name={(TIERS.find(t => t.name === user.league_tier)?.mcIcon || 'shield') as any}
                    size={10}
                    color="#FFF"
                  />
                </View>
              </View>
              <View style={styles.userMeta}>
                <Text style={[styles.userLevelName, { color: colors.text }]}>{user.full_name || 'Gym Warrior'}</Text>
                <View style={styles.levelBadgeRow}>
                  <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.levelBadgeText}>LEVEL {user.level || 1}</Text>
                  </View>
                  {user.league_tier && (
                    <Text style={[styles.leagueNameText, { color: TIERS.find(t => t.name === user.league_tier)?.color || colors.primary }]}>
                      {user.league_tier} League
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.userXPBlock}>
                <Text style={[styles.userXPVal, { color: colors.text }]}>{(user.total_xp || 0).toLocaleString()}</Text>
                <Text style={[styles.userXPLabel, { color: colors.textMuted }]}>TOTAL XP</Text>
              </View>
            </View>

            <View style={styles.progressBarSection}>
              <View style={styles.progressBarLabels}>
                <Text style={[styles.progressLabelText, { color: colors.textMuted }]}>
                  {xpToNextLevel().toLocaleString()} XP to Level {(user.level || 1) + 1}
                </Text>
                <Text style={[styles.progressLabelPercent, { color: colors.primary }]}>{getProgressPercent()}%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.inputBg }]}>
                <View style={[styles.progressBarFill, { width: `${getProgressPercent()}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>

            {user.current_streak > 0 && (
              <View style={[styles.userStreakBanner, { backgroundColor: isDark ? 'rgba(255,159,67,0.1)' : '#FFF3E6', borderColor: 'rgba(255,159,67,0.2)' }]}>
                <Ionicons name="flame" size={16} color="#FF9F43" />
                <Text style={[styles.userStreakText, { color: isDark ? '#FFA852' : '#E67E22' }]}>
                  Active Streak: {user.current_streak} days (+{user.current_streak * 3} XP per workout bonus!)
                </Text>
              </View>
            )}
          </LinearGradient>
        ) : null}

        {/* Tab Selection */}
        <View style={[styles.tabContainer, { backgroundColor: colors.inputBg }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'activities' && [styles.tabBtnActive, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]
            ]}
            onPress={() => setActiveTab('activities')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="flash"
              size={18}
              color={activeTab === 'activities' ? colors.primary : colors.textMuted}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'activities' ? colors.text : colors.textMuted }
            ]}>
              Activities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'leagues' && [styles.tabBtnActive, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]
            ]}
            onPress={() => setActiveTab('leagues')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="trophy"
              size={18}
              color={activeTab === 'leagues' ? colors.primary : colors.textMuted}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'leagues' ? colors.text : colors.textMuted }
            ]}>
              League Ranks
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: ACTIVITIES CONTENT */}
        {activeTab === 'activities' && (
          <View style={styles.tabContent}>
            {/* Level progression helper card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoCardIconWrap, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.1)' }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardTitle, { color: colors.text }]}>How Levels Work</Text>
                <Text style={[styles.infoCardDesc, { color: colors.textMuted }]}>
                  Your level increases automatically for every <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>2,000 XP</Text> accumulated. High levels showcase your long-term dedication to building a stellar physique!
                </Text>
              </View>
            </View>

            {/* XP Gains List */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>EARN XP (GAINS)</Text>
            {ACTIVITIES.map((act) => (
              <View key={act.name} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.activityIconWrap, { backgroundColor: act.color + '15' }]}>
                  <MaterialCommunityIcons name={act.icon as any} size={20} color={act.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityName, { color: colors.text }]}>{act.name}</Text>
                  <Text style={[styles.activityDesc, { color: colors.textMuted }]}>{act.desc}</Text>
                </View>
                <View style={[styles.xpBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.xpBadgeText, { color: colors.success }]}>{act.xp}</Text>
                </View>
              </View>
            ))}

            {/* XP Penalties List */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 18 }]}>XP PENALTIES (LOSSES)</Text>
            {PENALTIES.map((pen) => (
              <View key={pen.name} style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.activityIconWrap, { backgroundColor: pen.color + '15' }]}>
                  <MaterialCommunityIcons name={pen.icon as any} size={20} color={pen.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityName, { color: colors.text }]}>{pen.name}</Text>
                  <Text style={[styles.activityDesc, { color: colors.textMuted }]}>{pen.desc}</Text>
                </View>
                <View style={[styles.xpBadge, { backgroundColor: colors.error + '15' }]}>
                  <Text style={[styles.xpBadgeText, { color: colors.error }]}>{pen.xp}</Text>
                </View>
              </View>
            ))}

            {/* Note on Rest Days */}
            <View style={[styles.restDayNotice, { backgroundColor: isDark ? '#111111' : '#F1F5F9', borderColor: colors.border }]}>
              <Ionicons name="cafe-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.restDayNoticeTitle, { color: colors.text }]}>Streak Bridge: Rest Days</Text>
                <Text style={[styles.restDayNoticeDesc, { color: colors.textMuted }]}>
                  Need a break? Logging a <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>Rest Day (Fatigue)</Text> will keep your workout streak alive so you don't lose your streak bonus! Other rest reasons will safely clear the streak to 0.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: LEAGUES CONTENT */}
        {activeTab === 'leagues' && (
          <View style={styles.tabContent}>
            {/* Timeline info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoCardIconWrap, { backgroundColor: 'rgba(247,203,22,0.15)' }]}>
                <MaterialCommunityIcons name="trophy" size={20} color={P.sun} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoCardTitle, { color: colors.text }]}>League Promotion & Standings</Text>
                <Text style={[styles.infoCardDesc, { color: colors.textMuted }]}>
                  Collect XP to automatically advance through the ranks. Climbing to higher leagues showcases your consistency. Each rank unlocks unique badges and profiling colors!
                </Text>
              </View>
            </View>

            {/* Leagues Vertical Timeline */}
            <View style={styles.timelineContainer}>
              {/* Central vertical line */}
              <View style={[styles.timelineVerticalLine, { backgroundColor: colors.border }]} />

              {TIERS.map((t, index) => {
                const isActive = user?.league_tier === t.name;
                const isPassed = user ? TIER_XP[user.league_tier] >= TIER_XP[t.name] : false;

                return (
                  <View key={t.name} style={styles.timelineRow}>
                    {/* Left node (XP threshold) */}
                    <View style={styles.timelineLeft}>
                      <Text style={[styles.timelineXPLabel, { color: colors.text }]}>
                        {TIER_XP[t.name].toLocaleString()}
                      </Text>
                      <Text style={[styles.timelineXPLabelSub, { color: colors.textMuted }]}>XP MIN</Text>
                    </View>

                    {/* Timeline dot & badge */}
                    <View style={styles.timelineCenter}>
                      <View style={[
                        styles.timelineDotOuter,
                        { borderColor: isPassed ? t.color : colors.border, backgroundColor: colors.bg }
                      ]}>
                        <LinearGradient
                          colors={t.gradient}
                          style={styles.timelineBadgeGradient}
                        >
                          <MaterialCommunityIcons
                            name={t.mcIcon as any}
                            size={16}
                            color={t.textDark ? '#021518' : '#FFF'}
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Right side: card description */}
                    <View style={[
                      styles.timelineCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isActive ? t.color : colors.border,
                        borderWidth: isActive ? 1.5 : 1,
                      },
                      isActive && {
                        shadowColor: t.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 10,
                        elevation: 4
                      }
                    ]}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={[styles.timelineCardTitle, { color: t.color }]}>
                          {t.name.toUpperCase()}
                        </Text>
                        {isActive && (
                          <View style={[styles.activeRankBadge, { backgroundColor: t.color }]}>
                            <Text style={[styles.activeRankBadgeText, { color: t.textDark ? '#021518' : '#FFF' }]}>
                              YOUR LEAGUE
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.timelineCardDesc, { color: colors.textMuted }]}>
                        {t.desc}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },

  // Loader card placeholder
  loaderCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  // User XP Status Card
  userCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  userTierIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  userMeta: {
    flex: 1,
    gap: 2,
  },
  userLevelName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: '#FFF',
  },
  leagueNameText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  userXPBlock: {
    alignItems: 'flex-end',
  },
  userXPVal: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    lineHeight: 24,
  },
  userXPLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.5,
  },

  // Progress Bar
  progressBarSection: {
    marginTop: 14,
  },
  progressBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabelText: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  progressLabelPercent: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Streak banner
  userStreakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  userStreakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

  // Interactive Tabs
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },

  tabContent: {
    gap: 12,
  },

  // Glassmorphic Info Card
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 2,
  },
  infoCardDesc: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 16,
  },

  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 4,
  },

  // Activity list item
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
  },
  activityDesc: {
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 14,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 54,
    alignItems: 'center',
  },
  xpBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

  // Rest Day notice info
  restDayNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  restDayNoticeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    marginBottom: 2,
  },
  restDayNoticeDesc: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
    lineHeight: 15,
  },

  // Leagues timeline styling
  timelineContainer: {
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 20,
  },
  timelineVerticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 80, // aligned with center of timeline dots
    width: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  timelineLeft: {
    width: 65,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 10,
  },
  timelineXPLabel: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    lineHeight: 18,
  },
  timelineXPLabelSub: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  timelineCenter: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineBadgeGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginLeft: 10,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  activeRankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeRankBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  timelineCardDesc: {
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 14,
  },
});
