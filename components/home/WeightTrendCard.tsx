import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import WeightSparkline from "./WeightSparkline";

interface WeightEntry {
  weight: string;
}

interface Props {
  weightProgress: WeightEntry[];
}

export default function WeightTrendCard({ weightProgress }: Props) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: isDark ? colors.card : P.white, borderColor: isDark ? colors.border : P.border }]}>
      <View style={[styles.sectionHeaderRow, { marginBottom: vs(12) }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: scale(6) }}>
          <View style={[styles.cardIconWrap, { backgroundColor: isDark ? 'rgba(231,177,0,0.15)' : P.sunLight }]}>
            <Ionicons name="scale-outline" size={scale(16)} color={P.sunDeep} />
          </View>
          <Text style={[styles.sectionTitle, { marginBottom: 0, color: colors.text }]}>Weight Trend</Text>
        </View>
      </View>
      <WeightSparkline data={weightProgress} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(20),
    borderWidth: 1,
    padding: scale(16),
    marginBottom: vs(16),
  },
  cardIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    letterSpacing: -0.3,
  },
});