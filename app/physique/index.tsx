import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, Animated,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { isSameDay, isToday } from '../../utils/datetime';
import DatePicker from '../../components/ui/DatePicker';
import PhysiqueUploadModal from '../../components/physique/PhysiqueUploadModal';

const { width: SCREEN_W } = Dimensions.get('window');

const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');
const bgImage = require('../../assets/coach/workout1.png');

type Analysis = {
  id: number;
  photo_url: string;
  overall_score: number;
  body_fat_estimate: string;
  muscle_symmetry: number;
  posture_score: number;
  strengths: string[] | string;
  improvements: string[] | string;
  muscle_groups: Record<string, number> | string;
  coach_message: string;
  status: string;
  created_at: string;
};

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const { isDark } = useTheme();
  const color =
    score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : score >= 30 ? '#F97316' : '#EF4444';
  const label =
    score >= 70 ? 'Great' : score >= 50 ? 'Average' : score >= 30 ? 'Needs Work' : 'Beginner';
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={[
          styles.scoreRing,
          { width: size, height: size, borderColor: color, borderWidth: size * 0.07 },
        ]}
      >
        <Text style={[styles.scoreNumber, { color, fontSize: size * 0.3 }]}>{score}</Text>
        <Text
          style={[
            styles.scoreMax,
            {
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
              fontSize: size * 0.12,
            },
          ]}
        >
          /100
        </Text>
      </View>
      <Text style={[styles.scoreLabel, { color, fontSize: size * 0.15 }]}>{label}</Text>
    </View>
  );
}

// ── Muscle Bar ────────────────────────────────────────────────────────────────
function MuscleBar({
  label,
  value,
  isDark,
}: {
  label: string;
  value: number;
  isDark: boolean;
}) {
  const color =
    value >= 70 ? '#10B981' : value >= 50 ? '#F59E0B' : value >= 30 ? '#F97316' : '#EF4444';
  return (
    <View style={styles.muscleRow}>
      <Text
        style={[styles.muscleLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : '#607D8B' }]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.muscleTrack,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8EDF0' },
        ]}
      >
        <View
          style={[styles.muscleFill, { width: `${value}%` as any, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.muscleValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Analysis Card ─────────────────────────────────────────────────────────────
function AnalysisCard({
  item,
  onDelete,
  isDark,
  colors,
}: {
  item: Analysis;
  onDelete: (id: number) => void;
  isDark: boolean;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);

  const strengths: string[] = Array.isArray(item.strengths)
    ? item.strengths
    : typeof item.strengths === 'string'
    ? JSON.parse(item.strengths)
    : [];

  const improvements: string[] = Array.isArray(item.improvements)
    ? item.improvements
    : typeof item.improvements === 'string'
    ? JSON.parse(item.improvements)
    : [];

  const muscleGroups: Record<string, number> =
    typeof item.muscle_groups === 'string'
      ? JSON.parse(item.muscle_groups)
      : item.muscle_groups ?? {};

  const timeStr = new Date(item.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: isDark ? colors.border : 'rgba(0,0,0,0.07)',
        },
      ]}
    >
      {/* Card header row */}
      <View style={styles.cardHeader}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.cardThumb} />
        ) : (
          <View
            style={[
              styles.cardThumbPlaceholder,
              { backgroundColor: isDark ? '#2A2A2A' : '#F0F4F8' },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={isDark ? 'rgba(255,255,255,0.3)' : '#B0BEC5'}
            />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text
            style={[
              styles.cardTime,
              { color: isDark ? 'rgba(255,255,255,0.4)' : '#90A4AE' },
            ]}
          >
            {timeStr}
          </Text>
          <View style={styles.pillRow}>
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(37,150,190,0.12)'
                    : 'rgba(37,150,190,0.08)',
                  borderColor: 'rgba(37,150,190,0.25)',
                },
              ]}
            >
              <Ionicons name="body-outline" size={11} color="#2596BE" />
              <Text style={[styles.metaPillText, { color: '#2596BE' }]}>
                BF: {item.body_fat_estimate}
              </Text>
            </View>
          </View>
        </View>
        <ScoreRing score={item.overall_score} size={64} />
      </View>

      {/* Quick stats */}
      <View
        style={[
          styles.statsRow,
          {
            borderTopColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {[
          {
            label: 'Symmetry',
            value: item.muscle_symmetry,
            icon: 'git-compare-outline' as const,
          },
          {
            label: 'Posture',
            value: item.posture_score,
            icon: 'accessibility-outline' as const,
          },
        ].map((stat) => {
          const c =
            stat.value >= 70 ? '#10B981' : stat.value >= 50 ? '#F59E0B' : '#EF4444';
          return (
            <View key={stat.label} style={styles.statCell}>
              <Ionicons name={stat.icon} size={14} color={c} />
              <Text style={[styles.statValue, { color: c }]}>{stat.value}</Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: isDark ? 'rgba(255,255,255,0.35)' : '#90A4AE',
                  },
                ]}
              >
                {stat.label}
              </Text>
            </View>
          );
        })}
        <TouchableOpacity
          style={[
            styles.expandBtn,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.expandBtnText,
              {
                color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B',
              },
            ]}
          >
            {expanded ? 'Less' : 'Full Report'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={isDark ? 'rgba(255,255,255,0.45)' : '#90A4AE'}
          />
        </TouchableOpacity>
      </View>

      {/* Coach bubble */}
      <View
        style={[
          styles.coachBubble,
          {
            backgroundColor: isDark
              ? 'rgba(37,150,190,0.08)'
              : 'rgba(37,150,190,0.05)',
            borderColor: isDark
              ? 'rgba(37,150,190,0.18)'
              : 'rgba(37,150,190,0.2)',
          },
        ]}
      >
        <Image source={coachAvatarSource} style={styles.coachAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.coachName, { color: '#2596BE' }]}>Coach Spotty</Text>
          <Text
            style={[
              styles.coachMsg,
              { color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' },
            ]}
          >
            {item.coach_message}
          </Text>
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Muscle groups */}
          {Object.keys(muscleGroups).length > 0 && (
            <View
              style={[
                styles.section,
                {
                  borderTopColor: isDark ? colors.border : '#F0F4F8',
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? 'rgba(255,255,255,0.45)' : '#90A4AE' },
                ]}
              >
                MUSCLE GROUPS
              </Text>
              {Object.entries(muscleGroups).map(([muscle, val]) => (
                <MuscleBar
                  key={muscle}
                  label={muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  value={val}
                  isDark={isDark}
                />
              ))}
            </View>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <View
              style={[styles.section, { borderTopColor: isDark ? colors.border : '#F0F4F8' }]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? 'rgba(255,255,255,0.45)' : '#90A4AE' },
                ]}
              >
                ✅ STRENGTHS
              </Text>
              {strengths.map((s, i) => (
                <View key={i} style={styles.feedbackRow}>
                  <View style={styles.feedbackDot} />
                  <Text
                    style={[
                      styles.feedbackText,
                      { color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' },
                    ]}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <View
              style={[styles.section, { borderTopColor: isDark ? colors.border : '#F0F4F8' }]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? 'rgba(255,255,255,0.45)' : '#90A4AE' },
                ]}
              >
                ⚠️ NEEDS WORK
              </Text>
              {improvements.map((imp, i) => (
                <View key={i} style={styles.feedbackRow}>
                  <View style={[styles.feedbackDot, { backgroundColor: '#F97316' }]} />
                  <Text
                    style={[
                      styles.feedbackText,
                      { color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' },
                    ]}
                  >
                    {imp}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity
            style={[
              styles.deleteBtn,
              {
                borderColor: isDark
                  ? 'rgba(239,68,68,0.3)'
                  : 'rgba(239,68,68,0.2)',
              },
            ]}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Analysis</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PhysiqueScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [usedToday, setUsedToday] = useState(0);
  const [dailyLimit] = useState(5);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<Analysis | null>(null);

  const fabAnim = useRef(new Animated.Value(1)).current;

  const fetchAnalyses = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${API_URL}/physique`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalyses(data.analyses ?? []);
      setUsedToday(data.todayCount ?? 0);
    } catch {
      showToast('Failed to load analyses', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAnalyses();
    }, [fetchAnalyses])
  );

  const handleSubmit = useCallback(
    async (imageUri: string) => {
      try {
        setUploading(true);
        setShowModal(false);
        showToast('Analyzing your physique…', 'info');

        const token = await getToken();
        const formData = new FormData();
        formData.append('photo', { uri: imageUri, type: 'image/jpeg', name: 'physique.jpg' } as any);

        const { data } = await axios.post(`${API_URL}/physique/analyze`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        });

        setAnalyses((prev) => [data.analysis, ...prev]);
        setUsedToday(data.usedToday ?? usedToday + 1);
        showToast('Physique analysis complete!', 'success');

        Animated.sequence([
          Animated.spring(fabAnim, { toValue: 1.2, useNativeDriver: true }),
          Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }),
        ]).start();
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Analysis failed. Try again.';
        showToast(msg, 'error');
      } finally {
        setUploading(false);
      }
    },
    [usedToday]
  );

  const handleDelete = useCallback(async (id: number) => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/physique/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Remove from list only — do NOT reduce usedToday.
      // The daily limit counts analyses used, not currently stored.
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      showToast('Analysis deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  }, []);

  // Date-filtered analyses
  const filteredAnalyses = useMemo(
    () => analyses.filter((a) => isSameDay(new Date(a.created_at), selectedDate)),
    [analyses, selectedDate]
  );

  // Dates that have analyses (for calendar dots)
  const loggedDates = useMemo(() => {
    const set = new Set<string>();
    analyses.forEach((a) => {
      const d = new Date(a.created_at);
      set.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`
      );
    });
    return Array.from(set);
  }, [analyses]);

  const isSelectedToday = isToday(selectedDate);
  const limitReached = usedToday >= dailyLimit;

  // ── Header bar (same pattern as Meals) ────────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Title row */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerCopy}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Physique AI</Text>
            <Image source={coachAvatarSource} style={styles.headerAvatar} />
          </View>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Honest AI body assessment 
          </Text>
        </View>

        {/* New Analysis button — only show for today */}
        {isSelectedToday && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={limitReached ? ['#455A64', '#546E7A'] : ['#1a6e8a', '#2596BE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newBtnInner}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.newBtnText}>New</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily limit strip */}
      <View
        style={[
          styles.limitStrip,
          {
            backgroundColor: isDark ? '#161616' : '#F8FAFC',
            borderBottomColor: isDark ? colors.border : '#EEF2F6',
          },
        ]}
      >
        <Ionicons name="analytics-outline" size={13} color="#2596BE" />
        <Text style={[styles.limitStripText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#607D8B' }]}>
          Today:{' '}
          <Text style={{ color: limitReached ? '#EF4444' : '#2596BE', fontFamily: FONTS.bodyBold }}>
            {usedToday}/{dailyLimit}
          </Text>{' '}
          analyses used
        </Text>
        <View style={styles.limitDots}>
          {Array.from({ length: dailyLimit }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.limitDot,
                {
                  backgroundColor:
                    i < usedToday
                      ? limitReached
                        ? '#EF4444'
                        : '#2596BE'
                      : isDark
                      ? 'rgba(255,255,255,0.12)'
                      : '#CBD5E1',
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarWrap}>
        <DatePicker
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          variant="nutrition"
          backgroundImage={bgImage}
          loggedDates={loggedDates}
          showStatusMarkers={true}
        />
      </View>

      {/* Section divider */}
      {filteredAnalyses.length > 0 && (
        <View style={styles.sectionDivider}>
          <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          <View
            style={[
              styles.sectionLabelWrap,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="scan-outline" size={13} color={colors.textDim} />
            <Text style={[styles.sectionLabelText, { color: colors.textDim }]}>
              {filteredAnalyses.length} scan{filteredAnalyses.length !== 1 ? 's' : ''} on this day
            </Text>
          </View>
          <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2596BE" />
          <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.45)' : '#90A4AE' }]}>
            Loading…
          </Text>
        </View>
      );
    }
    if (uploading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2596BE" />
          <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.7)' : '#374151' }]}>
            Analyzing physique…
          </Text>
          <Text style={[styles.loadingSubText, { color: isDark ? 'rgba(255,255,255,0.4)' : '#90A4AE' }]}>
            This may take 20–40 seconds
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Image source={coachAvatarSource} style={styles.emptyCoach} />
        <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>
          {analyses.length === 0 ? 'No analyses yet' : 'No scans on this day'}
        </Text>
        <Text style={[styles.emptySub, { color: isDark ? 'rgba(255,255,255,0.45)' : '#78909C' }]}>
          {analyses.length === 0
            ? 'Tap New to upload a photo\nand get your honest physique score'
            : 'Select another date or tap New\nto add an analysis for today'}
        </Text>
      </View>
    );
  };

  const listData = loading || uploading ? [] : filteredAnalyses;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <AnalysisCard
              item={item}
              onDelete={(id) => {
                const target = analyses.find((a) => a.id === id) ?? null;
                setDeleteTarget(target);
              }}
              isDark={isDark}
              colors={colors}
            />
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAnalyses(true);
            }}
            tintColor="#2596BE"
          />
        }
      />

      {/* Upload modal */}
      <PhysiqueUploadModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        uploading={uploading}
        usedToday={usedToday}
        dailyLimit={dailyLimit}
      />

      {/* Delete confirmation modal — same component, delete mode */}
      <PhysiqueUploadModal
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        mode="delete"
        deleteItem={deleteTarget ?? undefined}
        onConfirmDelete={() => handleDelete(deleteTarget!.id)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { flexGrow: 1 },
  cardWrap: { paddingHorizontal: 16, marginBottom: 14 },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerCopy: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 32, letterSpacing: -1, lineHeight: 34 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerSub: { fontFamily: FONTS.body, fontSize: 12, letterSpacing: 0.3 },
  headerActionWrap: {},
  newBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  newBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  newBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },

  // Limit strip
  limitStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1,
  },
  limitStripText: { fontFamily: FONTS.body, fontSize: 12, flex: 1 },
  limitDots: { flexDirection: 'row', gap: 5 },
  limitDot: { width: 12, height: 12, borderRadius: 6 },

  // Calendar
  calendarWrap: { marginBottom: 0 },

  // Section divider
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
  },
  sectionLine: { flex: 1, height: 1 },
  sectionLabelWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginHorizontal: 10,
  },
  sectionLabelText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },

  // Empty / loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 60 },
  loadingText: { fontFamily: FONTS.bodySemiBold, fontSize: 16 },
  loadingSubText: { fontFamily: FONTS.body, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 10 },
  emptyCoach: { width: 100, height: 100, borderRadius: 50, marginBottom: 6 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, letterSpacing: -0.5 },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Card
  card: {
    borderRadius: 20, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardThumb: { width: 58, height: 58, borderRadius: 14 },
  cardThumbPlaceholder: {
    width: 58, height: 58, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTime: { fontFamily: FONTS.body, fontSize: 11, marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  metaPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },

  // Score ring
  scoreRing: { borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  scoreNumber: { fontFamily: FONTS.heading, letterSpacing: -1 },
  scoreMax: { fontFamily: FONTS.body },
  scoreLabel: { fontFamily: FONTS.bodySemiBold },

  // Stats row
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  statLabel: { fontFamily: FONTS.body, fontSize: 10 },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  expandBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },

  // Coach bubble
  coachBubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 14, padding: 12,
    borderRadius: 16, borderWidth: 1,
  },
  coachAvatar: { width: 32, height: 32, borderRadius: 16 },
  coachName: { fontFamily: FONTS.bodyBold, fontSize: 11, marginBottom: 3 },
  coachMsg: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },

  // Expanded
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
  section: { borderTopWidth: 1, paddingTop: 14, marginTop: 4, marginBottom: 4, gap: 8 },
  sectionTitle: {
    fontFamily: FONTS.bodyBold, fontSize: 10,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
  },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleLabel: { fontFamily: FONTS.body, fontSize: 12, width: 70 },
  muscleTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  muscleFill: { height: '100%', borderRadius: 3 },
  muscleValue: { fontFamily: FONTS.bodyBold, fontSize: 12, width: 28, textAlign: 'right' },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  feedbackDot: {
    width: 6, height: 6, borderRadius: 3, marginTop: 6,
    backgroundColor: '#10B981', flexShrink: 0,
  },
  feedbackText: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 20, flex: 1 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, marginTop: 12,
  },
  deleteBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: '#EF4444' },
});
