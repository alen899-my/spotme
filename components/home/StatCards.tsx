import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StatCardsProps {
  caloriesBurned: number;
  currentStreak: number;
  waterMl: number;
  caloriesConsumed: number;
}

// ─── Individual animations ────────────────────────────────────────────────────

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
  const scaleVal = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] });
  return { transform: [{ scale: scaleVal }, { rotate }] };
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

/** 💧 Water droplet bounce */
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
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-5, 4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [0.7, 1, 1, 0.7] });
  return { transform: [{ translateY }], opacity };
}

/** 🍽️ Fork tilt */
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
  const scaleVal = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  return { transform: [{ rotate }, { scale: scaleVal }] };
}

// ─── Card configs matching the image ─────────────────────────────────────────
// Image shows: red card (flame), green card (egg), blue card (water), gold card (fork+plate)

const CARDS = {
  burned: {
    gradient: ["#c0392b", "#922b21"] as [string, string],
    iconColor: "#ffffff",
    valColor: "#ffffff",
    lblColor: "rgba(255,255,255,0.75)",
  },
  streak: {
    gradient: ["#27ae60", "#1e8449"] as [string, string],
    iconColor: "#ffffff",
    valColor: "#ffffff",
    lblColor: "rgba(255,255,255,0.75)",
  },
  water: {
    gradient: ["#1a6fba", "#1558a0"] as [string, string],
    iconColor: "#ffffff",
    valColor: "#ffffff",
    lblColor: "rgba(255,255,255,0.75)",
  },
  eaten: {
    gradient: ["#d4a017", "#b8860b"] as [string, string],
    iconColor: "#ffffff",
    valColor: "#ffffff",
    lblColor: "rgba(255,255,255,0.75)",
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FireCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.burned;
  const fireStyle = useFireAnim();

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={cfg.gradient}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Animated.Text style={[styles.iconEmoji, fireStyle]}>🔥</Animated.Text>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </View>
  );
}

function StreakCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.streak;
  const eggStyle = useEggAnim();

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={cfg.gradient}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Animated.Text style={[styles.iconEmoji, eggStyle]}>🥚</Animated.Text>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </View>
  );
}

function WaterCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.water;
  const dropStyle = useDropletAnim();

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={cfg.gradient}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <Animated.Text style={[styles.iconEmoji, dropStyle]}>💧</Animated.Text>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </View>
  );
}

function EatenCard({ value, label }: { value: string; label: string }) {
  const cfg = CARDS.eaten;
  const forkStyle = useForkAnim();

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
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={cfg.gradient}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Subtle shimmer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: shimmerX }, { rotate: "25deg" }],
            backgroundColor: "rgba(255,255,255,0.06)",
            width: "35%",
          },
        ]}
        pointerEvents="none"
      />

      <Animated.Text style={[styles.iconEmoji, forkStyle]}>🍽️</Animated.Text>
      <Text style={[styles.val, { color: cfg.valColor }]}>{value}</Text>
      <Text style={[styles.lbl, { color: cfg.lblColor }]}>{label}</Text>
    </View>
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
      <FireCard value={String(caloriesBurned)} label="KCAL BURNED" />
      <StreakCard value={String(currentStreak)} label="DAY STREAK" />
      <WaterCard value={waterDisplay} label="WATER" />
      <EatenCard value={String(caloriesConsumed)} label="KCAL EATEN" />
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
  cardWrapper: {
    flex: 1,
    borderRadius: scale(16),
    paddingVertical: vs(16),
    paddingHorizontal: scale(6),
    alignItems: "center",
    justifyContent: "center",
    gap: vs(6),
    overflow: "hidden",
    position: "relative",
    minHeight: vs(120),
  },
  cardRadius: {
    borderRadius: scale(16),
  },
  iconEmoji: {
    fontSize: scale(28),
    lineHeight: scale(34),
  },
  val: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  lbl: {
    fontFamily: FONTS.body,
    fontSize: scale(8),
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});

export default StatCards;