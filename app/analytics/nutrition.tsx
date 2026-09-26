import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import OptimizedImage from '../../components/ui/OptimizedImage';
import {
  Card, CardHead, KpiTile, ProgressRow, RangeChips,
  ChartToggle, CardFooter, FooterStat, KeyValue, StickyBar,
  SectionNav, AnalyticsSkeleton, EmptyState, CHART_COLORS, AnalyticsRange,
} from '../../components/analytics/AnalyticsUI';
import { TrendChart, TapBarChart } from '../../components/analytics/WeightStyleCharts';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'calories', label: 'Calories', icon: 'flame' },
  { key: 'macros', label: 'Macros', icon: 'layers' },
  { key: 'hydration', label: 'Water', icon: 'water' },
  { key: 'health', label: 'Health', icon: 'heart' },
  { key: 'timing', label: 'Timing', icon: 'time' },
  { key: 'foods', label: 'Foods', icon: 'star' },
  { key: 'recent', label: 'Recent', icon: 'images' },
];

const shortDate = (iso: string) => {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length >= 3) return `${p[1]}/${p[2]}`;
  return String(iso).slice(5);
};
const fmtHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};
const mealIcon = (t: string) => {
  const k = (t || '').toLowerCase();
  if (k === 'breakfast') return { icon: 'sunny', color: CHART_COLORS.amber };
  if (k === 'lunch') return { icon: 'sunny-outline', color: CHART_COLORS.sky };
  if (k === 'dinner') return { icon: 'moon', color: CHART_COLORS.purple };
  return { icon: 'moon-outline', color: CHART_COLORS.emerald };
};
const periodIcon = (p: string) => {
  if (p === 'morning') return 'sunny-outline';
  if (p === 'afternoon') return 'sunny';
  if (p === 'evening') return 'partly-sunny-outline';
  return 'moon-outline';
};

export default function NutritionAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const scrollRef = React.useRef<ScrollView>(null);
  const sectionY = React.useRef<Record<string, number>>({});
  const [calView, setCalView] = useState<'intake' | 'net'>('intake');
  const [macroFilter, setMacroFilter] = useState<'all' | 'protein' | 'carbs' | 'fat'>('all');
  const [hydroView, setHydroView] = useState<'daily' | 'circadian'>('daily');
  const [mealChart, setMealChart] = useState<'curve' | 'bars'>('curve');

  const fetchData = useCallback(async (r: AnalyticsRange, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const [aRes, rRes] = await Promise.all([
        axios.get(`${API_URL}/meals/analytics`, {
          params: { range: r, tz },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/meals/recent-logs`, {
          params: { page: 1, limit: 8 },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setData(aRes.data);
      setRecent(rRes.data?.meals || []);
      setUpdated(new Date());
    } catch (err) {
      console.error('Nutrition analytics error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(range); }, [fetchData, range]));

  const jumpTo = (key: string) => {
    setActiveSection(key);
    const y = sectionY.current[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 110), animated: true });
  };

  const markSection = (key: string) => (e: any) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const k = data?.kpis;
  const targets = data?.meta?.targets;
  const targetCalories = targets?.caloriesTarget || 2200;
  const targetProtein = targets?.proteinTarget || 150;
  const targetCarbs = targets?.carbsTarget || 250;
  const targetFat = targets?.fatTarget || 65;
  const targetWaterL = targets ? (targets.waterTargetMl || 3000) / 1000 : 3.0;
  const calDiff = Math.round((k?.avgCalories || 0) - targetCalories);
  const netLabel = (k?.avgNetBalance || 0) > 300 ? 'Surplus' : (k?.avgNetBalance || 0) < -300 ? 'Deficit' : 'Balanced';
  const timeline = data?.timeline || [];
  const dayHint = (t: any) => `${shortDate(t.date)}`;
  const calLine = timeline.map((t: any) => ({
    value: Math.round(t.calories || 0),
    label: shortDate(t.date),
    hint: `${dayHint(t)} · burned ${Math.round(t.caloriesBurned || 0)}`,
  }));
  const netBars = timeline.map((t: any) => ({
    value: Math.round(t.netCalories || 0),
    label: shortDate(t.date),
    hint: `${dayHint(t)} · burned ${Math.round(t.caloriesBurned || 0)}`,
    color: (t.netCalories || 0) >= targetCalories ? CHART_COLORS.amber : (t.netCalories || 0) >= 0 ? CHART_COLORS.emerald : CHART_COLORS.sky,
  }));
  const macroPoints = (key: string, unit: string) => timeline.map((t: any) => ({
    value: Math.round(t[key] || 0),
    label: shortDate(t.date),
    hint: `${dayHint(t)} · ${Math.round(t[key] || 0)}${unit}`,
  }));
  const macroSingle = {
    protein: macroPoints('protein', 'g'),
    carbs: macroPoints('carbs', 'g'),
    fat: macroPoints('fat', 'g'),
  };
  const macroColor = { protein: CHART_COLORS.emerald, carbs: CHART_COLORS.amber, fat: CHART_COLORS.rose } as const;
  const waterBars = timeline.map((t: any) => ({
    value: Math.round(((t.waterLiters || 0)) * 10) / 10,
    label: shortDate(t.date),
    hint: `${dayHint(t)} · ${Math.round(((t.waterLiters || 0) / targetWaterL) * 100)}% of goal`,
    color: (t.waterLiters || 0) >= targetWaterL ? CHART_COLORS.sky : (t.waterLiters || 0) >= targetWaterL * 0.7 ? CHART_COLORS.deepBlue : CHART_COLORS.navyBlue,
  }));
  const waterCurve = (data?.circadianWater || []).map((c: any) => ({
    value: Math.round(c.waterMl || 0),
    label: fmtHour(c.hour),
    hint: `${fmtHour(c.hour)} · ${c.logsCount || 0} logs`,
  }));
  const waterPeriods = data?.waterDayPeriods || [];
  const dowNutrition = data?.dayOfWeek || [];
  const dowActive = dowNutrition.filter((d: any) => (d.mealsCount || 0) > 0).length;
  const mealTiming = data?.circadianMeals || [];
  const mealHint = (c: any) => {
    const h = c.hour ?? 0;
    const nh = (h + 1) % 24;
    return `${fmtHour(h)} – ${fmtHour(nh)} · ${c.count || 0} meals${h >= 21 ? ' · Late meal' : ''}`;
  };
  const mealCurve = mealTiming.map((c: any) => ({ value: Math.round(c.calories || 0), label: fmtHour(c.hour), hint: mealHint(c) }));
  const mealBars = mealTiming.map((c: any) => ({
    value: Math.round(c.calories || 0),
    label: fmtHour(c.hour),
    hint: mealHint(c),
    color: c.hour >= 21 ? CHART_COLORS.violet : (c.calories || 0) > 0 ? CHART_COLORS.amber : 'rgba(128,128,128,0.25)',
  }));
  const peakMeal = [...mealTiming].sort((a: any, b: any) => (b.calories || 0) - (a.calories || 0))[0];
  const mealTypes = data?.mealTypes || [];
  const topFoods = (data?.topFoods || []).slice(0, 6);
  const maxFood = Math.max(...topFoods.map((f: any) => f.loggedCount || 0), 1);
  const fiberPct = Math.min(100, Math.round(((k?.avgFiber || 0) / 30) * 100));
  const sugarOver = (k?.avgSugar || 0) > 35;
  const sodiumOver = (k?.avgSodium || 0) > 2300;

  const hasData = !!data && (((data?.timeline || []).length > 0) || (recent.length > 0) || ((k?.loggedDaysCount || 0) > 0));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Food & Water</Text>
          {!!updated && (
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => fetchData(range)}
          activeOpacity={0.7}
          style={[styles.refreshBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <AnalyticsSkeleton tiles={6} cards={3} />
        </ScrollView>
      ) : !hasData ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(range, true); }} tintColor={colors.primary} />}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <RangeChips value={range} onChange={(r) => { setRange(r); fetchData(r); }} />
          </View>
          <EmptyState
            icon="restaurant"
            title="No meals logged yet"
            message="Log your first meal or a glass of water and your calories, macros and hydration will show up here."
            actionLabel="Log a Meal"
            onAction={() => router.push('/(tabs)/meals' as any)}
          />
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          stickyHeaderIndices={[0]}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(range, true); }} tintColor={colors.primary} />}
        >
          <StickyBar>
            <RangeChips value={range} onChange={(r) => { setRange(r); fetchData(r); }} />
            <SectionNav sections={SECTIONS} active={activeSection} onJump={jumpTo} />
          </StickyBar>
          <View onLayout={markSection('overview')} />

          {/* ── 1. HERO RIBBON (same 6 tiles as admin) ── */}
          {k && (
            <View style={styles.kpiGrid}>
              <KpiTile icon="flame" label="Calories" value={`${Math.round(k.avgCalories || 0).toLocaleString()}`} sub={`${calDiff >= 0 ? `+${calDiff}` : calDiff} vs ${targetCalories} goal`} color={CHART_COLORS.amber} barPct={((k.avgCalories || 0) / targetCalories) * 100} barColor={CHART_COLORS.amber} />
              <KpiTile icon="barbell" label="Protein" value={`${Math.round(k.avgProtein || 0)}g`} sub={`${k.proteinPerKg ?? 0} g/kg body weight`} color={CHART_COLORS.emerald} barPct={((k.avgProtein || 0) / targetProtein) * 100} barColor={CHART_COLORS.emerald} />
              <KpiTile icon="water" label="Water" value={`${k.avgWaterLiters ?? 0}L`} sub={`${Math.round(((k.avgWaterLiters || 0) / targetWaterL) * 100)}% of ${targetWaterL}L goal`} color={CHART_COLORS.sky} barPct={((k.avgWaterLiters || 0) / targetWaterL) * 100} barColor={CHART_COLORS.sky} />
              <KpiTile icon="scale" label="Net" value={`${(k.avgNetBalance || 0) >= 0 ? `+${k.avgNetBalance}` : k.avgNetBalance}`} sub={`${netLabel} · in − burned`} color={CHART_COLORS.purple} />
              <KpiTile
                icon="pie-chart" label="Macros" value={`${k.macroRatio?.proteinPct ?? 0}/${k.macroRatio?.carbsPct ?? 0}/${k.macroRatio?.fatPct ?? 0}`}
                sub="Protein · Carbs · Fat" color="#818CF8"
                bar3={[
                  { pct: k.macroRatio?.proteinPct || 0, color: CHART_COLORS.emerald },
                  { pct: k.macroRatio?.carbsPct || 0, color: CHART_COLORS.amber },
                  { pct: k.macroRatio?.fatPct || 0, color: CHART_COLORS.rose },
                ]}
              />
              <KpiTile icon="calendar" label="Consistency" value={`${k.loggedDaysCount ?? 0} days`} sub={`${k.currentStreak ?? 0}d streak · ${k.complianceRatePct ?? 0}% on target`} color={CHART_COLORS.amber} barPct={k.complianceRatePct || 50} barColor={CHART_COLORS.amber} />
            </View>
          )}

          {/* ── 2. CALORIES & BURN (toggle + goal badge + footer) + DAILY AVERAGE ── */}
          <View onLayout={markSection('calories')} />
          <Card>
            <CardHead
              icon="flame" iconColor={CHART_COLORS.amber} title="Calories & Burn"
              subtitle="Daily calories compared to your goal and workout burn"
              badge={`Goal: ${targetCalories} kcal`}
              right={<ChartToggle value={calView} onChange={setCalView} options={[{ key: 'intake', label: 'Total Intake' }, { key: 'net', label: 'Net Calories' }]} />}
            />
            {calView === 'intake' ? (
              <TrendChart
                data={calLine}
                color={CHART_COLORS.amber}
                unit="kcal"
                height={200}
                legendLabel="Calories (kcal)"
                refLine={{ value: targetCalories, label: `Goal: ${targetCalories}`, color: '#10B981' }}
                scrollHint={`Scroll horizontally to view past days (${timeline.length} days)`}
              />
            ) : (
              <TapBarChart
                data={netBars}
                color={CHART_COLORS.emerald}
                height={200}
                unit="kcal"
              />
            )}
            <CardFooter>
              <FooterStat label="Avg:" value={`${Math.round(k?.avgCalories || 0)} kcal`} valueColor={CHART_COLORS.amber} />
              <FooterStat label="Goal:" value={`${targetCalories} kcal`} />
              <FooterStat label="Net:" value={`${k?.avgNetBalance ?? 0} kcal`} valueColor={(k?.avgNetBalance || 0) >= 0 ? CHART_COLORS.emerald : CHART_COLORS.sky} />
              <FooterStat label="" value={`${k?.complianceRatePct ?? 0}% days on target`} />
            </CardFooter>
          </Card>

          <Card>
            <CardHead icon="calendar" iconColor={CHART_COLORS.emerald} title="Daily Average" subtitle="Average calories eaten by day of week" badge="By Day" />
            <TapBarChart
              data={dowNutrition.map((d: any) => ({
                value: Math.round(d.avgMealCalories || 0),
                label: d.shortDay || '',
                hint: `${d.day || ''} · ${d.mealsCount || 0} meals`,
              }))}
              color={CHART_COLORS.emerald}
              height={170}
              unit="kcal"
            />
            <CardFooter>
              <FooterStat label="Logged:" value={`${dowActive} of 7 days`} />
            </CardFooter>
          </Card>

          {/* ── 3. MACROS (filter pills + multi/single area + footer legend + density) + CALORIE SPLIT ── */}
          <View onLayout={markSection('macros')} />
          <Card>
            <CardHead
              icon="layers" iconColor={CHART_COLORS.emerald} title="Protein, Carbs & Fat"
              subtitle="Daily grams of each macro"
              badge={`P: ${targetProtein}g · C: ${targetCarbs}g · F: ${targetFat}g`}
              right={
                <ChartToggle
                  value={macroFilter}
                  onChange={setMacroFilter}
                  options={[
                    { key: 'all', label: 'All' },
                    { key: 'protein', label: 'Protein', activeColor: CHART_COLORS.emerald },
                    { key: 'carbs', label: 'Carbs', activeColor: CHART_COLORS.amber },
                    { key: 'fat', label: 'Fat', activeColor: CHART_COLORS.rose },
                  ]}
                />
              }
            />
            {macroFilter === 'all' ? (
              <View style={{ gap: 14 }}>
                {[
                  { key: 'protein', label: 'Protein (g)', target: targetProtein },
                  { key: 'carbs', label: 'Carbs (g)', target: targetCarbs },
                  { key: 'fat', label: 'Fat (g)', target: targetFat },
                ].map((s) => (
                  <View key={s.key}>
                    <Text style={[styles.macroMiniTitle, { color: colors.textMuted }]}>{s.label}</Text>
                    <TrendChart
                      data={macroSingle[s.key as 'protein' | 'carbs' | 'fat']}
                      color={macroColor[s.key as 'protein' | 'carbs' | 'fat']}
                      unit="g"
                      height={130}
                      showAvg={false}
                      refLine={{ value: s.target, label: `Goal: ${s.target}g`, color: macroColor[s.key as 'protein' | 'carbs' | 'fat'] }}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <TrendChart
                data={macroSingle[macroFilter]}
                color={macroColor[macroFilter]}
                unit="g"
                height={200}
                legendLabel={`${macroFilter === 'protein' ? 'Protein' : macroFilter === 'carbs' ? 'Carbs' : 'Fat'} (g)`}
                refLine={{
                  value: macroFilter === 'protein' ? targetProtein : macroFilter === 'carbs' ? targetCarbs : targetFat,
                  label: `Goal: ${macroFilter === 'protein' ? targetProtein : macroFilter === 'carbs' ? targetCarbs : targetFat}g`,
                  color: macroColor[macroFilter],
                }}
                scrollHint={`Scroll horizontally to view past days (${timeline.length} days)`}
              />
            )}
            <CardFooter>
              <FooterStat label="● Protein:" value={`${Math.round(k?.avgProtein || 0)}g`} valueColor={CHART_COLORS.emerald} />
              <FooterStat label="● Carbs:" value={`${Math.round(k?.avgCarbs || 0)}g`} valueColor={CHART_COLORS.amber} />
              <FooterStat label="● Fat:" value={`${Math.round(k?.avgFat || 0)}g`} valueColor={CHART_COLORS.rose} />
              <FooterStat label="Density:" value={`${k?.proteinDensity ?? 0}g / 100 kcal`} />
            </CardFooter>
          </Card>

          <Card>
            <CardHead icon="pie-chart" iconColor={CHART_COLORS.purple} title="Calorie Split" subtitle="Where your daily calories come from" badge="Breakdown" />
            <View style={{ gap: 10 }}>
              {[
                { label: 'Protein', icon: 'barbell', value: Math.round(k?.avgProtein || 0), pct: k?.macroRatio?.proteinPct || 0, kcal: Math.round((k?.avgProtein || 0) * 4), goal: `${targetProtein}g`, color: CHART_COLORS.emerald },
                { label: 'Carbohydrates', icon: 'pizza', value: Math.round(k?.avgCarbs || 0), pct: k?.macroRatio?.carbsPct || 0, kcal: Math.round((k?.avgCarbs || 0) * 4), goal: `${targetCarbs}g`, color: CHART_COLORS.amber },
                { label: 'Fat', icon: 'water', value: Math.round(k?.avgFat || 0), pct: k?.macroRatio?.fatPct || 0, kcal: Math.round((k?.avgFat || 0) * 9), goal: `${targetFat}g`, color: CHART_COLORS.rose },
              ].map((m) => (
                <View key={m.label} style={[styles.splitBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.splitTitle, { color: m.color }]}>{m.label}</Text>
                    <Text style={[styles.splitTitle, { color: colors.text }]}>{m.pct}%</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View style={[styles.fill, { width: `${Math.min(100, m.pct)}%`, backgroundColor: m.color }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.splitSub, { color: colors.textMuted }]}>{m.kcal} kcal/day</Text>
                    <Text style={[styles.splitSub, { color: colors.textMuted }]}>Goal: {m.goal}</Text>
                  </View>
                </View>
              ))}
            </View>
            <CardFooter>
              <FooterStat label="Protein per kg:" value={`${k?.proteinPerKg ?? 0} g/kg`} valueColor={CHART_COLORS.emerald} />
            </CardFooter>
          </Card>

          {/* ── 4. HYDRATION (toggle daily/by-hour + goal + footer) + TIME OF DAY ── */}
          <View onLayout={markSection('hydration')} />
          <Card>
            <CardHead
              icon="water" iconColor={CHART_COLORS.sky} title="Water Intake"
              subtitle="Daily water total and when you drank it"
              badge={`Goal: ${targetWaterL}L / day`}
              right={<ChartToggle value={hydroView} onChange={setHydroView} options={[{ key: 'daily', label: 'Daily Total' }, { key: 'circadian', label: 'By Hour' }]} />}
            />
            {hydroView === 'daily' ? (
              <TapBarChart
                data={waterBars}
                color={CHART_COLORS.sky}
                height={200}
                unit="L"
              />
            ) : (
              <TrendChart
                data={waterCurve}
                color={CHART_COLORS.sky}
                unit="ml"
                height={200}
                legendLabel="Water (ml)"
              />
            )}
            <CardFooter>
              <FooterStat label="Avg:" value={`${k?.avgWaterLiters ?? 0} L/day`} valueColor={CHART_COLORS.sky} />
              <FooterStat label="Ratio:" value={`${k?.fluidCalorieRatio ?? 0} ml/kcal`} />
              <FooterStat label="Goal met:" value={`${k?.hydrationHitRatePct ?? 0}% of days`} valueColor={CHART_COLORS.emerald} />
            </CardFooter>
          </Card>

          <Card>
            <CardHead icon="time" iconColor={CHART_COLORS.sky} title="Time of Day" subtitle="Water intake across parts of the day" badge="Daily Split" />
            <View style={{ gap: 8 }}>
              {waterPeriods.map((p: any) => (
                <View key={p.period} style={[styles.splitBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.splitTitle, { color: colors.text }]}>
                      <Ionicons name={periodIcon(p.period) as any} size={13} color={CHART_COLORS.sky} />  {p.label}
                    </Text>
                    <Text style={[styles.splitSub, { color: colors.textMuted }]}>{p.timeRange}</Text>
                  </View>
                  <ProgressRow label={`${Math.round(p.amountMl || 0).toLocaleString()} ml`} value={`${p.pct || 0}%`} pct={p.pct || 0} color={CHART_COLORS.sky} />
                </View>
              ))}
            </View>
          </Card>

          {/* ── 5. MICRONUTRIENTS (same 3 panels + verdicts) ── */}
          <View onLayout={markSection('health')} />
          <Card>
            <CardHead icon="heart" iconColor={CHART_COLORS.rose} title="Fiber, Sugar & Sodium" subtitle="Daily intake compared to recommended health limits" badge="Daily Limits" />
            <View style={styles.widgetGrid}>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Fiber · Goal 30g</Text>
                <Text style={[styles.widgetBig, { color: colors.text }]}>{k?.avgFiber ?? 0}g</Text>
                <Text style={[styles.widgetVerdict, { color: (k?.avgFiber || 0) >= 25 ? CHART_COLORS.emerald : CHART_COLORS.amber }]}>
                  {(k?.avgFiber || 0) >= 25 ? 'On track' : 'Below target — add veg, oats, lentils'}
                </Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Sugar · Limit 35g</Text>
                <Text style={[styles.widgetBig, { color: sugarOver ? CHART_COLORS.rose : CHART_COLORS.amber }]}>{k?.avgSugar ?? 0}g</Text>
                <Text style={[styles.widgetVerdict, { color: sugarOver ? CHART_COLORS.rose : CHART_COLORS.emerald }]}>
                  {sugarOver ? 'Over limit — cut sweet drinks' : 'Within limit'}
                </Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Sodium · Limit 2,300mg</Text>
                <Text style={[styles.widgetBig, { color: sodiumOver ? CHART_COLORS.rose : CHART_COLORS.sky }]}>{(k?.avgSodium || 0).toLocaleString()}mg</Text>
                <Text style={[styles.widgetVerdict, { color: sodiumOver ? CHART_COLORS.rose : CHART_COLORS.emerald }]}>
                  {sodiumOver ? 'Over limit — watch salty food' : 'Within limit'}
                </Text>
              </View>
            </View>
          </Card>

          {/* ── 6. MEAL TIMES (curve/bars toggle + peak + footer) + MEALS & SNACKS ── */}
          <View onLayout={markSection('timing')} />
          <Card>
            <CardHead
              icon="time" iconColor={CHART_COLORS.amber} title="Meal Times"
              subtitle="When calories are eaten throughout the day"
              badge={peakMeal ? `Peak: ${peakMeal.label || fmtHour(peakMeal.hour)}` : undefined}
              right={<ChartToggle value={mealChart} onChange={setMealChart} options={[{ key: 'curve', label: 'Curve' }, { key: 'bars', label: 'Bars' }]} />}
            />
            {mealChart === 'curve' ? (
              <TrendChart
                data={mealCurve}
                color={CHART_COLORS.amber}
                unit="kcal"
                height={180}
                showDots={false}
                legendLabel="Calories (kcal)"
              />
            ) : (
              <TapBarChart
                data={mealBars}
                color={CHART_COLORS.amber}
                height={180}
                unit="kcal"
              />
            )}
            <CardFooter>
              <FooterStat label="Eating window:" value={`~${k?.feedingWindowHours ?? 0} hrs`} />
              <FooterStat label="Late meals:" value={`${k?.lateNightIndexPct ?? 0}% after 8:30 PM`} valueColor={(k?.lateNightIndexPct || 0) > 25 ? CHART_COLORS.purple : colors.text} />
            </CardFooter>
          </Card>

          <Card>
            <CardHead icon="restaurant" iconColor={colors.primary} title="Meals & Snacks" subtitle="Calories and logs by meal type" badge="Types" />
            <View style={{ gap: 8 }}>
              {mealTypes.map((m: any) => {
                const mi = mealIcon(m.mealType);
                return (
                  <View key={m.mealType} style={[styles.splitBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.splitTitle, { color: colors.text }]}>
                        <Ionicons name={mi.icon as any} size={13} color={mi.color} />  {m.mealType} <Text style={{ color: colors.textMuted, fontSize: 10 }}>({m.count})</Text>
                      </Text>
                      <Text style={[styles.splitSub, { color: colors.textMuted }]}>{Math.round(m.calories || 0).toLocaleString()} kcal · <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{m.pct}%</Text></Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.border }]}>
                      <View style={[styles.fill, { width: `${Math.min(100, m.pct || 0)}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.splitSub, { color: colors.textMuted }]}>P: {m.protein}g</Text>
                      <Text style={[styles.splitSub, { color: colors.textMuted }]}>C: {m.carbs}g</Text>
                      <Text style={[styles.splitSub, { color: colors.textMuted }]}>F: {m.fat}g</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <CardFooter>
              <FooterStat label="Total:" value={`${mealTypes.reduce((s: number, m: any) => s + (m.count || 0), 0)} meals logged`} />
            </CardFooter>
          </Card>

          {/* ── 7. TOP FOODS + RECENT MEALS ── */}
          <View onLayout={markSection('foods')} />
          {topFoods.length > 0 && (
            <Card>
              <CardHead icon="star" iconColor={CHART_COLORS.amber} title="Top Foods" subtitle="Most logged in range" />
              {topFoods.map((f: any, i: number) => (
                <View key={i} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={[styles.rank, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.rankText, { color: colors.primary }]}>{f.rank || i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{f.loggedCount}x · {Math.round(f.avgCalories || 0)} kcal · P {Math.round(f.avgProtein || 0)}g</Text>
                  </View>
                  <Text style={[styles.rowVal, { color: colors.text }]}>{Math.round(f.totalCalories || 0).toLocaleString()}</Text>
                </View>
              ))}
            </Card>
          )}

          <View onLayout={markSection('recent')} />
          {recent.length > 0 && (
            <Card>
              <CardHead icon="images" iconColor={colors.primary} title="Recent Meals" subtitle="Your latest logs" badge={`${recent.length}`} />
              <View style={styles.mealGrid}>
                {recent.map((m: any) => (
                  <View key={m.id} style={[styles.mealTile, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    {m.imageUrl ? (
                      <OptimizedImage uri={m.imageUrl} style={styles.mealImg} />
                    ) : (
                      <View style={[styles.mealImg, { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="restaurant-outline" size={22} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={[styles.mealType, { color: colors.text }]} numberOfLines={1}>{m.mealType}</Text>
                    <Text style={[styles.mealCal, { color: colors.textMuted }]}>{Math.round(m.calories || 0)} kcal · {Math.round(m.protein || 0)}g P · {Math.round(m.carbs || 0)}g C · {Math.round(m.fat || 0)}g F</Text>
                    <Text style={[styles.mealDate, { color: colors.textMuted }]} numberOfLines={1}>{m.localDatetime || m.formattedDate || ''} {m.formattedTime || ''}</Text>
                    {(m.items || []).length > 0 && (
                      <Text style={[styles.mealDate, { color: colors.textMuted }]} numberOfLines={2}>
                        {(m.items || []).slice(0, 2).map((it: any) => it.name).join(' · ')}{(m.items || []).length > 2 ? ` +${(m.items || []).length - 2}` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn: { marginLeft: -6, padding: 4 },
  title: { fontFamily: FONTS.heading, fontSize: 24 },
  sub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  rank: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  rowTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  rowSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  rowVal: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  splitBox: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 7 },
  splitTitle: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  macroMiniTitle: { fontFamily: FONTS.bodyBold, fontSize: 11, marginBottom: 6 },
  splitSub: { fontFamily: FONTS.body, fontSize: 10 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  widget: { flex: 1, minWidth: '47%', borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  widgetTitle: { fontFamily: FONTS.body, fontSize: 11 },
  widgetBig: { fontFamily: FONTS.bodyBold, fontSize: 20 },
  widgetVerdict: { fontFamily: FONTS.bodyBold, fontSize: 10, lineHeight: 14 },
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mealTile: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 8 },
  mealImg: { width: '100%', height: 90, borderRadius: 10, marginBottom: 8 },
  mealType: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  mealCal: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
  mealDate: { fontFamily: FONTS.body, fontSize: 10, marginTop: 2, opacity: 0.8 },
});
