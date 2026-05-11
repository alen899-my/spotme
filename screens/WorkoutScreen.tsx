import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WorkoutScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Train Now 🚀</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Let's make progress today.</Text>
          </View>
          <TouchableOpacity style={[styles.historyBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="time-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Active Workout Hero ────────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.9} style={styles.heroCard}>
          <LinearGradient
            colors={['#E00000', '#8B0000']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>RECOMMENDED</Text>
            </View>
            <Text style={styles.heroTitle}>Morning Push Session</Text>
            <Text style={styles.heroSub}>45-60 mins • High Intensity</Text>
            
            <View style={styles.heroFooter}>
              <View style={styles.startBtn}>
                <Text style={styles.startBtnText}>START WORKOUT</Text>
                <Ionicons name="play" size={16} color="#E00000" />
              </View>
            </View>
          </View>
          <View style={styles.heroIconPlaceholder}>
            <MaterialCommunityIcons name="weight-lifter" size={140} color="rgba(255,255,255,0.15)" />
          </View>
        </TouchableOpacity>

        {/* ── Quick Action Grid (Uber Style) ─────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.tileGrid}>
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(224,0,0,0.1)' }]}>
              <Ionicons name="add-circle" size={30} color="#E00000" />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>Empty{"\n"}Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <Ionicons name="library" size={30} color="#007AFF" />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>Saved{"\n"}Routines</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.tileIconWrap, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
              <Ionicons name="stats-chart" size={30} color="#34C759" />
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]}>View{"\n"}Progress</Text>
          </TouchableOpacity>
        </View>

        {/* ── My Routines (Synchronized with Exercise Grid) ──────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>My Routines</Text>
          <TouchableOpacity>
            <Text style={{ color: '#E00000', fontFamily: FONTS.bodyBold }}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routineGrid}>
          <TouchableOpacity style={[styles.routineCard, { backgroundColor: '#1A1A1A', borderColor: colors.border }]}>
            <LinearGradient colors={['#333', '#111']} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.cardBgLabel}>HYP</Text>
            <View style={styles.routineContent}>
              <Text style={styles.routineTitle}>Hypertrophy A</Text>
              <Text style={styles.routineSub}>4 days • Full Body</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.routineCard, { backgroundColor: '#1A1A1A', borderColor: colors.border }]}>
            <LinearGradient colors={['#333', '#111']} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.cardBgLabel}>STR</Text>
            <View style={styles.routineContent}>
              <Text style={styles.routineTitle}>Strength B</Text>
              <Text style={styles.routineSub}>3 days • Power</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontFamily: FONTS.heading, fontSize: 32 },
  subtitle: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2 },
  historyBtn: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  // Hero Card
  heroCard: {
    width: '100%', height: 190, borderRadius: 28,
    overflow: 'hidden', marginBottom: 32, position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  heroContent: { padding: 24, flex: 1, justifyContent: 'center', zIndex: 2 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  heroBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF', letterSpacing: 1.5 },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 28, color: '#FFF', marginBottom: 4 },
  heroSub: { fontFamily: FONTS.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 24 },
  heroFooter: { flexDirection: 'row' },
  startBtn: {
    backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, gap: 8,
  },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#E00000' },
  heroIconPlaceholder: { position: 'absolute', right: -30, bottom: -30, zIndex: 1 },

  // Grid / Tiles
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 16 },
  tileGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  tile: {
    width: (SCREEN_WIDTH - 40 - 24) / 3,
    padding: 16, borderRadius: 24, borderWidth: 1, alignItems: 'center',
  },
  tileIconWrap: {
    width: 54, height: 54, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  tileLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, textAlign: 'center', lineHeight: 15 },

  // Routine Grid (Premium Consistency)
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  routineGrid: { flexDirection: 'row', gap: 12 },
  routineCard: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    height: 120, borderRadius: 24, overflow: 'hidden',
    position: 'relative', borderWidth: 1,
  },
  cardBgLabel: {
    position: 'absolute', top: -10, right: -10, fontSize: 60,
    fontFamily: FONTS.heading, color: 'rgba(255,255,255,0.06)', zIndex: 0,
  },
  routineContent: { position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1 },
  routineTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF' },
  routineSub: { fontFamily: FONTS.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
