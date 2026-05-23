import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../../constants/theme";
import Input from "../../components/ui/Input";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = Intro, 1-7 = Steps, 8 = Done
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useFocusEffect(
    useCallback(() => {
      if (isInitialLoad) {
        fetchExistingData();
      }
    }, [isInitialLoad])
  );

  const fetchExistingData = async () => {
    console.log("Fetching existing data for onboarding...");
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.log("No token found, skipping pre-fill");
        return;
      }

      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data;
      console.log("Onboarding Data received:", data);
      
      if (data) {
        // Parse Helper for units like "180 cm"
        const parseValueUnit = (str: string) => {
          if (!str) return { val: "", unit: "" };
          const parts = str.split(" ");
          return { val: parts[0] || "", unit: parts[1] || "" };
        };

        if (data.age) setAge(data.age.toString());
        
        const h = parseValueUnit(data.height);
        if (h.val) setHeightVal(h.val);
        if (h.unit) updateUnit("height", h.unit);

        const w = parseValueUnit(data.weight);
        if (w.val) setWeightVal(w.val);
        if (w.unit) updateUnit("weight", w.unit);

        if (data.body_fat) setBodyFat(data.body_fat.toString());

        if (data.fitness_goal) setFitnessGoal(data.fitness_goal);
        if (data.experience_level) setExperienceLevel(data.experience_level);
        if (data.activity_level) setActivityLevel(data.activity_level);

        const n = parseValueUnit(data.neck);
        if (n.val) setNeck(n.val);
        if (n.unit) updateUnit("neck", n.unit);

        const wa = parseValueUnit(data.waist);
        if (wa.val) setWaist(wa.val);
        if (wa.unit) updateUnit("waist", wa.unit);

        const hi = parseValueUnit(data.hip);
        if (hi.val) setHip(hi.val);
        if (hi.unit) updateUnit("hip", hi.unit);

        const c = parseValueUnit(data.chest);
        if (c.val) setChest(c.val);
        if (c.unit) updateUnit("chest", c.unit);

        const a = parseValueUnit(data.arm);
        if (a.val) setArm(a.val);
        if (a.unit) updateUnit("arm", a.unit);

        const t = parseValueUnit(data.thigh);
        if (t.val) setThigh(t.val);
        if (t.unit) updateUnit("thigh", t.unit);

        if (data.medical_conditions) setMedicalConditions(data.medical_conditions);
        if (data.medication) setMedication(data.medication);
        if (data.allergies) setAllergies(data.allergies);

        if (data.diet_type) setDietType(data.diet_type);
        if (data.food_preference) setFoodPref(data.food_preference);
        if (data.water_intake) setWaterIntake(data.water_intake);
        if (data.food_allergies) setFoodAllergies(data.food_allergies);

        setPhotos({
          profile: data.profile_pic_url || data.profilePicUrl || null,
          front: data.front_photo_url || data.frontPhotoUrl || null,
          back: data.back_photo_url || data.backPhotoUrl || null,
          side: data.side_photo_url || data.sidePhotoUrl || null,
        });

        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error("Error fetching onboarding data:", err);
    }
  };

  // Individual Unit States
  const [units, setUnits] = useState({
    height: "cm",
    weight: "kg",
    neck: "cm",
    waist: "cm",
    hip: "cm",
    chest: "cm",
    arm: "cm",
    thigh: "cm",
  });

  const updateUnit = (field: keyof typeof units, unit: string) => {
    setUnits((prev) => ({ ...prev, [field]: unit }));
  };

  // Step 1: Basic Info State
  const [age, setAge] = useState("");
  const [heightVal, setHeightVal] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  // Step 2: Fitness Info State
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [activityLevel, setActivityLevel] = useState("");

  // Step 3: Body Measurements State
  const [neck, setNeck] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");

  // Step 4: Health Info State
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medication, setMedication] = useState<"Yes" | "No" | null>(null);
  const [allergies, setAllergies] = useState("");

  // Step 5: Nutrition Preferences State
  const [dietType, setDietType] = useState("");
  const [foodPref, setFoodPref] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");

  // Step 6: Photos State
  const [photos, setPhotos] = useState<{
    profile: string | null;
    front: string | null;
    back: string | null;
    side: string | null;
  }>({
    profile: null,
    front: null,
    back: null,
    side: null,
  });

  const pickImage = async (type: keyof typeof photos) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos({ ...photos, [type]: result.assets[0].uri });
    }
  };

  // Generic Dropdown Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }>({ visible: false, title: "", options: [], onSelect: () => {} });

  const openDropdown = (title: string, options: string[], setter: (val: string) => void) => {
    setModalConfig({
      visible: true,
      title,
      options,
      onSelect: (val) => {
        setter(val);
        setModalConfig({ ...modalConfig, visible: false });
      }
    });
  };

  const nextStep = () => {
    if (step < 8) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const submitOnboarding = async () => {
    try {
      setIsSubmitting(true);
      
      const userStr = await AsyncStorage.getItem("userData");
      const userData = userStr ? JSON.parse(userStr) : null;
      const userId = userData?.id;

      if (!userId) {
        alert("Session expired. Please login again.");
        router.replace("/");
        return;
      }

      const formData = new FormData();
      formData.append('userId', userId.toString()); 
      
      // Text Fields
      formData.append('age', age);
      formData.append('height', `${heightVal} ${units.height}`);
      formData.append('weight', `${weightVal} ${units.weight}`);
      formData.append('bodyFat', bodyFat);
      
      formData.append('fitnessGoal', fitnessGoal);
      formData.append('experienceLevel', experienceLevel);
      formData.append('activityLevel', activityLevel);
      
      formData.append('neck', neck ? `${neck} ${units.neck}` : '');
      formData.append('waist', waist ? `${waist} ${units.waist}` : '');
      formData.append('hip', hip ? `${hip} ${units.hip}` : '');
      formData.append('chest', chest ? `${chest} ${units.chest}` : '');
      formData.append('arm', arm ? `${arm} ${units.arm}` : '');
      formData.append('thigh', thigh ? `${thigh} ${units.thigh}` : '');
      
      formData.append('medicalConditions', medicalConditions);
      formData.append('medication', medication || '');
      formData.append('allergies', allergies);
      
      formData.append('dietType', dietType);
      formData.append('foodPreference', foodPref);
      formData.append('waterIntake', waterIntake);
      formData.append('foodAllergies', foodAllergies);

      // Helper for images
      const appendImage = async (stateKey: keyof typeof photos, fieldName: string) => {
        if (photos[stateKey]) {
          const uri = photos[stateKey] as string;
          
          // If it's already a remote URL (pre-populated), we don't need to upload it again
          if (uri.startsWith('http')) return;

          try {
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              const blob = await response.blob();
              formData.append(fieldName, blob, `${fieldName}.jpg`);
            } else {
              const ext = uri.split('.').pop() || 'jpg';
              formData.append(fieldName, {
                uri,
                name: `${fieldName}.${ext}`,
                type: `image/${ext === 'png' ? 'png' : 'jpeg'}`
              } as any);
            }
          } catch (e) {
            console.error(`Error processing image ${fieldName}:`, e);
          }
        }
      };

      await appendImage('profile', 'profilePic');
      await appendImage('front', 'frontPhoto');
      await appendImage('back', 'backPhoto');
      await appendImage('side', 'sidePhoto');

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api"}/onboarding/complete`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Note: Do not set Content-Type manually, fetch will set it with the correct boundary for FormData
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        nextStep(); // Move to success screen (Step 8)
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

  const renderHeader = () => {
    if (step === 8) return null;
    
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={prevStep} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>SPOTME</Text>
        </View>

        {step === 0 ? (
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.headerBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>
    );
  };

  const renderProgressBar = () => {
    if (step === 0 || step === 8) return null;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarsRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
            <View 
              key={idx} 
              style={[
                styles.progressSegment, 
                idx <= step ? styles.progressSegmentActive : null
              ]} 
            />
          ))}
        </View>
        <Text style={styles.progressText}>Step {step} of 7</Text>
      </View>
    );
  };

  const isSectionComplete = (section: string) => {
    switch (section) {
      case "Basic Information": 
        return age.trim() !== "" && heightVal.trim() !== "" && weightVal.trim() !== "";
      case "Fitness Information": 
        return fitnessGoal !== "" && experienceLevel !== "" && activityLevel !== "";
      case "Body Measurements": 
        return neck !== "" || waist !== "" || hip !== "" || chest !== "" || arm !== "" || thigh !== ""; // Optional, tick if any is filled
      case "Health Information": 
        return medication !== null; // Optional text fields, but medication is a radio
      case "Nutrition Preferences": 
        return dietType !== "" && foodPref !== "" && waterIntake !== "";
      case "Progress Photos": 
        return photos.profile !== null || photos.front !== null || photos.back !== null || photos.side !== null;
      default: 
        return false;
    }
  };

  const renderContent = () => {
    switch (step) {
      case 0: // INTRO
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.introTitle}>
              Let's Get to{"\n"}Know <Text style={styles.textRed}>You</Text>
            </Text>
            <Text style={styles.introSub}>
              Provide accurate information to get personalized workout, nutrition and coaching.
            </Text>
            <View style={styles.heroImagePlaceholder}>
              <Ionicons name="fitness-outline" size={100} color="#E5E5E5" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
              <Text style={styles.btnText}>Let's Start</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        );
      
      case 1: // BASIC INFO
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepHeader}>
                <Ionicons name="person-outline" size={24} color="#E00000" />
                <View style={styles.stepHeaderTextWrap}>
                  <Text style={styles.stepTitle}>Basic Information</Text>
                  <Text style={styles.stepSub}>Tell us the basics about you.</Text>
                </View>
              </View>
            </View>

            <Input label="Age" placeholder="Enter age" value={age} onChangeText={setAge} icon={<Ionicons name="calendar-outline" size={16} color="#A0A0A0"/>} keyboardType="numeric" />
            
            <Input 
              label="Height" 
              placeholder="Enter your height" 
              value={heightVal} 
              onChangeText={setHeightVal} 
              keyboardType="numeric" 
              unitOptions={["cm", "in"]}
              unitValue={units.height}
              onUnitChange={(u) => updateUnit("height", u)}
            />
            
            <Input 
              label="Current Weight" 
              placeholder="Enter your weight" 
              value={weightVal} 
              onChangeText={setWeightVal} 
              keyboardType="numeric" 
              unitOptions={["kg", "lbs"]}
              unitValue={units.weight}
              onUnitChange={(u) => updateUnit("weight", u)}
            />
            
            <Input label="Body Fat % (Optional)" placeholder="Enter body fat %" value={bodyFat} onChangeText={setBodyFat} keyboardType="numeric" rightIcon={<Text style={styles.unitText}>%</Text>} />

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 2: // FITNESS INFO
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.stepHeader}>
              <Ionicons name="pulse-outline" size={24} color="#E00000" />
              <View style={styles.stepHeaderTextWrap}>
                <Text style={styles.stepTitle}>Fitness Information</Text>
                <Text style={styles.stepSub}>Help us understand your fitness background.</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Fitness Goal", ["Lose Weight", "Build Muscle", "Improve Endurance", "Maintain Health", "Rehab"], setFitnessGoal)}>
              <View pointerEvents="none">
                <Input label="Fitness Goal" placeholder="Select your primary goal" value={fitnessGoal} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Experience Level", ["Beginner (0-1 years)", "Intermediate (1-3 years)", "Advanced (3+ years)"], setExperienceLevel)}>
              <View pointerEvents="none">
                <Input label="Experience Level" placeholder="Select your level" value={experienceLevel} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Activity Level", ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"], setActivityLevel)}>
              <View pointerEvents="none">
                <Input label="Activity Level" placeholder="Select your activity level" value={activityLevel} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Ionicons name="bulb-outline" size={24} color="#E00000" />
              <View style={styles.infoCardTextWrap}>
                <Text style={styles.infoCardTitle}>Need Help Choosing?</Text>
                <Text style={styles.infoCardDesc}>We'll create the perfect plan based on your goals.</Text>
                <Text style={styles.infoCardLink}>Learn More</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 3: // BODY MEASUREMENTS
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepHeader}>
                <Ionicons name="body-outline" size={24} color="#E00000" />
                <View style={styles.stepHeaderTextWrap}>
                  <Text style={styles.stepTitle}>Body Measurements</Text>
                  <Text style={styles.stepSub}>These help track progress (Optional).</Text>
                </View>
              </View>
            </View>

            <Input label="Neck Size" placeholder="Enter neck size" value={neck} onChangeText={setNeck} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.neck} onUnitChange={(u) => updateUnit("neck", u)} />
            <Input label="Waist Size" placeholder="Enter waist size" value={waist} onChangeText={setWaist} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.waist} onUnitChange={(u) => updateUnit("waist", u)} />
            <Input label="Hip Size" placeholder="Enter hip size" value={hip} onChangeText={setHip} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.hip} onUnitChange={(u) => updateUnit("hip", u)} />
            <Input label="Chest Size" placeholder="Enter chest size" value={chest} onChangeText={setChest} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.chest} onUnitChange={(u) => updateUnit("chest", u)} />
            <Input label="Arm Size" placeholder="Enter arm size" value={arm} onChangeText={setArm} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.arm} onUnitChange={(u) => updateUnit("arm", u)} />
            <Input label="Thigh Size" placeholder="Enter thigh size" value={thigh} onChangeText={setThigh} keyboardType="numeric" unitOptions={["cm", "in"]} unitValue={units.thigh} onUnitChange={(u) => updateUnit("thigh", u)} />

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 4: // HEALTH INFO
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.stepHeader}>
              <Ionicons name="medical-outline" size={24} color="#E00000" />
              <View style={styles.stepHeaderTextWrap}>
                <Text style={styles.stepTitle}>Health Information</Text>
                <Text style={styles.stepSub}>Your health & safety are our priority.</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Any Medical Conditions? (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Specify any medical conditions or injuries"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={4}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                textAlignVertical="top"
              />
            </View>
            
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.inputLabel}>Do you take any medication?</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity style={styles.radioBtn} onPress={() => setMedication("Yes")}>
                  <Ionicons name={medication === "Yes" ? "radio-button-on" : "radio-button-off"} size={20} color={medication === "Yes" ? "#E00000" : "#A0A0A0"} />
                  <Text style={styles.radioText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioBtn, {marginLeft: 20}]} onPress={() => setMedication("No")}>
                  <Ionicons name={medication === "No" ? "radio-button-on" : "radio-button-off"} size={20} color={medication === "No" ? "#E00000" : "#A0A0A0"} />
                  <Text style={styles.radioText}>No</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.inputLabel}>Any allergies? (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Enter allergies (if any)"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={3}
                value={allergies}
                onChangeText={setAllergies}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 5: // NUTRITION PREFS
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.stepHeader}>
              <Ionicons name="restaurant-outline" size={24} color="#E00000" />
              <View style={styles.stepHeaderTextWrap}>
                <Text style={styles.stepTitle}>Nutrition Preferences</Text>
                <Text style={styles.stepSub}>Help us personalize your nutrition plan.</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Diet Type", ["Standard", "Vegetarian", "Vegan", "Keto", "Paleo"], setDietType)}>
              <View pointerEvents="none">
                <Input label="Diet Type" placeholder="Select your diet type" value={dietType} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Food Preference", ["No Preference", "High Protein", "Low Carb", "Low Fat"], setFoodPref)}>
              <View pointerEvents="none">
                <Input label="Food Preference" placeholder="Select preference" value={foodPref} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} onPress={() => openDropdown("Daily Water Intake", ["Less than 1L", "1-2L", "2-3L", "More than 3L"], setWaterIntake)}>
              <View pointerEvents="none">
                <Input label="Daily Water Intake" placeholder="Select daily intake" value={waterIntake} editable={false} rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0"/>} />
              </View>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Do you have any food allergies? (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Enter food allergies (if any)"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={3}
                value={foodAllergies}
                onChangeText={setFoodAllergies}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </ScrollView>
        );

      case 6: // PHOTOS
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <View style={styles.stepHeader}>
              <Ionicons name="camera-outline" size={24} color="#E00000" />
              <View style={styles.stepHeaderTextWrap}>
                <Text style={styles.stepTitle}>Progress Photos</Text>
                <Text style={styles.stepSub}>Upload photos to visualize your transformation.</Text>
              </View>
            </View>

            {/* Profile Picture Card */}
            <View style={styles.photoCard}>
              <View style={styles.photoCardHeader}>
                <View style={styles.photoCardIconWrap}>
                  <Ionicons name="person-outline" size={20} color="#E00000" />
                </View>
                <Text style={styles.photoCardTitle}>Profile Picture</Text>
              </View>
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <TouchableOpacity style={styles.photoCircleUpload} onPress={() => pickImage('profile')}>
                  {photos.profile ? (
                    <Image source={{ uri: photos.profile }} style={styles.profileImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.placeholderIconContent}>
                      <Ionicons name="camera" size={32} color="#D0D0D0" />
                      <Text style={styles.uploadTextSmall}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.photoCardHint}>This will be visible to your coach and on your profile.</Text>
            </View>

            <Text style={styles.photoSectionTitle}>Physique Photos (Optional)</Text>
            
            {/* Physique Photo Cards */}
            {[
              { id: 'front', title: 'Front View', icon: 'body-outline' },
              { id: 'back', title: 'Back View', icon: 'walk-outline' },
              { id: 'side', title: 'Rear/Side View', icon: 'accessibility-outline' }
            ].map((item) => (
              <View key={item.id} style={styles.photoCard}>
                <View style={styles.photoCardHeader}>
                  <View style={styles.photoCardIconWrap}>
                    <Ionicons name={item.icon as any} size={20} color="#E00000" />
                  </View>
                  <Text style={styles.photoCardTitle}>{item.title}</Text>
                  {photos[item.id as keyof typeof photos] && (
                    <View style={styles.doneBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.doneText}>Uploaded</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.premiumPhotoUpload, photos[item.id as keyof typeof photos] ? styles.premiumPhotoUploadActive : null]} 
                  onPress={() => pickImage(item.id as keyof typeof photos)}
                >
                  {photos[item.id as keyof typeof photos] ? (
                    <Image 
                      source={{ uri: photos[item.id as keyof typeof photos]! }} 
                      style={styles.premiumPreview} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderContent}>
                      <View style={styles.addIconCircle}>
                        <Ionicons name="add" size={24} color="#E00000" />
                      </View>
                      <Text style={styles.uploadMainText}>Upload {item.title}</Text>
                      <Text style={styles.uploadSubText}>Tap to select from gallery</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 40, marginBottom: 20}]} onPress={nextStep}>
              <Text style={styles.btnText}>Next Step</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        );

      case 7: // REVIEW
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.stepScroll}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <View style={styles.stepHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#E00000" />
              <View style={styles.stepHeaderTextWrap}>
                <Text style={styles.stepTitle}>Almost Done!</Text>
                <Text style={styles.stepSub}>Review your information and let's get started.</Text>
              </View>
            </View>

            <View style={styles.checklistCard}>
              {[
                "Basic Information", 
                "Fitness Information", 
                "Body Measurements", 
                "Health Information", 
                "Nutrition Preferences", 
                "Progress Photos"
              ].map((item, i) => {
                const complete = isSectionComplete(item);
                return (
                  <View key={i} style={styles.checklistItem}>
                    {complete ? (
                      <Ionicons name="checkmark-circle" size={20} color="#E00000" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#D0D0D0" />
                    )}
                    <Text style={[styles.checklistText, !complete && { color: "#888" }]}>{item}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.secureCard}>
              <Ionicons name="shield-half-outline" size={24} color="#E00000" />
              <View style={styles.secureTextWrap}>
                <Text style={styles.secureTitle}>Your data is 100% secure</Text>
                <Text style={styles.secureDesc}>We never share your personal information with anyone.</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.primaryBtn, {marginTop: 20}]} onPress={submitOnboarding} disabled={isSubmitting}>
              <Text style={styles.btnText}>{isSubmitting ? "Saving Profile..." : "Complete Profile"}</Text>
              {!isSubmitting && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
            </TouchableOpacity>
          </ScrollView>
        );

      case 8: // SUCCESS
        return <AnimatedSuccessScreen onFinish={() => router.replace("/(tabs)")} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      {renderProgressBar()}
      <View style={styles.container}>
        {renderContent()}
      </View>

      {modalConfig.visible && (
        <Modal transparent animationType="fade" visible={modalConfig.visible}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalConfig({ ...modalConfig, visible: false })}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalDragIndicator} />
              <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              {modalConfig.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.modalOption}
                  onPress={() => modalConfig.onSelect(opt)}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// --- Animated Success Component ---
const AnimatedSuccessScreen = ({ onFinish }: { onFinish: () => void }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Pop in checkmark
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // Fade in text
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Infinite ripple effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.successContainer}>
      <View style={styles.logoContainer}>
        <View style={styles.logoDot} />
        <Text style={styles.logoText}>SPOTME</Text>
      </View>
      
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {/* Animated Ripples */}
        <Animated.View style={[
          styles.successCircleRing, 
          { 
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
          }
        ]} />
        <Animated.View style={[
          styles.successCircleRing, 
          { 
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }],
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
          }
        ]} />

        {/* Main Checkmark */}
        <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={60} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.Text style={[styles.successTitle, { opacity: opacityAnim, transform: [{ translateY: opacityAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          You're All Set! 🎉
        </Animated.Text>
        <Animated.Text style={[styles.successSub, { opacity: opacityAnim }]}>
          Your profile is complete. We'll now create a personalized plan just for you.
        </Animated.Text>
      </View>

      <Animated.View style={{ opacity: opacityAnim, width: '100%' }}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onFinish}>
          <Text style={styles.btnText}>Go to Dashboard</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12 },
  headerBtn: { width: 40, alignItems: "center" },
  skipText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: "#111" },
  logoContainer: { flexDirection: "row", alignItems: "center" },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E00000", marginRight: 6 },
  logoText: { fontFamily: FONTS.heading, fontSize: 18, color: "#111", letterSpacing: 1 },
  progressContainer: { paddingHorizontal: 24, paddingBottom: 20 },
  progressBarsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  progressSegment: { flex: 1, height: 4, backgroundColor: "#F0F0F0", borderRadius: 2, marginHorizontal: 2 },
  progressSegmentActive: { backgroundColor: "#E00000" },
  progressText: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: "#888", textAlign: "center" },
  
  // Layout
  stepHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, marginTop: 10 },

  stepContainer: { flex: 1, paddingVertical: 20 },
  introTitle: { fontFamily: FONTS.heading, fontSize: 40, color: "#111", textAlign: "center", marginBottom: 12 },
  textRed: { color: "#E00000" },
  introSub: { fontFamily: FONTS.body, fontSize: 14, color: "#666", textAlign: "center", paddingHorizontal: 20 },
  heroImagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  stepScroll: { flex: 1, paddingBottom: 40 },
  stepHeader: { flexDirection: "row", alignItems: "flex-start" },
  stepHeaderTextWrap: { marginLeft: 12, flex: 1 },
  stepTitle: { fontFamily: FONTS.heading, fontSize: 20, color: "#111", marginBottom: 4 },
  stepSub: { fontFamily: FONTS.body, fontSize: 13, color: "#666" },
  unitText: { fontFamily: FONTS.bodySemiBold, color: "#E00000", fontSize: 12, backgroundColor: "#FFF0F0", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: "hidden" },
  infoCard: { flexDirection: "row", backgroundColor: "#FFF9F9", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#FFE5E5", marginTop: 10 },
  infoCardTextWrap: { marginLeft: 12, flex: 1 },
  infoCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: "#111", marginBottom: 4 },
  infoCardDesc: { fontFamily: FONTS.body, fontSize: 12, color: "#666", marginBottom: 8, lineHeight: 18 },
  infoCardLink: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: "#E00000" },
  
  inputLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: "#333333", marginBottom: 7 },

  // Custom Text Area
  textAreaContainer: { backgroundColor: "#F7F7F7", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20, minHeight: 120 },
  textArea: { 
    flex: 1, 
    fontFamily: FONTS.body, 
    fontSize: 14, 
    color: "#1A1A1A", 
    minHeight: 90, 
    paddingTop: 0, 
    paddingBottom: 0, 
    margin: 0,
  },

  // Custom Radios
  radioGroup: { flexDirection: "row", alignItems: "center" },
  radioBtn: { flexDirection: "row", alignItems: "center" },
  radioText: { fontFamily: FONTS.body, fontSize: 14, color: "#111", marginLeft: 8 },

  // Photos
  // Photos Redesign
  photoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  photoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  photoCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  photoCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: "#111",
    flex: 1,
  },
  photoCardHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  doneText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: "#4CAF50",
  },
  premiumPhotoUpload: {
    height: 200,
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumPhotoUploadActive: {
    borderStyle: "solid",
    borderColor: "#E00000",
  },
  premiumPreview: {
    width: "100%",
    height: "100%",
  },
  placeholderContent: {
    alignItems: "center",
  },
  placeholderIconContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadMainText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#111",
    marginBottom: 4,
  },
  uploadSubText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#888",
  },
  uploadTextSmall: { fontFamily: FONTS.body, fontSize: 12, color: "#A0A0A0", marginTop: 8 },

  photoSectionTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: "#111", marginBottom: 16, marginTop: 10 },
  photoCircleUpload: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#F9F9F9", borderWidth: 2, borderColor: "#F0F0F0", borderStyle: "dashed", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  profileImage: { width: "100%", height: "100%", borderRadius: 60 },
  
  checklistCard: { backgroundColor: "#F9F9F9", padding: 20, borderRadius: 16, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 20 },
  checklistItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  checklistText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: "#111", marginLeft: 12 },
  secureCard: { flexDirection: "row", backgroundColor: "#FFF9F9", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#FFE5E5", alignItems: "center" },
  secureTextWrap: { marginLeft: 12, flex: 1 },
  secureTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: "#111", marginBottom: 2 },
  secureDesc: { fontFamily: FONTS.body, fontSize: 12, color: "#666" },
  successContainer: { flex: 1, alignItems: "center", paddingVertical: 20 },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#E00000", justifyContent: "center", alignItems: "center", marginBottom: 30, zIndex: 10, shadowColor: "#E00000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  successCircleRing: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFF0F0", marginBottom: 30, top: "40%", marginTop: -80 },
  successTitle: { fontFamily: FONTS.heading, fontSize: 28, color: "#111", marginBottom: 12, textAlign: "center" },
  successSub: { fontFamily: FONTS.body, fontSize: 16, color: "#666", textAlign: "center", paddingHorizontal: 20, lineHeight: 24 },
  primaryBtn: { flexDirection: "row", backgroundColor: "#E00000", paddingVertical: 16, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#E00000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: "#FFF", marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: "#E5E5E5", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 20, color: "#111", marginBottom: 20, textAlign: "center" },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  modalOptionText: { fontFamily: FONTS.body, fontSize: 16, color: "#111", textAlign: "center" },
});
