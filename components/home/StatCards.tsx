import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

interface StatCardProps {
  icon: any;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  labelColor: string;
  value: string;
  label: string;
  darkIconBg: string;
  darkIconColor: string;
}

function StatCard({
  icon,
  cardBg,
  iconBg,
  iconColor,
  valueColor,
  labelColor,
  value,
  label,
  darkIconBg,
  darkIconColor,
}: StatCardProps) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: isDark ? colors.card : cardBg,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.border : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: isDark ? darkIconBg : iconBg },
        ]}
      >
        <Ionicons
          name={icon}
          size={scale(18)}
          color={isDark ? darkIconColor : iconColor}
        />
      </View>
      <Text style={[styles.statVal, { color: isDark ? colors.text : valueColor }]}>
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          { color: isDark ? colors.textMuted : labelColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export interface StatCardsProps {
  caloriesBurned: number;
  currentStreak: number;
  waterMl: number;
  caloriesConsumed: number;
}

// Card colour configs — all solid fills from your yellow/blue palette
const CARD_CONFIGS = [
  {
    cardBg:     "#F7CB16", // sun yellow
    iconBg:     "#E7B100", // sunDeep
    iconColor:  "#04282B", // ink
    valueColor: "#04282B",
    labelColor: "#5a4200",
    darkIconBg: "rgba(255, 69, 58, 0.18)",
    darkIconColor: "#FF453A",
  },
  {
    cardBg:     "#2596BE", // cta blue
    iconBg:     "#1a6e8a", // ctaDark
    iconColor:  "#D6EEF7", // ctaLight
    valueColor: "#FFFFFF",
    labelColor: "#a8dff0",
    darkIconBg: "rgba(255, 214, 10, 0.18)",
    darkIconColor: "#FFD60A",
  },
  {
    cardBg:     "#0d4d65", // ctaDeep
    iconBg:     "#04282B", // ink
    iconColor:  "#F7CB16", // sun (accent pop)
    valueColor: "#FFFFFF",
    labelColor: "#7ec6db",
    darkIconBg: "rgba(10, 132, 255, 0.18)",
    darkIconColor: "#0A84FF",
  },
  {
    cardBg:     "#E7B100", // sunDeep
    iconBg:     "#c99800", // slightly darker gold
    iconColor:  "#04282B",
    valueColor: "#04282B",
    labelColor: "#5a4200",
    darkIconBg: "rgba(48, 209, 88, 0.18)",
    darkIconColor: "#30D158",
  },
];

export function StatCards({
  caloriesBurned,
  currentStreak,
  waterMl,
  caloriesConsumed,
}: StatCardsProps) {
  const waterDisplay =
    waterMl >= 1000
      ? `${(waterMl / 1000).toFixed(1)}L`
      : `${waterMl || 0}ml`;

  const cards = [
    { icon: "flame",      value: String(caloriesBurned),   label: "kcal burned" },
    { icon: "flash",      value: String(currentStreak),    label: "day streak"  },
    { icon: "water",      value: waterDisplay,             label: "water"       },
    { icon: "restaurant", value: String(caloriesConsumed), label: "kcal eaten"  },
  ];

  return (
    <View style={styles.statsRow}>
      {cards.map((card, i) => (
        <StatCard
          key={card.label}
          icon={card.icon as any}
          value={card.value}
          label={card.label}
          {...CARD_CONFIGS[i]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: vs(24),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(16),
    padding: scale(10),
    alignItems: "center",
    gap: vs(5),
  },
  statIconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  statVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    textAlign: "center",
  },
});

export default StatCards;