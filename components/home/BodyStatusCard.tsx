import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import Body, { Slug } from "react-native-body-highlighter";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs, getBMIStatus } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

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

const HEAT_ALPHA: Record<number, string> = {
  1: '0A', 2: '16', 3: '24', 4: '35', 5: '4A',
  6: '63', 7: '80', 8: 'A0', 9: 'C4', 10: 'E6',
};

const SLUG_LABELS: Record<string, string> = {
  chest:       'Chest',
  'upper-back':'Upper Back',
  'lower-back':'Lower Back',
  deltoids:    'Shoulders',
  biceps:      'Biceps',
  triceps:     'Triceps',
  forearm:     'Forearms',
  abs:         'Abs',
  obliques:    'Obliques',
  gluteal:     'Glutes',
  quadriceps:  'Quads',
  hamstring:   'Hamstrings',
  calves:      'Calves',
  trapezius:   'Traps',
  neck:        'Neck',
  adductors:   'Adductors',
  tibialis:    'Tibialis',
  knees:       'Knees',
  ankles:      'Ankles',
  feet:        'Feet',
  hands:       'Hands',
};

interface Props {
  gender: "male" | "female";
  weightKg: number;
  heightCm: number;
  bodyFat?: string;
  weeklyWorkouts: number;
  dbMuscleActivity: Array<{ slug: Slug; intensity: number }>;
}

export default function BodyStatusCard({
  gender,
  weightKg,
  heightCm,
  bodyFat,
  weeklyWorkouts,
  dbMuscleActivity,
}: Props) {
  const { colors, isDark } = useTheme();
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const [showInfo, setShowInfo] = useState(false);

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const { fitnessStatus, fitnessColor } = getBMIStatus(bmi);

  const dynamicScaleX =
    bmi < 17 ? 0.78 : bmi < 18.5 ? 0.88 : bmi < 25 ? 1.0
    : bmi < 30 ? 1.18 : bmi < 35 ? 1.32 : 1.45;
  const dynamicScaleY = Math.max(0.88, Math.min(1.0 + (heightCm - 175) * 0.003, 1.15));

  const activityScore  = Math.min(weeklyWorkouts / 7, 1);
  const activeDayColor = activityScore >= 0.7 ? C.sun : activityScore >= 0.4 ? C.sunDeep : C.lightText;

  const stats = [
    { val: `${weightKg}kg`,                                        lbl: "Weight",      color: C.white },
    { val: `${Math.round(heightCm)}cm`,                            lbl: "Height",      color: C.white },
    { val: bodyFat ? `${parseFloat(bodyFat).toFixed(1)}%` : "--",  lbl: "Body fat",    color: C.white },
    { val: `${weeklyWorkouts}/7`,                                   lbl: "Active days", color: activeDayColor },
  ];

  return (
    <>
      <View style={[styles.headerRow, { marginTop: vs(4) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Body status</Text>
          <TouchableOpacity onPress={() => setShowInfo(true)} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.toggleTrack, { backgroundColor: isDark ? '#1A1A1A' : C.toggleBg }]}>
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

        <View style={styles.bodyWrap}>
          <View style={{ transform: [{ scaleX: dynamicScaleX }, { scaleY: dynamicScaleY }] }}>
            <Body
              data={dbMuscleActivity}
              gender={gender}
              side={bodySide}
              scale={1.15}
              colors={["#FF4B4B0A", "#FF4B4B16", "#FF4B4B24", "#FF4B4B35", "#FF4B4B4A", "#FF4B4B63", "#FF4B4B80", "#FF4B4BA0", "#FF4B4BC4", "#FF4B4BE6"]}
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
                Colors show how often each muscle group has been worked in the last 7 days.
                Brighter = more volume.
              </Text>

              <View style={[styles.intensityRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <View key={level} style={{ alignItems: 'center', gap: 4 }}>
                    <View style={[styles.intensityDot, { backgroundColor: `#FF4B4B${HEAT_ALPHA[level]}` }]} />
                    <Text style={[styles.intensityLabel, { color: colors.textMuted }]}>{level}</Text>
                  </View>
                ))}
                <View style={{ flex: 1 }} />
                <Text style={[styles.intensityHint, { color: colors.textMuted }]}>Low → High</Text>
              </View>

              {Object.entries(SLUG_LABELS).map(([slug, label]) => (
                <View key={slug} style={[styles.legendRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.legendSwatch, { backgroundColor: `#FF4B4B${HEAT_ALPHA[5]}` }]} />
                  <Text style={[styles.legendLabel, { color: colors.text }]}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    letterSpacing: -0.3,
  },

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
  toggleTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    color: C.lightText,
    letterSpacing: 0.4,
  },

  card: {
    backgroundColor: C.cardBg,
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

  bodyWrap: {
    alignItems: "center",
    paddingVertical: vs(12),
  },

  divider: {
    height: 1,
    backgroundColor: C.lightBorder,
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
    color: C.lightText,
  },
  statSep: {
    width: 1,
    height: vs(28),
    backgroundColor: C.lightBorder,
  },

  // ── Info Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
    gap: 10,
  },
  intensityDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  intensityLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  intensityHint: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
