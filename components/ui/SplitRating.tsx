import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  avgRating?: number;
  ratingCount?: number;
  userRating?: number | null;
  canRate?: boolean;
  onRate?: (rating: number) => Promise<void>;
  size?: "sm" | "md" | "lg";
}

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 12;

const TIER_COLORS = {
  1: "#EF4444",
  2: "#F97316",
  3: "#F59E0B",
  4: "#EAB308",
  5: "#84CC16",
  6: "#22C55E",
  7: "#10B981",
  8: "#06B6D4",
  9: "#3B82F6",
  10: "#8B5CF6",
};

const BADGE_COLORS = {
  1: "#450A0A",
  2: "#7C2D12",
  3: "#713F12",
  4: "#422006",
  5: "#052E16",
  6: "#052E16",
  7: "#064E3B",
  8: "#083344",
  9: "#172554",
  10: "#2E1065",
};

const TIER_LABELS: Record<number, string> = {
  1: "TRASH",
  2: "POOR",
  3: "MEH",
  4: "OK",
  5: "DECENT",
  6: "GOOD",
  7: "SOLID",
  8: "GREAT",
  9: "ELITE",
  10: "GODLY",
};

export default function SplitRating({
  avgRating = 0,
  ratingCount = 0,
  userRating,
  canRate = false,
  onRate,
  size = "md",
}: Props) {
  const { colors, isDark } = useTheme();

  const [barWidth, setBarWidth] = useState(0);
  const [commitCount, setCommitCount] = useState(0);

  const sliderRef = useRef<number>(userRating ?? 0);
  const prevValRef = useRef<number>(userRating ?? 0);
  const hasRatedRef = useRef<boolean>(!!userRating);
  const barLayoutRef = useRef({ x: 0, y: 0, width: 0 });
  const initialised = useRef(false);

  const fillAnim = useRef(new Animated.Value(0)).current;
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const valueFlash = useRef(new Animated.Value(0)).current;

  const displayedRating = userRating ?? sliderRef.current ?? 0;
  const currentColor = TIER_COLORS[displayedRating as keyof typeof TIER_COLORS] || colors.primary;
  const currentBadge = BADGE_COLORS[displayedRating as keyof typeof BADGE_COLORS] || "#000";
  const currentLabel = TIER_LABELS[displayedRating as keyof typeof TIER_LABELS] || "";

  const textSize = size === "sm" ? 10 : size === "lg" ? 13 : 12;
  const starSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  const valToX = useCallback(
    (val: number) => {
      if (barWidth === 0) return 0;
      return ((val - 1) / 9) * barWidth;
    },
    [barWidth]
  );

  const xToVal = useCallback(
    (x: number) => {
      const w = barWidth || barLayoutRef.current.width || 1;
      const clamped = Math.max(0, Math.min(w, x));
      return Math.round(1 + (clamped / w) * 9);
    },
    [barWidth]
  );

  const snapTo = useCallback(
    (v: number, animated = false) => {
      const x = valToX(v);
      if (animated) {
        Animated.spring(fillAnim, {
          toValue: x,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
        Animated.spring(thumbAnim, {
          toValue: x - THUMB_SIZE / 2,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      } else {
        fillAnim.setValue(x);
        thumbAnim.setValue(x - THUMB_SIZE / 2);
      }
    },
    [valToX, fillAnim, thumbAnim]
  );

  const snapToValue = useCallback(
    (v: number) => {
      sliderRef.current = v;
      snapTo(v);
      const x = valToX(v);
      fillAnim.setValue(x);
      thumbAnim.setValue(x - THUMB_SIZE / 2);

      if (v !== prevValRef.current) {
        prevValRef.current = v;
        valueFlash.setValue(1);
        Animated.timing(valueFlash, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
    [valToX, fillAnim, thumbAnim, valueFlash]
  );

  const handleRate = useCallback(
    async (value: number) => {
      if (!canRate || !onRate) return;
      try {
        await onRate(value);
        hasRatedRef.current = true;
      } catch {
        /* silent */
      }
    },
    [canRate, onRate]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canRate,
        onMoveShouldSetPanResponder: () => canRate,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const v = xToVal(x);
          snapToValue(v);
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const v = xToVal(x);
          sliderRef.current = v;
          const px = valToX(v);
          fillAnim.setValue(px);
          thumbAnim.setValue(px - THUMB_SIZE / 2);

          if (v !== prevValRef.current) {
            prevValRef.current = v;
            valueFlash.setValue(1);
            Animated.timing(valueFlash, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderRelease: () => {
          const v = sliderRef.current;
          const x = valToX(v);
          fillAnim.setValue(x);
          thumbAnim.setValue(x - THUMB_SIZE / 2);
          if (v > 0 && v !== (userRating ?? 0)) {
            handleRate(v);
          }
        },
        onPanResponderTerminate: () => {
          const v = sliderRef.current;
          snapTo(v);
        },
      }),
    [canRate, xToVal, valToX, snapToValue, fillAnim, thumbAnim, valueFlash, userRating, handleRate, snapTo]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, x } = e.nativeEvent.layout;
    barLayoutRef.current = { x, y: 0, width };
    setBarWidth(width);
  };

  const initX = valToX(displayedRating);
  if (!initialised.current && initX > 0) {
    initialised.current = true;
    fillAnim.setValue(initX);
    thumbAnim.setValue(initX - THUMB_SIZE / 2);
  }

  const flashBg = valueFlash.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,0.15)"],
  });

  return (
    <View style={styles.wrap}>
      {/* ── Display row ── */}
      <View style={styles.row}>
        <Ionicons name="star" size={starSize} color="#FFB800" />
        <Text
          style={[styles.avg, { fontSize: starSize + 2, color: colors.text }]}
        >
          {Number(avgRating) > 0 ? Number(avgRating).toFixed(1) : "—"}
        </Text>
        {ratingCount > 0 && (
          <Text
            style={[
              styles.count,
              { fontSize: textSize, color: colors.textMuted },
            ]}
          >
            ({ratingCount})
          </Text>
        )}
        {userRating && userRating > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: (TIER_COLORS[userRating as keyof typeof TIER_COLORS] || colors.primary) + "20" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: TIER_COLORS[userRating as keyof typeof TIER_COLORS] || colors.primary,
                  fontSize: textSize - 1,
                },
              ]}
            >
              Your: {userRating}/10
            </Text>
          </View>
        )}
      </View>

      {/* ── Interactive pill slider ── */}
      {canRate && (
        <View style={styles.sliderWrap}>
          {/* Value badge */}
          <View
            style={[
              styles.valuePill,
              {
                backgroundColor: currentBadge,
                borderColor: currentColor,
              },
            ]}
          >
            <Text
              style={[styles.valueText, { color: currentColor }]}
            >
              {displayedRating}
            </Text>
            <Text style={[styles.valueLabel, { color: currentColor }]}>
              {currentLabel}
            </Text>
          </View>

          {/* Track + thumb */}
          <View
            style={styles.trackWrapper}
            onLayout={handleLayout}
            {...panResponder.panHandlers}
          >
            {/* Background track */}
            <View
              style={[
                styles.trackBg,
                {
                  height: TRACK_HEIGHT,
                  borderRadius: TRACK_HEIGHT / 2,
                  backgroundColor: isDark ? "#252525" : "#E5E5EA",
                },
              ]}
            >
              {/* Filled portion */}
              <Animated.View
                style={[
                  styles.trackFill,
                  {
                    height: TRACK_HEIGHT,
                    borderRadius: TRACK_HEIGHT / 2,
                    backgroundColor: currentColor,
                    width: fillAnim,
                  },
                ]}
              />
            </View>

            {/* Thumb */}
            <Animated.View
              style={[
                styles.thumb,
                {
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: "#FFF",
                  borderColor: currentColor,
                  transform: [{ translateX: thumbAnim }],
                  top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
                  ...Platform.select({
                    ios: {
                      shadowColor: currentColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    },
                    android: {
                      elevation: 6,
                    },
                  }),
                },
              ]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: THUMB_SIZE / 2,
                    backgroundColor: flashBg,
                  },
                ]}
              />
            </Animated.View>

            {/* Tick marks */}
            {[2, 4, 6, 8].map((tick) => {
              const left = valToX(tick);
              return (
                <View
                  key={tick}
                  style={[
                    styles.tick,
                    {
                      left: left - 1,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)",
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Range labels */}
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeNum, { color: colors.textMuted }]}>
              1
            </Text>
            {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <Text
                key={n}
                style={[
                  styles.rangeNum,
                  {
                    color:
                      n <= displayedRating && canRate
                        ? currentColor
                        : colors.textMuted,
                    opacity: n <= displayedRating && canRate ? 0.6 : 0.3,
                  },
                ]}
              >
                {n}
              </Text>
            ))}
            <Text style={[styles.rangeNum, { color: colors.textMuted }]}>
              10
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  avg: {
    fontFamily: FONTS.bodyBold,
  },
  count: {
    fontFamily: FONTS.body,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
  },
  sliderWrap: {
    gap: 6,
    alignItems: "center",
  },
  valuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 2,
  },
  valueText: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    lineHeight: 32,
  },
  valueLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    opacity: 0.8,
  },
  trackWrapper: {
    position: "relative",
    width: "100%",
    height: THUMB_SIZE,
    justifyContent: "center",
  },
  trackBg: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  thumb: {
    position: "absolute",
    left: 0,
    borderWidth: 3,
    zIndex: 10,
  },
  tick: {
    position: "absolute",
    width: 2,
    height: 6,
    borderRadius: 1,
    top: (THUMB_SIZE - 6) / 2,
    zIndex: 0,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 2,
  },
  rangeNum: {
    fontFamily: FONTS.body,
    fontSize: 9,
    width: 20,
    textAlign: "center",
  },
});
