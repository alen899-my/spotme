import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { P, scale, vs } from "../../constants/homeTheme";

const WATER_GOAL_ML = 2500;

// ── Palette (matches BodyStatusCard) ─────────────────────────────────────────
const C = {
  cardBg:      "#2596BE",
  iconBg:      "#1a6e8a",
  sun:         "#F7CB16",
  ink:         "#04282B",
  white:       "#FFFFFF",
  lightText:   "#a8dff0",
  lightBorder: "rgba(255,255,255,0.15)",
  fillBg:      "rgba(255,255,255,0.15)",
  fillBar:     "#FFFFFF",
};

interface Props {
  waterMl: number;
  onLogWaterPress: () => void;
}

export default function HydrationCard({ waterMl, onLogWaterPress }: Props) {
  const waterPct     = Math.min((waterMl || 0) / WATER_GOAL_ML, 1);
  const pctLabel     = Math.round(waterPct * 100);
  const waterDisplay = waterMl >= 1000
    ? `${(waterMl / 1000).toFixed(1)}L`
    : `${waterMl || 0}ml`;

  // How many of 8 cups are filled
  const CUPS        = 8;
  const filledCups  = Math.round(waterPct * CUPS);

  return (
    <View style={styles.card}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="water" size={scale(18)} color={C.sun} />
          </View>
          <View>
            <Text style={styles.title}>Hydration</Text>
            <Text style={styles.subtitle}>Daily water intake</Text>
          </View>
        </View>

        {/* Percentage badge */}
        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{pctLabel}%</Text>
        </View>
      </View>

      {/* ── Big water amount ───────────────────────────────── */}
      <View style={styles.amountRow}>
        <Text style={styles.amountVal}>{waterDisplay}</Text>
        <Text style={styles.amountGoal}> / 2.5L</Text>
      </View>

      {/* ── Progress bar ───────────────────────────────────── */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${waterPct * 100}%` }]}>
          {/* Shimmer stripe */}
          <View style={styles.barShimmer} />
        </View>
      </View>

      {/* ── Cup indicators ─────────────────────────────────── */}
      <View style={styles.cupsRow}>
        {Array.from({ length: CUPS }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < filledCups ? "water" : "water-outline"}
            size={scale(16)}
            color={i < filledCups ? C.sun : C.lightBorder}
          />
        ))}
        <Text style={styles.cupsLabel}>{filledCups}/{CUPS} cups</Text>
      </View>

      {/* ── Divider ────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Footer ─────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          {waterPct >= 1
            ? "🎉 Goal reached! Great job!"
            : `${Math.round((WATER_GOAL_ML - (waterMl || 0)) / 1000 * 10) / 10}L left to reach your goal`}
        </Text>
        <TouchableOpacity
          onPress={onLogWaterPress}
          style={styles.logBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={scale(14)} color={C.ink} />
          <Text style={styles.logBtnText}>Log Water</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg,
    borderRadius:    scale(24),
    padding:         scale(18),
    marginBottom:    vs(20),
  },

  // Header
  header: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   vs(14),
  },
  titleRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           scale(10),
  },
  iconWrap: {
    width:           scale(42),
    height:          scale(42),
    borderRadius:    scale(14),
    backgroundColor: C.iconBg,
    justifyContent:  "center",
    alignItems:      "center",
    // inner shadow effect
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    4,
    elevation:       3,
  },
  title: {
    fontFamily:    FONTS.heading,
    fontSize:      scale(17),
    color:         C.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize:   scale(11),
    color:      C.lightText,
    marginTop:  1,
  },
  pctBadge: {
    backgroundColor:   C.iconBg,
    borderRadius:      20,
    paddingHorizontal: scale(12),
    paddingVertical:   vs(5),
  },
  pctText: {
    fontFamily: FONTS.bodyBold,
    fontSize:   scale(13),
    color:      C.sun,
  },

  // Amount
  amountRow: {
    flexDirection:  "row",
    alignItems:     "baseline",
    marginBottom:   vs(10),
  },
  amountVal: {
    fontFamily:    FONTS.heading,
    fontSize:      scale(36),
    color:         C.white,
    letterSpacing: -1,
  },
  amountGoal: {
    fontFamily: FONTS.body,
    fontSize:   scale(14),
    color:      C.lightText,
  },

  // Progress bar
  barBg: {
    height:          vs(10),
    borderRadius:    10,
    backgroundColor: C.fillBg,
    overflow:        "hidden",
    marginBottom:    vs(12),
  },
  barFill: {
    height:          "100%",
    borderRadius:    10,
    backgroundColor: C.white,
    overflow:        "hidden",
  },
  barShimmer: {
    position:        "absolute",
    top:             0,
    left:            "30%",
    width:           "20%",
    height:          "100%",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius:    10,
  },

  // Cups
  cupsRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           scale(4),
    marginBottom:  vs(14),
  },
  cupsLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize:   scale(11),
    color:      C.lightText,
    marginLeft: scale(4),
  },

  // Divider
  divider: {
    height:          1,
    backgroundColor: C.lightBorder,
    marginBottom:    vs(14),
  },

  // Footer
  footer: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  footerHint: {
    fontFamily: FONTS.body,
    fontSize:   scale(11),
    color:      C.lightText,
    flex:       1,
    marginRight: scale(8),
  },
  logBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               scale(4),
    backgroundColor:   C.sun,
    borderRadius:      scale(12),
    paddingVertical:   vs(8),
    paddingHorizontal: scale(14),
  },
  logBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize:   scale(12),
    color:      C.ink,
  },
});