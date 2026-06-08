import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ExerciseFilters {
  categories: string[];
  bodyParts: string[];
  equipment: string[];
  targets: string[];
  minRating: number;
}

interface FilterMeta {
  categories: string[];
  body_parts: string[];
  equipment: string[];
  targets: string[];
}

interface SectionState {
  [key: string]: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: ExerciseFilters;
  onApply: (filters: ExerciseFilters) => void;
  onClear: () => void;
}

const SECTIONS = [
  { key: 'categories', label: 'Category', icon: 'grid-outline' as const },
  { key: 'bodyParts', label: 'Body Part', icon: 'body-outline' as const },
  { key: 'equipment', label: 'Equipment', icon: 'fitness-outline' as const },
  { key: 'targets', label: 'Target Muscle', icon: 'pulse-outline' as const },
  { key: 'rating', label: 'Minimum Rating', icon: 'star-outline' as const },
];

export default function ExerciseFilterModal({ visible, onClose, filters, onApply, onClear }: Props) {
  const { colors, isDark } = useTheme();
  const [meta, setMeta] = useState<FilterMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<ExerciseFilters>(filters);
  const [expanded, setExpanded] = useState<SectionState>({ categories: true });

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      setLoading(true);
      axios.get(`${API_URL}/exercises/meta/filters`)
        .then(res => setMeta(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible, filters]);

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleOption = (section: keyof ExerciseFilters, value: string) => {
    setLocal(prev => {
      const arr = prev[section] as string[];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [section]: next };
    });
  };

  const setRating = (val: number) => {
    setLocal(prev => ({ ...prev, minRating: prev.minRating === val ? 0 : val }));
  };

  const activeCount = (f: ExerciseFilters) => {
    let count = f.categories.length + f.bodyParts.length + f.equipment.length + f.targets.length;
    if (f.minRating > 0) count++;
    return count;
  };

  const chip = (section: keyof ExerciseFilters, value: string) => {
    const selected = (local[section] as string[]).includes(value);
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? '#2596BE' : (isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'),
            borderColor: selected ? '#2596BE' : (isDark ? 'rgba(255,255,255,0.12)' : '#E0E0E0'),
          },
        ]}
        onPress={() => toggleOption(section, value)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: selected ? '#FFF' : (isDark ? '#DDD' : '#333') },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  const ratingRow = (val: number) => {
    const selected = local.minRating === val;
    return (
      <TouchableOpacity
        key={val}
        style={[
          styles.ratingPill,
          {
            backgroundColor: selected ? '#2596BE' : (isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'),
            borderColor: selected ? '#2596BE' : (isDark ? 'rgba(255,255,255,0.12)' : '#E0E0E0'),
          },
        ]}
        onPress={() => setRating(val)}
        activeOpacity={0.7}
      >
        <Ionicons name="star" size={14} color={selected ? '#FFF' : '#F59E0B'} />
        <Text
          style={[
            styles.ratingPillText,
            { color: selected ? '#FFF' : (isDark ? '#DDD' : '#333') },
          ]}
        >
          {val}+
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? '#0A0A0A' : '#FFF',
              paddingTop: Platform.OS === 'ios' ? 60 : 40,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#111'} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#111' }]}>Filters</Text>
            {activeCount(local) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount(local)}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClear} style={styles.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.clearText, { color: '#2596BE' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2596BE" />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {SECTIONS.map(section => {
                if (section.key === 'rating') {
                  return (
                    <View key={section.key} style={styles.section}>
                      <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => toggleSection(section.key)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : '#D6EEF7' }]}>
                            <Ionicons name={section.icon} size={16} color="#2596BE" />
                          </View>
                          <Text style={[styles.sectionLabel, { color: isDark ? '#FFF' : '#111' }]}>{section.label}</Text>
                          {local.minRating > 0 && (
                            <View style={styles.sectionBadge}>
                              <Text style={styles.sectionBadgeText}>{local.minRating}+</Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={isDark ? '#888' : '#999'}
                        />
                      </TouchableOpacity>
                      {expanded[section.key] && (
                        <View style={styles.sectionBody}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratingRow}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ratingRow)}
                          </ScrollView>
                          <TouchableOpacity
                            style={[styles.clearRatingBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0' }]}
                            onPress={() => setLocal(prev => ({ ...prev, minRating: 0 }))}
                          >
                            <Text style={[styles.clearRatingText, { color: isDark ? '#888' : '#999' }]}>Clear rating</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }

                const items = meta ? meta[section.key as keyof FilterMeta] as string[] : [];
                const selected = local[section.key as keyof ExerciseFilters] as string[];

                return (
                  <View key={section.key} style={styles.section}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection(section.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sectionHeaderLeft}>
                        <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.2)' : '#D6EEF7' }]}>
                          <Ionicons name={section.icon} size={16} color="#2596BE" />
                        </View>
                        <Text style={[styles.sectionLabel, { color: isDark ? '#FFF' : '#111' }]}>{section.label}</Text>
                        {selected.length > 0 && (
                          <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{selected.length}</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons
                        name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={isDark ? '#888' : '#999'}
                      />
                    </TouchableOpacity>
                    {expanded[section.key] && (
                      <View style={styles.chipWrap}>
                        {items.length === 0 ? (
                          <Text style={[styles.emptyText, { color: isDark ? '#666' : '#BBB' }]}>No options</Text>
                        ) : (
                          items.map(item => chip(section.key as keyof ExerciseFilters, item))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          <View style={[styles.bottomBar, { backgroundColor: isDark ? '#0A0A0A' : '#FFF', borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E0E0E0' }]}>
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0' }]}
              onPress={onClear}
            >
              <Text style={[styles.clearBtnText, { color: isDark ? '#DDD' : '#333' }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => onApply(local)}
            >
              <Text style={styles.applyBtnText}>
                Show Results{activeCount(local) > 0 ? ` (${activeCount(local)})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: SCREEN_HEIGHT * 0.92,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
  },
  clearText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
  },
  sectionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  sectionBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFF',
  },
  sectionBody: {
    paddingBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ratingPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  clearRatingBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  clearRatingText: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    paddingVertical: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFF',
  },
});
