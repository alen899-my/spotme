import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../../constants/theme";
import { P, scale, vs, getXPProgress, TIER_COLORS } from "../../constants/homeTheme";

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
  const barColors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const { progress, nextTier, xpToNext } = getXPProgress(tier, totalXP);

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.xpCard}>
      <View style={styles.xpTop}>
        <View style={styles.tierRow}>
          <View style={[styles.tierDot, { backgroundColor: barColors[0] }]} />
          <View>
            <Text style={styles.xpTierLabel}>{tier}</Text>
            <Text style={styles.xpLevel}>Level {level}</Text>
          </View>
        </View>
        <View style={styles.xpBadge}>
          <Ionicons name="trophy" size={scale(12)} color={P.sun} />
          <Text style={styles.xpBadgeText}>{totalXP.toLocaleString()} XP</Text>
        </View>
      </View>
      <View style={styles.xpBarBg}>
        <Animated.View style={[styles.xpBarFill, { width: widthInterpolation }]}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glow} />
        </Animated.View>
      </View>
      <View style={styles.xpBottom}>
        <Text style={styles.xpSubText}>{xpToNext.toLocaleString()} XP to {nextTier}</Text>
        <Text style={styles.xpSubText}>{Math.round(progress * 100)}%</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  xpCard: {
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: vs(16),
    overflow: "hidden",
  },
  xpTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(8),
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  tierDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  xpTierLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  xpLevel: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    color: P.white,
    marginTop: -2,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  xpBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    color: P.sun,
  },
  xpBarBg: {
    height: vs(16),
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  glow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  xpBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(4),
  },
  xpSubText: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.7)",
  },
});