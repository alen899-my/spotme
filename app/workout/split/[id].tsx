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
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { API_URL } from '../../../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


export default function SplitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [split, setSplit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSplitDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/splits/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplit(res.data);
    } catch (err) {
      console.error('Error fetching split details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSplitDetails();
    }, [fetchSplitDetails])
  );

  const handleRemoveExercise = async (wseId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/workouts/splits/${id}/exercises/${wseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSplitDetails();
    } catch (err) {
      console.error('Error removing exercise:', err);
    }
  };

  const renderExercise = ({ item }: { item: any }) => (
    <View style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.exInfo}>
        <Image source={{ uri: item.image_url }} style={styles.exImage} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.exName, { color: colors.text }]}>{item.name}</Text>
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
          <Text style={[styles.controlLabel, { color: colors.textMuted }]}>REST</Text>
          <Text style={[styles.controlValue, { color: colors.text }]}>{item.rest_time}</Text>
        </View>
        <TouchableOpacity 
          style={styles.editStatsBtn}
          onPress={() => alert('Edit sets/reps coming soon!')}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{split?.name}</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
              {split?.description || 'Custom Split'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editSplitBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={split?.exercises || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="dumbbell" size={64} color={colors.border} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Empty Split</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Add your favorite exercises to this split to start your workout.
              </Text>
            </View>
          }
        />

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, { backgroundColor: colors.bg }]}>
          <TouchableOpacity 
            style={[styles.addExBtn, { borderColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/workout/split/add-exercises', params: { splitId: id } })}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addExText, { color: colors.primary }]}>ADD EXERCISE</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.startBtn}>
            <LinearGradient
              colors={['#2596BE', '#0d4d65']}
              style={styles.startBtnGradient}
            >
              <Text style={styles.startBtnText}>START WORKOUT</Text>
              <Ionicons name="play" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  editSplitBtn: { padding: 8 },

  listContent: { padding: 20, paddingBottom: 100 },
  
  // Exercise Card
  exerciseCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  exInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginRight: 16,
  },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 4 },
  exMeta: { fontFamily: FONTS.body, fontSize: 12, textTransform: 'capitalize' },
  removeIcon: { padding: 4 },

  exControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  controlItem: { flex: 1, alignItems: 'center' },
  controlLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, marginBottom: 2 },
  controlValue: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  vDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.08)' },
  editStatsBtn: { paddingLeft: 12 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  addExBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addExText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#E00000' },
  startBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
  },
  startBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF', letterSpacing: 1 },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
