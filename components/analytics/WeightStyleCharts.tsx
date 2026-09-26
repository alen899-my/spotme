import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Defs, LinearGradient as SvgGradient, Stop, Path, Line, Circle, Rect, Text as SvgText,
} from 'react-native-svg';
import { FONTS } from '../../constants/theme';
import { scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';

const TREND_H = 176;
const DELTA_H = 58;
const X_LABEL_H = 20;
const TOP_PAD = 16;
const TREND_BOTTOM_PAD = 8;
const LEFT_AXIS = 48;
const RIGHT_PAD = 10;
const MIN_SPACING = 46;

const GREEN = '#34d399';
const RED = '#f87171';

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
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
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export interface TrendPoint {
  value: number;
  label: string;
  hint?: string;
}

export interface TrendStat {
  label: string;
  value: string;
  color?: string;
}

interface TrendChartProps {
  data: TrendPoint[];
  color?: string;
  unit?: string;
  height?: number;
  showAvg?: boolean;
  showDots?: boolean;
  showMinMax?: boolean;
  showDeltas?: boolean;
  deltaFormat?: (d: number) => string;
  deltaUpGood?: boolean;
  stats?: TrendStat[];
  legendLabel?: string;
  scrollHint?: string;
  emptyText?: string;
  valueFormat?: (v: number) => string;
  refLine?: { value: number; label: string; color?: string };
}

// Generic port of the weight-log chart: smooth curve + gradient area, avg line,
// min/max rings, tap-to-inspect crosshair + tooltip, delta strip, x labels,
// horizontal scroll with Past / Recent buttons.
export function TrendChart({
  data, color, unit = '', height = TREND_H, showAvg = true, showDots = true, showMinMax = true,
  showDeltas = false, deltaFormat, deltaUpGood = true, stats, legendLabel,
  scrollHint, emptyText = 'Not enough data yet', valueFormat, refLine,
}: TrendChartProps) {
  const { colors, isDark } = useTheme();
  const accent = color || colors.primary;
  const [viewportW, setViewportW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const vals = useMemo(() => data.map((d) => d.value).filter((v) => Number.isFinite(v)), [data]);

  useEffect(() => {
    setSelected(data.length > 0 ? data.length - 1 : null);
  }, [data.length]);

  useEffect(() => {
    if (data.length > 7) {
      const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
      return () => clearTimeout(t);
    }
  }, [data.length]);

  if (data.length < 2 || vals.length < 2) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
      </View>
    );
  }

  const n = vals.length;
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const avgVal = vals.reduce((a, b) => a + b, 0) / n;

  const estimatedW = LEFT_AXIS + RIGHT_PAD + MIN_SPACING * Math.max(n - 1, 1) + 8;
  const needsScroll = viewportW > 0 && estimatedW > viewportW;
  const contentW = viewportW === 0 ? 0 : needsScroll ? estimatedW : viewportW;
  const plotH = height - TOP_PAD - TREND_BOTTOM_PAD;
  const plotW = Math.max(contentW - LEFT_AXIS - RIGHT_PAD - 8, 10);
  const spacing = n <= 1 ? 0 : plotW / (n - 1);

  const span = Math.max(maxVal - minVal, 1e-9);
  const pad = Math.max(span * 0.3, 0.08);
  let yMin = minVal - pad;
  let yMax = maxVal + pad;
  if (yMax - yMin < 0.25) {
    const mid = (yMax + yMin) / 2;
    yMin = mid - 0.125;
    yMax = mid + 0.125;
  }
  if (yMin < 0 && minVal >= 0) {
    yMax -= yMin;
    yMin = 0;
  }

  const yFor = (v: number) => TOP_PAD + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const xFor = (i: number) => LEFT_AXIS + 4 + i * spacing;
  const pts = vals.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
  const line = smoothPath(pts);
  const baseY = TOP_PAD + plotH;
  const area = `${line} L ${pts[n - 1].x.toFixed(2)},${baseY.toFixed(2)} L ${pts[0].x.toFixed(2)},${baseY.toFixed(2)} Z`;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / tickCount);
  const tickDecimals = yMax - yMin < 2 ? 2 : yMax - yMin < 20 ? 1 : 0;

  const deltas: (number | null)[] = vals.map((_, i) => (i === 0 ? null : vals[i] - vals[i - 1]));
  const maxAbs = Math.max(...deltas.filter((d): d is number => d !== null).map((d) => Math.abs(d)), 1e-9);
  const deltaPlotH = DELTA_H - 12;
  const zeroY = 6 + deltaPlotH / 2;
  const barW = Math.max(6, Math.min(16, spacing * 0.38));

  const minIdx = vals.indexOf(minVal);
  const maxIdx = vals.indexOf(maxVal);
  const selIdx = selected !== null ? Math.max(0, Math.min(n - 1, selected)) : n - 1;

  const selectFromX = (lx: number) => {
    if (spacing <= 0) return;
    const idx = Math.round((lx - LEFT_AXIS - 4) / spacing);
    setSelected(Math.max(0, Math.min(n - 1, idx)));
  };

  const labelStep = Math.max(1, Math.ceil(n / 8));
  const fmtVal = (v: number) => (valueFormat ? valueFormat(v) : `${Math.round(v * 10) / 10}`);
  const selDelta = selIdx > 0 ? vals[selIdx] - vals[selIdx - 1] : null;
  const tooltipLeft = contentW === 0 ? 0 : Math.max(4, Math.min(contentW - 148, xFor(selIdx) - 70));

  const chartBody = contentW === 0 ? null : (
    <View>
      <Svg width={contentW} height={height}>
        <Defs>
          <SvgGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={0.22} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </SvgGradient>
        </Defs>

        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <React.Fragment key={`g-${i}`}>
              <Line x1={LEFT_AXIS} x2={contentW - 4} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3,4" />
              <SvgText x={LEFT_AXIS - 6} y={y + 3} fontSize={9} fill={colors.textMuted} textAnchor="end" fontFamily={FONTS.body}>
                {t.toFixed(tickDecimals)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {showAvg && (
          <Line x1={LEFT_AXIS} x2={contentW - 4} y1={yFor(avgVal)} y2={yFor(avgVal)} stroke={colors.textDim} strokeWidth={1} strokeDasharray="5,4" />
        )}

        {!!refLine && refLine.value >= yMin && refLine.value <= yMax && (
          <React.Fragment>
            <Line
              x1={LEFT_AXIS} x2={contentW - 4}
              y1={yFor(refLine.value)} y2={yFor(refLine.value)}
              stroke={refLine.color || '#10B981'} strokeWidth={1.5} strokeDasharray="4,4"
            />
            <SvgText
              x={contentW - 8} y={yFor(refLine.value) - 4}
              fontSize={9} fill={refLine.color || '#10B981'} textAnchor="end"
              fontFamily={FONTS.body}
            >
              {refLine.label}
            </SvgText>
          </React.Fragment>
        )}

        <Path d={area} fill="url(#trendGradient)" />
        <Path d={line} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        <Line x1={xFor(selIdx)} x2={xFor(selIdx)} y1={TOP_PAD - 6} y2={baseY} stroke={accent} strokeWidth={1} strokeDasharray="2,3" opacity={0.7} />

        {pts.map((p, i) => {
          const isSel = i === selIdx;
          const isMin = showMinMax && i === minIdx;
          const isMax = showMinMax && i === maxIdx;
          if (!showDots && !isSel) return <React.Fragment key={`p-${i}`} />;
          return (
            <React.Fragment key={`p-${i}`}>
              {(isMin || isMax) && !isSel && showDots && (
                <Circle cx={p.x} cy={p.y} r={7} fill="none" stroke={isMax ? GREEN : colors.textDim} strokeWidth={1.2} opacity={0.6} />
              )}
              <Circle cx={p.x} cy={p.y} r={isSel ? 5.5 : 3.5} fill={isDark ? '#000' : '#fff'} stroke={accent} strokeWidth={isSel ? 3 : 2} />
            </React.Fragment>
          );
        })}
      </Svg>

      {showDeltas && (
        <Svg width={contentW} height={DELTA_H + X_LABEL_H}>
          <Line x1={LEFT_AXIS} x2={contentW - 4} y1={zeroY} y2={zeroY} stroke={colors.border} strokeWidth={1} />
          {deltas.map((d, i) => {
            if (d === null) return null;
            const h = Math.abs(d) < 1e-12 ? 0 : Math.max(2.5, (Math.abs(d) / maxAbs) * (deltaPlotH / 2 - 2));
            const isSel = i === selIdx;
            const good = deltaUpGood ? d >= 0 : d <= 0;
            const col = Math.abs(d) < 1e-12 ? colors.textDim : good ? GREEN : RED;
            const x = xFor(i) - barW / 2;
            const y = d >= 0 ? zeroY - h : zeroY;
            const showLabel = n <= 14 || isSel || Math.abs(d) === maxAbs;
            return (
              <React.Fragment key={`d-${i}`}>
                <Rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={3} fill={col} opacity={isSel ? 1 : 0.85} />
                {showLabel && deltaFormat && (
                  <SvgText x={xFor(i)} y={d >= 0 ? y - 3 : y + h + 9} fontSize={8} fill={col} textAnchor="middle" fontFamily={FONTS.body}>
                    {deltaFormat(d)}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
          {pts.map((p, i) => {
            if (i % labelStep !== 0 && i !== n - 1) return null;
            return (
              <SvgText key={`x-${i}`} x={p.x} y={DELTA_H + 14} fontSize={9} fill={i === selIdx ? colors.text : colors.textMuted} textAnchor="middle" fontFamily={FONTS.body} fontWeight={i === selIdx ? '700' : '400'}>
                {data[i]?.label ?? ''}
              </SvgText>
            );
          })}
        </Svg>
      )}

      {!showDeltas && (
        <Svg width={contentW} height={X_LABEL_H}>
          {pts.map((p, i) => {
            if (i % labelStep !== 0 && i !== n - 1) return null;
            return (
              <SvgText key={`x-${i}`} x={p.x} y={12} fontSize={9} fill={i === selIdx ? colors.text : colors.textMuted} textAnchor="middle" fontFamily={FONTS.body} fontWeight={i === selIdx ? '700' : '400'}>
                {data[i]?.label ?? ''}
              </SvgText>
            );
          })}
        </Svg>
      )}

      <View style={[styles.tooltip, { left: tooltipLeft, backgroundColor: colors.card, borderColor: colors.border }]} pointerEvents="none">
        <Text style={[styles.tooltipWeight, { color: colors.text }]}>
          {fmtVal(vals[selIdx])}{unit ? <Text style={[styles.tooltipUnit, { color: colors.textMuted }]}> {unit}</Text> : null}
        </Text>
        {data[selIdx]?.hint ? (
          <Text style={[styles.tooltipDelta, { color: colors.textMuted }]}>{data[selIdx].hint}</Text>
        ) : null}
        {selDelta !== null && (
          <Text style={[styles.tooltipDelta, { color: Math.abs(selDelta) < 1e-12 ? colors.textDim : (deltaUpGood ? selDelta > 0 : selDelta < 0) ? GREEN : RED }]}>
            {selDelta > 0 ? '+' : ''}{Math.round(selDelta * 10) / 10}{unit ? ` ${unit}` : ''} vs prev
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View>
      {!!scrollHint && needsScroll && (
        <View style={styles.scrollHintRow}>
          <Text style={[styles.scrollHint, { color: colors.textMuted }]}>{scrollHint}</Text>
          <View style={styles.scrollBtns}>
            <TouchableOpacity
              onPress={() => scrollRef.current?.scrollTo({ x: 0, animated: true })}
              activeOpacity={0.7}
              style={[styles.scrollBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="chevron-back" size={12} color={colors.textMuted} />
              <Text style={[styles.scrollBtnText, { color: colors.textMuted }]}>Past</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
              activeOpacity={0.7}
              style={[styles.scrollBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.scrollBtnText, { color: colors.textMuted }]}>Recent</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View
        style={styles.measureRow}
        onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => selectFromX(e.nativeEvent.locationX)}
        onResponderMove={(e) => selectFromX(e.nativeEvent.locationX)}
      >
        {contentW === 0 ? (
          <View style={{ height: height + DELTA_H + X_LABEL_H }} />
        ) : needsScroll ? (
          <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
            {chartBody}
          </ScrollView>
        ) : (
          chartBody
        )}
      </View>

      {!!legendLabel && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: accent }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{legendLabel}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, { backgroundColor: colors.textDim }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Avg</Text>
          </View>
        </View>
      )}

      {!!stats && stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statTile, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: s.color || colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export interface TapBarDatum {
  value: number;
  label: string;
  color?: string;
  hint?: string;
}

interface TapBarChartProps {
  data: TapBarDatum[];
  color?: string;
  unit?: string;
  height?: number;
  valueFormat?: (v: number) => string;
  emptyText?: string;
}

// Same visual language as TrendChart, but bars (for sets breakdown,
// weekday / time-of-day distributions). Tap a bar to inspect it.
export function TapBarChart({ data, color, unit = '', height = 170, valueFormat, emptyText = 'No data yet' }: TapBarChartProps) {
  const { colors, isDark } = useTheme();
  const accent = color || colors.primary;
  const [viewportW, setViewportW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const n = data.length;
  useEffect(() => {
    setSelected(n > 0 ? n - 1 : null);
  }, [n]);

  if (n === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
      </View>
    );
  }

  const vals = data.map((d) => d.value);
  const maxVal = Math.max(...vals, 1);
  const STEP = 40;
  const BAR_W = 22;
  const TOP = 26;
  const plotH = height - TOP - X_LABEL_H;
  const estimatedW = LEFT_AXIS + RIGHT_PAD + STEP * n;
  const needsScroll = viewportW > 0 && estimatedW > viewportW;
  const contentW = viewportW === 0 ? 0 : needsScroll ? estimatedW : viewportW;
  const xFor = (i: number) => LEFT_AXIS + 4 + i * STEP + (STEP - BAR_W) / 2 + BAR_W / 2;
  const yFor = (v: number) => TOP + (1 - v / (maxVal * 1.15 || 1)) * plotH;
  const baseY = TOP + plotH;

  const selIdx = selected !== null ? Math.max(0, Math.min(n - 1, selected)) : n - 1;
  const sel = data[selIdx];
  const fmtVal = (v: number) => (valueFormat ? valueFormat(v) : `${Math.round(v * 10) / 10}`);
  const tooltipLeft = contentW === 0 ? 0 : Math.max(4, Math.min(contentW - 148, xFor(selIdx) - 70));

  const selectFromX = (lx: number) => {
    const idx = Math.round((lx - LEFT_AXIS - 4 - (STEP - BAR_W) / 2 - BAR_W / 2) / STEP);
    setSelected(Math.max(0, Math.min(n - 1, idx)));
  };

  const labelStep = Math.max(1, Math.ceil(n / 10));
  const ticks = [0, 0.5, 1].map((f) => maxVal * 1.15 * f);

  const body = contentW === 0 ? null : (
    <View>
      <Svg width={contentW} height={height}>
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <React.Fragment key={`g-${i}`}>
              <Line x1={LEFT_AXIS} x2={contentW - 4} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3,4" />
              <SvgText x={LEFT_AXIS - 6} y={y + 3} fontSize={9} fill={colors.textMuted} textAnchor="end" fontFamily={FONTS.body}>
                {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : Math.round(t)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {data.map((d, i) => {
          const h = Math.max(baseY - yFor(d.value), d.value > 0 ? 3 : 0);
          const isSel = i === selIdx;
          return (
            <React.Fragment key={`b-${i}`}>
              <Rect
                x={xFor(i) - BAR_W / 2}
                y={baseY - h}
                width={BAR_W}
                height={h}
                rx={5}
                fill={d.color || accent}
                opacity={isSel ? 1 : 0.55}
              />
              {isSel && (
                <Circle cx={xFor(i)} cy={baseY - h - 8} r={3.5} fill={accent} />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <Svg width={contentW} height={X_LABEL_H}>
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== n - 1) return null;
          return (
            <SvgText key={`x-${i}`} x={xFor(i)} y={12} fontSize={9} fill={i === selIdx ? colors.text : colors.textMuted} textAnchor="middle" fontFamily={FONTS.body} fontWeight={i === selIdx ? '700' : '400'}>
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
      {sel && (
        <View style={[styles.tooltip, { left: tooltipLeft, backgroundColor: colors.card, borderColor: colors.border }]} pointerEvents="none">
          <Text style={[styles.tooltipWeight, { color: colors.text }]}>
            {fmtVal(sel.value)}{unit ? <Text style={[styles.tooltipUnit, { color: colors.textMuted }]}> {unit}</Text> : null}
          </Text>
          <Text style={[styles.tooltipDelta, { color: colors.textMuted }]}>{sel.hint || sel.label}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View
      style={styles.measureRow}
      onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => selectFromX(e.nativeEvent.locationX)}
      onResponderMove={(e) => selectFromX(e.nativeEvent.locationX)}
    >
      {contentW === 0 ? (
        <View style={{ height: height + X_LABEL_H }} />
      ) : needsScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: 'center', paddingVertical: vs(28) },
  emptyText: { fontFamily: FONTS.body, fontSize: scale(12), textAlign: 'center' },
  measureRow: { position: 'relative', overflow: 'hidden', marginLeft: -scale(8), marginRight: -scale(8) },
  tooltip: {
    position: 'absolute', top: 0, width: 140, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  tooltipWeight: { fontFamily: FONTS.bodyBold, fontSize: scale(13) },
  tooltipUnit: { fontFamily: FONTS.body, fontSize: scale(11) },
  tooltipDelta: { fontFamily: FONTS.bodySemiBold, fontSize: scale(11), marginTop: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12), marginTop: vs(6), flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendDash: { width: 14, height: 2, borderRadius: 1, marginRight: 5 },
  legendText: { fontFamily: FONTS.body, fontSize: scale(10), marginLeft: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: vs(12), gap: scale(8) },
  statTile: { flex: 1, borderRadius: scale(12), borderWidth: 1, paddingVertical: vs(8), paddingHorizontal: 4, alignItems: 'center', gap: vs(2) },
  statValue: { fontFamily: FONTS.heading, fontSize: scale(15) },
  statLabel: { fontFamily: FONTS.body, fontSize: scale(9), textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  scrollHintRow: { marginBottom: 6, gap: 6 },
  scrollHint: { fontFamily: FONTS.body, fontSize: 10 },
  scrollBtns: { flexDirection: 'row', gap: 8 },
  scrollBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  scrollBtnText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
});
