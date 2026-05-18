import React, { useRef, useEffect, useState } from "react";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import AppHeader from "../../components/ui/AppHeader";
import ProfileSidebar from "../../components/ui/ProfileSidebar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Profile tab removed — accessible via sidebar only
const TABS = [
  { name: "index",     title: "Home",      icon: "home" as const,         iconOutline: "home-outline" as const,         href: "/(tabs)/" },
  { name: "exercises", title: "Exercises", icon: "fitness" as const,      iconOutline: "fitness-outline" as const,      href: "/(tabs)/exercises" },
  { name: "meals",     title: "Meals",     icon: "restaurant" as const,   iconOutline: "restaurant-outline" as const,   href: "/(tabs)/meals" },
  { name: "daily",     title: "Daily",     icon: "calendar" as const,     iconOutline: "calendar-outline" as const,     href: "/(tabs)/daily" },
  { name: "splits",    title: "Splits",    icon: "layers" as const,       iconOutline: "layers-outline" as const,       href: "/(tabs)/splits" },
];

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const activeIndex = TABS.findIndex((t) =>
    t.name === "index"
      ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/"
      : pathname.includes(t.name)
  );
  const current = activeIndex < 0 ? 0 : activeIndex;

  const TAB_WIDTH = 78;
  const PILL_PADDING = 4;
  const containerWidth = TABS.length * TAB_WIDTH + PILL_PADDING * 2;

  const slideAnim = useRef(new Animated.Value(current * TAB_WIDTH)).current;
  const scaleAnims = useRef(TABS.map((_, i) => new Animated.Value(i === current ? 1 : 0.85))).current;
  const opacityAnims = useRef(TABS.map((_, i) => new Animated.Value(i === current ? 1 : 0.5))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: current * TAB_WIDTH, useNativeDriver: true, tension: 68, friction: 10 }),
      ...scaleAnims.map((anim, i) => Animated.spring(anim, { toValue: i === current ? 1 : 0.85, useNativeDriver: true, tension: 80, friction: 10 })),
      ...opacityAnims.map((anim, i) => Animated.timing(anim, { toValue: i === current ? 1 : 0.5, duration: 180, useNativeDriver: true })),
    ]).start();

    if (scrollViewRef.current) {
      const scrollX = current * TAB_WIDTH + PILL_PADDING - (SCREEN_WIDTH / 2) + (TAB_WIDTH / 2);
      scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  }, [current]);

  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 10);

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomPad, backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        <View style={[styles.pill, { width: containerWidth, backgroundColor: colors.pill, borderColor: colors.border }]}>
          <Animated.View
            style={[
              styles.activeBg,
              { width: TAB_WIDTH, backgroundColor: colors.activeBg, borderColor: colors.border, transform: [{ translateX: slideAnim }] },
            ]}
          />
          {TABS.map((tab, i) => {
            const isActive = i === current;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabItem, { width: TAB_WIDTH }]}
                onPress={() => router.push(tab.href as any)}
                activeOpacity={0.7}
              >
                <Animated.View style={{ alignItems: "center", transform: [{ scale: scaleAnims[i] }], opacity: opacityAnims[i] }}>
                  <Ionicons name={isActive ? tab.icon : tab.iconOutline} size={22} color={isActive ? "#E00000" : colors.textMuted} />
                  <Text style={[styles.label, { color: isActive ? "#E00000" : colors.textMuted }]} numberOfLines={1}>
                    {tab.title}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    loadUser();
  }, [pathname]);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) setUser(JSON.parse(data));
    } catch (e) {}
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Global Header — pinned at top like tab bar at bottom */}
      <AppHeader user={user} onProfilePress={() => setSidebarOpen(true)} />

      {/* Tab Screens */}
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

      {/* Profile Sidebar — floats above everything */}
      <ProfileSidebar
        visible={sidebarOpen}
        user={user}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    borderTopWidth: 0.5,
    paddingTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 4,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1.5,
    alignSelf: "center",
  },
  activeBg: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    marginTop: 3,
  },
});