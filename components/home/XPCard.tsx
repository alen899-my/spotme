import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../../constants/theme";
import { P, scale, vs, getXPProgress } from "../../constants/homeTheme";

interface Props {
  tier: string;
  level: number;
  totalXP: number;
}

const CARD_GRADIENTS: Record<string, [string, string]> = {
  Bronze:      ["#543620", "#201108"],
  Silver:      ["#3E4C5E", "#16202C"],
  Gold:        ["#856006", "#2E1E00"],
  Platinum:    ["#086F83", "#02242D"],
  Diamond:     ["#0D6191", "#031E33"],
  Master:      ["#6D28D9", "#2E0665"],
  Grandmaster: ["#B91C1C", "#450616"],
  Elite:       ["#C2410C", "#431407"],
  Champion:    ["#991B1B", "#380202"],
  Legend:      ["#D97706", "#4C0519"],
};

export default function XPCard({ tier, level, totalXP }: Props) {
  const gradient = CARD_GRADIENTS[tier] || CARD_GRADIENTS.Bronze;
  const { progress, nextTier, xpToNext } = getXPProgress(tier, totalXP);

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.xpCard}>
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
    </LinearGradient>
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