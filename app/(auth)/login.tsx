import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { setToken, setUserData, clearAll } from "../../utils/tokenStorage";
import { API_URL } from "../../utils/api";

const C = {
  yellow:     "#F7CB16",
  blue:       "#2596BE",
  blueDark:   "#0E6A8A",
  ink:        "#020D0E",
  inkLight:   "#0A2426",
  white:      "#FFFFFF",
  mist:       "rgba(255,255,255,0.55)",
  mistBright: "rgba(255,255,255,0.82)",
  red:        "#FF4D4D",
  surface:    "rgba(255,255,255,0.1)",
  border:     "rgba(255,255,255,0.18)",
  borderHi:   "rgba(255,255,255,0.3)",
};

const F = {
  black: "Outfit_900Black",
  bold:  "Outfit_700Bold",
  semi:  "Outfit_600SemiBold",
  med:   "Outfit_500Medium",
  reg:   "Outfit_400Regular",
};



// ─── Validation schemas ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phoneNumber: z.string().optional().refine(
    (val) => !val || (val.length >= 10 && val.length <= 15),
    { message: "Phone number must be 10–15 digits" }
  ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function useFadeUp(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 700, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

export default function AuthScreen() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const isLogin = tab === "login";

  const [fullName,        setFullName]        = useState("");
  const [username,        setUsername]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureMode,      setSecureMode]      = useState(true);
  const [confirmSecure,   setConfirmSecure]   = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState("");
  const [successMsg,      setSuccessMsg]      = useState("");
  const [fieldErrors,     setFieldErrors]     = useState<Record<string, string>>({});
  const [usernameStatus,  setUsernameStatus]  = useState<"idle" | "checking" | "available" | "taken">("idle");

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const anim0 = useFadeUp(80);
  const anim1 = useFadeUp(200);
  const anim2 = useFadeUp(320);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => { const copy = { ...prev }; delete copy[field]; return copy; });
  };

  const switchTab = (login: boolean) => {
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});
    setUsernameStatus("idle");
    setTab(login ? "login" : "signup");
  };

  // Debounced username availability check
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkUsername = useCallback((value: string) => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    const trimmed = value.toLowerCase().trim();
    if (trimmed.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/check-username`, { params: { username: trimmed } });
        setUsernameStatus(res.data.available ? "available" : "taken");
        if (!res.data.available) {
          setFieldErrors(prev => ({ ...prev, username: "Username is already taken" }));
        } else {
          setFieldErrors(prev => { const c = { ...prev }; delete c.username; return c; });
        }
      } catch { setUsernameStatus("idle"); }
    }, 500);
  }, []);

  const handleAuth = async () => {
    setErrorMsg("");
    setFieldErrors({});

    const data = isLogin
      ? { email, password }
      : { fullName, username, email, password, confirmPassword };

    const result = isLogin
      ? loginSchema.safeParse(data)
      : signupSchema.safeParse(data);

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!errs[field]) errs[field] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password });
        await setToken(res.data.token);
        await setUserData(res.data.user);
        if (res.data.user?.onboarding_completed) {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding");
        }
      } else {
        if (usernameStatus === "taken") {
          setFieldErrors(prev => ({ ...prev, username: "Username is already taken" }));
          setLoading(false);
          return;
        }
        await axios.post(`${API_URL}/auth/signup`, { fullName, username: username.toLowerCase(), email, password });
        // Reset signup fields and switch to login tab
        setFullName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setUsernameStatus("idle");
        setSuccessMsg("Account created! Please log in.");
        setTab("login");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "An error occurred. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Image
        source={require("../../assets/authscreenimages/authback3.png")}
        style={s.bgImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(2,13,14,0.62)", "rgba(2,13,14,0.82)", "rgba(2,13,14,0.97)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(37,150,190,0.18)", "transparent"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0.55, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop:    insets.top + 24,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── HEADER ── */}
        <Animated.View style={[s.header, anim0]}>
          <View style={s.wordmark}>
            <Text style={s.wmSpot}>spot</Text>
            <Text style={s.wmMe}>ME</Text>
          </View>
          <View style={s.tabRow}>
            <TouchableOpacity onPress={() => switchTab(true)} style={s.tabBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.tabTxt, isLogin && s.tabTxtActive]}>Login</Text>
            </TouchableOpacity>
            <Text style={s.tabDivider}>/</Text>
            <TouchableOpacity onPress={() => switchTab(false)} style={s.tabBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.tabTxt, !isLogin && s.tabTxtActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── FORM ── */}
        <Animated.View style={[s.form, anim1]}>
          {!!successMsg && (
            <View style={[s.errBox, s.successBox]}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={[s.errTxt, s.successTxt]}>{successMsg}</Text>
            </View>
          )}

          {!!errorMsg && (
            <View style={s.errBox}>
              <Ionicons name="alert-circle" size={14} color={C.red} />
              <Text style={s.errTxt}>{errorMsg}</Text>
            </View>
          )}

          {!isLogin && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Full name</Text>
              <TextInput
                style={[s.input, fieldErrors.fullName && s.inputErr]}
                placeholder="John Doe"
                placeholderTextColor={C.mist}
                value={fullName}
                onChangeText={(v) => { setFullName(v); clearFieldError("fullName"); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {fieldErrors.fullName && <Text style={s.fieldErr}>{fieldErrors.fullName}</Text>}
            </View>
          )}

          {!isLogin && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Username</Text>
              <View style={[s.pwRow, fieldErrors.username && s.inputErr, usernameStatus === "available" && s.inputOk]}>
                <TextInput
                  style={s.pwInput}
                  placeholder="john_doe123"
                  placeholderTextColor={C.mist}
                  value={username}
                  onChangeText={(v) => {
                    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setUsername(clean);
                    clearFieldError("username");
                    checkUsername(clean);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {usernameStatus === "checking" && <ActivityIndicator size="small" color={C.mist} style={{ marginRight: 14 }} />}
                {usernameStatus === "available" && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginRight: 14 }} />}
                {usernameStatus === "taken"     && <Ionicons name="close-circle"     size={18} color={C.red}    style={{ marginRight: 14 }} />}
              </View>
              {fieldErrors.username
                ? <Text style={s.fieldErr}>{fieldErrors.username}</Text>
                : usernameStatus === "available"
                ? <Text style={s.fieldOk}>Username is available ✓</Text>
                : null
              }
            </View>
          )}

          <View style={s.fieldWrap}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={[s.input, fieldErrors.email && s.inputErr]}
              placeholder="you@example.com"
              placeholderTextColor={C.mist}
              value={email}
              onChangeText={(v) => { setEmail(v); clearFieldError("email"); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {fieldErrors.email && <Text style={s.fieldErr}>{fieldErrors.email}</Text>}
          </View>


          <View style={s.fieldWrap}>
            <Text style={s.label}>Password</Text>
            <View style={[s.pwRow, fieldErrors.password && s.inputErr]}>
              <TextInput
                style={s.pwInput}
                placeholder="••••••••"
                placeholderTextColor={C.mist}
                value={password}
                onChangeText={(v) => { setPassword(v); clearFieldError("password"); }}
                secureTextEntry={secureMode}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={isLogin ? "done" : "next"}
              />
              <TouchableOpacity
                onPress={() => setSecureMode(p => !p)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={secureMode ? "eye-outline" : "eye-off-outline"} size={18} color={C.mist} />
              </TouchableOpacity>
            </View>
            {fieldErrors.password && <Text style={s.fieldErr}>{fieldErrors.password}</Text>}
          </View>

          {isLogin && (
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              style={{ alignSelf: "flex-end", marginBottom: 18, marginTop: -6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontFamily: F.reg, fontSize: 13, color: C.blue }}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {!isLogin && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm password</Text>
              <View style={[s.pwRow, fieldErrors.confirmPassword && s.inputErr]}>
                <TextInput
                  style={s.pwInput}
                  placeholder="••••••••"
                  placeholderTextColor={C.mist}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearFieldError("confirmPassword"); }}
                  secureTextEntry={confirmSecure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setConfirmSecure(p => !p)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={confirmSecure ? "eye-outline" : "eye-off-outline"} size={18} color={C.mist} />
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword && <Text style={s.fieldErr}>{fieldErrors.confirmPassword}</Text>}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleAuth}
            disabled={loading}
            style={[s.ctaMain, loading && s.ctaDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={s.ctaTxt}>{isLogin ? "Login" : "Create Account"}</Text>
                <Ionicons name="arrow-forward" size={18} color={C.white} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── FOOTER ── */}
        <Animated.View style={[s.footer, anim2]}>
          <TouchableOpacity
            style={s.switchRow}
            onPress={() => switchTab(!isLogin)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.switchMuted}>
              {isLogin ? "Don't have an account? " : "Already a member? "}
            </Text>
            <Text style={[s.switchCta, { color: C.blue }]}>
              {isLogin ? "Sign up" : "Log in"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.ink,
    ...(Platform.OS === "web"
      ? { maxWidth: 430, alignSelf: "center" as const, width: "100%" }
      : {}),
  },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  /* ── Header ── */

  header: {
    marginBottom: 36,
  },

  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 20,
  },

  wmSpot: {
    fontFamily: F.black,
    fontSize: 32,
    color: C.white,
    letterSpacing: -1,
  },

  wmMe: {
    fontFamily: F.black,
    fontSize: 32,
    color: C.yellow,
    letterSpacing: -1,
  },

  tabRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  tabBtn: {
    paddingVertical: 4,
    marginRight: 6,
  },

  tabTxt: {
    fontFamily: F.reg,
    fontSize: 16,
    color: C.mist,
  },

  tabTxtActive: {
    fontFamily: F.bold,
    color: C.white,
  },

  tabDivider: {
    fontFamily: F.reg,
    fontSize: 16,
    color: C.mist,
    opacity: 0.4,
    marginRight: 6,
  },

  /* ── Form ── */

  form: {
    marginBottom: 12,
  },

  fieldWrap: {
    marginBottom: 18,
  },

  label: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.mist,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  input: {
    fontFamily: F.reg,
    fontSize: 15,
    color: C.white,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    minHeight: 50,
  },

  /* Password row: border lives on the outer View, input is transparent inside */
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    minHeight: 50,
  },

  pwInput: {
    flex: 1,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.white,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    minHeight: 50,
  },

  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Error / Success ── */

  errBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },

  successBox: {
    backgroundColor: "#2E7D32",
  },

  successTxt: {
    color: C.white,
  },

  errTxt: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.reg,
    color: C.white,
    marginLeft: 8,
  },

  fieldErr: {
    fontSize: 11,
    fontFamily: F.reg,
    color: C.red,
    marginTop: 4,
    marginLeft: 2,
  },

  inputErr: {
    borderColor: C.red,
  },

  inputOk: {
    borderColor: "#4CAF50",
  },

  fieldOk: {
    fontSize: 11,
    fontFamily: F.reg,
    color: "#4CAF50",
    marginTop: 4,
    marginLeft: 2,
  },

  /* ── CTA ── */

  ctaMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.blue,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
    minHeight: 54,
  },

  ctaDisabled: {
    opacity: 0.7,
  },

  ctaTxt: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.white,
    letterSpacing: 1,
    marginRight: 10,
  },

  /* ── Footer ── */

  footer: {
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },

  switchMuted: {
    fontFamily: F.reg,
    fontSize: 14,
    color: C.mist,
  },

  switchCta: {
    fontFamily: F.bold,
    fontSize: 14,
  },
});