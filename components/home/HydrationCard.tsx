import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";



// ── Theme Palette ────────────────────────────────────────────────────────────
const C = {
  cardBg:      "#2596BE",
  iconBg:      "#1a6e8a",
  sun:         "#F7CB16",
  ink:         "#04282B",
  white:       "#FFFFFF",
  lightText:   "#a8dff0",
  lightBorder: "rgba(255,255,255,0.15)",
  fillBg:      "rgba(255,255,255,0.12)",
  liquidBlue:  "#4DC3F7",
  liquidDeep:  "#0D4D65",
};

interface Props {
  waterMl: number;
  onLogWaterPress: () => void;
  onWaterLogged?: (amount: number) => void;
}

// ── Water Target Logic (Consistent with WaterTracker) ────────────────────────
function getWaterTarget(userData: any): { target: number; maxSafe: number } {
  const weight = parseFloat((userData?.weight || "70").toString().replace(/[^0-9.]/g, "")) || 70;
  let target = Math.round(weight * 35);
  const lvl = (userData?.activity_level || "").toLowerCase();
  if (lvl.includes("very") || lvl.includes("high") || lvl.includes("extreme")) target += 750;
  else if (lvl.includes("moderate")) target += 400;
  else if (lvl.includes("light")) target += 200;
  return { target, maxSafe: Math.round(target * 1.6) };
}

export default function HydrationCard({ waterMl, onLogWaterPress, onWaterLogged }: Props) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [totalWater, setTotalWater] = useState(waterMl);
  const [target, setTarget] = useState(2500);
  const [maxSafe, setMaxSafe] = useState(4000);
  const [loggingAmount, setLoggingAmount] = useState<number | null>(null);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fillAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim  = useRef(new Animated.Value(0)).current;

  // Load user data for custom water targets
  useEffect(() => {
    AsyncStorage.getItem("userData").then((d) => {
      if (d) {
        const uData = JSON.parse(d);
        const computed = getWaterTarget(uData);
        setTarget(computed.target);
        setMaxSafe(computed.maxSafe);
      }
    });
  }, []);

  // Update internal total water when props change
  useEffect(() => {
    setTotalWater(waterMl);
  }, [waterMl]);

  // Animate the fill level whenever total water or target changes
  useEffect(() => {
    const pct = Math.min((totalWater || 0) / target, 1.0);
    Animated.spring(fillAnim, {
      toValue: pct,
      useNativeDriver: true,
      friction: 8,
      tension: 30,
    }).start();
  }, [totalWater, target]);

  // Continuous wave translation loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [waveAnim]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleQuickLog = async (amount: number) => {
    if (loggingAmount !== null) return;
    setLoggingAmount(amount);

    // Bounce animation on click
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/water`,
        { amount_ml: amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newTotal = totalWater + amount;
      setTotalWater(newTotal);

      if (newTotal > maxSafe) {
        showToast("Logged! Overhydration warning.", "error");
      } else {
        showToast(`+${amount}ml logged!`);
      }

      if (onWaterLogged) {
        onWaterLogged(amount);
      }
    } catch (err) {
      showToast("Failed to log water", "error");
    } finally {
      setLoggingAmount(null);
    }
  };

  const isOverLimit = totalWater > maxSafe;
  const liquidColor = isOverLimit ? "#EF4444" : (isDark ? colors.primary : C.liquidBlue);
  const frameBorderColor = isOverLimit ? "#EF4444" : (isDark ? colors.border : "rgba(255,255,255,0.3)");
  const badgeBg = isOverLimit ? "#EF4444" : (isDark ? "#1A1A1A" : C.iconBg);
  const badgeTxtColor = isOverLimit ? "#FFFFFF" : C.sun;

  const waterPct = Math.min((totalWater || 0) / target, 1);
  const pctLabel = Math.round(waterPct * 100);
  const waterDisplay = totalWater >= 1000
    ? `${(totalWater / 1000).toFixed(1)}L`
    : `${totalWater || 0}ml`;

  // Wave translation interpolators
  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const translateY = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [vs(145), 0],
  });

  // Render quick presets
  const PRESETS = [
    { label: "Glass", amount: 250, icon: "cafe" as const, color: "#64B5F6" },
    { label: "Bottle", amount: 500, icon: "flask" as const, color: "#4FC3F7" },
    { label: "Jug", amount: 750, icon: "water" as const, color: "#4DD0E1" },
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : C.cardBg,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? colors.border : "transparent",
        },
      ]}
    >
      {/* ── Header Row ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? "#1A1A1A" : C.iconBg }]}>
            <Ionicons name="water" size={scale(18)} color={C.sun} />
          </View>
          <View>
            <Text style={[styles.title, { color: isDark ? colors.text : C.white }]}>Hydration</Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textMuted : C.lightText }]}>
              Fast water logging
            </Text>
          </View>
        </View>

        <View style={[styles.pctBadge, { backgroundColor: badgeBg }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            {isOverLimit && <Ionicons name="warning" size={12} color="#FFF" />}
            <Text style={[styles.pctText, { color: badgeTxtColor }]}>{pctLabel}%</Text>
          </View>
        </View>
      </View>

      {/* ── Content Grid (Liquid filling visual + Quick log buttons) ─────────── */}
      <View style={styles.contentBody}>
        {/* Left Column: Liquid Bucket/Cup Filling */}
        <Animated.View style={[styles.cupContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[
            styles.cupFrame, 
            { 
              borderColor: frameBorderColor,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
            }
          ]}>

            {/* Liquid Fill Level */}
            <Animated.View style={[
              styles.cupFill, 
              { 
                transform: [{ translateY }],
                backgroundColor: liquidColor,
              }
            ]}>
              {/* Rolling Wave Surface */}
              <Animated.View style={[
                styles.wave, 
                { 
                  transform: [{ translateX: waveTranslateX }],
                  backgroundColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.35)",
                }
              ]} />
            </Animated.View>

            {/* In-cup metrics label */}
            <View style={styles.cupLabelWrap}>
              <Text style={styles.cupNumText}>{waterDisplay}</Text>
              <Text style={styles.cupGoalText}>goal {target / 1000}L</Text>
            </View>
          </View>
        </Animated.View>

        {/* Right Column: Preset Quick buttons */}
        <View style={styles.logButtonsWrap}>
          <Text style={[styles.logTitle, { color: isDark ? colors.text : C.white }]}>Quick Log</Text>
          <View style={styles.presetsColumn}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.amount}
                style={[
                  styles.presetRow,
                  {
                    backgroundColor: isDark ? colors.inputBg : "rgba(255,255,255,0.12)",
                    borderColor: isDark ? colors.border : "rgba(255,255,255,0.18)",
                  },
                ]}
                onPress={() => handleQuickLog(p.amount)}
                activeOpacity={0.75}
                disabled={loggingAmount !== null}
              >
                <View style={[styles.presetIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)" }]}>
                  <Ionicons name={p.icon} size={16} color={isDark ? p.color : C.sun} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.presetLabel, { color: isDark ? colors.text : C.white }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.presetAmt, { color: isDark ? colors.textMuted : C.lightText }]}>
                    +{p.amount} ml
                  </Text>
                </View>
                {loggingAmount === p.amount ? (
                  <ActivityIndicator size="small" color={isDark ? colors.primary : C.white} />
                ) : (
                  <Ionicons name="add-circle" size={22} color={isDark ? colors.primary : C.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : C.lightBorder }]} />

      <View style={styles.footer}>
        <Text style={[
          styles.footerHint, 
          { color: isOverLimit ? "#EF4444" : (isDark ? colors.textMuted : C.lightText) },
          isOverLimit && { fontFamily: FONTS.bodyBold }
        ]}>
          {isOverLimit
            ? " Exceeded safe hydration limit!"
            : totalWater >= target
            ? " Hydration goal achieved!"
            : `${Math.max(0, (target - totalWater) / 1000).toFixed(1)}L remaining to hit goal`}
        </Text>
        <TouchableOpacity
          onPress={onLogWaterPress}
          style={styles.moreBtn}
          activeOpacity={0.75}
        >
          <Text style={[styles.moreBtnText, { color: isDark ? colors.primary : C.sun }]}>
            More Options
          </Text>
          <Ionicons name="chevron-forward" size={14} color={isDark ? colors.primary : C.sun} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(24),
    padding: scale(18),
    marginBottom: vs(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(16),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  iconWrap: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: scale(17),
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    marginTop: 1,
  },
  pctBadge: {
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: vs(5),
  },
  pctText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(13),
    color: C.sun,
  },

  // Content body
  contentBody: {
    flexDirection: "row",
    gap: scale(16),
    alignItems: "center",
  },

  // Liquid cup container
  cupContainer: {
    width: scale(110),
    height: vs(145),
    justifyContent: "center",
    alignItems: "center",
  },
  cupFrame: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 3,
    borderTopWidth: 1,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  cupFill: {
    width: "100%",
    height: "100%",
    position: "absolute",
    bottom: 0,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    top: -4,
    left: -20,
    width: "140%",
    height: 10,
    borderRadius: 999,
  },
  cupLabelWrap: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  cupNumText: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    color: C.white,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cupGoalText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    color: C.white,
    opacity: 0.82,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Log presets
  logButtonsWrap: {
    flex: 1,
    gap: vs(6),
  },
  logTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
    opacity: 0.9,
    marginBottom: vs(2),
  },
  presetsColumn: {
    gap: vs(6),
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: vs(8),
    paddingHorizontal: scale(10),
    borderWidth: 1,
  },
  presetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(8),
  },
  presetLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
  presetAmt: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    marginTop: 1,
  },

  // Footer / Divider
  divider: {
    height: 1,
    marginVertical: vs(14),
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerHint: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    flex: 1,
    marginRight: scale(8),
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  moreBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
});