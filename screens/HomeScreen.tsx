import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  ImageBackground,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { P, scale, vs } from "../constants/homeTheme";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// ── Sub-components ────────────────────────────────────────────────────────────
import GreetingCard       from "../components/ui/GreetingCard";
import XPCard             from "../components/home/XPCard";
import { StatCards }      from "../components/home/StatCards";
import RecommendationCard from "../components/home/RecommendationCard";
import { HomeSkeleton } from "../components/ui/Skeleton";
import BodyStatusCard     from "../components/home/BodyStatusCard";
import HydrationCard      from "../components/home/HydrationCard";
import { API_URL } from "../utils/api";
import { getToken } from "../utils/tokenStorage";

const workoutBg = require("../assets/coach/workoutlog.jpg");
const foodBg    = require("../assets/coach/foodlog.jpg");



export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [gender, setGender]       = useState<"male" | "female">("male");
  const [profileComplete, setProfileComplete] = useState<boolean>(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (dashboard?.user?.gender) {
      const g = dashboard.user.gender.toLowerCase();
      if (g === "female" || g === "male") setGender(g as "male" | "female");
    }
  }, [dashboard?.user?.gender]);

  const fetchDashboard = async () => {
    try {
      const token = await getToken();
      if (!token) { router.replace("/"); return; }
      const res = await axios.get(`${API_URL}/daily/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(res.data);
      
      const completed = !!res.data.user?.onboarding_completed;
      setProfileComplete(completed);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      try {
        const userStr = await AsyncStorage.getItem("userData");
        const cached = userStr ? JSON.parse(userStr) : null;
        if (cached) {
          setProfileComplete(!!cached.onboarding_completed);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

  if (loading) {
    return <HomeSkeleton />;
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const u              = dashboard?.user        || {};
  const today          = dashboard?.today       || {};
  const weekly         = dashboard?.weekly_stats || [];
  const weightProgress = dashboard?.weight_progress || [];
  const recs           = dashboard?.top_recommendations || [];

  const firstName = (u.full_name || "User").split(" ")[0];

  // Height normalisation (supports both cm and ft'in strings)
  const heightStr = u.height || "175";
  const heightCm  = heightStr.includes("'")
    ? parseFloat(heightStr.split("'")[0]) * 30.48 +
      parseFloat(heightStr.split("'")[1] || "0") * 2.54
    : parseFloat(heightStr) || 175;
  const weightKg  = parseFloat(u.weight) || 75;

  const weeklyWorkouts    = weekly.filter((d: any) => d.workouts > 0).length;
  const totalWorkouts      = dashboard?.total_workouts || 0;

  // ── Profile step completion ──────────────────────────────────────────────────
  const sv = (s: any) => { // split "175 cm" -> "175"
    if (s === null || s === undefined) return "";
    return String(s).trim().split(" ")[0];
  };
  const measurementsDone = !!(sv(u.neck) || sv(u.waist) || sv(u.chest)) || !!u.medication || !!(u.diet_type && u.food_preference && u.water_intake);

  const stepsDone = [
    !!u.gender,                                                                    // 1 gender
    !!(u.dob && sv(u.height) && sv(u.weight)),                                     // 2 basic info
    !!u.fitness_goal,                                                              // 3 goal
    !!u.experience_level,                                                          // 4 experience
    !!u.activity_level,                                                            // 5 activity
    !!(u.diet_type && u.food_preference && u.water_intake),                        // 6 nutrition
    !!(u.profile_pic_url),                                                         // 7 photos
  ].filter(Boolean).length;
  const TOTAL_ONBOARDING = 7;

  const getBannerColor = (done: number) => {
    if (done <= 1) return "#EF4444";   // red
    if (done <= 2) return "#F97316";   // orange
    if (done <= 4) return "#F59E0B";   // amber
    if (done <= 5) return "#84CC16";   // yellow-green
    return "#10B981";                  // green
  };
  const bannerColor = getBannerColor(stepsDone);
  const progressPct = stepsDone / TOTAL_ONBOARDING;

  const isProfileComplete = profileComplete || (stepsDone >= TOTAL_ONBOARDING);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.container, { flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <GreetingCard firstName={firstName} fitnessGoal={u.fitness_goal} />

      {/* ── Profile Incomplete Banner ────────────────────────────────────── */}
      {!isProfileComplete && (
        <TouchableOpacity
          style={[styles.bannerCard, { backgroundColor: bannerColor }]}
          onPress={() => router.push("/onboarding")}
          activeOpacity={0.88}
        >
          {/* Top row: title + steps badge */}
          <View style={styles.bannerTopRow}>
            <Text style={styles.bannerTitle}>Complete Your Profile</Text>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{stepsDone}/{TOTAL_ONBOARDING}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.bannerTrack}>
            <View style={[styles.bannerFill, { width: `${progressPct * 100}%` as any }]} />
          </View>

          {/* Sub text */}
          <Text style={styles.bannerSub}>
            {stepsDone === 0
              ? "Let's get started — set up your profile to unlock spotME."
              : `${TOTAL_ONBOARDING - stepsDone} step${TOTAL_ONBOARDING - stepsDone !== 1 ? "s" : ""} left to complete your profile.`}
          </Text>

          {/* CTA pill */}
          <View style={styles.bannerCTA}>
            <Text style={[styles.bannerCTAText, { color: bannerColor }]}>
              {stepsDone === 0 ? "Get Started" : "Continue Setup"}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {isProfileComplete && (
        <>
          {/* ── Quick Logger Actions ────────────────────────────────────────── */}
          <View style={styles.quickLoggerRow}>
            {/* Log Workout Button */}
            <TouchableOpacity
              style={[
                styles.quickLoggerCard,
                {
                  borderColor: isDark ? "rgba(37,150,190,0.25)" : "rgba(37,150,190,0.18)",
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => router.push("/daily/new")}
              activeOpacity={0.82}
            >
              <ImageBackground source={workoutBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View style={[StyleSheet.absoluteFillObject, styles.loggerOverlay]} />
              <View style={[styles.quickLoggerIconWrap, { backgroundColor: isDark ? "rgba(37,150,190,0.15)" : "#E0F2FE" }]}>
                <Ionicons name="barbell" size={scale(20)} color="#2596BE" />
              </View>
              <View style={styles.quickLoggerTextWrap}>
                <Text style={[styles.quickLoggerTitle, { color: colors.text }]}>Log Workout</Text>
                <Text style={[styles.quickLoggerSubtitle, { color: colors.textMuted }]}>Record exercises</Text>
              </View>
            </TouchableOpacity>

            {/* Log Meals Button */}
            <TouchableOpacity
              style={[
                styles.quickLoggerCard,
                {
                  borderColor: isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.18)",
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => router.push("/(tabs)/meals")}
              activeOpacity={0.82}
            >
              <ImageBackground source={foodBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View style={[StyleSheet.absoluteFillObject, styles.loggerOverlay]} />
              <View style={[styles.quickLoggerIconWrap, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7" }]}>
                <Ionicons name="restaurant" size={scale(20)} color={isDark ? "#F59E0B" : "#D97706"} />
              </View>
              <View style={styles.quickLoggerTextWrap}>
                <Text style={[styles.quickLoggerTitle, { color: colors.text }]}>Log Meals</Text>
                <Text style={[styles.quickLoggerSubtitle, { color: colors.textMuted }]}>Macros & water</Text>
              </View>
            </TouchableOpacity>
          </View>

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

          {/* ── Exercises to Try ──────────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercises to Try</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/exercises")} activeOpacity={0.7}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recs.length === 0 ? (
            <RecommendationCard rec={null} onBrowsePress={() => router.push("/(tabs)/exercises")} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16, gap: 16 }}
              snapToInterval={width * 0.75 + 16}
              decelerationRate="fast"
              style={{ marginLeft: -16, marginBottom: vs(20) }}
            >
              {recs.map((item: any, i: number) => (
                <View key={i} style={{ width: width * 0.75 }}>
                  <RecommendationCard rec={item} onBrowsePress={() => router.push("/(tabs)/exercises")} />
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── Body Status ──────────────────────────────────────────────────── */}
          <BodyStatusCard
            gender={gender}
            weightKg={weightKg}
            heightCm={heightCm}
            bodyFat={u.body_fat}
            weeklyWorkouts={weeklyWorkouts}
            totalWorkouts={totalWorkouts}
            dbMuscleActivity={dashboard?.muscle_activity || []}
          />

          {/* ── Weekly Activity ──────────────────────────────────────────────── */}

          {/* ── Hydration ────────────────────────────────────────────────────── */}
          <HydrationCard
            waterMl={today.water_ml || 0}
            onLogWaterPress={() => router.push("/(tabs)/meals")}
            onWaterLogged={(amount: number) => {
              setDashboard((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  today: {
                    ...prev.today,
                    water_ml: (prev.today.water_ml || 0) + amount,
                  },
                };
              });
            }}
          />
        </>
      )}

      <View style={{ height: vs(32) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(20),
    paddingTop: Platform.OS === "ios" ? vs(16) : vs(12),
    paddingBottom: vs(120),
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

  // ── Banner card ────────────────────────────────────────────────────────────
  bannerCard: {
    borderRadius: 20,
    padding: scale(18),
    marginBottom: vs(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  bannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(10),
  },
  bannerTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(16),
    color: "#FFFFFF",
    flex: 1,
  },
  bannerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: scale(10),
    paddingVertical: vs(3),
    marginLeft: scale(8),
  },
  bannerBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    color: "#FFFFFF",
  },
  bannerTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: vs(10),
    overflow: "hidden",
  },
  bannerFill: {
    height: "100%" as any,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  bannerSub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    color: "rgba(255,255,255,0.85)",
    lineHeight: scale(17),
    marginBottom: vs(14),
  },
  bannerCTA: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: scale(16),
    paddingVertical: vs(7),
  },
  bannerCTAText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
  // ── Quick Logger ───────────────────────────────────────────────────────────
  quickLoggerRow: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: vs(20),
  },
  quickLoggerCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(16),
    borderWidth: 1,
    paddingHorizontal: scale(12),
    paddingVertical: vs(14),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickLoggerIconWrap: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
    zIndex: 1,
  },
  quickLoggerTextWrap: {
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
  },
  quickLoggerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    lineHeight: scale(18),
  },
  quickLoggerSubtitle: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    lineHeight: scale(13),
    marginTop: 2,
  },

  loggerOverlay: {
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 0,
  },
});