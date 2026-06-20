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

export default function TermsConditionsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(colors);

  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: "checkmark-circle-outline",
      text: "By downloading, installing, or accessing spotME, you agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms, please do not use or access the application.",
    },
    {
      title: "2. Health & Fitness Disclaimer",
      icon: "heart-outline",
      text: "spotME is a fitness tracking and gamification tool. Before starting any physical exercise program or following routines documented in this app, please take note of the following:",
      bullets: [
        "Consult a Healthcare Professional: You should consult your physician or other health care professional before starting any fitness program to determine if it is right for your needs.",
        "Assumption of Risk: Exercising carries inherent physical risk. You voluntarily assume all risk of injury, illness, or damage associated with your physical workouts.",
        "Not Medical Advice: The contents of the app (exercise directories, weight goals, hydration tips) are for informational purposes only and do not constitute professional medical advice or diagnosis.",
      ],
    },
    {
      title: "3. Account Security",
      icon: "key-outline",
      text: "To use certain features of the app, you must register for an account. You are responsible for safeguarding your account details:",
      bullets: [
        "You must provide accurate and complete information during registration.",
        "You are solely responsible for all activities that occur under your account.",
        "If you suspect any unauthorized use of your account, you must notify us immediately.",
      ],
    },
    {
      title: "4. User Conduct & Community Guidelines",
      icon: "people-outline",
      text: "spotME allows users to share custom training splits, profiles, and streaks with the community. You agree to utilize these features responsibly and refrain from:",
      bullets: [
        "Uploading or sharing content that is illegal, abusive, harassing, defamatory, or violates third-party intellectual property rights.",
        "Using the application for commercial advertising, solicitation, or spamming.",
        "Attempting to compromise the security of our databases, APIs, or servers.",
      ],
    },
    {
      title: "5. Intellectual Property",
      icon: "briefcase-outline",
      text: "All application assets, interfaces, graphics, brand marks (spotME), codebase, and layouts are the exclusive property of spotME and its licensors. You may not copy, modify, distribute, or reverse-engineer any portion of the app without our explicit prior written consent.",
    },
    {
      title: "6. Limitation of Liability",
      icon: "alert-circle-outline",
      text: "To the maximum extent permitted by law, spotME, its developer, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, or physical injuries resulting from your use of or inability to use the application.",
    },
    {
      title: "7. Account Termination",
      icon: "close-circle-outline",
      text: "We reserve the right to suspend or terminate your account and access to the app at our sole discretion, without prior notice, for conduct that we believe violates these Terms, is harmful to other users, or violates local laws.",
    },
    {
      title: "8. Changes to Terms",
      icon: "create-outline",
      text: "We reserve the right to modify these Terms & Conditions at any time. We will post modified terms on this page and update the 'Last Updated' date. Your continued use of spotME after changes are posted constitutes your acceptance of the updated Terms.",
    },
    {
      title: "9. Governing Law",
      icon: "globe-outline",
      text: "These Terms & Conditions are governed by and construed in accordance with the laws of your jurisdiction, without regard to conflict of law principles.",
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
            Terms & Conditions
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
