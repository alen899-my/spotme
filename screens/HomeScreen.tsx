import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import axios from "axios";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

const { width: SW } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

// ── XP Tier colours ────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, [string, string]> = {
  Bronze:      ["#CD7F32", "#8B4513"],
  Silver:      ["#A8A9AD", "#6C6C6C"],
  Gold:        ["#FFD700", "#B8860B"],
  Platinum:    ["#00C9C8", "#007BFF"],
  Diamond:     ["#B9F2FF", "#00BFFF"],
  Master:      ["#9B59B6", "#6C3483"],
  Grandmaster: ["#E91E63", "#880E4F"],
  Elite:       ["#FF5722", "#BF360C"],
  Champion:    ["#E00000", "#7F0000"],
  Legend:      ["#FF9900", "#E00000"],
};

const TIER_XP: Record<string, number> = {
  Bronze:0, Silver:500, Gold:1500, Platinum:3000, Diamond:6000,
  Master:10000, Grandmaster:15000, Elite:20000, Champion:30000, Legend:50000,
};
const TIER_ORDER = Object.keys(TIER_XP);

function getXPProgress(tier: string, totalXP: number) {
  const idx = TIER_ORDER.indexOf(tier);
  const current = TIER_XP[tier] || 0;
  const next = TIER_XP[TIER_ORDER[idx + 1]] ?? current + 5000;
  const progress = Math.min((totalXP - current) / (next - current), 1);
  return { progress: isNaN(progress) ? 0 : progress, nextTier: TIER_ORDER[idx + 1] || "Legend", xpToNext: Math.max(next - totalXP, 0) };
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Simple bar chart (pure RN, no libs) ───────────────────────────────────────
function WeeklyBarChart({ data, colors }: { data: any[]; colors: any }) {
  const maxVal = Math.max(...data.map((d) => d.duration_seconds), 1);
  const chartH = 80;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: chartH + 24, paddingTop: 4 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.duration_seconds / maxVal) * chartH, d.workouts > 0 ? 4 : 2);
        const isToday = i === data.length - 1;
        return (
          <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: 6,
                backgroundColor: isToday ? "#E00000" : d.workouts > 0 ? "#E0000055" : colors.border,
              }}
            />
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10, color: isToday ? colors.text : colors.textMuted }}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Weight progress line chart (SVG) ───────────────────────────────────────────
function WeightSparkline({ data, colors }: { data: any[]; colors: any }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length < 2) return (
    <View style={{ alignItems: "center", paddingVertical: 16 }}>
      <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted }}>Log workouts with weight to see your trend</Text>
    </View>
  );

  const vals = data.map((d) => parseFloat(d.weight));
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const range = max - min || 1;
  const H = 80;
  const W = SW - 80; // Full width inside card with padding

  // Build SVG path
  const step = W / (vals.length - 1);
  let pathD = "";
  vals.forEach((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    if (i === 0) pathD += `M ${x} ${y} `;
    else pathD += `L ${x} ${y} `;
  });

  return (
    <View style={{ height: H + 30 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textMuted }}>{vals[0]}kg</Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: "#E00000" }}>{vals[vals.length - 1]}kg</Text>
      </View>
      <View style={{ height: H, width: "100%" }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Path d={pathD} fill="none" stroke="#E00000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => {
            const x = i * step;
            const y = H - ((v - min) / range) * H;
            const isSelected = selectedIdx === i;
            return (
              <React.Fragment key={i}>
                <Circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? "6" : "4"} 
                  fill="#E00000" 
                  stroke={colors.card} 
                  strokeWidth="2" 
                />
                {/* Invisible larger circle to make tapping easier */}
                <Circle 
                  cx={x} 
                  cy={y} 
                  r="16" 
                  fill="transparent" 
                  onPress={() => setSelectedIdx(isSelected ? null : i)}
                />
                {isSelected && (
                  <SvgText
                    x={x}
                    y={y - 12}
                    fill={colors.text}
                    fontSize="12"
                    fontFamily={FONTS.bodyBold}
                    textAnchor={i === 0 ? "start" : i === vals.length - 1 ? "end" : "middle"}
                  >
                    {v}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { router.replace("/"); return; }
      const res = await axios.get(`${API_URL}/daily/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  const handleStartWorkout = async () => {
    const rec = dashboard?.top_recommendation;
    if (!rec) { router.push("/(tabs)/daily"); return; }
    setStarting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(`${API_URL}/daily/workouts`, {
        title: `${rec.split_name} — ${rec.session_name}`,
        split_id: rec.split_id,
        session_id: rec.session_id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      router.push(`/daily/${res.data.id}` as any);
    } catch (err) {
      console.error("Start workout error:", err);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  const u = dashboard?.user || {};
  const today = dashboard?.today || {};
  const weekly = dashboard?.weekly_stats || [];
  const weightProgress = dashboard?.weight_progress || [];
  const rec = dashboard?.top_recommendation || null;

  const firstName = (u.full_name || "User").split(" ")[0];
  const tier = u.league_tier || "Bronze";
  const tierColors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const { progress: xpProgress, nextTier, xpToNext } = getXPProgress(tier, u.total_xp || 0);

  const waterGoalMl = 2500;
  const waterPct = Math.min((today.water_ml || 0) / waterGoalMl, 1);
  const weeklyWorkouts = weekly.filter((d: any) => d.workouts > 0).length;
  const weeklyMinutes = Math.round(weekly.reduce((s: number, d: any) => s + d.duration_seconds, 0) / 60);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header: Greeting ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()} 👋</Text>
          <Text style={[styles.name, { color: colors.text }]}>{firstName}</Text>
          {u.fitness_goal && (
            <View style={[styles.goalPill, { backgroundColor: "#E0000015", borderColor: "#E0000030" }]}>
              <Ionicons name="flag-outline" size={11} color="#E00000" />
              <Text style={styles.goalPillText}>{u.fitness_goal}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── XP / Level / Tier card ── */}
      <LinearGradient colors={[...tierColors, "#1a1a1a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.xpCard}>
        <View style={styles.xpTop}>
          <View>
            <Text style={styles.xpTierLabel}>{tier}</Text>
            <Text style={styles.xpLevel}>Level {u.level || 1}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={styles.xpBadgeText}>{(u.total_xp || 0).toLocaleString()} XP</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={styles.xpSubText}>{xpToNext.toLocaleString()} XP to {nextTier}</Text>
          <Text style={styles.xpSubText}>{Math.round(xpProgress * 100)}%</Text>
        </View>
      </LinearGradient>

      {/* ── Today's Stats row ── */}
      <View style={styles.statsRow}>
        {/* Calories Burned */}
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={["#E00000", "#7F0000"]} style={styles.statIconWrap}>
            <Ionicons name="flame" size={18} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.statVal, { color: colors.text }]}>{today.calories_burned || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>kcal burned</Text>
        </View>

        {/* Workout Streak */}
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={["#F59E0B", "#B45309"]} style={styles.statIconWrap}>
            <Ionicons name="flash" size={18} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.statVal, { color: colors.text }]}>{u.current_streak || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>day streak</Text>
        </View>

        {/* Water */}
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={styles.statIconWrap}>
            <Ionicons name="water" size={18} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.statVal, { color: colors.text }]}>
            {today.water_ml >= 1000 ? `${(today.water_ml / 1000).toFixed(1)}L` : `${today.water_ml || 0}ml`}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>water</Text>
        </View>

        {/* Calories eaten */}
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={["#10B981", "#047857"]} style={styles.statIconWrap}>
            <Ionicons name="restaurant" size={18} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.statVal, { color: colors.text }]}>{today.calories_consumed || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>kcal eaten</Text>
        </View>
      </View>

      {/* ── Exercise of the Day (Top Recommendation) ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercise to Try</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/exercises")} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {rec ? (
        <View style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.recCardInner}>
            {/* Left info */}
            <View style={{ flex: 1 }}>
              <View style={[styles.recTypePill, { backgroundColor: "#E0000015" }]}>
                <Ionicons name="sparkles" size={11} color="#E00000" />
                <Text style={[styles.recTypePillText, { color: "#E00000" }]}>{rec.scoreTag || "Recommended"}</Text>
              </View>
              <Text style={[styles.recName, { color: colors.text, fontSize: 18 }]} numberOfLines={2}>
                {rec.exercise_name}
              </Text>
              <Text style={[styles.recSplit, { color: colors.textMuted }]}>{rec.category}</Text>
              
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {rec.target && (
                  <View style={[styles.targetPill, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.targetPillText, { color: colors.textDim }]}>{rec.target}</Text>
                  </View>
                )}
                {rec.equipment && rec.equipment !== 'body weight' && (
                  <View style={[styles.targetPill, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.targetPillText, { color: colors.textDim }]}>{rec.equipment}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right exercise preview images */}
            {rec.image_url && (
              <Image source={{ uri: rec.image_url }} style={styles.recThumb} />
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", paddingVertical: 28 }]}
          onPress={() => router.push("/(tabs)/exercises")}
          activeOpacity={0.85}
        >
          <Ionicons name="fitness-outline" size={36} color="#E00000" />
          <Text style={[styles.recName, { color: colors.text, textAlign: "center", marginTop: 8 }]}>Browse Exercises</Text>
          <Text style={[styles.recSplit, { color: colors.textMuted, textAlign: "center" }]}>Find exercises to build your routine</Text>
        </TouchableOpacity>
      )}

      {/* ── Weekly Stats Chart ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Activity</Text>
        <View style={[styles.weeklyBadge, { backgroundColor: "#E0000015" }]}>
          <Text style={styles.weeklyBadgeText}>{weeklyWorkouts}/7 days · {weeklyMinutes}m</Text>
        </View>
      </View>

      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <WeeklyBarChart data={weekly} colors={colors} />
        <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
          <View>
            <Text style={[styles.chartStatVal, { color: colors.text }]}>{weeklyWorkouts}</Text>
            <Text style={[styles.chartStatLabel, { color: colors.textMuted }]}>Workouts</Text>
          </View>
          <View>
            <Text style={[styles.chartStatVal, { color: colors.text }]}>{weeklyMinutes}</Text>
            <Text style={[styles.chartStatLabel, { color: colors.textMuted }]}>Total Mins</Text>
          </View>
          <View>
            <Text style={[styles.chartStatVal, { color: colors.text }]}>
              {Math.round(weekly.reduce((s: number, d: any) => s + d.volume, 0))}
            </Text>
            <Text style={[styles.chartStatLabel, { color: colors.textMuted }]}>Volume (kg)</Text>
          </View>
        </View>
      </View>

      {/* ── Weight Progress ── */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="scale-outline" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Weight Trend</Text>
          </View>
        </View>
        <WeightSparkline data={weightProgress} colors={colors} />
      </View>

      {/* ── Hydration ── */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="water-outline" size={20} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Hydration</Text>
          </View>
        </View>
        <View style={styles.waterMeter}>
          <View style={[styles.waterBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.waterBarFill, { width: `${waterPct * 100}%` }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[styles.waterText, { color: colors.text }]}>
              {today.water_ml >= 1000
                ? `${(today.water_ml / 1000).toFixed(1)}L`
                : `${today.water_ml || 0}ml`}
              <Text style={{ color: colors.textMuted }}> / 2.5L</Text>
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/meals")}
              style={[styles.logWaterBtn, { backgroundColor: "#3B82F615", borderColor: "#3B82F630", paddingHorizontal: 16 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={13} color="#3B82F6" />
              <Text style={styles.logWaterText}>Log Water</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 40 },

  // Header
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  greeting: { fontFamily: FONTS.body, fontSize: 14, marginBottom: 2 },
  name: { fontFamily: FONTS.heading, fontSize: 30, letterSpacing: -0.5 },
  goalPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  goalPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: "#E00000" },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: "center", alignItems: "center", overflow: "hidden" },

  // XP card
  xpCard: { borderRadius: 20, padding: 18, marginBottom: 20 },
  xpTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  xpTierLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" },
  xpLevel: { fontFamily: FONTS.heading, fontSize: 22, color: "#FFF", marginTop: 2 },
  xpBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  xpBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: "#FFD700" },
  xpBarBg: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 4, backgroundColor: "#FFF" },
  xpSubText: { fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.65)" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 12, borderWidth: 1, alignItems: "center", gap: 6 },
  statIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statVal: { fontFamily: FONTS.heading, fontSize: 16, letterSpacing: -0.5 },
  statLabel: { fontFamily: FONTS.body, fontSize: 10, textAlign: "center" },

  // Section headers
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: -0.3 },
  seeAll: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: "#E00000" },
  weeklyBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  weeklyBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: "#E00000" },

  // Recommendation card
  recCard: { borderRadius: 24, borderWidth: 1.5, padding: 20, marginBottom: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  recCardInner: { flexDirection: "row", gap: 12 },
  recTypePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  recTypePillText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  recName: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
  recSplit: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  recExCount: { fontFamily: FONTS.bodySemiBold, fontSize: 12, marginTop: 8 },
  recThumb: { width: 80, height: 80, borderRadius: 16, resizeMode: "cover" },
  targetPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  targetPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 10 },
  startBtn: { borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 8 },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: "#FFF", letterSpacing: 0.8 },

  // Chart
  chartCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 20 },
  chartStatVal: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: -0.3 },
  chartStatLabel: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },

  // Mini cards
  miniCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14 },
  miniCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  miniCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 13 },

  // Water
  waterMeter: { gap: 8 },
  waterBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  waterBarFill: { height: "100%", borderRadius: 4, backgroundColor: "#3B82F6" },
  waterText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  logWaterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingVertical: 7 },
  logWaterText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: "#3B82F6" },

});
