import React from "react";
import { View, Text, ScrollView } from "react-native";
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

const BAR_WIDTH = scale(36);
const BAR_GAP = scale(8);

export default function WeeklyBarChart({ data }: Props) {
  const { colors, isDark } = useTheme();
  const maxVal = Math.max(...data.map((d) => d.duration_seconds), 1);
  const chartH = vs(90);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: scale(4),
        gap: BAR_GAP,
        alignItems: "flex-end",
        height: chartH + vs(32),
        paddingTop: vs(4),
      }}
    >
      {data.map((d, i) => {
        const barH = Math.max((d.duration_seconds / maxVal) * chartH, d.workouts > 0 ? 4 : 2);
        const isToday = i === data.length - 1;
        return (
          <View key={d.date} style={{ width: BAR_WIDTH, alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: scale(4),
                backgroundColor: isToday ? P.sun : d.workouts > 0 ? P.cta : (isDark ? "#262626" : P.border),
              }}
            />
            <Text
              style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: scale(9),
                color: isToday ? (isDark ? "#FFFFFF" : P.ink) : (isDark ? colors.textMuted : P.muted),
              }}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
