import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import OptimizedImage from '../ui/OptimizedImage';

const BASE_WIDTH = 375;
const MIN_TOUCH = 44;

export interface ExerciseFilters {
  categories: string[];
  bodyParts: string[];
  equipment: string[];
  targets: string[];
  minRating: number;
}

export interface SortOption {
  sort_by: string;
  sort_order: 'asc' | 'desc';
  label: string;
}

export interface FilterItem {
  name: string;
  image_url: string | null;
  count: number;
}

export interface FilterMeta {
  categories: string[];
  body_parts: string[];
  equipment: string[];
  targets: string[];
  category_items?: FilterItem[];
  equipment_items?: FilterItem[];
  target_items?: FilterItem[];
}

export const SORT_OPTIONS: SortOption[] = [
  { sort_by: 'name', sort_order: 'asc', label: 'Name A-Z' },
  { sort_by: 'name', sort_order: 'desc', label: 'Name Z-A' },
  { sort_by: 'avg_rating', sort_order: 'desc', label: 'Rating (High)' },
  { sort_by: 'avg_rating', sort_order: 'asc', label: 'Rating (Low)' },
];

const EQUIPMENT_FALLBACK_IMAGES: Record<string, string> = {
  'olympic barbell': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782649824280_z7s7jf.webp',
  'trap bar': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782649951943_u7sv0l.webp',
  'resistance band': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650275368_qgprw.webp',
  'smith machine': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650998671_ov4nqb.webp',
  'sled machine': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650998671_ov4nqb.webp',
  'stability ball': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650447245_5bnpht.webp',
  'stationary bike': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650948908_jf562.webp',
  'medicine ball': 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650447245_5bnpht.webp',
};

interface SectionState {
  [key: string]: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: ExerciseFilters;
  onApply: (filters: ExerciseFilters, sortOption?: SortOption) => void;
  onClear: () => void;
  drilldownCategory?: string | null;
  sortOption?: SortOption;
}

function s(size: number, width: number) {
  return Math.round(size * Math.min(width / BASE_WIDTH, 1.3));
}

export default function ExerciseFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  drilldownCategory,
  sortOption,
}: Props) {
  const { isDark } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = winW > winH;

  const [allCategories, setAllCategories] = useState<FilterItem[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<FilterItem[]>([]);
  const [targetItems, setTargetItems] = useState<FilterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [cascadeLoading, setCascadeLoading] = useState(false);

  const [local, setLocal] = useState<ExerciseFilters>(filters);
  const [localSort, setLocalSort] = useState<SortOption>(sortOption || SORT_OPTIONS[0]);
  const [expanded, setExpanded] = useState<SectionState>({
    category: true,
    equipment: false,
    targets: false,
    rating: false,
    sort: false,
  });

  const scrollRef = useRef<ScrollView>(null);

  // 2 columns on mobile, 3 columns on tablet
  const isTablet = winW > 600;
  const cardWidthPercent = isTablet ? '31.8%' : '48.5%';
  const hPad = Math.max(12, s(16, winW));

  const activeCategory = drilldownCategory || (local.categories.length > 0 ? local.categories[0] : null);

  const fetchFilterData = useCallback(async (cat: string | null, equips: string[]) => {
    try {
      const params = new URLSearchParams();
      if (cat) params.append('category', cat);
      if (equips.length > 0) params.append('equipment', equips.join(','));

      const url = `${API_URL}/exercises/meta/filters${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await axios.get(url);
      const data = res.data;

      if (data.category_items && data.category_items.length > 0) {
        setAllCategories(prev => (prev.length === 0 ? data.category_items : prev));
      }

      const newEquips: FilterItem[] =
        data.equipment_items ||
        (data.equipment || []).map((e: string) => ({ name: e, image_url: null, count: 0 }));
      const newTargets: FilterItem[] =
        data.target_items ||
        (data.targets || []).map((t: string) => ({ name: t, image_url: null, count: 0 }));

      setEquipmentItems(newEquips);
      setTargetItems(newTargets);

      return { newEquips, newTargets };
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const initialCat = drilldownCategory || (filters.categories.length > 0 ? filters.categories[0] : null);
      const baseFilters: ExerciseFilters = {
        ...filters,
        categories: initialCat ? [initialCat] : [],
        bodyParts: initialCat ? [initialCat] : [],
      };
      setLocal(baseFilters);
      setLocalSort(sortOption || SORT_OPTIONS[0]);
      setLoading(true);

      if (initialCat) {
        setExpanded({ category: false, equipment: true, targets: false, rating: false, sort: false });
      } else {
        setExpanded({ category: true, equipment: false, targets: false, rating: false, sort: false });
      }

      scrollRef.current?.scrollTo({ y: 0, animated: false });
      fetchFilterData(initialCat, baseFilters.equipment).finally(() => setLoading(false));
    }
  }, [visible, drilldownCategory, fetchFilterData]);

  // Selecting a category cascades equipment and target options
  const handleSelectCategory = async (catName: string | null) => {
    if (drilldownCategory) return;

    setCascadeLoading(true);
    const newCat = catName ? [catName] : [];

    const result = await fetchFilterData(catName, []);
    setCascadeLoading(false);

    setLocal(prev => {
      const validEquipSet = new Set(result?.newEquips.map(e => e.name.toLowerCase()) || []);
      const prunedEquips = catName ? prev.equipment.filter(e => validEquipSet.has(e.toLowerCase())) : prev.equipment;

      const validTargetSet = new Set(result?.newTargets.map(t => t.name.toLowerCase()) || []);
      const prunedTargets = catName ? prev.targets.filter(t => validTargetSet.has(t.toLowerCase())) : prev.targets;

      return {
        ...prev,
        categories: newCat,
        bodyParts: newCat,
        equipment: prunedEquips,
        targets: prunedTargets,
      };
    });
  };

  // Toggling equipment cascades target options
  const handleToggleEquipment = async (equipName: string) => {
    const isCurrentlySelected = local.equipment.includes(equipName);
    const updatedEquips = isCurrentlySelected
      ? local.equipment.filter(e => e !== equipName)
      : [...local.equipment, equipName];

    setLocal(prev => ({ ...prev, equipment: updatedEquips }));

    try {
      const params = new URLSearchParams();
      if (activeCategory) params.append('category', activeCategory);
      if (updatedEquips.length > 0) params.append('equipment', updatedEquips.join(','));

      const res = await axios.get(`${API_URL}/exercises/meta/filters?${params.toString()}`);
      const newTargets: FilterItem[] = res.data.target_items || [];
      setTargetItems(newTargets);

      const validTargetSet = new Set(newTargets.map(t => t.name.toLowerCase()));
      setLocal(prev => ({
        ...prev,
        equipment: updatedEquips,
        targets: prev.targets.filter(t => validTargetSet.has(t.toLowerCase())),
      }));
    } catch (err) {
      console.error('Failed to update cascading targets:', err);
    }
  };

  const handleToggleTarget = (targetName: string) => {
    setLocal(prev => {
      const arr = prev.targets;
      const next = arr.includes(targetName) ? arr.filter(t => t !== targetName) : [...arr, targetName];
      return { ...prev, targets: next };
    });
  };

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFilterCount = (f: ExerciseFilters) => {
    const catCount = f.categories.length > 0 && !drilldownCategory ? 1 : 0;
    return catCount + f.equipment.length + f.targets.length + (f.minRating > 0 ? 1 : 0);
  };

  // Rating slider helpers
  const trackRef = useRef<View>(null);
  const trackW = useRef(0);
  const MIN_R = 1;
  const MAX_R = 10;
  const range = MAX_R - MIN_R;
  const ratingFrac = local.minRating ? (local.minRating - MIN_R) / range : 0;
  const thumbSize = s(26, winW);
  const trackHeight = s(8, winW);

  const valFromX = (x: number) => {
    const f = Math.max(0, Math.min(1, x / trackW.current));
    return Math.round(f * range) + MIN_R;
  };

  const topPad = Platform.OS === 'ios' ? (isLandscape ? 16 : Math.max(s(48, winW), 38)) : s(32, winW);

  const getEquipmentImage = (item: FilterItem) => {
    if (item.image_url) return item.image_url;
    const lower = item.name.toLowerCase();
    if (EQUIPMENT_FALLBACK_IMAGES[lower]) return EQUIPMENT_FALLBACK_IMAGES[lower];
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <View style={[st.container, { backgroundColor: isDark ? '#0A0A0A' : '#FFF', paddingTop: topPad }]}>
          {/* Header */}
          <View style={[st.header, { paddingHorizontal: hPad, paddingBottom: s(14, winW) }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[st.headerBtn, { width: s(MIN_TOUCH, winW), height: s(MIN_TOUCH, winW) }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={s(24, winW)} color={isDark ? '#FFF' : '#111'} />
            </TouchableOpacity>

            <Text style={[st.headerTitle, { fontSize: s(22, winW), color: isDark ? '#FFF' : '#111' }]}>
              Filters
            </Text>

            <TouchableOpacity
              onPress={() => {
                onClear();
                setLocal({
                  categories: drilldownCategory ? [drilldownCategory] : [],
                  bodyParts: drilldownCategory ? [drilldownCategory] : [],
                  equipment: [],
                  targets: [],
                  minRating: 0,
                });
                fetchFilterData(drilldownCategory || null, []);
              }}
              style={[st.headerBtn, { width: s(MIN_TOUCH, winW), height: s(MIN_TOUCH, winW) }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[st.clearText, { fontSize: s(14, winW), color: '#2596BE' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={st.loadingWrap}>
              <ActivityIndicator size="large" color="#2596BE" />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={st.scroll}
              contentContainerStyle={[st.scrollContent, { paddingHorizontal: hPad, paddingBottom: s(160, winW) }]}
              showsVerticalScrollIndicator={true}
              indicatorStyle={isDark ? 'white' : 'black'}
              keyboardShouldPersistTaps="handled"
            >
              {/* ────────────────────────────────────────────────────────── */}
              {/* 1. CATEGORY */}
              {/* ────────────────────────────────────────────────────────── */}
              <View style={[st.section, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                <TouchableOpacity
                  style={[st.sectionHeader, { minHeight: s(MIN_TOUCH, winW) }]}
                  onPress={() => toggleSection('category')}
                  activeOpacity={0.7}
                >
                  <View style={st.sectionHeaderLeft}>
                    <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>
                      Category
                    </Text>
                    {activeCategory && (
                      <View style={[st.sectionBadge, { backgroundColor: '#2596BE' }]}>
                        <Text style={st.sectionBadgeText}>{activeCategory.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={expanded.category ? 'chevron-up' : 'chevron-down'}
                    size={s(20, winW)}
                    color={isDark ? '#888' : '#999'}
                  />
                </TouchableOpacity>

                {expanded.category && (
                  <View style={st.sectionBody}>
                    {drilldownCategory ? (
                      <View style={[st.fixedBox, { backgroundColor: isDark ? '#141414' : '#F3F4F6' }]}>
                        <Ionicons name="lock-closed" size={15} color="#2596BE" />
                        <Text style={[st.fixedBoxText, { color: isDark ? '#CCC' : '#555' }]}>
                          Current view is set to {drilldownCategory.toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <View style={st.cardGrid}>
                        {/* All Categories Option Card */}
                        <TouchableOpacity
                          style={[
                            st.filterCard,
                            {
                              width: cardWidthPercent,
                              borderColor: !activeCategory ? '#2596BE' : isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                              borderWidth: !activeCategory ? 2 : 1,
                            },
                          ]}
                          onPress={() => handleSelectCategory(null)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={isDark ? ['#1A1A1A', '#111111'] : ['#F8F9FA', '#E9ECEF']}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={st.allCardInner}>
                            <Ionicons name="grid-outline" size={s(22, winW)} color="#2596BE" />
                            <Text style={[st.allCardTitle, { color: isDark ? '#FFF' : '#111' }]}>
                              All Categories
                            </Text>
                          </View>
                          {!activeCategory && (
                            <View style={st.checkIconPill}>
                              <Ionicons name="checkmark" size={s(12, winW)} color="#FFF" />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Category Cards */}
                        {allCategories.map(cat => {
                          const isSelected = activeCategory?.toLowerCase() === cat.name.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={cat.name}
                              style={[
                                st.filterCard,
                                {
                                  width: cardWidthPercent,
                                  borderColor: isSelected ? '#2596BE' : isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                                  borderWidth: isSelected ? 2.5 : 1,
                                },
                              ]}
                              onPress={() => handleSelectCategory(isSelected ? null : cat.name)}
                              activeOpacity={0.85}
                            >
                              {cat.image_url ? (
                                <OptimizedImage
                                  uri={cat.image_url}
                                  style={StyleSheet.absoluteFill}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#1C1C1E' : '#DDD' }]} />
                              )}

                              <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
                                locations={[0, 0.45, 1]}
                                style={StyleSheet.absoluteFill}
                              />

                              {isSelected && (
                                <View style={st.checkIconPill}>
                                  <Ionicons name="checkmark" size={s(12, winW)} color="#FFF" />
                                </View>
                              )}

                              <View style={st.cardFooter}>
                                <Text style={st.cardTitleText} numberOfLines={1}>
                                  {cat.name}
                                </Text>
                                <Text style={st.cardCountText}>{cat.count} exercises</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 2. EQUIPMENT */}
              {/* ────────────────────────────────────────────────────────── */}
              <View style={[st.section, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                <TouchableOpacity
                  style={[st.sectionHeader, { minHeight: s(MIN_TOUCH, winW) }]}
                  onPress={() => toggleSection('equipment')}
                  activeOpacity={0.7}
                >
                  <View style={st.sectionHeaderLeft}>
                    <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>
                      Equipment
                    </Text>
                    {local.equipment.length > 0 && (
                      <View style={[st.sectionBadge, { backgroundColor: '#2596BE' }]}>
                        <Text style={st.sectionBadgeText}>{local.equipment.length}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={expanded.equipment ? 'chevron-up' : 'chevron-down'}
                    size={s(20, winW)}
                    color={isDark ? '#888' : '#999'}
                  />
                </TouchableOpacity>

                {expanded.equipment && (
                  <View style={st.sectionBody}>
                    {cascadeLoading ? (
                      <View style={st.loadingBox}>
                        <ActivityIndicator size="small" color="#2596BE" />
                      </View>
                    ) : equipmentItems.length === 0 ? (
                      <Text style={[st.emptyNotice, { color: isDark ? '#777' : '#999' }]}>
                        No equipment found
                      </Text>
                    ) : (
                      <View style={st.cardGrid}>
                        {equipmentItems.map(item => {
                          const isSelected = local.equipment.includes(item.name);
                          const imgUri = getEquipmentImage(item);

                          return (
                            <TouchableOpacity
                              key={item.name}
                              style={[
                                st.filterCard,
                                {
                                  width: cardWidthPercent,
                                  borderColor: isSelected ? '#2596BE' : isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                                  borderWidth: isSelected ? 2.5 : 1,
                                  backgroundColor: isDark ? '#161616' : '#F3F4F6',
                                },
                              ]}
                              onPress={() => handleToggleEquipment(item.name)}
                              activeOpacity={0.85}
                            >
                              {imgUri ? (
                                <OptimizedImage
                                  uri={imgUri}
                                  style={StyleSheet.absoluteFill}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={[StyleSheet.absoluteFill, st.centerIcon]}>
                                  <Ionicons
                                    name={item.name.includes('body') ? 'body-outline' : 'barbell-outline'}
                                    size={s(28, winW)}
                                    color="#2596BE"
                                  />
                                </View>
                              )}

                              <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
                                locations={[0, 0.45, 1]}
                                style={StyleSheet.absoluteFill}
                              />

                              {isSelected && (
                                <View style={st.checkIconPill}>
                                  <Ionicons name="checkmark" size={s(12, winW)} color="#FFF" />
                                </View>
                              )}

                              <View style={st.cardFooter}>
                                <Text style={st.cardTitleText} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                <Text style={st.cardCountText}>{item.count} exercises</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 3. TARGET MUSCLE */}
              {/* ────────────────────────────────────────────────────────── */}
              <View style={[st.section, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                <TouchableOpacity
                  style={[st.sectionHeader, { minHeight: s(MIN_TOUCH, winW) }]}
                  onPress={() => toggleSection('targets')}
                  activeOpacity={0.7}
                >
                  <View style={st.sectionHeaderLeft}>
                    <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>
                      Target Muscle
                    </Text>
                    {local.targets.length > 0 && (
                      <View style={[st.sectionBadge, { backgroundColor: '#2596BE' }]}>
                        <Text style={st.sectionBadgeText}>{local.targets.length}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={expanded.targets ? 'chevron-up' : 'chevron-down'}
                    size={s(20, winW)}
                    color={isDark ? '#888' : '#999'}
                  />
                </TouchableOpacity>

                {expanded.targets && (
                  <View style={st.sectionBody}>
                    {targetItems.length === 0 ? (
                      <Text style={[st.emptyNotice, { color: isDark ? '#777' : '#999' }]}>
                        No target muscles found
                      </Text>
                    ) : (
                      <View style={st.chipsRow}>
                        {targetItems.map(item => {
                          const isSelected = local.targets.includes(item.name);
                          return (
                            <TouchableOpacity
                              key={item.name}
                              style={[
                                st.chip,
                                {
                                  width: cardWidthPercent,
                                  backgroundColor: isSelected
                                    ? 'rgba(37,150,190,0.15)'
                                    : isDark
                                    ? '#141414'
                                    : '#F3F4F6',
                                  borderColor: isSelected ? '#2596BE' : isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                                },
                              ]}
                              onPress={() => handleToggleTarget(item.name)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  st.chipCheckbox,
                                  {
                                    borderColor: isSelected ? '#2596BE' : isDark ? '#666' : '#CCC',
                                    backgroundColor: isSelected ? '#2596BE' : 'transparent',
                                  },
                                ]}
                              >
                                {isSelected && <Ionicons name="checkmark" size={11} color="#FFF" />}
                              </View>
                              <Text
                                style={[
                                  st.chipText,
                                  { color: isDark ? '#EEE' : '#222' },
                                  isSelected && { fontFamily: FONTS.bodySemiBold, color: '#2596BE' },
                                ]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <View style={[st.chipBadge, { backgroundColor: isDark ? '#222' : '#E5E7EB' }]}>
                                <Text style={[st.chipBadgeText, { color: isDark ? '#888' : '#666' }]}>
                                  {item.count}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 4. MINIMUM RATING */}
              {/* ────────────────────────────────────────────────────────── */}
              <View style={[st.section, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                <TouchableOpacity
                  style={[st.sectionHeader, { minHeight: s(MIN_TOUCH, winW) }]}
                  onPress={() => toggleSection('rating')}
                  activeOpacity={0.7}
                >
                  <View style={st.sectionHeaderLeft}>
                    <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>
                      Minimum Rating
                    </Text>
                    {local.minRating > 0 && (
                      <View style={[st.sectionBadge, { backgroundColor: '#2596BE' }]}>
                        <Text style={st.sectionBadgeText}>{local.minRating}+</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={expanded.rating ? 'chevron-up' : 'chevron-down'}
                    size={s(20, winW)}
                    color={isDark ? '#888' : '#999'}
                  />
                </TouchableOpacity>

                {expanded.rating && (
                  <View style={[st.sectionBody, { paddingHorizontal: 16, paddingBottom: 16 }]}>
                    <View style={st.ratingValBox}>
                      <Text style={[st.ratingValNum, { fontSize: s(28, winW), color: isDark ? '#FFF' : '#111' }]}>
                        {local.minRating || 'Any'}
                      </Text>
                      <Text style={[st.ratingValSub, { color: isDark ? '#888' : '#777' }]}>
                        {local.minRating ? `Minimum ${local.minRating}+ stars` : 'No minimum rating'}
                      </Text>
                    </View>

                    <View
                      ref={trackRef}
                      onLayout={e => {
                        trackW.current = e.nativeEvent.layout.width;
                      }}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onResponderGrant={e => {
                        const val = valFromX(e.nativeEvent.locationX);
                        setLocal(prev => ({ ...prev, minRating: prev.minRating === val ? 0 : val }));
                      }}
                      onResponderMove={e => {
                        const val = valFromX(e.nativeEvent.locationX);
                        setLocal(prev => ({ ...prev, minRating: val }));
                      }}
                      style={[st.sliderTrackWrap, { height: s(40, winW) }]}
                    >
                      <View
                        style={[
                          st.sliderTrack,
                          {
                            height: trackHeight,
                            borderRadius: trackHeight / 2,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0',
                          },
                        ]}
                      >
                        <View
                          style={[
                            st.sliderFill,
                            {
                              width: `${ratingFrac * 100}%`,
                              height: trackHeight,
                              borderRadius: trackHeight / 2,
                              backgroundColor: '#2596BE',
                            },
                          ]}
                        />
                      </View>
                      <View
                        style={[
                          st.sliderThumb,
                          {
                            width: thumbSize,
                            height: thumbSize,
                            borderRadius: thumbSize / 2,
                            left: ratingFrac > 0 ? `${ratingFrac * 100}%` : 0,
                            marginLeft: -(thumbSize / 2),
                            backgroundColor: '#2596BE',
                            borderWidth: 3,
                            borderColor: isDark ? '#0A0A0A' : '#FFF',
                            opacity: local.minRating > 0 ? 1 : 0,
                          },
                        ]}
                      />
                    </View>

                    <View style={st.sliderLabels}>
                      <Text style={[st.sliderLabelText, { color: isDark ? '#777' : '#AAA' }]}>1</Text>
                      <Text style={[st.sliderLabelText, { color: isDark ? '#777' : '#AAA' }]}>10</Text>
                    </View>

                    {local.minRating > 0 && (
                      <TouchableOpacity
                        onPress={() => setLocal(prev => ({ ...prev, minRating: 0 }))}
                        style={[
                          st.clearRatingBtn,
                          { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0' },
                        ]}
                      >
                        <Text style={[st.clearRatingText, { color: isDark ? '#888' : '#999' }]}>
                          Clear rating
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* ────────────────────────────────────────────────────────── */}
              {/* 5. SORT BY */}
              {/* ────────────────────────────────────────────────────────── */}
              <View style={[st.section, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]}>
                <TouchableOpacity
                  style={[st.sectionHeader, { minHeight: s(MIN_TOUCH, winW) }]}
                  onPress={() => toggleSection('sort')}
                  activeOpacity={0.7}
                >
                  <View style={st.sectionHeaderLeft}>
                    <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>
                      Sort By
                    </Text>
                    <View style={[st.sectionBadge, { backgroundColor: '#2596BE' }]}>
                      <Text style={st.sectionBadgeText}>{localSort.label}</Text>
                    </View>
                  </View>

                  <Ionicons
                    name={expanded.sort ? 'chevron-up' : 'chevron-down'}
                    size={s(20, winW)}
                    color={isDark ? '#888' : '#999'}
                  />
                </TouchableOpacity>

                {expanded.sort && (
                  <View style={{ paddingHorizontal: 4, paddingBottom: 6 }}>
                    {SORT_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          st.optionRow,
                          { minHeight: s(50, winW), backgroundColor: isDark ? '#0A0A0A' : '#FFF' },
                        ]}
                        onPress={() => setLocalSort(opt)}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            st.optionText,
                            { fontSize: s(15, winW), color: isDark ? '#DDD' : '#333' },
                            localSort.label === opt.label && { fontFamily: FONTS.bodySemiBold },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                        <View
                          style={[
                            st.checkbox,
                            {
                              width: s(24, winW),
                              height: s(24, winW),
                              borderRadius: s(7, winW),
                              borderWidth: Math.max(2, s(2.5, winW)),
                              borderColor:
                                localSort.label === opt.label
                                  ? '#2596BE'
                                  : isDark
                                  ? 'rgba(255,255,255,0.25)'
                                  : '#CCC',
                              backgroundColor: localSort.label === opt.label ? '#2596BE' : 'transparent',
                            },
                          ]}
                        >
                          {localSort.label === opt.label && (
                            <Ionicons name="checkmark" size={s(15, winW)} color="#FFF" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ height: s(40, winW) }} />
            </ScrollView>
          )}

          {/* Bottom Bar */}
          <View
            style={[
              st.bottomBar,
              {
                backgroundColor: isDark ? '#0A0A0A' : '#FFF',
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E0E0E0',
                paddingHorizontal: hPad,
                paddingTop: s(14, winW),
                paddingBottom: Math.max(insets.bottom, s(18, winW)),
              },
            ]}
          >
            <TouchableOpacity
              style={[st.applyBtn, { height: s(52, winW), backgroundColor: '#2596BE' }]}
              onPress={() => onApply(local, localSort)}
              activeOpacity={0.85}
            >
              <Text style={[st.applyBtnText, { fontSize: s(16, winW) }]}>
                Show Results{activeFilterCount(local) > 0 ? ` (${activeFilterCount(local)})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    letterSpacing: 0.5,
  },
  clearText: {
    fontFamily: FONTS.bodySemiBold,
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
    paddingTop: 4,
  },

  // Collapsible Section Accordions
  section: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
  },
  sectionBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFF',
  },
  sectionBody: {
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 4,
  },
  fixedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  fixedBoxText: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  loadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyNotice: {
    fontFamily: FONTS.body,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },

  // 2-Column Responsive Card Grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  filterCard: {
    aspectRatio: 1.32,
    borderRadius: 13,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 8,
    marginBottom: 9,
  },
  allCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  allCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  checkIconPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  cardFooter: {
    zIndex: 5,
  },
  cardTitleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardCountText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  centerIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2-Column Responsive Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  chipCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  chipText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  chipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  chipBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
  },

  // Rating Section
  ratingValBox: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  ratingValNum: {
    fontFamily: FONTS.heading,
  },
  ratingValSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 2,
  },
  sliderTrackWrap: {
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },
  sliderTrack: {
    overflow: 'hidden',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -13 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sliderLabelText: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  clearRatingBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  clearRatingText: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },

  // Sort Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  optionText: {
    flex: 1,
    marginRight: 12,
    fontFamily: FONTS.body,
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Bar
  bottomBar: {
    borderTopWidth: 1,
  },
  applyBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  applyBtnText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
  },
});
