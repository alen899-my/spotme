import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import AppHeader from "../../components/ui/AppHeader";
import ProfileSidebar from "../../components/ui/ProfileSidebar";

const { width: W } = Dimensions.get("window");

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  barBg:      "#2596BE",
  barDeep:    "#1a6e8a",
  sun:        "#F7CB16",
  ink:        "#04282B",
  white:      "#FFFFFF",
  inactive:   "rgba(255,255,255,0.45)",
  divider:    "rgba(255,255,255,0.08)",
};

const TABS = [
  { name: "index",       title: "Home",      icon: "home" as const,       iconOutline: "home-outline" as const,       href: "/(tabs)/" },
  { name: "exercises",   title: "Exercises", icon: "fitness" as const,    iconOutline: "fitness-outline" as const,    href: "/(tabs)/exercises" },
  { name: "meals",       title: "Nutrition", icon: "restaurant" as const, iconOutline: "restaurant-outline" as const, href: "/(tabs)/meals" },
  { name: "daily",       title: "Daily",     icon: "calendar" as const,   iconOutline: "calendar-outline" as const,   href: "/(tabs)/daily" },
  { name: "leaderboard", title: "Ranks",     icon: "trophy" as const,     iconOutline: "trophy-outline" as const,     href: "/(tabs)/leaderboard" },
];

const TAB_W = W / TABS.length;

// One animated value per tab for icon/label fade
const _fadeAnims = TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.45));

// ── Custom Tab Bar ────────────────────────────────────────────────────────────
function CustomTabBar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const prevIndex   = useRef(0);

  const activeIndex = TABS.findIndex((t) =>
    t.name === "index"
      ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/"
      : pathname.includes(t.name)
  );
  const current = activeIndex < 0 ? 0 : activeIndex;

  useEffect(() => {
    // Slide indicator
    Animated.spring(slideAnim, {
      toValue:         current * TAB_W,
      useNativeDriver: true,
      tension:         120,
      friction:        14,
    }).start();

    // Fade tabs
    Animated.parallel(
      _fadeAnims.map((a, i) =>
        Animated.timing(a, {
          toValue:         i === current ? 1 : 0.45,
          duration:        160,
          useNativeDriver: true,
        })
      )
    ).start();

    prevIndex.current = current;
  }, [current]);

  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 8);

  return (
    <View style={[s.bar, { paddingBottom: bottomPad }]}>

      {/* ── Sliding yellow top indicator ── */}
      <Animated.View
        style={[
          s.slider,
          { transform: [{ translateX: slideAnim }] },
        ]}
      />

      {/* ── Grid cells ── */}
      {TABS.map((tab, i) => {
        const isActive = i === current;

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.href as any)}
            style={s.cell}
            activeOpacity={0.7}
          >
            {/* Vertical right divider (except last) */}
            {i < TABS.length - 1 && <View style={s.cellDivider} />}

            <Animated.View style={[s.cellInner, { opacity: _fadeAnims[i] }]}>

              {/* Icon container */}
              <View style={[s.iconBox, isActive && s.iconBoxActive]}>
                <Ionicons
                  name={isActive ? tab.icon : tab.iconOutline}
                  size={20}
                  color={isActive ? C.ink : C.white}
                />
              </View>

              {/* Label */}
              <Text
                style={[s.label, isActive && s.labelActive]}
                numberOfLines={1}
              >
                {tab.title}
              </Text>

            </Animated.View>
          </TouchableOpacity>
        );
      })}

    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]               = useState<any>(null);
  const pathname                      = usePathname();

  useEffect(() => { loadUser(); }, [pathname]);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) setUser(JSON.parse(data));
    } catch (e) {}
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader user={user} onProfilePress={() => setSidebarOpen(true)} />
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={() => <CustomTabBar />}
      >
        <Tabs.Screen name="index"       />
        <Tabs.Screen name="exercises"   />
        <Tabs.Screen name="meals"       />
        <Tabs.Screen name="daily"       />
        <Tabs.Screen name="leaderboard" />
        <Tabs.Screen name="splits"      />
        <Tabs.Screen name="workout"     />
        <Tabs.Screen name="profile"     />
      </Tabs>
      <ProfileSidebar
        visible={sidebarOpen}
        user={user}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  bar: {
    flexDirection:   "row",
    backgroundColor: C.barBg,
    paddingTop:      0,
    alignItems:      "stretch",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   0.14,
    shadowRadius:    10,
    elevation:       16,
    position:        "relative",
    overflow:        "hidden",
  },

  // ── Sliding yellow top bar ──────────────────────────────────
  slider: {
    position:        "absolute",
    top:             0,
    left:            0,
    width:           TAB_W,
    height:          3,
    backgroundColor: C.sun,
    borderBottomLeftRadius:  3,
    borderBottomRightRadius: 3,
    // glow
    shadowColor:    C.sun,
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.8,
    shadowRadius:   6,
    elevation:      4,
  },

  // ── Grid cell ───────────────────────────────────────────────
  cell: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 10,
    paddingTop:      14,
    position:        "relative",
  },

  cellDivider: {
    position:        "absolute",
    right:           0,
    top:             "20%",
    bottom:          "20%",
    width:           1,
    backgroundColor: C.divider,
  },

  cellInner: {
    alignItems:     "center",
    justifyContent: "center",
    gap:            5,
  },

  // ── Icon box ─────────────────────────────────────────────────
  iconBox: {
    width:           38,
    height:          38,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "transparent",
  },
  iconBoxActive: {
    backgroundColor: C.sun,
    shadowColor:     C.sun,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.55,
    shadowRadius:    6,
    elevation:       5,
  },

  // ── Labels ───────────────────────────────────────────────────
  label: {
    fontFamily:    FONTS.bodySemiBold,
    fontSize:      10,
    color:         C.inactive,
    letterSpacing: 0.2,
  },
  labelActive: {
    color:      C.sun,
    fontFamily: FONTS.bodyBold,
  },
});