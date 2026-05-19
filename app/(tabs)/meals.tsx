import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
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

  useEffect(() => {
    loadUser();
    fetchMeals();
  }, []);

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
          return { icon: 'sunny-outline', color: '#EF4444', bg: '#EF444415', label: 'Breakfast' };
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
      { label: 'Sugar',   value: Math.round(item.total_sugar),   unit: 'g', color: '#EF4444' },
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
              <View style={[styles.macroPill, { backgroundColor: '#EF444412', width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }]}>
                <Text style={[styles.macroPillLabel, { color: '#EF4444' }]}>Total Calories</Text>
                <Text style={[styles.macroPillVal, { color: '#EF4444', fontSize: 20 }]}>{Math.round(item.total_calories)} <Text style={{ fontSize: 13 }}>kcal</Text></Text>
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
              <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 6 }} />
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

  // Target calculations
  const getTargets = () => {
    let weight = 70, height = 170, age = 30, goal = 'Maintain', activity = 'Lightly Active';
    if (userData) {
      if (userData.weight) weight = parseFloat(userData.weight.toString().replace(/[^0-9.]/g, '')) || 70;
      if (userData.height) height = parseFloat(userData.height.toString().replace(/[^0-9.]/g, '')) || 170;
      if (userData.age) age = parseInt(userData.age) || 30;
      goal = userData.fitness_goal || 'Maintain';
      activity = userData.activity_level || 'Lightly Active';
    }

    // Rough BMR (Mifflin)
    let bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5; // Default male
    
    // Multiplier
    let mult = 1.375;
    if (activity.toLowerCase().includes('sedentary')) mult = 1.2;
    if (activity.toLowerCase().includes('moderate')) mult = 1.55;
    if (activity.toLowerCase().includes('very') || activity.toLowerCase().includes('high')) mult = 1.725;
    
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={loading ? [] : uploading ? [{ id: 'loading' }, ...filteredMeals] : filteredMeals}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
            <>
              {/* ── Header (scrolls with content) ── */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
                  <Text style={[styles.headerSub, { color: colors.textMuted }]}>Track meals · hydration · macros</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowLogForm(true)}>
                  <LinearGradient colors={['#E00000', '#900000']} style={styles.addBtnGrad}>
                    <Ionicons name="add" size={26} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ── Date Picker (scrolls with content) ── */}
              <DatePicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />

              <NutritionMeter
                caloriesConsumed={calsConsumed}
                caloriesTarget={targets.caloriesTarget}
                protein={{ label: 'Protein', icon: 'barbell-outline', consumed: proteinConsumed, target: targets.proteinTarget, color: '#10B981', unit: 'g' }}
                carbs={{   label: 'Carbs',   icon: 'pizza-outline',   consumed: carbsConsumed,   target: targets.carbsTarget,   color: '#3B82F6', unit: 'g' }}
                fat={{     label: 'Fat',     icon: 'water-outline',   consumed: fatConsumed,     target: targets.fatTarget,     color: '#F59E0B', unit: 'g' }}
              />
              <WaterTracker selectedDate={selectedDate} />
              {/* Meals section divider */}
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
            </>
          }
          renderItem={({ item }) => {
            if (item.id === 'loading') return <RenderLoadingCard />;
            return renderMealCard({ item });
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            uploading ? null : (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="restaurant-outline" size={40} color={colors.textDim} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No meals logged</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap + to log a meal and track your nutrition</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#E0000015', borderColor: '#E0000030', borderWidth: 1 }]} onPress={() => setShowLogForm(true)}>
                  <Ionicons name="add-circle-outline" size={16} color="#E00000" />
                  <Text style={{ color: '#E00000', fontFamily: FONTS.bodyBold, fontSize: 13 }}>Log Your First Meal</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

      {/* Log Meal Form Modal */}
      <Modal visible={showLogForm} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
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
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.saveBtnGrad}>
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
                      mealType === t && { backgroundColor: '#E00000' }
                    ]}
                  >
                    <Text style={[styles.typeBtnText, { color: colors.textMuted }, mealType === t && { color: '#FFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.summaryGrid}>
                <SummaryItem label="Calories" value={Math.round(analysisData?.total_calories || 0)} unit="kcal" color="#EF4444" />
                <SummaryItem label="Protein" value={Math.round(analysisData?.total_protein || 0)} unit="g" color="#10B981" />
                <SummaryItem label="Carbs" value={Math.round(analysisData?.total_carbs || 0)} unit="g" color="#3B82F6" />
                <SummaryItem label="Fat" value={Math.round(analysisData?.total_fat || 0)} unit="g" color="#F59E0B" />
              </View>

              <View style={[styles.summaryGrid, { marginTop: -12 }]}>
                <SummaryItem label="Fiber" value={Math.round(analysisData?.total_fiber || 0)} unit="g" color="#10B981" />
                <SummaryItem label="Sugar" value={Math.round(analysisData?.total_sugar || 0)} unit="g" color="#EF4444" />
                <SummaryItem label="Sodium" value={Math.round(analysisData?.total_sodium || 0)} unit="mg" color="#F59E0B" />
                <SummaryItem label="Sat. Fat" value={Math.round(analysisData?.total_saturated_fat || 0)} unit="g" color="#EF4444" />
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
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SAVE MEAL</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 28 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  addBtn: { width: 56, height: 56, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#E00000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20, paddingBottom: 100 },
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
  emptyContainer: { alignItems: 'center', marginTop: 48, paddingBottom: 40 },
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
    fontFamily: FONTS.bodyBold, fontSize: 12, color: '#EF4444',
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
});
