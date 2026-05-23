import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import WeeklyBarChart from "./WeeklyBarChart";

interface DayData {
  date: string;
  label: string;
  duration_seconds: number;
  workouts: number;
  volume: number;
}

interface Props {
  weekly: DayData[];
}

export default function WeeklyActivityCard({ weekly }: Props) {
  const weeklyWorkouts = weekly.filter((d) => d.workouts > 0).length;
  const weeklyMinutes  = Math.round(
    weekly.reduce((s, d) => s + d.duration_seconds, 0) / 60
  );
  const totalVolume = Math.round(weekly.reduce((s, d) => s + d.volume, 0));

  return (
    <>
      {/* Section header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.weeklyBadge}>
          <Text style={styles.weeklyBadgeText}>
            {weeklyWorkouts}/7 days · {weeklyMinutes}m
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <WeeklyBarChart data={weekly} />
        <View style={{ flexDirection: "row", gap: scale(20), marginTop: vs(14) }}>
          {[
            { val: weeklyWorkouts, lbl: "Workouts" },
            { val: weeklyMinutes,  lbl: "Total Mins" },
            { val: totalVolume,    lbl: "Volume (kg)" },
          ].map((s) => (
            <View key={s.lbl}>
              <Text style={styles.chartStatVal}>{s.val}</Text>
              <Text style={styles.chartStatLabel}>{s.lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(12),
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    color: P.ink,
    letterSpacing: -0.3,
  },
  weeklyBadge: {
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    backgroundColor: P.ctaLight,
  },
  weeklyBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    color: P.ctaDark,
  },
  card: {
    backgroundColor: P.white,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: P.border,
    padding: scale(16),
    marginBottom: vs(16),
  },
  chartStatVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    color: P.ink,
    letterSpacing: -0.3,
  },
  chartStatLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: P.muted,
    marginTop: 2,
  },
});