import React, { useRef, useEffect } from "react";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { name: "index",     title: "Home",      icon: "home" as const,         iconOutline: "home-outline" as const,         href: "/(tabs)/" },
  { name: "exercises", title: "Exercises", icon: "fitness" as const,      iconOutline: "fitness-outline" as const,      href: "/(tabs)/exercises" },
  { name: "meals",     title: "Meals",     icon: "restaurant" as const,   iconOutline: "restaurant-outline" as const,   href: "/(tabs)/meals" },
  { name: "daily",     title: "Daily",     icon: "calendar" as const,     iconOutline: "calendar-outline" as const,     href: "/(tabs)/daily" },
  { name: "splits",    title: "Splits",    icon: "layers" as const,       iconOutline: "layers-outline" as const,       href: "/(tabs)/splits" },
  { name: "profile",   title: "Profile",   icon: "person" as const,       iconOutline: "person-outline" as const,       href: "/(tabs)/profile" },
];

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [user, setUser] = React.useState<any>(null);

  useEffect(() => { loadUser(); }, [pathname]);

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) setUser(JSON.parse(data));
    } catch (e) {}
  };

  const activeIndex = TABS.findIndex((t) =>
    t.name === "index" ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/" : pathname.includes(t.name)
  );
  const current = activeIndex < 0 ? 0 : activeIndex;

  const TAB_WIDTH = 68;
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
  }, [current]);

  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 10);

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomPad, backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
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
            <TouchableOpacity key={tab.name} style={[styles.tabItem, { width: TAB_WIDTH }]} onPress={() => router.push(tab.href as any)} activeOpacity={0.8}>
              <Animated.View style={{ alignItems: "center", transform: [{ scale: scaleAnims[i] }], opacity: opacityAnims[i] }}>
                {tab.name === "profile" && (user?.profile_pic_url || user?.profilePicUrl) ? (
                  <Image
                    source={{ uri: user.profile_pic_url || user.profilePicUrl }}
                    style={[styles.profileIcon, isActive && { borderColor: "#E00000" }, !isActive && { borderColor: colors.textDim }]}
                  />
                ) : (
                  <Ionicons name={isActive ? tab.icon : tab.iconOutline} size={22} color={isActive ? "#E00000" : colors.textMuted} />
                )}
                <Text style={[styles.label, { color: isActive ? "#E00000" : colors.textMuted }]}>{tab.title}</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <CustomTabBar />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="exercises" />
      <Tabs.Screen name="meals" />
      <Tabs.Screen name="daily" />
      <Tabs.Screen name="splits" />
      <Tabs.Screen name="workout" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    alignItems: "center",
    borderTopWidth: 0.5,
    paddingTop: 10,
  },
  pill: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 4,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
  },
  activeBg: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    marginTop: 3,
  },
  profileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});