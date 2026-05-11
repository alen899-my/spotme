import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING   = 16;
const CARD_GAP    = 12;
const CARD_WIDTH  = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;
const PAGE_SIZE   = 20;
const API_URL     = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Per-category accent colours ──────────────────────────────────────────────
const ACCENTS: Record<string, [string, string]> = {
  back:           ['#E00000', '#8B0000'],
  chest:          ['#FF6B35', '#C0392B'],
  waist:          ['#7C3AED', '#4C1D95'],
  'upper legs':   ['#0891B2', '#164E63'],
  'lower legs':   ['#059669', '#064E3B'],
  shoulders:      ['#D97706', '#78350F'],
  'upper arms':   ['#DC2626', '#7F1D1D'],
  'lower arms':   ['#7C3AED', '#3B0764'],
  neck:           ['#6366F1', '#312E81'],
  cardio:         ['#EC4899', '#831843'],
};
const accentFor = (cat: string): [string, string] =>
  ACCENTS[cat?.toLowerCase()] ?? ['#E00000', '#8B0000'];

// ─── Skeleton ────────────────────────────────────────────────────────────────
const SkeletonCard = ({ colors, tall = true }: { colors: any; tall?: boolean }) => (
  <View style={[
    styles.card,
    {
      width: CARD_WIDTH,
      height: tall ? CARD_HEIGHT : CARD_WIDTH * 0.72,
      backgroundColor: '#222', // Dark placeholder
      borderColor: 'transparent',
    },
  ]} />
);

// ─── Category card ────────────────────────────────────────────────────────────
const CategoryCard = React.memo(({ item, colors, onPress }: { item: any; colors: any; onPress: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [start] = accentFor(item.category);
  const label = item.category.charAt(0).toUpperCase() + item.category.slice(1);

  return (
    <TouchableOpacity activeOpacity={0.86}
      onPress={onPress}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: start,
          borderColor: 'transparent',
          overflow: 'hidden'
        }
      ]}
    >
      {item.image_url && !imgError ? (
        <Image
          source={{ uri: item.image_url }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.5 }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="fitness-outline" size={44} color="rgba(255,255,255,0.3)" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.cardBottom}>
        <Text style={[styles.cardLabel, { color: '#FFF' }]}>{label}</Text>
        {!!item.exercise_count && (
          <Text style={[styles.cardCount, { color: 'rgba(255,255,255,0.9)' }]}>
            {item.exercise_count} exercises
          </Text>
        )}
      </View>

      <View style={[styles.arrowWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Ionicons name="chevron-forward" size={14} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
});

// ─── Exercise result card (clean square grid) ──────────────────────────────────
const ExerciseCard = React.memo(({ item, colors, square = false }: { item: any; colors: any; square?: boolean }) => {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [accent] = accentFor(item.category);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(`/exercises/${item.id}`)}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: square ? CARD_WIDTH : CARD_WIDTH * 0.72,
          backgroundColor: '#E00000',
          borderColor: 'transparent',
          overflow: 'hidden'
        }
      ]}
    >
      {item.image_url && !imgError ? (
        <Image
          source={{ uri: item.image_url }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.65 }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="barbell-outline" size={32} color="rgba(255,255,255,0.3)" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Category chip - only show in search mode, not drilldown */}
      {!square && (
        <View style={[styles.chip, { backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.chipText}>{item.category}</Text>
        </View>
      )}

      <View style={styles.exCardBottom}>
        <Text style={[styles.exCardName, { color: '#FFF' }]} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ExercisesScreen() {
  const { colors } = useTheme();

  // Mode: 'categories' | 'exercises'
  const [viewMode, setViewMode] = useState<'categories' | 'exercises'>('categories');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  // Categories (default view)
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState(false);

  // Search / Drilldown state
  const [query, setQuery]                     = useState('');
  const [searchResults, setSearchResults]     = useState<any[]>([]);
  const [searching, setSearching]             = useState(false);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [searchPage, setSearchPage]           = useState(1);
  const [hasMore, setHasMore]                 = useState(true);
  const [searchTotal, setSearchTotal]         = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQuery   = useRef('');

  // ── Fetch categories ──────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoadingCats(true);
    setCatError(false);
    try {
      const res = await axios.get(`${API_URL}/exercises/categories`);
      setCategories(res.data);
    } catch {
      setCatError(true);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, []);

  // ── Search/Drilldown exercises ───────────────────────────────────────────
  const doFetchExercises = useCallback(async (q: string, cat: string | null, pg: number, append: boolean) => {
    if (pg === 1) setSearching(true);
    else          setLoadingMore(true);

    try {
      const params: any = { page: pg, limit: PAGE_SIZE };
      if (q.trim()) params.q = q.trim();
      if (cat) params.category = cat;

      const res = await axios.get(`${API_URL}/exercises`, { params });
      const { data, pagination } = res.data;
      setSearchTotal(pagination.total);
      setHasMore(pg < pagination.totalPages);
      if (append) setSearchResults(prev => [...prev, ...data]);
      else        setSearchResults(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!text.trim()) {
      if (viewMode === 'exercises' && drilldownCategory) {
        doFetchExercises('', drilldownCategory, 1, false);
      } else {
        setSearchResults([]);
      }
      setSearchPage(1);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      activeQuery.current = text;
      setSearchPage(1);
      setHasMore(true);
      doFetchExercises(text, drilldownCategory, 1, false);
    }, 380);
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchPage(1);
    if (viewMode === 'exercises' && drilldownCategory) {
      doFetchExercises('', drilldownCategory, 1, false);
    } else {
      setSearchResults([]);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || searching) return;
    const next = searchPage + 1;
    setSearchPage(next);
    doFetchExercises(query, drilldownCategory, next, true);
  };

  const handleCategoryPress = (cat: string) => {
    setViewMode('exercises');
    setDrilldownCategory(cat);
    setSearchPage(1);
    setHasMore(true);
    doFetchExercises('', cat, 1, false);
  };

  const handleBack = () => {
    setViewMode('categories');
    setDrilldownCategory(null);
    setQuery('');
    setSearchResults([]);
  };

  // ── Renderers ─────────────────────────────────────────────────────────────
  const renderCategory  = useCallback(({ item }: any) => (
    <CategoryCard
      item={item}
      colors={colors}
      onPress={() => handleCategoryPress(item.category)}
    />
  ), [colors]);

  const renderExercise  = useCallback(({ item }: any) => (
    <ExerciseCard
      item={item}
      colors={colors}
      square={viewMode === 'exercises'} // Square in category view
    />
  ), [colors, viewMode]);

  const renderSearchFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator size="small" color="#E00000" style={{ paddingVertical: 20 }} />;
  };

  const inSearchMode = query.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {viewMode === 'exercises' && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {viewMode === 'exercises' ? drilldownCategory : 'Exercises'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {inSearchMode && !searching
                ? `${searchTotal.toLocaleString()} results`
                : viewMode === 'exercises' && !searching
                ? `${searchTotal.toLocaleString()} movements`
                : !loadingCats
                ? `${categories.length} categories`
                : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="fitness-outline" size={22} color="#E00000" />
        </View>
      </View>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search exercises…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
          {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Grid Content ───────────────────────────────────────────────── */}
      {!inSearchMode && viewMode === 'categories' && (
        loadingCats ? (
          <FlatList
            data={Array.from({ length: 10 }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            renderItem={() => <SkeletonCard colors={colors} />}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        ) : catError ? (
          <View style={styles.centeredMsg}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
            <Text style={[styles.msgText, { color: colors.textMuted }]}>Failed to load</Text>
            <TouchableOpacity onPress={fetchCategories}
              style={[styles.retryBtn, { backgroundColor: '#E00000' }]}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.category}
            renderItem={renderCategory}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )
      )}

      {/* ── Results (Search or Category Exercises) ────────────────────── */}
      {(inSearchMode || viewMode === 'exercises') && (
        searching ? (
          <View style={styles.centeredMsg}>
            <ActivityIndicator size="large" color="#E00000" />
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centeredMsg}>
            <Ionicons name="search-outline" size={48} color={colors.border} />
            <Text style={[styles.msgText, { color: colors.textMuted }]}>No exercises found</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderExercise}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderSearchFooter}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 26, letterSpacing: 0.5 },
  headerSub:   { fontFamily: FONTS.body, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  headerIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PADDING,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },

  // Grid
  listContent: { paddingHorizontal: H_PADDING, paddingTop: 16, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: CARD_GAP },

  // Card shared
  card: {
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Category card internals
  accentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  cardBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, paddingBottom: 16,
  },
  cardLabel: {
    fontFamily: FONTS.heading, fontSize: 16, color: '#FFF', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  cardCount: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  arrowWrap: {
    position: 'absolute', bottom: 14, right: 14,
    width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },

  // Exercise card (search results)
  chip: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 9, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.4 },
  exCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  exCardName: {
    fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FFF', lineHeight: 16,
    textTransform: 'capitalize',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // States
  centeredMsg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  msgText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  retryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
});
