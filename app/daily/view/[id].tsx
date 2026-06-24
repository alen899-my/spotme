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
import OptimizedImage from '../../../components/ui/OptimizedImage';
import { optimizeImage } from '../../../utils/imageOptimizer';
import { FONTS } from '../../../constants/theme';
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { ViewSessionSkeleton } from '../../../components/ui/Skeleton';
import WorkoutSummary from '../../../components/WorkoutSummary';
import { API_URL } from '../../../utils/api';
import { getToken } from '../../../utils/tokenStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


export default function WorkoutViewScreen() {
  const router = useRouter();
  const { id: workoutId, shared } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const isShared = shared === '1';
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [showEditMetricsModal, setShowEditMetricsModal] = useState(false);
  const [updatingMetrics, setUpdatingMetrics] = useState(false);
  const [finishWeight, setFinishWeight] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchWorkout = useCallback(async () => {
    try {
      const token = await getToken();
      const apiParams: any = {};
      if (isShared) apiParams.shared = '1';
      const [workoutRes, reportRes] = await Promise.all([
        axios.get(`${API_URL}/daily/workouts/${workoutId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: apiParams,
        }),
        axios.get(`${API_URL}/daily/workouts/${workoutId}/report`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: null }))
      ]);
      setWorkout(workoutRes.data);
      setExistingReport(reportRes.data);
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
        const token = await getToken();
        const formData = new FormData();
        for (const [index, asset] of result.assets.entries()) {
          const uri = await optimizeImage(asset.uri, 'workout');
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
      const token = await getToken();
      await axios.delete(`${API_URL}/daily/photos/${photoId}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Photo removed');
      fetchWorkout();
    } catch { showToast('Failed to remove photo', 'error'); }
  };

  const openEditMetrics = () => {
    setFinishWeight(String(workout?.post_workout_weight || ''));
    setShowEditMetricsModal(true);
  };

  const handleUpdateMetrics = async () => {
    setUpdatingMetrics(true);
    try {
      const token = await getToken();
      await axios.patch(`${API_URL}/daily/workouts/${workoutId}/metrics`, {
        post_workout_weight: parseFloat(finishWeight) || 0,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Metrics updated!');
      setShowEditMetricsModal(false);
      fetchWorkout();
    } catch { showToast('Failed to update metrics', 'error'); }
    finally { setUpdatingMetrics(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      showToast('Changes saved!');
      setIsEditing(false);
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ViewSessionSkeleton />;
  if (!workout) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {workout?.title || 'Session'}
            </Text>
            <View style={{ flex: 1 }} />
            {!isShared && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {existingReport && (
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => router.push(`/daily/report/${existingReport.id}`)}
                    activeOpacity={0.85}
                  >
                  <LinearGradient colors={existingReport.status === 'completed' ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']} style={styles.iconBtnGrad}>
                    {existingReport.status === 'generating' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="document-text-outline" size={16} color="#FFF" />
                    )}
                  </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editSolidBtn}
                  onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark || colors.primary] : [P.cta, P.ctaDark]} style={styles.editBtnGrad}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={[styles.editBtnText, { color: '#FFF' }]}>{isEditing ? 'SAVE' : 'EDIT'}</Text>
                  )}
                </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
                onAddPhotos={isEditing && !isShared ? handleUpdatePhotos : undefined}
                onDeletePhoto={isEditing && !isShared ? handleDeletePhoto : undefined}
                onOpenViewer={(uri) => { setViewerUri(uri); setViewerVisible(true); }}
                onEditMetrics={isEditing && !isShared ? openEditMetrics : undefined}
                showBodyWeight={!isShared}
              />
            </View>
          }
        />
      </View>

      {/* Photo Viewer */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <OptimizedImage uri={viewerUri || ''} style={styles.viewerImage} contentFit="contain" />
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close" size={32} color="#FFF" />
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
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: -10 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20, marginLeft: -2 },
  reportBtn: { borderRadius: 10, overflow: 'hidden' },
  editSolidBtn: { borderRadius: 10, overflow: 'hidden' },
  iconBtnGrad: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtnGrad: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.5 },
  listContent: { paddingBottom: 40 },
  listHeader: { marginBottom: 20, paddingHorizontal: 20 },

  // Viewer
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
  viewerImage: { width: '100%', height: '80%' },
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
