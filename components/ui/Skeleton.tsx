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
      <View style={[s.greetingCard, { backgroundColor: colors.inputBg }]}>
        <View style={{ gap: 8 }}>
          <Skeleton width={80} height={12} borderRadius={6} />
          <Skeleton width={180} height={28} borderRadius={8} />
          <Skeleton width={140} height={14} borderRadius={6} />
          <Skeleton width={100} height={22} borderRadius={12} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: scale(8), marginBottom: vs(24), marginTop: vs(12) }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.statCard, { backgroundColor: colors.inputBg }]}>
            <Skeleton width={36} height={36} borderRadius={12} />
            <Skeleton width={40} height={16} borderRadius={6} />
            <Skeleton width={50} height={10} borderRadius={5} />
          </View>
        ))}
      </View>

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

      <Skeleton width={130} height={18} borderRadius={6} style={{ marginBottom: vs(12) }} />
      <View style={[s.bodyCard, { backgroundColor: colors.inputBg }]}>
        <Skeleton width={200} height={16} borderRadius={6} />
        <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 12 }} />
      </View>

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

export function DailySkeleton() {
  const { colors } = useTheme();
  const cardW = (SCREEN_W - 52) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: scale(16), paddingTop: vs(12) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: vs(16) }}>
        <View style={{ gap: 6 }}>
          <Skeleton width={120} height={26} borderRadius={8} />
          <Skeleton width={80} height={12} borderRadius={6} />
        </View>
        <Skeleton width={56} height={56} borderRadius={16} />
      </View>

      <Skeleton width="100%" height={50} borderRadius={14} style={{ marginBottom: vs(16) }} />

      <Skeleton width={120} height={18} borderRadius={6} style={{ marginBottom: vs(10) }} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ width: cardW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
            <Skeleton width={100} height={18} borderRadius={6} />
            <Skeleton width={60} height={12} borderRadius={6} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Skeleton width={70} height={14} borderRadius={6} />
              <Skeleton width={50} height={14} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>

      <Skeleton width={140} height={18} borderRadius={6} style={{ marginVertical: vs(12) }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={44} height={44} borderRadius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={120} height={16} borderRadius={6} />
            <Skeleton width={80} height={12} borderRadius={6} />
          </View>
          <Skeleton width={60} height={16} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

export function SplitsSkeleton() {
  const { colors } = useTheme();
  const cardW = (SCREEN_W - 52) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: scale(16), paddingTop: vs(12) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: vs(16) }}>
        <View style={{ gap: 6 }}>
          <Skeleton width={140} height={26} borderRadius={8} />
          <Skeleton width={100} height={12} borderRadius={6} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Skeleton width={44} height={44} borderRadius={14} />
          <Skeleton width={44} height={44} borderRadius={14} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ width: cardW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
            <Skeleton width={90} height={18} borderRadius={6} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Skeleton width={70} height={14} borderRadius={6} />
              <Skeleton width={60} height={14} borderRadius={6} />
            </View>
            <Skeleton width={50} height={50} borderRadius={10} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function LeaderboardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: scale(16), paddingTop: vs(12) }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: vs(16) }}>
          <View style={{ gap: 6 }}>
            <Skeleton width={160} height={26} borderRadius={8} />
            <Skeleton width={100} height={12} borderRadius={6} />
          </View>
          <Skeleton width={46} height={46} borderRadius={14} />
        </View>

        <Skeleton width="100%" height={80} borderRadius={16} style={{ marginBottom: vs(16) }} />
        <Skeleton width="100%" height={30} borderRadius={10} style={{ marginBottom: vs(20) }} />

        <View style={{ flexDirection: "row", gap: 10, marginBottom: vs(20) }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 16, padding: 12, alignItems: "center", gap: 6 }}>
              <Skeleton width={36} height={36} borderRadius={18} />
              <Skeleton width={40} height={12} borderRadius={6} />
              <Skeleton width={30} height={10} borderRadius={5} />
            </View>
          ))}
        </View>

        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Skeleton width={24} height={16} borderRadius={6} />
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={100} height={14} borderRadius={6} />
              <Skeleton width={60} height={10} borderRadius={5} />
            </View>
            <Skeleton width={50} height={14} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <ScrollSkeleton colors={colors} />
  );
}

function ScrollSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ alignItems: "center", paddingVertical: 40, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 20 }}>
        <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 16 }} />
        <Skeleton width={160} height={28} borderRadius={8} style={{ marginBottom: 4 }} />
        <Skeleton width={130} height={14} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width={80} height={20} borderRadius={10} style={{ marginBottom: 12 }} />
        <Skeleton width={200} height={24} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {[0, 1, 2, 3].map((section) => (
          <View key={section} style={{ marginBottom: 24 }}>
            <Skeleton width={140} height={16} borderRadius={6} style={{ marginBottom: 10 }} />
            <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 4 }}>
              {[0, 1, 2, 3].map((row) => (
                <View key={row} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: row < 3 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                  <Skeleton width={80} height={14} borderRadius={6} />
                  <Skeleton width={60} height={14} borderRadius={6} />
                </View>
              ))}
            </View>
          </View>
        ))}

        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 16, gap: 16 }}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={120} height={16} borderRadius={6} />
              <Skeleton width={160} height={12} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function NewWorkoutSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={120} height={20} borderRadius={6} />
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <View style={{ backgroundColor: colors.inputBg, borderRadius: 24, padding: 20, marginBottom: 20, gap: 8 }}>
          <Skeleton width={100} height={14} borderRadius={6} />
          <Skeleton width={160} height={24} borderRadius={8} />
          <Skeleton width={120} height={14} borderRadius={6} />
        </View>

        <Skeleton width={120} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ backgroundColor: colors.inputBg, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={120} height={16} borderRadius={6} />
              <Skeleton width={80} height={12} borderRadius={6} />
            </View>
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ActiveWorkoutSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={80} height={20} borderRadius={6} />
        <Skeleton width={60} height={32} borderRadius={10} />
      </View>

      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: scale(16), marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={(SCREEN_W - 56) / 3} height={36} borderRadius={12} />
        ))}
      </View>

      <View style={{ paddingHorizontal: scale(16), marginBottom: 16 }}>
        <Skeleton width={160} height={20} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={12} borderRadius={6} />
      </View>

      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginHorizontal: scale(16), marginBottom: 12, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Skeleton width={44} height={44} borderRadius={10} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={140} height={16} borderRadius={6} />
              <Skeleton width={80} height={12} borderRadius={6} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} width={(SCREEN_W - 80) / 4} height={28} borderRadius={8} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function ViewSessionSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={120} height={20} borderRadius={6} />
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width={100} height={130} borderRadius={16} />
          ))}
        </View>

        <Skeleton width={180} height={24} borderRadius={8} style={{ marginBottom: 4 }} />
        <Skeleton width={140} height={12} borderRadius={6} style={{ marginBottom: 16 }} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: (SCREEN_W - 52) / 2, backgroundColor: colors.inputBg, borderRadius: 24, padding: 16, gap: 10 }}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <Skeleton width={60} height={12} borderRadius={6} />
              <Skeleton width={80} height={20} borderRadius={6} />
              <Skeleton width={100} height={12} borderRadius={6} />
            </View>
          ))}
        </View>

        <Skeleton width={150} height={18} borderRadius={6} style={{ marginVertical: 16 }} />
        {[0, 1].map((i) => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={10} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={120} height={16} borderRadius={6} />
                <Skeleton width={80} height={12} borderRadius={6} />
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} width={(SCREEN_W - 80) / 4} height={36} borderRadius={10} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CompleteSkeleton() {
  const { colors } = useTheme();
  const halfW = (SCREEN_W - scale(32) - scale(12)) / 2;
  const fullW = SCREEN_W - scale(32);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero */}
      <View style={{ backgroundColor: colors.inputBg, paddingVertical: 40, alignItems: "center", borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 16 }}>
        <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 14 }} />
        <Skeleton width={220} height={30} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={180} height={14} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={100} height={24} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {/* Section Label */}
        <Skeleton width={140} height={18} borderRadius={6} style={{ marginBottom: 10 }} />

        {/* Bento Grid — mixed sizes */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: scale(12), marginBottom: 16 }}>
          {/* 2 half tiles */}
          {[0, 1].map((i) => (
            <View key={`h${i}`} style={{ width: halfW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 14, gap: 8 }}>
              <Skeleton width={34} height={34} borderRadius={10} />
              <Skeleton width={50} height={10} borderRadius={5} />
              <Skeleton width={70} height={22} borderRadius={6} />
              <Skeleton width={55} height={10} borderRadius={5} />
            </View>
          ))}
          {/* 1 full-width tile */}
          <View style={{ width: fullW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 14, gap: 8 }}>
            <Skeleton width={34} height={34} borderRadius={10} />
            <Skeleton width={60} height={10} borderRadius={5} />
            <Skeleton width={120} height={24} borderRadius={6} />
            <Skeleton width={80} height={10} borderRadius={5} />
          </View>
          {/* 2 more half tiles */}
          {[0, 1].map((i) => (
            <View key={`h2${i}`} style={{ width: halfW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 14, gap: 8 }}>
              <Skeleton width={34} height={34} borderRadius={10} />
              <Skeleton width={50} height={10} borderRadius={5} />
              <Skeleton width={60} height={22} borderRadius={6} />
              <Skeleton width={50} height={10} borderRadius={5} />
            </View>
          ))}
          {/* 1 full-width tile */}
          <View style={{ width: fullW, backgroundColor: colors.inputBg, borderRadius: 20, padding: 14, gap: 8 }}>
            <Skeleton width={34} height={34} borderRadius={10} />
            <Skeleton width={70} height={10} borderRadius={5} />
            <Skeleton width={90} height={24} borderRadius={6} />
            <Skeleton width={80} height={10} borderRadius={5} />
          </View>
        </View>

        {/* Exercises section label */}
        <Skeleton width={100} height={18} borderRadius={6} style={{ marginBottom: 10 }} />

        {/* Horizontal mini cards */}
        <View style={{ flexDirection: "row", gap: scale(10), marginBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: scale(120), backgroundColor: colors.inputBg, borderRadius: 16, padding: 10, gap: 6 }}>
              <Skeleton width={44} height={44} borderRadius={10} />
              <Skeleton width={80} height={12} borderRadius={6} />
              <Skeleton width={50} height={16} borderRadius={6} />
            </View>
          ))}
        </View>

        {/* Weight card */}
        <View style={{ backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, gap: 10, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={38} height={38} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={140} height={14} borderRadius={6} />
              <Skeleton width={180} height={10} borderRadius={5} />
            </View>
          </View>
          <Skeleton width="100%" height={52} borderRadius={14} />
        </View>

        {/* Photo section */}
        <View style={{ backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={38} height={38} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={110} height={14} borderRadius={6} />
              <Skeleton width={130} height={10} borderRadius={5} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: scale(8) }}>
            <Skeleton width={90} height={120} borderRadius={14} />
            <Skeleton width={90} height={120} borderRadius={14} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function TemplatesSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ gap: 4 }}>
          <Skeleton width={120} height={22} borderRadius={8} />
          <Skeleton width={90} height={12} borderRadius={6} />
        </View>
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <View style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Skeleton width={20} height={20} borderRadius={6} />
          <Skeleton width={200} height={12} borderRadius={6} />
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={80} height={32} borderRadius={12} />
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: (SCREEN_W - 52) / 2, backgroundColor: colors.inputBg, borderRadius: 20, padding: 16, gap: 10 }}>
              <Skeleton width={36} height={36} borderRadius={12} />
              <Skeleton width={100} height={18} borderRadius={6} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Skeleton width={60} height={14} borderRadius={6} />
                <Skeleton width={60} height={14} borderRadius={6} />
              </View>
              <Skeleton width={50} height={50} borderRadius={10} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function SplitDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={{ gap: 4 }}>
            <Skeleton width={120} height={20} borderRadius={6} />
            <Skeleton width={80} height={12} borderRadius={6} />
          </View>
        </View>
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton width={50} height={50} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={120} height={16} borderRadius={6} />
              <Skeleton width={80} height={12} borderRadius={6} />
            </View>
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function SessionDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={{ gap: 4 }}>
            <Skeleton width={140} height={20} borderRadius={6} />
            <Skeleton width={100} height={12} borderRadius={6} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={10} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={140} height={16} borderRadius={6} />
                <Skeleton width={90} height={12} borderRadius={6} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2, 3].map((j) => (
                <View key={j} style={{ flex: 1, gap: 2, backgroundColor: colors.inputBg, borderRadius: 10, padding: 8, alignItems: "center" }}>
                  <Skeleton width={24} height={10} borderRadius={5} />
                  <Skeleton width={30} height={16} borderRadius={6} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AddExercisesSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={120} height={20} borderRadius={6} />
        <Skeleton width={40} height={40} borderRadius={12} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <Skeleton width="100%" height={44} borderRadius={12} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={70} height={30} borderRadius={12} />
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: (SCREEN_W - 52) / 2, backgroundColor: colors.inputBg, borderRadius: 16, padding: 12, gap: 8 }}>
              <Skeleton width="100%" height={80} borderRadius={10} />
              <Skeleton width={100} height={14} borderRadius={6} />
              <Skeleton width={80} height={12} borderRadius={6} />
              <Skeleton width={40} height={24} borderRadius={8} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function ExerciseDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8, gap: 12 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={200} height={22} borderRadius={8} />
      </View>

      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <Skeleton width={SCREEN_W - 32} height={200} borderRadius={16} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {[0, 1].map((i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 16, padding: 14, gap: 6 }}>
              <Skeleton width={80} height={12} borderRadius={6} />
              <Skeleton width={120} height={16} borderRadius={6} />
              <Skeleton width={90} height={14} borderRadius={6} />
            </View>
          ))}
        </View>

        <Skeleton width={100} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width="100%" height={14} borderRadius={6} />
              <Skeleton width="80%" height={14} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function WorkoutSplitSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={{ gap: 4 }}>
            <Skeleton width={140} height={20} borderRadius={6} />
            <Skeleton width={100} height={12} borderRadius={6} />
          </View>
        </View>
        <Skeleton width={32} height={32} borderRadius={8} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Skeleton width={44} height={44} borderRadius={10} />
              <View style={{ flex: 1, gap: 4 }}>
                <Skeleton width={140} height={16} borderRadius={6} />
                <Skeleton width={80} height={12} borderRadius={6} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((j) => (
                <View key={j} style={{ flex: 1, backgroundColor: colors.inputBg, borderRadius: 10, padding: 8, alignItems: "center", gap: 2 }}>
                  <Skeleton width={28} height={10} borderRadius={5} />
                  <Skeleton width={36} height={16} borderRadius={6} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={100} height={20} borderRadius={6} />
        </View>
        <Skeleton width={80} height={32} borderRadius={10} />
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        {[0, 1, 2, 3, 4].map((section) => (
          <View key={section} style={{ marginBottom: 24 }}>
            <Skeleton width={140} height={16} borderRadius={6} style={{ marginBottom: 10 }} />
            <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[0, 1, 2, 3].map((row) => (
                  <View key={row} style={{ width: (SCREEN_W - 72) / 2, gap: 4 }}>
                    <Skeleton width={60} height={12} borderRadius={6} />
                    <Skeleton width={80} height={16} borderRadius={6} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function UserProfileSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingTop: vs(12), paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={140} height={20} borderRadius={6} />
        </View>
      </View>

      <View style={{ marginHorizontal: scale(16), marginTop: 8, backgroundColor: colors.card, borderRadius: 24, padding: 20, alignItems: "center", gap: 10 }}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width={140} height={22} borderRadius={8} />
        <Skeleton width={100} height={16} borderRadius={8} />
        <Skeleton width={160} height={14} borderRadius={6} />
        <Skeleton width={180} height={24} borderRadius={12} />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginHorizontal: scale(16), marginTop: 16, marginBottom: 20 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 6 }}>
            <Skeleton width={30} height={30} borderRadius={8} />
            <Skeleton width={40} height={20} borderRadius={6} />
            <Skeleton width={80} height={12} borderRadius={6} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: scale(16) }}>
        <Skeleton width={120} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
        {[0, 1].map((i) => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10, flexDirection: "row", gap: 10 }}>
            <Skeleton width={44} height={44} borderRadius={8} />
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width={100} height={14} borderRadius={6} />
              <Skeleton width={160} height={12} borderRadius={6} />
            </View>
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
