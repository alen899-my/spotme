import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  avgRating?: number;
  ratingCount?: number;
  userRating?: number | null;
  canRate?: boolean;
  onRate?: (rating: number) => Promise<void>;
  size?: "sm" | "md" | "lg";
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PADDING = 20;
const GRID_GAP = 7;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GRID_GAP * 4) / 5;

const RATING_ICONS: string[] = [
  "sad-outline",
  "thumbs-down-outline",
  "remove-outline",
  "ellipse-outline",
  "checkmark-outline",
  "happy-outline",
  "barbell-outline",
  "flash-outline",
  "flame-outline",
  "trophy-outline",
];

const LABELS = [
  "Terrible",
  "Very Bad",
  "Okayish",
  "Decent",
  "Good",
  "Very Good",
  "Strong Lift",
  "Amazing",
  "Beast Mode",
  "Legendary!",
];

const getColor = (num: number) => {
  if (num <= 3) return "#EF4444";
  if (num <= 5) return "#F59E0B";
  if (num <= 7) return "#3B82F6";
  return "#10B981";
};

export default function SplitRating({
  avgRating = 0,
  ratingCount = 0,
  userRating,
  canRate = false,
  onRate,
  size = "md",
}: Props) {
  const { colors, isDark } = useTheme();
  const [localRating, setLocalRating] = useState<number | null>(userRating ?? null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const textSize = size === "sm" ? 10 : size === "lg" ? 13 : 12;
  const starSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const accentColor = localRating ? getColor(localRating) : "#F59E0B";

  const handleRate = useCallback(
    async (num: number) => {
      if (!canRate || !onRate || saving || num === localRating) return;
      setLocalRating(num);
      setSaving(true);
      try {
        await onRate(num);
      } catch {
        setLocalRating(userRating ?? null);
      } finally {
        setSaving(false);
      }
    },
    [canRate, onRate, saving, localRating, userRating]
  );

  return (
    <View style={styles.wrap}>
      {/* ── Display row ── */}
      <View style={styles.row}>
        <Ionicons name="star" size={starSize} color="#FFB800" />
        <Text
          style={[styles.avg, { fontSize: starSize + 2, color: colors.text }]}
        >
          {Number(avgRating) > 0 ? Number(avgRating).toFixed(1) : "—"}
        </Text>
        {ratingCount > 0 && (
          <Text
            style={[
              styles.count,
              { fontSize: textSize, color: colors.textMuted },
            ]}
          >
            ({ratingCount})
          </Text>
        )}
        {userRating && userRating > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: getColor(userRating) + "20" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: getColor(userRating),
                  fontSize: textSize - 1,
                },
              ]}
            >
              Your: {userRating}/10
            </Text>
          </View>
        )}
      </View>

      {/* ── Interactive rating grid ── */}
      {canRate && (
        <View
          style={[
            styles.banner,
            { borderColor: isDark ? colors.border : accentColor + "60" },
          ]}
        >
          {/* Header */}
          <TouchableOpacity
            style={[
              styles.header,
              {
                backgroundColor: isDark
                  ? colors.inputBg
                  : accentColor + "10",
              },
            ]}
            onPress={() => setOpen((v) => !v)}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={15} color={accentColor} />
            <Text style={[styles.headerTitle, { color: accentColor }]}>
              rating
            </Text>
            {localRating ? (
              <View
                style={[
                  styles.headerBadge,
                  { backgroundColor: accentColor },
                ]}
              >
                <Text
                  style={[
                    styles.headerBadgeText,
                    { color: isDark ? "#000" : "#FFF" },
                  ]}
                >
                  {localRating}/10
                </Text>
              </View>
            ) : null}
            {saving ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={15}
                color={isDark ? colors.textMuted : accentColor}
              />
            )}
          </TouchableOpacity>

          {/* Grid */}
          {open && (
            <View
              style={[
                styles.grid,
                {
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.3)"
                    : "rgba(0,0,0,0.25)",
                },
              ]}
            >
              <View style={styles.gridInner}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const selected = localRating === num;
                  const cardColor = getColor(num);
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.card,
                        selected
                          ? {
                              backgroundColor: cardColor,
                              borderColor: cardColor,
                            }
                          : {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.08)",
                              borderColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(255,255,255,0.12)",
                            },
                      ]}
                      onPress={() => handleRate(num)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={RATING_ICONS[num - 1] as any}
                        size={16}
                        color={
                          selected
                            ? "#1A1A1A"
                            : isDark
                            ? colors.primary
                            : "#FFF"
                        }
                      />
                      <Text
                        style={[
                          styles.cardNum,
                          {
                            color: selected
                              ? "#1A1A1A"
                              : isDark
                              ? colors.text
                              : "#FFF",
                          },
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {localRating ? (
                <Text
                  style={[
                    styles.label,
                    { color: isDark ? accentColor : "#FFF" },
                  ]}
                >
                  {LABELS[localRating - 1]}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.hint,
                    {
                      color: isDark
                        ? colors.textMuted
                        : "rgba(255,255,255,0.5)",
                    },
                  ]}
                >
                  Tap a rating above
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  avg: {
    fontFamily: FONTS.bodyBold,
  },
  count: {
    fontFamily: FONTS.body,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
  },
  banner: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  headerBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
  grid: {
    padding: 12,
  },
  gridInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "center",
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  cardNum: {
    fontFamily: FONTS.heading,
    fontSize: 13,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: FONTS.body,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
