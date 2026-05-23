import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import WeightSparkline from "./WeightSparkline";

interface WeightEntry {
  weight: string;
}

interface Props {
  weightProgress: WeightEntry[];
}

export default function WeightTrendCard({ weightProgress }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.sectionHeaderRow, { marginBottom: vs(12) }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: scale(6) }}>
          <View style={[styles.cardIconWrap, { backgroundColor: P.sunLight }]}>
            <Ionicons name="scale-outline" size={scale(16)} color={P.sunDeep} />
          </View>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Weight Trend</Text>
        </View>
      </View>
      <WeightSparkline data={weightProgress} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: P.white,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: P.border,
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
    color: P.ink,
    letterSpacing: -0.3,
  },
});