import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  TextInput,
  ScrollView,
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
import { SplitsSkeleton } from '../../components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const TABS = [
  { key: 'my', label: 'My Programs' },
  { key: 'community', label: 'Community' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function SplitsTab() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [splits, setSplits] = useState<any[]>([]);
  const [sharedSplits, setSharedSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<any>(null);

  // Deletion state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group shared splits by creator
  const userGroups = React.useMemo(() => {
    const map = new Map<number, { id: number; name: string; pic: string; splits: any[] }>();
    for (const s of sharedSplits) {
      if (!map.has(s.creator_id)) {
        map.set(s.creator_id, { id: s.creator_id, name: s.creator_name, pic: s.creator_pic || '', splits: [] });
      }
      map.get(s.creator_id)!.splits.push(s);
    }
    return Array.from(map.values());
  }, [sharedSplits]);

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
      setLoading(false);
    }
  }, []);

  const fetchSharedSplits = useCallback(async (q?: string, pageNum: number = 1, append: boolean = false) => {
    if (append) setLoadingMore(true);
    else setSharedLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const params: any = { page: pageNum, limit: 10 };
      if (q && q.trim()) params.q = q.trim();
      const res = await axios.get(`${API_URL}/workouts/shared-splits`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const { data, totalPages } = res.data;
      if (append) {
        setSharedSplits(prev => [...prev, ...data]);
      } else {
        setSharedSplits(data);
      }
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching shared splits:', err);
    } finally {
      if (append) setLoadingMore(false);
      else setSharedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSplits();
      if (activeTab === 'community') fetchSharedSplits(searchQuery, 1, false);
    }, [fetchSplits, activeTab, fetchSharedSplits, searchQuery])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setHasMore(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchSharedSplits(text, 1, false);
    }, 400);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchSharedSplits(searchQuery, page + 1, true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/workouts/splits/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Program deleted successfully');
      setDeleteId(null);
      fetchSplits();
    } catch (err) {
      console.error('Error deleting split:', err);
      showToast('Failed to delete program', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSplit = ({ item, index }: { item: any, index: number }) => {
    const cardBg = isDark ? colors.card : (item.template_color || colors.primary || '#E00000');
    const cardBorderColor = isDark ? colors.border : (item.template_color || colors.primary || '#E00000');

    const rawImages = item.exercise_images || [];
    const images = [...rawImages];
    if (images.length > 2) {
      const shift = index % images.length;
      for (let i = 0; i < shift; i++) {
        images.push(images.shift());
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.splitCard,
          {
            backgroundColor: cardBg,
            borderColor: cardBorderColor,
            borderWidth: isDark ? 1 : 0,
            shadowColor: isDark ? 'transparent' : cardBg,
            elevation: isDark ? 0 : 4
          }
        ]}
        activeOpacity={0.9}
        onPress={() => router.push(`/splits/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.2)' }]}>
            <MaterialCommunityIcons name={item.template_icon || "folder-outline"} size={22} color={isDark ? colors.primary : "#FFF"} />
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="trash-outline" size={16} color={isDark ? colors.textMuted : "rgba(255,255,255,0.6)"} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.splitName, { color: isDark ? colors.text : '#FFF' }]} numberOfLines={1}>{item.name}</Text>

        <View style={styles.cardFooterArea}>
          <View style={styles.cardStatsArea}>
            <View style={styles.miniStat}>
              <Ionicons name="flash" size={12} color={isDark ? colors.primary : "rgba(255,255,255,0.8)"} />
              <Text style={[styles.miniStatText, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.8)' }]}>{item.session_count} Sessions</Text>
            </View>
            <View style={styles.miniStat}>
              <Ionicons name="calendar" size={12} color={isDark ? colors.primary : "rgba(255,255,255,0.8)"} />
              <Text style={[styles.miniStatText, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.8)' }]}>Program</Text>
            </View>
          </View>

          <View style={styles.miniImageStack}>
            <Image
              source={{ uri: images.length > 1 ? images[1] : images[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }}
              style={[styles.miniThumbnailBack, { opacity: 0.3, transform: [{ rotate: '12deg' }, { translateX: 6 }] }]}
            />
            {images.length > 0 ? (
              <Image source={{ uri: images[0] }} style={[styles.miniThumbnailFront, { borderColor: isDark ? colors.border : '#FFF' }]} />
            ) : (
              <View style={[styles.miniThumbnailFront, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.1)', borderColor: isDark ? colors.border : '#FFF', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="barbell-outline" size={12} color={isDark ? colors.textMuted : "rgba(255,255,255,0.5)"} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const splitCardWidth = 160;

  const renderHorizontalSplit = (item: any) => {
    const exImages = item.exercise_images || [];
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.horiSplitCard, {
          backgroundColor: colors.card,
          borderColor: colors.border,
        }]}
        activeOpacity={0.85}
        onPress={() => router.push({
          pathname: `/splits/${item.id}`,
          params: { shared: '1', creatorName: item.creator_name, creatorPic: item.creator_pic || '', splitName: item.name }
        })}
      >
        <View style={styles.horiImageStack}>
          {exImages.slice(0, 3).map((uri: string, i: number) => (
            <Image
              key={i}
              source={{ uri }}
              style={[
                styles.horiStackImg,
                {
                  marginLeft: i > 0 ? -12 : 0,
                  zIndex: 3 - i,
                  borderColor: colors.card,
                }
              ]}
            />
          ))}
          {exImages.length === 0 && (
            <View style={[styles.horiStackImg, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', marginLeft: 0 }]}>
              <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={[styles.horiSplitName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.horiSplitSessions, { color: colors.textMuted }]}>{item.session_count} sessions</Text>
        {item.is_already_added ? (
          <View style={[styles.horiBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={10} color={colors.textMuted} />
            <Text style={[styles.horiBadgeText, { color: colors.textMuted }]}>Added</Text>
          </View>
        ) : (
          <View style={[styles.horiBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Ionicons name="add-circle-outline" size={10} color={colors.primary} />
            <Text style={[styles.horiBadgeText, { color: colors.primary }]}>Add</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderUserRow = ({ item }: { item: { id: number; name: string; pic: string; splits: any[] } }) => (
    <View style={styles.userRow}>
      <View style={styles.userRowHeader}>
        <TouchableOpacity
          style={styles.userRowProfile}
          activeOpacity={0.7}
          onPress={() => router.push(`/profile/${item.id}`)}
        >
          {item.pic ? (
            <Image source={{ uri: item.pic }} style={styles.userRowAvatar} />
          ) : (
            <View style={[styles.userRowAvatar, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="person" size={14} color={colors.textMuted} />
            </View>
          )}
          <Text style={[styles.userRowName, { color: colors.text }]}>@{item.name?.replace(/\s/g, '') || 'user'}</Text>
        </TouchableOpacity>
        <Text style={[styles.userRowCount, { color: colors.textMuted }]}>{item.splits.length} split{item.splits.length > 1 ? 's' : ''}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horiScrollContent}
        decelerationRate="fast"
        snapToInterval={splitCardWidth + 10}
        snapToAlignment="start"
      >
        {item.splits.map(s => renderHorizontalSplit(s))}
        {item.splits.length > 2 && (
          <TouchableOpacity
            style={[styles.viewAllCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: `/splits/user/${item.id}`,
              params: { name: item.name, pic: item.pic, count: String(item.splits.length) }
            })}
          >
            <Ionicons name="grid-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.viewAllLabel, { color: colors.textMuted }]}>View all</Text>
            <Text style={[styles.viewAllCount, { color: colors.textMuted }]}>{item.splits.length} programs</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'my') {
      if (loading) return <SplitsSkeleton />;

      if (splits.length === 0) {
        return (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="layers-plus" size={80} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Programs Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Start with an expert split or build your own custom program from scratch.
            </Text>
            <TouchableOpacity
              style={[styles.createNowBtn, { backgroundColor: '#7C3AED', marginBottom: 12 }]}
              onPress={() => router.push('/splits/templates')}
            >
              <Ionicons name="albums-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.createNowText}>BROWSE EXPERT SPLITS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createNowBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/splits/create')}
            >
              <Text style={styles.createNowText}>CREATE FROM SCRATCH</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <FlatList
          key="splits-grid"
          data={splits}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => renderSplit({ item, index })}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.templatesBanner}
              onPress={() => router.push('/splits/templates')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
              />
              <View style={styles.bannerIcon}>
                <Ionicons name="albums" size={22} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.templatesBannerTitle}>Browse Expert Splits</Text>
                <Text style={styles.templatesBannerSub}>Elite programs for faster results</Text>
              </View>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>NEW</Text>
              </View>
            </TouchableOpacity>
          }
        />
      );
    }

    // Community tab
    const showSearch = sharedSplits.length > 0 || searchQuery.length > 0;

    if (sharedLoading && sharedSplits.length === 0) return <SplitsSkeleton />;

    return (
      <FlatList
        key="community-rows"
        data={userGroups}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUserRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.searchWrap, { backgroundColor: isDark ? colors.inputBg : '#FFF', borderColor: isDark ? colors.border : 'rgba(37,150,190,0.2)' }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setHasMore(true); fetchSharedSplits('', 1, false); }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          !sharedLoading ? (
            <View style={styles.centered}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="account-group-outline" size={64} color={colors.border} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 22 }]}>
                {searchQuery ? 'No users found' : 'No Community Splits'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {searchQuery
                  ? `No users matching "${searchQuery}"`
                  : 'No one has shared their programs yet. Enable sharing in your settings to contribute!'}
              </Text>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Programs</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {activeTab === 'my' ? 'Custom split groups' : 'From the community'}
            </Text>
          </View>
          {activeTab === 'my' && (
            <View style={styles.headerBtns}>
              <TouchableOpacity
                style={[styles.templateBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => router.push('/splits/templates')}
              >
                <Ionicons name="albums-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/splits/create')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.addBtnGradient}
                >
                  <Ionicons name="add" size={24} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Instagram-style segmented control */}
        <View style={styles.segmentWrap}>
          <View style={[styles.segmentTrack, { backgroundColor: isDark ? colors.inputBg : '#F0F0F0' }]}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.segmentPill,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveTab(tab.key);
                    if (tab.key === 'community') {
                      fetchSharedSplits(searchQuery, 1, false);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: isActive ? '#FFF' : (isDark ? colors.textMuted : '#666') },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {renderContent()}

        <ConfirmationModal
          visible={deleteId !== null}
          title="Delete Program"
          message="Are you sure you want to delete this program? All sessions and exercises inside will be permanently removed."
          confirmText={isDeleting ? 'DELETING...' : 'DELETE ALL'}
          onConfirm={onConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    paddingTop: 4,
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  templateBtn: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    borderRadius: 12, overflow: 'hidden', elevation: 4,
    shadowColor: '#2596BE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  addBtnGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Segmented Control
  segmentWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },

  templatesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 24, padding: 18, marginBottom: 20, overflow: 'hidden',
    width: '100%',
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  templatesBannerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF' },
  templatesBannerSub: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bannerBadge: {
    backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  bannerBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#7C3AED' },

  listContent: { paddingHorizontal: 16, paddingBottom: 130, flexGrow: 1 },
  columnWrapper: { justifyContent: 'space-between', gap: 12 },

  // Split Card
  splitCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: { padding: 4 },
  splitName: { fontFamily: FONTS.bodyBold, fontSize: 16, marginTop: 12 },

  cardStatsArea: {
    marginTop: 8,
    gap: 4,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontFamily: FONTS.body, fontSize: 11 },

  cardFooterArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  miniImageStack: {
    width: 45,
    height: 40,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  miniThumbnailFront: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 2,
  },
  miniThumbnailBack: {
    width: 36,
    height: 36,
    borderRadius: 8,
    position: 'absolute',
    zIndex: 1,
  },

  // Search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },

  // User row
  userRow: {
    marginBottom: 20,
  },
  userRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userRowProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userRowAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userRowName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  userRowCount: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  horiScrollContent: {
    gap: 10,
    paddingRight: 20,
  },

  // Horizontal split card
  horiSplitCard: {
    width: 160,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  horiImageStack: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    marginBottom: 2,
  },
  horiStackImg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
  },
  horiSplitName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  horiSplitSessions: {
    fontFamily: FONTS.body,
    fontSize: 10,
  },
  horiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  horiBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
  },

  // View all card
  viewAllCard: {
    width: 100,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    padding: 10,
  },
  viewAllLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  viewAllCount: {
    fontFamily: FONTS.body,
    fontSize: 9,
  },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 100 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 28, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  createNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createNowText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' },
});
