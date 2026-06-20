import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs, getXPProgress, TIER_COLORS } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  tier: string;
  level: number;
  totalXP: number;
}

export default function XPCard({ tier, level, totalXP }: Props) {
  const { isDark, colors } = useTheme();
  const tierColors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const accent = tierColors[0];
  const { progress, nextTier, xpToNext } = getXPProgress(tier, totalXP);

  const animatedWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isDark
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <BlurView
        intensity={50}
        tint={isDark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
      />
      <LinearGradient
        colors={[`${accent}22`, `${accent}04`]}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "transparent"] as [string, string]}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.25, y: 0.5 }}
        pointerEvents="none"
      />

      <View style={styles.row1}>
        <View style={styles.tierGroup}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <View style={[styles.tierDot, { backgroundColor: accent }]} />
          <Text style={[styles.tierName, { color: accent }]}>{tier}</Text>
          <Text
            style={[
              styles.divider,
              { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" },
            ]}
          >
            ·
          </Text>
          <Text
            style={[
              styles.levelNum,
              { color: isDark ? colors.text : "#0F1923" },
            ]}
          >
            Lv.{level}
          </Text>
        </View>

        <View style={styles.xpGroup}>
          <Text
            style={[
              styles.xpText,
              { color: isDark ? colors.textMuted : "rgba(0,0,0,0.4)" },
            ]}
          >
            {totalXP.toLocaleString()} XP
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
          />
        </View>
      </View>

      <View style={styles.row2}>
        <View
          style={[
            styles.barBg,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <Animated.View
            style={[styles.barFill, { width: widthInterpolation }]}
          >
            <LinearGradient
              colors={tierColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text
          style={[
            styles.barLabel,
            { color: isDark ? colors.textMuted : "rgba(0,0,0,0.4)" },
          ]}
          numberOfLines={1}
        >
          {Math.round(progress * 100)}% · {xpToNext.toLocaleString()} XP to{" "}
          {nextTier}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(16),
    paddingVertical: vs(10),
    paddingHorizontal: scale(12),
    marginBottom: vs(16),
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardRadius: {
    borderRadius: scale(16),
  },
  row1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(6),
  },
  tierGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  trophyEmoji: {
    fontSize: scale(16),
    marginRight: scale(2),
  },
  tierDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  tierName: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  divider: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(16),
    marginHorizontal: scale(2),
  },
  levelNum: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    letterSpacing: -0.3,
  },
  xpGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(2),
  },
  xpText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  barBg: {
    flex: 1,
    height: vs(6),
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    flexShrink: 0,
  },
});
