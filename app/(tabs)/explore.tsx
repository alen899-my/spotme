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

interface ExploreItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconType: "Ionicons" | "MaterialCommunityIcons";
  href: string;
  dynamic?: boolean;
  span: 1 | 2;
}

const BENTO_LAYOUT: ExploreItem[] = [
  { id: "exercises", title: "Exercises",           subtitle: "Exercise library",       icon: "fitness-outline",         iconType: "Ionicons",               href: "/(tabs)/exercises",  span: 2 },
  { id: "weight",    title: "Weight Tracker",      subtitle: "Log body weight",        icon: "scale-outline",           iconType: "Ionicons",               href: "/(tabs)/weight",    span: 1 },
  { id: "splits",    title: "Splits",              subtitle: "Training splits",        icon: "layers-outline",          iconType: "Ionicons",               href: "/(tabs)/splits",    span: 1 },
  { id: "reports",   title: "Workout Reports",     subtitle: "AI insights",            icon: "clipboard-text-outline",  iconType: "MaterialCommunityIcons", href: "/daily/reports",    span: 2 },
  { id: "calendar",  title: "Calendar",            subtitle: "Workout heatmap",        icon: "calendar-outline",        iconType: "Ionicons",               href: "/calendar",         span: 1 },
  { id: "followers", title: "Followers",           subtitle: "Followers & following",  icon: "account-group-outline",   iconType: "MaterialCommunityIcons", href: "/profile/follow/",  span: 1, dynamic: true },
  { id: "physique",  title: "Physique Analysis",   subtitle: "AI body assessment",     icon: "body-outline",            iconType: "Ionicons",               href: "/physique",         span: 2 },
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

  const rows: (typeof BENTO_LAYOUT) = BENTO_LAYOUT;

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
        {/* Row 1: Exercises (full width) */}
        <View style={styles.row}>
          {renderCard(rows[0], CARD_W * 2 + CARD_GAP, Math.floor(CARD_W * 0.8))}
        </View>

        {/* Row 2: Weight + Splits */}
        <View style={styles.row}>
          {renderCard(rows[1], CARD_W, Math.floor(CARD_W * 0.8))}
          {renderCard(rows[2], CARD_W, Math.floor(CARD_W * 0.8))}
        </View>

        {/* Row 3: Workout Reports (full width) */}
        <View style={styles.row}>
          {renderCard(rows[3], CARD_W * 2 + CARD_GAP, Math.floor(CARD_W * 0.8))}
        </View>

        {/* Row 4: Calendar + Followers */}
        <View style={styles.row}>
          {renderCard(rows[4], CARD_W, Math.floor(CARD_W * 0.8))}
          {renderCard(rows[5], CARD_W, Math.floor(CARD_W * 0.8))}
        </View>

        {/* Row 5: Physique Analysis (full width) */}
        <View style={styles.row}>
          {renderCard(rows[6], CARD_W * 2 + CARD_GAP, Math.floor(CARD_W * 0.9))}
        </View>
      </View>
    </ScrollView>
  );

  function renderCard(item: typeof BENTO_LAYOUT[0], width: number, height: number) {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        onPress={() => handleNav(item)}
        style={{ width, height }}
      >
        <ImageBackground
          source={BG_IMAGES[item.id]}
          style={styles.card}
          imageStyle={{ borderRadius: scale(18) }}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFill, styles.cardOverlay, { borderRadius: scale(18) }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardIconWrap}>
              {item.iconType === "MaterialCommunityIcons" ? (
                <MaterialCommunityIcons name={item.icon as any} size={scale(item.span === 2 ? 32 : 26)} color="#FFFFFF" />
              ) : (
                <Ionicons name={item.icon as any} size={scale(item.span === 2 ? 32 : 26)} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.cardTitle, item.span === 2 && { fontSize: scale(17) }]}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.subtitle}</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }
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
    gap: vs(14),
  },
  row: {
    flexDirection: "row",
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    borderRadius: scale(18),
    overflow: "hidden",
  },
  cardOverlay: {
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  cardContent: {
    flex: 1,
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
