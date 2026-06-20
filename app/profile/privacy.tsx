import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    responsiveContainer: {
      flex: 1,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      backgroundColor: colors.bg,
      ...(Platform.OS === "web" && SCREEN_WIDTH > 720
        ? {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.border,
          }
        : {}),
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
      fontSize: 20,
      color: colors.text,
      letterSpacing: 0.5,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    lastUpdated: {
      fontFamily: FONTS.body,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 20,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 12,
    },
    sectionTitle: {
      flex: 1,
      fontFamily: FONTS.bodyBold,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    sectionText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 22,
    },
    bulletPoint: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 8,
      paddingLeft: 6,
      gap: 8,
      width: "100%",
    },
    bulletDot: {
      fontSize: 14,
      color: colors.primary,
      lineHeight: 22,
    },
    bulletText: {
      flex: 1,
      flexShrink: 1,
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 22,
    },
  });

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);

  const sections = [
    {
      title: "1. Information We Collect",
      icon: "information-circle-outline",
      text: "To provide you with personalized fitness tracking, streak monitoring, and community capabilities, we collect the following types of information when you use spotME:",
      bullets: [
        "Account Details: Your name, email address, and profile picture.",
        "Physical Metrics: Height, weight, gender, age, body fat percentage, and optional muscle/body measurements (e.g., chest, waist, hips).",
        "Workout Activity: Logged exercises, weight lifted, sets, repetitions, custom training splits, and active workout timers.",
        "Gamification & Progress: Daily streaks, XP, level status, and league progression data.",
        "App Settings: Theme choices, hydration settings, and notification preferences.",
      ],
    },
    {
      title: "2. How We Use Your Information",
      icon: "cog-outline",
      text: "We use the collected information for purposes vital to the app's functionality, including to:",
      bullets: [
        "Calculate your daily workout stats, calorie estimations, and physical progression.",
        "Provide gamified streak mechanics, XP calculations, and league tier standings.",
        "Manage push notifications and custom hydration alerts.",
        "Facilitate social features if you opt to share your workout programs or splits with the community.",
        "Ensure safety and monitor app performance to squash bugs.",
      ],
    },
    {
      title: "3. Privacy & Profile Visibility Options",
      icon: "eye-off-outline",
      text: "We respect your choices. By default, spotME provides privacy controls within your Settings:",
      bullets: [
        "Public Profile (Default): Everyone in the community can view your level, streaks, and shared splits.",
        "Private Profile: If enabled, only your approved followers can view your detailed physical profile, splits, and workout logs.",
        "Shared Splits: You can toggled program sharing on or off. Turning it off keeps your routine private to you.",
      ],
    },
    {
      title: "4. Data Sharing & Third Parties",
      icon: "share-social-outline",
      text: "We do not sell, trade, or rent your personal metrics or workout logs to third parties. We only share data in the following cases:",
      bullets: [
        "With your explicit permission (e.g. sharing your program splits with other spotME users).",
        "To comply with legal obligations, enforce our terms of service, or protect our users' security.",
        "With trusted third-party service providers (like database hosting, analytics providers, or push notification relays) that process data under strict confidentiality obligations.",
      ],
    },
    {
      title: "5. Data Deletion & Retention",
      icon: "trash-outline",
      text: "We retain your personal metrics and workout logs only for as long as your account remains active. You maintain full control over your data:",
      bullets: [
        "You can delete your spotME account at any time by navigating to Settings > Account > Delete Account.",
        "Upon requesting account deletion, all personal data, physical metrics, streaks, and workout histories will be permanently removed from our active databases and cannot be recovered.",
      ],
    },
    {
      title: "6. Security & Safeguards",
      icon: "lock-closed-outline",
      text: "We implement industry-standard administrative, physical, and electronic security measures to safeguard your information from unauthorized access, modification, or deletion. However, please remember that no transmission method over the internet or mobile network is 100% secure, and we cannot guarantee absolute security.",
    },
    {
      title: "7. Updates to This Policy",
      icon: "refresh-outline",
      text: "We may update this Privacy Policy from time to time to reflect changes in our features or legal requirements. When updates occur, we will adjust the 'Last Updated' date at the top of this page. We encourage you to review this policy periodically.",
    },
    {
      title: "8. Contact Us",
      icon: "mail-outline",
      text: "If you have any questions or feedback regarding this Privacy Policy or our data practices, please reach out to us at: support@spotme-app.com",
    },
  ];

  return (
    <View style={s.container}>
      <View style={s.responsiveContainer}>
        {/* Header */}
        <View
          style={[
            s.header,
            {
              backgroundColor: isDark ? colors.bg : colors.primary,
              paddingTop: Math.max(insets.top, 12),
              borderBottomWidth: isDark ? 1 : 0,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              s.backBtn,
              { backgroundColor: isDark ? colors.inputBg : "rgba(255,255,255,0.15)" },
            ]}
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : "#FFF"} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: isDark ? colors.text : "#FFF" }]}>
            Privacy Policy
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.lastUpdated}>Last Updated: June 20, 2026</Text>

          {sections.map((section, idx) => (
            <View key={idx} style={s.card}>
              <View style={s.sectionTitleRow}>
                <Ionicons name={section.icon as any} size={22} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={s.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={s.sectionText}>{section.text}</Text>

              {section.bullets &&
                section.bullets.map((bullet, bIdx) => (
                  <View key={bIdx} style={s.bulletPoint}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{bullet}</Text>
                  </View>
                ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
