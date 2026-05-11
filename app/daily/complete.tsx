import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Platform, ActivityIndicator,
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

  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSavePhoto = async () => {
    if (!photo) {
      router.replace('/(tabs)/daily');
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const formData = new FormData();
      const ext = photo.split('.').pop() || 'jpg';
      formData.append('photo', {
        uri: photo,
        name: `workout_${workoutId}.${ext}`,
        type: `image/${ext}`,
      } as any);

      // Reuse the profile upload endpoint pattern or save URL locally
      // For now, update workout with the photo URI
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/complete`, {
        completion_photo_url: photo,
      }, { headers: { Authorization: `Bearer ${token}` } });

      showToast('Photo saved!');
    } catch (err) {
      console.error('Error saving photo:', err);
      showToast('Photo save failed', 'error');
    } finally {
      setUploading(false);
      router.replace('/(tabs)/daily');
    }
  };

  const stats = [
    { icon: 'time-outline', label: 'Duration', value: formatDuration(duration) },
    { icon: 'barbell-outline', label: 'Total Volume', value: `${volume.toFixed(1)} kg` },
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

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={s.icon as any} size={24} color="#E00000" style={{ marginBottom: 8 }} />
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Photo Upload */}
        <View style={[styles.photoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.photoTitle, { color: colors.text }]}>Capture the Moment</Text>
          <Text style={[styles.photoSub, { color: colors.textMuted }]}>
            Add a progress photo to your workout log (optional)
          </Text>

          {photo ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhoto}>
                <Text style={[styles.changePhotoText, { color: '#E00000' }]}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={28} color="#E00000" />
                <Text style={[styles.photoBtnText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={pickPhoto}
              >
                <Ionicons name="image-outline" size={28} color="#E00000" />
                <Text style={[styles.photoBtnText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handleSavePhoto}
          disabled={uploading}
        >
          <LinearGradient colors={['#E00000', '#B00000']} style={styles.doneBtnGradient}>
            {uploading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                <Text style={styles.doneBtnText}>{photo ? 'SAVE & DONE' : 'DONE'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)/daily')}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  hero: { padding: 40, alignItems: 'center' },
  heroIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 32, color: '#FFF', marginBottom: 6 },
  heroSub: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  statsGrid: { flexDirection: 'row', padding: 20, gap: 14 },
  statCard: { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1 },
  statValue: { fontFamily: FONTS.heading, fontSize: 22, marginBottom: 4 },
  statLabel: { fontFamily: FONTS.body, fontSize: 12 },
  photoSection: { marginHorizontal: 20, borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 20 },
  photoTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 6 },
  photoSub: { fontFamily: FONTS.body, fontSize: 13, marginBottom: 20, lineHeight: 20 },
  photoActions: { flexDirection: 'row', gap: 14 },
  photoBtn: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1 },
  photoBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  photoPreviewWrap: { alignItems: 'center' },
  photoPreview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 12 },
  changePhotoBtn: { paddingVertical: 8 },
  changePhotoText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  doneBtn: { marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  doneBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60 },
  doneBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 16, marginBottom: 20 },
  skipText: { fontFamily: FONTS.body, fontSize: 14 },
});
