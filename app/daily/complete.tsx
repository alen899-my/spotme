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
import StreakIcon from '../../components/ui/StreakIcon';
import { CompleteSkeleton } from '../../components/ui/Skeleton';
import WorkoutSummary from '../../components/WorkoutSummary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const HERO_GRADIENT_LIGHT: [string, string] = ['#10B981', '#059669'];
const HERO_GRADIENT_DARK: [string, string] = ['#064E3B', '#022C22'];

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const workoutId = params.id as string;
  const duration = parseInt(params.duration as string || '0');
  const volume = parseFloat(params.volume as string || '0');
  const rest = parseInt(params.rest as string || '0');

  const [weight, setWeight] = useState('');
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
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(response.data);
      if (response.data.post_workout_weight) setWeight(String(response.data.post_workout_weight));
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
      const newPhotos: string[] = [];
      for (const asset of result.assets) {
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
        const results = await Promise.allSettled(
          photos.map(async (uri, index) => {
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
          })
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed === 0) showToast('All photos uploaded successfully!');
        else if (succeeded > 0) showToast(`Uploaded ${succeeded}/${photos.length} photos. ${failed} failed.`, 'warning');
        else showToast('Failed to upload photos', 'error');
      }

      const payload: any = {
        total_duration_seconds: duration,
        total_volume: volume,
      };
      if (weight.trim()) {
        const parsedWeight = parseFloat(weight);
        if (!isNaN(parsedWeight)) payload.post_workout_weight = parsedWeight;
      }

      const completeRes = await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(completeRes.data);

      if (completeRes.data.new_streak !== undefined) {
        setNewStreak(completeRes.data.new_streak);
        if (completeRes.data.new_streak > 0) setShowStreakOverlay(true);
      }

      showToast('Workout finalized! Great job! 🏆');

      // Silently trigger AI report generation in background
      axios.post(`${API_URL}/daily/workouts/${workoutId}/generate-report`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

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

  if (loading) return <CompleteSkeleton />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero ── */}
        <LinearGradient
          colors={isDark ? HERO_GRADIENT_DARK : HERO_GRADIENT_LIGHT}
          style={[styles.hero, isDark && { borderBottomWidth: 1, borderColor: colors.border }]}
        >
          {newStreak !== null && newStreak > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <StreakIcon streak={newStreak} size={100} />
            </View>
          ) : (
            <View style={[styles.heroIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.25)' }]}>
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

        <View style={styles.formContainer}>
          {/* ── Shared Workout Summary ── */}
          <WorkoutSummary
            workout={workout}
            displayDuration={displayDuration}
            displayVolume={displayVolume}
            displayRest={displayRest}
            showBodyWeight={false}
            hideEditButton
          />

          {/* ── Body Weight — solid card ── */}
          <View style={[styles.weightCard, isDark && { backgroundColor: '#0D0D0D', borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.weightCardTop}>
              <View style={[styles.weightIconBox, isDark && { backgroundColor: 'rgba(217,119,6,0.15)' }]}>
                <Ionicons name="scale-outline" size={22} color={isDark ? '#F59E0B' : "#78350F"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weightCardTitle, isDark && { color: colors.text }]}>Post-Workout Weight</Text>
                <Text style={[styles.weightCardSub, isDark && { color: colors.textMuted }]}>Log your body weight to track progress over time</Text>
              </View>
            </View>
            <View style={[styles.weightInputWrap, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
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
          </View>

          {/* ── Session Photos (local upload) ── */}
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
                <TouchableOpacity style={[styles.addPhotoBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={pickPhotos}>
                  <Ionicons name="add" size={32} color={colors.textDim} />
                  <Text style={{ color: colors.textDim, fontFamily: FONTS.body, fontSize: 12, marginTop: 4 }}>Add</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        <TouchableOpacity style={styles.saveFooterBtn} onPress={handleFinalSave} disabled={saving}>
          <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]} style={styles.saveBtnGradient}>
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={22} color="#FFF" />
                <Text style={styles.saveBtnText}>SAVE & FINISH</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipLink} onPress={() => router.replace('/(tabs)/daily')} disabled={saving}>
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

  // ── Hero ──
  hero: { padding: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 32, color: '#FFF', marginBottom: 6 },
  heroSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  // ── Form sections ──
  formContainer: { padding: 16, paddingTop: 12, gap: 16 },

  section: { borderRadius: 24, padding: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 17 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },

  // ── Body weight card ──
  weightCard: { borderRadius: 24, padding: 20, backgroundColor: '#FEF3C7' },
  weightCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  weightIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(120,53,15,0.15)', justifyContent: 'center', alignItems: 'center' },
  weightCardTitle: { fontFamily: FONTS.heading, fontSize: 17, color: '#78350F', marginBottom: 3 },
  weightCardSub: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(120,53,15,0.75)', lineHeight: 17 },
  weightInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', overflow: 'hidden' },
  weightInput: { flex: 1, height: 58, paddingHorizontal: 18, fontFamily: FONTS.heading, fontSize: 26, color: '#78350F' },
  weightUnit: { width: 52, height: 58, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(120,53,15,0.12)' },
  weightUnitText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#92400E' },
  weightHint: { marginTop: 10, fontFamily: FONTS.body, fontSize: 13, color: '#92400E', textAlign: 'center' },

  // ── Photos ──
  photoList: { gap: 12 },
  photoWrap: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(224,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  addPhotoBtn: { width: 100, height: 130, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  // ── Footer ──
  footer: { paddingHorizontal: 20, paddingTop: 16, gap: 12, borderTopWidth: 1 },
  saveFooterBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGradient: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  skipLink: { alignItems: 'center', paddingVertical: 10 },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14, textDecorationLine: 'underline' },

  // ── Streak overlay ──
  streakOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  streakPopup: { alignItems: 'center', gap: 10 },
  streakPopupTitle: { fontFamily: FONTS.heading, fontSize: 36, color: '#FFF', letterSpacing: 2, marginTop: 20 },
  streakPopupSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
