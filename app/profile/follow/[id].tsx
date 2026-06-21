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
import OptimizedImage from '../../../components/ui/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../../utils/api';
import { getToken } from '../../../utils/tokenStorage';

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
        ? <OptimizedImage uri={uri} style={{ width: '100%', height: '100%' }} onError={() => setErr(true)} />
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
      const token = await getToken();
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
      const token = await getToken();
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
      const token = await getToken();
      await axios.post(`${API_URL}/profile/${actionUser.id}/remove-follower`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      fetchAll();
    }
  };

  const renderRow = ({ item }: { item: any }) => {
    const tier = getTier(item.league_tier);
    const isFollowerTab = activeTab === 'followers';
    const isFollowingBack = item.is_followed_by_me;

    const renderAction = () => {
      if (!isOwnList) return null;
      if (isFollowerTab && !isFollowingBack) {
        return (
          <TouchableOpacity
            style={[styles.followBtn, { borderColor: colors.border }]}
            onPress={() => { setActionUser(item); setActionSource('followers'); }}
          >
            <Text style={[styles.followBtnText, { color: colors.textMuted }]}>Remove</Text>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity
          style={[styles.followBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => { setActionUser(item); setActionSource(isFollowerTab ? 'followers' : 'following'); }}
        >
          <Text style={[styles.followBtnText, { color: '#FFF' }]}>Following</Text>
        </TouchableOpacity>
      );
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/profile/${item.id}`)}
        style={[styles.row, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}
      >
        <Avatar uri={item.profile_pic_url} size={40} border={tier.color} />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
            {item.full_name ?? 'Athlete'}
          </Text>
          <View style={styles.rowSub}>
            <LinearGradient colors={tier.gradient} style={styles.rowTier}>
              <MaterialCommunityIcons name={tier.mcIcon as any} size={8} color={tier.textDark ? '#021518' : '#FFF'} />
              <Text style={[styles.rowTierText, { color: tier.textDark ? '#021518' : '#FFF' }]}>
                {item.league_tier.toUpperCase()}
              </Text>
            </LinearGradient>
            {item.current_streak > 0 && (
              <View style={styles.rowStreak}>
                <Ionicons name="flame" size={10} color="#FF9F43" />
                <Text style={styles.rowStreakText}>{item.current_streak}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowXP, { color: colors.text }]}>
            {item.xp >= 1000 ? `${(item.xp / 1000).toFixed(1)}k` : item.xp}
          </Text>
          <Text style={[styles.rowXPLabel, { color: colors.textMuted }]}>XP</Text>
        </View>
        {renderAction()}
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
            renderItem={renderRow}
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
    paddingBottom: 40,
    flexGrow: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    justifyContent: 'center',
  },
  rowName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  rowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  rowTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowTierText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  rowStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rowStreakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FF9F43',
  },
  rowRight: {
    alignItems: 'center',
    marginRight: 10,
  },
  rowXP: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  rowXPLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    marginTop: -1,
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  followBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
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
