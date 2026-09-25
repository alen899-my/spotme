import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitContext";
import { formatWeightValue, kgToLbs, weightUnit } from "../../utils/units";

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

const TREND_H = 176;
const DELTA_H = 58;
const X_LABEL_H = 20;
const TOP_PAD = 16;
const TREND_BOTTOM_PAD = 8;
const LEFT_AXIS = 48;
const RIGHT_PAD = 10;
const MIN_SPACING = 46;

const GREEN = "#34d399";
const RED = "#f87171";

function formatDate(dateStr: string, range: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
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
      return (
        d.toLocaleDateString("en-US", { month: "short" }) +
        ` ’${String(d.getFullYear()).slice(2)}`
      );
  }
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  if (pts.length === 2)
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(
      2
    )} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

function formatGramDelta(deltaKg: number): string {
  if (!Number.isFinite(deltaKg) || deltaKg === 0) return "±0g";
  const g = Math.round(deltaKg * 1000);
  return `${g > 0 ? "+" : ""}${g}g`;
}

export default function WeightChart({ data, range }: Props) {
  const { colors, isDark } = useTheme();
  const { unitSystem } = useUnits();
  const imperial = unitSystem === "imperial";
  const unit = weightUnit(unitSystem);

  const [viewportW, setViewportW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    setSelected(data.length > 0 ? data.length - 1 : null);
  }, [data.length, range]);

  const kgVals = useMemo(
    () => data.map((d) => parseFloat(d.weight)).filter((v) => Number.isFinite(v)),
    [data]
  );

  if (data.length < 2 || kgVals.length < 2) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {data.length === 0
              ? "No weight data for this period"
              : "Log at least 2 entries to see your trend"}
          </Text>
        </View>
      </View>
    );
  }

  // Work in display units for the Y-domain so axis matches unit toggle,
  // but keep gram deltas from kg for exactness.
  const dispVals = kgVals.map((v) => (imperial ? kgToLbs(v) : v));
  const minVal = Math.min(...dispVals);
  const maxVal = Math.max(...dispVals);
  const avgVal = dispVals.reduce((a, b) => a + b, 0) / dispVals.length;
  const changeKg = kgVals[kgVals.length - 1] - kgVals[0];
  const changeDisp = dispVals[dispVals.length - 1] - dispVals[0];

  const kgMin = Math.min(...kgVals);
  const kgMax = Math.max(...kgVals);
  const kgAvg = kgVals.reduce((a, b) => a + b, 0) / kgVals.length;
  const n = dispVals.length;
  const estimatedW = LEFT_AXIS + RIGHT_PAD + MIN_SPACING * Math.max(n - 1, 1) + 8;
  const needsScroll = viewportW > 0 && estimatedW > viewportW;
  const contentW = viewportW === 0 ? 0 : needsScroll ? estimatedW : viewportW;
  const plotW = Math.max(contentW - LEFT_AXIS - RIGHT_PAD - 8, 10);
  const spacing = n <= 1 ? 0 : plotW / (n - 1);
  const plotH = TREND_H - TOP_PAD - TREND_BOTTOM_PAD;

  // Tight domain: pad 30% of span, min window ~80g so gram moves are visible.
  const span = Math.max(maxVal - minVal, 1e-9);
  const minPad = imperial ? 0.18 : 0.08;
  const pad = Math.max(span * 0.3, minPad);
  let yMin = minVal - pad;
  let yMax = maxVal + pad;
  const minWindow = imperial ? 0.5 : 0.25;
  if (yMax - yMin < minWindow) {
    const mid = (yMax + yMin) / 2;
    yMin = mid - minWindow / 2;
    yMax = mid + minWindow / 2;
  }
  if (yMin < 0) {
    yMax -= yMin;
    yMin = 0;
  }

  const yFor = (v: number) => TOP_PAD + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const xFor = (i: number) => LEFT_AXIS + 4 + i * spacing;
  const pts = dispVals.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
  const line = smoothPath(pts);
  const baseY = TOP_PAD + plotH;
  const area = `${line} L ${pts[n - 1].x.toFixed(2)},${baseY.toFixed(
    2
  )} L ${pts[0].x.toFixed(2)},${baseY.toFixed(2)} Z`;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = yMin + ((yMax - yMin) * i) / tickCount;
    return t;
  });
  const tickDecimals = yMax - yMin < 2 ? 2 : 1;

  // Deltas (kg-exact) for the bar strip.
  const deltasKg: (number | null)[] = dispVals.map((_, i) =>
    i === 0 ? null : kgVals[i] - kgVals[i - 1]
  );
  const maxAbsKg = Math.max(
    ...deltasKg.filter((d): d is number => d !== null).map((d) => Math.abs(d)),
    1e-9
  );
  const deltaPlotH = DELTA_H - 12;
  const zeroY = 6 + deltaPlotH / 2;
  const barW = Math.max(6, Math.min(16, spacing * 0.38));

  const minIdx = dispVals.indexOf(minVal);
  const maxIdx = dispVals.indexOf(maxVal);
  const selIdx = selected !== null ? Math.max(0, Math.min(n - 1, selected)) : n - 1;

  const selectFromX = (lx: number) => {
    if (spacing <= 0) return;
    const idx = Math.round((lx - LEFT_AXIS - 4) / spacing);
    setSelected(Math.max(0, Math.min(n - 1, idx)));
  };

  const labelStep = Math.max(1, Math.ceil(n / 8));

  const changeLabel =
    !imperial && Math.abs(changeKg) < 1
      ? formatGramDelta(changeKg)
      : `${changeKg >= 0 ? "+" : ""}${formatWeightValue(changeKg, unitSystem)}`;

  const selWeightKg = kgVals[selIdx];
  const selDeltaKg = selIdx > 0 ? kgVals[selIdx] - kgVals[selIdx - 1] : null;
  const tooltipLeft =
    contentW === 0
      ? 0
      : Math.max(4, Math.min(contentW - 148, xFor(selIdx) - 70));

  const chartBody =
    contentW === 0 ? null : (
      <View>
        {/* Trend */}
        <Svg width={contentW} height={TREND_H}>
          <Defs>
            <LinearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
              <Stop
                offset="1"
                stopColor={colors.primary}
                stopOpacity={0}
              />
            </LinearGradient>
          </Defs>

          {ticks.map((t, i) => {
            const y = yFor(t);
            return (
              <React.Fragment key={`g-${i}`}>
                <Line
                  x1={LEFT_AXIS}
                  x2={contentW - 4}
                  y1={y}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray="3,4"
                />
                <SvgText
                  x={LEFT_AXIS - 6}
                  y={y + 3}
                  fontSize={9}
                  fill={colors.textMuted}
                  textAnchor="end"
                  fontFamily={FONTS.body}
                >
                  {t.toFixed(tickDecimals)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Average */}
          <Line
            x1={LEFT_AXIS}
            x2={contentW - 4}
            y1={yFor(avgVal)}
            y2={yFor(avgVal)}
            stroke={colors.textDim}
            strokeWidth={1}
            strokeDasharray="5,4"
          />

          {/* Area + line */}
          <Path d={area} fill="url(#weightGradient)" />
          <Path
            d={line}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Selection crosshair */}
          {selIdx !== null && (
            <Line
              x1={xFor(selIdx)}
              x2={xFor(selIdx)}
              y1={TOP_PAD - 6}
              y2={baseY}
              stroke={colors.primary}
              strokeWidth={1}
              strokeDasharray="2,3"
              opacity={0.7}
            />
          )}

          {/* Points */}
          {pts.map((p, i) => {
            const isSel = i === selIdx;
            const isMin = i === minIdx;
            const isMax = i === maxIdx;
            return (
              <React.Fragment key={`p-${i}`}>
                {(isMin || isMax) && !isSel && (
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={7}
                    fill="none"
                    stroke={isMax ? GREEN : colors.textDim}
                    strokeWidth={1.2}
                    opacity={0.6}
                  />
                )}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isSel ? 5.5 : 3.5}
                  fill={isDark ? "#000" : "#fff"}
                  stroke={colors.primary}
                  strokeWidth={isSel ? 3 : 2}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Delta strip */}
        <Svg width={contentW} height={DELTA_H + X_LABEL_H}>
          <Line
            x1={LEFT_AXIS}
            x2={contentW - 4}
            y1={zeroY}
            y2={zeroY}
            stroke={colors.border}
            strokeWidth={1}
          />
          {deltasKg.map((d, i) => {
            if (d === null) return null;
            const h = Math.max(
              Math.abs(d) < 1e-12 ? 0 : 2.5,
              (Math.abs(d) / maxAbsKg) * (deltaPlotH / 2 - 2)
            );
            const isSel = i === selIdx;
            const col =
              Math.abs(d) < 1e-12
                ? colors.textDim
                : d > 0
                ? RED
                : GREEN;
            const x = xFor(i) - barW / 2;
            const y = d >= 0 ? zeroY - h : zeroY;
            const showLabel = n <= 14 || isSel || Math.abs(d) === maxAbsKg;
            return (
              <React.Fragment key={`d-${i}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, d === 0 ? 2 : h)}
                  rx={3}
                  fill={col}
                  opacity={isSel ? 1 : 0.85}
                />
                {showLabel && (
                  <SvgText
                    x={xFor(i)}
                    y={d >= 0 ? y - 3 : y + h + 9}
                    fontSize={8}
                    fill={col}
                    textAnchor="middle"
                    fontFamily={FONTS.body}
                  >
                    {formatGramDelta(d)}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
          {pts.map((p, i) => {
            if (i % labelStep !== 0 && i !== n - 1) return null;
            return (
              <SvgText
                key={`x-${i}`}
                x={p.x}
                y={DELTA_H + 14}
                fontSize={9}
                fill={i === selIdx ? colors.text : colors.textMuted}
                textAnchor="middle"
                fontFamily={FONTS.body}
                fontWeight={i === selIdx ? "700" : "400"}
              >
                {formatDate(data[i]?.logged_at ?? "", range)}
              </SvgText>
            );
          })}
        </Svg>

        {/* Tooltip */}
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeft,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.tooltipWeight, { color: colors.text }]}>
            {formatWeightValue(selWeightKg, unitSystem)}{" "}
            <Text style={[styles.tooltipUnit, { color: colors.textMuted }]}>
              {unit}
            </Text>
          </Text>
          {selDeltaKg !== null && (
            <Text
              style={[
                styles.tooltipDelta,
                {
                  color:
                    Math.abs(selDeltaKg) < 1e-12
                      ? colors.textDim
                      : selDeltaKg > 0
                      ? RED
                      : GREEN,
                },
              ]}
            >
              {formatGramDelta(selDeltaKg)} vs prev
            </Text>
          )}
        </View>
      </View>
    );

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View
        style={styles.measureRow}
        onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
        // @ts-ignore — hover tooltip on web (react-native-web forwards mouse events)
        onMouseMove={(e: any) => {
          const lx =
            e?.nativeEvent?.locationX ?? e?.nativeEvent?.offsetX;
          if (typeof lx === "number") selectFromX(lx);
        }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => selectFromX(e.nativeEvent.locationX)}
        onResponderMove={(e) => selectFromX(e.nativeEvent.locationX)}
      >
        {contentW === 0 ? (
          <View style={{ height: TREND_H + DELTA_H + X_LABEL_H }} />
        ) : needsScroll ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {chartBody}
          </ScrollView>
        ) : (
          chartBody
        )}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Weight ({unit})
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { backgroundColor: colors.textDim }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Avg</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: GREEN }]} />
          <View style={[styles.legendBar, { backgroundColor: RED, marginLeft: 2 }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Δ per day (g)
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatTile
          label="Min"
          value={`${formatWeightValue(kgMin, unitSystem)}`}
          color={colors.text}
          theme={colors}
        />
        <StatTile
          label="Max"
          value={`${formatWeightValue(kgMax, unitSystem)}`}
          color={colors.text}
          theme={colors}
        />
        <StatTile
          label="Avg"
          value={`${formatWeightValue(kgAvg, unitSystem)}`}
          color={colors.text}
          theme={colors}
        />
        <StatTile
          label="Change"
          value={changeLabel}
          color={
            Math.abs(changeKg) < 1e-12
              ? colors.textDim
              : changeKg > 0
              ? RED
              : GREEN
          }
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
  measureRow: {
    position: "relative",
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
  tooltip: {
    position: "absolute",
    top: 0,
    width: 140,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tooltipWeight: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
  },
  tooltipUnit: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
  },
  tooltipDelta: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    marginTop: 1,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginTop: vs(6),
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendDash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    marginRight: 5,
  },
  legendBar: {
    width: 6,
    height: 10,
    borderRadius: 2,
    marginRight: 2,
  },
  legendText: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(12),
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
});
