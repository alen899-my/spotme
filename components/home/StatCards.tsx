import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

interface StatCardProps {
  icon: any;
  gradient: [string, string];
  gradientDark: [string, string];
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
  gradient,
  gradientDark,
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
        isDark && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <LinearGradient
        colors={isDark ? gradientDark : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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

// Card colour configs
const CARD_CONFIGS = [
  {
    gradient:     ["#F7CB16", "#E7B100"],
    gradientDark: ["#3a2e00", "#1a1500"],
    iconBg:     "#E7B100",
    iconColor:  "#04282B",
    valueColor: "#04282B",
    labelColor: "#5a4200",
    darkIconBg: "rgba(255, 69, 58, 0.18)",
    darkIconColor: "#FF453A",
  },
  {
    gradient:     ["#2596BE", "#1a6e8a"],
    gradientDark: ["#1a3a4a", "#0d2028"],
    iconBg:     "#1a6e8a",
    iconColor:  "#D6EEF7",
    valueColor: "#FFFFFF",
    labelColor: "#a8dff0",
    darkIconBg: "rgba(255, 214, 10, 0.18)",
    darkIconColor: "#FFD60A",
  },
  {
    gradient:     ["#0d4d65", "#0a3a4a"],
    gradientDark: ["#0a1a25", "#050f15"],
    iconBg:     "#04282B",
    iconColor:  "#F7CB16",
    valueColor: "#FFFFFF",
    labelColor: "#7ec6db",
    darkIconBg: "rgba(10, 132, 255, 0.18)",
    darkIconColor: "#0A84FF",
  },
  {
    gradient:     ["#E7B100", "#c99800"],
    gradientDark: ["#3a2e00", "#1a1500"],
    iconBg:     "#c99800",
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
    position: "relative",
    overflow: "hidden",
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