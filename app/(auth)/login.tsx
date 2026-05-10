import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Input from "../../components/ui/Input";
import { COLORS, FONTS } from "../../constants/theme";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.38;

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [secureMode, setSecureMode] = useState(true);
  
  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleGenderSelect = (option: string) => {
    setGender(option);
    setShowGenderModal(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1).toString().padStart(2, "0")} / ${date.getFullYear()}`;
  };

  const handleAuth = async () => {
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }
    if (!isLogin && !fullName) {
      setErrorMsg("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Login
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        await AsyncStorage.setItem("userToken", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        // Redirect to new app area
        router.replace("/(tabs)");
      } else {
        // Signup
        const res = await axios.post(`${API_URL}/auth/signup`, {
          fullName,
          email,
          password,
          phoneNumber,
          dob: dob ? dob.toISOString().split("T")[0] : undefined,
          gender,
        });
        await AsyncStorage.setItem("userToken", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        // Redirect to new app area
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "An error occurred. Please try again.";
      setErrorMsg(message);
      if (Platform.OS !== "web") {
        Alert.alert("Authentication Failed", message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Hero ── */}
      <View style={{ height: HERO_HEIGHT }}>
        <Image
          source={require("../../assets/authscreenimages/authback.png")}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.15)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        {/* Logo */}
        <View style={[styles.logoOverlay, { paddingTop: insets.top + 14 }]}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>SPOTME</Text>
        </View>
        {/* Hero copy */}
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>
            BE THE{"\n"}
            <Text style={styles.heroTitleAccent}>STRONGEST</Text>{"\n"}
            VERSION OF YOURSELF
          </Text>
          <View style={styles.heroRule} />
          <Text style={styles.heroSub}>
            Your transformation starts with one step.
          </Text>
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 32) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Toggle tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.tabActive]}
              onPress={() => setIsLogin(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.tabActive]}
              onPress={() => setIsLogin(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={styles.sheetTitle}>
            {isLogin ? "Welcome back 👋" : "Create account"}
          </Text>
          <Text style={styles.sheetSub}>
            {isLogin
              ? "Log in to continue your training journey."
              : "Sign up and take the first step toward your goals."}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {errorMsg ? (
              <Text style={{ color: COLORS.error || "#E00000", fontFamily: FONTS.body, marginBottom: 12, textAlign: "center" }}>
                {errorMsg}
              </Text>
            ) : null}

            {!isLogin && (
              <Input
                label="Full Name"
                placeholder="John Doe"
                icon={<Ionicons name="person-outline" size={17} color="#A0A0A0" />}
                value={fullName}
                onChangeText={setFullName}
              />
            )}

            <Input
              label={isLogin ? "Email or Phone" : "Email Address"}
              placeholder={isLogin ? "you@example.com" : "you@example.com"}
              icon={<Ionicons name="mail-outline" size={17} color="#A0A0A0" />}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry={secureMode}
              icon={<Ionicons name="lock-closed-outline" size={17} color="#A0A0A0" />}
              value={password}
              onChangeText={setPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setSecureMode(!secureMode)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={secureMode ? "eye-outline" : "eye-off-outline"}
                    size={17}
                    color="#A0A0A0"
                  />
                </TouchableOpacity>
              }
            />

            {!isLogin && (
              <>
                <Input
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  icon={<Ionicons name="call-outline" size={17} color="#A0A0A0" />}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />

                {/* Date of Birth */}
                <View>
                  <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => {
                      if (Platform.OS === "web") {
                        const dateInput = document.getElementById("web-date-picker") as any;
                        if (dateInput && dateInput.showPicker) {
                          dateInput.showPicker();
                        }
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <View pointerEvents="none">
                      <Input
                        label="Date of Birth"
                        placeholder="DD / MM / YYYY"
                        value={dob ? formatDate(dob) : ""}
                        editable={false}
                        icon={<MaterialCommunityIcons name="calendar-outline" size={17} color="#A0A0A0" />}
                      />
                    </View>
                  </TouchableOpacity>
                  {Platform.OS === "web" && (
                    <input
                      id="web-date-picker"
                      type="date"
                      style={{
                        position: "absolute",
                        opacity: 0,
                        width: 0,
                        height: 0,
                        pointerEvents: "none",
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          // Ensure parsing creates a local date, not UTC offset
                          const [year, month, day] = val.split("-").map(Number);
                          setDob(new Date(year, month - 1, day));
                        }
                      }}
                    />
                  )}
                </View>

                {/* Gender */}
                <View>
                  <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => setShowGenderModal(true)}
                  >
                    <View pointerEvents="none">
                      <Input
                        label="Gender"
                        placeholder="Select"
                        value={gender}
                        editable={false}
                        icon={<MaterialCommunityIcons name="gender-male-female" size={17} color="#A0A0A0" />}
                        rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0" />}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {Platform.OS !== "web" && showDatePicker && (
                  <DateTimePicker
                    value={dob || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}

            {isLogin && (
              <View style={styles.forgotRow}>
                <TouchableOpacity 
                  style={styles.rememberRow} 
                  activeOpacity={0.7}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.88} onPress={handleAuth} disabled={loading}>
              <LinearGradient
                colors={loading ? ["#8B0000", "#5A0000"] : ["#E00000", "#8B0000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {isLogin ? "Login" : "Create Account"}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer toggle */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account? " : "Already a member? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.7}>
                <Text style={styles.footerLink}>
                  {isLogin ? "Sign Up" : "Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionBtn}
                  onPress={() => handleGenderSelect(option)}
                >
                  <Text style={[styles.optionText, gender === option && styles.optionTextActive]}>
                    {option}
                  </Text>
                  {gender === option && <Ionicons name="checkmark-circle" size={20} color="#E00000" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080000",
    ...(Platform.OS === "web"
      ? {
          maxWidth: 430,
          alignSelf: "center" as any,
          width: "100%",
          height: "100vh" as any,
          overflow: "hidden" as any,
        }
      : {}),
  },

  // Hero
  logoOverlay: {
    position: "absolute",
    left: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  logoDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#E00000",
  },
  logoText: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  heroTextWrap: {
    position: "absolute",
    bottom: 36,
    left: 24,
    right: 24,
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 40,
    color: "#FFFFFF",
    lineHeight: 42,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  heroTitleAccent: {
    color: "#E00000",
  },
  heroRule: {
    width: 36,
    height: 2,
    backgroundColor: "#E00000",
    borderRadius: 2,
    marginBottom: 10,
  },
  heroSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 20,
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
  },
  scrollContent: {
    paddingTop: 28,
    paddingHorizontal: 24,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#999999",
  },
  tabTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#111111",
  },

  sheetTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: "#111111",
    marginBottom: 6,
  },
  sheetSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#888888",
    marginBottom: 24,
    lineHeight: 20,
  },

  form: {
    width: "100%",
  },
  rowInputs: {
    flexDirection: "row",
  },

  // Forgot / remember
  forgotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: "#DDDDDD",
    borderRadius: 4,
  },
  checkboxActive: {
    backgroundColor: "#E00000",
    borderColor: "#E00000",
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#666666",
  },
  forgotText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: "#E00000",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: "#111111",
    marginBottom: 20,
    textAlign: "center",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: "#444444",
  },
  optionTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#E00000",
  },

  // CTA
  ctaBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  ctaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  footerText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#888888",
  },
  footerLink: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: "#E00000",
  },
});