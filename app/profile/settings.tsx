import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      {/* Header */}
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
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.card}>
          <View style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? colors.iconCircle : 'rgba(37,150,190,0.1)' }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={s.settingTitle}>Dark Mode</Text>
                <Text style={s.settingSubtitle}>{isDark ? "Dark theme enabled" : "Light theme enabled"}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E0E0E0", true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View>


        {/* About Section */}

        <Text style={s.sectionLabel}>ABOUT</Text>
        <View style={s.card}>
          <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={s.settingTitle}>SpotMe v1.0.4 · Beta</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
  },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  settingSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  previewChip: {
    alignItems: "center",
    gap: 8,
  },
  previewDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewChipText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
