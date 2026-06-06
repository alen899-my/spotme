import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StatCardsProps {
  caloriesBurned: number;
  currentStreak: number;
  waterMl: number;
  caloriesConsumed: number;
}

// ─── Individual animations ───────────────────────────────────────────────────

/** 🔥 Fire flicker – fast scale + rotate loop */
function useFireAnim() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });
  return { transform: [{ scale }, { rotate }] };
}

/** 🥚 Egg heartbeat pulse */
function useEggAnim() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.14, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ])
    ).start();
  }, []);
  return { transform: [{ scale: anim }] };
}

/** 💧 Water droplet fall */
function useDropletAnim() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 5] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return { transform: [{ translateY }], opacity };
}

/** Water fill level */
function useWaterFill() {
  const anim = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.54, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.2, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);
  return anim; // 0–1 fraction of card height
}

/** 🍽️ Fork shine / tilt */
function useForkAnim() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1200),
      ])
    ).start();
  }, []);
  const rotate = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "-8deg", "0deg"] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  return { transform: [{ rotate }, { scale }] };
}

// ─── Card glow pulse ─────────────────────────────────────────────────────────

function useGlowAnim(delay = 0) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return anim;
}

// ─── Card configs ────────────────────────────────────────────────────────────

const CARDS = {
  burned: {
    gradient: ["#1a0800", "#0d0400"] as [string, string],
    gradientDark: ["#1a0800", "#0d0400"] as [string, string],
    border: "#ff450055",
    glowColor: "rgba(255,69,0,0.35)",
    iconBg: "rgba(255,69,0,0.18)",
    iconColor: "#ff6b35",
    valColor: "#ff6b35",
    lblColor: "#6b2f14",
    icon: "flame" as const,
  },
  streak: {
    gradient: ["#041a08", "#020d04"] as [string, string],
    gradientDark: ["#041a08", "#020d04"] as [string, string],
    border: "#30d15855",
    glowColor: "rgba(48,209,88,0.3)",
    iconBg: "rgba(48,209,88,0.18)",
    iconColor: "#30d158",
    valColor: "#30d158",
    lblColor: "#1a5a2a",
    icon: "egg" as const,
  },
  water: {
    gradient: ["#001018", "#000810"] as [string, string],
    gradientDark: ["#001018", "#000810"] as [string, string],
    border: "#0a84ff55",
    glowColor: "rgba(10,132,255,0.28)",
    iconBg: "rgba(10,132,255,0.18)",
    iconColor: "#40a9ff",
    valColor: "#40a9ff",
    lblColor: "#0a3660",
    waterFill: "rgba(10,132,255,0.16)",
    waterWave: "rgba(10,132,255,0.22)",
    icon: "water" as const,
  },
  eaten: {
    gradient: ["#191000", "#0d0900"] as [string, string],
    gradientDark: ["#191000", "#0d0900"] as [string, string],
    border: "#ffd60a55",
    glowColor: "rgba(255,214,10,0.28)",
    iconBg: "rgba(255,214,10,0.18)",
    iconColor: "#ffd60a",
    valColor: "#ffd60a",
    lblColor: "#5a4200",
    icon: "restaurant" as const,
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FireCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.burned;
  const fireStyle = useFireAnim();
  const glow = useGlowAnim(0);
  const { isDark } = useTheme();

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: cfg.border, borderWidth: 1 },
        {
          shadowColor: cfg.glowColor,
          shadowOpacity: glow,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
      ]}
    >
      <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Animated.Text style={[styles.emojiIcon, fireStyle]}>🔥</Animated.Text>
      </View>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </Animated.View>
  );
}

function StreakCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.streak;
  const eggStyle = useEggAnim();
  const glow = useGlowAnim(300);

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: cfg.border, borderWidth: 1 },
        {
          shadowColor: cfg.glowColor,
          shadowOpacity: glow,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
      ]}
    >
      <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Animated.Text style={[styles.emojiIcon, eggStyle]}>🥚</Animated.Text>
      </View>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </Animated.View>
  );
}

function WaterCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.water;
  const dropStyle = useDropletAnim();
  const fillHeight = useWaterFill();
  const glow = useGlowAnim(600);

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: cfg.border, borderWidth: 1 },
        {
          shadowColor: cfg.glowColor,
          shadowOpacity: glow,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
      ]}
    >
      <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

      {/* Animated water fill */}
      <Animated.View
        style={[
          styles.waterFill,
          {
            backgroundColor: cfg.waterFill,
            height: fillHeight.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />

      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg, zIndex: 2 }]}>
        <Animated.Text style={[styles.emojiIcon, dropStyle]}>💧</Animated.Text>
      </View>
      <Text style={[styles.val, { color: cfg.valColor, zIndex: 2 }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor, zIndex: 2 }]}>{label}</Text>
    </Animated.View>
  );
}

function EatenCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.eaten;
  const forkStyle = useForkAnim();
  const glow = useGlowAnim(900);

  // Shimmer sweep
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 2, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(shimmer, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const shimmerX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: ["-100%", "300%"] as any });

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: cfg.border, borderWidth: 1 },
        {
          shadowColor: cfg.glowColor,
          shadowOpacity: glow,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
      ]}
    >
      <LinearGradient colors={cfg.gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

      {/* Shimmer sweep */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: shimmerX }, { rotate: "25deg" }],
            backgroundColor: "rgba(255,214,10,0.04)",
            width: "35%",
          },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Animated.Text style={[styles.emojiIcon, forkStyle]}>🍽️</Animated.Text>
      </View>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function StatCards({
  caloriesBurned,
  currentStreak,
  waterMl,
  caloriesConsumed,
}: StatCardsProps) {
  const waterDisplay =
    waterMl >= 1000
      ? `${(waterMl / 1000).toFixed(1)}L`
      : `${waterMl || 0}ml`;

  return (
    <View style={styles.row}>
      <FireCard value={String(caloriesBurned)} label="kcal burned" />
      <StreakCard value={String(currentStreak)} label="day streak" />
      <WaterCard value={waterDisplay} label="water" />
      <EatenCard value={String(caloriesConsumed)} label="kcal eaten" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: scale(8),
    marginBottom: vs(24),
  },
  card: {
    flex: 1,
    borderRadius: scale(20),
    paddingVertical: vs(14),
    paddingHorizontal: scale(8),
    alignItems: "center",
    gap: vs(5),
    overflow: "hidden",
    position: "relative",
    minHeight: vs(120),
    justifyContent: "center",
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  emojiIcon: {
    fontSize: scale(20),
    lineHeight: scale(24),
  },
  val: {
    fontFamily: FONTS.heading,
    fontSize: scale(15),
    letterSpacing: -0.5,
  },
  lbl: {
    fontFamily: FONTS.body,
    fontSize: scale(9),
    textAlign: "center",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  waterFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: scale(20),
  },
});

export default StatCards;