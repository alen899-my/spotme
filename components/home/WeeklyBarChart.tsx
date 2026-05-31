import React from "react";
import { View } from "react-native";
import { BarChart } from "react-native-gifted-charts";
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

  const chartData = data.map((d, i) => {
    const isToday = i === data.length - 1;
    return {
      value: d.duration_seconds,
      label: d.label,
      frontColor: isToday ? P.sun : d.workouts > 0 ? P.cta : (isDark ? "#333" : P.border),
      labelTextStyle: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: scale(9),
        color: isToday ? (isDark ? "#FFF" : P.ink) : (isDark ? colors.textMuted : P.muted),
      },
    };
  });

  const maxVal = Math.max(...data.map((d) => d.duration_seconds), 1);

  return (
    <View style={{ paddingLeft: scale(4) }}>
      <BarChart
        data={chartData}
        height={vs(90)}
        width={data.length * (scale(36) + scale(6))}
        barWidth={scale(28)}
        barBorderRadius={scale(4)}
        maxValue={maxVal}
        noOfSections={3}
        yAxisThickness={0}
        xAxisThickness={0}
        showVerticalLines={false}
        isAnimated
        animationDuration={400}
        spacing={scale(6)}
        hideRules
        scrollToEnd
        initialSpacing={scale(2)}
        endSpacing={scale(2)}
        yAxisTextStyle={{ fontSize: 0 }}
      />
    </View>
  );
}
