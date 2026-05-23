import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Body, { ExtendedBodyPart, Slug } from "react-native-body-highlighter";
import { FONTS } from "../../constants/theme";
import { scale, vs, getBMIStatus } from "../../constants/homeTheme";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cardBg:       "#2596BE",
  cardDeep:     "#0d4d65",
  iconBg:       "#1a6e8a",
  sun:          "#F7CB16",
  sunDeep:      "#E7B100",
  ink:          "#04282B",
  white:        "#FFFFFF",
  lightText:    "#a8dff0",
  lightBorder:  "rgba(255,255,255,0.15)",
  toggleBg:     "#1a6e8a",
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  gender: "male" | "female";
  weightKg: number;
  heightCm: number;
  bodyFat?: string;
  weeklyWorkouts: number;
  dbMuscleActivity: Array<{ slug: Slug; intensity: number }>;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BodyStatusCard({
  gender,
  weightKg,
  heightCm,
  bodyFat,
  weeklyWorkouts,
  dbMuscleActivity,
}: Props) {
  const [bodySide, setBodySide]               = useState<"front" | "back">("front");
  const [selectedMuscles, setSelectedMuscles] = useState<Slug[]>([]);

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const { fitnessStatus, fitnessColor } = getBMIStatus(bmi);

  const dynamicScaleX =
    bmi < 17 ? 0.78 : bmi < 18.5 ? 0.88 : bmi < 25 ? 1.0
    : bmi < 30 ? 1.18 : bmi < 35 ? 1.32 : 1.45;
  const dynamicScaleY = Math.max(0.88, Math.min(1.0 + (heightCm - 175) * 0.003, 1.15));

  const activityScore  = Math.min(weeklyWorkouts / 7, 1);
  const activeDayColor = activityScore >= 0.7 ? C.sun : activityScore >= 0.4 ? C.sunDeep : C.lightText;

  const muscleActivity: ExtendedBodyPart[] = [
    ...dbMuscleActivity.filter((m) => !selectedMuscles.includes(m.slug)),
    // intensity 3 = max = solid yellow, no blue-green blending
    ...selectedMuscles.map((slug) => ({ slug, intensity: 3 as const })),
  ];

  const handleMusclePress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    setSelectedMuscles((prev) =>
      prev.includes(part.slug!)
        ? prev.filter((m) => m !== part.slug)
        : [...prev, part.slug!]
    );
  };

  const stats = [
    { val: `${weightKg}kg`,                                        lbl: "Weight",      color: C.white },
    { val: `${Math.round(heightCm)}cm`,                            lbl: "Height",      color: C.white },
    { val: bodyFat ? `${parseFloat(bodyFat).toFixed(1)}%` : "--",  lbl: "Body fat",    color: C.white },
    { val: `${weeklyWorkouts}/7`,                                   lbl: "Active days", color: activeDayColor },
  ];

  return (
    <>
      {/* ── Section header ───────────────────────────────────── */}
      <View style={[styles.headerRow, { marginTop: vs(4) }]}>
        <Text style={styles.sectionTitle}>Body status</Text>

        <View style={styles.toggleTrack}>
          {(["front", "back"] as const).map((side) => (
            <TouchableOpacity
              key={side}
              onPress={() => setBodySide(side)}
              style={[styles.toggleBtn, bodySide === side && styles.toggleBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, bodySide === side && styles.toggleTxtActive]}>
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Card ─────────────────────────────────────────────── */}
      <View style={styles.card}>

        {/* BMI badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: fitnessColor }]} />
            <Text style={styles.badgeStatus}>{fitnessStatus}</Text>
            <View style={styles.bmiChip}>
              <Text style={styles.bmiChipText}>BMI {bmi.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Body model */}
        <View style={styles.bodyWrap}>
          <View style={{ transform: [{ scaleX: dynamicScaleX }, { scaleY: dynamicScaleY }] }}>
            <Body
              data={muscleActivity}
              gender={gender}
              side={bodySide}
              scale={1.15}
              colors={["#F7CB1644", "#F7CB16AA", "#F7CB16"]}
              defaultFill={"#1a3a45"}
              defaultStroke={"rgba(255,255,255,0.2)"}
              defaultStrokeWidth={0.5}
              onBodyPartPress={handleMusclePress}
            />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          {stats.map((s, i, arr) => (
            <React.Fragment key={s.lbl}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statSep} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.tapHint}>Tap a muscle to highlight it</Text>
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    color: C.ink,
    letterSpacing: -0.3,
  },

  // Toggle
  toggleTrack: {
    flexDirection: "row",
    backgroundColor: C.toggleBg,
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: vs(5),
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: C.sun,
  },
  toggleTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    color: C.lightText,
    letterSpacing: 0.4,
  },
  toggleTxtActive: {
    color: C.ink,
  },

  // Card
  card: {
    backgroundColor: C.cardBg,
    borderRadius: scale(24),
    padding: scale(18),
    marginBottom: vs(20),
  },

  // BMI badge
  badgeRow: {
    alignItems: "center",
    marginBottom: vs(6),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: C.iconBg,
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

  // Body model
  bodyWrap: {
    alignItems: "center",
    paddingVertical: vs(12),
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.lightBorder,
    marginVertical: vs(14),
  },

  // Stats
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
    color: C.lightText,
  },
  statSep: {
    width: 1,
    height: vs(28),
    backgroundColor: C.lightBorder,
  },

  tapHint: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: C.lightText,
    textAlign: "center",
    marginTop: vs(12),
    opacity: 0.75,
  },
});