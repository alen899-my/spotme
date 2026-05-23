import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Input from "../../components/ui/Input";
import { FONTS } from "../../constants/theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get("window");

const PALETTE = {
  sun:          "#F7CB16",
  sunDeep:      "#E7B100",
  cta:          "#2596BE",
  ctaDark:      "#1a6e8a",
  ink:          "#04282B",
  inkDeep:      "#021518",
  inkCard:      "rgba(10, 86, 91, 0.9)",
  // Form panel: deep teal-blue — not transparent
  panelBg:      "#2596BE",
  panelBorder:  "rgba(255, 255, 255, 0.24)",
  mist:         "#F7FBF8",
  mistSoft:     "rgba(247, 251, 248, 0.6)",
  error:        "#FF4D4D",
};

const AUTH_INPUT_ICON = "#0C2E35";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── How tall the image hero section is ──────────────────────────────────────
// We give the hero a FIXED height so the form panel always starts below it.
// On short screens we shrink the hero so the form still has enough room.
const HERO_HEIGHT = Math.min(height * 0.44, 320);

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const [isLogin, setIsLogin]           = useState(true);
  const [secureMode, setSecureMode]     = useState(true);

  // Form state
  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [gender, setGender]             = useState("");
  const [dob, setDob]                   = useState<Date | null>(null);

  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [rememberMe, setRememberMe]           = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");

  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGenderSelect = (option: string) => {
    setGender(option);
    setShowGenderModal(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDob(selectedDate);
  };

  const formatDate = (date: Date) =>
    `${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")} / ${date.getFullYear()}`;

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setErrorMsg("");
  };

  const handleAuth = async () => {
    setErrorMsg("");
    if (!email || !password) { setErrorMsg("Email and password are required."); return; }
    if (!isLogin && !fullName) { setErrorMsg("Full name is required."); return; }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        await AsyncStorage.setItem("userToken", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        router.replace("/(tabs)");
      } else {
        const res = await axios.post(`${API_URL}/auth/signup`, {
          fullName, email, password, phoneNumber,
          dob: dob ? dob.toISOString().split("T")[0] : undefined,
          gender,
        });
        await AsyncStorage.setItem("userToken", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "An error occurred. Please try again.";
      setErrorMsg(message);
      if (Platform.OS !== "web") Alert.alert("Authentication Failed", message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HERO SECTION (fixed height, image fills it) ──────── */}
      <View style={[styles.hero, { height: HERO_HEIGHT + insets.top }]}>

        {/* Background image */}
        <Image
          source={require("../../assets/authscreenimages/authback2.png")}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Dark overlay so text is always readable */}
        <LinearGradient
          colors={["rgba(2,8,9,0.62)", "rgba(2,8,9,0.18)", "rgba(2,8,9,0.05)"]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Bottom fade into the panel */}
        <LinearGradient
         colors={["transparent", "rgba(7, 30, 34, 0.55)", "rgba(7, 30, 34, 0.0)"]}
locations={[0.4, 0.75, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* ── Top bar inside hero ────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkSpot}>spot</Text>
            <Text style={styles.wordmarkMe}>ME</Text>
          </View>
        
        </View>

        {/* ── Hero headline — lives INSIDE the fixed hero box ── */}
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>
            {isLogin ? "WELCOME BACK" : "JOIN US TODAY"}
          </Text>
          <Text style={styles.heroTitle}>
            {isLogin ? "READY TO\nPUSH LIMITS?" : "START YOUR\nJOURNEY"}
          </Text>
          <View style={styles.heroRule} />
        </View>

      </View>

      {/* ── FORM PANEL (fills remaining screen below hero) ───── */}
      {/*
        KEY: this is in NORMAL FLOW after the hero View, so it can
        never overlap the headline. flex:1 makes it fill the rest.
      */}
      <View style={styles.panel}>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >

          {/* ── Tab switcher ───────────────────────────────────── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.tabActive]}
              onPress={() => switchTab(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                LOGIN
              </Text>
              {isLogin && <View style={styles.tabUnderline} />}
            </TouchableOpacity>

            <View style={styles.tabDivider} />

            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.tabActive]}
              onPress={() => switchTab(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                SIGN UP
              </Text>
              {!isLogin && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>

          {/* ── Error banner ───────────────────────────────────── */}
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={PALETTE.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ── Form fields ────────────────────────────────────── */}
          <View style={styles.form}>

            {!isLogin && (
              <Input
                tone="light"
                label="Full Name"
                placeholder="John Doe"
                icon={<Ionicons name="person-outline" size={17} color={AUTH_INPUT_ICON} />}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            )}

            <Input
              tone="light"
              label={isLogin ? "Email or Phone" : "Email Address"}
              placeholder="you@example.com"
              icon={<Ionicons name="mail-outline" size={17} color={AUTH_INPUT_ICON} />}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              tone="light"
              label="Password"
              placeholder="••••••••"
              secureTextEntry={secureMode}
              icon={<Ionicons name="lock-closed-outline" size={17} color={AUTH_INPUT_ICON} />}
              value={password}
              onChangeText={setPassword}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setSecureMode(!secureMode)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={secureMode ? "eye-outline" : "eye-off-outline"}
                    size={17}
                    color={AUTH_INPUT_ICON}
                  />
                </TouchableOpacity>
              }
            />

            {!isLogin && (
              <>
                <Input
                  tone="light"
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  icon={<Ionicons name="call-outline" size={17} color={AUTH_INPUT_ICON} />}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />

                {/* Date of Birth */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS === "web") {
                      const el = document.getElementById("web-date-picker") as any;
                      if (el?.showPicker) el.showPicker();
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                >
                  <View pointerEvents="none">
                    <Input
                      tone="light"
                      label="Date of Birth"
                      placeholder="DD / MM / YYYY"
                      value={dob ? formatDate(dob) : ""}
                      editable={false}
                      icon={<MaterialCommunityIcons name="calendar-outline" size={17} color={AUTH_INPUT_ICON} />}
                    />
                  </View>
                </TouchableOpacity>

                {Platform.OS === "web" && (
                  <input
                    id="web-date-picker"
                    type="date"
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const [year, month, day] = val.split("-").map(Number);
                        setDob(new Date(year, month - 1, day));
                      }
                    }}
                  />
                )}

                {/* Gender */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowGenderModal(true)}
                >
                  <View pointerEvents="none">
                    <Input
                      tone="light"
                      label="Gender"
                      placeholder="Select gender"
                      value={gender}
                      editable={false}
                      icon={<MaterialCommunityIcons name="gender-male-female" size={17} color={AUTH_INPUT_ICON} />}
                      rightIcon={<Ionicons name="chevron-down" size={16} color={AUTH_INPUT_ICON} />}
                    />
                  </View>
                </TouchableOpacity>

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

            {/* Remember me / Forgot password */}
            {isLogin && (
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  activeOpacity={0.7}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={11} color={PALETTE.ink} />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}
{/* ── CTA Button ─────────────────────────────────────── */}
<TouchableOpacity
  style={styles.ctaWrap}
  activeOpacity={0.88}
  onPress={handleAuth}
  disabled={loading}
>
  <View style={styles.ctaGradient}>
    {loading ? (
      <ActivityIndicator color={PALETTE.ink} />
    ) : (
      <>
        <View style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}>
          <Text style={[styles.ctaText, { fontSize: 17 }]} numberOfLines={1}>
            {isLogin ? "LOGIN" : "CREATE ACCOUNT"}
          </Text>
        </View>
        <View style={[styles.ctaArrow, { marginLeft: "auto" }]}>
          <Ionicons name="arrow-forward" size={18} color={PALETTE.ink} />
        </View>
      </>
    )}
  </View>
</TouchableOpacity>
            

          </View>
        </ScrollView>
      </View>

      {/* ── Gender Modal ──────────────────────────────────────── */}
      <Modal
        visible={showGenderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>

                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>SELECT GENDER</Text>
                <View style={styles.modalTitleRule} />

                {GENDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionBtn,
                      gender === option && styles.optionBtnActive,
                    ]}
                    onPress={() => handleGenderSelect(option)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.optionText,
                      gender === option && styles.optionTextActive,
                    ]}>
                      {option}
                    </Text>
                    {gender === option && (
                      <View style={styles.optionCheck}>
                        <Ionicons name="checkmark" size={13} color={PALETTE.ink} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Root ───────────────────────────────────────────────────────────────────

  root: {
    flex: 1,
    backgroundColor: PALETTE.panelBg,
    ...(Platform.OS === "web"
      ? { maxWidth: 430, alignSelf: "center" as any, width: "100%" }
      : {}),
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  // Fixed height — headline lives inside, can NEVER overlap the form panel.

  hero: {
    width: "100%",
    // height set inline = HERO_HEIGHT + insets.top
    overflow: "hidden",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },

  wordmarkSpot: {
    fontFamily: "Outfit_900Black",
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -1,
  },

  wordmarkMe: {
    fontFamily: "Outfit_900Black",
    fontSize: 28,
    color: PALETTE.sun,
    letterSpacing: -1,
  },

  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PALETTE.sun,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },

  tagText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: PALETTE.ink,
    letterSpacing: 1.5,
  },

  // Headline sits at the bottom of the hero view
  heroContent: {
    position: "absolute",
    bottom: 24,
    left: 26,
    right: 26,
  },

  heroEyebrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 3,
    color: PALETTE.sun,
    marginBottom: 6,
  },

  heroTitle: {
    fontFamily: "Outfit_900Black",
    fontSize: 44,
    lineHeight: 43,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  heroRule: {
    width: 42,
    height: 3,
    backgroundColor: PALETTE.sun,
    borderRadius: 999,
  },
  

  // ── Panel ──────────────────────────────────────────────────────────────────
  // flex:1 fills everything below the hero. Solid teal-ink background.

  panel: {
    flex: 1,
    backgroundColor: PALETTE.panelBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    overflow: "hidden",
  },

  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },

  // ── Tab Switcher ───────────────────────────────────────────────────────────

  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 0,
  },

  tab: {
    paddingRight: 22,
    paddingBottom: 6,
    alignItems: "center",
  },

  tabActive: {},

  tabText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: 2.2,
    color: "rgba(247, 251, 248, 0.28)",
  },

  tabTextActive: {
    color: "#FFFFFF",
  },

  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 22,
    height: 2,
    backgroundColor: PALETTE.sun,
    borderRadius: 999,
  },

  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 22,
    marginBottom: 6,
  },

  // ── Error Banner ───────────────────────────────────────────────────────────

  errorBanner: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  backgroundColor: PALETTE.sun,
  borderWidth: 0,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginBottom: 18,
},

errorText: {
  flex: 1,
  fontFamily: FONTS.body,
  fontSize: 12,
  color: PALETTE.ink,
  lineHeight: 18,
},

  // ── Form ───────────────────────────────────────────────────────────────────

  form: {
    width: "100%",
  },

  forgotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -2,
    marginBottom: 26,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.56)",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  checkboxActive: {
    backgroundColor: PALETTE.sun,
    borderColor: PALETTE.sun,
  },

  rememberText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "rgba(247, 251, 248, 0.52)",
  },

  forgotText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PALETTE.sun,
  },

  // ── CTA Button ─────────────────────────────────────────────────────────────

  ctaWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
  },

  ctaGradient: {
    backgroundColor: PALETTE.sun,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 28,
    paddingRight: 10,
    paddingVertical: 16,
  },

  ctaText: {
    fontFamily: "Outfit_900Black",
    fontSize: 18,
    color: PALETTE.ink,
    letterSpacing: 1.5,
  },

  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: "rgba(4, 40, 43, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(247, 251, 248, 0.42)",
  },

  footerLink: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PALETTE.sun,
  },

  // ── Gender Modal ───────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: PALETTE.panelBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
    paddingHorizontal: 26,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: PALETTE.panelBorder,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignSelf: "center",
    marginBottom: 22,
  },

  modalTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 3,
    color: PALETTE.sun,
    marginBottom: 12,
  },

  modalTitleRule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 10,
  },

  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 2,
  },

  optionBtnActive: {
    borderBottomColor: "rgba(247, 203, 22, 0.15)",
  },

  optionText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: "rgba(247, 251, 248, 0.6)",
  },

  optionTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },

  optionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.sun,
    alignItems: "center",
    justifyContent: "center",
  },
});
