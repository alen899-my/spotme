import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  avgRating?: number;
  ratingCount?: number;
  userRating?: number | null;
  size?: "sm" | "md" | "lg";
}

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
  size = "md",
}: Props) {
  const { colors } = useTheme();

  const textSize = size === "sm" ? 10 : size === "lg" ? 13 : 12;
  const starSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  return (
    <View style={styles.displayRow}>
      <Ionicons name="star" size={starSize} color="#FFB800" />
      <Text style={[styles.avg, { fontSize: starSize + 2, color: colors.text }]}>
        {Number(avgRating) > 0 ? Number(avgRating).toFixed(1) : "—"}
      </Text>
      {ratingCount > 0 && (
        <Text style={[styles.count, { fontSize: textSize, color: colors.textMuted }]}>
          ({ratingCount})
        </Text>
      )}
      {userRating && userRating > 0 && (
        <View style={[styles.badge, { backgroundColor: getColor(userRating) + "20" }]}>
         
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  displayRow: {
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
});
