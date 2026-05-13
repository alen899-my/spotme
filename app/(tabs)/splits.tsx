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
  Image,
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

  const renderSplit = ({ item, index }: { item: any, index: number }) => {
    // Determine card color: split color or theme primary
    const cardColor = item.template_color || colors.primary || '#E00000';
    
    // Image stack logic
    const rawImages = item.exercise_images || [];
    const images = [...rawImages];
    if (images.length > 2) {
      const shift = index % images.length;
      for (let i = 0; i < shift; i++) {
        images.push(images.shift());
      }
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.splitCard, 
          { 
            backgroundColor: cardColor, 
            shadowColor: cardColor,
            elevation: 4
          }
        ]}
        activeOpacity={0.9}
        onPress={() => router.push(`/splits/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialCommunityIcons name={item.template_icon || "folder-outline"} size={22} color="#FFF" />
          </View>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.splitName} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.cardFooterArea}>
          <View style={styles.cardStatsArea}>
            <View style={styles.miniStat}>
              <Ionicons name="flash" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.miniStatText}>{item.session_count} Sessions</Text>
            </View>
            <View style={styles.miniStat}>
              <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.miniStatText}>Program</Text>
            </View>
          </View>

          <View style={styles.miniImageStack}>
            <Image 
              source={{ uri: images.length > 1 ? images[1] : images[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }} 
              style={[styles.miniThumbnailBack, { opacity: 0.3, transform: [{ rotate: '12deg' }, { translateX: 6 }] }]} 
            />
            {images.length > 0 ? (
              <Image source={{ uri: images[0] }} style={styles.miniThumbnailFront} />
            ) : (
              <View style={[styles.miniThumbnailFront, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="barbell-outline" size={12} color="rgba(255,255,255,0.5)" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Programs</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Custom split groups</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity 
              style={[styles.templateBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => router.push('/splits/templates')}
            >
              <Ionicons name="albums-outline" size={20} color="#8B5CF6" />
            </TouchableOpacity>
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
              Start with an expert split or build your own custom program from scratch.
            </Text>
            <TouchableOpacity 
              style={[styles.createNowBtn, { backgroundColor: '#7C3AED', marginBottom: 12 }]}
              onPress={() => router.push('/splits/templates')}
            >
              <Ionicons name="albums-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.createNowText}>BROWSE EXPERT SPLITS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.createNowBtn, { backgroundColor: '#E00000' }]}
              onPress={() => router.push('/splits/create')}
            >
              <Text style={styles.createNowText}>CREATE FROM SCRATCH</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            key="splits-grid"
            data={splits}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => renderSplit({ item, index })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.templatesBanner}
                onPress={() => router.push('/splits/templates')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
                />
                <View style={styles.bannerIcon}>
                  <Ionicons name="albums" size={22} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templatesBannerTitle}>Browse Expert Splits</Text>
                  <Text style={styles.templatesBannerSub}>Elite programs for faster results</Text>
                </View>
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerBadgeText}>NEW</Text>
                </View>
              </TouchableOpacity>
            }
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
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  templateBtn: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    borderRadius: 12, overflow: 'hidden', elevation: 4,
    shadowColor: '#E00000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  addBtnGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  templatesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 24, padding: 18, marginBottom: 20, overflow: 'hidden',
    width: '100%',
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  templatesBannerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF' },
  templatesBannerSub: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bannerBadge: {
    backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  bannerBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#7C3AED' },
  
  listContent: { paddingBottom: 40 },
  columnWrapper: { justifyContent: 'space-between', gap: 12 },
  
  // Split Card
  splitCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: { padding: 4 },
  splitName: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', marginTop: 12 },
  
  cardStatsArea: {
    marginTop: 8,
    gap: 4,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  
  cardFooterArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  miniImageStack: {
    width: 45,
    height: 40,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  miniThumbnailFront: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 2,
  },
  miniThumbnailBack: {
    width: 36,
    height: 36,
    borderRadius: 8,
    position: 'absolute',
    zIndex: 1,
  },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 100 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 28, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  createNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createNowText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' },
});
