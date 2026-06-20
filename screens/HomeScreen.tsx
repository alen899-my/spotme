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
import MiniCalendar from "../components/home/MiniCalendar";

// ── Sub-components ────────────────────────────────────────────────────────────
import GreetingCard       from "../components/ui/GreetingCard";

import RecommendationCard from "../components/home/RecommendationCard";
import { HomeSkeleton } from "../components/ui/Skeleton";
import BodyStatusCard     from "../components/home/BodyStatusCard";
import HydrationCard      from "../components/home/HydrationCard";
import { API_URL } from "../utils/api";
import { getToken } from "../utils/tokenStorage";
import { useWorkoutTimer } from "../contexts/WorkoutTimerContext";
import { formatDurationFull as formatDuration } from "../utils/datetime";

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

  const { isWorkoutActive, activeWorkoutId, workoutElapsed } = useWorkoutTimer();
  const [apiActiveWorkout, setApiActiveWorkout] = useState<any>(null);
  const resumeWorkout = isWorkoutActive || apiActiveWorkout;

  // Also check API for active workouts (handles app restart where context is lost)
  useEffect(() => {
    if (isWorkoutActive) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/daily/workouts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const active = res.data.find((w: any) => w.status === 'active');
        setApiActiveWorkout(active || null);
      } catch {}
    })();
  }, [isWorkoutActive]);

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

  const progressPct = stepsDone / TOTAL_ONBOARDING;

  const isProfileComplete = profileComplete || (stepsDone >= TOTAL_ONBOARDING);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.container, { flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <GreetingCard firstName={firstName} />

      {/* ── Profile Incomplete Banner ────────────────────────────────────── */}
      {!isProfileComplete && (
        <TouchableOpacity
          style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/onboarding")}
          activeOpacity={0.82}
        >
          <View style={styles.bannerHeader}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Complete Your Profile</Text>
            <Text style={[styles.bannerCount, { color: colors.textMuted }]}>{stepsDone}/{TOTAL_ONBOARDING}</Text>
          </View>

          <View style={[styles.bannerTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.bannerFill, { width: `${progressPct * 100}%` as any, backgroundColor: colors.primary }]} />
          </View>

          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
            {stepsDone === 0
              ? "Set up your profile to get started."
              : `${TOTAL_ONBOARDING - stepsDone} step${TOTAL_ONBOARDING - stepsDone !== 1 ? "s" : ""} left.`}
          </Text>

          <View style={styles.bannerCTA}>
            <Text style={[styles.bannerCTAText, { color: colors.primary }]}>
              {stepsDone === 0 ? "Get Started" : "Continue Setup"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
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

          {/* ── Workout Calendar ──────────────────────────────────────────────── */}
          <MiniCalendar />
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

          {/* ── Resume Workout Banner ───────────────────────────────────────── */}
          {resumeWorkout && (
            <TouchableOpacity
              style={[styles.resumeBanner, { backgroundColor: isDark ? '#0A2A2E' : '#E0F2FE', borderColor: isDark ? 'rgba(37,150,190,0.3)' : 'rgba(37,150,190,0.25)', borderWidth: 1 }]}
              onPress={() => router.push(`/daily/${activeWorkoutId || apiActiveWorkout?.id}`)}
              activeOpacity={0.85}
            >
              <View style={[styles.resumeDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeTitle, { color: colors.text }]}>Workout in Progress</Text>
                <Text style={[styles.resumeSub, { color: colors.textMuted }]}>
                  Tap to resume • {formatDuration(workoutElapsed || apiActiveWorkout?.total_duration_seconds || 0)}
                </Text>
              </View>
              <View style={[styles.resumeArrowWrap, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : '#2596BE' }]}>
                <Ionicons name="play" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}

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
    borderRadius: 14,
    borderWidth: 1.5,
    padding: scale(16),
    marginBottom: vs(20),
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(12),
  },
  bannerTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(16),
    flex: 1,
  },
  bannerCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
    marginLeft: scale(8),
  },
  bannerTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: vs(10),
    overflow: "hidden",
  },
  bannerFill: {
    height: "100%" as any,
    borderRadius: 2,
  },
  bannerSub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    lineHeight: scale(17),
    marginBottom: vs(12),
  },
  bannerCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bannerCTAText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(13),
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

  // ── Resume Workout ──────────────────────────────────────────────────────────
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: vs(16),
    gap: scale(12),
  },
  resumeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resumeTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(15),
    marginBottom: 2,
  },
  resumeSub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
  },
  resumeArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
