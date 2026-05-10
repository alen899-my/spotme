import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../constants/theme";
import axios from "axios";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    loadCachedUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const loadCachedUser = async () => {
    try {
      const cached = await AsyncStorage.getItem("userData");
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/");
        return;
      }
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      // Sync cache
      await AsyncStorage.setItem("userData", JSON.stringify(res.data));
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!user) return { steps: 0, percent: 0 };
    
    // Debug log to see what the server is returning
    console.log("Current User Data for Progress:", user);
    
    let completedSteps = 0;
    
    // Step 1: Basic Info (Check both snake_case and camelCase)
    if (user.age || (user.height && user.weight)) completedSteps++;
    
    // Step 2: Fitness Info
    if (user.fitness_goal || user.fitnessGoal || user.experience_level || user.experienceLevel) completedSteps++;
    
    // Step 3: Body (Any measurement counts)
    if (user.neck || user.waist || user.hip || user.chest || user.arm || user.thigh) completedSteps++;
    
    // Step 4: Health
    if (user.medication || user.medical_conditions || user.medicalConditions || user.allergies) completedSteps++;
    
    // Step 5: Nutrition
    if (user.diet_type || user.dietType || user.food_preference || user.foodPreference || user.water_intake || user.waterIntake) completedSteps++;
    
    // Step 6: Photos
    if (user.profile_pic_url || user.profilePicUrl || user.front_photo_url || user.frontPhotoUrl) completedSteps++;

    return {
      steps: completedSteps,
      percent: Math.min(Math.round((completedSteps / 6) * 100), 100)
    };
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  const { steps, percent } = calculateProgress();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hello, {(user?.full_name || user?.fullName) ? (user?.full_name || user?.fullName).split(' ')[0] : 'User'}! 👋</Text>
            <Text style={styles.subtitle}>Let's crush your goals today.</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#E00000" />
          </TouchableOpacity>
        </View>
        
        {/* Profile Progress Card (Hide if completed) */}
        {!user?.onboarding_completed && (
          <TouchableOpacity 
            style={styles.progressCard} 
            activeOpacity={0.9}
            onPress={() => router.push("/onboarding")}
          >
            <View style={styles.progressHeader}>
              <Ionicons name="person-circle-outline" size={28} color="#E00000" />
              <Text style={styles.progressTitle}>Complete Profile</Text>
            </View>
            <Text style={styles.progressDesc}>
              Unlock personalized workouts and nutrition plans by completing your fitness profile.
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressSteps}>{steps} / 6 Steps Completed</Text>
              <View style={styles.continueBtn}>
                <Text style={styles.continueText}>{steps === 0 ? "Start" : "Continue"}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    marginTop: 10,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: "#111111",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#666666",
  },
  logoutBtn: {
    backgroundColor: "#F9F9F9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: "#111111",
    marginLeft: 8,
  },
  progressDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#666666",
    marginBottom: 20,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F0F0F0",
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
    color: "#888888",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  continueText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: "#FFFFFF",
    marginRight: 4,
  },
});
