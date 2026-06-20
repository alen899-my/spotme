import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  ImageBackground,
} from "react-native";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

const coachImage = require("../../assets/coach/fit-cartoon-character-training.png");

const timeImages: Record<string, any> = {
  morning:   require("../../assets/time/mrng.png"),
  afternoon: require("../../assets/time/noon.png"),
  evening:   require("../../assets/time/evening.png"),
  night:     require("../../assets/time/night.png"),
};

type TimeSlot = "morning" | "afternoon" | "evening" | "night";

interface SlotConfig {
  greeting: string;
  emoji: string;
  sub: string;
  accent: string;
}

const SLOTS: Record<TimeSlot, SlotConfig> = {
  morning: {
    greeting: "Good morning,",
    emoji: "☀️",
    sub: "Fuel up and crush it today.",
    accent: "#F7CB16",
  },
  afternoon: {
    greeting: "Good afternoon,",
    emoji: "🌤️",
    sub: "Keep pushing through the day.",
    accent: "#2596BE",
  },
  evening: {
    greeting: "Good evening,",
    emoji: "🌅",
    sub: "Wind down and recover well.",
    accent: "#E87D3E",
  },
  night: {
    greeting: "Good night,",
    emoji: "🌙",
    sub: "Rest hard while you sleep.",
    accent: "#7C5CBF",
  },
};

function getSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

interface GreetingCardProps {
  firstName: string;
}

const CARD_HEIGHT = vs(120);

export default function GreetingCard({ firstName }: GreetingCardProps) {
  const { isDark } = useTheme();
  const hour = new Date().getHours();
  const slot = useMemo(() => getSlot(hour), [hour]);
  const config = SLOTS[slot];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(16))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: isDark
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <ImageBackground
        source={timeImages[slot]}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        imageStyle={{ borderRadius: scale(20) }}
      />
      <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />

      <Image
        source={coachImage}
        style={styles.coachImage}
        resizeMode="contain"
      />

      <View style={styles.content}>
        <View style={styles.greetingGroup}>
          <Text
            style={[styles.greeting, { color: config.accent }]}
            numberOfLines={1}
          >
            {config.greeting}
          </Text>
          <Text
            style={[
              styles.name,
              { color: isDark ? "#FFFFFF" : "#0F1923" },
            ]}
            numberOfLines={1}
          >
            {firstName}
          </Text>
        </View>

        <Text
          style={[
            styles.sub,
            {
              color: isDark
                ? "rgba(255,255,255,0.55)"
                : "rgba(0,0,0,0.45)",
            },
          ]}
          numberOfLines={2}
        >
          {config.sub}
        </Text>
      </View>
    </Animated.View>
  );
}

const IMG_W = scale(100);

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: scale(20),
    marginBottom: vs(20),
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  imageOverlay: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: scale(20),
    paddingRight: scale(110),
    gap: vs(6),
  },
  greetingGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: scale(4),
  },
  greeting: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(15),
    letterSpacing: 0.3,
  },
  name: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    lineHeight: scale(17),
  },
  coachImage: {
    position: "absolute",
    right: scale(8),
    top: 0,
    width: IMG_W,
    height: CARD_HEIGHT,
    zIndex: 1,
  },
});
