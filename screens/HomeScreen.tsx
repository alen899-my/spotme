import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import axios from "axios";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => { loadCachedUser(); }, []);

  useFocusEffect(useCallback(() => { fetchUserData(); }, []));

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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      // Use replace to the root landing page (app/index.tsx)
      router.replace("/");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  const { steps, percent } = calculateProgress();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, padding: 24 }}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Hello, {(user?.full_name || user?.fullName)?.split(' ')[0] || 'User'}! 👋
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Let's crush your goals today.</Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#E00000" />
          </TouchableOpacity>
        </View>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, marginTop: 10 },
  title: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 4 },
  subtitle: { fontFamily: FONTS.body, fontSize: 14 },
  logoutBtn: { padding: 10, borderRadius: 8, borderWidth: 1 },
  progressCard: { borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  progressHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  progressTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, marginLeft: 8 },
  progressDesc: { fontFamily: FONTS.body, fontSize: 13, marginBottom: 20, lineHeight: 20 },
  progressBarBg: { height: 8, borderRadius: 4, marginBottom: 16, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#E00000", borderRadius: 4 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressSteps: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  continueBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  continueText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, marginRight: 4 },
});
