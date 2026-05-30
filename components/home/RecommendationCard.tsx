import React from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ── Palette (mirrors homeTheme P, kept local for portability) ────────────────
const C = {
  cardBg:      "#2596BE",
  cardDeep:    "#0d4d65",
  iconBg:      "#1a6e8a",
  tagBg:       "#1a6e8a",
  sun:         "#F7CB16",
  sunDeep:     "#E7B100",
  ink:         "#04282B",
  white:       "#FFFFFF",
  lightText:   "#a8dff0",
  lightBorder: "rgba(255,255,255,0.12)",
  // empty state
  emptyBg:     "#F7CB16",
  emptyIconBg: "#E7B100",
  emptyInk:    "#04282B",
  emptyMuted:  "#5a4200",
};

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
}

interface Props {
  rec: Recommendation | null;
  onBrowsePress: () => void;
}

// ── Stars helper ─────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const { colors, isDark } = useTheme();
  const full    = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <View style={sr.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={
            i < full
              ? "star"
              : i === full && hasHalf
              ? "star-half"
              : "star-outline"
          }
          size={scale(11)}
          color={isDark ? colors.primary : C.sun}
        />
      ))}
      <Text style={[sr.label, { color: isDark ? colors.textMuted : C.ink }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: scale(2) },
  label: { fontFamily: FONTS.bodyBold, fontSize: scale(11), marginLeft: scale(4) },
});

// ── Main component ────────────────────────────────────────────────────────────
export default function RecommendationCard({ rec, onBrowsePress }: Props) {
  const { colors, isDark } = useTheme();

  if (!rec) {
    return (
      <TouchableOpacity
        style={[
          styles.emptyCard, 
          isDark ? { borderColor: colors.border, borderWidth: 1 } : { backgroundColor: C.emptyBg }
        ]}
        onPress={onBrowsePress}
        activeOpacity={0.88}
      >
        {isDark && (
          <LinearGradient
            colors={["#1a3a4a", "#0d2028"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? colors.inputBg : C.emptyIconBg }]}>
          <Ionicons name="fitness-outline" size={scale(28)} color={isDark ? colors.primary : C.emptyInk} />
        </View>
        <Text style={[styles.emptyTitle, { color: isDark ? colors.text : C.emptyInk }]}>Browse exercises</Text>
        <Text style={[styles.emptySub, { color: isDark ? colors.textMuted : C.emptyMuted }]}>Find exercises to build your routine</Text>
        <View style={[styles.emptyBtn, { backgroundColor: isDark ? colors.primary : C.ink }]}>
          <Ionicons name="search-outline" size={scale(14)} color={isDark ? "#FFF" : C.sun} />
          <Text style={[styles.emptyBtnText, { color: isDark ? "#FFF" : C.white }]}>Explore library</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const rating = rec.rating ?? 4.8;

  const gradientLight: [string, string] = ["#2596BE", "#1a6e8a"];
  const gradientDark: [string, string]  = ["#1a3a4a", "#0d2028"];

  return (
    <View style={[
      styles.card, 
      isDark && { borderColor: colors.border, borderWidth: 1 }
    ]}>
      <LinearGradient
        colors={isDark ? gradientDark : gradientLight}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top pill row ─────────────────────────────────────────── */}
      <View style={styles.pillRow}>
        <View style={[styles.scorePill, { backgroundColor: isDark ? colors.inputBg : C.iconBg, borderColor: isDark ? colors.border : "transparent", borderWidth: isDark ? 1 : 0 }]}>
          <Ionicons name="sparkles" size={scale(11)} color={isDark ? colors.primary : C.sun} />
          <Text style={[styles.scorePillText, { color: isDark ? colors.text : "#D6EEF7" }]}>{rec.scoreTag || "Top pick"}</Text>
        </View>
        <View style={[styles.ratingPill, { backgroundColor: isDark ? colors.inputBg : C.sun, borderColor: isDark ? colors.border : "transparent", borderWidth: isDark ? 1 : 0 }]}>
          <Ionicons name="star" size={scale(11)} color={isDark ? colors.primary : C.ink} />
          <Text style={[styles.ratingPillText, { color: isDark ? colors.text : C.ink }]}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* ── Body row ─────────────────────────────────────────────── */}
      <View style={styles.body}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: isDark ? colors.text : C.white }]} numberOfLines={2}>{rec.exercise_name}</Text>
          <Text style={[styles.category, { color: isDark ? colors.textMuted : C.lightText }]}>{rec.category}</Text>

          {/* Star rating */}
          <StarRating rating={rating} />

          {/* Tags */}
          <View style={styles.tags}>
            {rec.target && (
              <View style={[styles.tag, { backgroundColor: isDark ? colors.inputBg : C.tagBg, borderColor: isDark ? colors.border : "transparent", borderWidth: isDark ? 1 : 0 }]}>
                <Text style={[styles.tagText, { color: isDark ? colors.primary : "#D6EEF7" }]}>{rec.target}</Text>
              </View>
            )}
            {rec.equipment && rec.equipment !== "body weight" && (
              <View style={[styles.tag, { backgroundColor: isDark ? colors.inputBg : C.tagBg, borderColor: isDark ? colors.border : "transparent", borderWidth: isDark ? 1 : 0 }]}>
                <Text style={[styles.tagText, { color: isDark ? colors.primary : "#D6EEF7" }]}>{rec.equipment}</Text>
              </View>
            )}
          </View>
        </View>

        {rec.image_url ? (
          <Image source={{ uri: rec.image_url }} style={[styles.thumb, isDark && { borderColor: colors.border, borderWidth: 1 }]} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: isDark ? colors.inputBg : C.iconBg }]}>
            <MaterialCommunityIcons name="dumbbell" size={scale(30)} color={isDark ? colors.primary : C.sun} />
          </View>
        )}
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Filled card
  card: {
    borderRadius: scale(20),
    padding: scale(18),
    position: "relative",
    overflow: "hidden",
    backgroundColor: C.cardBg,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(10),
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    backgroundColor: C.iconBg,
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  scorePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: "#D6EEF7",
    letterSpacing: 0.5,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: C.sun,
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    marginLeft: "auto",
  },
  ratingPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: C.ink,
  },
  body: {
    flexDirection: "row",
    gap: scale(12),
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    color: C.white,
    letterSpacing: -0.4,
    lineHeight: scale(24),
    marginBottom: vs(2),
  },
  category: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: C.lightText,
    marginBottom: vs(8),
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(6),
    marginTop: vs(10),
  },
  tag: {
    backgroundColor: C.tagBg,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  tagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: "#D6EEF7",
    letterSpacing: 0.3,
  },
  thumb: {
    width: scale(82),
    height: scale(82),
    borderRadius: scale(14),
    resizeMode: "cover",
    flexShrink: 0,
  },
  thumbPlaceholder: {
    backgroundColor: C.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: C.lightBorder,
    marginVertical: vs(14),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },
  metaText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: C.lightText,
  },

  // Empty state card
  emptyCard: {
    borderRadius: scale(20),
    padding: scale(28),
    marginBottom: vs(20),
    alignItems: "center",
    gap: vs(8),
    position: "relative",
    overflow: "hidden",
  },
  emptyIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(18),
    backgroundColor: C.emptyIconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(17),
    color: C.emptyInk,
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: C.emptyMuted,
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: C.ink,
    borderRadius: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: vs(10),
    marginTop: vs(4),
  },
  emptyBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
    color: C.white,
  },
});