import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Platform, ActivityIndicator,
  TextInput, Dimensions,
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

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();

  const workoutId = params.id as string;
  const duration = parseInt(params.duration as string || '0');
  const volume = parseFloat(params.volume as string || '0');
  const water = parseFloat(params.water as string || '0');

  const [weight, setWeight] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const payload: any = {};
      if (weight.trim()) payload.post_workout_weight = parseFloat(weight);
      if (photos.length > 0) payload.photos = photos;

      // Update workout with weight and photos
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      showToast('Workout summary saved! 🏆');
      router.replace('/(tabs)/daily');
    } catch (err) {
      console.error('Error saving final metrics:', err);
      showToast('Failed to save metrics', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { icon: 'time-outline', label: 'Time', value: formatDuration(duration), color: '#E00000' },
    { icon: 'barbell-outline', label: 'Volume', value: `${Math.round(volume)} kg`, color: '#10B981' },
    { icon: 'water-outline', label: 'Hydration', value: `${water.toFixed(1)}L`, color: '#3B82F6' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Hero */}
        <LinearGradient colors={['#10B981', '#059669']} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="trophy" size={48} color="#FFF" />
          </View>
          <Text style={styles.heroTitle}>Workout Complete!</Text>
          <Text style={styles.heroSub}>You crushed it today 💪</Text>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} style={{ marginBottom: 8 }} />
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formContainer}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  hero: { padding: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 32, color: '#FFF', marginBottom: 6 },
  heroSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  statsRow: { flexDirection: 'row', padding: 20, gap: 12, marginTop: -30 },
  statCard: { flex: 1, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statValue: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 4 },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  formContainer: { padding: 20, gap: 20 },
  section: { borderRadius: 28, padding: 20, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  weightInput: { height: 64, borderRadius: 18, borderWidth: 1, paddingHorizontal: 20, fontFamily: FONTS.heading, fontSize: 24 },
  photoList: { gap: 12 },
  photoWrap: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(224,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  addPhotoBtn: { width: 100, height: 130, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  footer: { paddingHorizontal: 20, gap: 12 },
  saveBtn: { borderRadius: 20, overflow: 'hidden' },
  saveBtnGradient: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  skipLink: { alignItems: 'center', paddingVertical: 10 },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14, textDecorationLine: 'underline' },
});
