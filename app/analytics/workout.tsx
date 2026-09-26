import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, FlatList, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { parseStoredWeight, parseStoredHeight } from '../../utils/units';
import ExerciseCard from '../../components/exercises/ExerciseCard';
import BodyStatusCard from '../../components/home/BodyStatusCard';
import { TrendChart, TapBarChart } from '../../components/analytics/WeightStyleCharts';
import {
  Card, CardHead, KpiTile, ProgressRow, RangeChips,
  ThemedDonut, ChartToggle, CardFooter, FooterStat, MiniStatGrid,
  ChipRow, KeyValue, StickyBar, SectionNav, AnalyticsSkeleton, EmptyState,
  CHART_COLORS, BODY_PART_COLORS, AnalyticsRange,
} from '../../components/analytics/AnalyticsUI';
// Note: CardTitle intentionally not imported (all cards use CardHead).

const SCREEN_W = Dimensions.get('window').width;

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'progress', label: 'Progress', icon: 'bar-chart' },
  { key: 'volume', label: 'Volume', icon: 'trending-up' },
  { key: 'rhythm', label: 'Rhythm', icon: 'calendar' },
  { key: 'pacing', label: 'Pacing', icon: 'timer' },
  { key: 'muscles', label: 'Muscles', icon: 'body' },
  { key: 'prs', label: 'PRs', icon: 'trophy' },
];

const PROG_METRICS = [
  { key: 'maxWeight', label: 'Max Wt', color: '#F7CB16', unit: 'kg', point: 'maxWeight' },
  { key: 'estimated1rm', label: '1RM', color: '#06B6D4', unit: 'kg', point: 'estimated1rm' },
  { key: 'volume', label: 'Volume', color: '#8B5CF6', unit: 'kg', point: 'totalVolume' },
  { key: 'reps', label: 'Max Reps', color: '#10B981', unit: 'reps', point: 'maxReps' },
  { key: 'avgWeight', label: 'Avg Wt', color: '#F97316', unit: 'kg', point: 'avgWeight' },
] as const;
type ProgMetric = typeof PROG_METRICS[number]['key'];
const PROG_RANGES = [
  { key: '7d', label: '7D' }, { key: '30d', label: '30D' }, { key: '90d', label: '90D' },
  { key: '6m', label: '6M' }, { key: '1y', label: '1Y' }, { key: 'all', label: 'ALL' },
];

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};
const shortDate = (iso: string) => {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(p[1], 10) - 1] || p[1]} ${p[2]}`;
  }
  return iso.slice(5);
};
const fmtVol = (kg: number) => {
  if (kg >= 1000000) return `${(kg / 1000000).toFixed(2)}M`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
  return `${Math.round(kg).toLocaleString()}`;
};
const fmtHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
};

export default function WorkoutAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const scrollRef = React.useRef<ScrollView>(null);
  const sectionY = React.useRef<Record<string, number>>({});
  const [volView, setVolView] = useState<'timeline' | 'fatigue'>('timeline');
  const [timeView, setTimeView] = useState<'curve' | 'bars'>('curve');
  // Progression explorer
  const [exList, setExList] = useState<any[]>([]);
  const [exWorkouts, setExWorkouts] = useState<any[]>([]);
  const [exQuery, setExQuery] = useState('');
  const [exCategory, setExCategory] = useState('all');
  const [exWorkout, setExWorkout] = useState('all');
  const [exId, setExId] = useState<string | null>(null);
  const [exMetric, setExMetric] = useState<ProgMetric>('maxWeight');
  const [exRange, setExRange] = useState('all');
  const [prog, setProg] = useState<any>(null);
  const [progLoading, setProgLoading] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  // Profile for the home body-status card
  const [profile, setProfile] = useState<any>(null);

  const fetchData = useCallback(async (r: AnalyticsRange, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await axios.get(`${API_URL}/daily/analytics`, {
        params: { range: r, tz },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setUpdated(new Date());
    } catch (err) {
      console.error('Workout analytics error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const jumpTo = (key: string) => {
    setActiveSection(key);
    const y = sectionY.current[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 110), animated: true });
  };

  const markSection = (key: string) => (e: any) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const fetchExercises = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/daily/exercises`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExList(res.data?.exercises || []);
      setExWorkouts(res.data?.workouts || []);
    } catch (err) {
      console.error('Exercises error:', err);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  const fetchProgression = useCallback(async (id: string, rg: string, wt: string) => {
    setProgLoading(true);
    try {
      const token = await getToken();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await axios.get(`${API_URL}/daily/exercise-progression`, {
        params: { exerciseId: id, range: rg, tz, workoutTitle: wt !== 'all' ? wt : undefined },
        headers: { Authorization: `Bearer ${token}` },
      });
      setProg(res.data);
    } catch (err) {
      console.error('Progression error:', err);
    } finally {
      setProgLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData(range);
    fetchExercises();
    loadProfile();
  }, [fetchData, fetchExercises, loadProfile, range]));

  // Auto-select the first lift so the curve shows immediately
  useEffect(() => {
    if (!exId && exList.length > 0) {
      const first = String(exList[0].id);
      setExId(first);
      fetchProgression(first, exRange, exWorkout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exList]);

  const selectExercise = (id: string) => {
    setExId(id);
    fetchProgression(id, exRange, exWorkout);
  };

  const k = data?.kpis;
  const timeline = data?.timeline || [];
  const sessionBars = timeline.map((t: any) => ({ value: t.workoutsCount || 0, label: shortDate(t.date), hint: `${fmtDate(t.date)} · ${Math.round(t.volumeKg || 0).toLocaleString()} kg` }));
  const durationBars = timeline.map((t: any) => ({ value: Math.round(t.durationMinutes || 0), label: shortDate(t.date), hint: `${fmtDate(t.date)} · ${Math.round(t.calories || 0)} kcal` }));
  const volPoints = timeline.map((t: any) => ({ value: Math.round(t.volumeKg || 0), label: shortDate(t.date), hint: `${fmtDate(t.date)} · ${t.workoutsCount || 0} sessions · ${Math.round(t.durationMinutes || 0)}m${(t.prsCount || 0) > 0 ? ` · ${t.prsCount} PRs` : ''}` }));
  const fatigue = data?.fatigueDecay || [];
  const fatigueBars = fatigue.map((f: any) => ({
    value: Math.round(f.avgSetVolume || 0), label: f.setNumber,
    hint: `Avg ${Math.round(f.avgWeightKg || 0)}kg · ${Math.round(f.avgReps || 0)} reps · ${f.dropOffPct || 0}%`,
  }));
  const muscle = data?.muscleDistribution || [];
  const dayOfWeek = data?.dayOfWeek || [];
  const maxDow = [...dayOfWeek].sort((a: any, b: any) => (b.count || 0) - (a.count || 0))[0];
  const dowBars = dayOfWeek.map((d: any) => ({ value: d.count || 0, label: d.shortDay || '', hint: `${d.day || ''} · ${Math.round(d.volume || 0).toLocaleString()} kg` }));
  const circadianRaw = data?.circadian || [];
  const periods = data?.timeOfDayPeriods || [];
  const peak = data?.peakWorkoutTime;
  const circadianBars = circadianRaw.map((c: any) => ({
    value: c.count || 0, label: fmtHour(c.hour),
    hint: `${fmtHour(c.hour)} – ${fmtHour((c.hour + 1) % 24)} · ${c.count || 0} sessions`,
    ...(peak && c.hour === peak.hour && (c.count || 0) > 0 ? { color: CHART_COLORS.sky } : {}),
  }));
  const peakLabel = peak?.label || '8 PM';
  const schemes = data?.repSchemes;
  const skipped = data?.skippedExercises || [];
  const ratings = data?.ratingsDistribution || [];
  const maxRating = Math.max(...ratings.map((r: any) => r.count || 0), 1);
  const topPrs = (data?.topPrs || []).slice(0, 8);
  const muscleTargets = (data?.muscleTargets || []).slice(0, 8);
  const maxTarget = Math.max(...muscleTargets.map((m: any) => m.volumeKg || 0), 1);
  const heat = data?.muscleHeatMap || [];

  // Home body-status card inputs
  const genderRaw = ((data?.meta?.selectedUser?.gender || profile?.gender || 'male') as string).trim().toLowerCase();
  const gender = (genderRaw === 'female' || genderRaw === 'f' || genderRaw === 'woman' ? 'female' : 'male') as 'male' | 'female';
  const weightKg = parseStoredWeight(profile?.weight) || 70;
  const heightCm = parseStoredHeight(profile?.height) || 170;
  const heatActivity = heat
    .filter((h: any) => (h.intensity || 0) > 0)
    .map((h: any) => ({ slug: (h.slug === 'abductors' ? 'adductors' : h.slug) as any, intensity: Math.min(50, Math.max(1, Math.round(h.intensity || 0))) }));
  const last7 = timeline.slice(-7);
  const weeklyCount = last7.reduce((s: number, t: any) => s + (t.workoutsCount || 0), 0);
  // Exercise slider: categories + filtered list, mapped to ExerciseCard fields
  const exCategories = Array.from(new Set(exList.map((e: any) => e.category).filter(Boolean))).sort() as string[];
  const q = exQuery.trim().toLowerCase();
  const sliderEx = exList
    .filter((e: any) => (exCategory === 'all' || (e.category || '') === exCategory) && (!q || (e.name || '').toLowerCase().includes(q)))
    .map((e: any) => ({ ...e, image_url: e.imageUrl || e.image_url, gif_url: e.gifUrl || e.gif_url }));
  const selectedEx = sliderEx.find((e: any) => String(e.id) === String(exId)) || exList.find((e: any) => String(e.id) === String(exId));
  const metricCfg = PROG_METRICS.find((m) => m.key === exMetric)!;
  const progPoints = (prog?.timeline || []).map((p: any) => ({
    value: Math.round((p[metricCfg.point] || 0) * 10) / 10,
    label: p.shortDate || shortDate(p.formattedDate),
    hint: `${p.formattedDate || ''} · ${p.workoutTitle || ''} · ${p.setsCompleted || 0} sets · ${Math.round(p.totalVolume || 0)} kg vol`,
  }));
  const progHistory = prog?.timeline || [];
  const progSum = prog?.summary;
  const activePct = (k?.totalDurationMinutes || 0) > 0
    ? Math.round(((k?.activeDurationMinutes || 0) / (k?.totalDurationMinutes || 1)) * 100) : 70;
  const completionPct = (k?.totalExercisesPerformed || 0) > 0
    ? Math.round((((k?.totalExercisesPerformed || 0) - (k?.skippedExercisesCount || 0)) / (k?.totalExercisesPerformed || 1)) * 100) : 100;
  const avgTutPerSet = (k?.totalSets || 0) > 0 ? Math.round(((k?.totalTutMinutes || 0) * 60) / (k?.totalSets || 1)) : 0;
  const weeklyAvg = (k?.totalWorkouts || 0) > 0 ? ((k?.totalWorkouts || 0) / 4).toFixed(1) : null;

  const hasData = !!data && ((data?.kpis?.totalWorkouts || 0) > 0 || (data?.timeline || []).length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Workout Analytics</Text>
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
            icon="barbell"
            title="No workouts yet"
            message="Finish your first workout and your volume, streaks, muscles and PRs will light up here."
            actionLabel="Start a Workout"
            onAction={() => router.push('/daily/new' as any)}
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

          {/* ── 1. KPI HERO RIBBON (same 6 tiles as admin) ── */}
          {k && (
            <View style={styles.kpiGrid}>
              <KpiTile icon="barbell" label="Total Volume" value={`${fmtVol(k.totalVolumeKg || 0)} kg`} sub={`Avg ${Math.round(k.avgVolumeKg || 0)} kg / session`} color={CHART_COLORS.amber} />
              <KpiTile icon="checkmark-circle" label="Workouts Completed" value={`${k.completedWorkouts ?? 0}/${k.totalWorkouts ?? 0}`} sub={`${k.completionRate ?? 0}% completion`} color={CHART_COLORS.sky} />
              <KpiTile icon="time" label="Avg Duration" value={`${k.avgDurationMinutes ?? 0} mins`} sub={`Total ${(k.totalDurationMinutes || 0) >= 60 ? `${Math.floor((k.totalDurationMinutes || 0) / 60)}h ${(k.totalDurationMinutes || 0) % 60}m` : `${k.totalDurationMinutes || 0}m`}`} color="#818CF8" />
              <KpiTile icon="trophy" label="PRs Hit" value={`${k.totalPrsHit ?? 0} records`} sub={`${k.uniqueExercisesCount ?? 0} exercises used`} color={CHART_COLORS.amber} />
              <KpiTile icon="flame" label="Calories Burned" value={`${(k.totalCaloriesBurned || 0) > 1000 ? `${((k.totalCaloriesBurned || 0) / 1000).toFixed(1)}k` : Math.round(k.totalCaloriesBurned || 0)} kcal`} sub={`${k.calorieBurnRateKcalMin ?? 0} kcal/min`} color={CHART_COLORS.rose} />
              <KpiTile icon="layers" label="Total Sets" value={`${(k.totalSets || 0).toLocaleString()} sets`} sub={`${(k.totalReps || 0).toLocaleString()} total reps`} color={CHART_COLORS.emerald} />
            </View>
          )}

          {/* ── 2. EXERCISE PROGRESS & HISTORY ── */}
          <View onLayout={markSection('progress')} />
          <Card>
            <CardHead
              icon="trending-up" iconColor={CHART_COLORS.amber} title="Exercise Progress & History"
              subtitle="Swipe your lifts, tap one to track it"
              badge={exList.length ? `${exList.length} lifts` : undefined}
            />
            <TextInput
              value={exQuery}
              onChangeText={setExQuery}
              placeholder="Search your lifts…"
              placeholderTextColor={colors.textDim}
              style={[styles.search, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />
            {exCategories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll} style={{ marginBottom: 12 }}>
                {['all', ...exCategories].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setExCategory(c)}
                    activeOpacity={0.7}
                    style={[styles.pill, { borderColor: colors.border, backgroundColor: exCategory === c ? colors.primary : 'transparent' }]}
                  >
                    <Text style={[styles.pillText, { color: exCategory === c ? '#FFF' : colors.textMuted }]}>{c === 'all' ? 'All' : c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {sliderEx.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
                {sliderEx.map((item: any) => {
                  const sel = String(item.id) === String(exId);
                  return (
                    <View key={String(item.id)} style={{ width: 300, borderWidth: sel ? 2 : 0, borderColor: colors.primary, borderRadius: 26, padding: sel ? 0 : 2 }}>
                      <ExerciseCard exercise={item} onPress={(ex: any) => selectExercise(String(ex.id))} />
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={[styles.rowSub, { color: colors.textMuted, marginBottom: 4 }]}>
                No lifts match — try another category or search.
              </Text>
            )}

            {!exId ? (
              <Text style={[styles.rowSub, { color: colors.textMuted, marginTop: 12 }]}>
                Select a lift above to see its curve and full history.
              </Text>
            ) : (
              <View style={{ marginTop: 14 }}>
                <View style={[styles.rmRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Ionicons name="flash" size={16} color={CHART_COLORS.amber} />
                  <Text style={[styles.rmText, { color: colors.text }]}>
                    1RM: {Math.round(selectedEx?.maxEstimated1rm || progSum?.maxEstimated1RM || 0)} kg
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    {(selectedEx?.totalSessionsCount ?? progSum?.sessionsCount ?? 0)} sessions
                  </Text>
                </View>

                <View style={{ height: 12 }} />
                <ChipRow
                  value={exMetric}
                  onChange={(m) => setExMetric(m)}
                  options={PROG_METRICS.map((m) => ({ key: m.key as ProgMetric, label: m.label }))}
                />
                <ChipRow
                  value={exRange}
                  onChange={(r) => { setExRange(r); if (exId) fetchProgression(exId, r, exWorkout); }}
                  options={PROG_RANGES.map((r) => ({ key: r.key, label: r.label }))}
                />

                {progLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                ) : (
                  <>
                    <TrendChart
                      data={progPoints}
                      color={metricCfg.color}
                      unit={metricCfg.unit}
                      showDeltas
                      deltaUpGood
                      deltaFormat={(d) => `${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}${metricCfg.unit === 'reps' ? '' : 'kg'}`}
                      legendLabel={`${metricCfg.label} (${metricCfg.unit})`}
                      scrollHint={`Scroll horizontally to view past workouts (${progHistory.length} sessions)`}
                      emptyText="Log at least 2 sessions with this lift to see its curve."
                      stats={progSum ? [
                        { label: 'Start Weight', value: `${progSum.startWeight ?? 0} kg` },
                        { label: 'Latest Weight', value: `${progSum.currentWeight ?? 0} kg` },
                        {
                          label: 'Weight Change',
                          value: `${(progSum.weightDelta || 0) > 0 ? '+' : ''}${progSum.weightDelta ?? 0} kg (${progSum.weightDeltaPct ?? 0}%)`,
                          color: (progSum.weightDelta || 0) > 0 ? '#34d399' : (progSum.weightDelta || 0) < 0 ? '#f87171' : undefined,
                        },
                        { label: 'Personal Record', value: `${progSum.maxWeightAllTime ?? 0} kg` },
                      ] : undefined}
                    />
                    {!!progSum?.prDate && (
                      <KeyValue label="Record date" value={progSum.prDate} />
                    )}

                    {exWorkouts.length > 0 && (
                      <View style={[styles.pillWrap, { marginTop: 12 }]}>
                        {['all', ...exWorkouts.slice(0, 6).map((w: any) => w.title || w)].map((wt: string) => (
                          <TouchableOpacity
                            key={wt}
                            onPress={() => { setExWorkout(wt); if (exId) fetchProgression(exId, exRange, wt); }}
                            activeOpacity={0.7}
                            style={[styles.pill, { borderColor: colors.border, backgroundColor: exWorkout === wt ? colors.primary + '18' : 'transparent' }]}
                          >
                            <Text style={[styles.pillText, { color: exWorkout === wt ? colors.primary : colors.textMuted }]} numberOfLines={1}>{wt === 'all' ? 'All workouts' : wt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text style={[styles.listHead, { color: colors.text, marginTop: 14 }]}>
                      Workout History ({progHistory.length}): <Text style={{ color: colors.textMuted, fontSize: 11 }}>tap a workout to see sets</Text>
                    </Text>
                    {progHistory.length === 0 && !progLoading && (
                      <Text style={[styles.rowSub, { color: colors.textMuted }]}>No sessions in this range.</Text>
                    )}
                    {progHistory.map((p: any) => {
                      const open = expandedWorkout === p.workoutId;
                      return (
                        <View key={p.workoutId} style={[styles.histCard, { backgroundColor: colors.inputBg, borderColor: open ? colors.primary : colors.border }]}>
                          <TouchableOpacity onPress={() => setExpandedWorkout(open ? null : p.workoutId)} activeOpacity={0.7}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{p.formattedDate}</Text>
                                  {p.isPersonalRecord && (
                                    <View style={[styles.prBadge, { backgroundColor: '#f87171' + '20', borderColor: '#f87171' + '50' }]}>
                                      <Text style={[styles.prText, { color: '#f87171' }]}>PR</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.rowTitle, { color: colors.text, marginTop: 2 }]} numberOfLines={1}>{p.workoutTitle}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.rowVal, { color: colors.text }]}>{Math.round(p.maxWeight || 0)} kg</Text>
                                <Text style={[styles.rowSub, { color: colors.textMuted }]}>{p.setsCompleted || 0} sets · {Math.round(p.totalVolume || 0)} kg vol</Text>
                              </View>
                              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                            </View>
                          </TouchableOpacity>
                          {open && (
                            <View style={[styles.setList, { borderColor: colors.border }]}>
                              {(p.sets || []).map((s: any, si: number) => {
                                const best = Number(s.weight) === Number(p.maxWeight) && Number(p.maxWeight) > 0;
                                return (
                                  <View key={si} style={[styles.setRow, best && { backgroundColor: colors.primary + '12' }]}>
                                    <Text style={[styles.setText, { color: colors.text }]}>
                                      Set {s.set_number}: {s.weight}kg × {s.reps}
                                    </Text>
                                    {best && (
                                      <Text style={[styles.bestTag, { color: colors.primary }]}>Best</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </Card>

          {/* ── 3. VOLUME INSIGHTS (timeline toggle + bottom metrics + muscle donut) ── */}
          <View onLayout={markSection('volume')} />
          <Card>
            <CardHead
              icon="barbell" iconColor={CHART_COLORS.amber}
              title={volView === 'timeline' ? 'Workout Volume' : 'Weight Lifted by Set'}
              subtitle={volView === 'timeline' ? 'Daily lifting volume (kg) across workouts' : 'Average weight and reps across Set 1 to Set 5+'}
              badge={`${timeline.length} Sessions`}
              right={
                <ChartToggle
                  value={volView}
                  onChange={setVolView}
                  options={[
                    { key: 'timeline', label: 'Volume Over Time' },
                    { key: 'fatigue', label: 'Sets Breakdown' },
                  ]}
                />
              }
            />
            {volView === 'timeline' ? (
              <TrendChart
                data={volPoints}
                color={CHART_COLORS.gold}
                unit="kg"
                showDeltas
                deltaUpGood
                deltaFormat={(d) => `${d > 0 ? '+' : ''}${fmtVol(d)}kg`}
                legendLabel="Volume (kg)"
                scrollHint={`Scroll horizontally to view past workouts (${timeline.length} sessions)`}
                emptyText="No volume data logged in this timeframe."
              />
            ) : (
              <TapBarChart
                data={fatigueBars}
                color={CHART_COLORS.primary}
                height={210}
                unit="kg"
                emptyText="No set data available for fatigue decay analysis."
              />
            )}
            {k && (
              <MiniStatGrid items={[
                { label: 'Avg Session Tonnage', value: `${Math.round(k.avgVolumeKg || 0).toLocaleString()} kg` },
                { label: 'Relative Ratio', value: `${k.relativeVolumeRatio ?? 0}x Bodyweight`, valueColor: CHART_COLORS.amber },
                { label: 'Active Lift Time', value: `${k.activeDurationMinutes ?? 0} mins`, valueColor: CHART_COLORS.sky },
                { label: 'Workload Rate', value: `${k.trainingDensityKgMin ?? 0} kg/min`, valueColor: CHART_COLORS.emerald },
              ]} />
            )}
          </Card>

          <View onLayout={markSection('muscles')} />
          <Card>
            <CardHead icon="pie-chart" iconColor={CHART_COLORS.sky} title="Volume by Muscle Group" subtitle="Total kilograms lifted per muscle group" />
            <ThemedDonut
              centerTop={k ? (k.totalVolumeKg >= 1000 ? `${(k.totalVolumeKg / 1000).toFixed(0)}k kg` : `${k.totalVolumeKg} kg`) : ''}
              centerBottom="Total"
              legend="list"
              data={muscle.slice(0, 8).map((m: any, i: number) => ({
                value: m.volume || 0, color: BODY_PART_COLORS[i % BODY_PART_COLORS.length],
                text: m.bodyPart, sub: `${Math.round(m.volume || 0).toLocaleString()} kg`,
              }))}
            />
          </Card>

          {/* ── 3. FREQUENCY (day histogram + 24h curve/bars + consistency gauges) ── */}
          <View onLayout={markSection('rhythm')} />
          <Card>
            <CardHead
              icon="calendar" iconColor={CHART_COLORS.amber} title="Workouts by Day"
              subtitle="Workouts logged from Monday to Sunday"
              badge={maxDow && maxDow.count > 0 ? `Most: ${maxDow.shortDay}` : undefined}
            />
            <TapBarChart
              data={dowBars}
              color={CHART_COLORS.gold}
              height={170}
              unit=""
            />
            <CardFooter>
              <FooterStat label="Weekly Average:" value={weeklyAvg ? `${weeklyAvg} workouts/week` : '—'} />
            </CardFooter>
          </Card>

          <Card>
            <CardHead
              icon="time" iconColor={CHART_COLORS.sky} title="Workout Time of Day"
              subtitle="24-hour distribution of workout start times"
              badge={peak ? `Peak: ${peakLabel}` : undefined}
              right={<ChartToggle value={timeView} onChange={setTimeView} options={[{ key: 'curve', label: 'Curve' }, { key: 'bars', label: 'Bars' }]} />}
            />
            {timeView === 'curve' ? (
              <TrendChart
                data={circadianRaw.map((c: any) => {
                  const h = c.hour ?? 0;
                  const nh = (h + 1) % 24;
                  return {
                    value: c.count || 0,
                    label: fmtHour(h),
                    hint: `${fmtHour(h)} – ${fmtHour(nh)}${peak && h === peak.hour && (c.count || 0) > 0 ? ' · Peak window' : ''}`,
                  };
                })}
                color={CHART_COLORS.sky}
                height={170}
                showAvg={false}
                showMinMax={false}
                unit="sessions"
              />
            ) : (
              <TapBarChart
                data={circadianBars}
                color={CHART_COLORS.sky}
                height={170}
                unit="sessions"
              />
            )}
            <View style={[styles.periodBar, { backgroundColor: colors.inputBg }]}>
              {periods.map((p: any) => (
                (p.pct || 0) > 0 && (
                  <View
                    key={p.period}
                    style={{
                      width: `${p.pct}%`, height: '100%',
                      backgroundColor: p.period === 'morning' ? CHART_COLORS.amber : p.period === 'afternoon' ? CHART_COLORS.sky : p.period === 'evening' ? CHART_COLORS.purple : '#818CF8',
                    }}
                  />
                )
              ))}
            </View>
            <View style={styles.periodRow}>
              {periods.map((p: any) => (
                <Text key={p.period} style={[styles.periodText, { color: colors.textMuted }]}>
                  {p.label.slice(0, 4)}: <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{p.count}</Text>
                </Text>
              ))}
            </View>
          </Card>

          <Card>
            <CardHead icon="shield-checkmark" iconColor={CHART_COLORS.emerald} title="Workout Consistency" subtitle="Completed vs unfinished workouts" />
            <Text style={[styles.gaugeLabel, { color: colors.textMuted }]}>Completion Rate · <Text style={{ color: CHART_COLORS.emerald, fontFamily: FONTS.bodyBold }}>{k?.completionRate ?? 0}%</Text></Text>
            <View style={[styles.track, { backgroundColor: colors.inputBg }]}>
              <View style={[styles.fill, { width: `${Math.min(100, k?.completionRate || 0)}%`, backgroundColor: CHART_COLORS.emerald }]} />
            </View>
            <View style={styles.duoGrid}>
              <View style={[styles.miniBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Completed</Text>
                <Text style={[styles.miniValue, { color: colors.text }]}>{k?.completedWorkouts ?? 0}</Text>
              </View>
              <View style={[styles.miniBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Unfinished</Text>
                <Text style={[styles.miniValue, { color: CHART_COLORS.amber }]}>{(k?.activeWorkouts || 0) + (k?.abandonedWorkouts || 0)}</Text>
              </View>
            </View>
            <View style={[styles.streakBanner, { backgroundColor: CHART_COLORS.amber + '15', borderColor: CHART_COLORS.amber + '40' }]}>
              <Ionicons name="flame" size={16} color={CHART_COLORS.amber} />
              <Text style={[styles.streakText, { color: CHART_COLORS.amber }]}>Longest Streak · {k?.maxStreakRecorded ?? 0} Days</Text>
            </View>
            <CardFooter>
              <FooterStat label="Last Active:" value={k?.lastWorkoutAt ? new Date(k.lastWorkoutAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
            </CardFooter>
          </Card>

          {/* ── 4. DURATION & PACING (4 widgets, same as admin) ── */}
          <View onLayout={markSection('pacing')} />
          <Card>
            <CardHead
              icon="time" iconColor="#818CF8" title="Workout Time & Rest"
              subtitle="Active lifting time vs rest time between sets"
              badge={`${k?.avgDurationMinutes ?? 0} mins avg / workout`}
            />
            <View style={styles.widgetGrid}>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Active vs Rest · <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{activePct}% Active</Text></Text>
                <View style={[styles.splitTrack, { backgroundColor: colors.border }]}>
                  <View style={{ width: `${activePct}%`, backgroundColor: CHART_COLORS.sky, height: '100%' }} />
                  <View style={{ width: `${100 - activePct}%`, backgroundColor: '#818CF8CC', height: '100%' }} />
                </View>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>{k?.activeDurationMinutes ?? 0}m active · {k?.totalRestMinutes ?? 0}m rest</Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Avg Rest Between Sets · <Text style={{ color: CHART_COLORS.amber, fontFamily: FONTS.bodyBold }}>{k?.avgRestPerSetSec ?? 0}s</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Typical target: 60s - 90s</Text>
                <Text style={[styles.widgetVerdict, { color: (k?.avgRestPerSetSec || 0) <= 90 ? CHART_COLORS.emerald : CHART_COLORS.amber }]}>
                  {(k?.avgRestPerSetSec || 0) <= 90 ? 'Good rest pacing' : 'Notice: Longer rest periods'}
                </Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Lifting Rate · <Text style={{ color: CHART_COLORS.emerald, fontFamily: FONTS.bodyBold }}>{k?.trainingDensityKgMin ?? 0}</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Kilograms lifted per active minute</Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Active time: {k?.activeDurationMinutes ?? 0} mins</Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Total Lifting Time · <Text style={{ color: CHART_COLORS.purple, fontFamily: FONTS.bodyBold }}>{k?.totalTutMinutes ?? 0} mins</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Time performing exercise sets</Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Avg per set: ~{avgTutPerSet}s</Text>
              </View>
            </View>
          </Card>

          {/* ── 5. SETS & REPS + SKIPPED ── */}
          <Card>
            <CardHead icon="layers" iconColor={CHART_COLORS.emerald} title="Set Schemes" subtitle={`${(k?.totalReps || 0).toLocaleString()} total reps`} />
            <ProgressRow label="Power (1–5 reps)" value={`${schemes?.powerCount || 0} sets · ${schemes?.powerPct || 0}%`} pct={schemes?.powerPct || 0} color={CHART_COLORS.amber} />
            <ProgressRow label="Hypertrophy (6–12)" value={`${schemes?.hypertrophyCount || 0} sets · ${schemes?.hypertrophyPct || 0}%`} pct={schemes?.hypertrophyPct || 0} color={CHART_COLORS.sky} />
            <ProgressRow label="Endurance (13+)" value={`${schemes?.enduranceCount || 0} sets · ${schemes?.endurancePct || 0}%`} pct={schemes?.endurancePct || 0} color={CHART_COLORS.purple} />
            <MiniStatGrid items={[
              { label: 'Avg Reps / Set', value: `${k?.avgRepsPerSet ?? 0} reps` },
              { label: 'Avg Weight / Set', value: `${k?.avgWeightPerSetKg ?? 0} kg` },
              { label: 'Avg Sets / Exercise', value: `${k?.avgTargetSets ?? 0} sets` },
              { label: 'Exercises Logged', value: `${k?.totalExercisesPerformed ?? 0}`, valueColor: CHART_COLORS.sky },
            ]} />
          </Card>

          <Card>
            <CardHead
              icon="alert-circle" iconColor={CHART_COLORS.rose} title="Skipped Exercises"
              subtitle="Exercises marked skipped during workouts"
              badge={`${k?.skippedExercisesCount ?? 0} Skipped`}
            />
            {skipped.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>No exercises were skipped.</Text>
            ) : skipped.map((s: any, i: number) => (
              <View key={i} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text, textTransform: 'capitalize' }]} numberOfLines={1}>{s.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{s.bodyPart} • {s.totalScheduledCount} scheduled</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.rowVal, { color: CHART_COLORS.rose }]}>{s.skippedCount}x</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{s.skipRatePct}% skip</Text>
                </View>
              </View>
            ))}
            <CardFooter>
              <FooterStat label="Exercise Completion:" value={`${completionPct}%`} valueColor={CHART_COLORS.emerald} />
            </CardFooter>
          </Card>

          {/* ── 6. ENERGY & WELLNESS (4 panels, same as admin) ── */}
          <Card>
            <CardHead icon="heart" iconColor={CHART_COLORS.rose} title="Energy & Wellness" subtitle="Calories, intensity, hydration and ratings" />
            <View style={styles.widgetGrid}>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Calories · <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{(k?.totalCaloriesBurned || 0).toLocaleString()} kcal</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Avg {k?.avgCaloriesBurned ?? 0} kcal · {k?.calorieBurnRateKcalMin ?? 0} kcal/min</Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Intensity (MET) · <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{k?.avgMet && k.avgMet > 0 ? k.avgMet : '4.5'}</Text></Text>
                <Text style={[styles.widgetVerdict, { color: (k?.avgMet || 0) >= 6 ? CHART_COLORS.emerald : CHART_COLORS.amber }]}>
                  {(k?.avgMet || 0) >= 6 ? 'High Intensity' : 'Moderate-High'}
                </Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Water · <Text style={{ color: CHART_COLORS.sky, fontFamily: FONTS.bodyBold }}>{k?.totalWaterLiters ?? 0} L</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>Avg {k?.avgWaterLiters ?? 0} L — {(k?.avgWaterLiters || 0) >= 0.5 ? 'Well Hydrated' : 'Adequate'}</Text>
              </View>
              <View style={[styles.widget, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>Rating · <Text style={{ color: colors.text, fontFamily: FONTS.bodyBold }}>{k?.avgRating && k.avgRating > 0 ? k.avgRating : '4.9'}/5</Text></Text>
                <Text style={[styles.widgetSub, { color: colors.textMuted }]}>{k?.totalRatingsCount ?? 0} reviews</Text>
              </View>
            </View>
            {ratings.length > 0 && (
              <View style={{ marginTop: 4 }}>
                {ratings.map((r: any, i: number) => (
                  <ProgressRow key={i} label={`${r.stars || `${r.score} stars`}`} value={`${r.count} votes`} pct={((r.count || 0) / maxRating) * 100} color={CHART_COLORS.gold} />
                ))}
              </View>
            )}
          </Card>

          {/* ── SESSIONS & MINUTES ── */}
          <Card>
            <CardHead icon="bar-chart" iconColor={CHART_COLORS.emerald} title="Sessions & Minutes" subtitle="Workouts and active minutes per day" />
            <TapBarChart data={sessionBars} color={CHART_COLORS.emerald} unit="sessions" />
            <View style={{ height: 14 }} />
            <TapBarChart data={durationBars} color={CHART_COLORS.sky} unit="mins" />
          </Card>

          {/* ── 7. TOP PRs + MUSCLE TARGETS ── */}
          <View onLayout={markSection('prs')} />
          {topPrs.length > 0 && (
            <Card>
              <CardHead icon="trophy" iconColor={CHART_COLORS.amber} title="Top PRs" subtitle="Heaviest lifts in range" badge={`${topPrs.length} lifts`} />
              {topPrs.map((p: any, i: number) => (
                <View key={i} style={[styles.row, { borderColor: colors.border }]}>
                  <View style={[styles.rank, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.rankText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{p.bodyPart} · {p.prsCount} PRs · 1RM {Math.round(p.maxEstimated1rm || 0)} kg</Text>
                  </View>
                  <Text style={[styles.rowVal, { color: colors.text }]}>{Math.round(p.maxWeightKg || 0)} kg</Text>
                </View>
              ))}
            </Card>
          )}

          {muscleTargets.length > 0 && (
            <Card>
              <CardHead icon="locate" iconColor={CHART_COLORS.purple} title="Muscle Targets" subtitle="Volume by target muscle" />
              {muscleTargets.map((m: any, i: number) => (
                <ProgressRow
                  key={i}
                  label={`${m.bodyPart} · ${m.target}`}
                  value={`${fmtVol(m.volumeKg || 0)} kg · ${m.exercisesCount || 0} ex · ${m.prsCount || 0} PRs`}
                  pct={((m.volumeKg || 0) / maxTarget) * 100}
                  color={BODY_PART_COLORS[i % BODY_PART_COLORS.length]}
                />
              ))}
            </Card>
          )}

          {/* ── 8. BODY HEAT MAP — home screen component, fed by analytics range ── */}
          {heat.length > 0 && (
            <View onLayout={markSection('heatbody')}>
              <BodyStatusCard
                gender={gender}
                weightKg={weightKg}
                heightCm={heightCm}
                bodyFat={profile?.body_fat}
                weeklyWorkouts={weeklyCount}
                totalWorkouts={k?.totalWorkouts || 0}
                dbMuscleActivity={heatActivity}
              />
            </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rank: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  rowTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  rowSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  rowVal: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  barValue: { fontFamily: FONTS.body, fontSize: 11 },
  empty: { fontFamily: FONTS.body, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
  periodBar: { height: 8, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', marginTop: 12 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  periodText: { fontFamily: FONTS.body, fontSize: 11 },
  gaugeLabel: { fontFamily: FONTS.body, fontSize: 11, marginBottom: 6 },
  track: { height: 10, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  duoGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10 },
  miniLabel: { fontFamily: FONTS.body, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  miniValue: { fontFamily: FONTS.bodyBold, fontSize: 15, marginTop: 4 },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 10 },
  streakText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  widget: { flex: 1, minWidth: '47%', borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  widgetTitle: { fontFamily: FONTS.body, fontSize: 11 },
  widgetSub: { fontFamily: FONTS.body, fontSize: 10, lineHeight: 14 },
  widgetVerdict: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  splitTrack: { height: 8, borderRadius: 999, overflow: 'hidden', flexDirection: 'row' },
  listHead: { fontFamily: FONTS.bodyBold, fontSize: 12, marginTop: 14, marginBottom: 8 },
  report: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  chipScroll: { gap: 8, paddingRight: 16 },
  rmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  rmText: { fontFamily: FONTS.bodyBold, fontSize: 14, flex: 1 },
  histCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  prBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  prText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  setList: { borderTopWidth: 1, marginTop: 10, paddingTop: 6, gap: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  setText: { fontFamily: FONTS.body, fontSize: 12 },
  bestTag: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  search: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44, fontFamily: FONTS.body, fontSize: 13, marginBottom: 12 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  pillText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
});
