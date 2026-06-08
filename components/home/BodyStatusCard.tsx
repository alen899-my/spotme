import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import Body, { Slug, ExtendedBodyPart } from "react-native-body-highlighter";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { FONTS } from "../../constants/theme";
import { scale, vs, getBMIStatus } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import WorkoutCalendarHeatmap from "../ui/WorkoutCalendarHeatmap";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";


const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  cardBg:      "#2596BE",
  cardDeep:    "#0d4d65",
  iconBg:      "#1a6e8a",
  sun:         "#F7CB16",
  sunDeep:     "#E7B100",
  ink:         "#04282B",
  white:       "#FFFFFF",
  lightText:   "#a8dff0",
  lightBorder: "rgba(255,255,255,0.15)",
  toggleBg:    "#1a6e8a",
  heat:        "#FF4B4B",
};

const HEAT_ALPHA: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (let i = 1; i <= 50; i++) {
    const alphaDecimal = Math.round(10 + (220 * (i - 1)) / 49);
    map[i] = alphaDecimal.toString(16).padStart(2, "0").toUpperCase();
  }
  return map;
})();

const BODY_COLORS = Array.from({ length: 50 }, (_, idx) => {
  const i = idx + 1;
  return `#FF4B4B${HEAT_ALPHA[i]}`;
});

const SLUG_LABELS: Record<string, string> = {
  chest:         "Chest",
  "upper-back":  "Upper Back",
  "lower-back":  "Lower Back",
  deltoids:      "Shoulders",
  biceps:        "Biceps",
  triceps:       "Triceps",
  forearm:       "Forearms",
  abs:           "Abs",
  obliques:      "Obliques",
  gluteal:       "Glutes",
  quadriceps:    "Quads",
  hamstring:     "Hamstrings",
  calves:        "Calves",
  trapezius:     "Traps",
  neck:          "Neck",
  adductors:     "Adductors",
  abductors:     "Abductors",
  ankles:        "Ankles",
  hands:         "Hands",
  tibialis:      "Tibialis",
  knees:         "Knees",
  feet:          "Feet",
};

const INTENSITY_DESC = [
  "",
  "Barely trained — just getting started.",
  "A few isolated sessions on record.",
  "Light training — a couple of weeks in.",
  "Building momentum — consistent for a few weeks.",
  "Moderate effort — about a month of work.",
  "Solid training — 6–8 weeks of consistent volume.",
  "Well-developed — 2–3 months of dedication.",
  "Strong base — 3–4 months of consistent hard work.",
  "Elite level — 5–6 months of sustained training.",
  "Peak conditioning — 6+ months of elite volume.",
];

interface Props {
  gender: "male" | "female";
  weightKg: number;
  heightCm: number;
  bodyFat?: string;
  weeklyWorkouts: number;
  totalWorkouts: number;
  dbMuscleActivity: Array<{ slug: Slug; intensity: number }>;
}

export default function BodyStatusCard({
  gender,
  weightKg,
  heightCm,
  bodyFat,
  weeklyWorkouts,
  totalWorkouts,
  dbMuscleActivity,
}: Props) {
  const { colors, isDark } = useTheme();
  const [bodySide, setBodySide]         = useState<"front" | "back">("front");
  const [showInfo, setShowInfo]         = useState(false);

  // ── Muscle detail state ────────────────────────────────────────────────────
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [muscleDetail, setMuscleDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const { fitnessStatus, fitnessColor } = getBMIStatus(bmi);

  const dynamicScaleX =
    bmi < 17 ? 0.78 : bmi < 18.5 ? 0.88 : bmi < 25 ? 1.0
    : bmi < 30 ? 1.18 : bmi < 35 ? 1.32 : 1.45;
  const dynamicScaleY = Math.max(0.88, Math.min(1.0 + (heightCm - 175) * 0.003, 1.15));

  const activityScore  = Math.min(weeklyWorkouts / 7, 1);
  const activeDayColor = activityScore >= 0.7 ? C.sun : activityScore >= 0.4 ? C.sunDeep : C.lightText;

  const stats = [
    { val: `${weightKg}kg`,                                        lbl: "Weight",         color: C.white },
    { val: `${Math.round(heightCm)}cm`,                            lbl: "Height",         color: C.white },
    { val: bodyFat ? `${parseFloat(bodyFat).toFixed(1)}%` : "--",  lbl: "Body fat",       color: C.white },
    { val: `${totalWorkouts}`,                                      lbl: "Total sessions", color: activeDayColor },
  ];

  // ── Muscle tap handler ────────────────────────────────────────────────────
  const fetchMuscleDetail = async (slug: string) => {
    if (!SLUG_LABELS[slug]) return;
    setSelectedSlug(slug);
    setMuscleDetail(null);
    setDetailLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/daily/muscle-detail/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMuscleDetail(res.data);
    } catch {
      setMuscleDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Sync wrapper — satisfies (b: ExtendedBodyPart, side?) => void
  const handleMusclePress = (bodyPart: ExtendedBodyPart) => {
    fetchMuscleDetail(bodyPart.slug as string);
  };

  const closeDetail = () => { setSelectedSlug(null); setMuscleDetail(null); };


  return (
    <>
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <View style={[styles.headerRow, { marginTop: vs(4) }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Body status</Text>
          <TouchableOpacity onPress={() => setShowInfo(true)} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.toggleTrack, { backgroundColor: isDark ? "#1A1A1A" : C.toggleBg }]}>
          {(["front", "back"] as const).map((side) => (
            <TouchableOpacity
              key={side}
              onPress={() => setBodySide(side)}
              style={[
                styles.toggleBtn,
                bodySide === side && { backgroundColor: isDark ? colors.primary : C.sun },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleTxt,
                  { color: isDark ? colors.textMuted : C.lightText },
                  bodySide === side && { color: isDark ? "#FFFFFF" : C.ink },
                ]}
              >
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Body card ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.card : C.cardBg,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? colors.border : "transparent",
          },
        ]}
      >
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? "#1A1A1A" : C.iconBg }]}>
            <View style={[styles.badgeDot, { backgroundColor: fitnessColor }]} />
            <Text style={styles.badgeStatus}>{fitnessStatus}</Text>
            <View style={styles.bmiChip}>
              <Text style={styles.bmiChipText}>BMI {bmi.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.tapHint, { color: isDark ? colors.textMuted : C.lightText }]}>
          Tap a muscle to see its progress
        </Text>

        <View style={styles.bodyWrap} onStartShouldSetResponder={() => true}>
          <View style={{ transform: [{ scaleX: dynamicScaleX }, { scaleY: dynamicScaleY }] }}>
            <Body
              data={dbMuscleActivity}
              gender={gender}
              side={bodySide}
              scale={1.15}
              onBodyPartPress={handleMusclePress}
              colors={BODY_COLORS}
              defaultFill={isDark ? "#222222" : "#1a3a45"}
              defaultStroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)"}
              defaultStrokeWidth={0.5}
            />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : C.lightBorder }]} />

        <View style={styles.statsRow}>
          {stats.map((s, i, arr) => (
            <React.Fragment key={s.lbl}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={[styles.statLbl, { color: isDark ? colors.textMuted : C.lightText }]}>{s.lbl}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[styles.statSep, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : C.lightBorder }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── Info modal ─────────────────────────────────────────────────────── */}
      <Modal visible={showInfo} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Muscle Activity Map</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                Colors reflect your <Text style={{ fontFamily: FONTS.bodyBold }}>sustained training effort</Text> over time — not just recent sessions.{"\n\n"}
                Each workout adds heat to that muscle, but the color slowly fades if you stop training it. Reaching bright red requires <Text style={{ fontFamily: FONTS.bodyBold }}>months of consistent volume</Text> — a few sessions won't cut it.
              </Text>

              {/* Gradient scale bar */}
              <View style={[styles.intensityCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.intensityBarWrap}>
                  <View style={styles.intensityBar}>
                    {Array.from({ length: 50 }, (_, idx) => idx + 1).map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.intensitySegment,
                          { backgroundColor: `#FF4B4B${HEAT_ALPHA[level]}` },
                          level === 1  && { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
                          level === 50 && { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.intensityTickRow}>
                    {[1, 10, 20, 30, 40, 50].map((level) => (
                      <Text key={level} style={[styles.intensityTick, { color: colors.textMuted }]}>{level}</Text>
                    ))}
                  </View>
                </View>
                <View style={styles.intensityHintRow}>
                  <Text style={[styles.intensityHint, { color: colors.textMuted }]}>Low</Text>
                  <Text style={[styles.intensityHint, { color: colors.textMuted }]}>High</Text>
                </View>
              </View>

              {Object.entries(SLUG_LABELS).map(([slug, label]) => (
                <View key={slug} style={[styles.legendRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.legendSwatch, { backgroundColor: `#FF4B4B${HEAT_ALPHA[25]}` }]} />
                  <Text style={[styles.legendLabel, { color: colors.text }]}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Muscle detail modal ───────────────────────────────────────────── */}
      <Modal
        visible={!!selectedSlug}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {SLUG_LABELS[selectedSlug ?? ""] ?? "Muscle"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Training progress</Text>
              </View>
              <TouchableOpacity onPress={closeDetail} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={C.heat} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading data…</Text>
              </View>
            ) : !muscleDetail || muscleDetail.totalDays === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="barbell-outline" size={52} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                  Start logging workouts targeting{"\n"}
                  <Text style={{ fontFamily: FONTS.bodyBold }}>
                    {SLUG_LABELS[selectedSlug ?? ""] ?? "this muscle"}
                  </Text>{" "}
                  to see progress here.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>

                {/* ── Intensity badge ──────────────────────────────────────── */}
                <View style={[styles.intensityBadgeRow, { backgroundColor: isDark ? "#1e1e1e" : "#f8f8f8", borderColor: colors.border }]}>
                  <View style={styles.intensityBadgeLeft}>
                    <Text style={[styles.intensityBadgeNum, { color: `${C.heat}${HEAT_ALPHA[Math.max(1, muscleDetail.currentIntensity)] ?? "80"}` }]}>
                      {muscleDetail.currentIntensity}
                    </Text>
                    <Text style={[styles.intensityBadgeOf, { color: colors.textMuted }]}>/50</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.intensityBadgeLabel, { color: colors.text }]}>Current intensity</Text>
                    <Text style={[styles.intensityBadgeDesc, { color: colors.textMuted }]}>
                      {INTENSITY_DESC[Math.min(10, Math.max(1, Math.ceil(muscleDetail.currentIntensity / 5)))] || "Keep training!"}
                    </Text>
                  </View>
                </View>

                {/* ── Intensity mini bar ────────────────────────────────────── */}
                <View style={styles.miniBarWrap}>
                  {Array.from({ length: 50 }, (_, idx) => idx + 1).map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.miniBarSeg,
                        {
                          backgroundColor: level <= muscleDetail.currentIntensity
                            ? `#FF4B4B${HEAT_ALPHA[level]}`
                            : isDark ? "#2a2a2a" : "rgba(0,0,0,0.06)",
                        },
                        level === 1  && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                        level === 50 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                      ]}
                    />
                  ))}
                </View>

                {/* ── Stats row ───────────────────────────────────────────── */}
                <View style={[styles.detailStatsRow, { borderColor: colors.border }]}>
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatVal, { color: colors.text }]}>
                      {muscleDetail.totalDays}
                    </Text>
                    <Text style={[styles.detailStatLbl, { color: colors.textMuted }]}>Days trained</Text>
                  </View>
                  <View style={[styles.detailStatSep, { backgroundColor: colors.border }]} />
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatVal, { color: muscleDetail.daysSinceLast === 0 ? "#10B981" : muscleDetail.daysSinceLast <= 7 ? C.sun : "#EF4444" }]}>
                      {muscleDetail.daysSinceLast === 0 ? "Today" : muscleDetail.daysSinceLast === 1 ? "Yesterday" : `${muscleDetail.daysSinceLast}d ago`}
                    </Text>
                    <Text style={[styles.detailStatLbl, { color: colors.textMuted }]}>Last session</Text>
                  </View>
                  <View style={[styles.detailStatSep, { backgroundColor: colors.border }]} />
                  <View style={styles.detailStat}>
                    <Text style={[styles.detailStatVal, { color: colors.text }]}>
                      {muscleDetail.currentScore}
                    </Text>
                    <Text style={[styles.detailStatLbl, { color: colors.textMuted }]}>Score</Text>
                  </View>
                </View>

                {/* ── Calendar heatmap ─────────────────────────────────── */}
                <WorkoutCalendarHeatmap
                  history={muscleDetail.history || []}
                  accentColor={C.heat}
                  title="Training calendar"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CELL_SIZE = Math.floor((SCREEN_W - 64) / 12); // 12 columns (weeks)

const styles = StyleSheet.create({

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(12),
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    letterSpacing: -0.3,
  },
  toggleTrack: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(5),
    borderRadius: 16,
  },
  toggleTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    letterSpacing: 0.4,
  },

  card: {
    borderRadius: scale(24),
    padding: scale(18),
    marginBottom: vs(20),
  },
  badgeRow: {
    alignItems: "center",
    marginBottom: vs(6),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    borderRadius: 30,
    paddingHorizontal: scale(16),
    paddingVertical: vs(7),
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeStatus: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
    color: C.white,
  },
  bmiChip: {
    backgroundColor: C.sun,
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(2),
    marginLeft: scale(2),
  },
  bmiChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: C.ink,
  },
  tapHint: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    textAlign: "center",
    marginBottom: vs(4),
    opacity: 0.8,
  },
  bodyWrap: {
    alignItems: "center",
    paddingVertical: vs(12),
  },
  divider: {
    height: 1,
    marginVertical: vs(14),
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    letterSpacing: -0.3,
  },
  statLbl: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
  },
  statSep: {
    width: 1,
    height: vs(28),
  },

  // ── Info modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  modalDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },

  // ── Intensity scale (info modal) ─────────────────────────────────────────
  intensityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
    gap: 8,
  },
  intensityBarWrap: { gap: 4 },
  intensityBar: {
    flexDirection: "row",
    height: 18,
    borderRadius: 8,
    overflow: "hidden",
  },
  intensitySegment: { flex: 1 },
  intensityTickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  intensityTick: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  intensityHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  intensityHint: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  legendSwatch: {
    width: 18,
    height: 18,
    borderRadius: 6,
  },
  legendLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },

  // ── Muscle detail modal ───────────────────────────────────────────────────
  detailSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingBottom: 40,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  detailBody: {
    padding: 20,
    gap: 18,
  },

  // Intensity badge
  intensityBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  intensityBadgeLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  intensityBadgeNum: {
    fontFamily: FONTS.heading,
    fontSize: 44,
    lineHeight: 48,
  },
  intensityBadgeOf: {
    fontFamily: FONTS.body,
    fontSize: 16,
    marginBottom: 6,
  },
  intensityBadgeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginBottom: 4,
  },
  intensityBadgeDesc: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 17,
  },

  // Mini intensity progress bar
  miniBarWrap: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: -8,
  },
  miniBarSeg: { flex: 1 },

  // Stats row
  detailStatsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  detailStatVal: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  detailStatLbl: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  detailStatSep: {
    width: 1,
    marginVertical: 10,
  },

  // Section label
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: -8,
  },

  // 12-week grid (7 rows × 12 cols)
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  gridDayLabel: {
    width: CELL_SIZE,
    textAlign: "center",
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    marginBottom: 2,
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  gridLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
    marginTop: -8,
  },
  gridLegendTxt: {
    fontFamily: FONTS.body,
    fontSize: 10,
    marginHorizontal: 2,
  },

  // Monthly bar chart
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 2,
  },
  barVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
  },
  barTrack: {
    width: "100%",
    flex: 1,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: `${C.heat}90`,
    borderRadius: 4,
  },
  barLabel: {
    fontFamily: FONTS.body,
    fontSize: 8,
  },
});
