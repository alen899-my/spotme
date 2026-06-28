import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  FlatList,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OptimizedImage from "../../components/ui/OptimizedImage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import WorkoutCalendarHeatmap, { DayEntry } from "../../components/ui/WorkoutCalendarHeatmap";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";
import { formatDuration, formatDateLabel } from "../../utils/datetime";
import { useUnits } from '../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../utils/units';

const bgImage = require("../../assets/coach/workout3.jpg");

interface PartEntry {
  slug: string;
  label: string;
  history: DayEntry[];
}

const TIERS = [
  { name: "Bronze",      color: "#CD7F32" },
  { name: "Silver",      color: "#B0B8C1" },
  { name: "Gold",        color: "#F7CB16" },
  { name: "Platinum",    color: "#00C9C8" },
  { name: "Diamond",     color: "#7DD4F8" },
  { name: "Master",      color: "#9B59B6" },
  { name: "Grandmaster", color: "#E91E63" },
  { name: "Elite",       color: "#FF5722" },
  { name: "Champion",    color: "#E00000" },
  { name: "Legend",      color: "#FF9900" },
];
function getTier(name: string) { return TIERS.find(t => t.name === name) ?? TIERS[0]; }

export default function CalendarScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [overall, setOverall] = useState<DayEntry[]>([]);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [restDayMap, setRestDayMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Modal state
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [dayWorkouts, setDayWorkouts] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const { unitSystem } = useUnits();

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/daily/calendar-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOverall(res.data.overall || []);
        setParts(res.data.parts || []);
        setRestDayMap(res.data.restDays || {});
      } catch (err) {
        console.error("Failed to load calendar stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDayPress = async (date: string, count: number) => {
    setModalDate(date);
    setModalLoading(true);
    setDayWorkouts([]);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/daily/workouts-by-date`, {
        params: { date },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDayWorkouts(res.data || []);
    } catch (err) {
      console.error("Failed to load day workouts:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const history = activeSlug
    ? parts.find(p => p.slug === activeSlug)?.history || []
    : overall;

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Training Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Year picker ── */}
        <View style={styles.yearRow}>
          <TouchableOpacity
            onPress={() => setViewYear(y => y - 1)}
            style={styles.yearArrow}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.yearLabel, { color: colors.text }]}>{viewYear}</Text>
          <TouchableOpacity
            onPress={() => {
              const next = viewYear + 1;
              if (next <= today.getFullYear()) setViewYear(next);
            }}
            style={[styles.yearArrow, viewYear >= today.getFullYear() && { opacity: 0.25 }]}
            activeOpacity={0.6}
            disabled={viewYear >= today.getFullYear()}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Filter pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          <TouchableOpacity
            style={[
              styles.pill,
              !activeSlug && { backgroundColor: colors.primary, borderColor: colors.primary },
              activeSlug && { backgroundColor: "transparent", borderColor: colors.border },
            ]}
            onPress={() => setActiveSlug(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, !activeSlug && { color: "#FFF" }, activeSlug && { color: colors.textMuted }]}>
              All
            </Text>
          </TouchableOpacity>
          {parts.map(p => (
            <TouchableOpacity
              key={p.slug}
              style={[
                styles.pill,
                activeSlug === p.slug && { backgroundColor: "#FF4B4B", borderColor: "#FF4B4B" },
                activeSlug !== p.slug && { backgroundColor: "transparent", borderColor: colors.border },
              ]}
              onPress={() => setActiveSlug(p.slug)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, activeSlug === p.slug && { color: "#FFF" }, activeSlug !== p.slug && { color: colors.textMuted }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Heatmap ── */}
        <ImageBackground
          source={bgImage}
          style={[styles.card, { overflow: "hidden" }]}
          imageStyle={{ borderRadius: 16 }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.78)", borderRadius: 16 }]} />
          <WorkoutCalendarHeatmap
            history={history}
            restDayMap={restDayMap}
            accentColor={activeSlug ? "#FF4B4B" : "#2596BE"}
            activeColor={activeSlug ? undefined : "#065F46"}
            title={activeSlug ? (parts.find(p => p.slug === activeSlug)?.label || "") : "All Workouts"}
            controlledYear={viewYear}
            onViewChange={(y) => setViewYear(y)}
            onDayPress={handleDayPress}
            vibrant
          />
        </ImageBackground>

        {/* ── Rest & Leave Legend ── */}
        <View style={[styles.legendCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>Rest & Leave Markings</Text>
          <View style={styles.legendGrid}>
            {[
              { letter: 'F', label: 'Fatigue', desc: 'Streak preserved', color: '#3B82F6' },
              { letter: 'S', label: 'Sick Day', desc: 'Streak reset', color: '#F59E0B' },
              { letter: 'I', label: 'Injury', desc: 'Streak reset', color: '#EF4444' },
              { letter: 'A', label: 'After Workout', desc: 'Streak reset', color: '#14B8A6' },
              { letter: 'L', label: 'Late / Busy', desc: 'Streak reset', color: '#8B5CF6' },
              { letter: 'O', label: 'Other', desc: 'Streak reset', color: '#6B7280' },
            ].map((item) => (
              <View key={item.letter} style={styles.legendGridItem}>
                <View style={[styles.legendBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.legendBadgeText}>{item.letter}</Text>
                </View>
                <View style={styles.legendItemTextWrap}>
                  <Text style={[styles.legendItemLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.legendItemSub, { color: item.letter === 'F' ? colors.success : colors.textMuted }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {!activeSlug && (
          <View style={styles.summary}>
            <Text style={[styles.summaryText, { color: colors.textMuted }]}>
              {overall.length} workout days recorded
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Day detail modal ── */}
      <Modal visible={!!modalDate} transparent animationType="slide" onRequestClose={() => setModalDate(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
            {/* Handle */}
            <View style={styles.modalHandleRow}>
              <View style={[styles.modalHandle, { backgroundColor: colors.textMuted + "40" }]} />
            </View>

            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setModalDate(null)} style={styles.modalClose} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.modalTitleWrap}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {modalDate ? formatDateLabel(modalDate) : ""}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {dayWorkouts.length} workout{dayWorkouts.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={{ width: 32 }} />
            </View>

            {/* Content */}
            {modalLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : dayWorkouts.length === 0 ? (
              <View style={styles.modalEmpty}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.modalEmptyText, { color: colors.text }]}>No workouts on this day</Text>
              </View>
            ) : (
              <FlatList
                data={dayWorkouts}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.modalList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: w }) => {
                  const isRest = w.status === 'rest';
                  if (isRest) {
                    const restTypeLabelMap: Record<string, { label: string; letter: string; color: string; icon: string }> = {
                      fatigue:       { label: 'Normal Fatigue Rest', letter: 'F', color: '#3B82F6', icon: 'bed-clock' },
                      sick:          { label: 'Sick Day',           letter: 'S', color: '#F59E0B', icon: 'thermometer' },
                      injury:        { label: 'Injury Rest',        letter: 'I', color: '#EF4444', icon: 'bandage' },
                      after_workout: { label: 'After Workout Rest', letter: 'A', color: '#14B8A6', icon: 'calendar-check-outline' },
                      late:          { label: 'Late / Busy Day',    letter: 'L', color: '#8B5CF6', icon: 'clock-outline' },
                      other:         { label: 'Other',              letter: 'O', color: '#6B7280', icon: 'dots-horizontal-circle-outline' },
                    };
                    const rtCfg = restTypeLabelMap[w.rest_type ?? 'fatigue'] ?? restTypeLabelMap.fatigue;
                    return (
                      <View
                        style={[
                          styles.workoutCard,
                          { backgroundColor: colors.card, borderColor: rtCfg.color + '40' },
                        ]}
                      >
                        <View style={styles.workoutCardInner}>
                          <View style={[styles.workoutImgWrap, { borderColor: colors.border }]}>
                            <View style={[styles.workoutImgPlaceholder, { backgroundColor: colors.inputBg }]}>
                              <MaterialCommunityIcons name={rtCfg.icon as any} size={26} color={rtCfg.color} />
                            </View>
                            <View style={[styles.doneBadge, { backgroundColor: rtCfg.color }]}>
                              <Text style={styles.doneBadgeText}>{rtCfg.letter}</Text>
                            </View>
                          </View>
                          <View style={styles.workoutInfo}>
                            <Text style={[styles.workoutTitle, { color: colors.text }]} numberOfLines={1}>Rest Day</Text>
                            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: rtCfg.color, marginTop: 2 }}>
                              {rtCfg.label}
                            </Text>
                            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                              {w.rest_type === 'fatigue' ? 'Streak preserved — recover and rebuild!' :
                               w.rest_type === 'sick' ? 'Logged as sick — feel better soon!' :
                               w.rest_type === 'injury' ? 'Logged as injury — heal up safely!' :
                               w.rest_type === 'after_workout' ? 'Resting after hitting weekly workout goals.' :
                               w.rest_type === 'late' ? 'Logged as late/busy — life happens!' :
                               'Rest and come back stronger.'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  const tier = getTier(w.league_tier);
                  const totalExs  = parseInt(w.exercise_count || 0);
                  const totalSets = parseInt(w.total_sets || 0);
                  const vol       = Number(w.total_volume) || 0;
                  const dur       = formatDuration(w.total_duration_seconds);
                  const hasPhoto  = !!(w.cover_photo_url || w.completion_photo_url);
                  const title     = w.session_name || w.title || "Workout Session";
                  const split     = w.split_name && w.split_name !== title ? w.split_name : "";

                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setModalDate(null);
                        router.push(`/daily/view/${w.id}`);
                      }}
                      style={[
                        styles.workoutCard,
                        { backgroundColor: colors.card, borderColor: isDark ? colors.border : tier.color + "30" },
                      ]}
                    >
                      <View style={styles.workoutCardInner}>
                        <View style={[styles.workoutImgWrap, { borderColor: colors.border }]}>
                          {hasPhoto ? (
                            <OptimizedImage uri={w.cover_photo_url || w.completion_photo_url} style={styles.workoutImg} />
                          ) : (
                            <View style={[styles.workoutImgPlaceholder, { backgroundColor: colors.inputBg }]}>
                              <MaterialCommunityIcons name="arm-flex" size={26} color={tier.color} />
                            </View>
                          )}
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>DONE</Text>
                          </View>
                        </View>
                        <View style={styles.workoutInfo}>
                          <Text style={[styles.workoutTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                          {!!split && <Text style={[styles.workoutSplit, { color: tier.color }]}>{split}</Text>}
                          <View style={styles.workoutStatsRow}>
                            <View style={styles.workoutStatItem}>
                              <Text style={[styles.workoutStatVal, { color: colors.text }]}>{totalExs}</Text>
                              <Text style={[styles.workoutStatLbl, { color: colors.textMuted }]}>Exs</Text>
                            </View>
                            <View style={[styles.workoutStatLine, { backgroundColor: tier.color + "30" }]} />
                            <View style={styles.workoutStatItem}>
                              <Text style={[styles.workoutStatVal, { color: colors.text }]}>{totalSets}</Text>
                              <Text style={[styles.workoutStatLbl, { color: colors.textMuted }]}>Sets</Text>
                            </View>
                            <View style={[styles.workoutStatLine, { backgroundColor: tier.color + "30" }]} />
                            <View style={styles.workoutStatItem}>
                              <Text style={[styles.workoutStatVal, { color: colors.text }]}>{formatWeightValue(vol, unitSystem)}</Text>
                              <Text style={[styles.workoutStatLbl, { color: colors.textMuted }]}>{weightUnit(unitSystem)}</Text>
                            </View>
                            <View style={[styles.workoutStatLine, { backgroundColor: tier.color + "30" }]} />
                            <View style={styles.workoutStatItem}>
                              <Text style={[styles.workoutStatVal, { color: colors.text }]}>{dur}</Text>
                              <Text style={[styles.workoutStatLbl, { color: colors.textMuted }]}>Time</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 17 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  yearRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 20, paddingVertical: 8,
  },
  yearArrow: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  yearLabel: { fontFamily: FONTS.heading, fontSize: 22, minWidth: 80, textAlign: "center" },
  pillsContainer: { flexDirection: "row", gap: 8, paddingVertical: 12 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  card: { borderRadius: 16, padding: 16, marginTop: 4 },
  summary: { alignItems: "center", paddingTop: 16 },
  summaryText: { fontFamily: FONTS.body, fontSize: 13 },

  legendCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  legendTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  legendGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBadgeText: {
    fontFamily: FONTS.bodyBold,
    color: '#FFF',
    fontSize: 12,
  },
  legendItemTextWrap: {
    flex: 1,
  },
  legendItemLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  legendItemSub: {
    fontFamily: FONTS.body,
    fontSize: 9.5,
    marginTop: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: 300,
  },
  modalHandleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  modalTitleWrap: { alignItems: "center" },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 16 },
  modalSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  modalLoader: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  modalEmpty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 12 },
  modalEmptyText: { fontFamily: FONTS.body, fontSize: 15 },
  modalList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  // Workout card (matches profile workouts style)
  workoutCard: {
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  workoutCardInner: { padding: 12, flexDirection: "row", alignItems: "center" },
  workoutImgWrap: {
    width: 90, height: 110, borderRadius: 14,
    overflow: "hidden", position: "relative", borderWidth: 1,
  },
  workoutImg: { width: "100%", height: "100%" },
  workoutImgPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  doneBadge: {
    position: "absolute", top: 7, left: 7,
    backgroundColor: "#10B981",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  doneBadgeText: { fontFamily: FONTS.bodyBold, color: "#FFF", fontSize: 7.5, letterSpacing: 0.5 },
  workoutInfo: { flex: 1, marginLeft: 14, justifyContent: "center", flexShrink: 1 },
  workoutTitle: { fontFamily: FONTS.heading, fontSize: 17, lineHeight: 20, marginBottom: 2 },
  workoutSplit: { fontFamily: FONTS.bodyBold, fontSize: 12, marginBottom: 8, lineHeight: 16 },
  workoutStatsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  workoutStatItem: { alignItems: "center" },
  workoutStatVal: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  workoutStatLbl: { fontFamily: FONTS.body, fontSize: 9.5, marginTop: 1 },
  workoutStatLine: { width: 1, height: 18 },
});
