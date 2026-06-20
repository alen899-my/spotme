import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  onPress?: () => void;
  onBrowsePress: () => void;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyCard({
  onBrowsePress,
  isDark,
}: {
  onBrowsePress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? "#141414" : "#1a1a2e" }]}
      onPress={onBrowsePress}
      activeOpacity={0.85}
    >
      <View style={styles.emptyInner}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="barbell-outline" size={scale(32)} color="#F7CB16" />
        </View>
        <Text style={styles.emptyTitle}>No recommendation yet</Text>
        <Text style={styles.emptySub}>Tap to browse exercises</Text>
        <View style={styles.arrowBtn}>
          <Ionicons name="arrow-forward" size={scale(18)} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function RecommendationCard({ rec, onPress, onBrowsePress }: Props) {
  const { isDark } = useTheme();

  if (!rec) {
    return <EmptyCard onBrowsePress={onBrowsePress} isDark={isDark} />;
  }

  const displayUri = rec.gif_url || rec.image_url;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* ── Dark base ── */}
      <View style={[StyleSheet.absoluteFill, styles.cardBg]} />

      {/* ── 3D stacked GIF — top-right corner ── */}
      {displayUri ? (
        <View style={styles.gifStack}>
          <Image
            source={{ uri: displayUri }}
            style={styles.gifImage}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[styles.gifStack, styles.gifEmpty]}>
          <MaterialCommunityIcons
            name="dumbbell"
            size={scale(28)}
            color="rgba(255,255,255,0.2)"
          />
        </View>
      )}

      {/* ── Content — bottom-left ── */}
      <View style={styles.content}>
        <View style={{ flex: 1 }} />

        <Text style={styles.category} numberOfLines={1}>
          {rec.category?.toUpperCase()}
        </Text>

        <Text style={styles.name} numberOfLines={2}>
          {rec.exercise_name?.toUpperCase()}
        </Text>

        {rec.rating ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={scale(11)} color="#F7CB16" />
            <Text style={styles.ratingText}>{rec.rating}/10</Text>
          </View>
        ) : null}

        <View style={styles.tagsRow}>
          {rec.target ? (
            <Text style={styles.targetText}>{rec.target}</Text>
          ) : null}
          {rec.difficulty ? (
            <View style={[styles.tag, styles.tagBlue]}>
              <Text style={[styles.tagText, styles.tagTextBlue]}>
                {rec.difficulty}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Arrow CTA button (bottom-right) ── */}
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-forward" size={scale(18)} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: scale(20),
    overflow: "hidden",
    height: vs(160),
    position: "relative",
  },

  cardBg: {
    backgroundColor: "#161616",
    borderRadius: scale(20),
  },

  // ── 3D stacked GIF (polaroid-style, top-right) ──
  gifStack: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    width: scale(88),
    height: scale(88),
    borderRadius: scale(6),
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: scale(4),
    transform: [{ rotate: "4deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 5,
  },
  gifImage: {
    flex: 1,
    borderRadius: scale(3),
  },
  gifEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // ── Rating row (no badge) ──
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginBottom: vs(1),
  },
  ratingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: "#F7CB16",
  },

  // ── Text content — bottom-left  ──
  content: {
    position: "absolute",
    left: scale(18),
    right: scale(120),
    top: vs(14),
    bottom: vs(14),
  },

  category: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    color: "rgba(200,200,200,0.55)",
    letterSpacing: 1.2,
    marginBottom: vs(1),
  },

  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(17),
    color: "#FFFFFF",
    letterSpacing: -0.3,
    lineHeight: scale(21),
    marginBottom: vs(2),
  },

  tagsRow: {
    flexDirection: "row",
    gap: scale(6),
    marginTop: vs(2),
  },
  tag: {
    backgroundColor: "rgba(247,203,22,0.15)",
    borderWidth: 1,
    borderColor: "rgba(247,203,22,0.3)",
    borderRadius: 99,
    paddingHorizontal: scale(9),
    paddingVertical: vs(3),
  },
  targetText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  tagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    color: "#F7CB16",
    letterSpacing: 0.3,
  },
  tagBlue: {
    backgroundColor: "rgba(37,150,190,0.15)",
    borderColor: "rgba(37,150,190,0.3)",
  },
  tagTextBlue: {
    color: "#2596BE",
  },

  // ── Arrow button — bottom-right ──
  arrowBtn: {
    position: "absolute",
    bottom: scale(6),
    right: scale(14),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: "#2596BE",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Empty state ──
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(8),
    padding: scale(24),
  },
  emptyIconWrap: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(18),
    backgroundColor: "rgba(247,203,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(247,203,22,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(4),
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(16),
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
});