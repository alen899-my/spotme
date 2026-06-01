import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
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
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { ViewSessionSkeleton } from '../../../components/ui/Skeleton';
import WorkoutSummary from '../../../components/WorkoutSummary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function WorkoutViewScreen() {
  const router = useRouter();
  const { id: workoutId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [showEditMetricsModal, setShowEditMetricsModal] = useState(false);
  const [updatingMetrics, setUpdatingMetrics] = useState(false);
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
              type,
            } as any);
          }
        }
        await axios.post(`${API_URL}/daily/workouts/${workoutId}/photos`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
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
    setFinishWeight(String(workout?.post_workout_weight || ''));
    setShowEditMetricsModal(true);
  };

  const handleUpdateMetrics = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
        post_workout_weight: parseFloat(finishWeight) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Metrics updated!');
      setShowEditMetricsModal(false);
      fetchWorkout();
    } catch { showToast('Failed to update metrics', 'error'); }
    finally { setUpdatingMetrics(false); }
  };

  if (loading) return <ViewSessionSkeleton />;
  if (!workout) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>View Session</Text>
          <TouchableOpacity
            style={[styles.editBtn, isDark && { backgroundColor: colors.inputBg }]}
            onPress={() => router.push(`/daily/${workoutId}?editing=true`)}
          >
            <Ionicons name="create-outline" size={16} color={P.cta} />
            <Text style={[styles.editBtnText, { color: P.cta }]}>EDIT</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[1]}
          keyExtractor={() => 'content'}
          renderItem={() => null}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 32 + Math.max(insets.bottom, 12) },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <WorkoutSummary
                workout={workout}
                uploadingPhotos={uploadingPhotos}
                loadingPhotos={loadingPhotos}
                onAddPhotos={handleUpdatePhotos}
                onDeletePhoto={handleDeletePhoto}
                onOpenViewer={(uri) => { setViewerUri(uri); setViewerVisible(true); }}
                onEditMetrics={openEditMetrics}
                showBodyWeight
              />
            </View>
          }
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
            <LinearGradient colors={[P.cta, P.ctaDark]} style={styles.downloadBtnGrad}>
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, isDark && { backgroundColor: colors.inputBg }]} onPress={() => setShowEditMetricsModal(false)}>
                <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateMetrics}>
                <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark] : [P.cta, P.ctaDark]} style={styles.saveBtnGrad}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(37,149,190,0.12)' },
  editBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.5 },
  listContent: { paddingBottom: 40 },
  listHeader: { marginBottom: 20, paddingHorizontal: 20 },

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
  cancelBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16 },
  saveBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: { height: 56, justifyContent: 'center', alignItems: 'center' },
});
