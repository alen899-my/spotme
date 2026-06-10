import React from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  // Card (light)
  cardBg:        "#0d3d52",
  cardBorder:    "rgba(37,150,190,0.3)",
  accentBlue:    "#2596BE",
  accentYellow:  "#F7CB16",
  accentDeep:    "#E7B100",
  white:         "#FFFFFF",
  lightText:     "rgba(168,223,240,0.7)",
  tagBg:         "rgba(37,150,190,0.18)",
  tagBorder:     "rgba(37,150,190,0.32)",
  tagText:       "#a8dff0",
  pillYellowBg:  "rgba(247,203,22,0.16)",
  pillYellowBr:  "rgba(247,203,22,0.28)",
  pillBlueBg:    "rgba(37,150,190,0.2)",
  pillBlueBr:    "rgba(37,150,190,0.35)",
  pillPurpleBg:  "rgba(147,51,234,0.18)",
  pillPurpleBr:  "rgba(147,51,234,0.32)",
  tagPurpleText: "#c084fc",
  thumbBg:       "rgba(26,110,138,0.55)",
  ink:           "#04282B",
  // Empty (light)
  emptyBg:       "#F7CB16",
  emptyIconBg:   "#E7B100",
  emptyInk:      "#04282B",
  emptyMuted:    "#5a4200",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────
interface Recommendation {
  exercise_name: string;
  category: string;
  scoreTag?: string;
  rating?: number;
  target?: string;
  equipment?: string;
  caloriesPerHour?: string;
  duration?: string;
  difficulty?: string;
  image_url?: string;
  gif_url?: string;
}

interface Props {
  rec: Recommendation | null;
  onBrowsePress: () => void;
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyCard({ onBrowsePress, isDark, colors }: {
  onBrowsePress: () => void;
  isDark: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.emptyCard,
        isDark
          ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
          : { backgroundColor: C.emptyBg },
      ]}
      onPress={onBrowsePress}
      activeOpacity={0.88}
    >
      {/* Decorative circle */}
      <View
        style={[
          styles.emptyDecorCircle,
          { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(4,40,43,0.06)" },
        ]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: isDark ? colors.inputBg : C.emptyIconBg },
        ]}
      >
        <Ionicons
          name="barbell-outline"
          size={scale(28)}
          color={isDark ? colors.primary : C.emptyInk}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: isDark ? colors.text : C.emptyInk }]}>
        Browse exercises
      </Text>
      <Text style={[styles.emptySub, { color: isDark ? colors.textMuted : C.emptyMuted }]}>
        Find exercises to build your routine
      </Text>

      <View
        style={[
          styles.emptyBtn,
          { backgroundColor: isDark ? colors.primary : C.ink },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={scale(14)}
          color={isDark ? "#FFF" : C.accentYellow}
        />
        <Text style={[styles.emptyBtnText, { color: isDark ? "#FFF" : C.accentYellow }]}>
          Explore library
        </Text>
      </View>
    </TouchableOpacity>
  );
}



// ── Tag pill ──────────────────────────────────────────────────────────────────
function Tag({ label, isDark, colors, variant }: { label: string; isDark: boolean; colors: any; variant?: 'target' | 'equipment' }) {
  const isTarget = variant === 'target';
  return (
    <View
      style={[
        styles.tag,
        isDark
          ? { backgroundColor: colors.inputBg, borderColor: colors.border }
          : {
              backgroundColor: isTarget ? C.pillYellowBg : C.pillPurpleBg,
              borderColor: isTarget ? C.pillYellowBr : C.pillPurpleBr,
            },
      ]}
    >
      <Text style={[styles.tagText, { color: isDark ? colors.primary : (isTarget ? C.accentYellow : C.tagPurpleText) }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecommendationCard({ rec, onBrowsePress }: Props) {
  const { colors, isDark } = useTheme();

  if (!rec) {
    return <EmptyCard onBrowsePress={onBrowsePress} isDark={isDark} colors={colors} />;
  }

  const rating     = rec.rating ?? 4.8;

  // Collect non-trivial tags
  const tags: string[] = [];
  if (rec.target)    tags.push(rec.target);
  if (rec.equipment && rec.equipment !== "body weight") tags.push(rec.equipment);

  const displayUri = rec.gif_url || rec.image_url;

  return (
    <View
      style={[
        styles.card,
        isDark
          ? { backgroundColor: colors.card, borderColor: colors.border }
          : { backgroundColor: C.cardBg, borderColor: C.cardBorder },
      ]}
    >
      {/* Gradient overlay (light mode only) */}
      {!isDark && (
        <LinearGradient
          colors={["#1a5570", "#0d3d52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.inner}>
        {/* ── Pill row ───────────────────────────────────────────── */}
        <View style={styles.pillRow}>
          {/* Score tag */}
          <View
            style={[
              styles.scorePill,
              isDark
                ? { backgroundColor: colors.inputBg, borderColor: colors.border }
                : { backgroundColor: C.pillBlueBg, borderColor: C.pillBlueBr },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={scale(11)}
              color={isDark ? colors.primary : C.accentYellow}
            />
            <Text style={[styles.scorePillText, { color: isDark ? colors.primary : C.accentYellow }]}>
              {rec.scoreTag || "Top pick"}
            </Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Rating */}
          <View
            style={[
              styles.ratingPill,
              isDark
                ? { backgroundColor: colors.inputBg, borderColor: colors.border }
                : { backgroundColor: C.pillYellowBg, borderColor: C.pillYellowBr },
            ]}
          >
            <Ionicons
              name="star"
              size={scale(11)}
              color={C.accentYellow}
            />
            <Text style={[styles.ratingPillText, { color: C.accentYellow }]}>
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* ── Body ───────────────────────────────────────────────── */}
        <View style={styles.body}>
          {/* Text column */}
          <View style={styles.bodyText}>
            <Text
              style={[styles.name, { color: isDark ? colors.text : C.white }]}
              numberOfLines={2}
            >
              {rec.exercise_name}
            </Text>
            <Text style={[styles.category, { color: isDark ? colors.textMuted : C.lightText }]} numberOfLines={1}>
              {rec.category}
            </Text>

            {tags.length > 0 && (
              <View style={styles.tags}>
                {tags.map((t) => (
                  <Tag key={t} label={t} isDark={isDark} colors={colors} variant={t === rec.target ? 'target' : 'equipment'} />
                ))}
              </View>
            )}
          </View>

          {/* Thumbnail */}
          <View style={[styles.thumbWrap, isDark && { borderColor: colors.border }]}>
            {displayUri ? (
              <Image source={{ uri: displayUri }} style={styles.thumb} />
            ) : (
              <View
                style={[
                  styles.thumb,
                  styles.thumbPlaceholder,
                  { backgroundColor: isDark ? colors.inputBg : C.thumbBg },
                ]}
              >
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={scale(30)}
                  color={isDark ? colors.primary : C.accentYellow}
                />
              </View>
            )}
          </View>
        </View>

      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Card shell ──
  card: {
    borderRadius: scale(24),
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    height: scale(184),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 7,
  },
  inner: {
    padding: scale(16),
    flex: 1,
  },

  // ── Pill row ──
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(10),
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
  },
  scorePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    letterSpacing: 0.4,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(3),
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
  },
  ratingPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
  },

  // ── Body ──
  body: {
    flexDirection: "row",
    gap: scale(14),
    alignItems: "flex-start",
    flex: 1,
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    letterSpacing: -0.5,
    lineHeight: scale(26),
    marginBottom: vs(3),
  },
  category: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    marginBottom: vs(10),
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(6),
  },
  tag: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  tagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    letterSpacing: 0.3,
  },

  // ── Thumbnail ──
  thumbWrap: {
    width: scale(92),
    flexShrink: 0,
    position: "relative",
  },
  thumb: {
    width: scale(92),
    height: scale(92),
    borderRadius: scale(16),
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },


  // ── Empty state ──
  emptyCard: {
    borderRadius: scale(24),
    padding: scale(28),
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  emptyDecorCircle: {
    position: "absolute",
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    top: -scale(40),
    right: -scale(40),
  },
  emptyIconWrap: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(14),
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(17),
    marginBottom: vs(6),
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    textAlign: "center",
    lineHeight: scale(18),
    maxWidth: scale(200),
    marginBottom: vs(18),
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    borderRadius: scale(14),
    paddingHorizontal: scale(22),
    paddingVertical: vs(11),
  },
  emptyBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
  },
});