import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import Input from '../../../components/ui/Input';
import ExercisePreviewModal from '../../../components/modals/ExercisePreviewModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showToast } = useToast();
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingEx, setEditingEx] = useState<any>(null);
  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Deletion state
  const [removeId, setRemoveId] = useState<number | null>(null);

  // Preview State
  const [previewEx, setPreviewEx] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const exRes = await axios.get(`${API_URL}/workouts/sessions/${id}/exercises`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExercises(exRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching session data:', err);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRemoveExercise = (wseId: number) => {
    setRemoveId(wseId);
  };

  const onConfirmRemove = async () => {
    if (!removeId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/workouts/exercises/${removeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Exercise removed');
      setRemoveId(null);
      fetchData();
    } catch (err) {
      console.error('Error removing exercise:', err);
      showToast('Failed to remove exercise', 'error');
    }
  };

  const openEditModal = (ex: any) => {
    setEditingEx(ex);
    setEditSets(String(ex.sets));
    setEditReps(ex.reps);
    setEditRest(ex.rest_time);
    setEditWeight(ex.weight || '0');
    setIsEditModalVisible(true);
  };

  const handleUpdateStats = async () => {
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.put(`${API_URL}/workouts/exercises/${editingEx.id}`, {
        sets: parseInt(editSets),
        reps: editReps,
        rest_time: editRest,
        weight: editWeight,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Stats updated!');
      setIsEditModalVisible(false);
      fetchData();
    } catch (err) {
      console.error('Error updating stats:', err);
      showToast('Update failed', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderExercise = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => setPreviewEx(item)}
    >
      <View style={styles.exInfo}>
        <Image source={{ uri: item.image_url }} style={styles.exImage} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.exName, { color: colors.text }]}>{item.name}</Text>
            {item.avg_rating !== undefined && item.avg_rating !== null && (
              <View style={[styles.avgRatingBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={[styles.avgRatingText, { color: colors.text }]}>{item.avg_rating}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.exMeta, { color: colors.textMuted }]}>{item.target} • {item.equipment}</Text>
        </View>
        <TouchableOpacity style={styles.removeIcon} onPress={() => handleRemoveExercise(item.id)}>
          <Ionicons name="close-circle-outline" size={24} color={colors.textDim} />
        </TouchableOpacity>
      </View>

      <View style={[styles.exControls, { backgroundColor: colors.inputBg }]}>
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>SETS</Text>
          <Text style={[styles.controlValue, { color: colors.text }]}>{item.sets}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>REPS</Text>
          <Text style={[styles.controlValue, { color: colors.text }]}>{item.reps}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>WEIGHT</Text>
          <Text style={[styles.controlValue, { color: colors.text }]}>{item.weight || 0}kg</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>REST</Text>
          <Text style={[styles.controlValue, { color: colors.text }]}>{item.rest_time}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editStatsBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#E00000" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Routine Manager</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage your movements</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#E00000" /></View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderExercise}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}><MaterialCommunityIcons name="dumbbell" size={64} color={colors.border} /></View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Exercises</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>Add some movements to this session to build your routine.</Text>
              </View>
            }
          />
        )}

        <View style={[styles.bottomBar, { backgroundColor: colors.bg }]}>
          <TouchableOpacity 
            style={[styles.addExBtn]}
            onPress={() => router.push({ pathname: `/splits/session/${id}/add-exercises`, params: { sessionId: id } })}
          >
            <LinearGradient
              colors={['#E00000', '#B00000']}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.addExText}>ADD EXERCISE</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Edit Stats Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContentWrap}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Performance</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Input
                    label="SETS"
                    keyboardType="numeric"
                    value={editSets}
                    onChangeText={setEditSets}
                  />

                  <Input
                    label="REPS (e.g. 8-12)"
                    value={editReps}
                    onChangeText={setEditReps}
                  />

                  <Input
                    label="WEIGHT (kg)"
                    keyboardType="numeric"
                    value={editWeight}
                    onChangeText={setEditWeight}
                  />

                  <Input
                    label="REST (e.g. 60s)"
                    value={editRest}
                    onChangeText={setEditRest}
                  />

                  <TouchableOpacity 
                    style={styles.updateBtn}
                    onPress={handleUpdateStats}
                    disabled={isUpdating}
                  >
                    <LinearGradient colors={['#E00000', '#B00000']} style={styles.updateBtnGradient}>
                      {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.updateBtnText}>UPDATE STATS</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <ConfirmationModal
          visible={removeId !== null}
          title="Remove Exercise"
          message="Are you sure you want to remove this movement from your session? You can add it back anytime from the library."
          confirmText="REMOVE"
          onConfirm={onConfirmRemove}
          onCancel={() => setRemoveId(null)}
        />

        <ExercisePreviewModal
          visible={previewEx !== null}
          exercise={previewEx}
          onClose={() => setPreviewEx(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 100 },
  exerciseCard: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  exInfo: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  exImage: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#F5F5F5', marginRight: 16 },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 4 },
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
  exMeta: { fontFamily: FONTS.body, fontSize: 12, textTransform: 'capitalize' },
  removeIcon: { padding: 4 },
  exControls: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  controlItem: { flex: 1, alignItems: 'center' },
  controlLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, marginBottom: 2 },
  controlValue: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  vDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.08)' },
  editStatsBtn: { paddingLeft: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  addExBtn: { height: 60, borderRadius: 18, overflow: 'hidden' },
  addBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  addExText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1.2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContentWrap: { width: '100%' },
  modalContent: { borderRadius: 28, padding: 24, maxHeight: SCREEN_WIDTH * 1.5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  updateBtn: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  updateBtnGradient: { height: 54, justifyContent: 'center', alignItems: 'center' },
  updateBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF', letterSpacing: 1 },
});
