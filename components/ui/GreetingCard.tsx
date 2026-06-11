/**
 * GreetingCard.tsx
 * Redesigned to match the SpotMe UI — dark navy card, coach image bleeding
 * top-right, circular arc halo behind coach, dot pattern bg, coach badge pill.
 * Time-aware greeting label & colour accent still change by slot.
 */

import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Image,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Pattern,
  Rect,
  G,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const coachImage = require("../../assets/coach/fit-cartoon-character-training.png");

const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const scale = (n: number) => Math.round((SW / BASE_W) * n);
const vs = (n: number) => Math.round((SH / 844) * n);

// ─── Card is always dark navy — only the accent colour changes by time ────────

export type TimeSlot = "dawn" | "morning" | "afternoon" | "dusk" | "evening" | "night";

interface SlotConfig {
  slot: TimeSlot;
  greeting: string;
  sub: string;
  bgColor: string;           // card background shade
  accentColor: string;       // greeting label + time text + arc stroke
  greetLabelColor: string;   // small-caps greeting
  arcColor: string;          // large circle arc behind coach
}

const SLOTS: SlotConfig[] = [
  {
    slot: "dawn",
    greeting: "Rise & Shine",
    sub: "The world starts fresh — so do you.",
    bgColor: "#1a0f2e",
    accentColor: "#F4845F",
    greetLabelColor: "#F4845F",
    arcColor: "#F4845F",
  },
  {
    slot: "morning",
    greeting: "Good Morning",
    sub: "Fuel up and crush it today.",
    bgColor: "#0d1b2a",
    accentColor: "#F7CB16",
    greetLabelColor: "#F7CB16",
    arcColor: "#2596BE",
  },
  {
    slot: "afternoon",
    greeting: "Good Afternoon",
    sub: "Every rep. Every choice.\nYou're building a stronger you.",
    bgColor: "#0f1923",
    accentColor: "#2596BE",
    greetLabelColor: "#2596BE",
    arcColor: "#2596BE",
  },
  {
    slot: "dusk",
    greeting: "Good Evening",
    sub: "How did your session go today?",
    bgColor: "#1a0f0a",
    accentColor: "#E87D3E",
    greetLabelColor: "#E87D3E",
    arcColor: "#E87D3E",
  },
  {
    slot: "evening",
    greeting: "Good Evening",
    sub: "Wind down and recover well.",
    bgColor: "#0a1628",
    accentColor: "#2596BE",
    greetLabelColor: "#2596BE",
    arcColor: "#2596BE",
  },
  {
    slot: "night",
    greeting: "Good Night",
    sub: "Rest hard — muscles grow while you sleep.",
    bgColor: "#050a14",
    accentColor: "#F7CB16",
    greetLabelColor: "#F7CB16",
    arcColor: "#3a5a8a",
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

// ─── Dot grid background overlay ─────────────────────────────────────────────

function DotPattern({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id="dots"
          x="0"
          y="0"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <Circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.07)" />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#dots)" />
    </Svg>
  );
}

// ─── Star field overlay for night time ───────────────────────────────────────

function StarField({ width, height }: { width: number; height: number }) {
  const stars = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      cx: ((i * 137 + 53) % 100),
      cy: ((i * 71 + 13) % 90),
      r: ((i * 17 + 5) % 3) * 0.4 + 0.6,
      opacity: ((i * 31 + 7) % 5) * 0.12 + 0.3,
    })), []);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="#FFFFFF" opacity={s.opacity} />
      ))}
    </Svg>
  );
}

// ─── Arc halo behind coach ────────────────────────────────────────────────────

function CoachArc({
  size,
  color,
  opacity = 0.35,
}: {
  size: number;
  color: string;
  opacity?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Outer glow ring */}
      <Circle
        cx={size}
        cy={size * 0.5}
        r={size * 0.72}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.13}
        strokeOpacity={opacity * 0.45}
      />
      {/* Inner ring */}
      <Circle
        cx={size}
        cy={size * 0.5}
        r={size * 0.52}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.07}
        strokeOpacity={opacity * 0.65}
      />
      {/* Filled centre glow */}
      <Circle
        cx={size}
        cy={size * 0.5}
        r={size * 0.38}
        fill={color}
        fillOpacity={opacity * 0.18}
      />
    </Svg>
  );
}

// ─── Coach badge pill ─────────────────────────────────────────────────────────

function CoachBadge({ accentColor }: { accentColor: string }) {
  return (
    <View style={[styles.coachBadge, { borderColor: `${accentColor}45` }]}>
      <View style={[styles.coachBadgeIcon, { backgroundColor: `${accentColor}30` }]}>
        <Ionicons name="star" size={scale(10)} color={accentColor} />
      </View>
      <View>
        <Text style={[styles.coachBadgeTitle, { color: accentColor }]}>
          Your Coach
        </Text>
        <Text style={styles.coachBadgeSub}>Here for your journey</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GreetingCardProps {
  firstName: string;
  fitnessGoal?: string;
}

const CARD_HEIGHT = vs(220);

export default function GreetingCard({ firstName, fitnessGoal }: GreetingCardProps) {
  const { colors, isDark } = useTheme();
  const hour = new Date().getHours();
  const config = useMemo(() => getSlot(hour), [hour]);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(20))).current;
  const coachSlide = useRef(new Animated.Value(scale(30))).current;
  const coachOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Coach slides in from right with a slight delay
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(coachSlide, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(coachOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const timeString = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Card width for sizing the arc
  const cardWidth = SW - scale(32); // assuming 16px margin each side

  return (
    <Animated.View
      style={[
        styles.card,
        {
          height: CARD_HEIGHT,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* ── Card background — tinted by time slot ── */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: config.bgColor, borderRadius: scale(22) }]} />

      {/* ── Dot pattern / Star field overlay ── */}
      {config.slot === "night" || config.slot === "evening" ? (
        <StarField width={cardWidth} height={CARD_HEIGHT} />
      ) : (
        <DotPattern width={cardWidth} height={CARD_HEIGHT} />
      )}

      {/* ── Right side: Arc halo + Coach image ── */}
      <Animated.View
        style={[
          styles.coachSide,
          {
            opacity: coachOpacity,
            transform: [{ translateX: coachSlide }],
          },
        ]}
        pointerEvents="none"
      >
        {/* Arc glow rings behind coach */}
        <CoachArc
          size={CARD_HEIGHT * 1.05}
          color={config.arcColor}
          opacity={0.45}
        />
        {/* Coach image — bleeds to top & right edges */}
        <Image
          source={coachImage}
          style={[styles.coachImage, { height: CARD_HEIGHT * 1.08 }]}
          resizeMode="contain"
        />
      
      </Animated.View>

      {/* ── Left side: text content ── */}
      <View style={styles.contentLeft}>
        {/* Greeting label — small caps, accent colour */}
        <Text
          style={[
            styles.greetLabel,
            { color: isDark ? colors.primary : config.greetLabelColor },
          ]}
        >
          {config.greeting.toUpperCase()}
        </Text>

        {/* Name — massive white bold */}
        <Text
          style={[
            styles.name,
            { color: isDark ? colors.text : "#FFFFFF" },
          ]}
          numberOfLines={1}
        >
          {firstName} 👋
        </Text>

        {/* Sub text */}
        <Text
          style={[
            styles.sub,
            { color: isDark ? colors.textMuted : "rgba(255,255,255,0.68)" },
          ]}
        >
          {config.sub}
        </Text>

        {/* Spacer pushes time to bottom */}
        <View style={{ flex: 1 }} />

        {/* Time — clock icon + time string, accent colour */}
        <View style={styles.timeRow}>
          <Ionicons
            name="time-outline"
            size={scale(13)}
            color={isDark ? colors.primary : config.accentColor}
            style={{ marginRight: scale(4) }}
          />
          <Text
            style={[
              styles.timeText,
              { color: isDark ? colors.primary : config.accentColor },
            ]}
          >
            {timeString}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(22),
    marginBottom: vs(20),
    overflow: "hidden",
    flexDirection: "row",
    // Border: very subtle blue-ish rim matching the dark navy card
    borderWidth: 1,
    borderColor: "rgba(37,150,190,0.22)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Left text column ──────────────────────────────────────────────────────
  contentLeft: {
    flex: 1,
    paddingLeft: scale(20),
    paddingRight: scale(140),
    paddingTop: vs(18),
    paddingBottom: vs(16),
    zIndex: 3,
  },

  greetLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
    letterSpacing: 2.4,
    marginBottom: vs(2),
  },

  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(34),
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: scale(40),
    marginBottom: vs(6),
  },

  sub: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    lineHeight: scale(19),
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(13),
    letterSpacing: 0.2,
  },

  // ── Right coach column ────────────────────────────────────────────────────
  coachSide: {
    width: scale(220),
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    zIndex: 2,
    overflow: "hidden",
  },

  coachImage: {
    position: "absolute",
    right: scale(-20),
    bottom: vs(-50),
    width: scale(220),
    height: vs(320),
    resizeMode: "contain",
    zIndex: 1,
  },

  // ── Coach badge pill ──────────────────────────────────────────────────────
  coachBadge: {
    position: "absolute",
    bottom: vs(12),
    right: scale(10),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: scale(20),
    borderWidth: 1,
    paddingHorizontal: scale(10),
    paddingVertical: vs(5),
    zIndex: 5,
  },

  coachBadgeIcon: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: "center",
    justifyContent: "center",
  },

  coachBadgeTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
    lineHeight: scale(14),
  },

  coachBadgeSub: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.55)",
    lineHeight: scale(13),
  },
});