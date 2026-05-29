import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { P, scale, vs } from "../constants/homeTheme";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

// ── Sub-components ────────────────────────────────────────────────────────────
import GreetingCard       from "../components/ui/GreetingCard";
import XPCard             from "../components/home/XPCard";
import { StatCards }      from "../components/home/StatCards";
import RecommendationCard from "../components/home/RecommendationCard";
import BodyStatusCard     from "../components/home/BodyStatusCard";
import WeeklyActivityCard from "../components/home/WeeklyActivityCard";
import WeightTrendCard    from "../components/home/WeightTrendCard";
import HydrationCard      from "../components/home/HydrationCard";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [gender, setGender]       = useState<"male" | "female">("male");

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const u              = dashboard?.user        || {};
  const today          = dashboard?.today       || {};
  const weekly         = dashboard?.weekly_stats || [];
  const weightProgress = dashboard?.weight_progress || [];
  const rec            = dashboard?.top_recommendation || null;

  const firstName = (u.full_name || "User").split(" ")[0];

  // Height normalisation (supports both cm and ft'in strings)
  const heightStr = u.height || "175";
  const heightCm  = heightStr.includes("'")
    ? parseFloat(heightStr.split("'")[0]) * 30.48 +
      parseFloat(heightStr.split("'")[1] || "0") * 2.54
    : parseFloat(heightStr) || 175;
  const weightKg  = parseFloat(u.weight) || 75;

  const weeklyWorkouts = weekly.filter((d: any) => d.workouts > 0).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <GreetingCard firstName={firstName} fitnessGoal={u.fitness_goal} />

      {/* ── XP / Level ───────────────────────────────────────────────────── */}
      <XPCard
        tier={u.league_tier || "Bronze"}
        level={u.level || 1}
        totalXP={u.total_xp || 0}
      />

      {/* ── Today stats ──────────────────────────────────────────────────── */}
      <StatCards
        caloriesBurned={today.calories_burned || 0}
        currentStreak={u.current_streak || 0}
        waterMl={today.water_ml || 0}
        caloriesConsumed={today.calories_consumed || 0}
      />

      {/* ── Exercise of the Day ──────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercise to Try</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/exercises")} activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
        </TouchableOpacity>
      </View>
      <RecommendationCard
        rec={rec}
        onBrowsePress={() => router.push("/(tabs)/exercises")}
      />

      {/* ── Body Status ──────────────────────────────────────────────────── */}
      <BodyStatusCard
        gender={gender}
        weightKg={weightKg}
        heightCm={heightCm}
        bodyFat={u.body_fat}
        weeklyWorkouts={weeklyWorkouts}
        dbMuscleActivity={dashboard?.muscle_activity || []}
      />

      {/* ── Weekly Activity ──────────────────────────────────────────────── */}
      <WeeklyActivityCard weekly={weekly} />

      {/* ── Weight Trend ─────────────────────────────────────────────────── */}
      <WeightTrendCard weightProgress={weightProgress} />

      {/* ── Hydration ────────────────────────────────────────────────────── */}
      <HydrationCard
        waterMl={today.water_ml || 0}
        onLogWaterPress={() => router.push("/(tabs)/meals")}
      />

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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(12),
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    letterSpacing: -0.3,
  },
  seeAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(13),
  },
});