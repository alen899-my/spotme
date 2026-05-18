import React, { useRef, useEffect, useState } from "react";
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

const TABS = [
  { name: "index",     title: "Home",      icon: "home" as const,         iconOutline: "home-outline" as const,         href: "/(tabs)/" },
  { name: "exercises", title: "Exercises", icon: "fitness" as const,      iconOutline: "fitness-outline" as const,      href: "/(tabs)/exercises" },
  { name: "meals",     title: "Nutrition", icon: "restaurant" as const,   iconOutline: "restaurant-outline" as const,   href: "/(tabs)/meals" },
  { name: "daily",     title: "Daily",     icon: "calendar" as const,     iconOutline: "calendar-outline" as const,     href: "/(tabs)/daily" },
  { name: "splits",    title: "Splits",    icon: "layers" as const,       iconOutline: "layers-outline" as const,       href: "/(tabs)/splits" },
];

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const activeIndex = TABS.findIndex((t) =>
    t.name === "index"
      ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/"
      : pathname.includes(t.name)
  );
  const current = activeIndex < 0 ? 0 : activeIndex;

  // Per-tab animated values
  const scaleAnims = useRef(TABS.map((_, i) => new Animated.Value(i === current ? 1 : 0.85))).current;
  const opacityAnims = useRef(TABS.map((_, i) => new Animated.Value(i === current ? 1 : 0.55))).current;
  const dotAnims = useRef(TABS.map((_, i) => new Animated.Value(i === current ? 1 : 0))).current;

  useEffect(() => {
    Animated.parallel([
      ...scaleAnims.map((a, i) =>
        Animated.spring(a, { toValue: i === current ? 1 : 0.85, useNativeDriver: true, tension: 80, friction: 10 })
      ),
      ...opacityAnims.map((a, i) =>
        Animated.timing(a, { toValue: i === current ? 1 : 0.55, duration: 160, useNativeDriver: true })
      ),
      ...dotAnims.map((a, i) =>
        Animated.spring(a, { toValue: i === current ? 1 : 0, useNativeDriver: true, tension: 100, friction: 12 })
      ),
    ]).start();
  }, [current]);

  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 8);
  const TAB_W = Math.min(Math.floor(W / TABS.length), 76);

  return (
    <View
      style={[
        s.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomPad,
        },
      ]}
    >
      {TABS.map((tab, i) => {
        const isActive = i === current;
        const dotScale = dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
        const dotOpacity = dotAnims[i];

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.href as any)}
            style={[s.tabBtn, { width: TAB_W }]}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                s.tabInner,
                { transform: [{ scale: scaleAnims[i] }], opacity: opacityAnims[i] },
              ]}
            >
              {/* Active pill bg */}
              {isActive && (
                <View style={[s.activePill, { backgroundColor: "#E0000015" }]} />
              )}

              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={23}
                color={isActive ? "#E00000" : colors.textMuted}
              />
              <Text
                style={[
                  s.label,
                  { color: isActive ? "#E00000" : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {tab.title}
              </Text>

              {/* Active dot */}
              <Animated.View
                style={[
                  s.dot,
                  { transform: [{ scale: dotScale }], opacity: dotOpacity },
                ]}
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

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
        <Tabs.Screen name="index" />
        <Tabs.Screen name="exercises" />
        <Tabs.Screen name="meals" />
        <Tabs.Screen name="daily" />
        <Tabs.Screen name="splits" />
        <Tabs.Screen name="workout" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <ProfileSidebar
        visible={sidebarOpen}
        user={user}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    paddingTop: 10,
    alignItems: "center",
    justifyContent: "space-around",
    // subtle top shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    position: "relative",
    minWidth: 54,
  },
  activePill: {
    position: "absolute",
    inset: 0,
    borderRadius: 16,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E00000",
    marginTop: 3,
  },
});