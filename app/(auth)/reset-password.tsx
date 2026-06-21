import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

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
  green:      "#4CAF50",
  surface:    "rgba(255,255,255,0.1)",
  border:     "rgba(255,255,255,0.18)",
};

const F = {
  black: "Outfit_900Black",
  bold:  "Outfit_700Bold",
  semi:  "Outfit_600SemiBold",
  med:   "Outfit_500Medium",
  reg:   "Outfit_400Regular",
};

export default function ResetPasswordScreen() {
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secureMode, setSecureMode] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!resetToken) { setErrorMsg("Invalid reset session. Request a new code."); return; }
    if (password.length < 6) { setErrorMsg("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setErrorMsg("Passwords do not match"); return; }

    setErrorMsg("");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { resetToken, password });
      const existingToken = await getToken();
      setIsLoggedIn(!!existingToken);
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Session expired. Request a new code.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
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
        <View style={s.header}>
          <View style={s.wordmark}>
            <Text style={s.wmSpot}>spot</Text>
            <Text style={s.wmMe}>ME</Text>
          </View>
          <Text style={s.title}>Set New Password</Text>
          <Text style={s.subtitle}>
            {success ? "Your password has been reset" : "Enter your new password below"}
          </Text>
        </View>

        {!success ? (
          <View style={s.form}>
            {!!errorMsg && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle" size={14} color={C.red} />
                <Text style={s.errTxt}>{errorMsg}</Text>
              </View>
            )}

            <View style={s.fieldWrap}>
              <Text style={s.label}>New password</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={s.pwInput}
                  placeholder="••••••••"
                  placeholderTextColor={C.mist}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrorMsg(""); }}
                  secureTextEntry={secureMode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setSecureMode(p => !p)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={secureMode ? "eye-outline" : "eye-off-outline"} size={18} color={C.mist} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm new password</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={s.pwInput}
                  placeholder="••••••••"
                  placeholderTextColor={C.mist}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setErrorMsg(""); }}
                  secureTextEntry={confirmSecure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setConfirmSecure(p => !p)}
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={confirmSecure ? "eye-outline" : "eye-off-outline"} size={18} color={C.mist} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleSubmit}
              disabled={loading}
              style={[s.ctaMain, loading && s.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={s.ctaTxt}>Reset Password</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.sentContainer}>
            <View style={[s.sentIconWrap, { borderColor: C.green }]}>
              <Ionicons name="checkmark-circle" size={48} color={C.green} />
            </View>
            <Text style={s.sentTitle}>Password Reset</Text>
            <Text style={s.sentDesc}>
              {isLoggedIn
                ? "Your password has been updated successfully."
                : "Your password has been updated successfully. You can now log in with your new password."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.replace(isLoggedIn ? "/(tabs)" : "/(auth)/login")}
              style={s.ctaMain}
            >
              <Text style={s.ctaTxt}>{isLoggedIn ? "Back to Home" : "Go to Login"}</Text>
              <Ionicons name="arrow-forward" size={18} color={C.white} />
            </TouchableOpacity>
          </View>
        )}
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
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
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
  title: {
    fontFamily: F.bold,
    fontSize: 22,
    color: C.white,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: F.reg,
    fontSize: 14,
    color: C.mist,
    lineHeight: 20,
  },
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
  ctaMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    backgroundColor: C.blue,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
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
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errTxt: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.reg,
    color: C.white,
    marginLeft: 8,
  },
  sentContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  sentIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  sentTitle: {
    fontFamily: F.bold,
    fontSize: 20,
    color: C.white,
    marginBottom: 10,
  },
  sentDesc: {
    fontFamily: F.reg,
    fontSize: 14,
    color: C.mist,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});
