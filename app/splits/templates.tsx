import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Modal, ScrollView,
  Image, useWindowDimensions, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { API_URL } from '../../utils/api';

// Remove static width calculation


const GOAL_LABELS: Record<string, string> = {
  muscle_building: 'Muscle Building',
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  weight_loss: 'Weight Loss',
  general_fitness: 'General Fitness',
};

const GOAL_ICONS: Record<string, string> = {
  muscle_building: 'barbell',
  strength: 'flash',
  hypertrophy: 'body',
  weight_loss: 'flame',
  general_fitness: 'star',
};

export default function TemplatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { width: SW } = useWindowDimensions();

  const isDesktop = SW > 800;
  const isTablet = SW > 600 && SW <= 800;
  const numColumns = isDesktop ? 3 : (isTablet ? 2 : 1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchTemplates = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplates(res.data);
    } catch (e) {
      showToast('Failed to load splits', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTemplates(); }, [fetchTemplates]));

  const openDetail = async (template: any) => {
    setDetailLoading(true);
    setSelected({ ...template, sessions: [] });
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/workouts/templates/${template.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(res.data);
    } catch {
      showToast('Failed to load split details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUseTemplate = async () => {
    if (!selected) return;
    setCloning(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/workouts/templates/${selected.id}/clone`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(`✅ "${selected.name}" added to your programs!`);
      setSelected(null);
      router.push(`/splits/${res.data.split_id}`);
    } catch {
      showToast('Failed to add split', 'error');
    } finally {
      setCloning(false);
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'muscle_building', label: 'Muscle' },
    { key: 'weight_loss', label: 'Fat Loss' },
    { key: 'strength', label: 'Strength' },
    { key: 'general_fitness', label: 'Beginner' },
    { key: 'single_muscle', label: 'Single Muscle' },
  ];

  const filtered = activeFilter === 'all'
    ? templates
    : activeFilter === 'single_muscle' 
      ? templates.filter((t: any) => t.name.toLowerCase().includes('muscle') || t.name.toLowerCase().includes('bro split'))
      : templates.filter((t: any) => t.template_goal === activeFilter);

  const renderCard = ({ item, index }: { item: any, index: number }) => {
    // Shuffle or offset images based on index to ensure variety
    const rawImages = item.exercise_images || [];
    const images = [...rawImages];
    if (images.length > 2) {
      const shift = index % images.length;
      for (let i = 0; i < shift; i++) {
        images.push(images.shift());
      }
    }

    const cardColor = item.template_color || '#E00000';
    
    return (
      <TouchableOpacity
        style={[
          styles.card, 
          { 
            backgroundColor: cardColor, 
            borderColor: cardColor,
            elevation: 4,
            shadowColor: cardColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8
          }
        ]}
        onPress={() => openDetail(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: '#FFF' }]} numberOfLines={2}>
              {item.name}
            </Text>
            
            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.statText, { color: 'rgba(255,255,255,0.8)' }]}>{item.template_days} Days</Text>
              </View>
              <View style={[styles.statDot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
              <View style={styles.statItem}>
                <Ionicons name="layers-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.statText, { color: 'rgba(255,255,255,0.8)' }]}>
                  {item.session_count} Sessions
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.imageStackContainer}>
            <Image 
              source={{ uri: images.length > 1 ? images[1] : images[0] || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }} 
              style={[styles.thumbnailBack, { opacity: 0.3, transform: [{ rotate: '12deg' }, { translateX: 10 }] }]} 
            />
            {images.length > 0 ? (
              <Image source={{ uri: images[0] }} style={styles.thumbnailFront} />
            ) : (
              <View style={[styles.thumbnailFront, { backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name={item.template_icon || 'barbell'} size={24} color="#FFF" />
              </View>
            )}
            <View style={[styles.iconFloat, { backgroundColor: '#FFF' }]}>
              <Ionicons name={(item.template_icon || 'barbell') as any} size={14} color={cardColor} />
            </View>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Expert Splits</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Pro-designed plans, ready to use</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }]}>
          <Ionicons name="information-circle" size={20} color="#10B981" />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            These splits are pre-built by experts. Add one to your programs and customize it freely.
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={{ height: 60 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && { backgroundColor: colors.primary }]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={({ item, index }) => renderCard({ item, index })}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            numColumns={numColumns}
            key={`cols-${numColumns}`}
            columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          />
        )}
      </View>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalSheet, 
            { backgroundColor: colors.card, width: SW > 768 ? 600 : '100%', alignSelf: 'center' }
          ]}>
            {/* Sheet Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {selected && (
              <>
                {/* Modal Header */}
                <View style={styles.modalBanner}>
                  {selected.exercise_images && selected.exercise_images.length > 0 ? (
                    <Image source={{ uri: selected.exercise_images[0] }} style={StyleSheet.absoluteFillObject} />
                  ) : (
                    <LinearGradient
                      colors={[selected.template_color || '#E00000', `${selected.template_color || '#E00000'}99`]}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  
                  <View style={styles.modalBannerContent}>
                    <View style={styles.modalBannerIcon}>
                      <Ionicons name={(selected.template_icon || 'barbell') as any} size={32} color="#FFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.modalTitle}>{selected.name}</Text>
                      <Text style={styles.modalSub}>{selected.template_level} · {selected.template_days} days/week</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalCloseBtn}>
                      <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                  <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{selected.description}</Text>

                  <View style={styles.modalStats}>
                    {[
                      { icon: 'calendar', label: 'Days/Week', val: `${selected.template_days}` },
                      { icon: 'layers', label: 'Sessions', val: `${selected.session_count}` },
                      { icon: 'trophy', label: 'Goal', val: GOAL_LABELS[selected.template_goal] || selected.template_goal },
                    ].map((s, i) => (
                      <View key={i} style={[styles.statBox, { backgroundColor: colors.bg }]}>
                        <Ionicons name={s.icon as any} size={18} color={selected.template_color || '#E00000'} />
                        <Text style={[styles.statVal, { color: colors.text }]}>{s.val}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.sessionsTitle, { color: colors.text }]}>Sessions Included</Text>

                  {detailLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                  ) : (
                    selected.sessions?.map((sess: any, idx: number) => (
                      <View key={sess.id} style={[styles.sessCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <View style={styles.sessHeader}>
                          <View style={[styles.sessDot, { backgroundColor: selected.template_color || '#E00000' }]}>
                            <Text style={styles.sessDotText}>{idx + 1}</Text>
                          </View>
                          <Text style={[styles.sessName, { color: colors.text }]}>{sess.name}</Text>
                          <Text style={[styles.sessCount, { color: colors.textMuted }]}>{sess.exercises?.length || 0} exercises</Text>
                        </View>
                        {sess.exercises?.slice(0, 4).map((ex: any) => (
                          <View key={ex.id} style={styles.exRow}>
                            {ex.image_url ? (
                              <Image source={{ uri: ex.image_url }} style={styles.exImg} />
                            ) : (
                              <View style={[styles.exImg, { backgroundColor: colors.border }]} />
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.exName, { color: colors.text }]} numberOfLines={1}>{ex.name}</Text>
                              <Text style={[styles.exMeta, { color: colors.textMuted }]}>
                                {ex.sets} sets · {ex.reps} reps · {ex.rest_time} rest
                              </Text>
                            </View>
                          </View>
                        ))}
                        {(sess.exercises?.length || 0) > 4 && (
                          <Text style={[styles.moreText, { color: colors.textMuted }]}>
                            +{sess.exercises.length - 4} more exercises
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* CTA Button */}
                <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.cloneBtn}
                    onPress={handleUseTemplate}
                    disabled={cloning}
                  >
                    <LinearGradient
                      colors={[selected.template_color || '#E00000', `${selected.template_color || '#E00000'}CC`]}
                      style={styles.cloneBtnGrad}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      {cloning ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="add-circle" size={22} color="#FFF" />
                          <Text style={styles.cloneBtnText}>ADD TO MY PROGRAMS</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginBottom: 16 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 26 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  infoText: { flex: 1, fontFamily: FONTS.body, fontSize: 12, lineHeight: 18 },

  filterRow: { gap: 8, paddingBottom: 10, paddingRight: 40 },
  filterChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.05)', height: 40, justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#E00000' },
  filterChipText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#666' },
  filterChipTextActive: { color: '#FFF' },

  list: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderRadius: 20, borderWidth: 1, marginBottom: 12,
    overflow: 'hidden', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
  },
  cardContent: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  cardInfo: { flex: 1, paddingRight: 16 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  tagText: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5 },
  cardName: { fontFamily: FONTS.heading, fontSize: 18, lineHeight: 22, marginBottom: 12 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontFamily: FONTS.body, fontSize: 12 },
  statDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)' },
  
  imageStackContainer: { width: 100, height: 90, position: 'relative', alignItems: 'flex-end', justifyContent: 'center' },
  thumbnailFront: { width: 85, height: 85, borderRadius: 16, resizeMode: 'cover', zIndex: 2, borderWidth: 2, borderColor: '#FFF' },
  thumbnailBack: { width: 85, height: 85, borderRadius: 16, resizeMode: 'cover', position: 'absolute', zIndex: 1 },
  iconFloat: {
    position: 'absolute', bottom: -2, right: -2,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFF', zIndex: 3,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '92%', overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, position: 'absolute', top: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.3)' },
  modalBanner: { height: 180, position: 'relative' },
  modalBannerContent: {
    flexDirection: 'row', alignItems: 'center',
    padding: 24, paddingTop: 40, flex: 1,
  },
  modalBannerIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 24, color: '#FFF' },
  modalSub: { fontFamily: FONTS.body, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, paddingBottom: 10 },
  modalDesc: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 24, marginBottom: 24 },
  modalStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4,
  },
  statVal: { fontFamily: FONTS.heading, fontSize: 16, textAlign: 'center' },
  statLabel: { fontFamily: FONTS.body, fontSize: 10, textAlign: 'center' },

  sessionsTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 14 },
  sessCard: {
    borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  sessHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sessDot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  sessDotText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FFF' },
  sessName: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 15 },
  sessCount: { fontFamily: FONTS.body, fontSize: 12 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  exImg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F5' },
  exName: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  exMeta: { fontFamily: FONTS.body, fontSize: 11 },
  moreText: { fontFamily: FONTS.body, fontSize: 12, textAlign: 'center', paddingTop: 4 },

  modalFooter: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, borderTopWidth: 1 },
  cloneBtn: { borderRadius: 18, overflow: 'hidden' },
  cloneBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 58,
  },
  cloneBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
});
