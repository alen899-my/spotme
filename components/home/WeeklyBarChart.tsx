import React from "react";
import { View, Text } from "react-native";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

interface DayData {
  date: string;
  label: string;
  duration_seconds: number;
  workouts: number;
}

interface Props {
  data: DayData[];
}

export default function WeeklyBarChart({ data }: Props) {
  const { colors, isDark } = useTheme();
  const maxVal = Math.max(...data.map((d) => d.duration_seconds), 1);
  const chartH = vs(80);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: scale(6),
        height: chartH + vs(28),
        paddingTop: vs(4),
      }}
    >
      {data.map((d, i) => {
        const barH   = Math.max((d.duration_seconds / maxVal) * chartH, d.workouts > 0 ? 4 : 2);
        const isToday = i === data.length - 1;
        return (
          <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: scale(6),
                backgroundColor: isToday ? P.sun : d.workouts > 0 ? P.cta : (isDark ? "#262626" : P.border),
              }}
            />
            <Text
              style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: scale(10),
                color: isToday ? (isDark ? "#FFFFFF" : P.ink) : (isDark ? colors.textMuted : P.muted),
              }}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}