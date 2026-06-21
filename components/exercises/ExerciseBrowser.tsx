import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import ExerciseFilterModal, { ExerciseFilters } from './ExerciseFilterModal';
import ExerciseCard from './ExerciseCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const PAGE_SIZE = 20;

export type BrowserVariant = 'browse' | 'add' | 'compact';

interface SortOption {
  sort_by: string;
  sort_order: 'asc' | 'desc';
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { sort_by: 'name', sort_order: 'asc', label: 'Name A-Z' },
  { sort_by: 'name', sort_order: 'desc', label: 'Name Z-A' },
  { sort_by: 'avg_rating', sort_order: 'desc', label: 'Rating (High)' },
  { sort_by: 'avg_rating', sort_order: 'asc', label: 'Rating (Low)' },
];

interface ExerciseBrowserProps {
  apiEndpoint: '/exercises' | '/workouts/exercises/search';
  variant?: BrowserVariant;
  drilldownCategory?: string | null;
  onSelectExercise?: (exercise: any) => void;
  onAddExercise?: (exercise: any) => void;
  sessionId?: string | null;
  addingId?: string | null;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  filterDrilldownCategory?: string | null;
  emptyMessage?: string;
  extraParams?: Record<string, any>;
}

export default function ExerciseBrowser({
  apiEndpoint,
  variant = 'browse',
  drilldownCategory = null,
  onSelectExercise,
  onAddExercise,
  sessionId,
  addingId,
  showHeader = false,
  headerTitle,
  headerSubtitle,
  filterDrilldownCategory,
  emptyMessage = 'No exercises found',
  extraParams,
}: ExerciseBrowserProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<ExerciseFilters>({
    categories: [], bodyParts: [], equipment: [], targets: [], minRating: 0,
  });
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(drilldownCategory);
  const [visibleIds, setVisibleIds] = useState<Set<string | number>>(new Set());

  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount = (f: ExerciseFilters) => {
    let c = f.categories.length + f.bodyParts.length + f.equipment.length + f.targets.length;
    if (f.minRating > 0) c++;
    return c;
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 380);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/exercises/meta/filters`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setCategories(res.data.categories || []);
      } catch { }
    };
    fetchCats();
  }, []);

  const doFetch = useCallback(async (pg: number, append: boolean, searchQuery: string, cat: string | null, sort: SortOption) => {
    if (append && loadingMore) return;
    if (!append && loading) return;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const token = await getToken();
      const f = filtersRef.current;
      const params: any = {};

      const isOffsetApi = apiEndpoint === '/workouts/exercises/search';

      if (isOffsetApi) {
        params.limit = PAGE_SIZE;
        params.offset = pg === 1 ? 0 : (pg - 1) * PAGE_SIZE;
      } else {
        params.page = pg;
        params.limit = PAGE_SIZE;
      }

      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (cat) {
        params.category = cat;
      } else if (f.categories.length) {
        params.category = f.categories.join(',');
      }
      if (f.bodyParts.length) params.body_part = f.bodyParts.join(',');
      if (f.equipment.length) params.equipment = f.equipment.join(',');
      if (f.targets.length) params.target = f.targets.join(',');
      if (f.minRating > 0) params.min_rating = f.minRating;
      if (extraParams) Object.assign(params, extraParams);

      params.sort_by = sort.sort_by;
      params.sort_order = sort.sort_order;

      const url = `${API_URL}${apiEndpoint}`;
      const res = await axios.get(url, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      let data: any[] = [];
      let hasMoreData = false;

      if (isOffsetApi) {
        data = res.data ?? [];
        hasMoreData = data.length === PAGE_SIZE;
      } else {
        data = res.data?.data ?? [];
        const pagination = res.data?.pagination;
        hasMoreData = pagination ? pg < pagination.totalPages : data.length === PAGE_SIZE;
      }

      if (append) setExercises(prev => [...prev, ...data]);
      else setExercises(data);

      setHasMore(hasMoreData);
      setPage(pg);
    } catch {
      showToast('Failed to load exercises', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiEndpoint, loading, loadingMore, showToast, extraParams]);

  useEffect(() => {
    doFetch(1, false, debouncedQuery, selectedCategory, sortOption);
  }, [debouncedQuery, selectedCategory, sortOption]);

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(prev => (prev === cat ? null : cat));
    setPage(1);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    doFetch(page + 1, true, debouncedQuery, selectedCategory, sortOption);
  };

  const handleApplyFilters = (newFilters: ExerciseFilters, newSort?: SortOption) => {
    setFilters(newFilters);
    if (newSort) setSortOption(newSort);
    setFilterVisible(false);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ categories: [], bodyParts: [], equipment: [], targets: [], minRating: 0 });
    setFilterVisible(false);
    setPage(1);
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const ids = new Set<string | number>();
    viewableItems.forEach((vi: any) => {
      if (vi.item?.id) ids.add(vi.item.id);
    });
    setVisibleIds(ids);
  }).current;

  const renderHeader = () => {
    if (!showHeader) return null;
    return (
      <View style={[styles.headerSection, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle || 'Exercises'}</Text>
        {headerSubtitle && <Text style={[styles.headerSub, { color: colors.textMuted }]}>{headerSubtitle}</Text>}
      </View>
    );
  };

  const renderSearchFilter = () => (
    <View style={styles.searchFilterRow}>
      <View style={[styles.searchWrap, { backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : P.border, flex: 1 }]}>
        <View style={[styles.searchIconWrap, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : P.ctaLight }]}>
          <Ionicons name="search-outline" size={16} color={P.ctaDark} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: isDark ? '#F1F5F9' : P.ink }]}
          placeholder="Search exercises..."
          placeholderTextColor={isDark ? 'rgba(241,245,249,0.4)' : P.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={P.cta} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.filterBtn, { backgroundColor: activeFilterCount(filters) > 0 ? '#2596BE' : isDark ? '#1A1A1A' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : P.border }]}
        onPress={() => setFilterVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="funnel" size={18} color={activeFilterCount(filters) > 0 ? '#FFF' : isDark ? '#F1F5F9' : P.ink} />
        {activeFilterCount(filters) > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount(filters)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderChips = () => (
    <View style={styles.chipsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              { backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : P.border },
              selectedCategory === cat && { backgroundColor: P.cta, borderColor: P.cta },
            ]}
            onPress={() => handleCategoryPress(cat)}
          >
            <Text style={[
              styles.categoryChipText,
              { color: isDark ? '#F1F5F9' : P.ink },
              selectedCategory === cat && { color: '#FFF' },
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderExerciseItem = ({ item }: { item: any }) => (
    <View style={{ paddingHorizontal: H_PADDING, marginBottom: 12 }}>
      <ExerciseCard
        exercise={item}
        variant={variant === 'compact' ? 'compact' : variant === 'add' ? 'add' : 'browse'}
        isFocused={visibleIds.has(item.id)}
        onPress={onSelectExercise}
        onAdd={onAddExercise}
        addingId={addingId}
      />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator size="small" color={P.cta} style={{ paddingVertical: 20 }} />;
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyMessage}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSearchFilter()}
      {renderChips()}

      {loading && exercises.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={P.cta} />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => String(item.id)}
          renderItem={renderExerciseItem}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 64) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
        />
      )}

      <ExerciseFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        drilldownCategory={filterDrilldownCategory ?? drilldownCategory}
        sortOption={sortOption}
        onApply={(newFilters, newSort) => handleApplyFilters(newFilters, newSort)}
        onClear={handleClearFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    letterSpacing: 0.4,
  },
  headerSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PADDING,
    marginBottom: 12,
    gap: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
  },
  chipsWrap: {
    marginHorizontal: H_PADDING,
    marginBottom: 12,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: 'center',
  },
});
