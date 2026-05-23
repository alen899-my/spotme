import React, { useState, useCallback, useEffect } from "react";
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
import { FONTS } from "../constants/theme";
import axios from "axios";
import Body from "react-native-body-highlighter";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const scale = (n: number) => Math.round((SW / BASE_W) * n);
const vs    = (n: number) => Math.round((SH / 844)  * n);

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

// ── Theme palette ──────────────────────────────────────────────────────────────
const P = {
  sun:      "#F7CB16",
  sunDeep:  "#E7B100",
  sunLight: "#FEF6D0",
  cta:      "#2596BE",
  ctaDark:  "#1a6e8a",
  ctaDeep:  "#0d4d65",
  ctaLight: "#D6EEF7",
  ink:      "#04282B",
  inkDeep:  "#021518",
  white:    "#FFFFFF",
  offWhite: "#F5F9FC",
  muted:    "#6B8E9A",
  border:   "#B8D8E8",
};

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
  Bronze: 0, Silver: 500, Gold: 1500, Platinum: 3000, Diamond: 6000,
  Master: 10000, Grandmaster: 15000, Elite: 20000, Champion: 30000, Legend: 50000,
};
const TIER_ORDER = Object.keys(TIER_XP);

function getXPProgress(tier: string, totalXP: number) {
  const idx     = TIER_ORDER.indexOf(tier);
  const current = TIER_XP[tier] || 0;
  const next    = TIER_XP[TIER_ORDER[idx + 1]] ?? current + 5000;
  const progress = Math.min((totalXP - current) / (next - current), 1);
  return {
    progress: isNaN(progress) ? 0 : progress,
    nextTier: TIER_ORDER[idx + 1] || "Legend",
    xpToNext: Math.max(next - totalXP, 0),
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────
function WeeklyBarChart({ data }: { data: any[] }) {
  const maxVal = Math.max(...data.map((d) => d.duration_seconds), 1);
  const chartH = vs(80);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: scale(6), height: chartH + vs(28), paddingTop: vs(4) }}>
      {data.map((d, i) => {
        const barH   = Math.max((d.duration_seconds / maxVal) * chartH, d.workouts > 0 ? 4 : 2);
        const isToday = i === data.length - 1;
        return (
          <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: scale(6),
                backgroundColor: isToday ? P.sun : d.workouts > 0 ? P.cta : P.border,
              }}
            />
            <Text style={{
              fontFamily: FONTS.bodySemiBold,
              fontSize: scale(10),
              color: isToday ? P.ink : P.muted,
            }}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Weight sparkline ──────────────────────────────────────────────────────────
function WeightSparkline({ data }: { data: any[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length < 2) return (
    <View style={{ alignItems: "center", paddingVertical: vs(16) }}>
      <Text style={{ fontFamily: FONTS.body, fontSize: scale(13), color: P.muted }}>
        Log workouts with weight to see your trend
      </Text>
    </View>
  );

  const vals  = data.map((d) => parseFloat(d.weight));
  const min   = Math.min(...vals) - 2;
  const max   = Math.max(...vals) + 2;
  const range = max - min || 1;
  const H     = vs(80);
  const W     = SW - scale(80);
  const step  = W / (vals.length - 1);

  let pathD = "";
  vals.forEach((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    pathD += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
  });

  return (
    <View style={{ height: H + vs(30) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: vs(8) }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: scale(12), color: P.muted }}>{vals[0]}kg</Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: scale(13), color: P.cta }}>{vals[vals.length - 1]}kg</Text>
      </View>
      <View style={{ height: H, width: "100%" }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Path d={pathD} fill="none" stroke={P.cta} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => {
            const x = i * step;
            const y = H - ((v - min) / range) * H;
            const isSel = selectedIdx === i;
            return (
              <React.Fragment key={i}>
                <Circle cx={x} cy={y} r={isSel ? "6" : "4"} fill={P.sun} stroke={P.white} strokeWidth="2" />
                <Circle cx={x} cy={y} r="16" fill="transparent" onPress={() => setSelectedIdx(isSel ? null : i)} />
                {isSel && (
                  <SvgText
                    x={x} y={y - 12}
                    fill={P.ink} fontSize={scale(12)} fontFamily={FONTS.bodyBold}
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

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, value, label }: { icon: any; iconBg: string; value: string; label: string }) {
  return (
    <View style={[styles.statCard]}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={scale(18)} color={P.white} />
      </View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [gender, setGender]       = useState<"male" | "female">("male");
  const [bodySide, setBodySide]   = useState<"front" | "back">("front");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  useEffect(() => {
    if (dashboard?.user?.gender) {
      const g = dashboard.user.gender.toLowerCase();
      if (g === "female" || g === "male") setGender(g as "male" | "female");
    }
  }, [dashboard?.user?.gender]);

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

  const handleMusclePress = (part: any) => {
    setSelectedMuscles(prev =>
      prev.includes(part.slug) ? prev.filter(m => m !== part.slug) : [...prev, part.slug]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: P.offWhite }}>
        <ActivityIndicator size="large" color={P.cta} />
      </View>
    );
  }

  const u              = dashboard?.user || {};
  const today          = dashboard?.today || {};
  const weekly         = dashboard?.weekly_stats || [];
  const weightProgress = dashboard?.weight_progress || [];
  const rec            = dashboard?.top_recommendation || null;

  const firstName  = (u.full_name || "User").split(" ")[0];
  const tier       = u.league_tier || "Bronze";
  const tierColors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const { progress: xpProgress, nextTier, xpToNext } = getXPProgress(tier, u.total_xp || 0);

  const waterGoalMl     = 2500;
  const waterPct        = Math.min((today.water_ml || 0) / waterGoalMl, 1);
  const weeklyWorkouts  = weekly.filter((d: any) => d.workouts > 0).length;
  const weeklyMinutes   = Math.round(weekly.reduce((s: number, d: any) => s + d.duration_seconds, 0) / 60);
  const dbMuscleActivity = dashboard?.muscle_activity || [];

  const muscleActivity = [
    ...dbMuscleActivity.filter((m: any) => !selectedMuscles.includes(m.slug)),
    ...selectedMuscles.map((slug) => ({ slug, intensity: 2 })),
  ];

  // Body shape from BMI
  const heightStr = u.height || "175";
  const weightVal = parseFloat(u.weight) || 75;
  const heightCm  = heightStr.includes("'")
    ? (parseFloat(heightStr.split("'")[0]) * 30.48 + parseFloat(heightStr.split("'")[1] || "0") * 2.54)
    : (parseFloat(heightStr) || 175);
  const bmi = weightVal / Math.pow(heightCm / 100, 2);

  let dynamicScaleX = bmi < 17 ? 0.78 : bmi < 18.5 ? 0.88 : bmi < 25 ? 1.0 : bmi < 30 ? 1.18 : bmi < 35 ? 1.32 : 1.45;
  let dynamicScaleY = Math.max(0.88, Math.min(1.0 + (heightCm - 175) * 0.003, 1.15));

  let fitnessStatus: string;
  let fitnessColor: string;
  if      (bmi < 17)   { fitnessStatus = "Severely Underweight"; fitnessColor = "#F59E0B"; }
  else if (bmi < 18.5) { fitnessStatus = "Underweight";          fitnessColor = "#FBBF24"; }
  else if (bmi < 22)   { fitnessStatus = "Lean & Athletic";       fitnessColor = "#10B981"; }
  else if (bmi < 25)   { fitnessStatus = "Healthy Weight";        fitnessColor = "#34D399"; }
  else if (bmi < 30)   { fitnessStatus = "Overweight";            fitnessColor = "#F97316"; }
  else if (bmi < 35)   { fitnessStatus = "Obese";                 fitnessColor = "#EF4444"; }
  else                  { fitnessStatus = "Severely Obese";        fitnessColor = "#DC2626"; }

  const activityScore = Math.min(weeklyWorkouts / 7, 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.offWhite }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.name}>{firstName}</Text>
          {u.fitness_goal && (
            <View style={styles.goalPill}>
              <Ionicons name="flag-outline" size={scale(11)} color={P.ctaDark} />
              <Text style={styles.goalPillText}>{u.fitness_goal}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── XP / Level card — uses tier gradient, unchanged ─────────────── */}
      <View style={[styles.xpCard, { backgroundColor: tierColors[0] }]}>
        {/* tier color accent strip */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tierColors[1], opacity: 0.45, borderRadius: scale(20) }]} pointerEvents="none" />
        <View style={styles.xpTop}>
          <View>
            <Text style={styles.xpTierLabel}>{tier}</Text>
            <Text style={styles.xpLevel}>Level {u.level || 1}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="trophy" size={scale(14)} color={P.sun} />
            <Text style={styles.xpBadgeText}>{(u.total_xp || 0).toLocaleString()} XP</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: vs(6) }}>
          <Text style={styles.xpSubText}>{xpToNext.toLocaleString()} XP to {nextTier}</Text>
          <Text style={styles.xpSubText}>{Math.round(xpProgress * 100)}%</Text>
        </View>
      </View>

      {/* ── Today's stat cards ───────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard icon="flame"      iconBg={P.cta}     value={String(today.calories_burned || 0)}
          label="kcal burned" />
        <StatCard icon="flash"      iconBg={P.sunDeep}  value={String(u.current_streak || 0)}
          label="day streak" />
        <StatCard icon="water"      iconBg={P.ctaDark}  value={today.water_ml >= 1000 ? `${(today.water_ml/1000).toFixed(1)}L` : `${today.water_ml||0}ml`}
          label="water" />
        <StatCard icon="restaurant" iconBg={P.cta}      value={String(today.calories_consumed || 0)}
          label="kcal eaten" />
      </View>

      {/* ── Exercise of the Day ──────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Exercise to Try</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/exercises")} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {rec ? (
        <View style={styles.recCard}>
          <View style={styles.recCardInner}>
            <View style={{ flex: 1 }}>
              <View style={styles.recTypePill}>
                <Ionicons name="sparkles" size={scale(11)} color={P.ctaDark} />
                <Text style={styles.recTypePillText}>{rec.scoreTag || "Recommended"}</Text>
              </View>
              <Text style={styles.recName} numberOfLines={2}>{rec.exercise_name}</Text>
              <Text style={styles.recSplit}>{rec.category}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scale(4), marginTop: vs(8) }}>
                {rec.target && (
                  <View style={styles.targetPill}>
                    <Text style={styles.targetPillText}>{rec.target}</Text>
                  </View>
                )}
                {rec.equipment && rec.equipment !== "body weight" && (
                  <View style={styles.targetPill}>
                    <Text style={styles.targetPillText}>{rec.equipment}</Text>
                  </View>
                )}
              </View>
            </View>
            {rec.image_url && (
              <Image source={{ uri: rec.image_url }} style={styles.recThumb} />
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.recCard, { alignItems: "center", paddingVertical: vs(28) }]}
          onPress={() => router.push("/(tabs)/exercises")}
          activeOpacity={0.85}
        >
          <Ionicons name="fitness-outline" size={scale(36)} color={P.cta} />
          <Text style={[styles.recName, { textAlign: "center", marginTop: vs(8) }]}>Browse Exercises</Text>
          <Text style={[styles.recSplit, { textAlign: "center" }]}>Find exercises to build your routine</Text>
        </TouchableOpacity>
      )}

      {/* ── Body Status ──────────────────────────────────────────────────── */}
      <View style={[styles.sectionHeaderRow, { marginTop: vs(4) }]}>
        <Text style={styles.sectionTitle}>Body Status</Text>
        <View style={styles.sideToggleTrack}>
          {(["front", "back"] as const).map((side) => (
            <TouchableOpacity
              key={side}
              onPress={() => setBodySide(side)}
              style={[styles.sideToggleBtn, bodySide === side && styles.sideToggleBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.sideToggleTxt, bodySide === side && styles.sideToggleTxtActive]}>
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bodyCard}>
        {/* Fitness badge */}
        <View style={[styles.fitnessBadge, { backgroundColor: `${fitnessColor}18`, borderColor: `${fitnessColor}40` }]}>
          <Text style={[styles.fitnessBadgeText, { color: fitnessColor }]}>{fitnessStatus}</Text>
          <View style={[styles.fitnessBmi, { backgroundColor: `${fitnessColor}22` }]}>
            <Text style={[styles.fitnessBmiText, { color: fitnessColor }]}>BMI {bmi.toFixed(1)}</Text>
          </View>
        </View>

        {/* Body SVG */}
        <View style={{ alignItems: "center", paddingVertical: vs(12) }}>
          <View style={{ transform: [{ scaleX: dynamicScaleX }, { scaleY: dynamicScaleY }] }}>
            <Body
              data={muscleActivity}
              gender={gender}
              side={bodySide}
              scale={1.15}
              colors={[`${P.cta}55`, `${P.cta}AA`, P.cta]}
              defaultFill={P.ctaLight}
              defaultStroke={P.border}
              defaultStrokeWidth={0.5}
              onBodyPartPress={handleMusclePress}
            />
          </View>
        </View>

        {/* Stats below body */}
        <View style={styles.bodyStatsRow}>
          {[
            { val: `${weightVal}kg`, lbl: "Weight" },
            { val: `${heightCm.toFixed(0)}cm`, lbl: "Height" },
            { val: u.body_fat ? `${parseFloat(u.body_fat).toFixed(1)}%` : "--", lbl: "Body Fat" },
            {
              val: `${weeklyWorkouts}/7`,
              lbl: "Active days",
              valColor: activityScore >= 0.7 ? "#10B981" : activityScore >= 0.4 ? P.sun : P.cta,
            },
          ].map((s, i, arr) => (
            <React.Fragment key={s.lbl}>
              <View style={styles.bodyStat}>
                <Text style={[styles.bodyStatVal, s.valColor ? { color: s.valColor } : {}]}>{s.val}</Text>
                <Text style={styles.bodyStatLabel}>{s.lbl}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.bodyStatDivider} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.tapHint}>Tap a muscle to highlight it</Text>
      </View>

      {/* ── Weekly Activity ──────────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.weeklyBadge}>
          <Text style={styles.weeklyBadgeText}>{weeklyWorkouts}/7 days · {weeklyMinutes}m</Text>
        </View>
      </View>

      <View style={styles.card}>
        <WeeklyBarChart data={weekly} />
        <View style={{ flexDirection: "row", gap: scale(20), marginTop: vs(14) }}>
          {[
            { val: weeklyWorkouts, lbl: "Workouts" },
            { val: weeklyMinutes,  lbl: "Total Mins" },
            { val: Math.round(weekly.reduce((s: number, d: any) => s + d.volume, 0)), lbl: "Volume (kg)" },
          ].map((s) => (
            <View key={s.lbl}>
              <Text style={styles.chartStatVal}>{s.val}</Text>
              <Text style={styles.chartStatLabel}>{s.lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Weight Trend ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={[styles.sectionHeaderRow, { marginBottom: vs(12) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: scale(6) }}>
            <View style={[styles.cardIconWrap, { backgroundColor: P.sunLight }]}>
              <Ionicons name="scale-outline" size={scale(16)} color={P.sunDeep} />
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Weight Trend</Text>
          </View>
        </View>
        <WeightSparkline data={weightProgress} />
      </View>

      {/* ── Hydration ────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={[styles.sectionHeaderRow, { marginBottom: vs(12) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: scale(6) }}>
            <View style={[styles.cardIconWrap, { backgroundColor: P.ctaLight }]}>
              <Ionicons name="water-outline" size={scale(16)} color={P.cta} />
            </View>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Hydration</Text>
          </View>
        </View>
        <View style={{ gap: vs(10) }}>
          <View style={styles.waterBarBg}>
            <View style={[styles.waterBarFill, { width: `${waterPct * 100}%` }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.waterText}>
              {today.water_ml >= 1000
                ? `${(today.water_ml / 1000).toFixed(1)}L`
                : `${today.water_ml || 0}ml`}
              <Text style={{ color: P.muted }}> / 2.5L</Text>
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/meals")}
              style={styles.logWaterBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={scale(13)} color={P.white} />
              <Text style={styles.logWaterText}>Log Water</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ height: vs(32) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(20),
    paddingTop: Platform.OS === "ios" ? vs(16) : vs(12),
    paddingBottom: vs(40),
  },

  // ── Greeting ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: vs(20),
  },
  greeting: {
    fontFamily: FONTS.body,
    fontSize: scale(14),
    color: P.muted,
    marginBottom: 2,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(30),
    color: P.ink,
    letterSpacing: -0.5,
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    marginTop: vs(8),
    backgroundColor: P.ctaLight,
  },
  goalPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    color: P.ctaDark,
  },

  // ── XP card ─────────────────────────────────────────────────────────────────
  xpCard: {
    borderRadius: scale(20),
    padding: scale(18),
    marginBottom: vs(20),
    overflow: "hidden",
  },
  xpTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: vs(14),
  },
  xpTierLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  xpLevel: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    color: P.white,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: vs(6),
  },
  xpBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
    color: P.sun,
  },
  xpBarBg: {
    height: vs(8),
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: P.white,
  },
  xpSubText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.7)",
  },

  // ── Stat cards ───────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: vs(24),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(16),
    padding: scale(10),
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.white,
    alignItems: "center",
    gap: vs(5),
  },
  statIconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  statVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    color: P.ink,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    color: P.muted,
    textAlign: "center",
  },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(12),
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    color: P.ink,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(13),
    color: P.cta,
  },
  weeklyBadge: {
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    backgroundColor: P.ctaLight,
  },
  weeklyBadgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    color: P.ctaDark,
  },

  // ── Shared card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: P.white,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: P.border,
    padding: scale(16),
    marginBottom: vs(16),
  },
  cardIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Recommendation card ──────────────────────────────────────────────────────
  recCard: {
    backgroundColor: P.white,
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: P.border,
    padding: scale(18),
    marginBottom: vs(20),
  },
  recCardInner: {
    flexDirection: "row",
    gap: scale(12),
  },
  recTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    alignSelf: "flex-start",
    backgroundColor: P.ctaLight,
    borderRadius: 20,
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
    marginBottom: vs(8),
  },
  recTypePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    color: P.ctaDark,
  },
  recName: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    color: P.ink,
    letterSpacing: -0.3,
    lineHeight: scale(24),
  },
  recSplit: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: P.muted,
    marginTop: 2,
  },
  recThumb: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(14),
    resizeMode: "cover",
  },
  targetPill: {
    backgroundColor: P.offWhite,
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
    borderWidth: 1,
    borderColor: P.border,
  },
  targetPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(10),
    color: P.muted,
  },

  // ── Body card ────────────────────────────────────────────────────────────────
  bodyCard: {
    backgroundColor: P.white,
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: P.border,
    padding: scale(16),
    marginBottom: vs(20),
  },
  sideToggleTrack: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
    overflow: "hidden",
    padding: 2,
    backgroundColor: P.offWhite,
  },
  sideToggleBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: vs(5),
    borderRadius: 18,
  },
  sideToggleBtnActive: {
    backgroundColor: P.cta,
  },
  sideToggleTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    color: P.muted,
  },
  sideToggleTxtActive: {
    color: P.white,
  },
  fitnessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: scale(14),
    paddingVertical: vs(7),
    marginBottom: vs(4),
  },
  fitnessBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
  },
  fitnessBmi: {
    borderRadius: 20,
    paddingHorizontal: scale(8),
    paddingVertical: vs(2),
    marginLeft: scale(4),
  },
  fitnessBmiText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
  },
  bodyStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: vs(8),
    paddingTop: vs(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.border,
  },
  bodyStat: {
    alignItems: "center",
    flex: 1,
  },
  bodyStatVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    color: P.ink,
    letterSpacing: -0.3,
  },
  bodyStatLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: P.muted,
    marginTop: 2,
  },
  bodyStatDivider: {
    width: 1,
    height: vs(28),
    backgroundColor: P.border,
  },
  tapHint: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: P.muted,
    textAlign: "center",
    marginTop: vs(10),
    opacity: 0.7,
  },

  // ── Chart stats ──────────────────────────────────────────────────────────────
  chartStatVal: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    color: P.ink,
    letterSpacing: -0.3,
  },
  chartStatLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: P.muted,
    marginTop: 2,
  },

  // ── Water ────────────────────────────────────────────────────────────────────
  waterBarBg: {
    height: vs(10),
    borderRadius: 5,
    backgroundColor: P.ctaLight,
    overflow: "hidden",
  },
  waterBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: P.cta,
  },
  waterText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    color: P.ink,
  },
  logWaterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(4),
    borderRadius: scale(10),
    paddingVertical: vs(7),
    paddingHorizontal: scale(14),
    backgroundColor: P.cta,
  },
  logWaterText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    color: P.white,
  },
});