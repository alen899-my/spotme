import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;
const PAGE_SIZE = 20;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const HEADER_IMAGE = require('../../assets/home/firstscreenbg.png');

type AccentTheme = {
  gradient: [string, string];
  glow: string;
};

const ACCENTS: Record<string, AccentTheme> = {
  back: { gradient: [P.ctaDeep, P.ctaDark], glow: 'rgba(247,203,22,0.18)' },
  chest: { gradient: [P.cta, P.ctaDark], glow: 'rgba(255,255,255,0.10)' },
  waist: { gradient: [P.ctaDark, P.ctaDeep], glow: 'rgba(247,203,22,0.14)' },
  'upper legs': { gradient: [P.cta, P.ctaDeep], glow: 'rgba(247,203,22,0.16)' },
  'lower legs': { gradient: [P.ctaDark, P.cta], glow: 'rgba(255,255,255,0.10)' },
  shoulders: { gradient: [P.ctaDeep, P.cta], glow: 'rgba(247,203,22,0.20)' },
  'upper arms': { gradient: [P.ctaDark, P.ctaDeep], glow: 'rgba(255,255,255,0.10)' },
  'lower arms': { gradient: [P.cta, P.ctaDark], glow: 'rgba(247,203,22,0.14)' },
  neck: { gradient: [P.ctaDeep, P.ctaDark], glow: 'rgba(247,203,22,0.16)' },
  cardio: { gradient: [P.cta, P.ctaDeep], glow: 'rgba(255,255,255,0.08)' },
};

const accentFor = (category?: string | null): AccentTheme =>
  ACCENTS[category?.toLowerCase() ?? ''] ?? { gradient: [P.cta, P.ctaDark], glow: 'rgba(247,203,22,0.14)' };

const BODY_CATEGORY_MAP: Record<string, { label: string; categories: string[] }> = {
  chest: { label: 'Chest', categories: ['chest'] },
  'upper-back': { label: 'Upper Back', categories: ['back'] },
  'lower-back': { label: 'Lower Back', categories: ['back'] },
  trapezius: { label: 'Traps', categories: ['back', 'shoulders'] },
  deltoids: { label: 'Shoulders', categories: ['shoulders'] },
  biceps: { label: 'Biceps', categories: ['upper arms'] },
  triceps: { label: 'Triceps', categories: ['upper arms'] },
  forearm: { label: 'Forearms', categories: ['lower arms'] },
  abs: { label: 'Abs', categories: ['waist'] },
  obliques: { label: 'Obliques', categories: ['waist'] },
  gluteal: { label: 'Glutes', categories: ['upper legs'] },
  quadriceps: { label: 'Quads', categories: ['upper legs'] },
  hamstring: { label: 'Hamstrings', categories: ['upper legs'] },
  adductors: { label: 'Adductors', categories: ['upper legs'] },
  calves: { label: 'Calves', categories: ['lower legs'] },
  neck: { label: 'Neck', categories: ['neck'] },
};

const formatLabel = (value?: string | null) =>
  (value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getExerciseDescription = (item: any) => {
  const raw = typeof item?.instructions_en === 'string'
    ? item.instructions_en.replace(/\s+/g, ' ').trim()
    : '';

  if (!raw) return '';

  const firstSentence = raw.match(/.*?[.!?](\s|$)/)?.[0]?.trim() || raw;
  return firstSentence.length > 118
    ? `${firstSentence.slice(0, 115).trim()}...`
    : firstSentence;
};

const SkeletonCard = ({ tall = true }: { tall?: boolean }) => (
  <View
    style={[
      styles.card,
      styles.skeletonCard,
      {
        width: CARD_WIDTH,
        height: tall ? CARD_HEIGHT : CARD_WIDTH,
      },
    ]}
  >
    <View style={styles.skeletonGlow} />
  </View>
);

const CategoryCard = React.memo(({ item, onPress }: { item: any; onPress: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const theme = accentFor(item.category);
  const label = formatLabel(item.category);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, styles.categoryCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
    >
      <View style={styles.cardMedia}>
        <LinearGradient
          colors={[P.offWhite, P.ctaLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.mediaGlow, { backgroundColor: theme.glow }]} />

        <View style={styles.imageContainer}>
          {item.image_url && !imgError ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.floatingImage}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Ionicons name="fitness-outline" size={64} color={P.cta} />
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardCountText}>{item.exercise_count || 0} exercises</Text>
          <View style={styles.categoryArrow}>
            <Ionicons name="arrow-forward" size={14} color={P.ink} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ExerciseCard = React.memo(({ item }: { item: any }) => {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const theme = accentFor(item.category);
  const description = getExerciseDescription(item);
  const tagItems = [item.target, item.equipment]
    .filter(Boolean)
    .map((value) => formatLabel(value));
  const imageUri = item.image_url || item.gif_url || null;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(`/exercises/${item.id}`)}
      style={[styles.card, styles.exerciseTryCard]}
    >
      <View style={styles.exercisePillRow}>
        {item.category ? (
          <View style={styles.exerciseScorePill}>
            <Ionicons name="fitness-outline" size={11} color={P.sun} />
            <Text style={styles.exerciseScorePillText}>{formatLabel(item.category)}</Text>
          </View>
        ) : (
          <View />
        )}

        {item.avg_rating !== undefined && item.avg_rating !== null && (
          <View style={styles.exerciseRatingPill}>
            <Ionicons name="star" size={11} color={P.ink} />
            <Text style={styles.exerciseRatingPillText}>{item.avg_rating}</Text>
          </View>
        )}
      </View>

      <View style={styles.exerciseBodyRow}>
        <View style={styles.exerciseTextBlock}>
          <Text style={styles.exName} numberOfLines={2}>
            {item.name}
          </Text>

          {description ? (
            <Text style={styles.exerciseDescription} numberOfLines={2}>
              {description}
            </Text>
          ) : null}

          {tagItems.length > 0 ? (
            <View style={styles.exerciseTagsRow}>
              {tagItems.map((tag) => (
                <View key={`${item.id}-${tag}`} style={styles.exerciseTag}>
                  <Text style={styles.exerciseTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {imageUri && !imgError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.exerciseThumb}
            onError={() => setImgError(true)}
          />
        ) : null}
        {!imageUri || imgError ? (
          <View style={[styles.exerciseThumb, styles.exerciseThumbPlaceholder]}>
            <LinearGradient
              colors={[P.ctaDark, P.ctaDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.exerciseThumbGlow, { backgroundColor: theme.glow }]} />
            <Ionicons name="barbell-outline" size={30} color={P.sun} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'categories' | 'exercises'>('categories');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catError, setCatError] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTotal, setSearchTotal] = useState(0);
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>('male');
  const [selectedMuscles, setSelectedMuscles] = useState<Slug[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<{ slug: Slug; label: string; categories: string[] } | null>(null);
  const [regionModalVisible, setRegionModalVisible] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const fetchBodyProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;
        const res = await axios.get(`${API_URL}/daily/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const gender = String(res.data?.user?.gender || '').toLowerCase();
        if (gender === 'male' || gender === 'female') {
          setBodyGender(gender);
        }
      } catch {}
    };

    fetchBodyProfile();
  }, []);

  const doFetchExercises = useCallback(async (q: string, cat: string | null, pg: number, append: boolean) => {
    if (pg === 1) setSearching(true);
    else setLoadingMore(true);

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
      if (append) setSearchResults((prev) => [...prev, ...data]);
      else setSearchResults(data);
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

  const handleCategoryPress = (category: string) => {
    setViewMode('exercises');
    setDrilldownCategory(category);
    setQuery('');
    setSearchPage(1);
    setHasMore(true);
    setRegionModalVisible(false);
    doFetchExercises('', category, 1, false);
  };

  const handleBack = () => {
    setViewMode('categories');
    setDrilldownCategory(null);
    setQuery('');
    setSearchResults([]);
    setSearchPage(1);
    setHasMore(true);
  };

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    const slug = part.slug as Slug | undefined;
    if (!slug) return;

    const region = BODY_CATEGORY_MAP[String(slug)];
    if (!region) return;

    setSelectedMuscles([slug]);
    setSelectedRegion({
      slug,
      label: region.label,
      categories: Array.from(new Set(region.categories)),
    });
    setRegionModalVisible(true);
  };

  const highlightedBodyParts: ExtendedBodyPart[] = selectedMuscles.map((slug) => ({
    slug,
    intensity: 3 as const,
  }));

  const modalCategories = (selectedRegion?.categories || []).map((category) => {
    const match = categories.find((item) => item.category?.toLowerCase() === category.toLowerCase());
    return {
      key: category,
      label: formatLabel(category),
      count: match?.exercise_count ?? null,
    };
  });

  const renderExercise = useCallback(
    ({ item }: any) => <ExerciseCard item={item} />,
    []
  );

  const renderSearchFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator size="small" color={P.cta} style={{ paddingVertical: 20 }} />;
  };

  const renderBodyExplorer = () => (
    <View style={styles.bodySection}>
      <View style={styles.bodySectionHeader}>
        <View>
          <Text style={styles.bodySectionTitle}>Browse by body area</Text>
          <Text style={styles.bodySectionSub}>Tap a muscle, see the mapped category, then jump into exercises.</Text>
        </View>

        <View style={styles.toggleTrack}>
          {(['front', 'back'] as const).map((side) => (
            <TouchableOpacity
              key={side}
              onPress={() => setBodySide(side)}
              style={[styles.toggleBtn, bodySide === side && styles.toggleBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleTxt, bodySide === side && styles.toggleTxtActive]}>
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bodyExplorerCard}>
        <View style={styles.bodyWrap}>
          <Body
            data={highlightedBodyParts}
            gender={bodyGender}
            side={bodySide}
            scale={1.15}
            colors={['#F7CB1644', '#F7CB16AA', '#F7CB16']}
            defaultFill={'#1a3a45'}
            defaultStroke={'rgba(255,255,255,0.2)'}
            defaultStrokeWidth={0.5}
            onBodyPartPress={handleBodyPartPress}
          />
        </View>

        <Text style={styles.bodyHint}>
          Selected muscles glow yellow. Tap again on another area to open the linked exercise category.
        </Text>
      </View>
    </View>
  );

  const inSearchMode = query.length > 0;
  const title = viewMode === 'exercises' ? formatLabel(drilldownCategory) : 'Exercises';
  const appHeaderTopPad = insets.top;
  const appHeaderHeight = appHeaderTopPad + Math.round((SCREEN_WIDTH / 390) * 52);
  const heroTopPadding = appHeaderHeight - appHeaderTopPad + 12;
  const subtitle =
    inSearchMode && !searching
      ? `${searchTotal.toLocaleString()} results`
      : viewMode === 'exercises' && !searching
        ? `${searchTotal.toLocaleString()} movements`
        : !loadingCats
          ? `${categories.length} categories`
          : 'Loading your library';

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={HEADER_IMAGE}
        style={[styles.hero, { paddingTop: heroTopPadding }]}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            {viewMode === 'exercises' && (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={P.sun} />
              </TouchableOpacity>
            )}
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSub}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="fitness" size={24} color={P.ink} />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.searchWrap}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={16} color={P.ctaDark} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={P.muted}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={P.cta} />
          </TouchableOpacity>
        )}
      </View>

      {!inSearchMode && viewMode === 'categories' && (
        catError ? (
          <View style={styles.centeredMsg}>
            <View style={styles.messageIconWrap}>
              <Ionicons name="cloud-offline-outline" size={30} color={P.ctaDark} />
            </View>
            <Text style={styles.msgTitle}>Could not load categories</Text>
            <Text style={styles.msgText}>Please try again and we will pull the exercise library back in.</Text>
            <TouchableOpacity onPress={fetchCategories} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[] as number[]}
            keyExtractor={(_, index) => String(index)}
            renderItem={() => null}
            ListHeaderComponent={renderBodyExplorer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {(inSearchMode || viewMode === 'exercises') && (
        searching ? (
          <View style={styles.centeredMsg}>
            <ActivityIndicator size="large" color={P.cta} />
            <Text style={styles.msgText}>Loading exercises...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centeredMsg}>
            <View style={styles.messageIconWrap}>
              <Ionicons name="search-outline" size={30} color={P.ctaDark} />
            </View>
            <Text style={styles.msgTitle}>No exercises found</Text>
            <Text style={styles.msgText}>Try a different keyword or browse one of the blue library cards.</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderExercise}
            contentContainerStyle={styles.exerciseListContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderSearchFooter}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )
      )}

      <Modal
        visible={regionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setRegionModalVisible(false)}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{selectedRegion?.label || 'Muscle Group'}</Text>
            <Text style={styles.modalSub}>Choose a mapped category to open its exercises.</Text>

            {modalCategories.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.modalCategoryBtn}
                activeOpacity={0.86}
                onPress={() => handleCategoryPress(item.key)}
              >
                <View>
                  <Text style={styles.modalCategoryTitle}>{item.label}</Text>
                  <Text style={styles.modalCategoryCount}>
                    {item.count !== null ? `${item.count} exercises` : 'Open category'}
                  </Text>
                </View>
                <View style={styles.modalArrow}>
                  <Ionicons name="arrow-forward" size={15} color={P.ink} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: P.offWhite,
  },

  hero: {
    paddingHorizontal: H_PADDING,
    paddingTop: 10,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,40,43,0.56)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextWrap: {
    flexShrink: 1,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    color: P.white,
    letterSpacing: 0.4,
  },
  headerSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(214,238,247,0.92)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: P.sun,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(247,203,22,0.35)',
  },

  bodySection: {
    marginBottom: 18,
  },
  bodySectionHeader: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  bodySectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: P.ink,
    letterSpacing: 0.3,
  },
  bodySectionSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: P.muted,
    marginTop: 2,
    maxWidth: '100%',
    lineHeight: 18,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: P.ctaDeep,
    borderRadius: 20,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: P.sun,
  },
  toggleTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#A8DFF0',
  },
  toggleTxtActive: {
    color: P.ink,
  },
  bodyExplorerCard: {
    paddingTop: 4,
  },
  bodyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bodyHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
    textAlign: 'center',
    opacity: 0.9,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PADDING,
    marginTop: -18,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 18,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.border,
    gap: 10,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 3,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.ctaLight,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: P.ink,
    height: '100%',
    paddingVertical: 0,
  },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 18,
    paddingBottom: 40,
  },
  exerciseListContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 18,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 9,
  },
  skeletonCard: {
    backgroundColor: P.ctaLight,
    borderWidth: 1,
    borderColor: P.border,
  },
  skeletonGlow: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(247,203,22,0.22)',
  },

  categoryCard: {
    borderWidth: 1,
    borderColor: P.border,
  },
  cardMedia: {
    flex: 0.6,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGlow: {
    position: 'absolute',
    top: -18,
    right: -12,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  cardFooter: {
    flex: 0.4,
    backgroundColor: P.ctaDeep,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  categoryArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.sun,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 8,
  },
  floatingImage: {
    width: '88%',
    height: '88%',
    opacity: 0.96,
  },
  cardLabel: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: P.sun,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardInfoRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCountText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: P.sunLight,
    letterSpacing: 0.2,
  },

  exerciseTryCard: {
    width: '100%',
    backgroundColor: P.cta,
    borderWidth: 0,
    padding: 18,
  },
  exercisePillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  exerciseScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: P.ctaDark,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '72%',
  },
  exerciseScorePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#D6EEF7',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  exerciseRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.sun,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exerciseRatingPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: P.ink,
  },
  exerciseBodyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseTextBlock: {
    flex: 1,
  },
  exerciseThumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    resizeMode: 'cover',
    flexShrink: 0,
  },
  exerciseThumbPlaceholder: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseThumbGlow: {
    position: 'absolute',
    top: -14,
    right: -12,
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  exerciseTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  exerciseTag: {
    backgroundColor: P.ctaDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exerciseTagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#D6EEF7',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  exName: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: P.white,
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 2,
  },
  exerciseDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
    color: '#D6EEF7',
    marginTop: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,40,43,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    backgroundColor: P.cta,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 46,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.38)',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: P.sun,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: P.sunLight,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modalCategoryTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: P.white,
  },
  modalCategoryCount: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: P.sunLight,
    marginTop: 3,
  },
  modalArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.sun,
  },

  centeredMsg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  messageIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: P.sunLight,
    borderWidth: 1,
    borderColor: 'rgba(37,150,190,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: P.ink,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  msgText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: P.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: P.cta,
  },
  retryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: P.white,
  },
});
