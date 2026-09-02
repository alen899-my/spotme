import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ActionModal from '../../components/ui/ActionModal';
import { SplitsSkeleton } from '../../components/ui/Skeleton';
import SplitCard from '../../components/ui/SplitCard';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const TABS = [
  { key: 'my', label: 'My Programs' },
  { key: 'community', label: 'Community' },
] as const;

type TabKey = typeof TABS[number]['key'];

const SORT_OPTIONS = [
  { key: '', label: 'Default' },
  { key: 'avg_rating', label: 'Top Rated' },
  { key: 'user_count', label: 'Most Popular' },
  { key: 'session_count', label: 'Most Sessions' },
  { key: 'created_at', label: 'Newest' },
] as const;

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

  // Sort/Filter state
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minRating, setMinRating] = useState(0);
  const [minUserCount, setMinUserCount] = useState(0);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Deletion state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSplits = useCallback(async () => {
    try {
      const token = await getToken();
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
      const token = await getToken();
      const params: any = { page: pageNum, limit: 10 };
      if (q && q.trim()) params.q = q.trim();
      if (sortBy) { params.sort = sortBy; params.order = sortOrder; }
      if (minRating > 0) params.min_rating = minRating;
      if (minUserCount > 0) params.min_user_count = minUserCount;
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
  }, [sortBy, sortOrder, minRating, minUserCount]);

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

  const handleSort = (key: string) => {
    setSortBy(key);
    setSortOrder('desc');
    setPage(1);
    setSharedSplits([]);
    fetchSharedSplits(searchQuery, 1, false);
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
    setPage(1);
    setSharedSplits([]);
    fetchSharedSplits(searchQuery, 1, false);
  };

  const handleClearFilters = () => {
    setMinRating(0);
    setMinUserCount(0);
    setShowFilterModal(false);
    setPage(1);
    setSharedSplits([]);
    fetchSharedSplits(searchQuery, 1, false);
  };

  const hasActiveFilters = minRating > 0 || minUserCount > 0;

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
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

  const renderSplit = ({ item }: { item: any }) => (
    <SplitCard item={item} onDelete={handleDelete} />
  );

  const renderSharedSplit = ({ item }: { item: any }) => {
    const mappedItem = {
      ...item,
      original_creator_name: item.creator_name,
      original_creator_pic: item.creator_pic,
      original_creator_id: item.creator_id,
    };
    return (
      <SplitCard
        item={mappedItem}
        onPress={() => router.push({
          pathname: `/splits/${item.id}`,
          params: { shared: '1', creatorName: item.creator_name, creatorPic: item.creator_pic || '', splitName: item.name }
        })}
      />
    );
  };

  const renderContent = () => {
    if (activeTab === 'my') {
      if (loading) return <SplitsSkeleton />;

      const renderAIHeader = () => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/splits/ai-builder' as any)}
          style={[
            styles.aiBannerCard,
            {
              backgroundColor: isDark ? '#0D161C' : '#F0F9FF',
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.aiBannerContent}>
            <View style={[styles.aiBannerIconWrap, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.aiBannerTitle, { color: colors.text }]}>Build Split with AI</Text>
                <View style={[styles.aiBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.aiBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={[styles.aiBannerSub, { color: colors.textMuted }]}>
                Auto-tailored to your goal with 1,300+ library exercises & progressive overload
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
      );

      if (splits.length === 0) {
        return (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="layers-plus" size={80} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Programs Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Build a science-backed routine with Coach Spotty AI or create one from scratch.
            </Text>
            <View style={{ gap: 10, width: '100%', maxWidth: 280, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.createNowBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                onPress={() => router.push('/splits/ai-builder' as any)}
              >
                <Ionicons name="sparkles" size={16} color="#FFF" />
                <Text style={styles.createNowText}>BUILD WITH AI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createNowBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
                onPress={() => router.push('/splits/create')}
              >
                <Text style={[styles.createNowText, { color: colors.text }]}>CREATE FROM SCRATCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return (
        <FlatList
          key="splits-grid"
          data={splits}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderSplit({ item })}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderAIHeader}
        />
      );
    }

    // Community tab
    if (sharedLoading && sharedSplits.length === 0) return <SplitsSkeleton />;

    return (
      <FlatList
        key="community-splits"
        data={sharedSplits}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSharedSplit}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
              {SORT_OPTIONS.map((opt) => {
                const isActive = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortChip,
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleSort(opt.key)}
                  >
                    <Text style={[styles.sortChipText, { color: isActive ? '#FFF' : colors.textMuted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: colors.border }]}
                activeOpacity={0.75}
                onPress={() => setShowFilterModal(true)}
              >
                <Ionicons name="options-outline" size={16} color={hasActiveFilters ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
            {hasActiveFilters && (
              <View style={styles.activeFiltersRow}>
                <Text style={[styles.activeFiltersText, { color: colors.textMuted }]}>
                  {minRating > 0 && `Min rating: ${minRating}`}
                  {minRating > 0 && minUserCount > 0 ? ' | ' : ''}
                  {minUserCount > 0 && `Min users: ${minUserCount}`}
                </Text>
                <TouchableOpacity onPress={handleClearFilters}>
                  <Text style={[styles.clearFiltersBtn, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
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
                {searchQuery ? 'No programs found' : 'No Community Splits'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {searchQuery
                  ? `No programs matching "${searchQuery}"`
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
             
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

        <ActionModal
          visible={deleteId !== null}
          type="delete"
          title="Delete Program"
          message="Are you sure you want to delete this program? All sessions and exercises inside will be permanently removed."
          confirmText={isDeleting ? 'DELETING...' : 'DELETE ALL'}
          onConfirm={onConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />

        {/* Filter Modal */}
        <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
          <View style={[styles.filterOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowFilterModal(false)} />
            <View style={[styles.filterContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.filterHeader}>
                <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.filterSectionLabel, { color: colors.text }]}>Minimum Rating</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsRow}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.filterOption,
                      minRating === n && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setMinRating(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptionText, { color: minRating === n ? '#FFF' : colors.textMuted }]}>
                      {n === 0 ? 'Any' : n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.filterSectionLabel, { color: colors.text }]}>Minimum Users</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsRow}>
                {[
                  { label: 'Any', value: 0 },
                  { label: '5+', value: 5 },
                  { label: '10+', value: 10 },
                  { label: '25+', value: 25 },
                  { label: '50+', value: 50 },
                  { label: '100+', value: 100 },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.filterOption,
                      minUserCount === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setMinUserCount(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptionText, { color: minUserCount === opt.value ? '#FFF' : colors.textMuted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[styles.filterClearBtn, { borderColor: colors.border }]}
                  onPress={handleClearFilters}
                >
                  <Text style={[styles.filterClearText, { color: colors.textMuted }]}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterApplyBtn, { backgroundColor: colors.primary }]}
                  onPress={handleApplyFilters}
                >
                  <Text style={styles.filterApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

  listContent: { paddingHorizontal: 16, paddingBottom: 130, flexGrow: 1 },

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

  // Sort chips
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingRight: 16,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  sortChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  activeFiltersText: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  clearFiltersBtn: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },

  // Filter modal
  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  filterTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  filterSectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    marginBottom: 10,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterOption: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(128,128,128,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  filterOptionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterClearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterClearText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  filterApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterApplyText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
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

  // AI Split Builder Header & Banner
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiHeaderBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  aiBannerCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  aiBannerSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 16,
  },
});
