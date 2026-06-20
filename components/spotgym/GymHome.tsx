import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Easing, ActivityIndicator, RefreshControl,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

const BLUE = "#2596BE";
const BLUE_DARK = "#1a6e8a";

// ─── Animated stat card (mirrors SpotMe GlassCard from StatCards.tsx) ─────────
function GymStatCard({
  emoji,
  value,
  label,
  gradient,
  animStyle,
}: {
  emoji: string;
  value: string;
  label: string;
  gradient: [string, string];
  animStyle?: any;
}) {
  const { isDark, colors } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        { borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" },
      ]}
    >
      <BlurView
        intensity={50}
        tint={isDark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, { borderRadius: scale(16) }]}
      />
      <LinearGradient
        colors={gradient}
        style={[StyleSheet.absoluteFill, { borderRadius: scale(16) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "transparent"] as [string, string]}
        style={[StyleSheet.absoluteFill, { borderRadius: scale(16) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.25, y: 0.5 }}
        pointerEvents="none"
      />
      <Animated.Text style={[styles.statEmoji, animStyle]}>{emoji}</Animated.Text>
      <Text style={[styles.statValue, { color: isDark ? "#FFFFFF" : colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: isDark ? "rgba(255,255,255,0.65)" : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Pulse animation for member count card ─────────────────────────────────────
function usePulseAnim() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.16, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600),
      ])
    ).start();
  }, []);
  return { transform: [{ scale: anim }] };
}

// ─── Bounce for capacity ───────────────────────────────────────────────────────
function useBounceAnim() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -4, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 350, easing: Easing.in(Easing.bounce), useNativeDriver: true }),
        Animated.delay(1800),
      ])
    ).start();
  }, []);
  return { transform: [{ translateY: anim }] };
}

// ─── Info row (mirrors the detail rows used on profile screen) ─────────────────
function InfoRow({ icon, text }: { icon: string; text: string }) {
  const { isDark, colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={BLUE} style={{ opacity: 0.85 }} />
      <Text style={[styles.infoText, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>
        {text}
      </Text>
    </View>
  );
}

// ─── Day badge ─────────────────────────────────────────────────────────────────
function DayBadge({ day, active }: { day: string; active: boolean }) {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.dayBadge,
        {
          backgroundColor: active
            ? `${BLUE}22`
            : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          borderColor: active ? BLUE : "transparent",
        },
      ]}
    >
      <Text style={[styles.dayText, { color: active ? BLUE : (isDark ? "rgba(255,255,255,0.35)" : "#AAA") }]}>
        {day}
      </Text>
    </View>
  );
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Main GymHome component ───────────────────────────────────────────────────
export default function GymHome() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulseStyle = usePulseAnim();
  const bounceStyle = useBounceAnim();

  const fetchGym = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await axios.get(`${API_URL}/gym`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGym(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setGym(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchGym(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGym();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  // ── No gym registered — show CTA ─────────────────────────────────────────────
  if (!gym) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        {/* Glow blob */}
        <View style={styles.glowBlob} />

        <View style={[styles.ctaCard, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderRadius: scale(24) }]}
          />
          <LinearGradient
            colors={["rgba(37,150,190,0.18)", "rgba(37,150,190,0.04)"] as [string, string]}
            style={[StyleSheet.absoluteFill, { borderRadius: scale(24) }]}
            pointerEvents="none"
          />

          <View style={styles.ctaIconWrap}>
            <LinearGradient
              colors={[BLUE, BLUE_DARK]}
              style={styles.ctaIconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="business" size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.ctaTitle, { color: isDark ? "#FFFFFF" : colors.text }]}>
            No Gym Registered
          </Text>
          <Text style={[styles.ctaSub, { color: isDark ? "rgba(255,255,255,0.55)" : colors.textMuted }]}>
            Register your gym to manage members, staff, and analytics — all from one place.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push("/spotgym/register" as any)}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={[BLUE, BLUE_DARK]}
              style={styles.ctaButtonInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>Register Your Gym</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Gym registered — show dashboard ──────────────────────────────────────────
  const openDays: string[] = Array.isArray(gym.open_days)
    ? gym.open_days
    : (typeof gym.open_days === "string" ? JSON.parse(gym.open_days) : ALL_DAYS);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.dashContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
    >
      {/* Header card */}
      <View
        style={[
          styles.gymHeaderCard,
          { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
        ]}
      >
        <BlurView
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={[StyleSheet.absoluteFill, { borderRadius: scale(20) }]}
        />
        <LinearGradient
          colors={["rgba(37,150,190,0.18)", "rgba(37,150,190,0.04)"] as [string, string]}
          style={[StyleSheet.absoluteFill, { borderRadius: scale(20) }]}
          pointerEvents="none"
        />

        <View style={styles.gymHeaderRow}>
          <View style={styles.gymIconWrap}>
            <LinearGradient
              colors={[BLUE, BLUE_DARK]}
              style={styles.gymIconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="business" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.gymName, { color: isDark ? "#FFFFFF" : colors.text }]} numberOfLines={1}>
              {gym.name}
            </Text>
            {!!gym.tagline && (
              <Text style={[styles.gymTagline, { color: BLUE }]} numberOfLines={1}>
                {gym.tagline}
              </Text>
            )}
          </View>
          <View style={[styles.typeBadge, { backgroundColor: `${BLUE}20`, borderColor: `${BLUE}50` }]}>
            <Text style={[styles.typeText, { color: BLUE }]}>{gym.gym_type || "Gym"}</Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          {!!(gym.address || gym.city) && (
            <InfoRow
              icon="location-outline"
              text={[gym.address, gym.city, gym.state, gym.country].filter(Boolean).join(", ")}
            />
          )}
          <InfoRow
            icon="time-outline"
            text={`${gym.opening_time || "06:00"} – ${gym.closing_time || "22:00"}`}
          />
          {!!gym.phone && <InfoRow icon="call-outline" text={gym.phone} />}
          {!!gym.website && <InfoRow icon="globe-outline" text={gym.website} />}
          {!!gym.contact_email && <InfoRow icon="mail-outline" text={gym.contact_email} />}
        </View>

        {/* Open days */}
        <View style={styles.daysRow}>
          {ALL_DAYS.map((d) => (
            <DayBadge key={d} day={d} active={openDays.includes(d)} />
          ))}
        </View>
      </View>

      {/* Stat cards row — mirrors SpotMe StatCards pattern */}
      <View style={styles.statsRow}>
        <GymStatCard
          emoji="👥"
          value={String(gym.member_count ?? 0)}
          label="MEMBERS"
          gradient={
            isDark
              ? ["rgba(37,150,190,0.25)", "rgba(37,150,190,0.05)"]
              : ["rgba(37,150,190,0.12)", "rgba(37,150,190,0.02)"]
          }
          animStyle={pulseStyle}
        />
        <GymStatCard
          emoji="🏋️"
          value={gym.capacity ? `${gym.capacity}` : "—"}
          label="CAPACITY"
          gradient={
            isDark
              ? ["rgba(39,174,96,0.22)", "rgba(39,174,96,0.04)"]
              : ["rgba(39,174,96,0.10)", "rgba(39,174,96,0.02)"]
          }
          animStyle={bounceStyle}
        />
        <GymStatCard
          emoji="📅"
          value={`${openDays.length}d`}
          label="OPEN DAYS"
          gradient={
            isDark
              ? ["rgba(212,160,23,0.22)", "rgba(212,160,23,0.04)"]
              : ["rgba(212,160,23,0.10)", "rgba(212,160,23,0.02)"]
          }
        />
      </View>

      {/* Edit gym button */}
      <TouchableOpacity
        style={[styles.editButton, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(37,150,190,0.3)" }]}
        activeOpacity={0.75}
        onPress={() => router.push("/spotgym/register" as any)}
      >
        <Ionicons name="create-outline" size={16} color={BLUE} />
        <Text style={[styles.editButtonText, { color: BLUE }]}>Edit Gym Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  glowBlob: {
    position: "absolute",
    width: scale(280),
    height: scale(280),
    borderRadius: scale(140),
    backgroundColor: `${BLUE}18`,
    top: "20%",
    alignSelf: "center",
  },
  // CTA Card
  ctaCard: {
    width: "100%",
    borderRadius: scale(24),
    borderWidth: 1,
    overflow: "hidden",
    padding: scale(28),
    alignItems: "center",
    gap: vs(14),
  },
  ctaIconWrap: { marginBottom: vs(4) },
  ctaIconBg: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(24),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(26),
    letterSpacing: 0.5,
    textAlign: "center",
  },
  ctaSub: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    textAlign: "center",
    lineHeight: scale(19),
    paddingHorizontal: scale(8),
  },
  ctaButton: {
    marginTop: vs(6),
    width: "100%",
    borderRadius: scale(14),
    overflow: "hidden",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: vs(14),
    borderRadius: scale(14),
  },
  ctaButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(15),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  // Dashboard
  dashContainer: {
    padding: scale(18),
    paddingBottom: vs(120),
    gap: vs(16),
  },
  gymHeaderCard: {
    borderRadius: scale(20),
    borderWidth: 1,
    overflow: "hidden",
    padding: scale(18),
    gap: vs(12),
  },
  gymHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  gymIconWrap: {},
  gymIconBg: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
  },
  gymName: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    letterSpacing: 0.3,
  },
  gymTagline: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
    letterSpacing: 0.2,
    marginTop: 1,
  },
  typeBadge: {
    borderRadius: scale(8),
    borderWidth: 1,
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
  },
  typeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
  },
  infoSection: { gap: vs(6) },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  infoText: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    flex: 1,
  },
  daysRow: {
    flexDirection: "row",
    gap: scale(5),
    flexWrap: "wrap",
    marginTop: vs(2),
  },
  dayBadge: {
    borderRadius: scale(6),
    borderWidth: 1,
    paddingHorizontal: scale(8),
    paddingVertical: vs(3),
  },
  dayText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
  },
  // Stat cards
  statsRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(16),
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: vs(16),
    paddingHorizontal: scale(6),
    alignItems: "center",
    justifyContent: "center",
    gap: vs(5),
    minHeight: vs(110),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  statEmoji: {
    fontSize: scale(26),
    lineHeight: scale(32),
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(8),
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    textAlign: "center",
  },
  // Edit button
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    borderWidth: 1,
    borderRadius: scale(14),
    paddingVertical: vs(12),
  },
  editButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(14),
  },
});
