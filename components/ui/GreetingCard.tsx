/**
 * GreetingCard.tsx
 * Time-aware animated greeting card — fully solid coloured card.
 * Icon sits bottom-right so it never overlaps the time pill.
 */

import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Path,
  Defs,
  RadialGradient,
  Stop,
  Line,
} from "react-native-svg";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const scale = (n: number) => Math.round((SW / BASE_W) * n);
const vs = (n: number) => Math.round((SH / 844) * n);

export type TimeSlot = "dawn" | "morning" | "afternoon" | "dusk" | "evening" | "night";

interface SlotConfig {
  slot: TimeSlot;
  greeting: string;
  sub: string;
  cardBg: string;
  cardBgDark: string;
  skyGradient: [string, string];
  skyGradientDark: [string, string];
  border: string;
  nameColor: string;
  greetColor: string;
  subColor: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
}

const SLOTS: SlotConfig[] = [
  {
    slot: "dawn",
    greeting: "Rise & Shine",
    sub: "The world starts fresh — so do you.",
    cardBg: "#3D1F6E", cardBgDark: "#1E0F37",
    skyGradient: ["#1a0533", "#F4845F"],
    skyGradientDark: ["#0d0219", "#7a3f2e"],
    border: "#F4845F60",
    nameColor: "#FFFFFF", greetColor: "#F4845F", subColor: "rgba(255,255,255,0.65)",
    pillBg: "rgba(244,132,95,0.22)", pillBorder: "rgba(244,132,95,0.45)", pillText: "#F4845F",
  },
  {
    slot: "morning",
    greeting: "Good Morning",
    sub: "Fuel up and crush it today.",
    cardBg: "#2596BE", cardBgDark: "#134B5F",
    skyGradient: ["#2596BE", "#87CEEB"],
    skyGradientDark: ["#134B5F", "#1a3a4f"],
    border: "#F7CB1650",
    nameColor: "#FFFFFF", greetColor: "#F7CB16", subColor: "rgba(255,255,255,0.72)",
    pillBg: "rgba(247,203,22,0.18)", pillBorder: "rgba(247,203,22,0.50)", pillText: "#F7CB16",
  },
  {
    slot: "afternoon",
    greeting: "Good Afternoon",
    sub: "Keep the momentum going strong.",
    cardBg: "#1a6e8a", cardBgDark: "#0D3745",
    skyGradient: ["#1a6e8a", "#4A90D9"],
    skyGradientDark: ["#0D3745", "#1a2e4a"],
    border: "#2596BE80",
    nameColor: "#FFFFFF", greetColor: "#F7CB16", subColor: "rgba(255,255,255,0.68)",
    pillBg: "rgba(255,255,255,0.15)", pillBorder: "rgba(255,255,255,0.30)", pillText: "#FFFFFF",
  },
  {
    slot: "dusk",
    greeting: "Good Evening",
    sub: "How did your session go today?",
    cardBg: "#0d4d65", cardBgDark: "#062632",
    skyGradient: ["#E87D3E", "#3D1F6E"],
    skyGradientDark: ["#7a3f1e", "#1E0F37"],
    border: "#E87D3E55",
    nameColor: "#FFFFFF", greetColor: "#E87D3E", subColor: "rgba(255,255,255,0.65)",
    pillBg: "rgba(232,125,62,0.20)", pillBorder: "rgba(232,125,62,0.45)", pillText: "#E87D3E",
  },
  {
    slot: "evening",
    greeting: "Good Evening",
    sub: "Wind down and recover well.",
    cardBg: "#0d2e45", cardBgDark: "#061724",
    skyGradient: ["#0d2e45", "#1a1a3e"],
    skyGradientDark: ["#061724", "#0d0d1a"],
    border: "#2596BE40",
    nameColor: "#FFFFFF", greetColor: "#2596BE", subColor: "rgba(255,255,255,0.60)",
    pillBg: "rgba(37,150,190,0.20)", pillBorder: "rgba(37,150,190,0.45)", pillText: "#2596BE",
  },
  {
    slot: "night",
    greeting: "Good Night",
    sub: "Rest hard — muscles grow while you sleep.",
    cardBg: "#04282B", cardBgDark: "#021415",
    skyGradient: ["#04282B", "#0a0a1a"],
    skyGradientDark: ["#021415", "#050510"],
    border: "#F7CB1625",
    nameColor: "#FFFFFF", greetColor: "#F7CB16", subColor: "rgba(255,255,255,0.55)",
    pillBg: "rgba(247,203,22,0.12)", pillBorder: "rgba(247,203,22,0.35)", pillText: "#F7CB16",
  },
];

function getSlot(hour: number): SlotConfig {
  if (hour >= 5 && hour < 7) return SLOTS[0];
  if (hour >= 7 && hour < 12) return SLOTS[1];
  if (hour >= 12 && hour < 17) return SLOTS[2];
  if (hour >= 17 && hour < 19) return SLOTS[3];
  if (hour >= 19 && hour < 22) return SLOTS[4];
  return SLOTS[5];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon({ size = 44, rayColor = "#F7CB16" }: { size?: number; rayColor?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 44 44">
        <Defs>
          <RadialGradient id="sg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF9C4" />
            <Stop offset="100%" stopColor={rayColor} />
          </RadialGradient>
        </Defs>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const r = (deg * Math.PI) / 180;
          return (
            <Line key={i}
              x1={22 + 11 * Math.cos(r)} y1={22 + 11 * Math.sin(r)}
              x2={22 + 20 * Math.cos(r)} y2={22 + 20 * Math.sin(r)}
              stroke={rayColor} strokeWidth="2.5" strokeLinecap="round"
            />
          );
        })}
        <Circle cx="22" cy="22" r="9" fill="url(#sg)" />
      </Svg>
    </Animated.View>
  );
}

function MoonIcon({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 42 42">
      <Defs>
        <RadialGradient id="mg" cx="40%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFF9E0" />
          <Stop offset="100%" stopColor="#F7CB16" />
        </RadialGradient>
      </Defs>
      <Path d="M28 7 A15 15 0 1 0 28 35 A11 11 0 1 1 28 7Z" fill="url(#mg)" />
      <Circle cx="18" cy="15" r="1.6" fill="rgba(231,177,0,0.4)" />
      <Circle cx="24" cy="25" r="2.2" fill="rgba(231,177,0,0.3)" />
      <Circle cx="15" cy="24" r="1.1" fill="rgba(231,177,0,0.4)" />
    </Svg>
  );
}

function DawnIcon({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Path d="M4 32 Q22 12 40 32" fill="none" stroke="#F4845F" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M12 32 A10 10 0 0 1 32 32Z" fill="#F7CB16" />
      {[-50, -28, -8, 8, 28, 50].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return (
          <Line key={i}
            x1={22 + 11 * Math.sin(r)} y1={32 - 11 * Math.cos(r)}
            x2={22 + 18 * Math.sin(r)} y2={32 - 18 * Math.cos(r)}
            stroke="#F7CB16" strokeWidth="2.2" strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function DuskIcon({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Path d="M4 30 Q22 10 40 30" fill="none" stroke="#E87D3E" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M11 30 A11 11 0 0 1 33 30Z" fill="#E87D3E" />
      {[-55, -32, -10, 10, 32, 55].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return (
          <Line key={i}
            x1={22 + 12 * Math.sin(r)} y1={30 - 12 * Math.cos(r)}
            x2={22 + 19 * Math.sin(r)} y2={30 - 19 * Math.cos(r)}
            stroke="#F7CB16" strokeWidth="2.2" strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function StarField({ count = 20 }: { count?: number }) {
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.25, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      x: ((i * 79 + 11) % 100),
      y: ((i * 53 + 7) % 85),
      r: ((i * 11 + 3) % 3) * 0.6 + 0.7,
    })), [count]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {stars.map((s, i) => (
          <Circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#FFFFFF" />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface GreetingCardProps {
  firstName: string;
  fitnessGoal?: string;
}

export default function GreetingCard({ firstName, fitnessGoal }: GreetingCardProps) {
  const { colors, isDark } = useTheme();
  const hour = new Date().getHours();
  const config = useMemo(() => getSlot(hour), [hour]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(18))).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const isNight = config.slot === "night" || config.slot === "evening" || isDark;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: isDark ? colors.border : config.border,
          borderWidth: isDark ? 1 : 1.5,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Sky gradient background */}
      <LinearGradient
        colors={isDark ? config.skyGradientDark : config.skyGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars for night/evening/dark mode — behind content but above gradient */}
      {isNight && <StarField count={24} />}

      {/* ── Content (full width, no right padding eaten by icon) ── */}
      <View style={styles.content}>

        {/* Row 1: GREETING label (left)  +  time pill (right) */}
        <View style={styles.topRow}>
          <Text style={[styles.greetLabel, { color: isDark ? colors.primary : config.greetColor }]}>
            {config.greeting.toUpperCase()}
          </Text>
          <View style={[styles.timePill, { backgroundColor: isDark ? colors.inputBg : config.pillBg, borderColor: isDark ? colors.border : config.pillBorder }]}>
            <Text style={[styles.timePillText, { color: isDark ? colors.primary : config.pillText }]}>
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* Row 2: Name (left, flex) + Icon (right, fixed size, aligned to name row) */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: isDark ? colors.text : config.nameColor, flex: 1 }]} numberOfLines={1}>
            {firstName} 👋
          </Text>

          {/* Icon lives here — inline with name, right-aligned, never overlaps text */}
          <Animated.View
            style={[styles.iconInline, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
            pointerEvents="none"
          >
            {config.slot === "morning" && <SunIcon size={scale(48)} rayColor="#F7CB16" />}
            {config.slot === "afternoon" && <SunIcon size={scale(44)} rayColor="rgba(255,255,255,0.9)" />}
            {config.slot === "dawn" && <DawnIcon size={scale(48)} />}
            {config.slot === "dusk" && <DuskIcon size={scale(48)} />}
            {config.slot === "evening" && <MoonIcon size={scale(42)} />}
            {config.slot === "night" && <MoonIcon size={scale(46)} />}
          </Animated.View>
        </View>

        {/* Sub message */}
        <Text style={[styles.sub, { color: isDark ? colors.textMuted : config.subColor }]}>
          {config.sub}
        </Text>


      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(22),
    borderWidth: 1.5,
    marginBottom: vs(20),
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },

  content: {
    paddingHorizontal: scale(20),
    paddingTop: vs(18),
    paddingBottom: vs(18),
    gap: vs(4),
    zIndex: 3,
  },

  // Row 1 — greeting label + time pill, full width
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  greetLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    letterSpacing: 2.2,
  },

  timePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },

  timePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    letterSpacing: 0.3,
  },

  // Row 2 — name (flex) + icon (fixed right)
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: vs(2),
  },

  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(30),
    letterSpacing: -0.6,
    lineHeight: scale(36),
  },

  // Icon sits inline to the right of the name, never absolute
  iconInline: {
    marginLeft: scale(8),
    // slight opacity disc behind icon for legibility on any bg
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: scale(4),
  },

  sub: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    lineHeight: scale(20),
    marginTop: vs(2),
  },

  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: vs(5),
    marginTop: vs(6),
  },

  goalPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
  },
});