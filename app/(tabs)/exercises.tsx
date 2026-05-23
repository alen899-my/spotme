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
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─── Category card (Uber-Premium Look) ─────────────────────────────────────────
const CategoryCard = React.memo(({ item, colors, onPress }: { item: any; colors: any; onPress: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [start, end] = accentFor(item.category);
  const label = item.category.charAt(0).toUpperCase() + item.category.slice(1);

  return (
    <TouchableOpacity activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          backgroundColor: start,
          borderColor: 'transparent',
        }
      ]}
    >
      <LinearGradient
        colors={[start, end]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative large text behind */}
      <Text style={styles.cardBgLabel}>{label.slice(0, 3).toUpperCase()}</Text>

      {/* Image placement - shifted for a dynamic 'Uber' look */}
      <View style={styles.imageContainer}>
        {item.image_url && !imgError ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.floatingImage}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Ionicons name="fitness-outline" size={60} color="rgba(255,255,255,0.15)" />
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardLabelPremium}>{label}</Text>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardCountPremium}>{item.exercise_count || 0} exercises</Text>
          <View style={styles.miniArrow}>
            <Ionicons name="arrow-forward" size={12} color="#FFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Exercise card (Uber-Premium Square Look) ──────────────────────────────────
const ExerciseCard = React.memo(({ item, colors, square = false }: { item: any; colors: any; square?: boolean }) => {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [accent] = accentFor(item.category);
  const bgLabel = item.name.slice(0, 3).toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/exercises/${item.id}`)}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: square ? CARD_WIDTH : CARD_WIDTH * 0.75,
          backgroundColor: '#1A1A1A',
          borderColor: 'transparent',
        }
      ]}
    >
      {/* Decorative background label */}
      <Text style={[styles.cardBgLabel, { fontSize: 60, opacity: 0.1 }]}>{bgLabel}</Text>

      {item.image_url && !imgError ? (
        <Image
          source={{ uri: item.image_url }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.75 }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="barbell-outline" size={32} color="rgba(255,255,255,0.2)" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      {!square && (
        <View style={[styles.premiumChip, { backgroundColor: accent }]}>
          <Text style={styles.premiumChipText}>{item.category}</Text>
        </View>
      )}

      {item.avg_rating !== undefined && item.avg_rating !== null && (
        <View style={styles.ratingChip}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.ratingChipText}>{item.avg_rating}</Text>
        </View>
      )}

      <View style={styles.exCardContent}>
        <Text style={styles.exNamePremium} numberOfLines={2}>{item.name}</Text>
        {square && (
          <View style={styles.exTagRow}>
            <Text style={styles.exTargetPremium}>{item.target}</Text>
            <View style={styles.dot} />
            <Text style={styles.exTargetPremium}>{item.equipment}</Text>
          </View>
        )}
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

      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/exercises`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
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

  // Card shared (Uber Style: Flat with deep rounding and subtle shadows)
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },

  // Category Premium Internals
  cardBgLabel: {
    position: 'absolute',
    top: -10,
    right: -10,
    fontSize: 80,
    fontFamily: FONTS.heading,
    color: 'rgba(255,255,255,0.08)',
    zIndex: 0,
  },
  imageContainer: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: '80%',
    height: '70%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  floatingImage: {
    width: '100%',
    height: '100%',
    transform: [{ rotate: '-5deg' }, { scale: 1.1 }],
  },
  cardContent: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
    zIndex: 2,
  },
  cardLabelPremium: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: '#FFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  cardCountPremium: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  miniArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Exercise Premium Internals
  premiumChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 3,
  },
  premiumChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  exCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    zIndex: 3,
  },
  exNamePremium: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFF',
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  exTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 6,
  },
  exTargetPremium: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
  },

  // States
  centeredMsg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  msgText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  retryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
  ratingChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 3,
  },
  ratingChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
  },
});
