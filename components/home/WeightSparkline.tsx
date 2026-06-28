import React from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from '../../contexts/UnitContext';
import { formatWeight, formatHeight, weightUnit, heightUnit, volumeUnitLabel, formatWeightValue } from '../../utils/units';

const SCREEN_WIDTH = Dimensions.get("window").width;

interface WeightEntry {
  weight: string;
}

interface Props {
  data: WeightEntry[];
}

export default function WeightSparkline({ data }: Props) {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();

  if (data.length < 2) {
    return (
      <View style={{ alignItems: "center", paddingVertical: vs(16) }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: scale(13), color: isDark ? colors.textMuted : P.muted }}>
          Log workouts with weight to see your trend
        </Text>
      </View>
    );
  }

  const vals = data.map((d) => parseFloat(d.weight));
  const chartData = vals.map((v) => ({ value: v }));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const itemSpacing = Math.max(scale(30), (SCREEN_WIDTH - scale(80)) / Math.min(vals.length, 7));
  const chartWidth = Math.max(SCREEN_WIDTH - scale(40), vals.length * itemSpacing);

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: vs(8) }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: scale(12), color: isDark ? colors.textMuted : P.muted }}>
          {formatWeightValue(vals[0], unitSystem)} {weightUnit(unitSystem)}
        </Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: scale(13), color: isDark ? colors.primary : P.cta }}>
          {formatWeightValue(vals[vals.length - 1], unitSystem)} {weightUnit(unitSystem)}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={chartData}
          color={isDark ? colors.primary : P.cta}
          thickness={3}
          startFillColor={isDark ? colors.primary : P.cta}
          endFillColor={isDark ? "#0D0D0D" : "#FFF"}
          startOpacity={0.15}
          endOpacity={0}
          dataPointsColor={P.sun}
          dataPointsRadius={4}
          showVerticalLines={false}
          xAxisThickness={0}
          yAxisThickness={0}
          hideDataPoints={false}
          isAnimated
          animationDuration={400}
          height={vs(80)}
          maxValue={max + 2}
          noOfSections={3}
          rulesType="dashed"
          dashWidth={2}
          dashGap={3}
          spacing={itemSpacing}
          width={chartWidth}
          pointerConfig={{
            pointerStripHeight: vs(80),
            pointerStripColor: isDark ? colors.border : "rgba(0,0,0,0.1)",
            pointerStripWidth: 1,
            pointerColor: P.sun,
            pointerLabelWidth: scale(50),
            pointerLabelHeight: 28,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[]) => (
              <View style={{
                backgroundColor: isDark ? colors.card : P.white,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: scale(12), color: colors.text }}>
                  {formatWeightValue(items[0]?.value, unitSystem)} {weightUnit(unitSystem)}
                </Text>
              </View>
            ),
          }}
        />
      </ScrollView>
    </View>
  );
}
