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

  useEffect(() => {
    fetchMeals();
  }, []);

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

  const renderMealCard = ({ item }: { item: any }) => {
    const date = new Date(item.logged_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <View style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={{ uri: item.image_url }} style={styles.mealCardImage} />
        <View style={styles.mealCardContent}>
          <View style={styles.mealCardHeader}>
            <View>
              <Text style={[styles.mealCardTitle, { color: colors.text }]}>{item.meal_type}</Text>
              <Text style={[styles.mealCardTime, { color: colors.textMuted }]}>{dateStr} • {timeStr}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteMeal(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.nutrientRow}>
            <NutrientBadge label="Cals" value={Math.round(item.total_calories)} color="#EF4444" unit="kcal" />
            <NutrientBadge label="Protein" value={Math.round(item.total_protein)} color="#10B981" unit="g" />
            <NutrientBadge label="Carbs" value={Math.round(item.total_carbs)} color="#3B82F6" unit="g" />
            <NutrientBadge label="Fat" value={Math.round(item.total_fat)} color="#F59E0B" unit="g" />
          </View>

          <View style={[styles.nutrientRow, { marginTop: -8 }]}>
            <NutrientBadge label="Fiber" value={Math.round(item.total_fiber)} color="#10B981" unit="g" />
            <NutrientBadge label="Sugar" value={Math.round(item.total_sugar)} color="#EF4444" unit="g" />
            <NutrientBadge label="Sodium" value={Math.round(item.total_sodium)} color="#F59E0B" unit="mg" />
            <NutrientBadge label="Sat. Fat" value={Math.round(item.total_saturated_fat)} color="#EF4444" unit="g" />
          </View>

          <View style={styles.foodItemsList}>
            {item.items?.map((food: any, idx: number) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <Text style={[styles.foodItemText, { color: colors.textDim }]}>
                  • {food.item_name} ({food.quantity})
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 12 }}>
                  {Math.round(food.calories)} kcal | P:{Math.round(food.protein)}g C:{Math.round(food.carbs)}g F:{Math.round(food.fat)}g | Sugar:{Math.round(food.sugar)}g Sodium:{Math.round(food.sodium)}mg
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Meal Tracker</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>AI-powered nutrition analysis</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowLogForm(true)}>
          <LinearGradient colors={['#E00000', '#B00000']} style={styles.addBtnGrad}>
            <Ionicons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#E00000" /></View>
      ) : (
        <FlatList
          data={uploading ? [{ id: 'loading' }, ...meals] : meals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            if (item.id === 'loading') return <RenderLoadingCard />;
            return renderMealCard({ item });
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            uploading ? null : (
              <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={64} color={colors.textDim} />
                <Text style={[styles.emptyText, { color: colors.textDim }]}>No meals logged yet</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowLogForm(true)}>
                  <Text style={{ color: '#E00000', fontFamily: FONTS.bodyBold }}>Log Your First Meal</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

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
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontFamily: FONTS.body, fontSize: 16, marginTop: 16 },
  emptyBtn: { marginTop: 12, padding: 10 },
  
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
