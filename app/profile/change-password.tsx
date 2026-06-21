import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  fieldWrap: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textDim,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    minHeight: 50,
  },
  inputErr: {
    borderColor: "#FF4D4D",
  },
  errTxt: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#FF4D4D",
    marginTop: 4,
    marginLeft: 2,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
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
  msgTxt: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#FFFFFF",
    marginLeft: 8,
  },
  ctaMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    minHeight: 54,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaTxt: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 1,
    marginRight: 10,
  },
});

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const clearMsgs = () => { setErrorMsg(""); setSuccessMsg(""); };

  const handleSubmit = async () => {
    clearMsgs();
    if (!currentPassword) { setErrorMsg("Enter your current password"); return; }
    if (newPassword.length < 6) { setErrorMsg("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setErrorMsg("Passwords do not match"); return; }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setErrorMsg("Session expired. Please log in again."); return; }
      await axios.post(
        `${API_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg("Password changed successfully");
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to change password. Try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <View style={[
        s.header,
        {
          backgroundColor: isDark ? colors.bg : colors.primary,
          paddingTop: Math.max(insets.top, 12),
          borderBottomWidth: isDark ? 1 : 0,
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {!!successMsg && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={s.msgTxt}>{successMsg}</Text>
            </View>
          )}

          {!!errorMsg && (
            <View style={s.errBox}>
              <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
              <Text style={s.msgTxt}>{errorMsg}</Text>
            </View>
          )}

          <View style={s.fieldWrap}>
            <Text style={s.label}>Current password</Text>
            <TextInput
              style={s.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.textDim}
              value={currentPassword}
              onChangeText={(v) => { setCurrentPassword(v); clearMsgs(); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              style={{ alignSelf: "flex-end", marginTop: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.primary }}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>New password</Text>
            <TextInput
              style={s.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textDim}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); clearMsgs(); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Confirm new password</Text>
            <TextInput
              style={s.input}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textDim}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearMsgs(); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSubmit}
            disabled={loading}
            style={[s.ctaMain, loading && s.ctaDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={s.ctaTxt}>Update Password</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
