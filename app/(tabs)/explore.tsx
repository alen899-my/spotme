import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";

const BG_IMAGES: Record<string, any> = {
  exercises: require("../../assets/explore/excerises.png"),
  splits:    require("../../assets/explore/splits.png"),
  weight:    require("../../assets/explore/weight.png"),
  reports:   require("../../assets/explore/reports.png"),
  calendar:  require("../../assets/explore/calender.png"),
  followers: require("../../assets/explore/following.png"),
  physique:  require("../../assets/coach/workout1.png"),
};

const CARD_TINTS: Record<string, [string, string]> = {
  exercises: ["rgba(155,89,182,0.28)",  "rgba(155,89,182,0.04)"],
  weight:    ["rgba(52,152,219,0.28)",   "rgba(52,152,219,0.04)"],
  splits:    ["rgba(46,204,113,0.28)",   "rgba(46,204,113,0.04)"],
  reports:   ["rgba(231,76,60,0.28)",    "rgba(231,76,60,0.04)"],
  calendar:  ["rgba(241,196,15,0.28)",   "rgba(241,196,15,0.04)"],
  followers: ["rgba(230,126,34,0.28)",   "rgba(230,126,34,0.04)"],
  physique:  ["rgba(142,68,173,0.28)",   "rgba(142,68,173,0.04)"],
};

interface ExploreItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconType: "Ionicons" | "MaterialCommunityIcons";
  href: string;
  dynamic?: boolean;
}

const EXPLORE_ITEMS: ExploreItem[] = [
  { id: "exercises", title: "Exercises",           subtitle: "Exercise library",       icon: "fitness-outline",         iconType: "Ionicons",               href: "/(tabs)/exercises" },
  { id: "weight",    title: "Weight Tracker",      subtitle: "Log body weight",        icon: "scale-outline",           iconType: "Ionicons",               href: "/(tabs)/weight" },
  { id: "splits",    title: "Splits",              subtitle: "Training splits",        icon: "layers-outline",          iconType: "Ionicons",               href: "/(tabs)/splits" },
  { id: "reports",   title: "Workout Reports",     subtitle: "AI insights",            icon: "clipboard-text-outline",  iconType: "MaterialCommunityIcons", href: "/daily/reports" },
  { id: "calendar",  title: "Calendar",            subtitle: "Workout heatmap",        icon: "calendar-outline",        iconType: "Ionicons",               href: "/calendar" },
  { id: "followers", title: "Followers",           subtitle: "Followers & following",  icon: "account-group-outline",   iconType: "MaterialCommunityIcons", href: "/profile/follow/", dynamic: true },
  { id: "physique",  title: "Physique Analysis",   subtitle: "AI body assessment",     icon: "body-outline",            iconType: "Ionicons",               href: "/physique" },
];

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = scale(10);
const CARD_W = Math.floor((SCREEN_W - scale(16) * 2 - CARD_GAP) / 2);

export default function ExploreScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem("userData");
        if (data) {
          const u = JSON.parse(data);
          setUserId(u?.id || u?.user_id || null);
        }
      } catch {}
    })();
  }, []);

  const handleNav = (item: ExploreItem) => {
    if (item.dynamic && userId) {
      router.push({ pathname: `/profile/follow/${userId}` } as any);
    } else {
      router.push(item.href as any);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Explore</Text>
        <Text style={[styles.screenSub, { color: colors.textMuted }]}>
          All your fitness tools in one place
        </Text>
      </View>

      <View style={styles.grid}>
        {EXPLORE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            onPress={() => handleNav(item)}
            style={{ width: CARD_W, height: CARD_W, marginBottom: CARD_GAP }}
          >
            <View style={styles.glassCard}>
              <ImageBackground
                source={BG_IMAGES[item.id]}
                style={styles.card}
                imageStyle={{ borderRadius: scale(18) }}
                resizeMode="cover"
              />
              <BlurView
                intensity={50}
                tint="dark"
                style={[StyleSheet.absoluteFill, styles.cardRadius]}
              />
              <LinearGradient
                colors={CARD_TINTS[item.id]}
                style={[StyleSheet.absoluteFill, styles.cardRadius]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["rgba(255,255,255,0.08)", "transparent"] as [string, string]}
                style={[StyleSheet.absoluteFill, styles.cardRadius]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.25, y: 0.5 }}
                pointerEvents="none"
              />
              <View style={styles.cardContent}>
                <View style={styles.cardIconWrap}>
                  {item.iconType === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons name={item.icon as any} size={scale(26)} color="#FFFFFF" />
                  ) : (
                    <Ionicons name={item.icon as any} size={scale(26)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: vs(12),
    paddingBottom: vs(200),
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: vs(20),
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(32),
    letterSpacing: -1,
    lineHeight: scale(34),
  },
  screenSub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    letterSpacing: 0.5,
    marginTop: vs(2),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  glassCard: {
    flex: 1,
    borderRadius: scale(18),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(18),
  },
  cardRadius: {
    borderRadius: scale(18),
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(8),
  },
  cardIconWrap: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(14),
    color: "#FFFFFF",
    textAlign: "center",
  },
  cardSub: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
});
