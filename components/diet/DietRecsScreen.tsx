import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, TextInput,
  Modal, KeyboardAvoidingView, Platform, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const SORT_OPTIONS = [
  { key: 'protein_g', label: 'Protein' },
  { key: 'calories_kcal', label: 'Calories' },
  { key: 'carbohydrates_g', label: 'Carbs' },
  { key: 'fat_g', label: 'Fat' },
  { key: 'fiber_g', label: 'Fiber' },
  { key: 'sugars_g', label: 'Sugar' },
  { key: 'sodium_mg', label: 'Sodium' },
];

const QUICK_FILTERS: { key: string; label: string; filter: Record<string, string> }[] = [
  { key: 'high_protein', label: 'High Protein', filter: { min_protein: '20' } },
  { key: 'low_cal', label: 'Low Cal', filter: { max_calories: '200' } },
  { key: 'high_fiber', label: 'High Fiber', filter: { min_fiber: '5' } },
  { key: 'low_fat', label: 'Low Fat', filter: { max_fat: '10' } },
  { key: 'low_carb', label: 'Low Carb', filter: { max_carbs: '20' } },
];

interface Props {
  tab: 'browse' | 'plan';
  header?: React.ReactNode;
}

export default function DietRecsScreen({ tab, header }: Props) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [userData, setUserData] = useState<any>(null);

  // Recommendation data
  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  // Food browse
  const [foods, setFoods] = useState<any[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [foodsTotal, setFoodsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('calories_kcal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedFoodId, setExpandedFoodId] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Diet plan modal
  const [showDietForm, setShowDietForm] = useState(false);
  const [formGender, setFormGender] = useState('Male');
  const [formAge, setFormAge] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formBodyFat, setFormBodyFat] = useState('');
  const [formFitnessGoal, setFormFitnessGoal] = useState('Maintain');
  const [formActivityLevel, setFormActivityLevel] = useState('Lightly Active');
  const [formDietType, setFormDietType] = useState('Standard');
  const [formFoodPreference, setFormFoodPreference] = useState('');
  const [formMealsPerDay, setFormMealsPerDay] = useState(4);
  const [formTargetWeight, setFormTargetWeight] = useState('');
  const [savingDietForm, setSavingDietForm] = useState(false);

  // Ingredient selector
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [activeMealIdx, setActiveMealIdx] = useState<number | null>(null);
  const [activeIngredientIdx, setActiveIngredientIdx] = useState<number | null>(null);
  const [selectorFoods, setSelectorFoods] = useState<any[]>([]);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (tab === 'browse') fetchFoods();
  }, [sortBy, sortOrder, filters, tab]);

  useEffect(() => {
    if (tab === 'plan' && !recommendationData) {
      fetchRecommendations();
    }
  }, [tab]);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setUserData(parsed);
        setFormGender(parsed.gender || 'Male');
        setFormAge(parsed.age ? parsed.age.toString() : '');
        setFormHeight(parsed.height ? parsed.height.toString() : '');
        setFormWeight(parsed.weight ? parsed.weight.toString() : '');
        setFormBodyFat(parsed.body_fat ? parsed.body_fat.toString() : '');
        setFormFitnessGoal(parsed.fitness_goal || 'Maintain');
        setFormActivityLevel(parsed.activity_level || 'Lightly Active');
        setFormDietType(parsed.diet_type || 'Standard');
        setFormFoodPreference(parsed.food_preference || '');
        setFormMealsPerDay(parsed.meals_per_day || 4);
      }
    } catch (e) {}
  };

  const fetchRecommendations = async (forceRefresh = false) => {
    if (!forceRefresh && recommendationData) return;
    setRecommendationLoading(true);
    setRecommendationError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/recommendation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendationData(res.data);
    } catch (err: any) {
      if (err.response?.data?.message || err.response?.data?.error) {
        setRecommendationError(err.response.data.message || err.response.data.error);
      } else {
        setRecommendationError('Failed to load diet plan');
      }
    } finally {
      setRecommendationLoading(false);
    }
  };

  const fetchFoods = async (query?: string, append = false) => {
    if (append) setLoadingMore(true); else { setFoodsLoading(true); setLoadingMore(false); }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const q = query !== undefined ? query : searchQuery;
      const params: Record<string, any> = {
        q,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 20,
        offset: append ? foods.length : 0,
        ...filters,
      };
      const res = await axios.get(`${API_URL}/meals/food-browse`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (append) {
        setFoods(prev => [...prev, ...(res.data.results || [])]);
      } else {
        setFoods(res.data.results || []);
      }
      setFoodsTotal(res.data.total || 0);
    } catch (err) {
      console.error('Food browse error:', err);
    } finally {
      setFoodsLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchFoods(text);
    }, 400);
  };

  const openDietForm = () => {
    const profile = recommendationData?.user || userData || {};
    setFormGender(profile.gender || formGender);
    setFormAge(profile.age ? profile.age.toString() : formAge);
    setFormHeight(profile.height ? profile.height.toString() : formHeight);
    setFormWeight(profile.weight ? profile.weight.toString() : formWeight);
    setFormBodyFat(profile.body_fat ? profile.body_fat.toString() : formBodyFat);
    setFormFitnessGoal(profile.fitness_goal || formFitnessGoal);
    setFormActivityLevel(profile.activity_level || formActivityLevel);
    setFormDietType(profile.diet_type || formDietType);
    setFormFoodPreference(profile.food_preference || formFoodPreference);
    setFormMealsPerDay(profile.meals_per_day || formMealsPerDay);
    setFormTargetWeight(profile.target_weight ? profile.target_weight.toString() : '');
    setShowDietForm(true);
  };

  const handleSaveDietPlan = async () => {
    setSavingDietForm(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        gender: formGender,
        age: formAge ? parseInt(formAge) : null,
        height: formHeight,
        weight: formWeight,
        body_fat: formBodyFat,
        fitness_goal: formFitnessGoal,
        activity_level: formActivityLevel,
        diet_type: formDietType,
        food_preference: formFoodPreference,
        meals_per_day: formMealsPerDay,
        target_weight: formTargetWeight,
      };

      const res = await axios.post(`${API_URL}/meals/recommendation`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRecommendationData(res.data);

      const updatedUser = { ...(userData || {}), ...payload };
      setUserData(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      showToast('Diet plan generated!');
      setShowDietForm(false);
    } catch (err: any) {
      console.error('Save diet settings error:', err.response?.data || err.message);
      showToast(err.response?.data?.error || 'Failed to save diet settings', 'error');
    } finally {
      setSavingDietForm(false);
    }
  };

  const loadAlternativeFoods = async (ing: any) => {
    setSelectorLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/food-alternatives`, {
        params: { p: ing.protein || 0, c: ing.carbs || 0, f: ing.fat || 0, exclude_name: ing.name || '', limit: 30 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectorFoods(res.data.results || []);
    } catch (err) {
      console.error('Alternative foods load error:', err);
    } finally {
      setSelectorLoading(false);
    }
  };

  const recalculateMealMacros = (meal: any) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    meal.ingredients.forEach((ing: any) => {
      calories += Number(ing.calories) || 0;
      protein += Number(ing.protein) || 0;
      carbs += Number(ing.carbs) || 0;
      fat += Number(ing.fat) || 0;
    });
    return { ...meal, calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  };

  const syncRecommendedMeals = async (updatedMeals: any[]) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.put(`${API_URL}/meals/recommendation/meals`, {
        recommendedMeals: updatedMeals
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.recommendedMeals) {
        setRecommendationData((prev: any) => ({
          ...prev,
          recommendedMeals: res.data.recommendedMeals
        }));
      }
      showToast('Meal plan updated!');
    } catch (err) {
      console.error('Failed to sync recommended meals:', err);
      showToast('Failed to save changes', 'error');
    }
  };

  const handleSelectFood = (food: any) => {
    if (activeMealIdx === null || !recommendationData || !recommendationData.recommendedMeals) return;

    const mealsCopy = JSON.parse(JSON.stringify(recommendationData.recommendedMeals));
    const meal = mealsCopy[activeMealIdx];

    const quantity = food.serving_size || '100g';
    const newIngredient = {
      name: food.food_name,
      quantity,
      calories: Math.round(food.calories_kcal || 0),
      protein: Math.round(food.protein_g || 0),
      carbs: Math.round(food.carbohydrates_g || 0),
      fat: Math.round(food.fat_g || 0),
      fiber: Math.round(food.fiber_g || 0),
      sugar: Math.round(food.sugars_g || 0),
      sodium: Math.round(food.sodium_mg || 0),
      saturated_fat: Math.round(food.saturated_fat_g || 0)
    };

    if (activeIngredientIdx !== null) {
      meal.ingredients[activeIngredientIdx] = newIngredient;
    }

    mealsCopy[activeMealIdx] = recalculateMealMacros(meal);

    setShowIngredientSelector(false);
    syncRecommendedMeals(mealsCopy);
  };

  const getBmiColor = (category: string) => {
    switch (category) {
      case 'Underweight': return '#3B82F6';
      case 'Normal weight': return '#10B981';
      case 'Overweight': return '#F59E0B';
      case 'Obesity': return '#E7B100';
      default: return '#10B981';
    }
  };

  const targets = recommendationData?.targets || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // ── FOOD CARD ──
  const FoodCard = ({ item }: { item: any }) => {
    const isExpanded = expandedFoodId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpandedFoodId(isExpanded ? null : item.id)}
        style={[styles.foodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.foodCardTop}>
          {item.image_url || item.image_small_url ? (
            <Image source={{ uri: item.image_url || item.image_small_url }} style={styles.foodCardImg} />
          ) : (
            <View style={[styles.foodCardImgPlaceholder, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="nutrition-outline" size={22} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.foodCardInfo}>
            <Text style={[styles.foodCardName, { color: colors.text }]} numberOfLines={2}>{item.food_name}</Text>
            <View style={styles.foodCardMeta}>
              {item.category ? (
                <View style={[styles.foodCardTag, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.foodCardTagText, { color: colors.textMuted }]}>{item.category}</Text>
                </View>
              ) : null}
              <Text style={[styles.foodCardServing, { color: colors.textDim }]}>
                per {item.serving_size || '100g'}
              </Text>
            </View>
          </View>
          {item.nutrition_grade ? (
            <View style={[styles.gradeBadge, {
              backgroundColor: item.nutrition_grade.toLowerCase() === 'a' ? '#10B98120' :
                item.nutrition_grade.toLowerCase() === 'b' ? '#3B82F620' :
                item.nutrition_grade.toLowerCase() === 'c' ? '#F59E0B20' : '#E7B10020'
            }]}>
              <Text style={{
                fontFamily: FONTS.heading, fontSize: 16,
                color: item.nutrition_grade.toLowerCase() === 'a' ? '#10B981' :
                  item.nutrition_grade.toLowerCase() === 'b' ? '#3B82F6' :
                  item.nutrition_grade.toLowerCase() === 'c' ? '#F59E0B' : '#E7B100'
              }}>{item.nutrition_grade.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.foodCardMacros}>
          <MacroChip value={Math.round(item.calories_kcal || 0)} label="kcal" color="#E7B100" />
          <MacroChip value={`${Math.round(item.protein_g || 0)}g`} label="Protein" color="#10B981" />
          <MacroChip value={`${Math.round(item.carbohydrates_g || 0)}g`} label="Carbs" color="#3B82F6" />
          <MacroChip value={`${Math.round(item.fat_g || 0)}g`} label="Fat" color="#F59E0B" />
        </View>

        {isExpanded && (
          <View style={[styles.foodCardExtra, { borderTopColor: colors.border }]}>
            <View style={styles.extraMacrosRow}>
              {item.fiber_g != null && <ExtraPill value={`${Math.round(item.fiber_g)}g`} label="Fiber" color="#34D399" />}
              {item.sugars_g != null && <ExtraPill value={`${Math.round(item.sugars_g)}g`} label="Sugar" color="#E7B100" />}
              {item.sodium_mg != null && <ExtraPill value={`${Math.round(item.sodium_mg)}mg`} label="Sodium" color="#FB923C" />}
              {item.saturated_fat_g != null && <ExtraPill value={`${Math.round(item.saturated_fat_g)}g`} label="Sat.Fat" color="#8B5CF6" />}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── DIET PLAN CARD ──
  const DietPlanCard = ({ meal, index }: { meal: any, index: number }) => {
    const [open, setOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
      setOpen(!open);
      Animated.spring(anim, { toValue: open ? 0 : 1, useNativeDriver: false, tension: 60, friction: 12 }).start();
    };

    const arrowRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    const getMealIcon = (type?: string) => {
      const t = (type || '').toLowerCase();
      if (t.includes('breakfast') || t.includes('morning')) return { icon: 'sunny-outline' as const, color: '#E7B100' };
      if (t.includes('lunch') || t.includes('afternoon')) return { icon: 'sunny' as const, color: '#3B82F6' };
      if (t.includes('dinner') || t.includes('evening')) return { icon: 'partly-sunny-outline' as const, color: '#F59E0B' };
      return { icon: 'cafe-outline' as const, color: '#8B5CF6' };
    };

    const vi = getMealIcon(meal.meal_type);

    return (
      <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.planCardHeader}>
          <View style={[styles.planCardIcon, { backgroundColor: vi.color + '18' }]}>
            <Ionicons name={vi.icon} size={20} color={vi.color} />
          </View>
          <View style={styles.planCardMeta}>
            <Text style={[styles.planCardMealType, { color: colors.text }]}>{meal.meal_type}</Text>
            <Text style={[styles.planCardTitle, { color: colors.textMuted }]} numberOfLines={1}>{meal.title}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.planCardMacros}>
          <PlanMacro value={Math.round(meal.calories)} label="kcal" color="#E7B100" />
          <PlanMacro value={`${Math.round(meal.protein)}g`} label="Protein" color="#10B981" />
          <PlanMacro value={`${Math.round(meal.carbs)}g`} label="Carbs" color="#3B82F6" />
          <PlanMacro value={`${Math.round(meal.fat)}g`} label="Fat" color="#F59E0B" />
        </View>

        {open && (
          <View style={[styles.planCardBody, { borderTopColor: colors.border }]}>
            {meal.description ? (
              <Text style={[styles.planDesc, { color: colors.textMuted }]}>{meal.description}</Text>
            ) : null}

            {meal.ingredients?.length > 0 && (
              <View style={styles.planIngredients}>
                <Text style={[styles.planSectionLabel, { color: colors.text }]}>Ingredients</Text>
                {meal.ingredients.map((ing: any, i: number) => (
                  <View key={i} style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, { color: colors.text }]}>{ing.name}</Text>
                      <Text style={[styles.ingredientQty, { color: colors.textDim }]}>{ing.quantity}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.ingredientCals, { color: colors.textMuted }]}>
                        {ing.calories || Math.round(meal.calories / meal.ingredients.length)} kcal
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveMealIdx(index);
                          setActiveIngredientIdx(i);
                          setSelectorSearch('');
                          setSelectorFoods([]);
                          setShowIngredientSelector(true);
                          loadAlternativeFoods(ing);
                        }}
                        style={[styles.changeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={11} color={colors.text} />
                        <Text style={[styles.changeBtnText, { color: colors.text }]}>Replace</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {meal.instructions ? (
              <View style={styles.planInstructions}>
                <Text style={[styles.planSectionLabel, { color: colors.text }]}>Instructions</Text>
                <Text style={[styles.planInstructionsText, { color: colors.textMuted }]}>{meal.instructions}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // ── RENDERERS ──
  const renderBrowseTab = () => {
    const browseContent = (
      <View style={{ flex: 1 }}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 14, color: colors.text }}
            placeholder="Search foods..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchFoods(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.toolbar}>
          <Text style={[styles.totalText, { color: colors.textDim }]}>
            {foodsTotal > 0 ? `${foodsTotal.toLocaleString()} foods` : ''}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowSortPicker(true)}
          >
            <Text style={[styles.sortBtnText, { color: colors.text }]} numberOfLines={1}>
              {SORT_OPTIONS.find(s => s.key === sortBy)?.label || 'Sort'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortToggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          >
            <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {QUICK_FILTERS.map((qf) => {
            const isActive = Object.entries(qf.filter).every(([k, v]) => filters[k] === v);
            return (
              <TouchableOpacity
                key={qf.key}
                style={[styles.filterChip, { backgroundColor: colors.inputBg, borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => {
                  if (isActive) {
                    const next = { ...filters };
                    Object.keys(qf.filter).forEach(k => delete next[k]);
                    setFilters(next);
                  } else {
                    setFilters(prev => ({ ...prev, ...qf.filter }));
                  }
                }}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#FFF' : colors.textMuted }]}>{qf.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );

    if (foodsLoading && !loadingMore) {
      return (
        <FlatList
          data={[]}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
          ListHeaderComponent={
            <View>
              {header}
              {browseContent}
              <View style={styles.foodList}>
                {[1,2,3,4,5].map((_, i) => (
                  <View key={i} style={[styles.foodCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.foodCardImgPlaceholder, { backgroundColor: colors.inputBg, width: 52, height: 52, borderRadius: 12 }]} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ height: 14, width: '60%', backgroundColor: colors.inputBg, borderRadius: 4 }} />
                        <View style={{ height: 10, width: '40%', backgroundColor: colors.inputBg, borderRadius: 4 }} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                      {[1,2,3,4].map((_, j) => (
                        <View key={j} style={{ flex: 1, height: 36, backgroundColor: colors.inputBg, borderRadius: 10 }} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          }
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (foods.length === 0) {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 80, 100) }} showsVerticalScrollIndicator={false}>
          {header}
          {browseContent}
          <View style={styles.centerFlex}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={36} color={colors.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No foods found</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Try adjusting your filters or search</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={foods}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
        ListHeaderComponent={
          <View>
            {header}
            {browseContent}
          </View>
        }
        renderItem={({ item }) => <FoodCard item={item} />}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!loadingMore && foods.length < foodsTotal) {
            fetchFoods(undefined, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <View style={{ paddingBottom: 16 }}>
            {[1,2,3].map((_, i) => (
              <View key={i} style={[styles.foodCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.foodCardImgPlaceholder, { backgroundColor: colors.inputBg, width: 52, height: 52, borderRadius: 12 }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ height: 14, width: '60%', backgroundColor: colors.inputBg, borderRadius: 4 }} />
                    <View style={{ height: 10, width: '40%', backgroundColor: colors.inputBg, borderRadius: 4 }} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                  {[1,2,3,4].map((_, j) => (
                    <View key={j} style={{ flex: 1, height: 36, backgroundColor: colors.inputBg, borderRadius: 10 }} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      />
    );
  };

  const renderPlanTab = () => {
    if (recommendationLoading) {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 80, 100) }} showsVerticalScrollIndicator={false}>
          {header}
          <View style={styles.centerFlex}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textDim }]}>Generating your diet plan...</Text>
          </View>
        </ScrollView>
      );
    }

    if (recommendationError) {
      return (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]} showsVerticalScrollIndicator={false}>
          {header}
          <View style={styles.centerFlex}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Diet Plan Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>{recommendationError}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => fetchRecommendations(true)}
            >
              <Text style={[styles.primaryBtnText, { color: colors.bg }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (!recommendationData) {
      return (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]} showsVerticalScrollIndicator={false}>
          {header}
          <View style={styles.centerFlex}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="sparkles-outline" size={36} color={colors.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Diet Plan</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Configure your profile to get a personalized diet plan</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={openDietForm}
            >
              <Ionicons name="options-outline" size={16} color={colors.bg} style={{ marginRight: 6 }} />
              <Text style={[styles.primaryBtnText, { color: colors.bg }]}>Configure Diet Plan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]} showsVerticalScrollIndicator={false}>
        {header}
        {/* BMI Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryCardRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>BMI</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{recommendationData.bmi}</Text>
            </View>
            <View style={[styles.bmiBadge, { backgroundColor: getBmiColor(recommendationData.bmiCategory) + '20' }]}>
              <Text style={[styles.bmiBadgeText, { color: getBmiColor(recommendationData.bmiCategory) }]}>
                {recommendationData.bmiCategory}
              </Text>
            </View>
          </View>
          <View style={[styles.bmiBar, { backgroundColor: colors.inputBg }]}>
            <View style={[styles.bmiBarFill, {
              width: `${Math.min(100, (recommendationData.bmi / 40) * 100)}%`,
              backgroundColor: getBmiColor(recommendationData.bmiCategory)
            }]} />
          </View>
          <View style={styles.bmiLabels}>
            {['Under', 'Normal', 'Over', 'Obesity'].map((l, i) => (
              <Text key={l} style={[styles.bmiLabel, { color: colors.textDim }]}>{l}</Text>
            ))}
          </View>
        </View>

        {/* Daily Targets */}
        <View style={[styles.targetsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Targets</Text>
          <View style={styles.targetsRow}>
            <TargetBox value={`${targets.calories}`} label="kcal" sub="Calories" color="#E7B100" />
            <TargetBox value={`${targets.protein}g`} label="Protein" sub="" color="#10B981" />
            <TargetBox value={`${targets.carbs}g`} label="Carbs" sub="" color="#3B82F6" />
            <TargetBox value={`${targets.fat}g`} label="Fat" sub="" color="#F59E0B" />
          </View>
          <View style={[styles.profileSummary, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.profileSummaryText, { color: colors.textMuted }]}>
              {recommendationData.user?.diet_type || 'Standard'} · {recommendationData.user?.meals_per_day || 4} meals · {recommendationData.user?.fitness_goal || 'Maintain'}
            </Text>
          </View>
        </View>

        {/* Configure Button */}
        <TouchableOpacity
          style={[styles.configBtn, { borderColor: colors.primary }]}
          onPress={openDietForm}
          activeOpacity={0.85}
        >
          <Ionicons name="settings-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.configBtnText, { color: colors.primary }]}>Configure Diet Plan</Text>
        </TouchableOpacity>

        {/* Meal Plans */}
        {recommendationData.recommendedMeals?.length > 0 ? (
          <View style={styles.mealPlanSection}>
            <View style={styles.mealPlanHeader}>
              <Ionicons name="restaurant-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.mealPlanTitle, { color: colors.text }]}>Your Meal Plan</Text>
              <Text style={[styles.mealPlanCount, { color: colors.textDim }]}>{recommendationData.recommendedMeals.length} meals</Text>
            </View>
            {recommendationData.recommendedMeals.map((meal: any, idx: number) => (
              <DietPlanCard key={idx} meal={meal} index={idx} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {tab === 'browse' ? renderBrowseTab() : renderPlanTab()}

      {/* ── SORT PICKER MODAL ── */}
      <Modal visible={showSortPicker} transparent animationType="fade" onRequestClose={() => setShowSortPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSortPicker(false)}>
          <View style={[styles.sortSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sortSheetTitle, { color: colors.text }]}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (sortBy === opt.key) {
                    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy(opt.key);
                    setSortOrder('desc');
                  }
                  setShowSortPicker(false);
                }}
              >
                <Text style={[styles.sortOptionText, { color: sortBy === opt.key ? colors.primary : colors.text }]}>
                  {opt.label}
                </Text>
                {sortBy === opt.key && (
                  <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DIET PLAN CONFIG MODAL ── */}
      <Modal visible={showDietForm} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        >
          <View style={[styles.dietFormSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.dietFormHeader, { backgroundColor: colors.primary }]}>
              <View style={styles.dietFormHeaderContent}>
                <View style={styles.dietFormHeaderIcon}>
                  <Ionicons name="body-outline" size={20} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dietFormHeaderTitle}>Diet Plan Setup</Text>
                  <Text style={styles.dietFormHeaderSub}>Set your details to generate a personalized meal plan</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDietForm(false)} style={styles.dietFormClose}>
                  <Ionicons name="close" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 2 }}>
              <Text style={[styles.dietSectionTitle, { color: colors.text }]}>Physical Profile</Text>

              {/* Gender */}
              <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Gender</Text>
              <View style={styles.dietSelectRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setFormGender(g)}
                    style={[styles.dietSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, formGender === g && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.dietSelectBtnText, { color: formGender === g ? '#FFF' : colors.textDim }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age / Height / Weight / Body Fat */}
              <View style={styles.dietGrid}>
                <View style={styles.dietGridCell}>
                  <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Age</Text>
                  <TextInput style={[styles.dietInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="30" placeholderTextColor={colors.textDim} keyboardType="numeric" value={formAge} onChangeText={setFormAge} />
                </View>
                <View style={styles.dietGridCell}>
                  <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Height (cm)</Text>
                  <TextInput style={[styles.dietInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="170" placeholderTextColor={colors.textDim} keyboardType="numeric" value={formHeight} onChangeText={setFormHeight} />
                </View>
                <View style={styles.dietGridCell}>
                  <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Weight (kg)</Text>
                  <TextInput style={[styles.dietInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="70" placeholderTextColor={colors.textDim} keyboardType="numeric" value={formWeight} onChangeText={setFormWeight} />
                </View>
                <View style={styles.dietGridCell}>
                  <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Body Fat (%)</Text>
                  <TextInput style={[styles.dietInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="20" placeholderTextColor={colors.textDim} keyboardType="numeric" value={formBodyFat} onChangeText={setFormBodyFat} />
                </View>
              </View>

              {(formFitnessGoal === 'Lose' || formFitnessGoal === 'Gain Muscle') && (
                <View style={[styles.targetWeightRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Current Weight</Text>
                    <Text style={[styles.targetWeightValue, { color: colors.text }]}>{formWeight || '—'} kg</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Target Weight</Text>
                    <TextInput
                      style={[styles.dietInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
                      placeholder="70"
                      placeholderTextColor={colors.textDim}
                      keyboardType="numeric"
                      value={formTargetWeight}
                      onChangeText={setFormTargetWeight}
                    />
                  </View>
                </View>
              )}

              <Text style={[styles.dietSectionTitle, { color: colors.text, marginTop: 20 }]}>Goals & Lifestyle</Text>

              <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Fitness Goal</Text>
              <View style={styles.dietSelectRow}>
                {[
                  { label: 'Lose', icon: 'trending-down-outline' },
                  { label: 'Maintain', icon: 'remove-outline' },
                  { label: 'Gain Muscle', icon: 'barbell-outline' },
                ].map((g) => {
                  const isActive = formFitnessGoal === g.label;
                  return (
                    <TouchableOpacity
                      key={g.label}
                      onPress={() => setFormFitnessGoal(g.label)}
                      style={[styles.dietSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Ionicons name={g.icon as any} size={18} color={isActive ? '#FFF' : colors.textDim} style={{ marginBottom: 2 }} />
                      <Text style={[styles.dietSelectBtnText, { color: isActive ? '#FFF' : colors.textDim }]}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.dietFieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Activity Level</Text>
              <View style={styles.dietActivityRow}>
                {['Sedentary', 'Lightly', 'Moderate', 'Very', 'Extreme'].map((a) => {
                  const full = a === 'Lightly' ? 'Lightly Active' : a === 'Moderate' ? 'Moderately Active' : a === 'Very' ? 'Very Active' : a === 'Extreme' ? 'Extremely Active' : 'Sedentary';
                  const isActive = formActivityLevel === full;
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setFormActivityLevel(full)}
                      style={[styles.dietActivityBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 11, color: isActive ? '#FFF' : colors.textDim }}>{a}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.dietSectionTitle, { color: colors.text, marginTop: 20 }]}>Diet Preferences</Text>

              <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Diet Type</Text>
              <View style={styles.dietSelectRow}>
                {[
                  { label: 'Standard', icon: 'fast-food-outline' },
                  { label: 'Vegetarian', icon: 'leaf-outline' },
                  { label: 'Vegan', icon: 'flower-outline' },
                ].map((d) => {
                  const isActive = formDietType === d.label;
                  return (
                    <TouchableOpacity
                      key={d.label}
                      onPress={() => setFormDietType(d.label)}
                      style={[styles.dietSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Ionicons name={d.icon as any} size={18} color={isActive ? '#FFF' : colors.textDim} style={{ marginBottom: 2 }} />
                      <Text style={[styles.dietSelectBtnText, { color: isActive ? '#FFF' : colors.textDim }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.dietFieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Food Preferences / Allergies</Text>
              <TextInput
                style={[styles.dietInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="e.g. No gluten, love nuts, avoid dairy..."
                placeholderTextColor={colors.textDim}
                multiline
                value={formFoodPreference}
                onChangeText={setFormFoodPreference}
              />

              <Text style={[styles.dietSectionTitle, { color: colors.text, marginTop: 20 }]}>Meals Per Day</Text>

              <View style={[styles.mealFreqRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => setFormMealsPerDay(Math.max(2, formMealsPerDay - 1))} style={[styles.mealFreqBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.mealFreqNum, { color: colors.primary }]}>{formMealsPerDay}</Text>
                  <Text style={[styles.mealFreqLabel, { color: colors.textDim }]}>
                    {formMealsPerDay === 2 ? 'Lunch + Dinner'
                      : formMealsPerDay === 3 ? 'Breakfast, Lunch, Dinner'
                      : formMealsPerDay === 4 ? 'Breakfast, Lunch, Dinner, Snack'
                      : formMealsPerDay === 5 ? 'Breakfast, Snack, Lunch, Dinner, Snack'
                      : '6 meals: Full athlete split'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setFormMealsPerDay(Math.min(6, formMealsPerDay + 1))} style={[styles.mealFreqBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Save */}
              <TouchableOpacity
                onPress={handleSaveDietPlan}
                disabled={savingDietForm}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                {savingDietForm ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>Generate Meal Plan</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── INGREDIENT SELECTOR MODAL ── */}
      <Modal visible={showIngredientSelector} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.fsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fsTitle, { color: colors.text }]}>Replace Ingredient</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                Suggested items with similar nutritional values
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowIngredientSelector(false)}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectorLoading && selectorFoods.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 14, fontFamily: FONTS.bodySemiBold, color: colors.textDim }}>Loading ingredients...</Text>
            </View>
          ) : selectorFoods.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 }}>
              <View style={[styles.fsEmptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={36} color={colors.textDim} />
              </View>
              <Text style={[styles.fsEmptyTitle, { color: colors.text }]}>No alternatives found</Text>
              <Text style={[styles.fsEmptySub, { color: colors.textMuted }]}>Could not find similar items</Text>
            </View>
          ) : (
            <FlatList
              data={selectorFoods}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelectFood(item)}
                  style={[styles.selectorFoodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.image_url || item.image_small_url ? (
                      <Image source={{ uri: item.image_url || item.image_small_url }} style={styles.selectorFoodImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.selectorFoodImagePlaceholder, { backgroundColor: colors.inputBg }]}>
                        <Ionicons name="nutrition-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.selectorFoodName, { color: colors.text }]} numberOfLines={2}>{item.food_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                        {item.category ? (
                          <View style={{ backgroundColor: colors.inputBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10, color: colors.textDim }}>{item.category}</Text>
                          </View>
                        ) : null}
                        <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: colors.textMuted }}>
                          {item.serving_size ? `per ${item.serving_size}` : 'per 100g'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.selectorFoodMacroRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.selectorFoodMacroChip, { backgroundColor: '#E7B10008' }]}>
                      <Text style={[styles.selectorFoodMacroVal, { color: '#E7B100' }]}>{Math.round(item.calories_kcal || 0)}</Text>
                      <Text style={styles.selectorFoodMacroLbl}>kcal</Text>
                    </View>
                    <View style={[styles.selectorFoodMacroChip, { backgroundColor: '#10B98108' }]}>
                      <Text style={[styles.selectorFoodMacroVal, { color: '#10B981' }]}>{Math.round(item.protein_g || 0)}g</Text>
                      <Text style={styles.selectorFoodMacroLbl}>protein</Text>
                    </View>
                    <View style={[styles.selectorFoodMacroChip, { backgroundColor: '#3B82F608' }]}>
                      <Text style={[styles.selectorFoodMacroVal, { color: '#3B82F6' }]}>{Math.round(item.carbohydrates_g || 0)}g</Text>
                      <Text style={styles.selectorFoodMacroLbl}>carbs</Text>
                    </View>
                    <View style={[styles.selectorFoodMacroChip, { backgroundColor: '#F59E0B08' }]}>
                      <Text style={[styles.selectorFoodMacroVal, { color: '#F59E0B' }]}>{Math.round(item.fat_g || 0)}g</Text>
                      <Text style={styles.selectorFoodMacroLbl}>fat</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── SUB-COMPONENTS ──

const MacroChip = ({ value, label, color }: { value: string | number; label: string; color: string }) => (
  <View style={[styles.macroChip, { backgroundColor: color + '12' }]}>
    <Text style={[styles.macroChipValue, { color }]}>{value}</Text>
    <Text style={[styles.macroChipLabel, { color: color + 'CC' }]}>{label}</Text>
  </View>
);

const ExtraPill = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <View style={[styles.extraPill, { backgroundColor: color + '15' }]}>
    <Text style={[styles.extraPillText, { color }]}>{value} {label}</Text>
  </View>
);

const PlanMacro = ({ value, label, color }: { value: string | number; label: string; color: string }) => (
  <View style={[styles.planMacroChip, { backgroundColor: color + '12' }]}>
    <Text style={[styles.planMacroValue, { color }]}>{value}</Text>
    <Text style={[styles.planMacroLabel, { color }]}>{label}</Text>
  </View>
);

const TargetBox = ({ value, label, sub, color }: { value: string; label: string; sub: string; color: string }) => (
  <View style={[styles.targetBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
    <Text style={[styles.targetBoxValue, { color }]}>{value}</Text>
    <Text style={[styles.targetBoxLabel, { color }]}>{label || sub}</Text>
  </View>
);

const styles = StyleSheet.create({

  // Browse
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 4, gap: 8,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, gap: 4,
  },
  sortBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  sortToggleBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
  },
  totalText: { fontFamily: FONTS.body, fontSize: 11 },
  filterChipsRow: { paddingHorizontal: 20, paddingVertical: 6, gap: 6 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, marginRight: 6,
  },
  filterChipText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
  foodList: { paddingTop: 8, paddingBottom: 24 },
  foodCard: {
    borderRadius: 18, borderWidth: 1, padding: 14, marginHorizontal: 20, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  foodCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foodCardImg: { width: 52, height: 52, borderRadius: 12 },
  foodCardImgPlaceholder: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  foodCardInfo: { flex: 1 },
  foodCardName: { fontFamily: FONTS.bodyBold, fontSize: 14, lineHeight: 19 },
  foodCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  foodCardTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  foodCardTagText: { fontFamily: FONTS.bodySemiBold, fontSize: 10 },
  foodCardServing: { fontFamily: FONTS.body, fontSize: 10 },
  gradeBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  foodCardMacros: { flexDirection: 'row', gap: 6, marginTop: 12 },
  foodCardExtra: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  extraMacrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  extraPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  extraPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
  macroChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
  macroChipValue: { fontFamily: FONTS.heading, fontSize: 13 },
  macroChipLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 8, marginTop: 1, textTransform: 'uppercase' },
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 6 },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 19, marginBottom: 16 },
  loadingText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginTop: 12 },

  // Plan tab
  scrollContent: { paddingBottom: 40 },
  summaryCard: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginHorizontal: 20, marginTop: 8, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  summaryCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontFamily: FONTS.heading, fontSize: 28, marginTop: 2 },
  bmiBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  bmiBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  bmiBar: { height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  bmiBarFill: { height: '100%', borderRadius: 3 },
  bmiLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  bmiLabel: { fontFamily: FONTS.body, fontSize: 10 },
  targetsCard: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginHorizontal: 20, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 17, marginBottom: 12 },
  targetsRow: { flexDirection: 'row', gap: 8 },
  targetBox: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1,
  },
  targetBoxValue: { fontFamily: FONTS.heading, fontSize: 16 },
  targetBoxLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 10, marginTop: 2 },
  profileSummary: { borderRadius: 12, padding: 10, marginTop: 12, alignItems: 'center' },
  profileSummaryText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  configBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginBottom: 12, borderWidth: 1.5,
    borderRadius: 16, paddingVertical: 12,
  },
  configBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 16, marginTop: 8,
  },
  primaryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  mealPlanSection: { marginHorizontal: 20, marginTop: 4 },
  mealPlanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealPlanTitle: { fontFamily: FONTS.heading, fontSize: 17, marginRight: 8 },
  mealPlanCount: { fontFamily: FONTS.body, fontSize: 12 },
  planCard: {
    borderRadius: 18, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  planCardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  planCardIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  planCardMeta: { flex: 1, marginLeft: 12 },
  planCardMealType: { fontFamily: FONTS.heading, fontSize: 16 },
  planCardTitle: { fontFamily: FONTS.body, fontSize: 12, marginTop: 1 },
  planCardMacros: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 14 },
  planMacroChip: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
  planMacroValue: { fontFamily: FONTS.heading, fontSize: 13 },
  planMacroLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 9, marginTop: 1 },
  planCardBody: { borderTopWidth: 1, padding: 14 },
  planDesc: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  planIngredients: { marginBottom: 12 },
  planSectionLabel: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 8 },
  ingredientRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 0.5,
  },
  ingredientInfo: { flex: 1, paddingRight: 8 },
  ingredientName: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  ingredientQty: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  ingredientCals: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  planInstructions: {},
  planInstructionsText: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 18 },

  // Modals
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sortSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sortSheetTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 16 },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 0.5,
  },
  sortOptionText: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  // Diet form
  dietFormSheet: { height: Math.min(SCREEN_HEIGHT * 0.8, 600), borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  dietFormHeader: { paddingHorizontal: 20, paddingVertical: 18 },
  dietFormHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  dietFormHeaderIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dietFormHeaderTitle: { fontFamily: FONTS.heading, fontSize: 18, color: '#FFF' },
  dietFormHeaderSub: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  dietFormClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  dietSectionTitle: { fontFamily: FONTS.heading, fontSize: 16, marginBottom: 14 },
  dietFieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  dietSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dietSelectBtn: { flexBasis: '30%', flexGrow: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dietSelectBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  dietGridCell: { width: '47%' },
  targetWeightRow: { flexDirection: 'row', gap: 16, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  targetWeightValue: { fontFamily: FONTS.heading, fontSize: 20, marginTop: 2 },
  dietInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontFamily: FONTS.bodySemiBold, fontSize: 15, marginBottom: 12 },
  dietActivityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietActivityBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  mealFreqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1 },
  mealFreqBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  mealFreqNum: { fontFamily: FONTS.heading, fontSize: 32 },
  mealFreqLabel: { fontFamily: FONTS.body, fontSize: 11, textAlign: 'center', marginTop: 2 },
  saveBtn: { borderRadius: 20, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 15, letterSpacing: 0.5 },

  // Ingredient selector
  fsHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1 },
  fsTitle: { fontFamily: FONTS.heading, fontSize: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fsEmptyIcon: { width: 70, height: 70, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  fsEmptyTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 6 },
  fsEmptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center' },
  selectorFoodCard: { borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  selectorFoodImage: { width: 52, height: 52, borderRadius: 26 },
  selectorFoodImagePlaceholder: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  selectorFoodName: { fontFamily: FONTS.bodySemiBold, fontSize: 13, lineHeight: 18 },
  selectorFoodMacroRow: { flexDirection: 'row', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  selectorFoodMacroChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  selectorFoodMacroVal: { fontFamily: FONTS.heading, fontSize: 13 },
  selectorFoodMacroLbl: { fontFamily: FONTS.bodySemiBold, fontSize: 8, marginTop: 1 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  changeBtnText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
});
