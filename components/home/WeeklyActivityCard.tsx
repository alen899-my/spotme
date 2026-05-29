import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
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
  const { colors, isDark } = useTheme();
  const weeklyWorkouts = weekly.filter((d) => d.workouts > 0).length;
  const weeklyMinutes  = Math.round(
    weekly.reduce((s, d) => s + d.duration_seconds, 0) / 60
  );
  const totalVolume = Math.round(weekly.reduce((s, d) => s + d.volume, 0));

  return (
    <>
      {/* Section header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Activity</Text>
        <View style={[styles.weeklyBadge, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : P.ctaLight }]}>
          <Text style={[styles.weeklyBadgeText, { color: isDark ? P.cta : P.ctaDark }]}>
            {weeklyWorkouts}/7 days · {weeklyMinutes}m
          </Text>
        </View>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : P.white,
          borderColor: isDark ? colors.border : P.border,
        }
      ]}>
        <WeeklyBarChart data={weekly} />
        <View style={{ flexDirection: "row", gap: scale(20), marginTop: vs(14) }}>
          {[
            { val: weeklyWorkouts, lbl: "Workouts" },
            { val: weeklyMinutes,  lbl: "Total Mins" },
            { val: totalVolume,    lbl: "Volume (kg)" },
          ].map((s) => (
            <View key={s.lbl}>
              <Text style={[styles.chartStatVal, { color: colors.text }]}>{s.val}</Text>
              <Text style={[styles.chartStatLabel, { color: colors.textMuted }]}>{s.lbl}</Text>
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
    letterSpacing: -0.3,
  },
  weeklyBadge: {
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  weeklyBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
  },
  card: {
    borderRadius: scale(20),
    borderWidth: 1,
    padding: scale(16),
    marginBottom: vs(16),
  },
  chartStatVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    letterSpacing: -0.3,
  },
  chartStatLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    marginTop: 2,
  },
});