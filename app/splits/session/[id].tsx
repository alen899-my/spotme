import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
      style={[
        styles.exerciseCard, 
        { 
          backgroundColor: isDark ? colors.card : P.cta, 
          borderColor: isDark ? colors.border : P.cta, 
          borderWidth: isDark ? 1 : 0 
        }
      ]}
      activeOpacity={0.8}
      onPress={() => setPreviewEx(item)}
    >
      <View style={styles.exInfo}>
        <Image source={{ uri: item.image_url }} style={styles.exImage} />
        <View style={styles.exTextBlock}>
          <View style={styles.exTopRow}>
            <Text style={styles.exName}>{item.name}</Text>
            {item.avg_rating !== undefined && item.avg_rating !== null && (
              <View style={styles.avgRatingBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={styles.avgRatingText}>{item.avg_rating}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.exMeta, 
            { 
              color: isDark ? colors.text : P.ink, 
              backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.88)' 
            }
          ]}>
            {item.target} • {item.equipment}
          </Text>
        </View>
      </View>

      <View style={styles.exControls}>
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>SETS</Text>
          <Text style={styles.controlValue}>{item.sets}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>REPS</Text>
          <Text style={styles.controlValue}>{item.reps}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>WEIGHT</Text>
          <Text style={styles.controlValue}>{item.weight || 0}kg</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>REST</Text>
          <Text style={styles.controlValue}>{item.rest_time}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.editStatsBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color={P.ink} />
          <Text style={styles.editStatsText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteActionBtn}
          onPress={() => handleRemoveExercise(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Routine Manager</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage your movements</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderExercise}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 112 + Math.max(insets.bottom, 12) }
            ]}
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

        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.bg,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.addExBtn]}
            onPress={() => router.push({ pathname: `/splits/session/${id}/add-exercises`, params: { sessionId: id } })}
          >
            <View style={styles.addBtnGradient}>
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.addExText}>ADD EXERCISE</Text>
            </View>
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
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContentWrap}
            >
              <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : P.cta, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Performance</Text>
                  <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Input
                    label="SETS"
                    keyboardType="numeric"
                    value={editSets}
                    onChangeText={setEditSets}
                    tone="light"
                  />

                  <Input
                    label="REPS (e.g. 8-12)"
                    value={editReps}
                    onChangeText={setEditReps}
                    tone="light"
                  />

                  <Input
                    label="WEIGHT (kg)"
                    keyboardType="numeric"
                    value={editWeight}
                    onChangeText={setEditWeight}
                    tone="light"
                  />

                  <Input
                    label="REST (e.g. 60s)"
                    value={editRest}
                    onChangeText={setEditRest}
                    tone="light"
                  />

                  <TouchableOpacity 
                    style={styles.updateBtn}
                    onPress={handleUpdateStats}
                    disabled={isUpdating}
                  >
                    <View style={styles.updateBtnGradient}>
                      {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.updateBtnText}>UPDATE STATS</Text>}
                    </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 100 },
  exerciseCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 0,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: P.ctaDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    backgroundColor: P.cta,
  },
  exInfo: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 14 },
  exImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 14 },
  exTextBlock: { flex: 1, justifyContent: 'center' },
  exTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 16, lineHeight: 20, color: P.sun, flexShrink: 1 },
  avgRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avgRatingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: '#FFF',
  },
  exMeta: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    textTransform: 'capitalize',
    color: P.ink,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 2,
  },
  metaPillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: P.ink,
    textTransform: 'capitalize',
  },
  removeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  exControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  controlItem: { flex: 1, alignItems: 'center' },
  controlLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, marginBottom: 3, color: 'rgba(255,255,255,0.68)', letterSpacing: 0.6 },
  controlValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF' },
  vDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.14)' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  editStatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: P.sun,
    paddingHorizontal: 14,
  },
  editStatsText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: P.ink,
    letterSpacing: 0.4,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
  },
  deleteActionText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 0.4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  addExBtn: { height: 60, borderRadius: 18, overflow: 'hidden' },
  addBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: P.cta,
  },
  addExText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1.2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContentWrap: { width: '100%' },
  modalContent: {
    borderRadius: 28,
    padding: 24,
    maxHeight: SCREEN_WIDTH * 1.5,
    backgroundColor: P.cta,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 24, color: '#FFF' },
  updateBtn: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  updateBtnGradient: { height: 54, justifyContent: 'center', alignItems: 'center', backgroundColor: P.sun },
  updateBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: P.ink, letterSpacing: 1 },
});
