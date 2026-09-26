import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';

const W = Dimensions.get('window').width;
const CHART_W = Math.min(W - 96, 560);

export const CHART_COLORS = {
  gold: '#F7CB16',
  amber: '#F59E0B',
  sky: '#38BDF8',
  primary: '#2596BE',
  deepBlue: '#0284C7',
  navyBlue: '#0369A1',
  emerald: '#10B981',
  purple: '#8B5CF6',
  violet: '#C084FC',
  rose: '#F43F5E',
  red: '#EF4444',
  heatRed: '#FF4B4B',
  orange: '#F97316',
  cyan: '#06B6D4',
  slate: '#64748B',
  muted: '#94a3b8',
};

export const BODY_PART_COLORS = [
  '#F7CB16', '#2596BE', '#10B981', '#8B5CF6',
  '#F43F5E', '#F97316', '#06B6D4', '#64748B',
];

export type AnalyticsRange = '7d' | '30d' | '90d' | '1y' | 'all';
export const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
];

export function RangeChips({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.rangeRow}>
      {RANGES.map((r) => {
        const active = value === r.key;
        return (
          <TouchableOpacity
            key={r.key}
            onPress={() => onChange(r.key)}
            activeOpacity={0.75}
            style={[
              styles.rangeChip,
              { borderColor: colors.border, backgroundColor: active ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={[styles.rangeText, { color: active ? '#FFF' : colors.textMuted }]}>{r.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: isDark ? '#000' : '#0d4d65',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardHead, { borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.titleIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {!!subtitle && (
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// Admin-style header: title + icon left, badge + toggle right, divider below
export function CardHead({ icon, iconColor, title, subtitle, badge, right }: {
  icon: string; iconColor?: string; title: string; subtitle?: string; badge?: string; right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const ic = iconColor || colors.primary;
  return (
    <View style={[styles.cardHead, { borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Ionicons name={icon as any} size={16} color={ic} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
          {!!badge && (
            <View style={[styles.headBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.headBadgeText, { color: colors.textMuted }]}>{badge}</Text>
            </View>
          )}
        </View>
        {!!right && <View style={{ flexShrink: 0 }}>{right}</View>}
      </View>
      {!!subtitle && (
        <Text style={[styles.cardSub, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  );
}

// Admin segmented toggle (Curve/Bars, Total Intake/Net, Daily Total/By Hour, Front/Back)
export function ChartToggle<T extends string>({ options, value, onChange }: {
  options: { key: NoInfer<T>; label: string; activeColor?: string }[]; value: T; onChange: (v: T) => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : 'rgba(0,0,0,0.04)' }]}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            activeOpacity={0.7}
            style={[
              styles.toggleBtn,
              active && { backgroundColor: o.activeColor || colors.primary },
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                { color: active ? (o.activeColor ? '#000' : '#FFF') : colors.textMuted },
                active && { fontFamily: FONTS.bodyBold },
              ]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Admin footer strip: top border + wrapped stat items
export function CardFooter({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardFooter, { borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function FooterStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.footerStat, { color: colors.textMuted }]}>
      {label} <Text style={{ color: valueColor || colors.text, fontFamily: FONTS.bodyBold }}>{value}</Text>
    </Text>
  );
}

// Admin 4-mini-stat grid (bottom metrics bar)
export function MiniStatGrid({ items }: { items: { label: string; value: string; valueColor?: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.miniGrid}>
      {items.map((m, i) => (
        <View key={i} style={[styles.miniBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{m.label}</Text>
          <Text style={[styles.miniValue, { color: m.valueColor || colors.text }]} numberOfLines={1}>{m.value}</Text>
        </View>
      ))}
    </View>
  );
}

// Admin 50-step heat intensity scale bar
export function HeatScale({ level }: { level: number }) {
  const { colors } = useTheme();
  const segs = Array.from({ length: 50 }, (_, i) => i + 1);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.barValue, { color: colors.textMuted }]}>Heat Scale (Intensity 1 to 50):</Text>
        <Text style={[styles.barValue, { color: colors.text, fontFamily: FONTS.bodyBold }]}>
          {level > 0 ? `Level ${level}` : 'Untrained'}
        </Text>
      </View>
      <View style={[styles.heatBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        {segs.map((lvl) => {
          const a = Math.round(10 + (220 * (lvl - 1)) / 49).toString(16).padStart(2, '0').toUpperCase();
          return <View key={lvl} style={{ flex: 1, backgroundColor: `#FF4B4B${a}` }} />;
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {['1 (Low)', '10', '20', '30', '40', '50 (Peak)'].map((t) => (
          <Text key={t} style={[styles.heatTick, { color: colors.textMuted }]}>{t}</Text>
        ))}
      </View>
    </View>
  );
}

export function KpiTile({ icon, label, value, sub, color, barPct, barColor, bar3 }: {
  icon: string; label: string; value: string; sub?: string; color: string;
  barPct?: number; barColor?: string; bar3?: { pct: number; color: string }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[styles.kpiLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
        <View style={[styles.kpiIcon, { backgroundColor: color + '15', borderColor: color + '30' }]}>
          <Ionicons name={icon as any} size={13} color={color} />
        </View>
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      {!!sub && <Text style={[styles.kpiSub, { color: colors.textMuted }]} numberOfLines={2}>{sub}</Text>}
      {bar3 ? (
        <View style={[styles.kpiBarTrack, { backgroundColor: colors.inputBg }]}>
          {bar3.map((b, i) => (
            <View key={i} style={{ width: `${Math.min(100, Math.max(0, b.pct))}%`, backgroundColor: b.color, height: '100%' }} />
          ))}
        </View>
      ) : barPct !== undefined && (
        <View style={[styles.kpiBarTrack, { backgroundColor: colors.inputBg }]}>
          <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, barPct))}%`, backgroundColor: barColor || color }]} />
        </View>
      )}
    </View>
  );
}

export function ProgressRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.barValue, { color: colors.textMuted }]}>{value}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.inputBg }]}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export interface BarDatum { value: number; label: string; color?: string }

function chartRules(isDark: boolean) {
  return {
    rulesColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    rulesType: 'dashed' as const,
  };
}

// Like admin: timelines scroll horizontally past 7 points, most-recent visible on load
function ScrollWrap({ wide, children, onHint }: { wide: boolean; children: (width: number, scrollRef: any) => React.ReactNode; onHint?: string }) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    if (wide) {
      const t = setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 150);
      return () => clearTimeout(t);
    }
  }, [wide]);
  if (!wide) return <>{children(CHART_W, null)}</>;
  return (
    <View>
      {!!onHint && (
        <Text style={[styles.scrollHint, { color: colors.textMuted }]}>{onHint}</Text>
      )}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {children(Math.max(CHART_W, 600), ref)}
      </ScrollView>
    </View>
  );
}

export type TipFn = (value: number, index: number, datum: any) => { title: string; sub?: string };

function usePointer(color: string, tip?: TipFn, lookup?: (index: number) => any) {
  const { colors, isDark } = useTheme();
  if (!tip) return undefined;
  return {
    pointerStripHeight: 160,
    pointerStripColor: colors.border,
    pointerStripWidth: 1,
    pointerColor: color,
    radius: 4,
    autoAdjustPointerLabelPosition: true,
    pointerLabelComponent: (items: any[], index?: number) => {
      const it = items?.[0];
      if (!it && index === undefined) return <></>;
      let i = typeof index === 'number' ? index : -1;
      let datum = i >= 0 && lookup ? lookup(i) : undefined;
      if (!datum && it) datum = it;
      const v = datum?.value ?? it?.value ?? 0;
      if (i < 0 && lookup && datum) {
        // fall through with matched datum
      }
      const t = tip(v, i, datum);
      return (
        <View style={[styles.tip, { backgroundColor: isDark ? '#1A1A1A' : '#04282B', borderColor: colors.border }]}>
          <Text style={styles.tipTitle}>{t.title}</Text>
          {!!t.sub && <Text style={styles.tipSub}>{t.sub}</Text>}
        </View>
      );
    },
  };
}

export function ThemedBarChart({ data, color, height = 170, showTopLabels = false, tip }: {
  data: BarDatum[]; color: string; height?: number; showTopLabels?: boolean; tip?: TipFn;
}) {
  const { colors, isDark } = useTheme();
  const pointerConfig = usePointer(color, tip, (i) => data[i]);
  if (!data.length) return <EmptyChart text="No data in this range" />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const wide = data.length > 7;
  const barW = data.length > 24 ? 10 : data.length > 12 ? 14 : 20;
  return (
    <ScrollWrap wide={wide} onHint={wide ? `Swipe to view past entries (${data.length})` : undefined}>
      {(w) => (
        <BarChart
          data={data.map((d) => ({
            value: d.value,
            label: data.length > 14 ? '' : d.label,
            frontColor: d.color || color,
            ...(showTopLabels && data.length <= 14
              ? { topLabelComponent: () => (
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: colors.textMuted }}>
                    {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}
                  </Text>
                ) }
              : {}),
          }))}
          barWidth={barW}
          spacing={10}
          roundedTop
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 8 }}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          {...chartRules(isDark)}
          noOfSections={4}
          maxValue={max * 1.15}
          height={height}
          width={w}
          isAnimated
          disableScroll
          {...(pointerConfig ? { pointerConfig } : {})}
        />
      )}
    </ScrollWrap>
  );
}

export function ThemedLineChart({ data, color, height = 170, curved = true, showDots = true, labels = false, tip }: {
  data: { value: number; label?: string }[]; color: string; height?: number; curved?: boolean; showDots?: boolean; labels?: boolean; tip?: TipFn;
}) {
  const { colors, isDark } = useTheme();
  const pointerConfig = usePointer(color, tip, (i) => data[i]);
  if (!data.length) return <EmptyChart text="No data in this range" />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const wide = data.length > 14;
  return (
    <ScrollWrap wide={wide} onHint={wide ? `Swipe to view past entries (${data.length})` : undefined}>
      {(w) => (
        <LineChart
          data={data.map((d) => ({ value: d.value, label: labels ? d.label : undefined }))}
          color={color}
          thickness={2.5}
          dataPointsColor={color}
          dataPointsRadius={showDots && data.length <= 31 ? 2.5 : 0}
          curved={curved}
          areaChart
          startFillColor={color}
          startOpacity={0.4}
          endFillColor={color}
          endOpacity={0.0}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 8 }}
          hideDataPoints={!showDots || data.length > 31}
          {...chartRules(isDark)}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          noOfSections={4}
          maxValue={max * 1.2}
          height={height}
          width={w}
          isAnimated
          animationDuration={600}
          disableScroll
          {...(pointerConfig ? { pointerConfig } : {})}
        />
      )}
    </ScrollWrap>
  );
}

// Up to 3 overlaid area series (admin macro P/C/F chart)
export function ThemedMultiLine({ series, height = 190 }: {
  series: { data: { value: number }[]; color: string }[]; height?: number;
}) {
  const { colors, isDark } = useTheme();
  const all = series.flatMap((s) => s.data.map((d) => d.value));
  if (!all.length) return <EmptyChart text="No data in this range" />;
  const max = Math.max(...all, 1);
  const wide = all.length > 42;
  const [s1, s2, s3] = series;
  return (
    <ScrollWrap wide={wide}>
      {(w) => (
        <LineChart
          data={s1.data}
          data2={s2?.data}
          data3={s3?.data}
          color={s1.color}
          color2={s2?.color}
          color3={s3?.color}
          thickness={2}
          thickness2={2}
          thickness3={2}
          curved
          areaChart
          startFillColor={s1.color}
          startOpacity={0.35}
          endOpacity={0.0}
          startFillColor2={s2?.color}
          startOpacity2={0.3}
          endOpacity2={0.0}
          startFillColor3={s3?.color}
          startOpacity3={0.3}
          endOpacity3={0.0}
          hideDataPoints
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
          {...chartRules(isDark)}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          noOfSections={4}
          maxValue={max * 1.2}
          height={height}
          width={w}
          isAnimated
          disableScroll
        />
      )}
    </ScrollWrap>
  );
}

export function ThemedDonut({ data, centerTop, centerBottom, legend = 'chips' }: {
  data: { value: number; color: string; text?: string; sub?: string }[];
  centerTop: string; centerBottom?: string; legend?: 'chips' | 'list';
}) {
  const { colors } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyChart text="No data in this range" />;
  const rows = data.filter((d) => d.value > 0);
  return (
    <View style={{ alignItems: 'center' }}>
      <PieChart
        data={rows}
        donut
        radius={70}
        innerRadius={50}
        centerLabelComponent={() => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: colors.textMuted }}>TOTAL</Text>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.text, textAlign: 'center' }}>
              {centerTop}
            </Text>
            {!!centerBottom && (
              <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: colors.textMuted }}>{centerBottom}</Text>
            )}
          </View>
        )}
      />
      {legend === 'chips' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' }}>
          {rows.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: d.color }} />
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted }}>
                {d.text} · {Math.round((d.value / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ width: '100%', marginTop: 12, gap: 6 }}>
          {rows.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
              <Text style={{ flex: 1, fontFamily: FONTS.body, fontSize: 12, color: colors.text, textTransform: 'capitalize' }} numberOfLines={1}>
                {d.text}
              </Text>
              {!!d.sub && (
                <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: colors.textMuted }}>{d.sub}</Text>
              )}
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: colors.text }}>
                {Math.round((d.value / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function SplitBar({ leftPct, leftColor, rightColor, leftLabel, rightLabel }: { leftPct: number; leftColor: string; rightColor: string; leftLabel: string; rightLabel: string }) {
  const { colors } = useTheme();
  const lp = Math.min(100, Math.max(0, leftPct));
  return (
    <View>
      <View style={[styles.splitTrack, { backgroundColor: colors.inputBg }]}>
        <View style={[styles.fill, { width: `${lp}%`, backgroundColor: leftColor }]} />
        <View style={[styles.fill, { width: `${100 - lp}%`, backgroundColor: rightColor }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={[styles.barValue, { color: colors.textMuted }]}>{leftLabel}</Text>
        <Text style={[styles.barValue, { color: colors.textMuted }]}>{rightLabel}</Text>
      </View>
    </View>
  );
}

export function KeyValue({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: colors.text }, bold && { fontFamily: FONTS.bodyBold }]}>{value}</Text>
    </View>
  );
}

export function ChipRow<T extends string>({ options, value, onChange, accent }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; accent?: string }) {
  const { colors } = useTheme();
  const ac = accent || colors.primary;
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            activeOpacity={0.75}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: active ? ac + '18' : 'transparent' }]}
          >
            <Text style={[styles.chipText, { color: active ? ac : colors.textMuted }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Gradient hero header — matches app visual language (meals/daily headers)
export function ScreenHero({ title, sub, updated, onBack, onRefresh, refreshing }: {
  title: string; sub: string; updated: Date | null;
  onBack: () => void; onRefresh: () => void; refreshing: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.heroWrap, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={isDark ? ['#0d4d65', '#04282B'] : [P.cta, P.ctaDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.heroBack}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSub}>{sub}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.heroRefresh}>
            <Ionicons name="refresh" size={17} color="#FFF" style={refreshing ? { opacity: 0.5 } : undefined} />
          </TouchableOpacity>
        </View>
        {!!updated && (
          <Text style={styles.heroUpdated}>
            Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Pull to refresh
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

// Sticky control bar (range chips). Wrap as FIRST ScrollView child + stickyHeaderIndices={[0]}
export function StickyBar({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stickyBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

// Horizontal section jump-nav
export function SectionNav({ sections, active, onJump }: {
  sections: { key: string; label: string; icon: string }[];
  active: string | null;
  onJump: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
      {sections.map((s) => {
        const on = active === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            onPress={() => onJump(s.key)}
            activeOpacity={0.7}
            style={[
              styles.navChip,
              { borderColor: colors.border, backgroundColor: on ? colors.primary : colors.card },
            ]}
          >
            <Ionicons name={s.icon as any} size={12} color={on ? '#FFF' : colors.textMuted} />
            <Text style={[styles.navText, { color: on ? '#FFF' : colors.textMuted }]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Shimmer skeleton while first load (much nicer than a lone spinner)
export function AnalyticsSkeleton({ tiles = 6, cards = 3 }: { tiles?: number; cards?: number }) {
  const { colors, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const sk = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {Array.from({ length: tiles }).map((_, i) => (
          <Animated.View key={i} style={[styles.skTile, { backgroundColor: sk, opacity: pulse }]} />
        ))}
      </View>
      {Array.from({ length: cards }).map((_, i) => (
        <Animated.View key={`c${i}`} style={[styles.skCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pulse }]}>
          <View style={[styles.skLine, { backgroundColor: sk, width: '45%' }]} />
          <View style={[styles.skChart, { backgroundColor: sk }]} />
          <View style={[styles.skLine, { backgroundColor: sk, width: '70%' }]} />
        </Animated.View>
      ))}
    </View>
  );
}

// Friendly empty state with optional action
export function EmptyState({ icon, title, message, actionLabel, onAction }: {
  icon: string; title: string; message: string; actionLabel?: string; onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
        <Ionicons name={icon as any} size={30} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>{message}</Text>
      {!!actionLabel && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyChart({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name="bar-chart-outline" size={28} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  titleIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  cardSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cardHead: { borderBottomWidth: 1, paddingBottom: 12, marginBottom: 12 },
  headBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  headBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 10 },
  toggle: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 2, gap: 2 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { fontFamily: FONTS.body, fontSize: 11 },
  cardFooter: {
    borderTopWidth: 1, paddingTop: 10, marginTop: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, rowGap: 6,
    alignItems: 'center', justifyContent: 'space-between',
  },
  footerStat: { fontFamily: FONTS.body, fontSize: 11 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  miniBox: { flex: 1, minWidth: '47%', borderRadius: 12, borderWidth: 1, padding: 10 },
  miniLabel: { fontFamily: FONTS.body, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  miniValue: { fontFamily: FONTS.bodyBold, fontSize: 13, marginTop: 4 },
  heatBar: { height: 12, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', borderWidth: 1 },
  heatTick: { fontFamily: FONTS.body, fontSize: 9 },
  scrollHint: { fontFamily: FONTS.body, fontSize: 10, marginBottom: 6 },
  kpi: { flex: 1, minWidth: '47%', borderRadius: 16, borderWidth: 1, padding: 12 },
  kpiLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11, flex: 1, marginRight: 6 },
  kpiIcon: { width: 26, height: 26, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  kpiValue: { fontFamily: FONTS.bodyBold, fontSize: 19, marginTop: 8 },
  kpiSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
  kpiBarTrack: { height: 6, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', marginTop: 8 },
  barLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 12, flex: 1, marginRight: 8 },
  barValue: { fontFamily: FONTS.body, fontSize: 11 },
  track: { height: 8, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%' },
  splitTrack: { height: 10, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  kvLabel: { fontFamily: FONTS.body, fontSize: 12, flex: 1, marginRight: 8 },
  kvValue: { fontFamily: FONTS.bodySemiBold, fontSize: 12, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontFamily: FONTS.body, fontSize: 12 },
  heroWrap: { paddingHorizontal: 16, paddingTop: 4, marginBottom: 2 },
  hero: { borderRadius: 22, padding: 16, overflow: 'hidden' },
  heroGlowA: { position: 'absolute', top: -46, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(247,203,22,0.22)' },
  heroGlowB: { position: 'absolute', bottom: -60, left: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBack: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  heroRefresh: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 26, color: '#FFF', letterSpacing: 0.3 },
  heroSub: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  heroUpdated: { fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 10 },
  stickyBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  navRow: { gap: 8, paddingRight: 16 },
  navChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  navText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  skTile: { flex: 1, minWidth: '47%', height: 86, borderRadius: 16 },
  skCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  skLine: { height: 14, borderRadius: 7 },
  skChart: { height: 150, borderRadius: 12 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 6 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22, textAlign: 'center' },
  emptyMsg: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 12, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFF' },
  tip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, minWidth: 90 },
  tipTitle: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FFF' },
  tipSub: { fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
