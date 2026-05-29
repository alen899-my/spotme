import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { P, scale, vs, TIER_COLORS, getXPProgress } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  tier: string;
  level: number;
  totalXP: number;
}

const DARK_TIER_COLORS: Record<string, [string, string]> = {
  Bronze:      ["#4A2B0E", "#2A1807"],
  Silver:      ["#2E2F33", "#1A1B1D"],
  Gold:        ["#4D3F00", "#292100"],
  Platinum:    ["#003C3C", "#002042"],
  Diamond:     ["#193740", "#002533"],
  Master:      ["#3C1B4A", "#1D0A26"],
  Grandmaster: ["#540922", "#2B020E"],
  Elite:       ["#541A08", "#2E0D03"],
  Champion:    ["#4A0000", "#240000"],
  Legend:      ["#543200", "#330000"],
};

export default function XPCard({ tier, level, totalXP }: Props) {
  const { isDark } = useTheme();
  const baseTierColors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const tierColors = isDark ? (DARK_TIER_COLORS[tier] || baseTierColors) : baseTierColors;
  const { progress, nextTier, xpToNext } = getXPProgress(tier, totalXP);

  return (
    <View style={[styles.xpCard, { backgroundColor: tierColors[0] }]}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tierColors[1], opacity: 0.45, borderRadius: scale(20) }]}
        pointerEvents="none"
      />
      <View style={styles.xpTop}>
        <View>
          <Text style={styles.xpTierLabel}>{tier}</Text>
          <Text style={styles.xpLevel}>Level {level}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Ionicons name="trophy" size={scale(14)} color={P.sun} />
          <Text style={styles.xpBadgeText}>{totalXP.toLocaleString()} XP</Text>
        </View>
      </View>
      <View style={styles.xpBarBg}>
        <View style={[styles.xpBarFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: vs(6) }}>
        <Text style={styles.xpSubText}>{xpToNext.toLocaleString()} XP to {nextTier}</Text>
        <Text style={styles.xpSubText}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  xpCard: {
    borderRadius: scale(20),
    padding: scale(18),
    marginBottom: vs(20),
    overflow: "hidden",
  },
  xpTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: vs(14),
  },
  xpTierLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  xpLevel: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    color: P.white,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: vs(6),
  },
  xpBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
    color: P.sun,
  },
  xpBarBg: {
    height: vs(8),
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: P.white,
  },
  xpSubText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.7)",
  },
});