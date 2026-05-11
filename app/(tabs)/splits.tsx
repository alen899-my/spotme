import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SplitsTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Deletion state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSplits = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/splits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplits(res.data);
    } catch (err) {
      console.error('Error fetching splits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSplits();
    }, [fetchSplits])
  );

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/workouts/splits/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Program deleted successfully');
      setDeleteId(null);
      fetchSplits();
    } catch (err) {
      console.error('Error deleting split:', err);
      showToast('Failed to delete program', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSplit = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => router.push(`/splits/${item.id}`)}
    >
      <LinearGradient
        colors={['rgba(224,0,0,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="folder-zip-outline" size={24} color="#E00000" />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.splitName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.splitDesc, { color: colors.textMuted }]} numberOfLines={1}>
            {item.description || 'Workout Group'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Ionicons name="list-outline" size={14} color="#E00000" />
          <Text style={[styles.statText, { color: colors.text }]}>{item.session_count} Sessions</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Ionicons name="calendar-outline" size={14} color="#E00000" />
          <Text style={[styles.statText, { color: colors.text }]}>Custom Program</Text>
        </View>
        <View style={styles.arrowIcon}>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Programs</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Custom split groups</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/splits/create')}
          >
            <LinearGradient
              colors={['#E00000', '#B00000']}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#E00000" />
          </View>
        ) : splits.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="layers-plus" size={80} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Programs Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Organize your training into programs like "Push Pull Leg" or "Full Body."
            </Text>
            <TouchableOpacity 
              style={[styles.createNowBtn, { backgroundColor: '#E00000' }]}
              onPress={() => router.push('/splits/create')}
            >
              <Text style={styles.createNowText}>CREATE NEW PROGRAM</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={splits}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSplit}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <ConfirmationModal
          visible={deleteId !== null}
          title="Delete Program"
          message="Are you sure you want to delete this program? All sessions and exercises inside will be permanently removed."
          confirmText={isDeleting ? 'DELETING...' : 'DELETE ALL'}
          onConfirm={onConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 10,
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#E00000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 40 },
  
  // Split Card
  splitCard: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(224,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleArea: { flex: 1 },
  splitName: { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 2 },
  splitDesc: { fontFamily: FONTS.body, fontSize: 13 },
  deleteBtn: { padding: 4 },
  
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  arrowIcon: { marginLeft: 'auto' },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  createNowBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createNowText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },
});
