import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";

export default function GymRemainders() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Ionicons name="alarm" size={64} color="#2596BE" />
      <Text style={[styles.title, { color: colors.text }]}>Gym Remainders</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Track upcoming membership renewals, payment alerts, client booking updates, and announcements.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(30),
    gap: vs(16),
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: scale(24),
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    textAlign: "center",
    lineHeight: scale(18),
  },
});
