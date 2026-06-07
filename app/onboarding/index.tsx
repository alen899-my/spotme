import React, { useState, useRef, useEffect } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { P } from "../../constants/homeTheme";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "../../utils/api";

const { width } = Dimensions.get("window");

const TOTAL_STEPS = 10;

// ─── Gender selection images ──────────────────────────────────────────────────
const GENDER_MALE   = require("../../assets/gender/male.jpg");
const GENDER_FEMALE = require("../../assets/gender/female.jpg");

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [hydrating, setHydrating] = useState(true); // blocks render until profile pre-load done
  const [userId, setUserId] = useState<number | null>(null);

  // Smooth slide + fade transitions with zero flickering
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ─── Form State ────────────────────────────────────────────────────────────
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [heightVal, setHeightVal] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [units, setUnits] = useState({
    height: "cm", weight: "kg", neck: "cm", waist: "cm",
    hip: "cm", chest: "cm", arm: "cm", thigh: "cm",
  });
  const updateUnit = (field: keyof typeof units, unit: string) =>
    setUnits(prev => ({ ...prev, [field]: unit }));

  const [fitnessGoal, setFitnessGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [activityLevel, setActivityLevel] = useState("");

  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");

  const [medicalConditions, setMedicalConditions] = useState("");
  const [medication, setMedication] = useState<"Yes" | "No" | null>(null);
  const [allergies, setAllergies] = useState("");

  const [dietType, setDietType] = useState("");
  const [foodPref, setFoodPref] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");

  const [photos, setPhotos] = useState<{
    profile: string | null; front: string | null;
    back: string | null; side: string | null;
  }>({ profile: null, front: null, back: null, side: null });

  // ─── Load existing profile & jump to first incomplete step ────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data;
        if (!u) return;
        setUserId(u.id);

        // Helper: split "175 cm" → { val: "175", unit: "cm" }
        const splitVal = (str: any, fallbackUnit = "cm") => {
          if (str === null || str === undefined || str === "") return { val: "", unit: fallbackUnit };
          const parts = String(str).trim().split(" ");
          return { val: parts[0] || "", unit: parts[1] || fallbackUnit };
        };

        // Helper: capitalize first letter (DB may store 'male' or 'Male')
        const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

        // Pre-populate all form fields
        if (u.gender) setGender(cap(u.gender));

        if (u.dob) {
          const dobStr = u.dob.split("T")[0];
          setDob(dobStr);
          setAge(calculateAge(dobStr));
        }

        const h = splitVal(u.height, "cm");
        if (h.val) { setHeightVal(h.val); setUnits(prev => ({ ...prev, height: h.unit })); }

        const w = splitVal(u.weight, "kg");
        if (w.val) { setWeightVal(w.val); setUnits(prev => ({ ...prev, weight: w.unit })); }

        if (u.body_fat) setBodyFat(u.body_fat.toString());
        if (u.fitness_goal) setFitnessGoal(u.fitness_goal);
        if (u.experience_level) setExperienceLevel(u.experience_level);
        if (u.activity_level) setActivityLevel(u.activity_level);

        const nk = splitVal(u.neck, "cm");  if (nk.val) { setNeck(nk.val);  setUnits(prev => ({ ...prev, neck: nk.unit })); }
        const ws = splitVal(u.waist, "cm"); if (ws.val) { setWaist(ws.val); setUnits(prev => ({ ...prev, waist: ws.unit })); }
        const hp = splitVal(u.hip, "cm");   if (hp.val) { setHip(hp.val);   setUnits(prev => ({ ...prev, hip: hp.unit })); }
        const ch = splitVal(u.chest, "cm"); if (ch.val) { setChest(ch.val); setUnits(prev => ({ ...prev, chest: ch.unit })); }
        const ar = splitVal(u.arm, "cm");   if (ar.val) { setArm(ar.val);   setUnits(prev => ({ ...prev, arm: ar.unit })); }
        const th = splitVal(u.thigh, "cm"); if (th.val) { setThigh(th.val); setUnits(prev => ({ ...prev, thigh: th.unit })); }

        if (u.medical_conditions) setMedicalConditions(u.medical_conditions);
        if (u.medication) setMedication(u.medication as "Yes" | "No");
        if (u.allergies) setAllergies(u.allergies);
        if (u.diet_type) setDietType(u.diet_type);
        if (u.food_preference) setFoodPref(u.food_preference);
        if (u.water_intake) setWaterIntake(u.water_intake);
        if (u.food_allergies) setFoodAllergies(u.food_allergies);

        // Pre-populate photos from DB (remote URLs)
        if (u.profile_pic_url) setPhotos(prev => ({ ...prev, profile: u.profile_pic_url }));
        if (u.front_photo_url) setPhotos(prev => ({ ...prev, front: u.front_photo_url }));
        if (u.back_photo_url)  setPhotos(prev => ({ ...prev, back:  u.back_photo_url }));
        if (u.side_photo_url)  setPhotos(prev => ({ ...prev, side:  u.side_photo_url }));

        // Determine the first incomplete step (steps 1–9)
        const genderNorm = cap(u.gender || "");

        // Step 6 (measurements) is optional. Consider it complete if measurements exist, OR if subsequent steps (medication/diet) are already completed.
        const measurementsDone = !!(nk.val || ws.val || ch.val) || !!u.medication || !!(u.diet_type && u.food_preference && u.water_intake);

        const stepChecks = [
          !!genderNorm,                                                            // step 1
          !!(u.dob && h.val && w.val),                                             // step 2
          !!u.fitness_goal,                                                        // step 3
          !!u.experience_level,                                                    // step 4
          !!u.activity_level,                                                      // step 5
          measurementsDone,                                                        // step 6 (optional)
          !!(u.medication),                                                        // step 7
          !!(u.diet_type && u.food_preference && u.water_intake),                 // step 8
          false,                                                                   // step 9 photos — always prompt
        ];

        const firstIncomplete = stepChecks.findIndex(done => !done);
        const jumpTo = firstIncomplete === -1 ? 10 : firstIncomplete + 1;

        // Jump if user has any saved data (even step 1)
        if (jumpTo >= 1 && stepChecks.some(Boolean)) {
          setStep(jumpTo);
        }
      } catch (e) {
        console.log("Profile pre-load error (non-critical):", e);
      } finally {
        setHydrating(false);
      }
    };
    loadProfile();
  }, []);

  // ─── Helper Functions ──────────────────────────────────────────────────────
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return "";
    const today = new Date();
    const birthDate = new Date(dateStr);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge.toString();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1).toString().padStart(2, "0")} / ${date.getFullYear()}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const dobStr = selectedDate.toISOString().split("T")[0];
      setDob(dobStr);
      setAge(calculateAge(dobStr));
    }
  };

  // ─── Transition ────────────────────────────────────────────────────────────
  const animateToStep = (nextStep: number) => {
    // 1. Fast fade-out and slide-down
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 12, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      // 2. Perform step layout swap instantly
      setStep(nextStep);
      // 3. Position below view boundary for upcoming fade-in
      slideAnim.setValue(-12);
      // 4. Smooth slide-up and fade-in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 170, useNativeDriver: true }),
      ]).start();
    });
  };

  const nextStep = () => { if (step < 11) animateToStep(step + 1); };
  const prevStep = () => { if (step > 0) animateToStep(step - 1); else router.back(); };
  const goHome = async () => { await saveStepToBackend(); router.replace("/(tabs)"); };

  // ─── Per-step API save ─────────────────────────────────────────────────────
  const saveStepToBackend = async (extraFields: Record<string, any> = {}) => {
    try {
      setSavingStep(true);
      const userStr = await AsyncStorage.getItem("userData");
      const userData = userStr ? JSON.parse(userStr) : null;
      
      const activeUserId = userId || userData?.id;
      if (!activeUserId) {
        console.log("Step save error: No active user ID found");
        return;
      }

      await axios.post(`${API_URL}/auth/update-profile`, {
        userId: activeUserId, gender, dob,
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

      // Synchronize updated user data in AsyncStorage
      const updatedUser = {
        ...userData,
        gender: gender || userData?.gender,
        dob: dob || userData?.dob,
        age: age ? parseInt(age) : userData?.age,
        height: heightVal ? `${heightVal} ${units.height}` : userData?.height,
        weight: weightVal ? `${weightVal} ${units.weight}` : userData?.weight,
        body_fat: bodyFat || userData?.body_fat,
        fitness_goal: fitnessGoal || userData?.fitness_goal,
        experience_level: experienceLevel || userData?.experience_level,
        activity_level: activityLevel || userData?.activity_level,
        neck: neck ? `${neck} ${units.neck}` : userData?.neck,
        waist: waist ? `${waist} ${units.waist}` : userData?.waist,
        hip: hip ? `${hip} ${units.hip}` : userData?.hip,
        chest: chest ? `${chest} ${units.chest}` : userData?.chest,
        arm: arm ? `${arm} ${units.arm}` : userData?.arm,
        thigh: thigh ? `${thigh} ${units.thigh}` : userData?.thigh,
        medical_conditions: medicalConditions || userData?.medical_conditions,
        medication: medication || userData?.medication,
        allergies: allergies || userData?.allergies,
        diet_type: dietType || userData?.diet_type,
        food_preference: foodPref || userData?.food_preference,
        water_intake: waterIntake || userData?.water_intake,
        food_allergies: foodAllergies || userData?.food_allergies,
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
    } catch (e) {
      console.log("Step save error (non-critical):", e);
    } finally {
      setSavingStep(false);
    }
  };

  // ─── Final submit ──────────────────────────────────────────────────────────
  const submitOnboarding = async () => {
    try {
      setIsSubmitting(true);
      const userStr = await AsyncStorage.getItem("userData");
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.id;
      if (!userId) { alert("Session expired. Please login again."); router.replace("/"); return; }

      const formData = new FormData();
      formData.append("userId", userId.toString());
      if (dob) formData.append("dob", dob);
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
      formData.append("gender", gender);
      if (medicalConditions) formData.append("medicalConditions", medicalConditions);
      if (medication) formData.append("medication", medication);
      if (allergies) formData.append("allergies", allergies);
      formData.append("dietType", dietType);
      formData.append("foodPreference", foodPref);
      formData.append("waterIntake", waterIntake);
      if (foodAllergies) formData.append("foodAllergies", foodAllergies);

      const appendImage = async (photoKey: keyof typeof photos, fieldName: string) => {
        try {
          const uri = photos[photoKey];
          if (!uri) return;
          const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
          formData.append(fieldName, { uri, name: `${fieldName}.${ext}`, type: `image/${ext === "png" ? "png" : "jpeg"}` } as any);
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
        const updatedUser = { ...userData, onboarding_completed: result.onboardingCompleted, dob, age: parseInt(age) };
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
    const isProfile = type === "profile";
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: isProfile,
      ...(isProfile ? { aspect: [1, 1] } : {}),
      quality: 0.8,
    });
    if (!result.canceled) setPhotos({ ...photos, [type]: result.assets[0].uri });
  };

  const isSectionComplete = (section: string) => {
    const cleanSection = section.replace(" (Optional)", "");
    switch (cleanSection) {
      case "Gender": return gender !== "";
      case "Basic Information": return dob !== "" && heightVal.trim() !== "" && weightVal.trim() !== "";
      case "Fitness Goal": return fitnessGoal !== "";
      case "Experience Level": return experienceLevel !== "";
      case "Activity Level": return activityLevel !== "";
      case "Measurements": return true;
      case "Health Info": return true;
      case "Nutrition": return dietType !== "" && foodPref !== "" && waterIntake !== "";
      case "Photos": return photos.profile !== null;
      default: return false;
    }
  };

  // ─── Primary button helper ─────────────────────────────────────────────────
  const PrimaryBtn = ({
    label, onPress, disabled = false, icon = "arrow-forward",
  }: { label: string; onPress: () => void; disabled?: boolean; icon?: string }) => (
    <TouchableOpacity
      style={[styles.primaryBtn, { opacity: disabled ? 0.45 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.87}
    >
      <View style={[styles.primaryBtnInner, { backgroundColor: disabled ? colors.inputBg : colors.primary }]}>
        <Text style={styles.primaryBtnText}>{label}</Text>
        <Ionicons name={icon as any} size={18} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  // ─── Header ────────────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (step === 0 || step === 11) return null;
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={prevStep}
          style={[styles.headerBack, { backgroundColor: colors.inputBg }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.wordmark}>
          <Text style={[styles.wordSpot, { color: colors.text }]}>spot</Text>
          <Text style={[styles.wordMe, { color: P.sun }]}>ME</Text>
        </View>
        {step < 10 ? (
          <TouchableOpacity onPress={nextStep}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>
    );
  };

  const isStepCompleted = (stepNum: number) => {
    switch (stepNum) {
      case 1: return gender !== "";
      case 2: return dob !== "" && String(heightVal).trim() !== "" && String(weightVal).trim() !== "";
      case 3: return fitnessGoal !== "";
      case 4: return experienceLevel !== "";
      case 5: return activityLevel !== "";
      case 6: return !!(String(neck).trim() || String(waist).trim() || String(chest).trim()) || medication !== null || !!(dietType && foodPref && waterIntake);
      case 7: return medication !== null;
      case 8: return dietType !== "" && foodPref !== "" && waterIntake !== "";
      case 9: return photos.profile !== null;
      case 10: return true;
      default: return false;
    }
  };

  // ─── Progress ──────────────────────────────────────────────────────────────
  const renderProgress = () => {
    if (step === 0 || step === 11) return null;
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isOptional = stepNum === 6 || stepNum === 7;
            const completed = isStepCompleted(stepNum) || isOptional;
            
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.progressSeg,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : completed
                        ? colors.primary
                        : "#EF4444" // Not completed is marked as red
                  }
                ]}
                onPress={() => animateToStep(stepNum)}
                activeOpacity={0.7}
              />
            );
          })}
        </View>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>
    );
  };

  // ─── Step Renders ──────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (step) {

      // ── WELCOME ────────────────────────────────────────────────────────────
      case 0:
        return (
          <View style={[styles.welcomeWrap, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
            {/* Skip for now — top right */}
            <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.welcomeSkipTop}>
              <Text style={[styles.welcomeSkipTopText, { color: colors.textDim }]}>Skip for now</Text>
            </TouchableOpacity>

            <View style={styles.welcomeInner}>
              {/* Wordmark — no dot */}
              <View style={styles.welcomeWordmark}>
                <Text style={[styles.welcomeSpot, { color: colors.text }]}>spot</Text>
                <Text style={[styles.welcomeMe, { color: P.sun }]}>ME</Text>
              </View>

              <Text style={[styles.welcomeTitle, { color: colors.text }]}>{"Let's Build\nYour Profile"}</Text>
              <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
                Answer a few quick questions so we can create a plan that's made just for you.
              </Text>

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              {/* Buttons */}
              <PrimaryBtn label="Start Setup" onPress={nextStep} />

              <TouchableOpacity
                style={[styles.welcomeBackBtn, { borderColor: colors.border }]}
                onPress={goHome}
                activeOpacity={0.7}
              >
                <Text style={[styles.welcomeBackBtnText, { color: colors.textMuted }]}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      // ── GENDER ─────────────────────────────────────────────────────────────
      case 1:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What's your gender?</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                This helps us personalise your fitness plan accurately.
              </Text>
            </View>

            {/* Athlete image cards — Male & Female only */}
            <View style={styles.genderRow}>
              {[
                { value: "Male",   image: GENDER_FEMALE, color: "#2596BE" },
                { value: "Female", image: GENDER_MALE,   color: "#E060A0" },
              ].map(item => {
                const selected = gender === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.genderCard,
                      {
                        borderColor: selected ? item.color : colors.border,
                        backgroundColor: colors.card,
                        shadowColor: selected ? item.color : "transparent",
                      },
                    ]}
                    onPress={() => setGender(item.value)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={item.image}
                      style={styles.genderAthleteImage}
                      resizeMode="cover"
                    />
                    {/* Selected check badge */}
                    {selected && (
                      <View style={[styles.genderCheckBadge, { backgroundColor: item.color }]}>
                        <Ionicons name="checkmark" size={13} color="#FFF" />
                      </View>
                    )}
                    {/* Footer label */}
                    <View
                      style={[
                        styles.genderFooter,
                        { backgroundColor: selected ? item.color : colors.inputBg },
                      ]}
                    >
                      <Text style={[styles.genderLabel, { color: selected ? "#FFF" : colors.textMuted }]}>
                        {item.value}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!gender}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── BASIC INFO ─────────────────────────────────────────────────────────
      case 2:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Basic Information</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Tell us the basics so we can calculate your metrics.</Text>
            </View>

            {/* Date of Birth Picker Trigger */}
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
              <View pointerEvents="none">
                <ThemedInput 
                  label="Date of Birth" 
                  placeholder="DD / MM / YYYY" 
                  value={dob ? formatDate(dob) : ""} 
                  onChangeText={() => {}} 
                  icon={<Ionicons name="calendar-outline" size={16} color={colors.primary} />} 
                />
              </View>
            </TouchableOpacity>

            {Platform.OS === "web" && showDatePicker && (
              <input
                id="onboarding-web-date-picker"
                type="date"
                style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    setDob(v);
                    setAge(calculateAge(v));
                    setShowDatePicker(false);
                  }
                }}
              />
            )}

            {Platform.OS !== "web" && showDatePicker && (
              <DateTimePicker
                value={dob ? new Date(dob) : new Date(new Date().getFullYear() - 20, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Display Calculated Age inside a subtle card if DOB selected */}
            {age !== "" && (
              <View style={[subStyles.ageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={subStyles.ageCardRow}>
                  <Text style={[subStyles.ageValueText, { color: colors.primary }]}>{age}</Text>
                  <Text style={[subStyles.ageLabelText, { color: colors.textMuted }]}>Years Old</Text>
                </View>
              </View>
            )}

            <ThemedInput label="Height" placeholder="Enter your height" value={heightVal} onChangeText={setHeightVal}
              keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.height} onChange={u => updateUnit("height", u)} />}
            />

            <ThemedInput label="Current Weight" placeholder="Enter your weight" value={weightVal} onChangeText={setWeightVal}
              keyboardType="numeric"
              rightElement={<UnitToggle options={["kg", "lbs"]} value={units.weight} onChange={u => updateUnit("weight", u)} />}
            />

            <ThemedInput label="Body Fat % (Optional)" placeholder="e.g. 18" value={bodyFat} onChangeText={setBodyFat}
              keyboardType="numeric"
              rightElement={<Text style={[styles.unitLabel, { color: colors.primary }]}>%</Text>}
            />

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!dob || !heightVal || !weightVal}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── FITNESS GOAL ───────────────────────────────────────────────────────
      case 3:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>What's your main goal?</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>We'll design your entire program around this.</Text>
            </View>

            <View style={subStyles.goalGrid}>
              {[
                { value: "Lose Weight",       icon: "flame-outline",   desc: "Burn fat & shed pounds",      color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
                { value: "Build Muscle",      icon: "barbell-outline", desc: "Gain strength & size",         color: "#2596BE", bg: "rgba(37,150,190,0.14)" },
                { value: "Improve Endurance", icon: "bicycle-outline", desc: "Boost cardio & stamina",       color: "#10B981", bg: "rgba(16,185,129,0.14)" },
                { value: "Maintain Health",   icon: "heart-outline",   desc: "Stay fit & feel great",        color: "#E060A0", bg: "rgba(224,96,160,0.14)" },
                { value: "Rehab",             icon: "bandage-outline", desc: "Recover safely",               color: "#9B59B6", bg: "rgba(155,89,182,0.14)" },
              ].map(item => {
                const selected = fitnessGoal === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      subStyles.goalCard,
                      { borderColor: selected ? item.color : colors.border },
                      selected && { backgroundColor: item.bg },
                    ]}
                    onPress={() => setFitnessGoal(item.value)}
                    activeOpacity={0.82}
                  >
                    <View style={[subStyles.goalIconWrap, { backgroundColor: selected ? item.bg : colors.inputBg }]}>
                      <Ionicons name={item.icon as any} size={26} color={selected ? item.color : colors.textMuted} />
                    </View>
                    <Text style={[subStyles.goalLabel, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                    <Text style={[subStyles.goalDesc, { color: colors.textDim }]} numberOfLines={2}>{item.desc}</Text>
                    {selected && (
                      <View style={subStyles.goalSelectedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={item.color} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!fitnessGoal}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── EXPERIENCE LEVEL ───────────────────────────────────────────────────
      case 4:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Experience Level</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>How long have you been training?</Text>
            </View>

            {[
              { value: "Beginner (0-1 years)",     label: "Beginner",     sub: "0–1 years of training",  icon: "leaf-outline",        color: "#10B981", bg: "rgba(16,185,129,0.14)" },
              { value: "Intermediate (1-3 years)", label: "Intermediate", sub: "1–3 years of training",  icon: "trending-up-outline", color: P.sun,     bg: "rgba(247,203,22,0.14)" },
              { value: "Advanced (3+ years)",      label: "Advanced",     sub: "3+ years of training",   icon: "flame-outline",       color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
            ].map(item => {
              const selected = experienceLevel === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.expCard,
                    { borderColor: selected ? item.color : colors.border },
                    selected && { backgroundColor: item.bg },
                  ]}
                  onPress={() => setExperienceLevel(item.value)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.expIconWrap, { backgroundColor: selected ? item.bg : colors.inputBg }]}>
                    <Ionicons name={item.icon as any} size={28} color={selected ? item.color : colors.textMuted} />
                  </View>
                  <View style={styles.expText}>
                    <Text style={[styles.expLabel, { color: selected ? colors.text : colors.textMuted }]}>{item.label}</Text>
                    <Text style={[styles.expSub, { color: colors.textDim }]}>{item.sub}</Text>
                  </View>
                  {selected && (
                    <View style={[styles.expCheck, { backgroundColor: item.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!experienceLevel}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── ACTIVITY LEVEL ─────────────────────────────────────────────────────
      case 5:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>How active are you?</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Outside of structured workouts, how much do you move?</Text>
            </View>

            {[
              { value: "Sedentary",         label: "Sedentary",         sub: "Mostly sitting — office job",        icon: "laptop-outline",  color: "#6B7280", bg: "rgba(107,114,128,0.14)" },
              { value: "Lightly Active",    label: "Lightly Active",    sub: "Light exercise 1–2 days/week",       icon: "walk-outline",    color: "#10B981", bg: "rgba(16,185,129,0.14)" },
              { value: "Moderately Active", label: "Moderately Active", sub: "Moderate exercise 3–5 days/week",    icon: "bicycle-outline", color: P.sun,     bg: "rgba(247,203,22,0.14)" },
              { value: "Very Active",       label: "Very Active",       sub: "Hard exercise 6–7 days/week",        icon: "barbell-outline", color: "#FF6B35", bg: "rgba(255,107,53,0.14)" },
            ].map(item => {
              const selected = activityLevel === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.optionCard,
                    { borderColor: selected ? item.color : colors.border },
                    selected && { backgroundColor: item.bg },
                  ]}
                  onPress={() => setActivityLevel(item.value)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: selected ? item.bg : colors.inputBg }]}>
                    <Ionicons name={item.icon as any} size={24} color={selected ? item.color : colors.textMuted} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: selected ? colors.text : colors.textMuted }]}>{item.label}</Text>
                    <Text style={[styles.optionDesc, { color: colors.textDim }]}>{item.sub}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
                </TouchableOpacity>
              );
            })}

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!activityLevel}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── BODY MEASUREMENTS ──────────────────────────────────────────────────
      case 6:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Body Measurements</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Optional — helps track your physical progress over time.</Text>
            </View>

            <View style={[styles.optionalBadge, { backgroundColor: "rgba(247,203,22,0.10)" }]}>
              <Ionicons name="information-circle-outline" size={14} color={P.sun} />
              <Text style={[styles.optionalText, { color: P.sun }]}>All fields are optional</Text>
            </View>

            <ThemedInput label="Neck" placeholder="Neck circumference" value={neck} onChangeText={setNeck} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.neck} onChange={u => updateUnit("neck", u)} />} />
            <ThemedInput label="Waist" placeholder="Waist circumference" value={waist} onChangeText={setWaist} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.waist} onChange={u => updateUnit("waist", u)} />} />
            <ThemedInput label="Hip" placeholder="Hip circumference" value={hip} onChangeText={setHip} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.hip} onChange={u => updateUnit("hip", u)} />} />
            <ThemedInput label="Chest" placeholder="Chest circumference" value={chest} onChangeText={setChest} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.chest} onChange={u => updateUnit("chest", u)} />} />
            <ThemedInput label="Arm" placeholder="Arm circumference" value={arm} onChangeText={setArm} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.arm} onChange={u => updateUnit("arm", u)} />} />
            <ThemedInput label="Thigh" placeholder="Thigh circumference" value={thigh} onChangeText={setThigh} keyboardType="numeric"
              rightElement={<UnitToggle options={["cm", "in"]} value={units.thigh} onChange={u => updateUnit("thigh", u)} />} />

            <PrimaryBtn label="Continue" onPress={async () => { await saveStepToBackend(); nextStep(); }} />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── HEALTH INFO ────────────────────────────────────────────────────────
      case 7:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Health Information</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Your safety is our top priority.</Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Do you take any medication?</Text>
            <View style={styles.radioRow}>
              {["Yes", "No"].map(opt => {
                const selected = medication === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.radioCard,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: isDark ? "rgba(37,150,190,0.14)" : "rgba(37,150,190,0.08)" },
                    ]}
                    onPress={() => setMedication(opt as any)}
                  >
                    <View style={[styles.radioCircle, { borderColor: selected ? colors.primary : colors.textMuted }]}>
                      {selected && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.radioLabel, { color: selected ? colors.text : colors.textMuted }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Medical Conditions (Optional)</Text>
            <View style={[styles.textAreaWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Any injuries or medical conditions..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={4}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                textAlignVertical="top"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Allergies (Optional)</Text>
            <View style={[styles.textAreaWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Any allergies to be aware of..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={3}
                value={allergies}
                onChangeText={setAllergies}
                textAlignVertical="top"
              />
            </View>

            <PrimaryBtn label="Continue" onPress={async () => { await saveStepToBackend(); nextStep(); }} />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── NUTRITION ──────────────────────────────────────────────────────────
      case 8:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Nutrition Preferences</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Personalise your meal plan to match your lifestyle.</Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Diet Type</Text>
            <View style={styles.chipGrid}>
              {["Standard", "Vegetarian", "Vegan", "Keto", "Paleo"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    { borderColor: dietType === opt ? colors.primary : colors.border },
                    dietType === opt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setDietType(opt)}
                >
                  <Text style={[styles.chipText, { color: dietType === opt ? "#FFF" : colors.textMuted }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>Food Preference</Text>
            <View style={styles.chipGrid}>
              {["No Preference", "High Protein", "Low Carb", "Low Fat"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    { borderColor: foodPref === opt ? colors.primary : colors.border },
                    foodPref === opt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setFoodPref(opt)}
                >
                  <Text style={[styles.chipText, { color: foodPref === opt ? "#FFF" : colors.textMuted }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>Daily Water Intake</Text>
            <View style={styles.chipGrid}>
              {["Less than 1L", "1-2L", "2-3L", "More than 3L"].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    { borderColor: waterIntake === opt ? colors.primary : colors.border },
                    waterIntake === opt && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setWaterIntake(opt)}
                >
                  <Ionicons name="water-outline" size={13} color={waterIntake === opt ? "#FFF" : colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: waterIntake === opt ? "#FFF" : colors.textMuted }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>Food Allergies (Optional)</Text>
            <View style={[styles.textAreaWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Peanuts, gluten, dairy..."
                placeholderTextColor={colors.textDim}
                multiline
                numberOfLines={3}
                value={foodAllergies}
                onChangeText={setFoodAllergies}
                textAlignVertical="top"
              />
            </View>

            <PrimaryBtn
              label="Continue"
              onPress={async () => { await saveStepToBackend(); nextStep(); }}
              disabled={!dietType || !foodPref || !waterIntake}
            />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── PHOTOS ─────────────────────────────────────────────────────────────
      case 9:
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Progress Photos</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Visualise your transformation over time.</Text>
            </View>

            {/* Profile Photo */}
            <View style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.photoCardHeader}>
                <View style={[styles.photoCardIconWrap, { backgroundColor: "rgba(37,150,190,0.15)" }]}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.photoCardTitle, { color: colors.text }]}>Profile Picture</Text>
              </View>
              <TouchableOpacity style={[styles.circleUpload, { borderColor: colors.border }]} onPress={() => pickImage("profile")}>
                {photos.profile ? (
                  <Image source={{ uri: photos.profile }} style={styles.circleImage} />
                ) : (
                  <View style={styles.circlePlaceholder}>
                    <Ionicons name="camera" size={28} color={colors.textDim} />
                    <Text style={[styles.uploadSmall, { color: colors.textDim }]}>Tap to add</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.photoHint, { color: colors.textDim }]}>Visible on your profile & to your coach.</Text>
            </View>

            <Text style={[styles.photoSectionLabel, { color: colors.text }]}>
              Physique Photos <Text style={{ color: colors.textMuted, fontSize: 12 }}>(Optional)</Text>
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyPhotoScroll}>
              {[
                { id: "front", title: "Front View" },
                { id: "back",  title: "Back View"  },
                { id: "side",  title: "Side View"  },
              ].map(item => (
                <View key={item.id} style={styles.bodyPhotoItem}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => pickImage(item.id as keyof typeof photos)}
                    style={[styles.bodyPhotoWrapper, { backgroundColor: colors.inputBg, borderColor: photos[item.id as keyof typeof photos] ? colors.success : colors.border }]}
                  >
                    {photos[item.id as keyof typeof photos] ? (
                      <Image
                        source={{ uri: photos[item.id as keyof typeof photos]! }}
                        style={styles.bodyPhotoImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.bodyPhotoPlaceholder}>
                        <View style={[styles.bodyPhotoAddCircle, { backgroundColor: isDark ? "rgba(37,150,190,0.15)" : "rgba(37,150,190,0.10)" }]}>
                          <Ionicons name="add" size={22} color={colors.primary} />
                        </View>
                        <Text style={[styles.bodyPhotoSub, { color: colors.textDim, marginTop: 6 }]}>Tap to add</Text>
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.55)']}
                      style={styles.bodyPhotoOverlay}
                    />
                    <Text style={styles.bodyPhotoLabel}>{item.title}</Text>
                    {photos[item.id as keyof typeof photos] && (
                      <View style={[styles.bodyPhotoEditBadge, { backgroundColor: colors.success }]}>
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <PrimaryBtn label="Continue" onPress={async () => { await saveStepToBackend(); nextStep(); }} />
            <TouchableOpacity onPress={goHome} style={styles.skipLinkBtn}>
              <Text style={[styles.skipLinkText, { color: colors.textDim }]}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      // ── REVIEW ─────────────────────────────────────────────────────────────
      case 10: {
        const sections = [
          { name: "Gender",           step: 1 },
          { name: "Basic Information", step: 2 },
          { name: "Fitness Goal",      step: 3 },
          { name: "Experience Level",  step: 4 },
          { name: "Activity Level",    step: 5 },
          { name: "Measurements (Optional)", step: 6 },
          { name: "Health Info (Optional)",  step: 7 },
          { name: "Nutrition",         step: 8 },
          { name: "Photos",            step: 9 },
        ];
        return (
          <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepTitleWrap}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Almost There!</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>Review your information before finalising.</Text>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {sections.map((s, i) => {
                const done = isSectionComplete(s.name);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reviewItem, { borderBottomColor: colors.border }]}
                    onPress={() => animateToStep(s.step)}
                  >
                    <View style={[styles.reviewIconWrap, { backgroundColor: done ? "rgba(16,185,129,0.15)" : colors.inputBg }]}>
                      <Ionicons name={done ? "checkmark" : "ellipse-outline"} size={16} color={done ? colors.success : colors.textDim} />
                    </View>
                    <Text style={[styles.reviewItemText, { color: done ? colors.text : colors.textMuted }]}>{s.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                  </TouchableOpacity>
                );
              })}
            </View>

          

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: isSubmitting ? 0.7 : 1 }]}
              onPress={submitOnboarding}
              disabled={isSubmitting}
              activeOpacity={0.87}
            >
              <View style={[styles.primaryBtnInner, { backgroundColor: colors.primary }]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Complete Profile</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </ScrollView>
        );
      }

      // ── SUCCESS ────────────────────────────────────────────────────────────
      case 11:
        return <SuccessScreen onFinish={() => router.replace("/(tabs)")} />;
    }
  };

  // ─── Root ──────────────────────────────────────────────────────────────────
  if (hydrating) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {step === 0 || step === 11 ? (
        renderContent()
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {renderHeader()}
          {renderProgress()}
          <Animated.View 
            style={[
              { flex: 1 }, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {renderContent()}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function UnitToggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[subStyles.unitToggle, { borderColor: colors.border }]}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[subStyles.unitBtn, value === opt && { backgroundColor: colors.primary }]}
          onPress={() => onChange(opt)}
        >
          <Text style={[subStyles.unitBtnText, { color: value === opt ? "#FFF" : colors.textMuted }]}>{opt}</Text>
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
  const { colors } = useTheme();
  return (
    <View style={subStyles.inputWrap}>
      <Text style={[subStyles.inputLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={subStyles.inputRow}>
        {icon && <View style={subStyles.inputIconWrap}>{icon}</View>}
        <TextInput
          style={[
            subStyles.input,
            { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
            !!icon ? { paddingLeft: 42 } : null,
            !!rightElement ? { paddingRight: 80 } : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          selectionColor={colors.primary}
        />
        {rightElement && <View style={subStyles.inputRight}>{rightElement}</View>}
      </View>
    </View>
  );
}

function SuccessScreen({ onFinish }: { onFinish: () => void }) {
  const { colors, isDark } = useTheme();
  const scaleAnim   = React.useRef(new Animated.Value(0)).current;
  const pulseAnim   = React.useRef(new Animated.Value(0)).current;
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
    <View style={[subStyles.successRoot, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, backgroundColor: colors.bg }]}>
      <View style={subStyles.successWordmark}>
        <View style={[subStyles.successDot, { backgroundColor: P.sun }]} />
        <Text style={[subStyles.successSpot, { color: colors.text }]}>spot</Text>
        <Text style={[subStyles.successMe, { color: P.sun }]}>ME</Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={[subStyles.successRing, {
          transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
        }]} />
        <Animated.View style={[subStyles.successRing, {
          transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.9] }) }],
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
        }]} />
        <Animated.View style={[subStyles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={60} color="#FFF" />
        </Animated.View>

        <Animated.Text style={[subStyles.successTitle, { color: colors.text, opacity: opacityAnim, transform: [{ translateY: opacityAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
          You're All Set!
        </Animated.Text>
        <Animated.Text style={[subStyles.successSub, { color: colors.textMuted, opacity: opacityAnim }]}>
          Your profile is complete. We're building your personalised plan right now.
        </Animated.Text>
      </View>

      <Animated.View style={{ opacity: opacityAnim, width: "100%", paddingHorizontal: 24 }}>
        <TouchableOpacity
          style={[subStyles.successBtn, { backgroundColor: colors.primary }]}
          onPress={onFinish}
          activeOpacity={0.87}
        >
          <View style={subStyles.successBtnInner}>
            <Text style={subStyles.successBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </View>
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
  welcomeSkipTop: { alignItems: "flex-end", paddingHorizontal: 28 },
  welcomeSkipTopText: { fontFamily: FONTS.body, fontSize: 14 },
  welcomeInner: { flex: 1, paddingHorizontal: 28, justifyContent: "center", paddingTop: 40 },
  welcomeWordmark: { flexDirection: "row", marginBottom: 48 },
  welcomeSpot: { fontFamily: FONTS.heading, fontSize: 28, letterSpacing: 1 },
  welcomeMe: { fontFamily: FONTS.heading, fontSize: 28, letterSpacing: 1 },
  welcomeTitle: { fontFamily: FONTS.heading, fontSize: 46, lineHeight: 52, marginBottom: 16 },
  welcomeSub: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, marginBottom: 0 },
  welcomeBackBtn: {
    borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, alignItems: "center", marginTop: 10,
  },
  welcomeBackBtnText: { fontFamily: FONTS.body, fontSize: 14 },
  skipLinkBtn: { marginTop: 18, alignItems: "center" },
  skipLinkText: { fontFamily: FONTS.body, fontSize: 14 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10,
  },
  headerBack: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  wordmark: { flexDirection: "row", alignItems: "center" },
  wordSpot: { fontFamily: FONTS.heading, fontSize: 22 },
  wordMe: { fontFamily: FONTS.heading, fontSize: 22 },
  skipText: { fontFamily: FONTS.body, fontSize: 13 },

  // Progress
  progressWrap: { paddingHorizontal: 20, paddingBottom: 18 },
  progressRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2 },
  progressLabel: { fontFamily: FONTS.body, fontSize: 11, textAlign: "center" },

  // Step
  stepScroll: { flex: 1 },
  stepContent: { paddingHorizontal: 22, paddingBottom: 50 },
  stepTitleWrap: { marginBottom: 28, marginTop: 10 },
  stepTitle: { fontFamily: FONTS.heading, fontSize: 30, marginBottom: 8 },
  stepSub: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 21 },

  // Gender — athlete image cards
  genderRow: { flexDirection: "row", gap: 14, marginBottom: 28 },
  genderCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  genderAthleteImage: { width: "100%", height: 200 },
  genderCheckBadge: {
    position: "absolute", top: 10, right: 10,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  genderFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12,
  },
  genderLabel: { fontFamily: FONTS.bodyBold, fontSize: 15 },

  // Option card (fitness goal, activity)
  optionCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    padding: 16, marginBottom: 10, gap: 14,
  },
  optionIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 3 },
  optionDesc: { fontFamily: FONTS.body, fontSize: 12 },

  // Experience card
  expCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, borderWidth: 1.5,
    padding: 18, marginBottom: 12, gap: 16,
  },
  expIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  expText: { flex: 1 },
  expLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 4 },
  expSub: { fontFamily: FONTS.body, fontSize: 12 },
  expCheck: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },

  // Optional badge
  optionalBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 20, alignSelf: "flex-start",
  },
  optionalText: { fontFamily: FONTS.body, fontSize: 12 },

  // Field label
  fieldLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginBottom: 10, letterSpacing: 0.3 },

  // Radio
  radioRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  radioCard: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, gap: 10,
  },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },

  // Text area
  textAreaWrap: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, minHeight: 100 },
  textArea: { fontFamily: FONTS.body, fontSize: 14, minHeight: 80 },

  // Chip (nutrition)
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 20, borderWidth: 1.5,
    paddingVertical: 9, paddingHorizontal: 14,
  },
  chipText: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },

  // Photos
  photoCard: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1 },
  photoCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  photoCardIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 10 },
  photoCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  circleUpload: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderStyle: "dashed",
    overflow: "hidden", alignSelf: "center",
    justifyContent: "center", alignItems: "center", marginVertical: 14,
  },
  circleImage: { width: "100%", height: "100%", borderRadius: 55 },
  circlePlaceholder: { alignItems: "center" },
  uploadSmall: { fontFamily: FONTS.body, fontSize: 11, marginTop: 5 },
  photoHint: { fontFamily: FONTS.body, fontSize: 11, textAlign: "center" },
  photoSectionLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, marginBottom: 12, marginTop: 4 },
  // Body photo horizontal scroll (matches profile page)
  bodyPhotoScroll: { marginTop: 4, marginBottom: 16 },
  bodyPhotoItem: { marginRight: 14 },
  bodyPhotoWrapper: {
    width: 140, height: 200, borderRadius: 20,
    borderWidth: 1.5, overflow: "hidden",
    position: "relative",
  },
  bodyPhotoImg: { width: "100%", height: "100%" },
  bodyPhotoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  bodyPhotoAddCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  bodyPhotoSub: { fontFamily: FONTS.body, fontSize: 12 },
  bodyPhotoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
  },
  bodyPhotoLabel: {
    position: "absolute", bottom: 10, left: 10,
    fontFamily: FONTS.bodySemiBold, fontSize: 12, color: "#FFF",
  },
  bodyPhotoEditBadge: {
    position: "absolute", top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  uploadedBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.2)",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4,
  },
  uploadedBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },

  // Review
  reviewCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  reviewItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 12 },
  reviewIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  reviewItemText: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  secureNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, marginBottom: 20 },
  secureText: { fontFamily: FONTS.body, fontSize: 13, flex: 1 },

  // Unit label
  unitLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },

  // Primary button — flat
  primaryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  primaryBtnInner: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 17, gap: 10 },
  primaryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: "#FFF" },
});

const subStyles = StyleSheet.create({
  // Goal Grid
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  goalCard: {
    width: (width - 44 - 12) / 2,
    aspectRatio: 1.05,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  goalLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 2,
  },
  goalDesc: {
    fontFamily: FONTS.body,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  goalSelectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // UnitToggle
  unitToggle: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1 },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "transparent" },
  unitBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },

  // Age Card
  ageCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
    marginTop: -4,
    alignSelf: "flex-start",
  },
  ageCardRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  ageValueText: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  ageLabelText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ThemedInput
  inputWrap: { marginBottom: 18 },
  inputLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginBottom: 8, letterSpacing: 0.3 },
  inputRow: { position: "relative" },
  input: {
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  inputIconWrap: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  inputRight: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center", alignItems: "flex-end" },

  // Success screen
  successRoot: { flex: 1, alignItems: "center" },
  successWordmark: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  successDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  successSpot: { fontFamily: FONTS.heading, fontSize: 22 },
  successMe: { fontFamily: FONTS.heading, fontSize: 22 },
  successRing: {
    position: "absolute", width: 120, height: 120,
    borderRadius: 60, top: "40%", marginTop: -60,
  },
  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#10B981",
    justifyContent: "center", alignItems: "center",
    marginBottom: 30,
    shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  successTitle: { fontFamily: FONTS.heading, fontSize: 34, marginBottom: 12, textAlign: "center" },
  successSub: { fontFamily: FONTS.body, fontSize: 15, textAlign: "center", paddingHorizontal: 30, lineHeight: 23 },
  successBtn: { borderRadius: 16, overflow: "hidden" },
  successBtnInner: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 17, gap: 10 },
  successBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: "#FFF" },
});
