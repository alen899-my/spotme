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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Input from "../../components/ui/Input";
import { FONTS } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

const PALETTE = {
  sun:     "#F7CB16",
  sunDeep: "#E7B100",
  cta:     "#2596BE",
  ctaDark: "#1a6e8a",
  ink:     "#04282B",
  inkDeep: "#021518",
  error:   "#FF4D4D",
};

const AUTH_INPUT_ICON = "#2596BE";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
const HERO_HEIGHT = Math.min(height * 0.4, 300);

export default function AuthScreen() {
  const [isLogin, setIsLogin]           = useState(true);
  const [secureMode, setSecureMode]     = useState(true);
  const [confirmSecureMode, setConfirmSecureMode] = useState(true);

  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber]   = useState("");

  const [rememberMe, setRememberMe]           = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setErrorMsg("");
  };

  const handleAuth = async () => {
    setErrorMsg("");
    if (!email || !password) { setErrorMsg("Email and password are required."); return; }
    if (!isLogin && !fullName) { setErrorMsg("Full name is required."); return; }
    if (!isLogin && password !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }

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
        });
        await AsyncStorage.setItem("userToken", res.data.token);
        await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
        router.replace("/onboarding");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "An error occurred. Please try again.";
      setErrorMsg(message);
      if (Platform.OS !== "web") Alert.alert("Authentication Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HERO */}
      <View style={[styles.hero, { height: HERO_HEIGHT + insets.top }]}>
        <Image
          source={require("../../assets/authscreenimages/authback3.png")}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(2,8,9,0.7)", "rgba(2,8,9,0.2)", "rgba(2,8,9,0.05)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkSpot}>spot</Text>
            <Text style={styles.wordmarkMe}>ME</Text>
          </View>
        </View>

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

      {/* FORM PANEL */}
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
          {/* Tab Switcher */}
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

          {/* Error banner */}
          {!!errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={PALETTE.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form fields */}
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
              <Input
                tone="light"
                label="Confirm Password"
                placeholder="••••••••"
                secureTextEntry={confirmSecureMode}
                icon={<Ionicons name="lock-closed-outline" size={17} color={AUTH_INPUT_ICON} />}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setConfirmSecureMode(!confirmSecureMode)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={confirmSecureMode ? "eye-outline" : "eye-off-outline"}
                      size={17}
                      color={AUTH_INPUT_ICON}
                    />
                  </TouchableOpacity>
                }
              />
            )}

            {!isLogin && (
              <Input
                tone="light"
                label="Phone Number"
                placeholder="+91 98765 43210"
                icon={<Ionicons name="call-outline" size={17} color={AUTH_INPUT_ICON} />}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
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

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.ctaWrap}
              activeOpacity={0.88}
              onPress={handleAuth}
              disabled={loading}
            >
              <LinearGradient colors={[PALETTE.cta, PALETTE.ctaDark]} style={styles.ctaGradient}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {isLogin ? "LOGIN" : "CREATE ACCOUNT"}
                    </Text>
                    <View style={styles.ctaArrow}>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.inkDeep,
    ...(Platform.OS === "web"
      ? { maxWidth: 430, alignSelf: "center" as any, width: "100%" }
      : {}),
  },
  hero: {
    width: "100%",
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
    justifyContent: "flex-end",
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
  panel: {
    flex: 1,
    backgroundColor: PALETTE.inkDeep,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
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
    color: "rgba(255,255,255,0.28)",
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,77,77,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.3)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#FF9999",
    lineHeight: 18,
  },
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
    color: "rgba(255,255,255,0.52)",
  },
  forgotText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: PALETTE.sun,
  },
  ctaWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
    marginTop: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 17,
  },
  ctaText: {
    fontFamily: "Outfit_900Black",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
