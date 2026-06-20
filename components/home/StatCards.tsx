import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { BlurView } from "expo-blur";
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

// ─── Glass card wrapper ─────────────────────────────────────────────────────

function GlassCard({ gradient, children }: { gradient: [string, string]; children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.cardWrapper,
        {
          borderColor: isDark
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      {/* Frosted glass backdrop */}
      <BlurView
        intensity={50}
        tint={isDark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
      />
      {/* Diagonal gradient tint — gives each card its colour identity */}
      <LinearGradient
        colors={gradient}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      {/* Subtle diagonal glass reflection (light catch) */}
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "transparent"] as [string, string]}
        style={[StyleSheet.absoluteFill, styles.cardRadius]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.25, y: 0.5 }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// ─── Gradient tints — diagonal direction for natural light feel ────────────

const CARD_GRADIENTS = {
  burned: {
    dark:  ["rgba(192,57,43,0.22)",   "rgba(192,57,43,0.04)"] as [string, string],
    light: ["rgba(192,57,43,0.10)",   "rgba(192,57,43,0.02)"] as [string, string],
  },
  streak: {
    dark:  ["rgba(39,174,96,0.22)",   "rgba(39,174,96,0.04)"] as [string, string],
    light: ["rgba(39,174,96,0.10)",   "rgba(39,174,96,0.02)"] as [string, string],
  },
  water: {
    dark:  ["rgba(26,111,186,0.22)",  "rgba(26,111,186,0.04)"] as [string, string],
    light: ["rgba(26,111,186,0.10)",  "rgba(26,111,186,0.02)"] as [string, string],
  },
  eaten: {
    dark:  ["rgba(212,160,23,0.22)",  "rgba(212,160,23,0.04)"] as [string, string],
    light: ["rgba(212,160,23,0.10)",  "rgba(212,160,23,0.02)"] as [string, string],
  },
} as const;

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FireCard({ value, label }: { value: string; label: string }) {
  const { isDark, colors } = useTheme();
  const fireStyle = useFireAnim();
  const gradient = isDark ? CARD_GRADIENTS.burned.dark : CARD_GRADIENTS.burned.light;

  return (
    <GlassCard gradient={gradient}>
      <Animated.Text style={[styles.iconEmoji, fireStyle]}>🔥</Animated.Text>
      <Text style={[styles.val, { color: isDark ? "#FFFFFF" : colors.text }]}>{value}</Text>
      <Text style={[styles.lbl, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

function StreakCard({ value, label }: { value: string; label: string }) {
  const { isDark, colors } = useTheme();
  const eggStyle = useEggAnim();
  const gradient = isDark ? CARD_GRADIENTS.streak.dark : CARD_GRADIENTS.streak.light;

  return (
    <GlassCard gradient={gradient}>
      <Animated.Text style={[styles.iconEmoji, eggStyle]}>🥚</Animated.Text>
      <Text style={[styles.val, { color: isDark ? "#FFFFFF" : colors.text }]}>{value}</Text>
      <Text style={[styles.lbl, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

function WaterCard({ value, label }: { value: string; label: string }) {
  const { isDark, colors } = useTheme();
  const dropStyle = useDropletAnim();
  const gradient = isDark ? CARD_GRADIENTS.water.dark : CARD_GRADIENTS.water.light;

  return (
    <GlassCard gradient={gradient}>
      <Animated.Text style={[styles.iconEmoji, dropStyle]}>💧</Animated.Text>
      <Text style={[styles.val, { color: isDark ? "#FFFFFF" : colors.text }]}>{value}</Text>
      <Text style={[styles.lbl, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

function EatenCard({ value, label }: { value: string; label: string }) {
  const { isDark, colors } = useTheme();
  const forkStyle = useForkAnim();
  const gradient = isDark ? CARD_GRADIENTS.eaten.dark : CARD_GRADIENTS.eaten.light;

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
    <GlassCard gradient={gradient}>
      {/* Subtle shimmer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: shimmerX }, { rotate: "25deg" }],
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
            width: "35%",
          },
        ]}
        pointerEvents="none"
      />

      <Animated.Text style={[styles.iconEmoji, forkStyle]}>🍽️</Animated.Text>
      <Text style={[styles.val, { color: isDark ? "#FFFFFF" : colors.text }]}>{value}</Text>
      <Text style={[styles.lbl, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>{label}</Text>
    </GlassCard>
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
    borderWidth: 1,
    // Glass shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
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