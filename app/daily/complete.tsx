import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Platform, ActivityIndicator,
  TextInput, Dimensions, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Slider from '@react-native-community/slider';
import StreakIcon from '../../components/ui/StreakIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const workoutId = params.id as string;
  const duration = parseInt(params.duration as string || '0');
  const volume = parseFloat(params.volume as string || '0');
  const water = parseFloat(params.water as string || '0');
  const rest = parseInt(params.rest as string || '0');

  const [weight, setWeight] = useState('');
  const [waterIntake, setWaterIntake] = useState(water);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [showStreakOverlay, setShowStreakOverlay] = useState(false);

  useEffect(() => {
    fetchWorkout();
  }, []);

  const fetchWorkout = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkout(response.data);
      if (response.data.post_workout_weight) setWeight(String(response.data.post_workout_weight));
      if (response.data.water_intake_liters) setWaterIntake(Number(response.data.water_intake_liters));
    } catch (err) {
      console.error('Error fetching workout summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const newPhotos: string[] = [];
      for (const asset of result.assets) {
        if (asset.fileSize && asset.fileSize > MAX_SIZE) {
          showToast(`Photo exceeds 10MB limit`, 'error');
          continue;
        }
        newPhotos.push(asset.uri);
      }
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      // Step 1: Upload photos if any
      if (photos.length > 0) {
        showToast(`Uploading ${photos.length} photos...`, 'info');
        const formData = new FormData();
        for (const [index, uri] of photos.entries()) {
          try {
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              const blob = await response.blob();
              const filename = `photo_${Date.now()}_${index}.jpg`;
              formData.append('photos', blob, filename);
            } else {
              const name = uri.split('/').pop() || `photo_${index}.jpg`;
              const match = /\.(\w+)$/.exec(name);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              formData.append('photos', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name,
                type,
              } as any);
            }
          } catch (e) {
            console.error('Error processing photo:', e);
          }
        }
        
        try {
          await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000, // 60s timeout for large photos
          });
          showToast('Photos uploaded successfully!');
        } catch (photoErr: any) {
          console.error('Photo upload failed:', photoErr);
          showToast('Photos failed to upload, but saving metrics...', 'warning');
        }
      }

      // Step 2: Save metrics
      const payload: any = {
        water_intake_liters: waterIntake,
        total_duration_seconds: duration,
        total_volume: volume,
      };
      if (weight.trim()) {
        const parsedWeight = parseFloat(weight);
        if (!isNaN(parsedWeight)) payload.post_workout_weight = parsedWeight;
      }

      const completeRes = await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (completeRes.data.new_streak !== undefined) {
        setNewStreak(completeRes.data.new_streak);
        if (completeRes.data.new_streak > 0) {
          setShowStreakOverlay(true);
        }
      }

      showToast('Workout finalized! Great job! 🏆');
      
      // Redirect after showing the streak for a bit
      setTimeout(() => {
        router.replace('/(tabs)/daily');
      }, completeRes.data.new_streak > 0 ? 3500 : 1500);
    } catch (err: any) {
      console.error('Error saving final metrics:', err);
      const msg = err.response?.data?.error || 'Failed to update metrics';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayDuration = workout?.total_duration_seconds || duration;
  const displayVolume = workout?.total_volume || volume;
  const displayRest = workout?.total_rest_seconds || rest;

  const calculatedTotalSets = workout?.exercises?.reduce((acc: number, ex: any) => {
    return acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0);
  }, 0) || 0;
  
  const stats = [
    { icon: 'time', label: 'DURATION', value: formatDuration(displayDuration), color: '#EF4444', sub: 'Total active time' },
    { icon: 'barbell', label: 'VOLUME', value: `${Math.round(displayVolume)}kg`, color: '#10B981', sub: 'Total weight lifted' },
    { icon: 'hourglass', label: 'REST TIME', value: formatDuration(displayRest), color: '#F59E0B', sub: 'Recovery between sets' },
    { icon: 'layers', label: 'SETS', value: `${workout?.total_sets || calculatedTotalSets || 0}`, color: '#8B5CF6', sub: 'Total sets completed' },
    { icon: 'water', label: 'HYDRATION', value: `${waterIntake.toFixed(1)}L`, color: '#3B82F6', sub: 'Water intake' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Hero */}
        <LinearGradient colors={['#10B981', '#059669']} style={styles.hero}>
          {newStreak !== null && newStreak > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <StreakIcon streak={newStreak} size={100} />
            </View>
          ) : (
            <View style={styles.heroIcon}>
              <Ionicons name="trophy" size={48} color="#FFF" />
            </View>
          )}
          <Text style={styles.heroTitle}>{newStreak !== null && newStreak > 0 ? 'Perfect Workout!' : 'Workout Complete!'}</Text>
          <Text style={styles.heroSub}>
            {newStreak !== null && newStreak > 0 
              ? `You kept your ${newStreak} day streak alive! 🔥` 
              : 'You crushed it today 💪'}
          </Text>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[
              styles.perfCard, 
              { 
                backgroundColor: s.color, 
                borderRightColor: 'rgba(255,255,255,0.3)',
                borderRightWidth: 4,
                borderWidth: 0
              }
            ]}>
              <View style={[styles.perfIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={s.icon as any} size={18} color="#FFF" />
              </View>
              <View style={styles.perfContent}>
                <Text style={[styles.perfLabel, { color: 'rgba(255,255,255,0.7)' }]}>{s.label}</Text>
                <Text style={[styles.perfValue, { color: '#FFF' }]}>{s.value}</Text>
                <Text style={[styles.perfSubLabel, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.formContainer}>
          {/* Movement Summary Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="list" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Movement Summary</Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 20 }} />
            ) : !workout ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>Failed to load session details</Text>
            ) : (
              <View style={styles.summaryList}>
                {workout?.exercises?.map((ex: any) => {
                  const isSkipped = ex.is_skipped;
                  const completedSets = ex.sets?.filter((s: any) => !s.is_skipped) || [];
                  
                  const totalReps = completedSets.reduce((acc: number, s: any) => acc + (parseInt(s.reps) || 0), 0);
                  const totalWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
                  const totalSetWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0), 0);
                  const totalTime = completedSets.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
                  
                  const avgWeight = completedSets.length > 0 ? (totalSetWeight / completedSets.length).toFixed(1) : '0';
                  const avgTime = completedSets.length > 0 ? Math.round(totalTime / completedSets.length) : 0;

                  return (
                    <View key={ex.id} style={[
                      styles.summaryFullCard, 
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isSkipped && { opacity: 0.6 }
                    ]}>
                      <View style={styles.summaryFullHeader}>
                        <Image source={{ uri: ex.image_url }} style={styles.summaryFullImage} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.summaryFullName, { color: colors.text }]}>{ex.name}</Text>
                          <Text style={[styles.summaryFullSub, { color: colors.textMuted }]}>
                            {isSkipped ? 'Movement skipped' : `${completedSets.length} sets completed`}
                          </Text>
                        </View>
                        {isSkipped && (
                          <View style={styles.skippedBadge}>
                            <Text style={styles.skippedBadgeText}>SKIPPED</Text>
                          </View>
                        )}
                      </View>

                      {!isSkipped && completedSets.length > 0 && (
                        <View style={styles.summaryFullGrid}>
                          <View style={styles.summaryFullItem}>
                            <Text style={styles.summaryFullLabel}>TOTAL WEIGHT</Text>
                            <Text style={[styles.summaryFullValue, { color: colors.text }]}>{totalWeight}kg</Text>
                          </View>
                          <View style={styles.summaryFullItem}>
                            <Text style={styles.summaryFullLabel}>AVG WEIGHT/SET</Text>
                            <Text style={[styles.summaryFullValue, { color: colors.text }]}>{avgWeight}kg</Text>
                          </View>
                          <View style={styles.summaryFullItem}>
                            <Text style={styles.summaryFullLabel}>TOTAL REPS</Text>
                            <Text style={[styles.summaryFullValue, { color: colors.text }]}>{totalReps}</Text>
                          </View>
                          <View style={styles.summaryFullItem}>
                            <Text style={styles.summaryFullLabel}>AVG TIME/SET</Text>
                            <Text style={[styles.summaryFullValue, { color: colors.text }]}>{formatTime(avgTime)}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Weight Input */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="scale" size={20} color="#10B981" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Weight</Text>
            </View>
            <TextInput
              style={[styles.weightInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 75.5 kg"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          
          {/* Hydration Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="water" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Hydration Tracker</Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>How much water did you drink? ({waterIntake.toFixed(1)}L)</Text>
              </View>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={5}
              step={0.1}
              value={waterIntake}
              onValueChange={setWaterIntake}
              minimumTrackTintColor="#3B82F6"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#3B82F6"
            />
          </View>

          {/* Photo Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#E0000020' }]}>
                <Ionicons name="camera" size={20} color="#E00000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Session Photos</Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Show off those gains! ({photos.length}/10)</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(idx)}>
                    <Ionicons name="close" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 10 && (
                <TouchableOpacity 
                  style={[styles.addPhotoBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={pickPhotos}
                >
                  <Ionicons name="add" size={32} color={colors.textDim} />
                  <Text style={{ color: colors.textDim, fontFamily: FONTS.body, fontSize: 12, marginTop: 4 }}>Add</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Bottom Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleFinalSave}
          disabled={saving}
        >
          <LinearGradient colors={['#E00000', '#B00000']} style={styles.saveBtnGradient}>
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={22} color="#FFF" />
                <Text style={styles.saveBtnText}>SAVE & FINISH</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipLink} 
          onPress={() => router.replace('/(tabs)/daily')}
          disabled={saving}
        >
          <Text style={[styles.skipLinkText, { color: colors.textMuted }]}>I'll do this later</Text>
        </TouchableOpacity>
      </View>
      {/* Streak Celebration Overlay */}
      {showStreakOverlay && (
        <View style={styles.streakOverlay}>
          <LinearGradient 
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']} 
            style={StyleSheet.absoluteFill} 
          />
          <Animated.View style={styles.streakPopup}>
            <StreakIcon streak={newStreak || 0} size={120} />
            <Text style={styles.streakPopupTitle}>STREAK UP!</Text>
            <Text style={styles.streakPopupSub}>Consistency is key. Keep it up!</Text>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  hero: { padding: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 32, color: '#FFF', marginBottom: 6 },
  heroSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 12 },
  perfCard: { width: (SCREEN_WIDTH - 52) / 2, padding: 16, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  perfIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  perfContent: { gap: 2 },
  perfLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1 },
  perfValue: { fontFamily: FONTS.heading, fontSize: 18 },
  perfSubLabel: { fontFamily: FONTS.body, fontSize: 10 },
  formContainer: { padding: 20, paddingTop: 0, gap: 20 },
  section: { borderRadius: 28, padding: 20, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  summaryList: { gap: 12 },
  summaryFullCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  summaryFullHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  summaryFullImage: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFF' },
  summaryFullName: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  summaryFullSub: { fontFamily: FONTS.body, fontSize: 12 },
  summaryFullGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryFullItem: { width: '47%', gap: 2 },
  summaryFullLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, color: 'rgba(0,0,0,0.4)', letterSpacing: 0.5 },
  summaryFullValue: { fontFamily: FONTS.heading, fontSize: 18 },
  skippedBadge: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  skippedBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: 'rgba(0,0,0,0.4)' },
  weightInput: { height: 64, borderRadius: 18, borderWidth: 1, paddingHorizontal: 20, fontFamily: FONTS.heading, fontSize: 24 },
  photoList: { gap: 12 },
  photoWrap: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(224,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  addPhotoBtn: { width: 100, height: 130, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGradient: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  skipLink: { alignItems: 'center', paddingVertical: 10 },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14, textDecorationLine: 'underline' },
  streakOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  streakPopup: { alignItems: 'center', gap: 10 },
  streakPopupTitle: { fontFamily: FONTS.heading, fontSize: 36, color: '#FFF', letterSpacing: 2, marginTop: 20 },
  streakPopupSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
