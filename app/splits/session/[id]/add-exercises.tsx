import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useToast } from '../../../../contexts/ToastContext';
import Input from '../../../../components/ui/Input';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AddSessionExercisesScreen() {
  const router = useRouter();
  const { id: sessionId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchFilters = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/exercises/meta/filters`);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  }, []);

  const fetchExercises = useCallback(async (q: string, cat: string | null, p: number = 0) => {
    if (p === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const offset = p * LIMIT;
      // Use the new search endpoint for everything if query or category is provided
      const url = q || cat 
        ? `${API_URL}/workouts/exercises/search`
        : `${API_URL}/workouts/exercises/search`; // Use search as default with empty q
        
      const res = await axios.get(url, { 
        params: { q, category: cat, limit: LIMIT, offset } 
      });
      
      const newExs = res.data;
      if (p === 0) {
        setExercises(newExs);
      } else {
        setExercises(prev => [...prev, ...newExs]);
      }
      setHasMore(newExs.length === LIMIT);
      setPage(p);
    } catch (err) {
      console.error('Error fetching exercises:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  // Debounced Search & Category Effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchExercises(query, selectedCategory, 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, selectedCategory]);

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const handleCategoryPress = (cat: string) => {
    setSelectedCategory(prev => prev === cat ? null : cat);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      console.log('Loading more exercises, page:', page + 1);
      fetchExercises(query, selectedCategory, page + 1);
    }
  };

  const handleAdd = async (exerciseId: string) => {
    setAddingId(exerciseId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/workouts/sessions/${sessionId}/exercises`, {
        exercise_id: exerciseId,
        sets: 3,
        reps: '8-12',
        rest_time: '60s'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Exercise added to session!');
    } catch (err) {
      console.error('Error adding exercise:', err);
      showToast('Failed to add exercise', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const renderExercise = ({ item }: { item: any }) => (
    <View style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: item.image_url }} style={styles.exImage} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.exName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.exMeta, { color: colors.textMuted }]}>{item.target} • {item.equipment}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: '#E00000' }]}
        onPress={() => handleAdd(item.id)}
        disabled={addingId === item.id}
      >
        {addingId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="add" size={24} color="#FFF" />}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="close" size={28} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Exercises</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search movements..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  selectedCategory === cat && { backgroundColor: '#E00000', borderColor: '#E00000' }
                ]}
                onPress={() => handleCategoryPress(cat)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: colors.textDim },
                  selectedCategory === cat && { color: '#FFF' }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && exercises.length === 0 ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#E00000" /></View>
        ) : (
          <FlatList 
            data={exercises} 
            keyExtractor={(item) => item.id} 
            renderItem={renderExercise} 
            contentContainerStyle={styles.listContent} 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator color="#E00000" style={{ marginVertical: 20 }} /> : null}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  filterWrap: { marginBottom: 20 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  filterChipText: { fontFamily: FONTS.bodyBold, fontSize: 13, textTransform: 'capitalize' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  exCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  exImage: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F5F5F5', marginRight: 12 },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  exMeta: { fontFamily: FONTS.body, fontSize: 12, textTransform: 'capitalize' },
  addBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 16, marginHorizontal: 20, marginBottom: 20, gap: 10, borderWidth: 0 },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 15, padding: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
});
