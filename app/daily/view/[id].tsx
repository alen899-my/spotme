import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Image, Modal,
  ScrollView, Platform, Dimensions, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatLocalDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    // Backend now stores UTC — append Z so JS treats as UTC, getHours() then gives local time
    const normalized = dateStr.replace(' ', 'T');
    const utcStr = (normalized.endsWith('Z') || normalized.includes('+')) ? normalized : `${normalized}Z`;
    const date = new Date(utcStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = date.getHours(), m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch { return dateStr; }
}

export default function WorkoutViewScreen() {
  const router = useRouter();
  const { id: workoutId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [showEditMetricsModal, setShowEditMetricsModal] = useState(false);
  const [updatingMetrics, setUpdatingMetrics] = useState(false);
  const [finishWater, setFinishWater] = useState(0);
  const [finishWeight, setFinishWeight] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const fetchWorkout = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkout(res.data);
    } catch (err) {
      console.error('Error fetching workout:', err);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useFocusEffect(useCallback(() => { fetchWorkout(); }, [fetchWorkout]));

  const handleUpdatePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      setUploadingPhotos(newUris);
      setLoadingPhotos(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        for (const [index, asset] of result.assets.entries()) {
          const uri = asset.uri;
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
              type 
            } as any);
          }
        }
        await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        });
        showToast('Photos uploaded!');
        fetchWorkout();
      } catch (err) {
        console.error('History photo upload error:', err);
        showToast('Failed to upload photos', 'error');
      } finally {
        setLoadingPhotos(false);
        setUploadingPhotos([]);
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/daily/photos/${photoId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Photo removed');
      fetchWorkout();
    } catch { showToast('Failed to remove photo', 'error'); }
  };

  const handleDownload = async (uri: string) => {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = uri; link.download = `spotme-${Date.now()}.jpg`; link.click();
    } else {
      const ok = await Sharing.isAvailableAsync();
      if (ok) await Sharing.shareAsync(uri);
    }
  };

  const openEditMetrics = () => {
    setFinishWater(Number(workout?.water_intake_liters) || 0);
    setFinishWeight(String(workout?.post_workout_weight || ''));
    setShowEditMetricsModal(true);
  };

  const handleUpdateMetrics = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
        water_intake_liters: finishWater,
        post_workout_weight: parseFloat(finishWeight) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Metrics updated!');
      setShowEditMetricsModal(false);
      fetchWorkout();
    } catch { showToast('Failed to update metrics', 'error'); }
    finally { setUpdatingMetrics(false); }
  };

  const calculatedTotalSets = workout?.exercises?.reduce((acc: number, ex: any) => {
    return acc + (ex.sets?.filter((s: any) => !s.is_skipped).length || 0);
  }, 0) || 0;

  const WorkoutPerformanceSummary = ({ data }: { data: any }) => {
    if (!data) return null;
    const stats = [
      { label: 'DURATION', val: formatTime(data.total_duration_seconds || 0), icon: 'time', color: '#EF4444', sub: 'Total active time' },
      { label: 'VOLUME', val: `${Math.round(data.total_volume || 0)}kg`, icon: 'barbell', color: '#10B981', sub: 'Total weight lifted' },
      { label: 'REST TIME', val: formatTime(data.total_rest_seconds || 0), icon: 'hourglass', color: '#F59E0B', sub: 'Recovery between sets' },
      { label: 'SETS', val: `${data.total_sets || calculatedTotalSets || 0}`, icon: 'layers', color: '#8B5CF6', sub: 'Total sets completed' },
      { label: 'HYDRATION', val: `${Number(data.water_intake_liters || 0).toFixed(1)}L`, icon: 'water', color: '#3B82F6', sub: 'Water intake' },
      { label: 'BODY WEIGHT', val: `${data.post_workout_weight || 0}kg`, icon: 'scale', color: '#10B981', sub: 'Current body mass' },
    ];
    return (
      <View style={styles.perfContainer}>
        <View style={styles.perfHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.perfTitle, { color: colors.text }]}>{data.title || data.session_name || 'Workout Summary'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.perfSub, { color: colors.textMuted }]}>{formatLocalDate(data.started_at || data.created_at)}</Text>
              {data.rating !== null && data.rating !== undefined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: '#F59E0B' }}>{data.rating}/10 Satisfaction</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={openEditMetrics} style={styles.perfEditBtn}>
            <Ionicons name="options-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.perfGrid}>
          {stats.map((item, idx) => (
            <View key={idx} style={[styles.perfCard, { backgroundColor: item.color, borderRightColor: 'rgba(255,255,255,0.3)', borderRightWidth: 4, borderWidth: 0 }]}>
              <View style={[styles.perfIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={item.icon as any} size={18} color="#FFF" />
              </View>
              <View style={styles.perfContent}>
                <Text style={[styles.perfLabel, { color: 'rgba(255,255,255,0.7)' }]}>{item.label}</Text>
                <Text style={[styles.perfValue, { color: '#FFF' }]}>{item.val}</Text>
                <Text style={[styles.perfSubLabel, { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderExercise = ({ item }: { item: any }) => {
    const isSkipped = item.is_skipped;
    const completedSets = item.sets?.filter((s: any) => !s.is_skipped) || [];
    const totalReps = completedSets.reduce((acc: number, s: any) => acc + (parseInt(s.reps) || 0), 0);
    const totalWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
    const totalSetWeight = completedSets.reduce((acc: number, s: any) => acc + (parseFloat(s.weight) || 0), 0);
    const totalTime = completedSets.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0);
    const avgWeight = completedSets.length > 0 ? (totalSetWeight / completedSets.length).toFixed(1) : '0';
    const avgTime = completedSets.length > 0 ? Math.round(totalTime / completedSets.length) : 0;

    return (
      <View style={[
        styles.summaryCard,
        { backgroundColor: colors.card, borderColor: isSkipped ? colors.border : (item.is_completed ? '#10B981' : colors.border) },
        isSkipped && { opacity: 0.6 }
      ]}>
        <View style={styles.summaryHeader}>
          <Image source={{ uri: item.image_url }} style={styles.summaryImage} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.summaryName, { color: colors.text }]}>{item.name}</Text>
              {item.avg_rating !== undefined && item.avg_rating !== null && (
                <View style={[styles.avgRatingBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={[styles.avgRatingText, { color: colors.text }]}>{item.avg_rating} </Text>
                </View>
              )}
            </View>
            <Text style={[styles.summarySub, { color: colors.textMuted }]}>
              {isSkipped ? 'Movement skipped' : `${completedSets.length} sets completed`}
            </Text>
            {item.rating !== undefined && item.rating !== null && (
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: '#F59E0B', marginTop: 4 }}>
                My Rating: {item.rating}/10
              </Text>
            )}
          </View>
          {isSkipped ? (
            <View style={styles.skippedBadge}><Text style={styles.skippedBadgeText}>SKIPPED</Text></View>
          ) : item.is_completed ? (
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
          ) : null}
        </View>

        {!isSkipped && completedSets.length > 0 && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TOTAL WEIGHT</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{Math.round(totalWeight)}kg</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>AVG WEIGHT/SET</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{avgWeight}kg</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TOTAL REPS</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{totalReps}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>AVG TIME/SET</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{formatTime(avgTime)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.bg }]}><ActivityIndicator size="large" color="#E00000" /></View>;
  }
  if (!workout) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>View Session</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={workout.exercises || []}
          keyExtractor={item => String(item.id)}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={{ marginBottom: 20, paddingHorizontal: 20 }}>
              {/* Photo Gallery */}
              <View style={{ marginBottom: 20 }}>
                {(workout.photos && workout.photos.length > 0) || uploadingPhotos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {workout.photos?.map((p: any) => (
                      <TouchableOpacity key={p.id} style={styles.photoThumbWrap} onPress={() => { setViewerUri(p.photo_url); setViewerVisible(true); }}>
                        <Image source={{ uri: p.photo_url }} style={styles.photoThumb} />
                        <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleDeletePhoto(p.id)}>
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {/* Optimistic uploading photos */}
                    {uploadingPhotos.map((uri, idx) => (
                      <View key={`uploading-${idx}`} style={[styles.photoThumbWrap, { opacity: 0.6 }]}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                          <ActivityIndicator size="small" color="#FFF" />
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity 
                      style={[styles.photoThumbWrap, styles.photoAdd, loadingPhotos && { opacity: 0.5 }]} 
                      onPress={handleUpdatePhotos}
                      disabled={loadingPhotos}
                    >
                      {loadingPhotos ? <ActivityIndicator size="small" color={colors.textDim} /> : <Ionicons name="add" size={24} color={colors.textDim} />}
                    </TouchableOpacity>
                  </ScrollView>
                ) : (
                  <TouchableOpacity style={[styles.photoPlaceholder, { borderColor: colors.border }]} onPress={handleUpdatePhotos}>
                    <Ionicons name="camera" size={32} color={colors.textDim} />
                    <Text style={{ color: colors.textDim, fontFamily: FONTS.bodyBold, marginTop: 8 }}>ADD PHOTOS</Text>
                  </TouchableOpacity>
                )}
              </View>

              <WorkoutPerformanceSummary data={workout} />

              <View style={styles.divider} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Movement Summary</Text>
            </View>
          )}
        />
      </View>

      {/* Photo Viewer */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          <Image source={{ uri: viewerUri || '' }} style={styles.viewerImage} resizeMode="contain" />
          <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(viewerUri || '')}>
            <LinearGradient colors={['#E00000', '#B00000']} style={styles.downloadBtnGrad}>
              <Ionicons name="download-outline" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold, marginLeft: 8 }}>SAVE / SHARE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Metrics Modal */}
      <Modal visible={showEditMetricsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Metrics</Text>
            <View style={styles.editField}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Body Weight (kg)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                value={finishWeight} onChangeText={setFinishWeight}
                keyboardType="decimal-pad" placeholder="75.0" placeholderTextColor={colors.textDim}
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Hydration ({finishWater.toFixed(1)}L)</Text>
              <Slider style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={5} step={0.1}
                value={finishWater} onValueChange={setFinishWater} minimumTrackTintColor="#E00000" thumbTintColor="#E00000" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditMetricsModal(false)}>
                <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateMetrics}>
                <LinearGradient colors={['#E00000', '#B00000']} style={styles.saveBtnGrad}>
                  {updatingMetrics ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold }}>SAVE CHANGES</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20 },
  listContent: { paddingBottom: 40 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 20 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 4 },

  // Performance Dashboard
  perfContainer: { marginBottom: 10 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  perfTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  perfSub: { fontFamily: FONTS.body, fontSize: 13 },
  perfEditBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E00000', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  perfCard: { width: (SCREEN_WIDTH - 52) / 2, padding: 16, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  perfIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  perfContent: { gap: 2 },
  perfLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1 },
  perfValue: { fontFamily: FONTS.heading, fontSize: 18 },
  perfSubLabel: { fontFamily: FONTS.body, fontSize: 10 },

  // Movement Summary Cards
  avgRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  avgRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  summaryCard: { marginHorizontal: 20, marginBottom: 12, borderRadius: 20, padding: 16, borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  summaryImage: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFF' },
  summaryName: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  summarySub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricItem: { width: '47%', gap: 2 },
  metricLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5 },
  metricValue: { fontFamily: FONTS.heading, fontSize: 18 },
  skippedBadge: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  skippedBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: 'rgba(0,0,0,0.4)' },

  // Photos
  photoThumbWrap: { width: 100, height: 130, borderRadius: 16, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },
  photoAdd: { backgroundColor: 'rgba(0,0,0,0.03)', borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  photoPlaceholder: { height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  removePhotoBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(224,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },

  // Viewer
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
  viewerImage: { width: '100%', height: '80%' },
  downloadBtn: { position: 'absolute', bottom: 40, borderRadius: 20, overflow: 'hidden' },
  downloadBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 25 },
  editField: { marginBottom: 20 },
  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, marginBottom: 8, letterSpacing: 0.5 },
  input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontFamily: FONTS.bodyBold, fontSize: 16 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: { height: 56, justifyContent: 'center', alignItems: 'center' },
});
