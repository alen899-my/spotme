import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../../constants/theme';
import { P } from '../../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '../../../../contexts/ToastContext';
import ExercisePreviewModal from '../../../../components/modals/ExercisePreviewModal';
import { API_URL } from '../../../../utils/api';


const LIMIT = 20;

export default function AddSessionExercisesScreen() {
  const router = useRouter();
  const { id: sessionId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [previewEx, setPreviewEx] = useState<any>(null);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const queryRef = useRef('');
  const categoryRef = useRef<string | null>(null);

  // Shared helper — avoids repeating AsyncStorage.getItem everywhere
  const getToken = useCallback(async () => {
    return await AsyncStorage.getItem('userToken');
  }, []);

  // Fetch categories on mount — token required by your authMiddleware
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/exercises/meta/filters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilters();
  }, [getToken]);

  // Core fetch — token added here (was missing, caused 401)
  const fetchExercises = useCallback(async (
    q: string,
    cat: string | null,
    p: number,
    append: boolean = false
  ) => {
    if (append && loadingMoreRef.current) return;
    if (!append && loadingRef.current) return;

    if (append) {
      setLoadingMore(true);
      loadingMoreRef.current = true;
    } else {
      setLoading(true);
      loadingRef.current = true;
    }

    try {
      const token = await getToken();
      const offset = p * LIMIT;
      const res = await axios.get(`${API_URL}/workouts/exercises/search`, {
        params: {
          ...(q ? { q } : {}),
          ...(cat ? { category: cat } : {}),
          limit: LIMIT,
          offset,
        },
        headers: { Authorization: `Bearer ${token}` },  // ← THE FIX
      });

      const newExercises: any[] = res.data ?? [];

      if (append) {
        setExercises(prev => [...prev, ...newExercises]);
      } else {
        setExercises(newExercises);
      }

      const more = newExercises.length === LIMIT;
      hasMoreRef.current = more;
      pageRef.current = p;
    } catch (err: any) {
      console.error('Error fetching exercises:', err?.response?.data || err.message);
      showToast('Failed to load exercises', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
      loadingMoreRef.current = false;
    }
  }, [getToken, showToast]);

  // Debounced search
  useEffect(() => {
    queryRef.current = query;
    categoryRef.current = selectedCategory;

    const timeout = setTimeout(() => {
      fetchExercises(query, selectedCategory, 0, false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, selectedCategory, fetchExercises]);

  const handleSearch = (text: string) => setQuery(text);

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(prev => (prev === cat ? null : cat));
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
    fetchExercises(queryRef.current, categoryRef.current, pageRef.current + 1, true);
  }, [fetchExercises]);

  const handleAdd = async (exerciseId: string) => {
    setAddingId(exerciseId);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/workouts/sessions/${sessionId}/exercises`,
        { exercise_id: exerciseId, sets: 3, reps: '8-12', rest_time: '60s' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Exercise added to session!');
    } catch (err) {
      console.error('Error adding exercise:', err);
      showToast('Failed to add exercise', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const renderExercise = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.exCard, { backgroundColor: isDark ? '#000000' : P.cta }]}
      activeOpacity={0.7}
      onPress={() => setPreviewEx(item)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.exImage} />
      ) : (
        <View style={[styles.exImage, styles.exImageFallback]}>
          <Ionicons name="barbell-outline" size={22} color="#999" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={styles.exName}>
            {item.name}
          </Text>
          {item.avg_rating !== undefined && item.avg_rating !== null && (
            <View style={styles.avgRatingBadge}>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={styles.avgRatingText}>{item.avg_rating}</Text>
            </View>
          )}
        </View>
        <Text style={styles.exMeta}>
          {[item.target, item.equipment].filter(Boolean).join(' • ')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => handleAdd(item.id)}
        disabled={addingId === item.id}
      >
        {addingId === item.id ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons name="add" size={24} color="#FFF" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.centered}>
        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No exercises found</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Exercises</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search movements..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filters */}
        {categories.length > 0 && (
          <View style={styles.filterWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    selectedCategory === cat && { backgroundColor: P.cta, borderColor: P.cta },
                  ]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textDim },
                      selectedCategory === cat && { color: '#FFF' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* List */}
        {loading && exercises.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={P.cta} />
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={item => String(item.id)}
            renderItem={renderExercise}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 24 + Math.max(insets.bottom, 12) },
              exercises.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={P.cta} style={{ marginVertical: 20 }} />
              ) : null
            }
          />
        )}

        <ExercisePreviewModal
          visible={previewEx !== null}
          exercise={previewEx}
          onClose={() => setPreviewEx(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    padding: 0,
  },
  filterWrap: { marginBottom: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listContentEmpty: { flex: 1 },
  exCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 0,
    backgroundColor: P.cta,
  },
  exImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: 12,
  },
  exImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2, color: '#FFF', lineHeight: 19, flexShrink: 1 },
  avgRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avgRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
  },
  exMeta: { fontFamily: FONTS.body, fontSize: 12, textTransform: 'capitalize', color: 'rgba(255,255,255,0.78)' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#34D399',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
});
