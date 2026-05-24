import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image, Modal,
  ScrollView, Platform, Dimensions, TextInput, KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import NutritionMeter from '../../components/ui/NutritionMeter';
import DatePicker from '../../components/ui/DatePicker';
import WaterTracker from '../../components/ui/WaterTracker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function MealsScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Log Meal Form State
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mealDescription, setMealDescription] = useState('');

  // Analysis Modal State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analyzedImageUrl, setAnalyzedImageUrl] = useState('');
  const [mealType, setMealType] = useState('Morning');
  const [saving, setSaving] = useState(false);

  // New features state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tracker' | 'recommendations'>('tracker');
  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  // Food Search State
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState<any[]>([]);
  const [foodSearchLoading, setFoodSearchLoading] = useState(false);
  const [foodSearchTotal, setFoodSearchTotal] = useState(0);
  const [selectedFoodDetail, setSelectedFoodDetail] = useState<any>(null);

  // Ingredient Customizer State
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [activeMealIdx, setActiveMealIdx] = useState<number | null>(null);
  const [activeIngredientIdx, setActiveIngredientIdx] = useState<number | null>(null);
  const [selectorFoods, setSelectorFoods] = useState<any[]>([]);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');

  // AI Diet Coach Profile Form State
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
  const [savingDietForm, setSavingDietForm] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showFoodSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showFoodSearch]);

  useEffect(() => {
    loadUser();
    fetchMeals();
  }, []);

  useEffect(() => {
    if (activeTab === 'recommendations' && !recommendationData) {
      fetchRecommendations();
    }
  }, [activeTab]);

  const fetchRecommendations = async (forceRefresh = false) => {
    setRecommendationLoading(true);
    setRecommendationError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/recommendation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.recommendedMeals) {
        res.data.recommendedMeals = ensureIngredientsHaveMacros(res.data.recommendedMeals);
      }
      setRecommendationData(res.data);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      if (err.response?.data?.message || err.response?.data?.error) {
        setRecommendationError(err.response.data.message || err.response.data.error);
      } else {
        setRecommendationError('Failed to load recommendation data');
      }
    } finally {
      setRecommendationLoading(false);
    }
  };

  const searchFoods = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setFoodSearchResults([]);
      setFoodSearchTotal(0);
      return;
    }
    setFoodSearchLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/food-search`, {
        params: { q: query.trim(), limit: 30 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoodSearchResults(res.data.results || []);
      setFoodSearchTotal(res.data.total || 0);
    } catch (err) {
      console.error('Food search error:', err);
    } finally {
      setFoodSearchLoading(false);
    }
  };

  const openDietForm = () => {
    const profile = recommendationData?.user || userData || {};
    setFormGender(profile.gender || 'Male');
    setFormAge(profile.age ? profile.age.toString() : '');
    setFormHeight(profile.height ? profile.height.toString() : '');
    setFormWeight(profile.weight ? profile.weight.toString() : '');
    setFormBodyFat(profile.body_fat ? profile.body_fat.toString() : '');
    setFormFitnessGoal(profile.fitness_goal || 'Maintain');
    setFormActivityLevel(profile.activity_level || 'Lightly Active');
    setFormDietType(profile.diet_type || 'Standard');
    setFormFoodPreference(profile.food_preference || '');
    setFormMealsPerDay(profile.meals_per_day || 4);
    
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
      };

      const res = await axios.post(`${API_URL}/meals/recommendation`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.recommendedMeals) {
        res.data.recommendedMeals = ensureIngredientsHaveMacros(res.data.recommendedMeals);
      }
      setRecommendationData(res.data);
      
      // Update global user data so other tabs keep alignment
      const updatedUser = {
        ...(userData || {}),
        ...payload
      };
      setUserData(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      showToast('Diet settings saved & meal plan updated! 🥗');
      setShowDietForm(false);
    } catch (err: any) {
      console.error('Error saving diet settings:', err);
      showToast('Failed to save diet settings', 'error');
    } finally {
      setSavingDietForm(false);
    }
  };

  const ensureIngredientsHaveMacros = (mealsList: any[]) => {
    if (!mealsList || !Array.isArray(mealsList)) return [];
    return mealsList.map(meal => {
      if (!meal.ingredients || !Array.isArray(meal.ingredients)) return meal;
      const updatedIngredients = meal.ingredients.map((ing: any) => {
        if (ing.calories === undefined) {
          return {
            ...ing,
            calories: Math.round(meal.calories / meal.ingredients.length),
            protein: Math.round(meal.protein / meal.ingredients.length),
            carbs: Math.round(meal.carbs / meal.ingredients.length),
            fat: Math.round(meal.fat / meal.ingredients.length)
          };
        }
        return ing;
      });
      return {
        ...meal,
        ingredients: updatedIngredients
      };
    });
  };

  const recalculateMealMacros = (meal: any) => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    meal.ingredients.forEach((ing: any) => {
      calories += Number(ing.calories) || 0;
      protein += Number(ing.protein) || 0;
      carbs += Number(ing.carbs) || 0;
      fat += Number(ing.fat) || 0;
    });

    return {
      ...meal,
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    };
  };

  const loadSelectorFoods = async (query = '') => {
    setSelectorLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/food-search`, {
        params: { q: query, limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectorFoods(res.data.results || []);
    } catch (err) {
      console.error('Selector foods load error:', err);
    } finally {
      setSelectorLoading(false);
    }
  };

  const loadAlternativeFoods = async (ing: any) => {
    setSelectorLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals/food-alternatives`, {
        params: { 
          p: ing.protein || 0,
          c: ing.carbs || 0,
          f: ing.fat || 0,
          exclude_name: ing.name || '',
          limit: 30
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectorFoods(res.data.results || []);
    } catch (err) {
      console.error('Alternative foods load error:', err);
    } finally {
      setSelectorLoading(false);
    }
  };

  const handleSelectFood = (food: any) => {
    if (activeMealIdx === null || !recommendationData || !recommendationData.recommendedMeals) return;

    const mealsCopy = JSON.parse(JSON.stringify(recommendationData.recommendedMeals));
    const meal = mealsCopy[activeMealIdx];

    const quantity = food.serving_size || '100g';
    const newIngredient = {
      name: food.food_name,
      quantity: quantity,
      calories: Math.round(food.calories_kcal || 0),
      protein: Math.round(food.protein_g || 0),
      carbs: Math.round(food.carbohydrates_g || 0),
      fat: Math.round(food.fat_g || 0),
      fiber: Math.round(food.fiber_g || 0),
      sugar: Math.round(food.sugars_g || 0),
      sodium: Math.round(food.sodium_mg || 0),
      saturated_fat: Math.round(food.saturated_fat_g || 0)
    };

    if (activeIngredientIdx === null) {
      if (!meal.ingredients) meal.ingredients = [];
      meal.ingredients.push(newIngredient);
    } else {
      meal.ingredients[activeIngredientIdx] = newIngredient;
    }

    mealsCopy[activeMealIdx] = recalculateMealMacros(meal);

    setShowItemSelector(false);
    syncRecommendedMeals(mealsCopy);
  };

  const handleDeleteIngredient = (mealIndex: number, ingredientIndex: number) => {
    if (!recommendationData || !recommendationData.recommendedMeals) return;

    const mealsCopy = JSON.parse(JSON.stringify(recommendationData.recommendedMeals));
    const meal = mealsCopy[mealIndex];

    if (meal.ingredients && meal.ingredients.length > ingredientIndex) {
      meal.ingredients.splice(ingredientIndex, 1);
    }

    mealsCopy[mealIndex] = recalculateMealMacros(meal);

    syncRecommendedMeals(mealsCopy);
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
        const processed = ensureIngredientsHaveMacros(res.data.recommendedMeals);
        setRecommendationData((prev: any) => ({
          ...prev,
          recommendedMeals: processed
        }));
      }
      showToast('Meal plan updated! 🥗');
    } catch (err) {
      console.error('Failed to sync recommended meals:', err);
      showToast('Failed to save changes to server', 'error');
    }
  };

  const handleLogRecommendedMeal = async (meal: any) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Choose high-fidelity food category image for the log
      let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'; // fallback
      if (meal.meal_type === 'Breakfast') {
        imageUrl = 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop';
      } else if (meal.meal_type === 'Lunch') {
        imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop';
      } else if (meal.meal_type === 'Dinner') {
        imageUrl = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop';
      } else if (meal.meal_type === 'Snack') {
        imageUrl = 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop';
      }

      const items = meal.ingredients.map((ing: any) => ({
        item_name: ing.name,
        quantity: ing.quantity || '1 portion',
        calories: ing.calories !== undefined ? ing.calories : Math.round(meal.calories / meal.ingredients.length),
        protein: ing.protein !== undefined ? ing.protein : Math.round(meal.protein / meal.ingredients.length),
        carbs: ing.carbs !== undefined ? ing.carbs : Math.round(meal.carbs / meal.ingredients.length),
        fat: ing.fat !== undefined ? ing.fat : Math.round(meal.fat / meal.ingredients.length),
        fiber: ing.fiber !== undefined ? ing.fiber : 0,
        sugar: ing.sugar !== undefined ? ing.sugar : 0,
        sodium: ing.sodium !== undefined ? ing.sodium : 0,
        saturated_fat: ing.saturated_fat !== undefined ? ing.saturated_fat : 0
      }));

      const mealTypeMap = meal.meal_type === 'Snack' ? 'Snack' : (meal.meal_type === 'Breakfast' ? 'Morning' : (meal.meal_type === 'Lunch' ? 'Afternoon' : 'Evening'));

      const totalFiber = meal.ingredients.reduce((sum: number, ing: any) => sum + (ing.fiber || 0), 0);
      const totalSugar = meal.ingredients.reduce((sum: number, ing: any) => sum + (ing.sugar || 0), 0);
      const totalSodium = meal.ingredients.reduce((sum: number, ing: any) => sum + (ing.sodium || 0), 0);
      const totalSaturatedFat = meal.ingredients.reduce((sum: number, ing: any) => sum + (ing.saturated_fat || 0), 0);

      await axios.post(`${API_URL}/meals`, {
        image_url: imageUrl,
        meal_type: mealTypeMap,
        total_calories: meal.calories,
        total_protein: meal.protein,
        total_carbs: meal.carbs,
        total_fat: meal.fat,
        total_fiber: totalFiber,
        total_sugar: totalSugar,
        total_sodium: totalSodium,
        total_saturated_fat: totalSaturatedFat,
        total_cholesterol: 0,
        items
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`${meal.meal_type} logged successfully! 🎉`);
      fetchMeals(); // Refresh daily list
    } catch (err) {
      console.error('Error logging recommended meal:', err);
      showToast('Failed to log recommended meal', 'error');
    }
  };

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUserData(JSON.parse(data));
    } catch (e) {}
  };

  const fetchMeals = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/meals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeals(res.data);
    } catch (err) {
      console.error('Error fetching meals:', err);
      showToast('Failed to load meals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const startAnalysis = async () => {
    if (!selectedImage) {
      showToast('Please select a meal image', 'error');
      return;
    }

    setUploading(true);
    setShowLogForm(false);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('description', mealDescription);
      
      if (Platform.OS === 'web') {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        formData.append('photo', blob, 'meal.jpg');
      } else {
        const name = selectedImage.split('/').pop();
        const match = /\.(\w+)$/.exec(name || '');
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('photo', { uri: selectedImage, name, type } as any);
      }

      const res = await axios.post(`${API_URL}/meals/analyze`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });

      setAnalyzedImageUrl(res.data.imageUrl);
      setAnalysisData(res.data.analysis);
      
      // Auto-detect meal type based on current hour
      const hour = new Date().getHours();
      let type = 'Night';
      if (hour >= 5 && hour < 11) type = 'Morning';
      else if (hour >= 11 && hour < 16) type = 'Afternoon';
      else if (hour >= 16 && hour < 20) type = 'Evening';
      setMealType(type);

      setShowAnalysis(true);
      // Reset form
      setSelectedImage(null);
      setMealDescription('');
    } catch (err) {
      console.error('Analysis error:', err);
      showToast('Failed to analyze meal', 'error');
      setShowLogForm(true); // Re-open form on error
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMeal = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/meals`, {
        image_url: analyzedImageUrl,
        meal_type: mealType,
        ...analysisData,
        items: analysisData.items
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Meal logged successfully! 🥗');
      setShowAnalysis(false);
      fetchMeals();
    } catch (err) {
      console.error('Error saving meal:', err);
      showToast('Failed to save meal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/meals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Meal deleted');
      fetchMeals();
    } catch (err) {
      showToast('Failed to delete meal', 'error');
    }
  };

  const MealAccordionCard = ({ item }: { item: any }) => {
    const [open, setOpen] = React.useState(false);
    const anim = React.useRef(new Animated.Value(0)).current;
    const date = new Date(item.logged_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const getMealIconDetails = (type: string) => {
      switch (type) {
        case 'Morning':
        case 'Breakfast':
          return { icon: 'sunny-outline', color: '#E7B100', bg: '#E7B10015', label: 'Breakfast' };
        case 'Afternoon':
        case 'Lunch':
          return { icon: 'sunny', color: '#3B82F6', bg: '#3B82F615', label: 'Lunch' };
        case 'Evening':
        case 'Dinner':
          return { icon: 'moon-outline', color: '#8B5CF6', bg: '#8B5CF615', label: 'Dinner' };
        default:
          return { icon: 'nutrition-outline', color: '#F59E0B', bg: '#F59E0B15', label: 'Snack' };
      }
    };

    const iconInfo = getMealIconDetails(item.meal_type);

    const toggle = () => {
      const toVal = open ? 0 : 1;
      setOpen(!open);
      Animated.spring(anim, { toValue: toVal, useNativeDriver: false, tension: 60, friction: 12 }).start();
    };

    const macros = [
      { label: 'Protein', value: Math.round(item.total_protein), unit: 'g', color: '#10B981' },
      { label: 'Carbs',   value: Math.round(item.total_carbs),   unit: 'g', color: '#3B82F6' },
      { label: 'Fat',     value: Math.round(item.total_fat),     unit: 'g', color: '#F59E0B' },
      { label: 'Fiber',   value: Math.round(item.total_fiber),   unit: 'g', color: '#34D399' },
      { label: 'Sugar',   value: Math.round(item.total_sugar),   unit: 'g', color: '#E7B100' },
      { label: 'Sodium',  value: Math.round(item.total_sodium),  unit: 'mg', color: '#FB923C' },
    ];

    const arrowRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
      <View style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* ── Collapsed card structure (from screenshot) ── */}
        <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.cardContentWrap}>
          {/* Top Section: Icon, Meta Info, Eaten status, Chevron, Image Thumbnail */}
          <View style={styles.cardHeaderRow}>
            {/* Left circular icon box */}
            <View style={[styles.mealIconBox, { backgroundColor: iconInfo.bg }]}>
              <Ionicons name={iconInfo.icon as any} size={23} color={iconInfo.color} />
            </View>

            {/* Title & Time */}
            <View style={styles.mealMetaInfo}>
              <Text style={[styles.mealTitleLabel, { color: colors.text }]}>{iconInfo.label}</Text>
              <Text style={[styles.mealTimeLabel, { color: colors.textDim }]}>{timeStr}</Text>
            </View>

            {/* Eaten Badge */}
            <View style={[styles.eatenBadgeWrap, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark" size={11} color="#10B981" style={{ marginRight: 2 }} />
              <Text style={styles.eatenBadgeText}>Eaten</Text>
            </View>

            {/* Subtle Chevron */}
            <Animated.View style={{ transform: [{ rotate: arrowRotate }], marginHorizontal: 6 }}>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Animated.View>

            {/* Right Thumb Image */}
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.mealThumbImage} />
            ) : (
              <View style={[styles.mealThumbImagePlaceholder, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="image-outline" size={16} color={colors.textMuted} />
              </View>
            )}
          </View>

          {/* Bottom stats columns row */}
          <View style={styles.mealStatsRow}>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: colors.text }]}>{Math.round(item.total_calories)}</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>kcal</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: colors.text }]}>{Math.round(item.total_protein)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Protein</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: colors.text }]}>{Math.round(item.total_carbs)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Carbs</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: colors.text }]}>{Math.round(item.total_fat)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Fats</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Expandable detail ── */}
        {open && (
          <View style={[styles.accDetail, { borderTopColor: colors.border }]}>
            {/* Macro grid */}
            <View style={styles.macroGrid}>
              {/* Full-width calories pill */}
              <View style={[styles.macroPill, { backgroundColor: '#E7B10012', width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }]}>
                <Text style={[styles.macroPillLabel, { color: '#E7B100' }]}>Total Calories</Text>
                <Text style={[styles.macroPillVal, { color: '#E7B100', fontSize: 20 }]}>{Math.round(item.total_calories)} <Text style={{ fontSize: 13 }}>kcal</Text></Text>
              </View>
              {macros.map((m) => (
                <View key={m.label} style={[styles.macroPill, { backgroundColor: m.color + '12' }]}>
                  <Text style={[styles.macroPillVal, { color: m.color }]}>{m.value}{m.unit}</Text>
                  <Text style={[styles.macroPillLabel, { color: colors.textDim }]}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Food items */}
            {item.items?.length > 0 && (
              <View style={[styles.foodItemsWrap, { borderTopColor: colors.border }]}>
                <Text style={[styles.foodItemsTitle, { color: colors.text }]}>Items detected</Text>
                {item.items.map((food: any, idx: number) => (
                  <View key={idx} style={[styles.foodRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.foodName, { color: colors.text }]}>{food.item_name}</Text>
                      <Text style={[styles.foodQty, { color: colors.textMuted }]}>{food.quantity}</Text>
                    </View>
                    <Text style={[styles.foodCals, { color: colors.textMuted }]}>{Math.round(food.calories)} kcal</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Redesigned delete button inside expanded details */}
            <TouchableOpacity
              onPress={() => deleteMeal(item.id)}
              style={[styles.deleteMealBtn, { borderColor: colors.border + '50', backgroundColor: colors.inputBg }]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color="#E7B100" style={{ marginRight: 6 }} />
              <Text style={styles.deleteMealBtnText}>Delete Meal Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMealCard = ({ item }: { item: any }) => <MealAccordionCard item={item} />;

  const RenderLoadingCard = () => {
    const pulseAnim = React.useRef(new Animated.Value(0.4)).current;
    const skeletonColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    return (
      <View style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Animated.View style={[styles.mealCardImage, { backgroundColor: skeletonColor, opacity: pulseAnim }]} />
        <View style={styles.mealCardContent}>
          <View style={styles.mealCardHeader}>
            <View style={{ flex: 1 }}>
              <Animated.View style={{ height: 24, width: '50%', backgroundColor: skeletonColor, borderRadius: 6, opacity: pulseAnim }} />
              <Animated.View style={{ height: 14, width: '30%', backgroundColor: skeletonColor, borderRadius: 4, marginTop: 10, opacity: pulseAnim }} />
            </View>
          </View>
          
          <View style={[styles.nutrientRow, { marginTop: 20 }]}>
            {[1, 2, 3, 4].map((i) => (
              <Animated.View key={i} style={[styles.nutrientBadge, { backgroundColor: skeletonColor, height: 50, opacity: pulseAnim }]} />
            ))}
          </View>

          <View style={[styles.foodItemsList, { marginTop: 16 }]}>
            <Animated.View style={{ height: 12, width: '80%', backgroundColor: skeletonColor, borderRadius: 4, opacity: pulseAnim, marginBottom: 8 }} />
            <Animated.View style={{ height: 12, width: '70%', backgroundColor: skeletonColor, borderRadius: 4, opacity: pulseAnim }} />
          </View>
        </View>
      </View>
    );
  };

  const NutrientBadge = ({ label, value, color, unit = 'g' }: { label: string, value: number, color: string, unit?: string }) => (
    <View style={[styles.nutrientBadge, { backgroundColor: color + '15' }]}>
      <Text style={[styles.nutrientBadgeValue, { color }]}>{value}{unit}</Text>
      <Text style={[styles.nutrientBadgeLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  // Target calculations — prefer backend-computed targets (AI coach) for accuracy
  const getTargets = () => {
    // ✅ Use backend scientific targets if available (Katch-McArdle or Mifflin-St Jeor)
    if (recommendationData?.targets) {
      return {
        caloriesTarget: recommendationData.targets.calories,
        proteinTarget:  recommendationData.targets.protein,
        carbsTarget:    recommendationData.targets.carbs,
        fatTarget:      recommendationData.targets.fat,
      };
    }

    // Fallback: local rough Mifflin estimate when no server data yet
    let weight = 70, height = 170, age = 30, goal = 'Maintain', activity = 'Lightly Active';
    if (userData) {
      if (userData.weight) weight = parseFloat(userData.weight.toString().replace(/[^0-9.]/g, '')) || 70;
      if (userData.height) height = parseFloat(userData.height.toString().replace(/[^0-9.]/g, '')) || 170;
      if (userData.age) age = parseInt(userData.age) || 30;
      goal = userData.fitness_goal || 'Maintain';
      activity = userData.activity_level || 'Lightly Active';
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    // ✅ FIXED - match backend logic exactly
let mult = 1.375; // Lightly Active default
if (activity.toLowerCase().includes('sedentary')) mult = 1.2;
else if (activity.toLowerCase().includes('extreme') || activity.toLowerCase().includes('extra')) mult = 1.9;
else if (activity.toLowerCase().includes('very')) mult = 1.725;
else if (activity.toLowerCase().includes('moderate')) mult = 1.55;

    let tdee = bmr * mult;
    if (goal.toLowerCase().includes('lose') || goal.toLowerCase().includes('cut')) tdee -= 500;
    if (goal.toLowerCase().includes('gain') || goal.toLowerCase().includes('bulk')) tdee += 500;

    const caloriesTarget = Math.round(tdee);
    let proteinTarget = Math.round(weight * 2);
    if (goal.toLowerCase().includes('gain')) proteinTarget = Math.round(weight * 2.2);
    const fatTarget = Math.round(weight * 0.9);
    let carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);
    if (carbsTarget < 0) carbsTarget = 50;

    return { caloriesTarget, proteinTarget, carbsTarget, fatTarget };
  };

  const targets = getTargets();

  const getBmiColor = (category: string) => {
    switch (category) {
      case 'Underweight': return '#3B82F6';
      case 'Normal weight': return '#10B981';
      case 'Overweight': return '#F59E0B';
      case 'Obesity': return '#E7B100';
      default: return '#10B981';
    }
  };

  const RecommendedMealCard = ({ meal, mealIndex }: { meal: any, mealIndex: number }) => {
    const [open, setOpen] = useState(false);
    const anim = React.useRef(new Animated.Value(0)).current;
    
    const toggle = () => {
      const toVal = open ? 0 : 1;
      setOpen(!open);
      Animated.spring(anim, { toValue: toVal, useNativeDriver: false, tension: 60, friction: 12 }).start();
    };

    const arrowRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
      <View style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.cardContentWrap}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.mealIconBox, { backgroundColor: '#2596BE10' }]}>
              <Ionicons name="sparkles" size={20} color="#2596BE" />
            </View>
            <View style={styles.mealMetaInfo}>
              <Text style={[styles.mealTitleLabel, { color: colors.text, fontSize: 16 }]}>{meal.meal_type}</Text>
              <Text style={[styles.mealTimeLabel, { color: colors.textDim, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>{meal.title}</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: arrowRotate }], marginHorizontal: 6 }}>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Animated.View>
          </View>

          <View style={styles.mealStatsRow}>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: colors.text }]}>{Math.round(meal.calories)}</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>kcal</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: '#10B981' }]}>{Math.round(meal.protein)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Protein</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: '#3B82F6' }]}>{Math.round(meal.carbs)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Carbs</Text>
            </View>
            <View style={styles.mealStatCol}>
              <Text style={[styles.mealStatNum, { color: '#F59E0B' }]}>{Math.round(meal.fat)}g</Text>
              <Text style={[styles.mealStatUnit, { color: colors.textMuted }]}>Fats</Text>
            </View>
          </View>
        </TouchableOpacity>

        {open && (
          <View style={[styles.accDetail, { borderTopColor: colors.border }]}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textDim, lineHeight: 18, marginTop: 10 }}>
              {meal.description}
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.text, marginBottom: 6 }}>Ingredients</Text>
              {meal.ingredients?.map((ing: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.text }}>{ing.name}</Text>
                    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 11, color: colors.textDim, marginTop: 1 }}>{ing.quantity}</Text>
                    {ing.calories !== undefined && (
                      <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                        {ing.calories} kcal · P: {ing.protein}g · C: {ing.carbs}g · F: {ing.fat}g
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setActiveMealIdx(mealIndex);
                        setActiveIngredientIdx(i);
                        setSelectorSearch('');
                        setSelectorFoods([]);
                        setShowItemSelector(true);
                        loadAlternativeFoods(ing);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.inputBg }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.text} style={{ marginRight: 2 }} />
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: colors.text }}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteIngredient(mealIndex, i)}
                      style={{ padding: 6, borderRadius: 8, backgroundColor: '#E7B10015' }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#E7B100" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.text, marginBottom: 4 }}>Preparation Instructions</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim, lineHeight: 18 }}>{meal.instructions}</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleLogRecommendedMeal(meal)}
              style={[styles.deleteMealBtn, { borderColor: '#2596BE30', backgroundColor: '#2596BE10' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#2596BE" style={{ marginRight: 6 }} />
              <Text style={[styles.deleteMealBtnText, { color: '#2596BE' }]}>Quick Log Meal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderRecommendations = () => {
    const renderRecommendationState = (content: React.ReactNode) => (
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {renderTopChrome()}
        <View style={styles.recommendationStateWrap}>
          {content}
        </View>
      </ScrollView>
    );

    if (recommendationLoading) {
      return renderRecommendationState(
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2596BE" />
          <Text style={{ marginTop: 14, fontFamily: FONTS.bodySemiBold, color: colors.textDim }}>AI Diet Coach is preparing your personalized plan...</Text>
        </View>
      );
    }

    if (recommendationError) {
      return renderRecommendationState(
        <View style={[styles.emptyContainer, { paddingHorizontal: 20 }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.textDim} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, textAlign: 'center' }]}>Onboarding Incomplete</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted, maxWidth: 280, textAlign: 'center' }]}>
            {recommendationError.includes('height') || recommendationError.includes('onboarding') ? 'Please complete your physical measurements (height, weight, and fitness goal) inside onboarding/profile to generate AI meal recommendations!' : recommendationError}
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: '#2596BE15', borderColor: '#2596BE30', borderWidth: 1 }]}
            onPress={() => fetchRecommendations(true)}
          >
            <Ionicons name="refresh-outline" size={16} color="#2596BE" />
            <Text style={{ color: '#2596BE', fontFamily: FONTS.bodyBold, fontSize: 13 }}>Retry Loading Coach</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!recommendationData) {
      return renderRecommendationState(
        <View style={[styles.emptyContainer, { paddingHorizontal: 20 }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="sparkles-outline" size={40} color={colors.textDim} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Diet coach unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted, maxWidth: 280, textAlign: 'center' }]}>
            We could not load your AI nutrition plan right now. Please try again in a moment.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: '#2596BE15', borderColor: '#2596BE30', borderWidth: 1 }]}
            onPress={() => fetchRecommendations(true)}
          >
            <Ionicons name="refresh-outline" size={16} color="#2596BE" />
            <Text style={{ color: '#2596BE', fontFamily: FONTS.bodyBold, fontSize: 13 }}>Reload Coach</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {renderTopChrome()}
        {recommendationData.profileIncomplete && (
          <View style={[styles.recCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30', padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 14 }]}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
            <Text style={{ flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 12, color: colors.text, lineHeight: 18 }}>
              Profile incomplete. We're using standard values (70kg, 170cm). Please complete your height/weight in Profile for fully personalized targets!
            </Text>
          </View>
        )}

        {/* welcome banner */}
        <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 18, borderLeftWidth: 4, borderLeftColor: '#2596BE', marginBottom: 14 }]}>
          <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: colors.text }}>Meet Your AI Diet Coach 🥗</Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>
            Grounded in scientific targets and your custom preferences.
          </Text>
        </View>

        {/* BMI gauge */}
        <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: FONTS.heading, color: colors.text }}>Your Body Mass Index (BMI)</Text>
            <View style={[styles.eatenBadgeWrap, { backgroundColor: getBmiColor(recommendationData.bmiCategory) + '20' }]}>
              <Text style={[styles.eatenBadgeText, { color: getBmiColor(recommendationData.bmiCategory) }]}>{recommendationData.bmiCategory}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 32, fontFamily: FONTS.heading, color: colors.text }}>
              {recommendationData.bmi} <Text style={{ fontSize: 14, fontFamily: FONTS.body, color: colors.textMuted }}>kg/m²</Text>
            </Text>
            {/* Beautiful progress indicator bar */}
            <View style={styles.bmiGaugeTrack}>
              <View style={[styles.bmiGaugeFill, { width: `${Math.min(100, (recommendationData.bmi / 40) * 100)}%`, backgroundColor: getBmiColor(recommendationData.bmiCategory) }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>15.0</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>Under</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>Normal</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>Over</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>Obesity</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted }}>40.0</Text>
            </View>
          </View>
        </View>

        {/* daily macro targets */}
        <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 14 }]}>
          <Text style={{ fontSize: 14, fontFamily: FONTS.heading, color: colors.text, marginBottom: 12 }}>AI Daily Target Recommendation</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 24, fontFamily: FONTS.heading, color: '#E7B100' }}>{recommendationData.targets.calories} <Text style={{ fontSize: 12, fontFamily: FONTS.body, color: colors.textMuted }}>kcal</Text></Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.bodySemiBold, color: colors.textMuted, marginTop: 2 }}>DAILY CALORIE BUDGET</Text>
            </View>
            <View style={{ height: 40, width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.bodySemiBold, color: colors.text }}>Goal: {userData?.fitness_goal || 'Maintain'}</Text>
              <Text style={{ fontSize: 10, fontFamily: FONTS.body, color: colors.textMuted, marginTop: 4 }}>Based on physical profile</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#10B98115', padding: 10, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#10B981', fontFamily: FONTS.heading, fontSize: 16 }}>{recommendationData.targets.protein}g</Text>
              <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold, fontSize: 8, marginTop: 2, textTransform: 'uppercase' }}>Protein</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#3B82F615', padding: 10, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#3B82F6', fontFamily: FONTS.heading, fontSize: 16 }}>{recommendationData.targets.carbs}g</Text>
              <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold, fontSize: 8, marginTop: 2, textTransform: 'uppercase' }}>Carbs</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F59E0B15', padding: 10, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#F59E0B', fontFamily: FONTS.heading, fontSize: 16 }}>{recommendationData.targets.fat}g</Text>
              <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold, fontSize: 8, marginTop: 2, textTransform: 'uppercase' }}>Fats</Text>
            </View>
          </View>
        </View>

        {/* CSV dataset alignment */}
        <View style={[styles.groundingCard, { borderColor: '#2596BE30', marginBottom: 20 }]}>
          <LinearGradient colors={isDark ? ['#300000', '#150000'] : ['#FFF5F5', '#FFEBEB']} style={{ padding: 16, borderRadius: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="shield-checkmark" size={20} color="#2596BE" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontFamily: FONTS.heading, color: '#2596BE' }}>GYM.csv Dataset Alignment</Text>
            </View>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.text, lineHeight: 18, marginBottom: 12 }}>
              We've matched your profile (Gender: {recommendationData.csvGrounding.gender === 'female' ? 'Female' : 'Male'}, Goal: {recommendationData.csvGrounding.goal === 'muscle_gain' ? 'Muscle Gain' : 'Fat Burn'}, Category: {recommendationData.bmiCategory}) to our dataset. Here is your structured guidance:
            </Text>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="barbell-outline" size={16} color="#2596BE" style={{ marginTop: 2, marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: colors.text }}>Recommended Exercise Schedule</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim, marginTop: 2 }}>{recommendationData.csvGrounding.schedule}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="restaurant-outline" size={16} color="#2596BE" style={{ marginTop: 2, marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: colors.text }}>Dietary Target Theme</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim, marginTop: 2 }}>{recommendationData.csvGrounding.mealPlan}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Tailored AI Meal Plan CTA Card ── */}
        <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: '#2596BE40', borderWidth: 1.5, marginBottom: 14, overflow: 'hidden' }]}>
          <LinearGradient
            colors={isDark ? ['rgba(224,0,0,0.12)', 'rgba(100,0,0,0.06)'] : ['rgba(255,235,235,0.9)', 'rgba(255,220,220,0.5)']}
            style={{ padding: 18, borderRadius: 22 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#2596BE18', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="sparkles" size={22} color="#2596BE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.heading, fontSize: 16, color: colors.text }}>Tailored AI Meal Plan</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {recommendationData.recommendedMeals?.length
                    ? `${recommendationData.recommendedMeals.length} meals · Tap to reconfigure`
                    : 'Configure your profile to generate meals'}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18, marginBottom: 14 }}>
              Set your gender, age, body fat, diet type, food preferences & meal frequency — we'll scientifically scale clean recipes to hit your exact targets.
            </Text>
            <TouchableOpacity onPress={openDietForm} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={['#2596BE', '#960000']} style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="options-outline" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 14, letterSpacing: 0.5 }}>Configure & View Diet Meals 🥗</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ── Recommended Meals (shown after configuration) ── */}
        {recommendationData.recommendedMeals?.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2596BE12', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginHorizontal: 10 }}>
                <Ionicons name="restaurant-outline" size={12} color="#2596BE" style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: '#2596BE' }}>YOUR AI DIET PLAN</Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
            {recommendationData.recommendedMeals.map((meal: any, idx: number) => (
              <RecommendedMealCard key={idx} meal={meal} mealIndex={idx} />
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const filteredMeals = meals.filter(m => isSameDay(new Date(m.logged_at), selectedDate));
  
  const calsConsumed = filteredMeals.reduce((acc, curr) => acc + (curr.total_calories || 0), 0);
  const proteinConsumed = filteredMeals.reduce((acc, curr) => acc + (curr.total_protein || 0), 0);
  const carbsConsumed = filteredMeals.reduce((acc, curr) => acc + (curr.total_carbs || 0), 0);
  const fatConsumed = filteredMeals.reduce((acc, curr) => acc + (curr.total_fat || 0), 0);
  const headerDescription = activeTab === 'tracker'
    ? 'Log your daily meals'
    : 'Personalized AI diet coaching';

  const renderTopChrome = () => (
    <View>
      <View style={[styles.header, { marginTop: 6 }]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{headerDescription}</Text>
        </View>
        <View style={styles.headerActionWrap}>
          <TouchableOpacity style={styles.logMealBtn} onPress={() => setShowLogForm(true)} activeOpacity={0.85}>
            <View style={styles.logMealBtnFill}>
              <Ionicons name="add-circle-outline" size={18} color="#FFF" />
              <Text style={styles.logMealBtnText} numberOfLines={1}>Log Meal</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tabSelectorContainer, { backgroundColor: colors.inputBg, marginTop: 2 }]}>
        <TouchableOpacity
          style={[styles.tabSelectorBtn, activeTab === 'tracker' && [styles.tabSelectorActiveBtn, { backgroundColor: '#2596BE' }]]}
          onPress={() => setActiveTab('tracker')}
        >
          <Ionicons name="nutrition-outline" size={16} color={activeTab === 'tracker' ? '#FFF' : colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.tabSelectorText, activeTab === 'tracker' ? { color: '#FFF' } : { color: colors.textMuted }]}>Daily Tracker</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabSelectorBtn, activeTab === 'recommendations' && [styles.tabSelectorActiveBtn, { backgroundColor: '#2596BE' }]]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Ionicons name="sparkles-outline" size={16} color={activeTab === 'recommendations' ? '#FFF' : colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.tabSelectorText, activeTab === 'recommendations' ? { color: '#FFF' } : { color: colors.textMuted }]}>AI Diet Coach</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {activeTab === 'tracker' ? (
        <FlatList
          data={loading ? [] : uploading ? [{ id: 'loading' }, ...filteredMeals] : filteredMeals}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
              <View>
                {renderTopChrome()}
                <View style={styles.trackerHeaderContent}>
                  <DatePicker selectedDate={selectedDate} onSelectDate={setSelectedDate} variant="nutrition" />

                  <NutritionMeter
                    caloriesConsumed={calsConsumed}
                    caloriesTarget={targets.caloriesTarget}
                    protein={{ label: 'Protein', icon: 'barbell-outline', consumed: proteinConsumed, target: targets.proteinTarget, color: '#10B981', unit: 'g' }}
                    carbs={{   label: 'Carbs',   icon: 'pizza-outline',   consumed: carbsConsumed,   target: targets.carbsTarget,   color: '#3B82F6', unit: 'g' }}
                    fat={{     label: 'Fat',     icon: 'water-outline',   consumed: fatConsumed,     target: targets.fatTarget,     color: '#F59E0B', unit: 'g' }}
                  />
                  <WaterTracker selectedDate={selectedDate} />
                  {filteredMeals.length > 0 && (
                    <View style={styles.sectionDivider}>
                      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                      <View style={[styles.sectionLabelWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="restaurant-outline" size={13} color={colors.textDim} />
                        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                          {filteredMeals.length} Meal{filteredMeals.length !== 1 ? 's' : ''} · {Math.round(calsConsumed)} kcal
                        </Text>
                      </View>
                      <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                    </View>
                  )}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              if (item.id === 'loading') {
                return (
                  <View style={styles.trackerItemWrap}>
                    <RenderLoadingCard />
                  </View>
                );
              }

              return (
                <View style={styles.trackerItemWrap}>
                  {renderMealCard({ item })}
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              uploading ? null : (
                <View style={styles.trackerItemWrap}>
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="restaurant-outline" size={40} color={colors.textDim} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals logged</Text>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap + to log a meal and track your nutrition</Text>
                    <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#2596BE15', borderColor: '#2596BE30', borderWidth: 1 }]} onPress={() => setShowLogForm(true)}>
                      <Ionicons name="add-circle-outline" size={16} color="#2596BE" />
                      <Text style={{ color: '#2596BE', fontFamily: FONTS.bodyBold, fontSize: 13 }}>Log Your First Meal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            }
          />
        ) : (
          renderRecommendations()
        )}

      {/* ══════════════════════════════════════════════
           INGREDIENT SELECTOR MODAL (100 items w/ images)
      ══════════════════════════════════════════════ */}
      <Modal visible={showItemSelector} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={[styles.fsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fsTitle, { color: colors.text }]}>
                Replace Ingredient
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                Suggested items with similar nutritional values
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setShowItemSelector(false); }}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Results or Loading / Empty */}
          {selectorLoading && selectorFoods.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2596BE" />
              <Text style={{ marginTop: 14, fontFamily: FONTS.bodySemiBold, color: colors.textDim }}>Loading ingredients...</Text>
            </View>
          ) : selectorFoods.length === 0 ? (
            <View style={styles.fsEmptyWrap}>
              <View style={[styles.fsEmptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={36} color={colors.textDim} />
              </View>
              <Text style={[styles.fsEmptyTitle, { color: colors.text }]}>No alternatives found</Text>
              <Text style={[styles.fsEmptyText, { color: colors.textMuted }]}>Could not find similar items</Text>
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
                    {/* Food Image */}
                    {item.image_url || item.image_small_url ? (
                      <Image
                        source={{ uri: item.image_url || item.image_small_url }}
                        style={styles.selectorFoodImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.selectorFoodImagePlaceholder, { backgroundColor: colors.inputBg }]}>
                        <Ionicons name="nutrition-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}

                    {/* Food Info */}
                    <View style={styles.selectorFoodContent}>
                      <Text style={[styles.selectorFoodName, { color: colors.text }]} numberOfLines={2}>
                        {item.food_name}
                      </Text>
                      
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

                  {/* Macro Badges Row */}
                  <View style={styles.selectorFoodMacroRow}>
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

      {/* ══════════════════════════════════════════════
           FOOD DATABASE SEARCH MODAL (300k foods)
      ══════════════════════════════════════════════ */}
      <Modal visible={showFoodSearch} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={[styles.fsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fsTitle, { color: colors.text }]}>Food Database</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                {foodSearchTotal > 0 ? `${foodSearchTotal.toLocaleString()} matches · ` : ''}300k+ foods indexed
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setShowFoodSearch(false); setSelectedFoodDetail(null); }}
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.fsSearchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textDim} style={{ marginRight: 10 }} />
            <TextInput
              ref={searchInputRef}
              style={{ flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15, color: colors.text }}
              placeholder="Search chicken, rice, apple..."
              placeholderTextColor={colors.textDim}
              value={foodSearchQuery}
              onChangeText={(text) => {
                setFoodSearchQuery(text);
                // Inline debounce: clear previous timer, fire after 400ms
                if ((global as any)._foodSearchTimer) clearTimeout((global as any)._foodSearchTimer);
                (global as any)._foodSearchTimer = setTimeout(() => searchFoods(text), 400);
              }}
              returnKeyType="search"
              onSubmitEditing={() => searchFoods(foodSearchQuery)}
            />
            {foodSearchLoading && <ActivityIndicator size="small" color="#2596BE" style={{ marginLeft: 8 }} />}
            {foodSearchQuery.length > 0 && !foodSearchLoading && (
              <TouchableOpacity onPress={() => { setFoodSearchQuery(''); setFoodSearchResults([]); setFoodSearchTotal(0); }}>
                <Ionicons name="close-circle" size={18} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results or Empty */}
          {foodSearchResults.length === 0 && !foodSearchLoading ? (
            <View style={styles.fsEmptyWrap}>
              {foodSearchQuery.length < 2 ? (
                <>
                  <View style={[styles.fsEmptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="library-outline" size={36} color={colors.textDim} />
                  </View>
                  <Text style={[styles.fsEmptyTitle, { color: colors.text }]}>300,000+ Foods</Text>
                  <Text style={[styles.fsEmptyText, { color: colors.textMuted }]}>
                    Search any food to get full nutrition data from OpenFoodFacts, USDA, and curated datasets.
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.fsEmptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={36} color={colors.textDim} />
                  </View>
                  <Text style={[styles.fsEmptyTitle, { color: colors.text }]}>No results found</Text>
                  <Text style={[styles.fsEmptyText, { color: colors.textMuted }]}>Try a different spelling or shorter keyword</Text>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={foodSearchResults}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isExpanded = selectedFoodDetail?.id === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSelectedFoodDetail(isExpanded ? null : item)}
                    style={[styles.fsFoodCard, { backgroundColor: colors.card, borderColor: isExpanded ? '#2596BE' : colors.border }]}
                  >
                    {/* Top row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fsFoodName, { color: colors.text }]} numberOfLines={2}>{item.food_name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                          {item.category ? (
                            <View style={{ backgroundColor: colors.inputBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10, color: colors.textDim }}>{item.category}</Text>
                            </View>
                          ) : null}
                          {item.serving_size ? (
                            <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: colors.textMuted }}>per {item.serving_size}</Text>
                          ) : (
                            <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: colors.textMuted }}>per 100g</Text>
                          )}
                        </View>
                      </View>
                      {/* Nutrition Grade Badge */}
                      {item.nutrition_grade ? (
                        <View style={[styles.fsGradeBadge, { backgroundColor: item.nutrition_grade.toLowerCase() === 'a' ? '#10B98120' : item.nutrition_grade.toLowerCase() === 'b' ? '#3B82F620' : item.nutrition_grade.toLowerCase() === 'c' ? '#F59E0B20' : '#E7B10020' }]}>
                          <Text style={{ fontFamily: FONTS.heading, fontSize: 14, color: item.nutrition_grade.toLowerCase() === 'a' ? '#10B981' : item.nutrition_grade.toLowerCase() === 'b' ? '#3B82F6' : item.nutrition_grade.toLowerCase() === 'c' ? '#F59E0B' : '#E7B100' }}>{item.nutrition_grade.toUpperCase()}</Text>
                        </View>
                      ) : null}
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} style={{ marginLeft: 8 }} />
                    </View>

                    {/* Macro mini-row */}
                    <View style={styles.fsMacroRow}>
                      <View style={styles.fsMacroChip}>
                        <Text style={[styles.fsMacroVal, { color: '#E7B100' }]}>{Math.round(item.calories_kcal || 0)}</Text>
                        <Text style={styles.fsMacroLbl}>kcal</Text>
                      </View>
                      <View style={styles.fsMacroChip}>
                        <Text style={[styles.fsMacroVal, { color: '#10B981' }]}>{Math.round(item.protein_g || 0)}g</Text>
                        <Text style={styles.fsMacroLbl}>protein</Text>
                      </View>
                      <View style={styles.fsMacroChip}>
                        <Text style={[styles.fsMacroVal, { color: '#3B82F6' }]}>{Math.round(item.carbohydrates_g || 0)}g</Text>
                        <Text style={styles.fsMacroLbl}>carbs</Text>
                      </View>
                      <View style={styles.fsMacroChip}>
                        <Text style={[styles.fsMacroVal, { color: '#F59E0B' }]}>{Math.round(item.fat_g || 0)}g</Text>
                        <Text style={styles.fsMacroLbl}>fat</Text>
                      </View>
                    </View>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <View style={[styles.fsDetailWrap, { borderTopColor: colors.border }]}>
                        {/* Extra nutrients */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {item.fiber_g != null && <View style={[styles.fsNutrientPill, { backgroundColor: '#34D39915' }]}><Text style={{ color: '#34D399', fontFamily: FONTS.bodySemiBold, fontSize: 12 }}>{Math.round(item.fiber_g)}g fiber</Text></View>}
                          {item.sugars_g != null && <View style={[styles.fsNutrientPill, { backgroundColor: '#E7B10015' }]}><Text style={{ color: '#E7B100', fontFamily: FONTS.bodySemiBold, fontSize: 12 }}>{Math.round(item.sugars_g)}g sugar</Text></View>}
                          {item.sodium_mg != null && <View style={[styles.fsNutrientPill, { backgroundColor: '#FB923C15' }]}><Text style={{ color: '#FB923C', fontFamily: FONTS.bodySemiBold, fontSize: 12 }}>{Math.round(item.sodium_mg)}mg sodium</Text></View>}
                          {item.saturated_fat_g != null && <View style={[styles.fsNutrientPill, { backgroundColor: '#8B5CF615' }]}><Text style={{ color: '#8B5CF6', fontFamily: FONTS.bodySemiBold, fontSize: 12 }}>{Math.round(item.saturated_fat_g)}g sat.fat</Text></View>}
                        </View>
                        {/* Quick log button */}
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const token = await AsyncStorage.getItem('userToken');
                              const hour = new Date().getHours();
                              let mealTypeMap = 'Night';
                              if (hour >= 5 && hour < 11) mealTypeMap = 'Morning';
                              else if (hour >= 11 && hour < 16) mealTypeMap = 'Afternoon';
                              else if (hour >= 16 && hour < 20) mealTypeMap = 'Evening';
                              await axios.post(`${API_URL}/meals`, {
                                image_url: '',
                                meal_type: mealTypeMap,
                                total_calories: Math.round(item.calories_kcal || 0),
                                total_protein: Math.round(item.protein_g || 0),
                                total_carbs: Math.round(item.carbohydrates_g || 0),
                                total_fat: Math.round(item.fat_g || 0),
                                total_fiber: Math.round(item.fiber_g || 0),
                                total_sugar: Math.round(item.sugars_g || 0),
                                total_sodium: Math.round(item.sodium_mg || 0),
                                total_saturated_fat: Math.round(item.saturated_fat_g || 0),
                                total_cholesterol: 0,
                                items: [{ item_name: item.food_name, quantity: item.serving_size || '100g', calories: Math.round(item.calories_kcal || 0), protein: Math.round(item.protein_g || 0), carbs: Math.round(item.carbohydrates_g || 0), fat: Math.round(item.fat_g || 0) }]
                              }, { headers: { Authorization: `Bearer ${token}` } });
                              showToast(`${item.food_name} logged! 🎉`);
                              fetchMeals();
                              setShowFoodSearch(false);
                            } catch (e) {
                              showToast('Failed to log food', 'error');
                            }
                          }}
                          style={[styles.fsLogBtn, { backgroundColor: '#2596BE12', borderColor: '#2596BE30' }]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle-outline" size={16} color="#2596BE" style={{ marginRight: 6 }} />
                          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: '#2596BE' }}>Quick Log This Food</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* Log Meal Form Modal */}
      <Modal visible={showLogForm} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: 'auto', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Meal</Text>
              <TouchableOpacity onPress={() => setShowLogForm(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[styles.imageUploadBox, { borderColor: colors.border }]} onPress={handlePickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={40} color={colors.textDim} />
                    <Text style={{ color: colors.textDim, fontFamily: FONTS.bodyBold, marginTop: 8 }}>SELECT MEAL PHOTO</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>Description / Ingredients (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Describe your meal to help AI be more accurate..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={4}
                value={mealDescription}
                onChangeText={setMealDescription}
              />
              
              <TouchableOpacity 
                style={[styles.saveBtn, { marginTop: 30, opacity: selectedImage ? 1 : 0.5 }]} 
                onPress={startAnalysis}
                disabled={!selectedImage || uploading}
              >
                <LinearGradient colors={['#2596BE', '#1a6e8a']} style={styles.saveBtnGrad}>
                  {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>ANALYZE & LOG</Text>}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Analysis Modal */}
      <Modal visible={showAnalysis} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Meal Analysis</Text>
              <TouchableOpacity onPress={() => setShowAnalysis(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: analyzedImageUrl }} style={styles.analysisImage} />
              
              <View style={styles.typeSelector}>
                {['Morning', 'Afternoon', 'Evening', 'Night'].map((t) => (
                  <TouchableOpacity 
                    key={t} 
                    onPress={() => setMealType(t)}
                    style={[
                      styles.typeBtn, 
                      { backgroundColor: colors.inputBg },
                      mealType === t && { backgroundColor: '#2596BE' }
                    ]}
                  >
                    <Text style={[styles.typeBtnText, { color: colors.textMuted }, mealType === t && { color: '#FFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.summaryGrid}>
                <SummaryItem label="Calories" value={Math.round(analysisData?.total_calories || 0)} unit="kcal" color="#E7B100" />
                <SummaryItem label="Protein" value={Math.round(analysisData?.total_protein || 0)} unit="g" color="#10B981" />
                <SummaryItem label="Carbs" value={Math.round(analysisData?.total_carbs || 0)} unit="g" color="#3B82F6" />
                <SummaryItem label="Fat" value={Math.round(analysisData?.total_fat || 0)} unit="g" color="#F59E0B" />
              </View>

              <View style={[styles.summaryGrid, { marginTop: -12 }]}>
                <SummaryItem label="Fiber" value={Math.round(analysisData?.total_fiber || 0)} unit="g" color="#10B981" />
                <SummaryItem label="Sugar" value={Math.round(analysisData?.total_sugar || 0)} unit="g" color="#E7B100" />
                <SummaryItem label="Sodium" value={Math.round(analysisData?.total_sodium || 0)} unit="mg" color="#F59E0B" />
                <SummaryItem label="Sat. Fat" value={Math.round(analysisData?.total_saturated_fat || 0)} unit="g" color="#E7B100" />
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Detected Items</Text>
              {analysisData?.items?.map((item: any, idx: number) => (
                <View key={idx} style={[styles.itemRow, { backgroundColor: colors.inputBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.item_name}</Text>
                    <Text style={[styles.itemQty, { color: colors.textMuted }]}>{item.quantity}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemCals, { color: colors.text }]}>{Math.round(item.calories)} kcal</Text>
                    <Text style={[styles.itemMacros, { color: colors.textDim }]}>
                      Sugar: {Math.round(item.sugar)}g • Sodium: {Math.round(item.sodium)}mg
                    </Text>
                  </View>
                </View>
              ))}

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMeal} disabled={saving}>
                <LinearGradient colors={['#2596BE', '#1a6e8a']} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SAVE MEAL</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
           DIET PROFILE FORM MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={showDietForm} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        >
          <View style={[styles.dietFormSheet, { backgroundColor: colors.card }]}>
            {/* ── Form Header ── */}
            <View style={styles.dietFormHeader}>
              <LinearGradient colors={['#2596BE', '#0d4d65']} style={styles.dietFormHeaderGrad}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="body-outline" size={20} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: '#FFF' }}>Customize Diet Profile</Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>Your plan will be perfectly scaled to these details</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDietForm(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

              {/* ── Section: Physical Profile ── */}
              <Text style={[styles.dietFormSectionTitle, { color: colors.text }]}>📐 Physical Profile</Text>

              {/* Gender */}
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Gender</Text>
              <View style={styles.dietFormSelectRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setFormGender(g)}
                    style={[styles.dietFormSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, formGender === g && styles.dietFormSelectBtnActive]}
                  >
                    <Text style={[styles.dietFormSelectBtnText, { color: formGender === g ? '#FFF' : colors.textDim }]}>
                      {g === 'Male' ? '♂ Male' : g === 'Female' ? '♀ Female' : '⊕ Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age / Height / Weight / Body Fat grid */}
              <View style={styles.dietFormGrid}>
                <View style={styles.dietFormGridCell}>
                  <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Age</Text>
                  <TextInput
                    style={[styles.dietFormInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="30"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={formAge}
                    onChangeText={setFormAge}
                  />
                </View>
                <View style={styles.dietFormGridCell}>
                  <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.dietFormInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="170"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={formHeight}
                    onChangeText={setFormHeight}
                  />
                </View>
                <View style={styles.dietFormGridCell}>
                  <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.dietFormInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="70"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={formWeight}
                    onChangeText={setFormWeight}
                  />
                </View>
                <View style={styles.dietFormGridCell}>
                  <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Body Fat (%)</Text>
                  <TextInput
                    style={[styles.dietFormInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="20"
                    placeholderTextColor={colors.textDim}
                    keyboardType="numeric"
                    value={formBodyFat}
                    onChangeText={setFormBodyFat}
                  />
                </View>
              </View>

              {/* ── Section: Goals & Lifestyle ── */}
              <Text style={[styles.dietFormSectionTitle, { color: colors.text, marginTop: 20 }]}>🎯 Goals & Lifestyle</Text>

              {/* Fitness Goal */}
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Fitness Goal</Text>
              <View style={styles.dietFormSelectRow}>
                {[['Lose Fat', '🔥'], ['Maintain', '⚖️'], ['Gain Muscle', '💪']].map(([g, icon]) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setFormFitnessGoal(g)}
                    style={[styles.dietFormSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, formFitnessGoal === g && styles.dietFormSelectBtnActive]}
                  >
                    <Text style={[styles.dietFormSelectBtnText, { color: formFitnessGoal === g ? '#FFF' : colors.textDim }]}>{icon} {g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Activity Level */}
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Activity Level</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active'].map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setFormActivityLevel(a)}
                    style={[
                      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      formActivityLevel === a && { backgroundColor: '#2596BE', borderColor: '#2596BE' }
                    ]}
                  >
                    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: formActivityLevel === a ? '#FFF' : colors.textDim }}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Section: Diet Preferences ── */}
              <Text style={[styles.dietFormSectionTitle, { color: colors.text, marginTop: 20 }]}>🥗 Diet Preferences</Text>

              {/* Diet Type */}
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>Diet Type</Text>
              <View style={styles.dietFormSelectRow}>
                {[['Standard', '🍗'], ['Vegetarian', '🥦'], ['Vegan', '🌱']].map(([d, icon]) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setFormDietType(d)}
                    style={[styles.dietFormSelectBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }, formDietType === d && styles.dietFormSelectBtnActive]}
                  >
                    <Text style={[styles.dietFormSelectBtnText, { color: formDietType === d ? '#FFF' : colors.textDim }]}>{icon} {d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Food Preferences / Allergies */}
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted, marginTop: 14 }]}>Food Preferences / Allergies</Text>
              <TextInput
                style={[styles.dietFormInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="e.g. No gluten, love nuts, avoid dairy..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={3}
                value={formFoodPreference}
                onChangeText={setFormFoodPreference}
              />

              {/* ── Section: Meal Frequency ── */}
              <Text style={[styles.dietFormSectionTitle, { color: colors.text, marginTop: 20 }]}>🍽️ Meal Frequency</Text>
              <Text style={[styles.dietFormFieldLabel, { color: colors.textMuted }]}>How many meals per day?</Text>

              <View style={styles.dietFormMealFreqRow}>
                <TouchableOpacity
                  onPress={() => setFormMealsPerDay(Math.max(2, formMealsPerDay - 1))}
                  style={[styles.dietFormStepBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                >
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.heading, fontSize: 36, color: '#2596BE' }}>{formMealsPerDay}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                    {formMealsPerDay === 2 ? 'Lunch + Dinner'
                      : formMealsPerDay === 3 ? 'Breakfast · Lunch · Dinner'
                      : formMealsPerDay === 4 ? 'Breakfast · Lunch · Dinner · Snack'
                      : formMealsPerDay === 5 ? 'Breakfast · Snack · Lunch · Dinner · Snack'
                      : '6 meals: Full athlete split'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setFormMealsPerDay(Math.min(6, formMealsPerDay + 1))}
                  style={[styles.dietFormStepBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                >
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Meal frequency visual pills */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <TouchableOpacity key={i + 1} onPress={() => setFormMealsPerDay(i + 1 < 2 ? 2 : i + 1 > 6 ? 6 : i + 1)}>
                    <View style={[
                      { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
                      i + 1 >= 2 && i + 1 <= 6
                        ? (formMealsPerDay === i + 1
                            ? { backgroundColor: '#2596BE', borderColor: '#2596BE' }
                            : { backgroundColor: colors.inputBg, borderColor: colors.border })
                        : { backgroundColor: colors.inputBg, borderColor: colors.border, opacity: 0.3 }
                    ]}>
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: formMealsPerDay === i + 1 ? '#FFF' : colors.textDim }}>{i + 1}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 16 }} />

              {/* ── Save Button ── */}
              <TouchableOpacity
                onPress={handleSaveDietPlan}
                disabled={savingDietForm}
                style={{ borderRadius: 20, overflow: 'hidden', marginTop: 8 }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#2596BE', '#1a6e8a']} style={{ paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                  {savingDietForm
                    ? <ActivityIndicator color="#FFF" />
                    : <>
                        <Ionicons name="sparkles" size={18} color="#FFF" />
                        <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 15, letterSpacing: 0.8 }}>GENERATE & SAVE MEAL PLAN</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const SummaryItem = ({ label, value, unit, color }: any) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryValue, { color }]}>{value}{unit}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 12 },
  headerCopy: { flex: 1, paddingRight: 6 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 28 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  headerActionWrap: { flexShrink: 1, alignItems: 'flex-end' },
  logMealBtn: {
    minWidth: 112,
    maxWidth: 150,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#2596BE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logMealBtnFill: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#2596BE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logMealBtnText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 14, flexShrink: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 32 },
  trackerHeaderContent: { paddingHorizontal: 20, paddingTop: 20 },
  trackerItemWrap: { paddingHorizontal: 20 },
  recommendationStateWrap: { paddingHorizontal: 20, paddingTop: 20 },
  mealCard: { borderRadius: 24, borderWidth: 1, marginBottom: 20, overflow: 'hidden', elevation: 2 },
  mealCardImage: { width: '100%', height: 200 },
  mealCardContent: { padding: 16 },
  mealCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  mealCardTitle: { fontFamily: FONTS.heading, fontSize: 20 },
  mealCardTime: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  nutrientRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  nutrientBadge: { flex: 1, padding: 8, borderRadius: 12, alignItems: 'center' },
  nutrientBadgeValue: { fontFamily: FONTS.heading, fontSize: 14 },
  nutrientBadgeLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, textTransform: 'uppercase' },
  foodItemsList: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
  foodItemText: { fontFamily: FONTS.body, fontSize: 13, marginBottom: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 32, paddingBottom: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 6 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', maxWidth: 220, lineHeight: 20, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 20 },

  // ── Section divider ─────────────────────────────────────────────────────────
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 4 },
  sectionLine: { flex: 1, height: 1 },
  sectionLabelWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  sectionLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },

  // ── Redesigned Accordion Card (Screenshot Style) ──────────────────────────
  accCard: {
    borderRadius: 24, borderWidth: 1, marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 3,
  },
  cardContentWrap: {
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  mealIconBox: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  mealMetaInfo: {
    flex: 1, marginLeft: 14, justifyContent: 'center',
  },
  mealTitleLabel: {
    fontFamily: FONTS.heading, fontSize: 18,
  },
  mealTimeLabel: {
    fontFamily: FONTS.body, fontSize: 11, marginTop: 1,
  },
  eatenBadgeWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    marginRight: 6,
  },
  eatenBadgeText: {
    fontFamily: FONTS.bodyBold, fontSize: 11, color: '#10B981',
  },
  mealThumbImage: {
    width: 60, height: 60, borderRadius: 16,
  },
  mealThumbImagePlaceholder: {
    width: 60, height: 60, borderRadius: 16, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  mealStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: 14, paddingHorizontal: 4,
  },
  mealStatCol: {
    flex: 1,
  },
  mealStatNum: {
    fontFamily: FONTS.heading, fontSize: 16, letterSpacing: -0.3,
  },
  mealStatUnit: {
    fontFamily: FONTS.body, fontSize: 10, marginTop: 2,
  },
  accDetail: {
    paddingHorizontal: 18, paddingBottom: 18, borderTopWidth: 1,
  },
  macroGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14,
  },
  macroPill: {
    width: '30%', flexGrow: 1, borderRadius: 12,
    padding: 10, alignItems: 'center',
  },
  macroPillVal: {
    fontFamily: FONTS.heading, fontSize: 16,
  },
  macroPillLabel: {
    fontFamily: FONTS.bodySemiBold, fontSize: 10,
    textTransform: 'uppercase', marginTop: 2,
  },
  foodItemsWrap: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1,
  },
  foodItemsTitle: {
    fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 10, letterSpacing: 0.3,
  },
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 0.5,
  },
  foodName: {
    fontFamily: FONTS.bodySemiBold, fontSize: 13,
  },
  foodQty: {
    fontFamily: FONTS.body, fontSize: 11, marginTop: 1,
  },
  foodCals: {
    fontFamily: FONTS.bodyBold, fontSize: 13,
  },
  deleteMealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 16, paddingVertical: 12, marginTop: 16,
  },
  deleteMealBtnText: {
    fontFamily: FONTS.bodyBold, fontSize: 12, color: '#E7B100',
  },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  imageUploadBox: { width: '100%', height: 200, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, marginBottom: 8, letterSpacing: 0.5 },
  input: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  analysisImage: { width: '100%', height: 250, borderRadius: 20, marginBottom: 20 },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)' },
  summaryValue: { fontFamily: FONTS.heading, fontSize: 18 },
  summaryLabel: { fontFamily: FONTS.body, fontSize: 10, color: '#666', marginTop: 4 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 12 },
  itemRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 10, alignItems: 'center' },
  itemName: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  itemQty: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  itemCals: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  itemMacros: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
  modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingTop: 12 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 16, letterSpacing: 1 },

  // Tab Selector
  tabSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: 16,
  },
  tabSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabSelectorActiveBtn: {
    shadowColor: '#2596BE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabSelectorText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  // AI Coach Card Styles
  recCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  groundingCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  groundingTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  bmiGaugeTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  bmiGaugeFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ── Diet Profile Form Modal ───────────────────────────────────────────────
  dietFormSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    minHeight: '60%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  dietFormHeader: {
    overflow: 'hidden',
  },
  dietFormHeaderGrad: {
    padding: 20,
    paddingTop: 22,
  },
  dietFormSectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    marginBottom: 12,
    marginTop: 4,
  },
  dietFormFieldLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dietFormSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  dietFormSelectBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietFormSelectBtnActive: {
    backgroundColor: '#2596BE',
    borderColor: '#2596BE',
  },
  dietFormSelectBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  dietFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  dietFormGridCell: {
    width: '47%',
  },
  dietFormInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
  },
  dietFormMealFreqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  dietFormStepBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Food Search Modal ─────────────────────────────────────────────────────
  fsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1,
  },
  fsTitle: { fontFamily: FONTS.heading, fontSize: 22 },
  fsSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, borderWidth: 1.5,
  },
  fsEmptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  fsEmptyIcon: { width: 72, height: 72, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  fsEmptyTitle: { fontFamily: FONTS.heading, fontSize: 20, marginBottom: 6 },
  fsEmptyText: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fsFoodCard: {
    borderRadius: 20, borderWidth: 1.5,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
  },
  fsFoodName: { fontFamily: FONTS.bodyBold, fontSize: 14, lineHeight: 20 },
  fsMacroRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  fsMacroChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)' },
  fsMacroVal: { fontFamily: FONTS.heading, fontSize: 13 },
  fsMacroLbl: { fontFamily: FONTS.body, fontSize: 9, color: '#888', marginTop: 1 },
  fsGradeBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fsDetailWrap: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  fsNutrientPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  fsLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 14, paddingVertical: 12, marginTop: 4,
  },

  // ── Ingredient Selector Modal Styles ──
  selectorFoodCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorFoodImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  selectorFoodImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorFoodContent: {
    flex: 1,
    marginLeft: 12,
  },
  selectorFoodName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  selectorFoodMacroRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: 10,
  },
  selectorFoodMacroChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  selectorFoodMacroVal: {
    fontFamily: FONTS.heading,
    fontSize: 13,
  },
  selectorFoodMacroLbl: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: '#888',
    marginTop: 1,
  },
});

