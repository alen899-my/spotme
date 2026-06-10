import React, { useState, useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '../../utils/api';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const BASE_WIDTH = 375;
const MIN_TOUCH = 44;

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
  drilldownCategory?: string | null;
}

const SECTIONS = [
  { key: 'bodyParts', label: 'Body Part' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'targets', label: 'Target Muscle' },
  { key: 'rating', label: 'Minimum Rating' },
];

function s(size: number, width: number) {
  return Math.round(size * Math.min(width / BASE_WIDTH, 1.4));
}

export default function ExerciseFilterModal({ visible, onClose, filters, onApply, onClear, drilldownCategory }: Props) {
  const { isDark } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = winW > winH;
  const [meta, setMeta] = useState<FilterMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<ExerciseFilters>(filters);
  const [expanded, setExpanded] = useState<SectionState>({ bodyParts: true });

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      const baseFilters = drilldownCategory
        ? { ...filters, bodyParts: [] }
        : filters;
      setLocal(baseFilters);
      setLoading(true);
      const firstSection = drilldownCategory ? 'equipment' : 'bodyParts';
      setExpanded({ [firstSection]: true });
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const metaUrl = drilldownCategory
        ? `${API_URL}/exercises/meta/filters?category=${encodeURIComponent(drilldownCategory)}`
        : `${API_URL}/exercises/meta/filters`;
      axios.get(metaUrl)
        .then(res => setMeta(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible, filters, drilldownCategory]);

  useEffect(() => {
    if (meta) setLoading(false);
  }, [meta]);

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

  const activeCount = (f: ExerciseFilters) => {
    return f.bodyParts.length + f.equipment.length + f.targets.length + (f.minRating > 0 ? 1 : 0);
  };

  const trackRef = useRef<View>(null);
  const trackW = useRef(0);
  const MIN_R = 1;
  const MAX_R = 10;
  const range = MAX_R - MIN_R;

  const ratingFrac = local.minRating ? (local.minRating - MIN_R) / range : 0;
  const thumbSize = s(28, winW);
  const trackHeight = s(8, winW);

  const valFromX = (x: number) => {
    const f = Math.max(0, Math.min(1, x / trackW.current));
    return Math.round(f * range) + MIN_R;
  };

  const topPad = Platform.OS === 'ios' ? (isLandscape ? 20 : Math.max(s(50, winW), 40)) : s(36, winW);

  const optionRow = (section: keyof ExerciseFilters, value: string) => {
    const selected = (local[section] as string[]).includes(value);
    return (
      <TouchableOpacity
        key={value}
        style={[st.optionRow, { minHeight: s(50, winW), backgroundColor: isDark ? '#0A0A0A' : '#FFF' }]}
        onPress={() => toggleOption(section, value)}
        activeOpacity={0.6}
      >
        <Text
          style={[
            st.optionText,
            { fontSize: s(15, winW), color: isDark ? '#DDD' : '#333' },
            selected && { fontFamily: FONTS.bodySemiBold },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <View
          style={[
            st.checkbox,
            {
              width: s(24, winW), height: s(24, winW), borderRadius: s(7, winW), borderWidth: Math.max(2, s(2.5, winW)),
              borderColor: selected ? '#2596BE' : (isDark ? 'rgba(255,255,255,0.25)' : '#CCC'),
              backgroundColor: selected ? '#2596BE' : 'transparent',
            },
          ]}
        >
          {selected && <Ionicons name="checkmark" size={s(15, winW)} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <View
          style={[
            st.container,
            { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#FFF', paddingTop: topPad },
          ]}
        >
          <View style={[st.header, { paddingHorizontal: s(20, winW), paddingBottom: s(14, winW) }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[st.headerBtn, { width: s(MIN_TOUCH, winW), height: s(MIN_TOUCH, winW) }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={s(24, winW)} color={isDark ? '#FFF' : '#111'} />
            </TouchableOpacity>
            <Text style={[st.headerTitle, { fontSize: s(22, winW), color: isDark ? '#FFF' : '#111' }]}>Filters</Text>
            <TouchableOpacity
              onPress={onClear}
              style={[st.headerBtn, { width: s(MIN_TOUCH, winW), height: s(MIN_TOUCH, winW) }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[st.clearText, { fontSize: s(14, winW), color: '#2596BE' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={[st.loadingWrap, { paddingBottom: s(80, winW) }]}>
              <ActivityIndicator size="large" color="#2596BE" />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={st.scroll}
              contentContainerStyle={[st.scrollContent, { paddingHorizontal: s(20, winW), paddingTop: s(8, winW), paddingBottom: s(160, winW) }]}
              showsVerticalScrollIndicator={true}
              indicatorStyle={isDark ? 'white' : 'black'}
              keyboardShouldPersistTaps="handled"
              contentInset={{ bottom: s(20, winW) }}
            >
              {SECTIONS.filter(s => !(drilldownCategory && s.key === 'bodyParts')).map(section => {
                if (section.key === 'rating') {
                  return (
                    <View key={section.key} style={[st.section, { marginBottom: s(14, winW), borderWidth: isLandscape ? 0 : 1 }]}>
                      <TouchableOpacity
                        style={[st.sectionHeader, { paddingVertical: s(16, winW), paddingHorizontal: s(16, winW), minHeight: s(MIN_TOUCH, winW) }]}
                        onPress={() => toggleSection(section.key)}
                        activeOpacity={0.7}
                      >
                        <View style={[st.sectionHeaderLeft, { gap: s(12, winW) }]}>
                          <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>{section.label}</Text>
                          {local.minRating > 0 && (
                            <View style={[st.sectionBadge, { minWidth: s(22, winW), height: s(22, winW), borderRadius: s(11, winW), paddingHorizontal: s(6, winW) }]}>
                              <Text style={[st.sectionBadgeText, { fontSize: s(11, winW) }]}>{local.minRating}+</Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                          size={s(20, winW)}
                          color={isDark ? '#888' : '#999'}
                        />
                      </TouchableOpacity>
                      {expanded[section.key] && (
                        <View style={[st.sectionBody, { paddingHorizontal: s(16, winW), paddingBottom: s(20, winW) }]}>
                          <View style={[st.ratingValue, { paddingTop: s(8, winW), paddingBottom: s(8, winW) }]}>
                            <Text style={[st.ratingValueText, { fontSize: s(28, winW), color: isDark ? '#FFF' : '#111' }]}>
                              {local.minRating || 'Any'}
                            </Text>
                            <Text style={[st.ratingValueLabel, { fontSize: s(14, winW), color: isDark ? '#888' : '#999' }]}>
                              {local.minRating ? `Minimum ${local.minRating}+ stars` : 'No minimum rating'}
                            </Text>
                          </View>
                          <View
                            ref={trackRef}
                            onLayout={e => { trackW.current = e.nativeEvent.layout.width; }}
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
                            <View style={[st.sliderTrack, { height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0' }]}>
                              <View style={[st.sliderFill, { width: `${ratingFrac * 100}%`, height: trackHeight, borderRadius: trackHeight / 2, backgroundColor: '#2596BE' }]} />
                            </View>
                            <View
                              style={[
                                st.sliderThumb,
                                {
                                  width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2,
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
                          <View style={[st.sliderLabels, { marginTop: s(4, winW) }]}>
                            <Text style={[st.sliderLabelText, { fontSize: s(13, winW), color: isDark ? '#777' : '#AAA' }]}>1</Text>
                            <Text style={[st.sliderLabelText, { fontSize: s(13, winW), color: isDark ? '#777' : '#AAA' }]}>10</Text>
                          </View>
                          {local.minRating > 0 && (
                            <TouchableOpacity
                              onPress={() => setLocal(prev => ({ ...prev, minRating: 0 }))}
                              style={[st.clearRatingBtn, { marginTop: s(16, winW), paddingVertical: s(8, winW), paddingHorizontal: s(20, winW), borderRadius: s(10, winW), borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E0E0E0', alignSelf: 'center' }]}
                            >
                              <Text style={[st.clearRatingText, { fontSize: s(13, winW), color: isDark ? '#888' : '#999' }]}>
                                Clear rating
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                }

                const metaKey = section.key === 'bodyParts' ? 'body_parts' : section.key;
                const items = meta ? (meta as any)[metaKey] as string[] : [];
                const selected = local[section.key as keyof ExerciseFilters] as string[];

                return (
                  <View key={section.key} style={[st.section, { marginBottom: s(14, winW) }]}>
                    <TouchableOpacity
                      style={[st.sectionHeader, { paddingVertical: s(16, winW), paddingHorizontal: s(16, winW), minHeight: s(MIN_TOUCH, winW) }]}
                      onPress={() => toggleSection(section.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[st.sectionHeaderLeft, { gap: s(12, winW) }]}>
                        <Text style={[st.sectionLabel, { fontSize: s(16, winW), color: isDark ? '#FFF' : '#111' }]}>{section.label}</Text>
                        {selected.length > 0 && (
                          <View style={[st.sectionBadge, { minWidth: s(22, winW), height: s(22, winW), borderRadius: s(11, winW), paddingHorizontal: s(6, winW) }]}>
                            <Text style={[st.sectionBadgeText, { fontSize: s(11, winW) }]}>{selected.length}</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons
                        name={expanded[section.key] ? 'chevron-up' : 'chevron-down'}
                        size={s(20, winW)}
                        color={isDark ? '#888' : '#999'}
                      />
                    </TouchableOpacity>
                    {expanded[section.key] && (
                      <View style={{ paddingHorizontal: s(4, winW) }}>
                        {items.length === 0 ? (
                          <Text style={[st.emptyText, { fontSize: s(14, winW), paddingVertical: s(16, winW), paddingHorizontal: s(12, winW), color: isDark ? '#666' : '#BBB' }]}>No options</Text>
                        ) : (
                          items.map(item => optionRow(section.key as keyof ExerciseFilters, item))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={{ height: s(40, winW) }} />
            </ScrollView>
          )}

          <View style={[st.bottomBar, {
            backgroundColor: isDark ? '#0A0A0A' : '#FFF',
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E0E0E0',
            paddingHorizontal: s(20, winW),
            paddingTop: s(16, winW),
            paddingBottom: Math.max(insets.bottom, s(20, winW)),
          }]}>
            <TouchableOpacity
              style={[st.applyBtn, { height: s(52, winW), borderRadius: s(16, winW), backgroundColor: '#2596BE' }]}
              onPress={() => onApply(local)}
            >
              <Text style={[st.applyBtnText, { fontSize: s(16, winW) }]}>
                Show Results{activeCount(local) > 0 ? ` (${activeCount(local)})` : ''}
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
  scrollContent: {},
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
  },
  sectionBadge: {
    backgroundColor: '#2596BE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
  },
  sectionBody: {},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  optionText: {
    flex: 1,
    marginRight: 12,
    textTransform: 'capitalize',
    fontFamily: FONTS.body,
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.body,
  },
  ratingValue: {
    alignItems: 'center',
  },
  ratingValueText: {
    fontFamily: FONTS.heading,
  },
  ratingValueLabel: {
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  sliderTrackWrap: {
    justifyContent: 'center',
    position: 'relative',
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
    transform: [{ translateY: -14 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sliderLabelText: {
    fontFamily: FONTS.body,
  },
  clearRatingBtn: {},
  clearRatingText: {
    fontFamily: FONTS.body,
  },
  bottomBar: {
    borderTopWidth: 1,
  },
  applyBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
  },
});
