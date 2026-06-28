import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitContext";
import { formatWeightValue, weightUnit } from "../../utils/units";

const SW = Dimensions.get("window").width;

interface WeightEntry {
  id: number;
  weight: string;
  notes?: string;
  logged_at: string;
}

interface Props {
  data: WeightEntry[];
  range: string;
}

function formatDate(dateStr: string, range: string): string {
  const d = new Date(dateStr);
  switch (range) {
    case "7d":
      return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
    case "30d":
      return d.getDate().toString();
    case "90d":
      return `${d.getMonth() + 1}/${d.getDate()}`;
    case "1y":
      return d.toLocaleDateString("en-US", { month: "short" });
    default:
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
  }
}

export default function WeightChart({ data, range }: Props) {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();

  if (data.length < 2) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {data.length === 0
            ? "No weight data for this period"
            : "Log at least 2 entries to see your trend"}
        </Text>
      </View>
    );
  }

  const vals = data.map((d) => parseFloat(d.weight));
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const change = vals[vals.length - 1] - vals[0];
  const changeStr = change >= 0 ? `+${formatWeightValue(change, unitSystem)}` : formatWeightValue(change, unitSystem);

  const chartData = data.map((d) => ({
    value: parseFloat(d.weight),
    label: formatDate(d.logged_at, range),
  }));

  const yPad = Math.max((maxVal - minVal) * 0.15, 2);
  const yMin = Math.max(0, Math.floor(minVal - yPad));
  const yMax = Math.ceil(maxVal + yPad);

  const cardHorizPadding = scale(32); // card padding * 2
  const availableWidth = SW - cardHorizPadding;
  const spacing = data.length <= 7 ? Math.max(40, (availableWidth - 40) / data.length) : Math.max(28, (availableWidth - 40) / Math.min(data.length, 8));
  const chartWidth = Math.max(availableWidth, chartData.length * spacing);
  const needsScroll = chartWidth > availableWidth;

  const lineChart = (
    <LineChart
      data={chartData}
      color={colors.primary}
      thickness={3}
      startFillColor={colors.primary}
      endFillColor={isDark ? "#0D0D0D" : "#FFF"}
      startOpacity={0.15}
      endOpacity={0}
      dataPointsColor={colors.primary}
      dataPointsRadius={4}
      showVerticalLines={false}
      xAxisThickness={1}
      xAxisColor={colors.border}
      yAxisThickness={0}
      hideDataPoints={false}
      isAnimated
      animationDuration={400}
      height={vs(140)}
      maxValue={yMax}
      noOfSections={4}
      rulesType="dashed"
      dashWidth={2}
      dashGap={3}
      rulesColor={colors.border}
      spacing={spacing}
      width={chartWidth}
      yAxisTextStyle={{
        fontFamily: FONTS.body,
        fontSize: scale(9),
        color: colors.textMuted,
      }}
      xAxisLabelTextStyle={{
        fontFamily: FONTS.bodySemiBold,
        fontSize: scale(9),
        color: colors.textMuted,
      }}
      scrollToEnd
      pointerConfig={{
        pointerStripHeight: vs(140),
        pointerStripColor: colors.border,
        pointerStripWidth: 1,
        pointerColor: colors.primary,
        pointerLabelWidth: scale(50),
        pointerLabelHeight: 28,
        autoAdjustPointerLabelPosition: true,
        pointerLabelComponent: (items: any[]) => (
          <View style={[styles.pointer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.pointerText, { color: colors.text }]}>
              {formatWeightValue(items[0]?.value, unitSystem)} {weightUnit(unitSystem)}
            </Text>
          </View>
        ),
      }}
    />
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.chartWrap}>
        {needsScroll ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {lineChart}
          </ScrollView>
        ) : lineChart}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatTile label="Min" value={`${formatWeightValue(minVal, unitSystem)}`} color={colors.text} theme={colors} />
        <StatTile label="Max" value={`${formatWeightValue(maxVal, unitSystem)}`} color={colors.text} theme={colors} />
        <StatTile label="Avg" value={`${formatWeightValue(avgVal, unitSystem)}`} color={colors.text} theme={colors} />
        <StatTile
          label="Change"
          value={`${changeStr}`}
          color={change === 0 ? colors.textDim : change > 0 ? "#f87171" : "#34d399"}
          theme={colors}
        />
      </View>
    </View>
  );
}

function StatTile({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  theme: any;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(20),
    borderWidth: 1,
    padding: scale(16),
  },
  chartWrap: {
    overflow: "hidden",
    marginLeft: -scale(8),
    marginRight: -scale(8),
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: vs(40),
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(14),
    gap: scale(8),
  },
  statTile: {
    flex: 1,
    borderRadius: scale(12),
    borderWidth: 1,
    paddingVertical: vs(8),
    alignItems: "center",
    gap: vs(2),
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(16),
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pointer: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pointerText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
});
