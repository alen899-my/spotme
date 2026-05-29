import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── App Theme ─────────────────────────────────────────────────────────────────
const T = {
  bg:       "#04282B",
  bgDeep:   "#021518",
  bgCard:   "rgba(10,80,85,0.55)",
  bgCardSolid: "#0A3E42",
  primary:  "#2596BE",
  gold:     "#F7CB16",
  text:     "#FFFFFF",
  textMuted:"rgba(255,255,255,0.62)",
  textSoft: "rgba(255,255,255,0.38)",
  border:   "rgba(37,150,190,0.28)",
  borderGold:"rgba(247,203,22,0.35)",
  success:  "#10B981",
  error:    "#FF4D4D",
};

// ─── Step Map ────────────────────────────────────────────────────────────────
// 0=Welcome  1=Gender  2=BasicInfo  3=FitnessGoal  4=Experience
// 5=Activity  6=Measurements  7=Health  8=Nutrition  9=Photos  10=Review  11=Success
const TOTAL_STEPS = 10; // 1-10 shown in progress bar

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ─── Form State ──────────────────────────────────────────────────────────

  // Step 1 – Gender
  const [gender, setGender] = useState("");

  // Step 2 – Basic Info
  const [age, setAge] = useState("");
  const [heightVal, setHeightVal] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [units, setUnits] = useState({ height: "cm", weight: "kg", neck:"cm", waist:"cm", hip:"cm", chest:"cm", arm:"cm", thigh:"cm" });
  const updateUnit = (field: keyof typeof units, unit: string) =>
    setUnits(prev => ({ ...prev, [field]: unit }));

  // Step 3 – Fitness Goal
  const [fitnessGoal, setFitnessGoal] = useState("");

  // Step 4 – Experience Level
  const [experienceLevel, setExperienceLevel] = useState("");

  // Step 5 – Activity Level
  const [activityLevel, setActivityLevel] = useState("");

  // Step 6 – Body Measurements
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");

  // Step 7 – Health
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medication, setMedication] = useState<"Yes" | "No" | null>(null);
  const [allergies, setAllergies] = useState("");

  // Step 8 – Nutrition
  const [dietType, setDietType] = useState("");
  const [foodPref, setFoodPref] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");

  // Step 9 – Photos
  const [photos, setPhotos] = useState<{ profile: string|null; front: string|null; back: string|null; side: string|null }>({
    profile: null, front: null, back: null, side: null,
  });

  // ─── Transition helper ────────────────────────────────────────────────────
  const animateToStep = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const nextStep = () => { if (step < 11) animateToStep(step + 1); };
  const prevStep = () => { if (step > 0) animateToStep(step - 1); else router.back(); };

  // ─── Per-step API save ────────────────────────────────────────────────────
  const saveStepToBackend = async (extraFields: Record<string, any> = {}) => {
    try {
      setSavingStep(true);
      const userStr = await AsyncStorage.getItem("userData");
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.id;
      if (!userId) return;

      await axios.post(`${API_URL}/auth/update-profile`, {
        userId,
        gender,
        age: age || undefined,
        height: heightVal ? `${heightVal} ${units.height}` : undefined,
        weight: weightVal ? `${weightVal} ${units.weight}` : undefined,
        bodyFat: bodyFat || undefined,
        fitnessGoal: fitnessGoal || undefined,
        experienceLevel: experienceLevel || undefined,
        activityLevel: activityLevel || undefined,
        neck: neck ? `${neck} ${units.neck}` : undefined,
        waist: waist ? `${waist} ${units.waist}` : undefined,
        hip: hip ? `${hip} ${units.hip}` : undefined,
        chest: chest ? `${chest} ${units.chest}` : undefined,
        arm: arm ? `${arm} ${units.arm}` : undefined,
        thigh: thigh ? `${thigh} ${units.thigh}` : undefined,
        medicalConditions: medicalConditions || undefined,
        medication: medication || undefined,
        allergies: allergies || undefined,
        dietType: dietType || undefined,
        foodPreference: foodPref || undefined,
        waterIntake: waterIntake || undefined,
        foodAllergies: foodAllergies || undefined,
        ...extraFields,
      });
    } catch (e) {
      console.log("Step save error (non-critical):", e);
    } finally {
      setSavingStep(false);
    }
  };

  // ─── Final submit ─────────────────────────────────────────────────────────
  const submitOnboarding = async () => {
    try {
      setIsSubmitting(true);
      const userStr = await AsyncStorage.getItem("userData");
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.id;
      if (!userId) { alert("Session expired. Please login again."); router.replace("/"); return; }

      const formData = new FormData();
      formData.append("userId", userId.toString());
      formData.append("age", age);
      formData.append("height", `${heightVal} ${units.height}`);
      formData.append("weight", `${weightVal} ${units.weight}`);
      if (bodyFat) formData.append("bodyFat", bodyFat);
      formData.append("fitnessGoal", fitnessGoal);
      formData.append("experienceLevel", experienceLevel);
      formData.append("activityLevel", activityLevel);
      if (neck) formData.append("neck", `${neck} ${units.neck}`);
      if (waist) formData.append("waist", `${waist} ${units.waist}`);
      if (hip) formData.append("hip", `${hip} ${units.hip}`);
      if (chest) formData.append("chest", `${chest} ${units.chest}`);
      if (arm) formData.append("arm", `${arm} ${units.arm}`);
      if (thigh) formData.append("thigh", `${thigh} ${units.thigh}`);
      if (medicalConditions) formData.append("medicalConditions", medicalConditions);
      if (medication) formData.append("medication", medication);
      if (allergies) formData.append("allergies", allergies);
      formData.append("dietType", dietType);
      formData.append("foodPreference", foodPref);
      formData.append("waterIntake", waterIntake);
      if (foodAllergies) formData.append("foodAllergies", foodAllergies);

      const appendImage = async (key: keyof typeof photos, fieldName: string) => {
        const uri = photos[key];
        if (!uri || uri.startsWith("http")) return;
        try {
          if (Platform.OS === "web") {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append(fieldName, blob, `${fieldName}.jpg`);
          } else {
            const ext = uri.split(".").pop() || "jpg";
            formData.append(fieldName, { uri, name: `${fieldName}.${ext}`, type: `image/${ext === "png" ? "png" : "jpeg"}` } as any);
          }
        } catch (e) { console.error(`Image error ${fieldName}:`, e); }
      };

      await appendImage("profile", "profilePic");
      await appendImage("front", "frontPhoto");
      await appendImage("back", "backPhoto");
      await appendImage("side", "sidePhoto");

      const response = await fetch(`${API_URL}/onboarding/complete`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      const result = await response.json();

      if (response.ok) {
        // Update local storage
        const updatedUser = { ...userData, onboarding_completed: result.onboardingCompleted };
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        animateToStep(11);
      } else {
        alert(result.error || "Failed to save profile. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Make sure the backend server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async (type: keyof typeof photos) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: type === "profile" ? [1, 1] : [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setPhotos({ ...photos, [type]: result.assets[0].uri });
  };

  const isSectionComplete = (section: string) => {
    switch (section) {
      case "Gender": return gender !== "";
      case "Basic Information": return age.trim() !== "" && heightVal.trim() !== "" && weightVal.trim() !== "";
      case "Fitness Goal": return fitnessGoal !== "";
      case "Experience Level": return experienceLevel !== "";
      case "Activity Level": return activityLevel !== "";
      case "Measurements": return neck !== "" || waist !== "" || chest !== "";
      case "Health Info": return medication !== null;
      case "Nutrition": return dietType !== "" && foodPref !== "" && waterIntake !== "";
      case "Photos": return photos.profile !== null;
      default: return false;
    }
  };

  // ─── Progress Header ──────────────────────────────────────────────────────
  const renderHeader = () => {
    if (step === 0 || step === 11) return null;
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={prevStep} style={styles.headerBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Ionicons name="chevron-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={styles.wordmark}>
          <Text style={styles.wordSpot}>spot</Text>
          <Text style={styles.wordMe}>ME</Text>
        </View>
        {step < 10 ? (
          <TouchableOpacity onPress={nextStep} style={styles.headerSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>
    );
  };

  const renderProgress = () => {
    if (step === 0 || step === 11) return null;
    const filled = Math.min(step, TOTAL_STEPS);
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                i < filled ? styles.progressSegActive : null,
                i < filled - 1 ? styles.progressSegDone : null,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressLabel}>Step {step} of {TOTAL_STEPS}</Text>
      </View>
    );
  };

  // ─── Step Renders ─────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (step) {
      // ── WELCOME ────────────────────────────────────────────────────────────
      case 0:
        return (
          <View style={[styles.welcomeWrap, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 30 }]}>
            <LinearGradient colors={[T.bgDeep, T.bg]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.welcomeInner}>
              <View style={styles.welcomeWordmark}>
                <View style={styles.welcomeDot} />
                <Text style={styles.welcomeSpot}>spot</Text>
                <Text style={styles.welcomeMe}>ME</Text>
              </View>
              <Text style={styles.welcomeTitle}>{"Let's Build\nYour Profile"}</Text>
              <Text style={styles.welcomeSub}>
                Answer a few quick questions so we can create a plan that's made just for you.
              </Text>

              <View style={styles.welcomeStepsPreview}>
                {[
                  { icon: "body-outline", label: "Body & Stats" },
                  { icon: "fitness-outline", label: "Fitness Goals" },
                  { icon: "restaurant-outline", label: "Nutrition" },
                  { icon: "camera-outline", label: "Progress Photos" },
                ].map((item, i) => (
                  <View key={i} style={styles.welcomeStepItem}>
                    <View style={styles.welcomeStepIcon}>
                      <Ionicons name={item.icon as any} size={18} color={T.gold} />
                    </View>
                    <Text style={styles.welcomeStepLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={nextStep} activeOpacity={0.87}>
                <LinearGradient colors={[T.primary, "#1a6e8a"]} style={styles.primaryBtnGrad}>
                  <Text style={styles.primaryBtnText}>Start Setup</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.skipLinkBtn}>
                <Text style={styles.skipLinkText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      // ── GENDER ────────────────────────────────────────────────────────────
      case 1:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(247,203,22,0.15)" }]}>
                <MaterialCommunityIcons name="gender-male-female" size={22} color={T.gold} />
              </View>
              <Text style={styles.stepTitle}>What's your gender?</Text>
              <Text style={styles.stepSub}>This helps us personalise your fitness plan accurately.</Text>
            </View>

            <View style={styles.genderGrid}>
              {[
                { value: "Male",               icon: "male",              color: "#2596BE", bg: "rgba(37,150,190,0.15)",   border: "rgba(37,150,190,0.45)" },
                { value: "Female",             icon: "female",            color: "#E060A0", bg: "rgba(224,96,160,0.15)",   border: "rgba(224,96,160,0.45)" },
                { value: "Other",              icon: "male-female",       color: "#9B59B6", bg: "rgba(155,89,182,0.15)",   border: "rgba(155,89,182,0.45)" },
                { value: "Prefer not to say",  icon: "person",            color: T.textMuted, bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.18)" },
              ].map(item => {
                const selected = gender === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.genderCard,
                      { borderColor: selected ? item.color : item.border, backgroundColor: selected ? item.bg : "rgba(255,255,255,0.04)" },
                    ]}
                    onPress={() => setGender(item.value)}
                    activeOpacity={0.82}
                  >
                    {selected && (
                      <View style={[styles.genderCheck, { backgroundColor: item.color }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                    <Ionicons name={item.icon as any} size={36} color={selected ? item.color : T.textMuted} style={{ marginBottom: 10 }} />
                    <Text style={[styles.genderLabel, { color: selected ? T.text : T.textMuted }]}>{item.value}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !gender && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!gender}
              activeOpacity={0.87}
            >
              <LinearGradient colors={gender ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── BASIC INFO ────────────────────────────────────────────────────────
      case 2:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(37,150,190,0.15)" }]}>
                <Ionicons name="person-outline" size={22} color={T.primary} />
              </View>
              <Text style={styles.stepTitle}>Basic Information</Text>
              <Text style={styles.stepSub}>Tell us the basics so we can calculate your metrics.</Text>
            </View>

            <ThemedInput label="Age" placeholder="e.g. 24" value={age} onChangeText={setAge} keyboardType="numeric"
              icon={<Ionicons name="calendar-outline" size={16} color={T.primary} />} />

            <ThemedInput label="Height" placeholder="Enter your height" value={heightVal} onChangeText={setHeightVal}
              keyboardType="numeric"
              rightElement={
                <UnitToggle options={["cm","in"]} value={units.height} onChange={u => updateUnit("height", u)} />
              }
            />

            <ThemedInput label="Current Weight" placeholder="Enter your weight" value={weightVal} onChangeText={setWeightVal}
              keyboardType="numeric"
              rightElement={
                <UnitToggle options={["kg","lbs"]} value={units.weight} onChange={u => updateUnit("weight", u)} />
              }
            />

            <ThemedInput label="Body Fat % (Optional)" placeholder="e.g. 18" value={bodyFat} onChangeText={setBodyFat}
              keyboardType="numeric"
              rightElement={<Text style={styles.unitLabel}>%</Text>}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (!age || !heightVal || !weightVal) && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!age || !heightVal || !weightVal}
              activeOpacity={0.87}
            >
              <LinearGradient colors={(age && heightVal && weightVal) ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── FITNESS GOAL ──────────────────────────────────────────────────────
      case 3:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(247,203,22,0.15)" }]}>
                <Ionicons name="flag-outline" size={22} color={T.gold} />
              </View>
              <Text style={styles.stepTitle}>What's your main goal?</Text>
              <Text style={styles.stepSub}>We'll design your entire program around this.</Text>
            </View>

            {[
              { value: "Lose Weight",       icon: "flame-outline",      desc: "Burn fat & shed pounds",         color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
              { value: "Build Muscle",      icon: "barbell-outline",    desc: "Gain strength & size",           color: "#2596BE", bg: "rgba(37,150,190,0.14)" },
              { value: "Improve Endurance", icon: "bicycle-outline",    desc: "Boost cardio & stamina",         color: "#10B981", bg: "rgba(16,185,129,0.14)" },
              { value: "Maintain Health",   icon: "heart-outline",      desc: "Stay fit & feel great",          color: "#E060A0", bg: "rgba(224,96,160,0.14)" },
              { value: "Rehab",             icon: "bandage-outline",    desc: "Recover & rebuild safely",       color: "#9B59B6", bg: "rgba(155,89,182,0.14)" },
            ].map(item => {
              const selected = fitnessGoal === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionCard, selected && { borderColor: item.color, backgroundColor: item.bg }]}
                  onPress={() => setFitnessGoal(item.value)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: selected ? item.bg : "rgba(255,255,255,0.05)" }]}>
                    <Ionicons name={item.icon as any} size={24} color={selected ? item.color : T.textMuted} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: selected ? T.text : T.textMuted }]}>{item.value}</Text>
                    <Text style={styles.optionDesc}>{item.desc}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12 }, !fitnessGoal && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!fitnessGoal}
              activeOpacity={0.87}
            >
              <LinearGradient colors={fitnessGoal ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── EXPERIENCE LEVEL ──────────────────────────────────────────────────
      case 4:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(37,150,190,0.15)" }]}>
                <Ionicons name="medal-outline" size={22} color={T.primary} />
              </View>
              <Text style={styles.stepTitle}>Experience Level</Text>
              <Text style={styles.stepSub}>How long have you been training?</Text>
            </View>

            {[
              { value: "Beginner (0-1 years)",       label: "Beginner",      sub: "0–1 years of training",      icon: "leaf-outline",          color: "#10B981", bg: "rgba(16,185,129,0.14)" },
              { value: "Intermediate (1-3 years)",   label: "Intermediate",  sub: "1–3 years of training",      icon: "trending-up-outline",   color: T.gold,    bg: "rgba(247,203,22,0.14)" },
              { value: "Advanced (3+ years)",        label: "Advanced",      sub: "3+ years of training",       icon: "flame-outline",         color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
            ].map(item => {
              const selected = experienceLevel === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.expCard, selected && { borderColor: item.color, backgroundColor: item.bg }]}
                  onPress={() => setExperienceLevel(item.value)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.expIconWrap, { backgroundColor: selected ? item.bg : "rgba(255,255,255,0.05)" }]}>
                    <Ionicons name={item.icon as any} size={28} color={selected ? item.color : T.textMuted} />
                  </View>
                  <View style={styles.expText}>
                    <Text style={[styles.expLabel, { color: selected ? T.text : T.textMuted }]}>{item.label}</Text>
                    <Text style={styles.expSub}>{item.sub}</Text>
                  </View>
                  {selected && (
                    <View style={[styles.expCheck, { backgroundColor: item.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12 }, !experienceLevel && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!experienceLevel}
              activeOpacity={0.87}
            >
              <LinearGradient colors={experienceLevel ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── ACTIVITY LEVEL ────────────────────────────────────────────────────
      case 5:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(247,203,22,0.15)" }]}>
                <Ionicons name="walk-outline" size={22} color={T.gold} />
              </View>
              <Text style={styles.stepTitle}>How active are you?</Text>
              <Text style={styles.stepSub}>Outside of structured workouts, how much do you move?</Text>
            </View>

            {[
              { value: "Sedentary",         label: "Sedentary",          sub: "Mostly sitting — office job",         icon: "laptop-outline",        color: "#6B7280", bg: "rgba(107,114,128,0.14)" },
              { value: "Lightly Active",    label: "Lightly Active",     sub: "Light exercise 1–2 days/week",        icon: "walk-outline",          color: "#10B981", bg: "rgba(16,185,129,0.14)" },
              { value: "Moderately Active", label: "Moderately Active",  sub: "Moderate exercise 3–5 days/week",     icon: "bicycle-outline",       color: T.gold,    bg: "rgba(247,203,22,0.14)" },
              { value: "Very Active",       label: "Very Active",        sub: "Hard exercise 6–7 days/week",         icon: "barbell-outline",       color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
            ].map(item => {
              const selected = activityLevel === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionCard, selected && { borderColor: item.color, backgroundColor: item.bg }]}
                  onPress={() => setActivityLevel(item.value)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: selected ? item.bg : "rgba(255,255,255,0.05)" }]}>
                    <Ionicons name={item.icon as any} size={24} color={selected ? item.color : T.textMuted} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: selected ? T.text : T.textMuted }]}>{item.label}</Text>
                    <Text style={styles.optionDesc}>{item.sub}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12 }, !activityLevel && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!activityLevel}
              activeOpacity={0.87}
            >
              <LinearGradient colors={activityLevel ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── BODY MEASUREMENTS ─────────────────────────────────────────────────
      case 6:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(37,150,190,0.15)" }]}>
                <Ionicons name="body-outline" size={22} color={T.primary} />
              </View>
              <Text style={styles.stepTitle}>Body Measurements</Text>
              <Text style={[styles.stepSub]}>Optional — helps track your physical progress over time.</Text>
            </View>

            <View style={styles.optionalBadge}>
              <Ionicons name="information-circle-outline" size={14} color={T.gold} />
              <Text style={styles.optionalText}>All fields are optional</Text>
            </View>

            <ThemedInput label="Neck" placeholder="Neck circumference" value={neck} onChangeText={setNeck} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.neck} onChange={u => updateUnit("neck", u)} />} />
            <ThemedInput label="Waist" placeholder="Waist circumference" value={waist} onChangeText={setWaist} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.waist} onChange={u => updateUnit("waist", u)} />} />
            <ThemedInput label="Hip" placeholder="Hip circumference" value={hip} onChangeText={setHip} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.hip} onChange={u => updateUnit("hip", u)} />} />
            <ThemedInput label="Chest" placeholder="Chest circumference" value={chest} onChangeText={setChest} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.chest} onChange={u => updateUnit("chest", u)} />} />
            <ThemedInput label="Arm" placeholder="Arm circumference" value={arm} onChangeText={setArm} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.arm} onChange={u => updateUnit("arm", u)} />} />
            <ThemedInput label="Thigh" placeholder="Thigh circumference" value={thigh} onChangeText={setThigh} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm","in"]} value={units.thigh} onChange={u => updateUnit("thigh", u)} />} />

            <TouchableOpacity style={styles.primaryBtn} onPress={async () => { await saveStepToBackend(); nextStep(); }} activeOpacity={0.87}>
              <LinearGradient colors={[T.primary, "#1a6e8a"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── HEALTH INFO ───────────────────────────────────────────────────────
      case 7:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(255,77,77,0.15)" }]}>
                <Ionicons name="medical-outline" size={22} color="#FF4D4D" />
              </View>
              <Text style={styles.stepTitle}>Health Information</Text>
              <Text style={styles.stepSub}>Your safety is our top priority.</Text>
            </View>

            <Text style={styles.fieldLabel}>Do you take any medication?</Text>
            <View style={styles.radioRow}>
              {["Yes","No"].map(opt => {
                const selected = medication === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.radioCard, selected && { borderColor: T.primary, backgroundColor: "rgba(37,150,190,0.14)" }]}
                    onPress={() => setMedication(opt as any)}
                  >
                    <View style={[styles.radioCircle, selected && { borderColor: T.primary }]}>
                      {selected && <View style={styles.radioFill} />}
                    </View>
                    <Text style={[styles.radioLabel, { color: selected ? T.text : T.textMuted }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Medical Conditions (Optional)</Text>
            <View style={styles.textAreaWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Any injuries or medical conditions..."
                placeholderTextColor={T.textSoft}
                multiline
                numberOfLines={4}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.fieldLabel}>Allergies (Optional)</Text>
            <View style={styles.textAreaWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Any allergies to be aware of..."
                placeholderTextColor={T.textSoft}
                multiline
                numberOfLines={3}
                value={allergies}
                onChangeText={setAllergies}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={async () => { await saveStepToBackend(); nextStep(); }} activeOpacity={0.87}>
              <LinearGradient colors={[T.primary, "#1a6e8a"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── NUTRITION ─────────────────────────────────────────────────────────
      case 8:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                <Ionicons name="restaurant-outline" size={22} color={T.success} />
              </View>
              <Text style={styles.stepTitle}>Nutrition Preferences</Text>
              <Text style={styles.stepSub}>Personalise your meal plan to match your lifestyle.</Text>
            </View>

            <Text style={styles.fieldLabel}>Diet Type</Text>
            <View style={styles.chipGrid}>
              {["Standard","Vegetarian","Vegan","Keto","Paleo"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, dietType === opt && styles.chipActive]}
                  onPress={() => setDietType(opt)}
                >
                  <Text style={[styles.chipText, dietType === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Food Preference</Text>
            <View style={styles.chipGrid}>
              {["No Preference","High Protein","Low Carb","Low Fat"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, foodPref === opt && styles.chipActive]}
                  onPress={() => setFoodPref(opt)}
                >
                  <Text style={[styles.chipText, foodPref === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Daily Water Intake</Text>
            <View style={styles.chipGrid}>
              {["Less than 1L","1-2L","2-3L","More than 3L"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, waterIntake === opt && styles.chipActive]}
                  onPress={() => setWaterIntake(opt)}
                >
                  <Ionicons name="water-outline" size={13} color={waterIntake === opt ? T.bg : T.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, waterIntake === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Food Allergies (Optional)</Text>
            <View style={styles.textAreaWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Peanuts, gluten, dairy..."
                placeholderTextColor={T.textSoft}
                multiline
                numberOfLines={3}
                value={foodAllergies}
                onChangeText={setFoodAllergies}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!dietType || !foodPref || !waterIntake) && styles.primaryBtnDisabled]}
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!dietType || !foodPref || !waterIntake}
              activeOpacity={0.87}
            >
              <LinearGradient colors={(dietType && foodPref && waterIntake) ? [T.primary, "#1a6e8a"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── PHOTOS ────────────────────────────────────────────────────────────
      case 9:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(247,203,22,0.15)" }]}>
                <Ionicons name="camera-outline" size={22} color={T.gold} />
              </View>
              <Text style={styles.stepTitle}>Progress Photos</Text>
              <Text style={styles.stepSub}>Visualise your transformation over time.</Text>
            </View>

            {/* Profile Photo */}
            <View style={styles.photoCard}>
              <View style={styles.photoCardHeader}>
                <View style={[styles.photoCardIconWrap, { backgroundColor: "rgba(37,150,190,0.15)" }]}>
                  <Ionicons name="person-outline" size={18} color={T.primary} />
                </View>
                <Text style={styles.photoCardTitle}>Profile Picture</Text>
              </View>
              <TouchableOpacity style={styles.circleUpload} onPress={() => pickImage("profile")}>
                {photos.profile ? (
                  <Image source={{ uri: photos.profile }} style={styles.circleImage} />
                ) : (
                  <View style={styles.circlePlaceholder}>
                    <Ionicons name="camera" size={28} color={T.textSoft} />
                    <Text style={styles.uploadSmall}>Tap to add</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.photoHint}>Visible on your profile & to your coach.</Text>
            </View>

            <Text style={styles.photoSectionLabel}>Physique Photos <Text style={{ color: T.textMuted, fontSize: 12 }}>(Optional)</Text></Text>

            {[
              { id: "front", title: "Front View",     icon: "body-outline" },
              { id: "back",  title: "Back View",      icon: "walk-outline" },
              { id: "side",  title: "Side View",      icon: "accessibility-outline" },
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.bodyPhotoCard, photos[item.id as keyof typeof photos] && styles.bodyPhotoCardDone]}
                onPress={() => pickImage(item.id as keyof typeof photos)}
              >
                {photos[item.id as keyof typeof photos] ? (
                  <Image source={{ uri: photos[item.id as keyof typeof photos]! }} style={styles.bodyPhotoPreview} />
                ) : (
                  <View style={styles.bodyPhotoPlaceholder}>
                    <View style={styles.bodyPhotoAddCircle}>
                      <Ionicons name="add" size={22} color={T.primary} />
                    </View>
                    <Text style={styles.bodyPhotoTitle}>Upload {item.title}</Text>
                    <Text style={styles.bodyPhotoSub}>Tap to select from gallery</Text>
                  </View>
                )}
                {photos[item.id as keyof typeof photos] && (
                  <View style={styles.uploadedBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={T.success} />
                    <Text style={styles.uploadedBadgeText}>Uploaded</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep} activeOpacity={0.87}>
              <LinearGradient colors={[T.primary, "#1a6e8a"]} style={styles.primaryBtnGrad}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── REVIEW ────────────────────────────────────────────────────────────
      case 10:
        const sections = [
          { name: "Gender",           step: 1 },
          { name: "Basic Information", step: 2 },
          { name: "Fitness Goal",      step: 3 },
          { name: "Experience Level",  step: 4 },
          { name: "Activity Level",    step: 5 },
          { name: "Measurements",      step: 6 },
          { name: "Health Info",       step: 7 },
          { name: "Nutrition",         step: 8 },
          { name: "Photos",            step: 9 },
        ];
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <View style={[styles.stepIconBadge, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={T.success} />
              </View>
              <Text style={styles.stepTitle}>Almost There!</Text>
              <Text style={styles.stepSub}>Review your information before finalising.</Text>
            </View>

            <View style={styles.reviewCard}>
              {sections.map((s, i) => {
                const done = isSectionComplete(s.name);
                return (
                  <TouchableOpacity key={i} style={styles.reviewItem} onPress={() => animateToStep(s.step)}>
                    <View style={[styles.reviewIconWrap, { backgroundColor: done ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)" }]}>
                      <Ionicons name={done ? "checkmark" : "ellipse-outline"} size={16} color={done ? T.success : T.textSoft} />
                    </View>
                    <Text style={[styles.reviewItemText, { color: done ? T.text : T.textMuted }]}>{s.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={T.textSoft} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.secureNotice}>
              <Ionicons name="shield-half-outline" size={20} color={T.primary} />
              <Text style={styles.secureText}>Your data is encrypted and never shared.</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
              onPress={submitOnboarding}
              disabled={isSubmitting}
              activeOpacity={0.87}
            >
              <LinearGradient colors={!isSubmitting ? [T.gold, "#E7B100"] : ["#1a3a3d","#1a3a3d"]} style={styles.primaryBtnGrad}>
                {isSubmitting ? (
                  <ActivityIndicator color={T.bg} />
                ) : (
                  <>
                    <Text style={[styles.primaryBtnText, { color: T.bg }]}>Complete Profile</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color={T.bg} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── SUCCESS ───────────────────────────────────────────────────────────
      case 11:
        return <SuccessScreen onFinish={() => router.replace("/(tabs)")} />;
    }
  };

  // ─── Root ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[T.bgDeep, T.bg]} style={StyleSheet.absoluteFillObject} />

      {step === 0 || step === 11 ? (
        renderContent()
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {renderHeader()}
          {renderProgress()}
          <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
            {renderContent()}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function UnitToggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={subStyles.unitToggle}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[subStyles.unitBtn, value === opt && subStyles.unitBtnActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[subStyles.unitBtnText, value === opt && subStyles.unitBtnTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ThemedInput({
  label, placeholder, value, onChangeText, keyboardType, icon, rightElement,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={subStyles.inputWrap}>
      <Text style={subStyles.inputLabel}>{label}</Text>
      <View style={subStyles.inputRow}>
        {icon && <View style={subStyles.inputIconWrap}>{icon}</View>}
        <TextInput
          style={[subStyles.input, !!icon ? { paddingLeft: 42 } : null, !!rightElement ? { paddingRight: 80 } : null]}
          placeholder={placeholder}
          placeholderTextColor={T.textSoft}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          selectionColor={T.primary}
        />
        {rightElement && <View style={subStyles.inputRight}>{rightElement}</View>}
      </View>
    </View>
  );
}

function SuccessScreen({ onFinish }: { onFinish: () => void }) {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 5, useNativeDriver: true }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 600, delay: 350, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[subStyles.successRoot, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient colors={[T.bgDeep, T.bg]} style={StyleSheet.absoluteFillObject} />
      <View style={subStyles.successWordmark}>
        <View style={subStyles.successDot} />
        <Text style={subStyles.successSpot}>spot</Text>
        <Text style={subStyles.successMe}>ME</Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={[subStyles.successRing, {
          transform: [{ scale: pulseAnim.interpolate({ inputRange:[0,1], outputRange:[1,2.8] }) }],
          opacity: pulseAnim.interpolate({ inputRange:[0,1], outputRange:[0.5,0] }),
        }]} />
        <Animated.View style={[subStyles.successRing, {
          transform: [{ scale: pulseAnim.interpolate({ inputRange:[0,1], outputRange:[0.5,1.9] }) }],
          opacity: pulseAnim.interpolate({ inputRange:[0,1], outputRange:[0.35,0] }),
        }]} />
        <Animated.View style={[subStyles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={60} color="#FFF" />
        </Animated.View>

        <Animated.Text style={[subStyles.successTitle, { opacity: opacityAnim, transform: [{ translateY: opacityAnim.interpolate({ inputRange:[0,1], outputRange:[22,0] }) }] }]}>
          You're All Set! 🎉
        </Animated.Text>
        <Animated.Text style={[subStyles.successSub, { opacity: opacityAnim }]}>
          Your profile is complete. We're building your personalised plan right now.
        </Animated.Text>
      </View>

      <Animated.View style={{ opacity: opacityAnim, width: "100%", paddingHorizontal: 24 }}>
        <TouchableOpacity style={subStyles.successBtn} onPress={onFinish} activeOpacity={0.87}>
          <LinearGradient colors={[T.gold, "#E7B100"]} style={subStyles.successBtnGrad}>
            <Text style={subStyles.successBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={18} color={T.bg} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Welcome
  welcomeWrap: { flex: 1 },
  welcomeInner: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
  welcomeWordmark: { flexDirection: "row", alignItems: "center", marginBottom: 48 },
  welcomeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.gold, marginRight: 6 },
  welcomeSpot: { fontFamily: FONTS.heading, fontSize: 28, color: T.text, letterSpacing: 1 },
  welcomeMe: { fontFamily: FONTS.heading, fontSize: 28, color: T.gold, letterSpacing: 1 },
  welcomeTitle: { fontFamily: FONTS.heading, fontSize: 46, color: T.text, lineHeight: 52, marginBottom: 16 },
  welcomeSub: { fontFamily: FONTS.body, fontSize: 15, color: T.textMuted, lineHeight: 23, marginBottom: 42 },
  welcomeStepsPreview: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 44 },
  welcomeStepItem: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, gap: 7, borderWidth: 1, borderColor: T.border },
  welcomeStepIcon: { },
  welcomeStepLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: T.textMuted },
  skipLinkBtn: { marginTop: 18, alignItems: "center" },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14, color: T.textSoft },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 },
  headerBack: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", justifyContent: "center", alignItems: "center" },
  wordmark: { flexDirection: "row", alignItems: "center" },
  wordSpot: { fontFamily: FONTS.heading, fontSize: 22, color: T.text },
  wordMe: { fontFamily: FONTS.heading, fontSize: 22, color: T.gold },
  headerSkip: {},
  skipText: { fontFamily: FONTS.body, fontSize: 13, color: T.textMuted },

  // Progress
  progressWrap: { paddingHorizontal: 20, paddingBottom: 18 },
  progressRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  progressSeg: { flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 2 },
  progressSegActive: { backgroundColor: T.primary },
  progressSegDone: { backgroundColor: T.primary },
  progressLabel: { fontFamily: FONTS.body, fontSize: 11, color: T.textMuted, textAlign: "center" },

  // Step
  stepScroll: { flex: 1 },
  stepContent: { paddingHorizontal: 22, paddingBottom: 50 },
  stepTitleWrap: { marginBottom: 28, marginTop: 10 },
  stepIconBadge: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  stepTitle: { fontFamily: FONTS.heading, fontSize: 30, color: T.text, marginBottom: 8 },
  stepSub: { fontFamily: FONTS.body, fontSize: 14, color: T.textMuted, lineHeight: 21 },

  // Gender
  genderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  genderCard: { width: (width - 56) / 2, borderRadius: 16, borderWidth: 1.5, padding: 22, alignItems: "center", justifyContent: "center", position: "relative" },
  genderCheck: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  genderLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },

  // Option card (fitness goal, activity)
  optionCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.09)", padding: 16, marginBottom: 10, gap: 14 },
  optionIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 3 },
  optionDesc: { fontFamily: FONTS.body, fontSize: 12, color: T.textMuted },

  // Experience card
  expCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.09)", padding: 18, marginBottom: 12, gap: 16 },
  expIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  expText: { flex: 1 },
  expLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 4 },
  expSub: { fontFamily: FONTS.body, fontSize: 12, color: T.textMuted },
  expCheck: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },

  // Optional badge
  optionalBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(247,203,22,0.10)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 20, alignSelf: "flex-start" },
  optionalText: { fontFamily: FONTS.body, fontSize: 12, color: T.gold },

  // Field label
  fieldLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: T.textMuted, marginBottom: 10, letterSpacing: 0.3 },

  // Radio
  radioRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  radioCard: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.09)", padding: 14, gap: 10 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: T.textMuted, justifyContent: "center", alignItems: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.primary },
  radioLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },

  // Text area
  textAreaWrap: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", borderRadius: 12, padding: 14, marginBottom: 20, minHeight: 100 },
  textArea: { fontFamily: FONTS.body, fontSize: 14, color: T.text, minHeight: 80 },

  // Chip (nutrition)
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", paddingVertical: 9, paddingHorizontal: 14 },
  chipActive: { backgroundColor: T.primary, borderColor: T.primary },
  chipText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: T.textMuted },
  chipTextActive: { color: "#FFF" },

  // Photos
  photoCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  photoCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  photoCardIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 10 },
  photoCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: T.text },
  circleUpload: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: T.border, borderStyle: "dashed", overflow: "hidden", alignSelf: "center", justifyContent: "center", alignItems: "center", marginVertical: 14 },
  circleImage: { width: "100%", height: "100%", borderRadius: 55 },
  circlePlaceholder: { alignItems: "center" },
  uploadSmall: { fontFamily: FONTS.body, fontSize: 11, color: T.textSoft, marginTop: 5 },
  photoHint: { fontFamily: FONTS.body, fontSize: 11, color: T.textSoft, textAlign: "center" },
  photoSectionLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: T.text, marginBottom: 12, marginTop: 4 },
  bodyPhotoCard: { height: 140, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.09)", borderStyle: "dashed", overflow: "hidden", marginBottom: 12, justifyContent: "center", alignItems: "center" },
  bodyPhotoCardDone: { borderStyle: "solid", borderColor: T.success },
  bodyPhotoPreview: { width: "100%", height: "100%" },
  bodyPhotoPlaceholder: { alignItems: "center" },
  bodyPhotoAddCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(37,150,190,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  bodyPhotoTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: T.textMuted, marginBottom: 4 },
  bodyPhotoSub: { fontFamily: FONTS.body, fontSize: 12, color: T.textSoft },
  uploadedBadge: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(16,185,129,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  uploadedBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: T.success },

  // Review
  reviewCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", overflow: "hidden", marginBottom: 20 },
  reviewItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", gap: 12 },
  reviewIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  reviewItemText: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  secureNotice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(37,150,190,0.10)", borderRadius: 10, padding: 12, marginBottom: 20 },
  secureText: { fontFamily: FONTS.body, fontSize: 13, color: T.textMuted, flex: 1 },

  // Unit label
  unitLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: T.primary },

  // Primary button
  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  primaryBtnGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 17, gap: 10 },
  primaryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: "#FFF" },
  primaryBtnDisabled: { opacity: 0.45 },
});

const subStyles = StyleSheet.create({
  // UnitToggle
  unitToggle: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: T.border },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "transparent" },
  unitBtnActive: { backgroundColor: T.primary },
  unitBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: T.textMuted },
  unitBtnTextActive: { color: "#FFF" },

  // ThemedInput
  inputWrap: { marginBottom: 18 },
  inputLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: T.textMuted, marginBottom: 8, letterSpacing: 0.3 },
  inputRow: { position: "relative" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: T.text,
  },
  inputIconWrap: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  inputRight: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center", alignItems: "flex-end" },

  // Success screen
  successRoot: { flex: 1, alignItems: "center" },
  successWordmark: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.gold, marginRight: 6 },
  successSpot: { fontFamily: FONTS.heading, fontSize: 22, color: T.text },
  successMe: { fontFamily: FONTS.heading, fontSize: 22, color: T.gold },
  successRing: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(16,185,129,0.14)", top: "40%", marginTop: -60 },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: T.success, justifyContent: "center", alignItems: "center", marginBottom: 30, shadowColor: T.success, shadowOffset:{width:0,height:6}, shadowOpacity:0.5, shadowRadius:14, elevation:10 },
  successTitle: { fontFamily: FONTS.heading, fontSize: 34, color: T.text, marginBottom: 12, textAlign: "center" },
  successSub: { fontFamily: FONTS.body, fontSize: 15, color: T.textMuted, textAlign: "center", paddingHorizontal: 30, lineHeight: 23 },
  successBtn: { borderRadius: 16, overflow: "hidden" },
  successBtnGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 17, gap: 10 },
  successBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: T.bg },
});
