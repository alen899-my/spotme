import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { scale, vs } from "../../constants/homeTheme";

const { width: SCREEN_W } = Dimensions.get("window");

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export default function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const translateX = useRef(new Animated.Value(-SCREEN_W)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: SCREEN_W,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const baseColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const shimmerColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

  return (
    <View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", shimmerColor, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function HomeSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: scale(16), paddingTop: vs(12) }}>
      {/* Greeting card skeleton */}
      <View style={[s.greetingCard, { backgroundColor: colors.inputBg }]}>
        <View style={{ gap: 8 }}>
          <Skeleton width={80} height={12} borderRadius={6} />
          <Skeleton width={180} height={28} borderRadius={8} />
          <Skeleton width={140} height={14} borderRadius={6} />
          <Skeleton width={100} height={22} borderRadius={12} />
        </View>
      </View>

      {/* Stats row skeleton */}
      <View style={{ flexDirection: "row", gap: scale(8), marginBottom: vs(24), marginTop: vs(12) }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.statCard, { backgroundColor: colors.inputBg }]}>
            <Skeleton width={36} height={36} borderRadius={12} />
            <Skeleton width={40} height={16} borderRadius={6} />
            <Skeleton width={50} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Exercise to Try skeleton */}
      <Skeleton width={140} height={18} borderRadius={6} style={{ marginBottom: vs(12) }} />
      <View style={[s.exerciseCard, { backgroundColor: colors.inputBg }]}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={100} height={14} borderRadius={6} />
            <Skeleton width={160} height={22} borderRadius={8} />
            <Skeleton width={80} height={12} borderRadius={6} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Skeleton width={60} height={20} borderRadius={8} />
              <Skeleton width={60} height={20} borderRadius={8} />
            </View>
          </View>
          <Skeleton width={82} height={82} borderRadius={14} />
        </View>
      </View>

      {/* Body Status skeleton */}
      <Skeleton width={130} height={18} borderRadius={6} style={{ marginBottom: vs(12) }} />
      <View style={[s.bodyCard, { backgroundColor: colors.inputBg }]}>
        <Skeleton width={200} height={16} borderRadius={6} />
        <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 12 }} />
      </View>

      {/* Weekly Activity skeleton */}
      <Skeleton width={150} height={18} borderRadius={6} style={{ marginBottom: vs(12) }} />
      <View style={{ flexDirection: "row", gap: scale(8) }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ alignItems: "center", gap: 4 }}>
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width={20} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  greetingCard: {
    borderRadius: scale(22),
    padding: scale(20),
    marginBottom: vs(20),
    gap: vs(12),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(16),
    padding: scale(10),
    alignItems: "center",
    gap: vs(5),
  },
  exerciseCard: {
    borderRadius: scale(20),
    padding: scale(18),
    marginBottom: vs(20),
  },
  bodyCard: {
    borderRadius: scale(20),
    padding: scale(18),
    marginBottom: vs(20),
  },
});
