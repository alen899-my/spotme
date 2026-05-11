import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

export default function WorkoutScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={[styles.title, { color: colors.text }]}>Daily Workout 🏋️</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your personalized training plan</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Focus: Push</Text>
          <Text style={[styles.cardText, { color: colors.textMuted }]}>- Bench Press: 4 x 8-10</Text>
          <Text style={[styles.cardText, { color: colors.textMuted }]}>- Overhead Press: 3 x 10-12</Text>
          <Text style={[styles.cardText, { color: colors.textMuted }]}>- Tricep Extensions: 3 x 12-15</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FONTS.heading, fontSize: 28, marginBottom: 8 },
  subtitle: { fontFamily: FONTS.body, fontSize: 16, marginBottom: 32 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, marginBottom: 16 },
  cardText: { fontFamily: FONTS.body, fontSize: 14, marginBottom: 8 },
});
