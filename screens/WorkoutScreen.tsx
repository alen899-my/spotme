import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { COLORS, FONTS } from "../constants/theme";

export default function WorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daily Workout 🏋️</Text>
        <Text style={styles.subtitle}>Your personalized training plan</Text>
        
        {/* Placeholder for workout content */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Focus: Push</Text>
          <Text style={styles.cardText}>- Bench Press: 4 x 8-10</Text>
          <Text style={styles.cardText}>- Overhead Press: 3 x 10-12</Text>
          <Text style={styles.cardText}>- Tricep Extensions: 3 x 12-15</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 24,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: "#111111",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: "#666666",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#F9F9F9",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: "#111111",
    marginBottom: 16,
  },
  cardText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#444444",
    marginBottom: 8,
  },
});
