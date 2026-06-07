import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../../utils/api';



const TIERS = [
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

function getTier(name: string) { return TIERS.find(t => t.name === name) ?? TIERS[0]; }

function getCardGradient(tierName: string): [string, string] {
  switch (tierName) {
    case 'Bronze':      return ['#543620', '#201108'];
    case 'Silver':      return ['#3E4C5E', '#16202C'];
    case 'Gold':        return ['#856006', '#2E1E00'];
    case 'Platinum':    return ['#086F83', '#02242D'];
    case 'Diamond':     return ['#0D6191', '#031E33'];
    case 'Master':      return ['#6D28D9', '#2E0665'];
    case 'Grandmaster': return ['#B91C1C', '#450616'];
    case 'Elite':       return ['#C2410C', '#431407'];
    case 'Champion':    return ['#991B1B', '#380202'];
    case 'Legend':      return ['#D97706', '#4C0519'];
    default:            return ['#1E293B', '#0F172A'];
  }
}

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

export default function FollowListScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    type === 'following' ? 'following' : 'followers'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [followerUsers, setFollowerUsers] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Action modal state
  const [actionUser, setActionUser] = useState<any | null>(null);
  const [actionSource, setActionSource] = useState<'followers' | 'following'>('followers');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [fRes, folRes, meRes] = await Promise.all([
        axios.get(`${API_URL}/profile/${id}/followers`, { headers }),
        axios.get(`${API_URL}/profile/${id}/following`, { headers }),
        axios.get(`${API_URL}/profile/me`, { headers }),
      ]);
      setFollowerUsers(fRes.data.users || []);
      setFollowingUsers(folRes.data.users || []);
      setCurrentUserId(meRes.data?.id || null);
    } catch (err) {
      console.error('Error fetching follow lists:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [fetchAll])
  );

  const isOwnList = currentUserId !== null && Number(id) === currentUserId;

  const currentUsers = activeTab === 'followers' ? followerUsers : followingUsers;
  const filtered = searchQuery.trim()
    ? currentUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : currentUsers;

  const handleUnfollow = async () => {
    if (!actionUser) return;
    const prev = actionUser;
    setActionUser(null);
    // Optimistic local update
    setFollowingUsers(prev => prev.filter(u => u.id !== actionUser.id));
    setFollowerUsers(prev => prev.map(u => u.id === actionUser.id ? { ...u, is_followed_by_me: false } : u));
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/profile/${actionUser.id}/unfollow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Revert on failure by re-fetching
      fetchAll();
    }
  };

  const handleRemoveFollower = async () => {
    if (!actionUser) return;
    const prev = actionUser;
    setActionUser(null);
    // Optimistic local update
    setFollowerUsers(prev => prev.filter(u => u.id !== actionUser.id));
    setFollowingUsers(prev => prev.map(u => u.id === actionUser.id ? { ...u, follows_me: false } : u));
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/profile/${actionUser.id}/remove-follower`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      fetchAll();
    }
  };

  const renderCard = ({ item }: { item: any }) => {
    const tier = getTier(item.league_tier);
    const cardGradient = getCardGradient(item.league_tier);

    const isFollowerTab = activeTab === 'followers';
    const isFollowingBack = item.is_followed_by_me;
    const followsMe = item.follows_me;

    const getActionButton = () => {
      if (!isOwnList) return null;

      if (isFollowerTab) {
        // Followers tab
        if (isFollowingBack) {
          // I follow them back → "Following"
          return (
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => { setActionUser(item); setActionSource('followers'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionPillText}>Following</Text>
            </TouchableOpacity>
          );
        }
        // They just follow me, I don't follow back → "Remove"
        return (
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: 'transparent', borderColor: colors.border }]}
            onPress={() => { setActionUser(item); setActionSource('followers'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionPillText, { color: colors.textMuted }]}>Remove</Text>
          </TouchableOpacity>
        );
      }

      // Following tab
      return (
        <TouchableOpacity
          style={[styles.actionPill, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => { setActionUser(item); setActionSource('following'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionPillText}>Following</Text>
        </TouchableOpacity>
      );
    };

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <LinearGradient
          colors={cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, {
            borderColor: tier.color + '30',
            shadowColor: tier.color,
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }]}
        >
          <View style={styles.cardGlossOverlay} />

          <View style={styles.cardAvatarWrap}>
            <Avatar uri={item.profile_pic_url} size={44} border={tier.color} />
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.full_name ?? 'Athlete'}
            </Text>

            <View style={styles.cardSubRow}>
              <LinearGradient colors={tier.gradient} style={styles.cardTierBadge}>
                <MaterialCommunityIcons name={tier.mcIcon as any} size={9}
                  color={tier.textDark ? '#021518' : '#FFF'} />
                <Text style={[styles.cardTierText, { color: tier.textDark ? '#021518' : '#FFF' }]}>
                  {item.league_tier.toUpperCase()}
                </Text>
              </LinearGradient>

              {item.current_streak > 0 && (
                <View style={styles.cardStreakBadge}>
                  <Ionicons name="flame" size={11} color="#FF9F43" />
                  <Text style={styles.cardStreakText}>{item.current_streak}d</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.xpCapsule, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              <Ionicons name="flash" size={10} color={P.sun} />
              <Text style={styles.cardXP}>
                {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}
              </Text>
              <Text style={styles.cardXPLabel}>XP</Text>
            </View>

            {getActionButton()}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Followers</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('followers')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'followers' ? colors.text : colors.textMuted }]}>
              Followers
            </Text>
            <Text style={[styles.tabCount, {
              color: activeTab === 'followers' ? colors.primary : colors.textMuted,
              backgroundColor: activeTab === 'followers' ? colors.primary + '18' : 'transparent',
            }]}>
              {followerUsers.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('following')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'following' ? colors.text : colors.textMuted }]}>
              Following
            </Text>
            <Text style={[styles.tabCount, {
              color: activeTab === 'following' ? colors.primary : colors.textMuted,
              backgroundColor: activeTab === 'following' ? colors.primary + '18' : 'transparent',
            }]}>
              {followingUsers.length}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="people-outline" size={48} color={colors.textDim} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {searchQuery.trim()
                    ? `No ${activeTab} match "${searchQuery}"`
                    : `No ${activeTab} yet`
                  }
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* ── Action Modal ── */}
      <Modal visible={!!actionUser} transparent animationType="fade" onRequestClose={() => setActionUser(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionUser(null)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {actionUser && (
              <>
                <View style={styles.modalUserRow}>
                  <Avatar uri={actionUser.profile_pic_url} size={36} border={getTier(actionUser.league_tier).color} />
                  <Text style={[styles.modalUserName, { color: colors.text }]} numberOfLines={1}>
                    {actionUser.full_name || 'Athlete'}
                  </Text>
                </View>
                <View style={styles.modalDivider} />

                {/* Following tab: always show Unfollow; add Remove Follower if they follow me */}
                {actionSource === 'following' && (
                  <>
                    <TouchableOpacity style={styles.modalOption} onPress={handleUnfollow} activeOpacity={0.7}>
                      <Ionicons name="person-remove-outline" size={20} color="#FF4B4B" />
                      <Text style={[styles.modalOptionText, { color: '#FF4B4B' }]}>Unfollow</Text>
                    </TouchableOpacity>
                    {actionUser.follows_me && (
                      <TouchableOpacity style={styles.modalOption} onPress={handleRemoveFollower} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="account-remove-outline" size={20} color="#FF4B4B" />
                        <Text style={[styles.modalOptionText, { color: '#FF4B4B' }]}>Remove Follower</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Followers tab: if I follow them back show Unfollow + Remove; otherwise just Remove */}
                {actionSource === 'followers' && (
                  <>
                    {actionUser.is_followed_by_me && (
                      <TouchableOpacity style={styles.modalOption} onPress={handleUnfollow} activeOpacity={0.7}>
                        <Ionicons name="person-remove-outline" size={20} color="#FF4B4B" />
                        <Text style={[styles.modalOptionText, { color: '#FF4B4B' }]}>Unfollow</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.modalOption} onPress={handleRemoveFollower} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="account-remove-outline" size={20} color="#FF4B4B" />
                      <Text style={[styles.modalOptionText, { color: '#FF4B4B' }]}>Remove Follower</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.modalDivider} />
                <TouchableOpacity style={styles.modalOption} onPress={() => setActionUser(null)} activeOpacity={0.7}>
                  <Text style={[styles.modalOptionText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20 },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  tabText: { fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.3 },
  tabCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },

  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    height: 40,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
    flexGrow: 1,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 68,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
  },
  cardGlossOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardAvatarWrap: {
    marginLeft: 14,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 4,
  },
  cardName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  cardTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cardTierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  cardStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 67, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2.5,
  },
  cardStreakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8.5,
    color: '#FF9F43',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginRight: 14,
  },
  xpCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardXP: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardXPLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    marginLeft: 1,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: '#FFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalUserName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    flex: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  modalOptionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
  },
});
