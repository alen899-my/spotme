import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OptimizedImage from "../ui/OptimizedImage";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Recommendation {
  exercise_name: string;
  category?: string;
  category_image_url?: string;
  scoreTag?: string;
  rating?: number;
  target?: string;
  equipment?: string;
  equipment_image_url?: string;
  caloriesPerHour?: string;
  duration?: string;
  difficulty?: string;
  image_url?: string;
  gif_url?: string;
  exercise_id?: string;
  id?: string;
}

interface Props {
  rec: Recommendation | null;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onBrowsePress: () => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
  shoulders: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782647072217_acps4o.webp",
  chest: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646104558_hu52wq.webp",
  back: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646338615_nwd8k.webp",
  cardio: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646754180_jiiiwg.webp",
  "upper arms": "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782647150485_6103h.webp",
  "lower arms": "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646767087_3obv51.webp",
  "upper legs": "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782647257530_dacs28.webp",
  "lower legs": "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646829045_zk5ta2.webp",
  waist: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782647460609_xwtjk.webp",
  neck: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/categories/1782646919583_ynrt0m.webp",
};

const EQUIPMENT_IMAGES: Record<string, string> = {
  dumbbell: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782649675185_mmda6v.webp",
  barbell: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782649824280_z7s7jf.webp",
  "ez barbell": "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782649951943_u7sv0l.webp",
  cable: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650635992_yiubf.webp",
  band: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650275368_qgprw.webp",
  assisted: "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/equipment/1782650114591_qr4zrs.webp",
  "body weight": "",
};

const formatLabel = (value?: string | null) =>
  (value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyCard({
  onBrowsePress,
  isDark,
  colors,
}: {
  onBrowsePress: () => void;
  isDark: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
      ]}
      onPress={onBrowsePress}
      activeOpacity={0.82}
    >
      <View style={[styles.emptyLeftThumb, { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" }]}>
        <Ionicons name="barbell-outline" size={scale(34)} color={colors.primary} />
      </View>
      <View style={styles.emptyRightContent}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Explore Exercises</Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Discover tailored workouts for your goals
        </Text>
        <View style={[styles.browseBtnRow, { backgroundColor: isDark ? "rgba(37,150,190,0.15)" : "#E0F2FE" }]}>
          <Text style={[styles.browseBtnText, { color: colors.primary }]}>Browse Library</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Recommendation Card ──────────────────────────────────────────────────
function RecommendationCard({ rec, style, onPress, onBrowsePress }: Props) {
  const { colors, isDark } = useTheme();

  if (!rec) {
    return <EmptyCard onBrowsePress={onBrowsePress} isDark={isDark} colors={colors} />;
  }

  const displayUri = rec.gif_url || rec.image_url;
  const rawRating = rec.rating;
  const ratingText =
    typeof rawRating === "number" && rawRating > 0
      ? rawRating.toFixed(1)
      : null;

  const catKey = rec.category ? rec.category.trim().toLowerCase() : "";
  const equipKey = rec.equipment ? rec.equipment.trim().toLowerCase() : "";

  // Category image resolution: API property or fallback lookup (covers shoulders, chest, etc.)
  const categoryImg = rec.category_image_url || CATEGORY_IMAGES[catKey] || null;
  const equipImg = rec.equipment_image_url || EQUIPMENT_IMAGES[equipKey] || null;

  const targetLabel = rec.target ? formatLabel(rec.target) : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)",
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      {/* ── LEFT: Large Responsive GIF/Image Container ─────────────────────── */}
      <View
        style={[
          styles.imageWrap,
          {
            backgroundColor: isDark ? "#0A0E13" : "#F1F5F9",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          },
        ]}
      >
        {displayUri ? (
          <OptimizedImage
            uri={displayUri}
            style={styles.gifImage}
            contentFit="contain"
          />
        ) : (
          <View style={styles.fallbackWrap}>
            <Ionicons name="barbell-outline" size={scale(36)} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* ── RIGHT: Details Column matching Daily Workout Card Style ─────────── */}
      <View style={styles.infoCol}>
        {/* Top Meta: Category Pill with image & Equipment Pill */}
        <View style={styles.topMetaRow}>
          <View style={styles.catEquipWrap}>
            {rec.category ? (
              <View
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
                  },
                ]}
              >
                {categoryImg ? (
                  <OptimizedImage
                    uri={categoryImg}
                    style={styles.catPillThumb}
                  />
                ) : (
                  <Ionicons name="fitness-outline" size={12} color={isDark ? colors.primary : "#2596BE"} />
                )}
                <Text
                  style={[
                    styles.catPillText,
                    { color: isDark ? "#FFFFFF" : "#1E293B" },
                  ]}
                  numberOfLines={1}
                >
                  {rec.category.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {rec.equipment ? (
              <View
                style={[
                  styles.equipPill,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                  },
                ]}
              >
                {equipImg ? (
                  <OptimizedImage
                    uri={equipImg}
                    style={styles.equipPillThumb}
                  />
                ) : null}
                <Text
                  style={[
                    styles.equipPillText,
                    { color: isDark ? colors.textMuted : "#64748B" },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {rec.equipment}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Star Rating Badge */}
          {ratingText && (
            <View
              style={[
                styles.ratingPill,
                {
                  backgroundColor: isDark ? "rgba(247,203,22,0.14)" : "#FEF3C7",
                },
              ]}
            >
              <Ionicons name="star" size={scale(10)} color="#F59E0B" />
              <Text style={styles.ratingText}>{ratingText}</Text>
            </View>
          )}
        </View>

        {/* Exercise Title */}
        <Text
          style={[
            styles.exerciseName,
            { color: isDark ? colors.text : "#0F172A" },
          ]}
          numberOfLines={2}
        >
          {rec.exercise_name}
        </Text>

        {/* Target Badge & Action Row */}
        <View style={styles.bottomRow}>
          {targetLabel ? (
            <View
              style={[
                styles.targetChip,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Text
                style={[
                  styles.targetChipText,
                  { color: isDark ? "rgba(255,255,255,0.75)" : "#475569" },
                ]}
                numberOfLines={1}
              >
                {targetLabel}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: colors.primary }]}
            onPress={onPress}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-forward" size={scale(14)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: scale(22),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: scale(11),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  // ── LEFT: Large Responsive GIF Container ─────────────────────────────────────
  imageWrap: {
    width: scale(118),
    height: vs(128),
    borderRadius: scale(16),
    overflow: "hidden",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gifImage: {
    width: "100%",
    height: "100%",
  },
  fallbackWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── RIGHT: Details Column ───────────────────────────────────────────────────
  infoCol: {
    flex: 1,
    height: vs(128),
    paddingLeft: scale(12),
    justifyContent: "space-between",
  },

  topMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: scale(6),
  },
  catEquipWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    rowGap: 4,
    flex: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },

  // Matches daily workout log card catPill
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  catPillThumb: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  catPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9.5),
    letterSpacing: 0.5,
  },

  // Matches daily workout log card equipPill
  equipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    maxWidth: scale(100),
    flexShrink: 1,
  },
  equipPillThumb: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  equipPillText: {
    fontFamily: FONTS.body,
    fontSize: scale(9.5),
  },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(3),
    borderRadius: 8,
    paddingHorizontal: scale(6),
    paddingVertical: vs(3),
    flexShrink: 0,
  },
  ratingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: "#D97706",
  },

  exerciseName: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    letterSpacing: -0.2,
    lineHeight: scale(19),
    marginVertical: vs(2),
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: vs(2),
  },
  targetChip: {
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
    maxWidth: "80%",
  },
  targetChipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(10),
  },

  arrowBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Empty State ─────────────────────────────────────────────────────────────
  emptyLeftThumb: {
    width: scale(100),
    height: vs(110),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  emptyRightContent: {
    flex: 1,
    paddingLeft: scale(12),
    justifyContent: "center",
    gap: vs(6),
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(16),
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    lineHeight: scale(15),
  },
  browseBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: vs(5),
    borderRadius: scale(12),
    marginTop: vs(2),
  },
  browseBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
  },
});

export default memo(RecommendationCard);