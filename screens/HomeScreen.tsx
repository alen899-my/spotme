import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import axios from "axios";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [startingRecId, setStartingRecId] = useState<number | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => { loadCachedUser(); }, []);
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      fetchRecommendations();
    }, [])
  );

  const loadCachedUser = async () => {
    try {
      const cached = await AsyncStorage.getItem("userData");
      if (cached) setUser(JSON.parse(cached));
    } catch (e) {}
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { router.replace("/"); return; }
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      await AsyncStorage.setItem("userData", JSON.stringify(res.data));
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const res = await axios.get(`${API_URL}/daily/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(res.data);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleStartRecommendation = async (rec: any) => {
    setStartingRecId(rec.session_id);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const title = `${rec.split_name} — ${rec.session_name}`;

      const res = await axios.post(`${API_URL}/daily/workouts`, {
        title,
        split_id: rec.split_id,
        session_id: rec.session_id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      router.push(`/daily/${res.data.id}` as any);
    } catch (err) {
      console.error("Error starting recommended workout:", err);
    } finally {
      setStartingRecId(null);
    }
  };

  const calculateProgress = () => {
    if (!user) return { steps: 0, percent: 0 };
    let completedSteps = 0;
    if (user.age || (user.height && user.weight)) completedSteps++;
    if (user.fitness_goal || user.experience_level) completedSteps++;
    if (user.neck || user.waist || user.hip || user.chest || user.arm || user.thigh) completedSteps++;
    if (user.medication || user.medical_conditions || user.allergies) completedSteps++;
    if (user.diet_type || user.food_preference || user.water_intake) completedSteps++;
    if (user.profile_pic_url || user.front_photo_url) completedSteps++;
    return { steps: completedSteps, percent: Math.min(Math.round((completedSteps / 6) * 100), 100) };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  const { steps, percent } = calculateProgress();
  const firstName = (user?.full_name || user?.fullName)?.split(" ")[0] || "User";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hello, {firstName}! 👋
          </Text>
          <Text style={[styles.subGreeting, { color: colors.textMuted }]}>
            Let's crush your goals today.
          </Text>
        </View>
      </View>

      {/* Complete Profile Card */}
      {!user?.onboarding_completed && (
        <TouchableOpacity
          style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.9}
          onPress={() => router.push("/onboarding")}
        >
          <View style={styles.progressHeader}>
            <Ionicons name="person-circle-outline" size={28} color="#E00000" />
            <Text style={[styles.progressTitle, { color: colors.text }]}>Complete Profile</Text>
          </View>
          <Text style={[styles.progressDesc, { color: colors.textMuted }]}>
            Unlock personalized workouts and nutrition plans by completing your fitness profile.
          </Text>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${percent}%` as any }]} />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressSteps, { color: colors.textMuted }]}>{steps} / 6 Steps Completed</Text>
            <View style={[styles.continueBtn, { backgroundColor: colors.text }]}>
              <Text style={[styles.continueText, { color: colors.bg }]}>{steps === 0 ? "Start" : "Continue"}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.bg} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Recommended Workouts Section */}
      {recommendations.length > 0 && (
        <View style={styles.recsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Recommended Workouts</Text>
            <View style={styles.recBadge}>
              <Ionicons name="sparkles" size={12} color="#F59E0B" />
              <Text style={styles.recBadgeText}>AI INSIGHTS</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recsScrollContent}
          >
            {recommendations.map((rec) => {
              // Custom colors for tags
              let tagColor = "#3B82F6";
              if (rec.scoreTag === "Highly Rated") tagColor = "#F59E0B";
              if (rec.scoreTag === "Top Exercises") tagColor = "#10B981";

              return (
                <View
                  key={rec.session_id}
                  style={[
                    styles.recCard,
                    { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                >
                  {/* Card Header with Split and Tag */}
                  <View style={styles.recCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recSplitName, { color: colors.textMuted }]} numberOfLines={1}>
                        {rec.split_name}
                      </Text>
                      <Text style={[styles.recSessionName, { color: colors.text }]} numberOfLines={1}>
                        {rec.session_name}
                      </Text>
                    </View>
                    <View style={[styles.scoreTag, { backgroundColor: `${tagColor}20`, borderColor: `${tagColor}40` }]}>
                      <Text style={[styles.scoreTagText, { color: tagColor }]}>{rec.scoreTag}</Text>
                    </View>
                  </View>

                  {/* Body part targets */}
                  {rec.targets && rec.targets.length > 0 && (
                    <View style={styles.targetsRow}>
                      {rec.targets.map((target: string) => (
                        <View key={target} style={[styles.targetPill, { backgroundColor: colors.inputBg }]}>
                          <Text style={[styles.targetPillText, { color: colors.text }]}>{target}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Recommendation Reason */}
                  <Text style={[styles.recReason, { color: colors.textMuted }]} numberOfLines={1}>
                    💡 {rec.reason}
                  </Text>

                  {/* Exercises list preview */}
                  <View style={styles.exercisesPreview}>
                    <Text style={[styles.exTitle, { color: colors.textMuted }]}>
                      Exercises ({rec.exercise_count}):
                    </Text>
                    <Text style={[styles.exListText, { color: colors.text }]} numberOfLines={2}>
                      {rec.exercises?.map((e: any) => e.name).join(", ") || "No exercises loaded"}
                    </Text>
                  </View>

                  {/* Start Recommended Workout Button */}
                  <TouchableOpacity
                    style={styles.startRecBtn}
                    onPress={() => handleStartRecommendation(rec)}
                    disabled={startingRecId !== null}
                  >
                    <LinearGradient
                      colors={startingRecId === rec.session_id ? ["#7B7B7B", "#5C5C5C"] : ["#E00000", "#B00000"]}
                      style={styles.startRecBtnGrad}
                    >
                      {startingRecId === rec.session_id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="play" size={16} color="#FFF" />
                          <Text style={styles.startRecBtnText}>START WORKOUT</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quick Action Cards */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: recommendations.length > 0 ? 12 : 0 }]}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        {[
          { label: "Log Workout", icon: "barbell-outline", href: "/(tabs)/daily" },
          { label: "Track Meals", icon: "restaurant-outline", href: "/(tabs)/meals" },
          { label: "My Splits", icon: "layers-outline", href: "/(tabs)/splits" },
          { label: "Exercises", icon: "fitness-outline", href: "/(tabs)/exercises" },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(item.href as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: colors.iconCircle }]}>
              <Ionicons name={item.icon as any} size={24} color="#E00000" />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  greetRow: {
    marginBottom: 24,
  },
  greeting: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subGreeting: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 28,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    marginLeft: 8,
  },
  progressDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#E00000",
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSteps: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  continueText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    marginRight: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickCard: {
    width: "47%",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  recsSection: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  recsScrollContent: {
    gap: 16,
    paddingRight: 20,
  },
  recCard: {
    width: 290,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  recCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recSplitName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  recSessionName: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    marginTop: 2,
  },
  scoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  scoreTagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
  },
  targetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  targetPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  recReason: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    marginBottom: 14,
  },
  exercisesPreview: {
    marginBottom: 16,
  },
  exTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  exListText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },
  startRecBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  startRecBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
  },
  startRecBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: "#FFF",
    letterSpacing: 0.5,
  },
});
