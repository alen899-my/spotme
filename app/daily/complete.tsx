import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
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
import { P } from '../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Slider from '@react-native-community/slider';
import StreakIcon from '../../components/ui/StreakIcon';
import { CompleteSkeleton } from '../../components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Hero gradient: vibrant blue → deep blue
const HERO_GRADIENT_LIGHT: [string, string] = ['#2596BE', '#1a6e8a'];
const HERO_GRADIENT_DARK: [string, string] = ['#0D0D0D', '#050505'];

// Six stat cards — distinct shades that all live in a blue-teal family
const STAT_COLORS = [
  '#2563EB', // duration   — royal blue
  '#0891B2', // calories   — cyan-ish
  '#1D4ED8', // volume     — indigo-blue
  '#0E7490', // rest       — dark cyan
  '#3B82F6', // sets       — lighter blue
  '#0284C7', // hydration  — sky blue
];

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

function formatRecord(metricType?: string, value?: number | string) {
  const numeric = Number(value) || 0;
  if (!numeric) return '0';
  if (metricType === 'max_reps') return `${Math.round(numeric)} reps`;
  return `${numeric.toFixed(1)} kg est. 1RM`;
}

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
      const MAX_SIZE = 10 * 1024 * 1024;
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

      if (photos.length > 0) {
        showToast(`Uploading ${photos.length} photos...`, 'info');

        const uploadPhotoWithRetry = async (uri: string, index: number, retries = 2): Promise<any> => {
          try {
            const formData = new FormData();
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              const blob = await response.blob();
              formData.append('photos', blob, `photo_${Date.now()}_${index}.jpg`);
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
            return await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
              timeout: 30000,
            });
          } catch (err) {
            if (retries > 0) return await uploadPhotoWithRetry(uri, index, retries - 1);
            throw err;
          }
        };

        const results = await Promise.allSettled(photos.map((uri, i) => uploadPhotoWithRetry(uri, i)));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed === 0) showToast('All photos uploaded successfully!');
        else if (succeeded > 0) showToast(`Uploaded ${succeeded}/${photos.length} photos. ${failed} failed.`, 'warning');
        else showToast('Failed to upload photos, saving workout metrics...', 'error');
      }

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
      setWorkout(completeRes.data);

      if (completeRes.data.new_streak !== undefined) {
        setNewStreak(completeRes.data.new_streak);
        if (completeRes.data.new_streak > 0) setShowStreakOverlay(true);
      }

      showToast('Workout finalized! Great job! 🏆');
      setTimeout(() => {
        router.replace('/(tabs)/daily');
      }, completeRes.data.new_streak > 0 ? 3500 : 1500);
    } catch (err: any) {
      console.error('Error saving final metrics:', err);
      showToast(err.response?.data?.error || 'Failed to update metrics', 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayDuration = workout?.total_duration_seconds || duration;
  const displayVolume = workout?.total_volume || volume;
  const displayRest = workout?.total_rest_seconds || rest;
  const caloriesBurned = Number(workout?.calories_burned) || 0;

  const calculatedTotalSets = workout?.exercises?.reduce((acc: number, ex: any) =>
    acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0), 0) || 0;

  const stats = [
    { icon: 'time', label: 'DURATION', value: formatDuration(displayDuration), sub: 'Active time' },
    { icon: 'flame', label: 'CALORIES', value: `${caloriesBurned} kcal`, sub: 'Est. burn' },
    { icon: 'barbell', label: 'VOLUME', value: `${Math.round(displayVolume)}kg`, sub: 'Weight lifted' },
    { icon: 'hourglass', label: 'REST TIME', value: formatDuration(displayRest), sub: 'Recovery' },
    { icon: 'layers', label: 'SETS', value: `${workout?.total_sets || calculatedTotalSets || 0}`, sub: 'Completed sets' },
    { icon: 'water', label: 'HYDRATION', value: `${waterIntake.toFixed(1)}L`, sub: 'Water intake' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero — green completion gradient ── */}
        <LinearGradient 
          colors={isDark ? HERO_GRADIENT_DARK : HERO_GRADIENT_LIGHT} 
          style={[
            styles.hero,
            isDark && { borderBottomWidth: 1, borderColor: colors.border }
          ]}
        >
          {newStreak !== null && newStreak > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <StreakIcon streak={newStreak} size={100} />
            </View>
          ) : (
            <View style={[styles.heroIcon, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name="trophy" size={48} color={isDark ? colors.primary : "#FFF"} />
            </View>
          )}
          <Text style={[styles.heroTitle, isDark && { color: colors.text }]}>
            {newStreak !== null && newStreak > 0 ? 'Perfect Workout!' : 'Workout Complete!'}
          </Text>
          <Text style={[styles.heroSub, isDark && { color: colors.textMuted }]}>
            {newStreak !== null && newStreak > 0
              ? `You kept your ${newStreak} day streak alive! 🔥`
              : 'You crushed it today 💪'}
          </Text>
        </LinearGradient>

        {/* ── 2. Stats grid — different blue-family shades ── */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View
              key={i}
              style={[
                styles.perfCard,
                isDark && {
                  borderColor: STAT_COLORS[i],
                  borderWidth: 1,
                  shadowColor: '#000000',
                }
              ]}
            >
              <LinearGradient
                colors={isDark ? [colors.card, STAT_COLORS[i]] : [STAT_COLORS[i], 'rgba(255,255,255,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.perfIconBox, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name={s.icon as any} size={18} color={isDark ? STAT_COLORS[i] : "#FFF"} />
              </View>
              <Text style={[styles.perfLabel, isDark && { color: colors.textMuted }]}>{s.label}</Text>
              <Text style={[styles.perfValue, isDark && { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.perfSub, isDark && { color: colors.textDim }]}>{s.sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formContainer}>

          {/* ── 3. Movement Summary — responsive exercise cards ── */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37,150,190,0.12)' }]}>
                <Ionicons name="list" size={20} color={P.cta} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Movement Summary</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={P.cta} style={{ marginVertical: 20 }} />
            ) : !workout ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                Failed to load session details
              </Text>
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
                    <View
                      key={ex.id}
                      style={[
                        styles.exCard, 
                        isSkipped && { opacity: 0.55 },
                        isDark && { 
                          backgroundColor: colors.pill, 
                          borderColor: colors.border,
                          borderWidth: 1 
                        }
                      ]}
                    >
                      {/* Card header row */}
                      <View style={styles.exHeader}>
                        <Image source={{ uri: ex.image_url }} style={styles.exImage} />
                        <View style={styles.exMeta}>
                          <Text style={[styles.exName, isDark && { color: colors.text }]} numberOfLines={2}>{ex.name}</Text>
                          <Text style={[styles.exSetsSub, isDark && { color: colors.textMuted }]}>
                            {isSkipped ? 'Movement skipped' : `${completedSets.length} set${completedSets.length !== 1 ? 's' : ''} completed`}
                          </Text>
                        </View>
                        {/* PR / skipped badge */}
                        {isSkipped && (
                          <View style={styles.badgeSkipped}>
                            <Text style={styles.badgeText}>SKIPPED</Text>
                          </View>
                        )}
                        {!isSkipped && ex.is_world_record && (
                          <View style={styles.badgeWorld}>
                            <Ionicons name="earth" size={10} color="#FFF" style={{ marginRight: 3 }} />
                            <Text style={styles.badgeText}>WORLD PR</Text>
                          </View>
                        )}
                        {!isSkipped && !ex.is_world_record && ex.is_personal_record && (
                          <View style={styles.badgePR}>
                            <Ionicons name="ribbon" size={10} color="#1a1a1a" style={{ marginRight: 3 }} />
                            <Text style={[styles.badgeText, { color: '#1a1a1a' }]}>NEW PR</Text>
                          </View>
                        )}
                      </View>

                      {/* Record row */}
                      {!isSkipped && (
                        <View style={styles.recordRow}>
                          <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                            <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>BEST SET</Text>
                            <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                              {Number(ex.best_set_weight || 0).toFixed(1)}kg × {ex.best_set_reps || 0}
                            </Text>
                          </View>
                          <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                            <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>MY PR</Text>
                            <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                              {formatRecord(ex.record_metric_type, ex.personal_record_value)}
                            </Text>
                          </View>
                          <View style={[styles.recordPill, isDark && { backgroundColor: colors.inputBg }]}>
                            <Text style={[styles.recordPillLabel, isDark && { color: colors.textMuted }]}>WORLD PR</Text>
                            <Text style={[styles.recordPillVal, isDark && { color: colors.text }]}>
                              {formatRecord(ex.record_metric_type, ex.world_record_value)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Stats 2×2 grid */}
                      {!isSkipped && completedSets.length > 0 && (
                        <View style={styles.exStatsGrid}>
                          {[
                            { label: 'TOTAL WEIGHT', value: `${totalWeight}kg` },
                            { label: 'AVG / SET', value: `${avgWeight}kg` },
                            { label: 'TOTAL REPS', value: `${totalReps}` },
                            { label: 'AVG TIME / SET', value: formatTime(avgTime) },
                          ].map((item, idx) => (
                            <View key={idx} style={[styles.exStatCell, isDark && { backgroundColor: colors.inputBg }]}>
                              <Text style={[styles.exStatLabel, isDark && { color: colors.textMuted }]}>{item.label}</Text>
                              <Text style={[styles.exStatValue, isDark && { color: colors.text }]}>{item.value}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── 4. Body Weight — warm yellow card ── */}
          <LinearGradient
            colors={isDark ? ['#0D0D0D', '#050505'] : ['#F59E0B', '#D97706']}
            style={[
              styles.weightCard,
              isDark && { borderColor: '#D97706', borderWidth: 1 }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.weightCardTop}>
              <View style={[styles.weightIconBox, isDark && { backgroundColor: 'rgba(217,119,6,0.15)' }]}>
                <Ionicons name="scale-outline" size={22} color={isDark ? '#F59E0B' : "#78350F"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weightCardTitle, isDark && { color: colors.text }]}>Post-Workout Weight</Text>
                <Text style={[styles.weightCardSub, isDark && { color: colors.textMuted }]}>Log your body weight to track progress over time</Text>
              </View>
            </View>
            <View style={[
              styles.weightInputWrap,
              isDark && { 
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              }
            ]}>
              <TextInput
                style={[styles.weightInput, isDark && { color: colors.text }]}
                placeholder="e.g. 75.5"
                placeholderTextColor={isDark ? colors.textDim : "rgba(120,53,15,0.45)"}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <View style={[styles.weightUnit, isDark && { backgroundColor: 'rgba(217,119,6,0.12)' }]}>
                <Text style={[styles.weightUnitText, isDark && { color: '#F59E0B' }]}>kg</Text>
              </View>
            </View>
            {!!weight && (
              <Text style={[styles.weightHint, isDark && { color: '#F59E0B' }]}>
                Logged: <Text style={{ fontFamily: FONTS.bodyBold }}>{weight} kg</Text> ✓
              </Text>
            )}
          </LinearGradient>

          {/* ── 5. Hydration — blue-tinted card, slider inside ── */}
          <View style={[
            styles.section, 
            styles.hydrationCard, 
            isDark ? { 
              backgroundColor: colors.card,
              borderColor: colors.border,
            } : { borderColor: '#BFDBFE' }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="water" size={20} color={isDark ? colors.primary : "#3B82F6"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, isDark ? { color: colors.text } : { color: '#1E40AF' }]}>Hydration Tracker</Text>
                <Text style={[styles.sectionSub, isDark ? { color: colors.textMuted } : { color: '#3B82F6' }]}>
                  How much water did you drink?
                </Text>
              </View>
              <View style={[styles.hydrationBadge, isDark && { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.hydrationBadgeText, isDark && { color: colors.primary }]}>{waterIntake.toFixed(1)}L</Text>
              </View>
            </View>

            {/* Water level visualiser */}
            <View style={[styles.waterBar, isDark && { backgroundColor: colors.inputBg }]}>
              <View
                style={[
                  styles.waterFill,
                  { width: `${Math.min((waterIntake / 5) * 100, 100)}%` },
                  isDark && { backgroundColor: colors.primary }
                ]}
              />
              {[1, 2, 3, 4].map(tick => (
                <View
                  key={tick}
                  style={[
                    styles.waterTick,
                    { left: `${(tick / 5) * 100}%` as any },
                    isDark && { backgroundColor: colors.card }
                  ]}
                />
              ))}
            </View>

            <Slider
              style={{ width: '100%', height: 40, marginTop: 4 }}
              minimumValue={0}
              maximumValue={5}
              step={0.1}
              value={waterIntake}
              onValueChange={setWaterIntake}
              minimumTrackTintColor={isDark ? colors.primary : "#3B82F6"}
              maximumTrackTintColor={isDark ? colors.border : "#BFDBFE"}
              thumbTintColor={isDark ? colors.primary : "#1D4ED8"}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text style={{ color: isDark ? colors.textDim : '#93C5FD', fontSize: 11, fontFamily: FONTS.body }}>0L</Text>
              <Text style={{ color: isDark ? colors.textDim : '#93C5FD', fontSize: 11, fontFamily: FONTS.body }}>5L</Text>
            </View>
          </View>

          {/* ── Photo Section ── */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37,150,190,0.12)' }]}>
                <Ionicons name="camera" size={20} color={P.cta} />
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

      {/* Sticky footer */}
      <View style={[
        styles.footer,
        {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 16,
        },
      ]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleFinalSave} disabled={saving}>
          <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]} style={styles.saveBtnGradient}>
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

      {/* Streak overlay */}
      {showStreakOverlay && (
        <View style={styles.streakOverlay}>
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFill} />
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

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    padding: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 32, color: '#FFF', marginBottom: 6 },
  heroSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  // ── Stats grid ────────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, gap: 10,
  },
  perfCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16, borderRadius: 20, overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  perfIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  perfLabel: {
    fontFamily: FONTS.bodyBold, fontSize: 9,
    color: 'rgba(255,255,255,0.65)', letterSpacing: 1.2,
    marginBottom: 2,
  },
  perfValue: { fontFamily: FONTS.heading, fontSize: 20, color: '#FFF' },
  perfSub: { fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // ── Form sections ─────────────────────────────────────────────────────────
  formContainer: { padding: 16, paddingTop: 12, gap: 16 },
  section: { borderRadius: 24, padding: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 17 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },

  // ── Movement summary — exercise cards ─────────────────────────────────────
  summaryList: { gap: 14 },

  exCard: {
    backgroundColor: P.cta,           // vibrant blue base
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: P.ctaDark,
    overflow: 'hidden',
  },

  exHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  exImage: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  exMeta: { flex: 1, paddingTop: 2 },
  exName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: P.sun,
    lineHeight: 20,
    marginBottom: 4,
  },
  exSetsSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
  },

  // PR badges
  badgeSkipped: {
    backgroundColor: '#374151',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeWorld: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgePR: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: FONTS.bodyBold, fontSize: 9,
    color: '#FFF', letterSpacing: 0.5,
  },

  // Record pills row
  recordRow: {
    flexDirection: 'row', gap: 8,
    marginBottom: 12, flexWrap: 'wrap',
  },
  recordPill: {
    flex: 1, minWidth: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  recordPillLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  recordPillVal: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    color: '#FFF',
  },

  // 2×2 stat grid inside exercise card
  exStatsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  exStatCell: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  exStatValue: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: '#FFF',
  },

  // ── Body weight — yellow card ─────────────────────────────────────────────
  weightCard: {
    borderRadius: 24,
    padding: 20,
  },
  weightCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  weightIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(120,53,15,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  weightCardTitle: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    color: '#78350F',
    marginBottom: 3,
  },
  weightCardSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(120,53,15,0.75)',
    lineHeight: 17,
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  weightInput: {
    flex: 1,
    height: 58,
    paddingHorizontal: 18,
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: '#78350F',
  },
  weightUnit: {
    width: 52,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(120,53,15,0.12)',
  },
  weightUnitText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#92400E',
  },
  weightHint: {
    marginTop: 10,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },

  // ── Hydration card ────────────────────────────────────────────────────────
  hydrationCard: {
    backgroundColor: '#EFF6FF',   // very light blue, not full-blue
  },
  hydrationBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12,
  },
  hydrationBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: '#FFF',
  },
  waterBar: {
    height: 10,
    backgroundColor: '#BFDBFE',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
    position: 'relative',
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  waterTick: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#EFF6FF',
    top: 0,
  },

  // ── Photos ────────────────────────────────────────────────────────────────
  photoList: { gap: 12 },
  photoWrap: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(224,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  addPhotoBtn: {
    width: 100, height: 130, borderRadius: 16,
    borderStyle: 'dashed', borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: { paddingHorizontal: 20, gap: 12 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGradient: {
    height: 64, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  skipLink: { alignItems: 'center', paddingVertical: 10 },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14, textDecorationLine: 'underline' },

  // ── Streak overlay ────────────────────────────────────────────────────────
  streakOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  streakPopup: { alignItems: 'center', gap: 10 },
  streakPopupTitle: {
    fontFamily: FONTS.heading, fontSize: 36,
    color: '#FFF', letterSpacing: 2, marginTop: 20,
  },
  streakPopupSub: {
    fontFamily: FONTS.body, fontSize: 16,
    color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  },
});