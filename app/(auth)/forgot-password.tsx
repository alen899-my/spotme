import React, { useState, useRef } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email.trim()) { setErrorMsg("Enter your email address"); return; }
    setErrorMsg("");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setStep("code");
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Something went wrong. Try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "");
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setErrorMsg("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) { setErrorMsg("Enter the 6-digit code"); return; }

    setErrorMsg("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-reset-code`, {
        email: email.trim(),
        code: fullCode,
      });
      router.replace(`/(auth)/reset-password?resetToken=${res.data.resetToken}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid or expired code";
      setErrorMsg(msg);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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
        <TouchableOpacity
          onPress={() => step === "code" ? setStep("email") : router.back()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </TouchableOpacity>

        <View style={s.header}>
          <View style={s.wordmark}>
            <Text style={s.wmSpot}>spot</Text>
            <Text style={s.wmMe}>ME</Text>
          </View>
          <Text style={s.title}>
            {step === "email" ? "Reset Password" : "Enter Code"}
          </Text>
          <Text style={s.subtitle}>
            {step === "email"
              ? "Enter your email and we'll send you a 6-digit code"
              : `A 6-digit code was sent to ${email}`}
          </Text>
        </View>

        {step === "email" ? (
          <View style={s.form}>
            {!!errorMsg && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle" size={14} color={C.red} />
                <Text style={s.errTxt}>{errorMsg}</Text>
              </View>
            )}

            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={C.mist}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrorMsg(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSendCode}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleSendCode}
              disabled={loading}
              style={[s.ctaMain, loading && s.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={s.ctaTxt}>Send Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            {!!errorMsg && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle" size={14} color={C.red} />
                <Text style={s.errTxt}>{errorMsg}</Text>
              </View>
            )}

            <View style={s.codeRow}>
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { inputRefs.current[i] = ref; }}
                  style={[s.codeBox, digit ? s.codeBoxFilled : null]}
                  value={digit}
                  onChangeText={(t) => handleCodeChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={i === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleVerifyCode}
              disabled={loading}
              style={[s.ctaMain, loading && s.ctaDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={s.ctaTxt}>Verify Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.white} />
                </>
              )}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
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
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    textAlign: "center",
    fontFamily: F.bold,
    fontSize: 22,
    color: C.white,
  },
  codeBoxFilled: {
    borderColor: C.blue,
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
});
