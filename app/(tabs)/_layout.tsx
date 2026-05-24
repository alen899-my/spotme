import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../components/ui/AppHeader";
import ProfileSidebar from "../../components/ui/ProfileSidebar";

const { width: W } = Dimensions.get("window");

const C = {
  sun: "#F7CB16",
  ink: "#04282B",
  white: "#FFFFFF",
  pageBg: "#F5F9FC",
  border: "rgba(37,150,190,0.14)",
  text: "rgba(4,40,43,0.72)",
};

const TABS = [
  { name: "index", icon: "home" as const, iconOutline: "home-outline" as const, href: "/(tabs)/" },
  { name: "exercises", icon: "fitness" as const, iconOutline: "fitness-outline" as const, href: "/(tabs)/exercises" },
  { name: "meals", icon: "restaurant" as const, iconOutline: "restaurant-outline" as const, href: "/(tabs)/meals" },
  { name: "daily", icon: "calendar" as const, iconOutline: "calendar-outline" as const, href: "/(tabs)/daily" },
  { name: "leaderboard", icon: "trophy" as const, iconOutline: "trophy-outline" as const, href: "/(tabs)/leaderboard" },
];

function TopTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(W - 16);

  const activeIndex = TABS.findIndex((tab) =>
    tab.name === "index"
      ? pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/"
      : pathname.includes(tab.name)
  );
  const current = activeIndex < 0 ? 0 : activeIndex;
  const tabWidth = Math.max(60, Math.min(82, Math.floor(barWidth / TABS.length) - 2));

  return (
    <View style={[styles.topBar, { paddingBottom: Math.max(insets.bottom, 2) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabsRow, { minWidth: barWidth }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {TABS.map((tab, i) => {
          const isActive = i === current;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.href as any)}
              activeOpacity={0.8}
              style={[styles.tabPill, { width: tabWidth }, isActive && styles.tabPillActive]}
            >
              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={21}
                color={isActive ? C.ink : C.text}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("userData");
        if (data) setUser(JSON.parse(data));
      } catch {}
    };
    loadUser();
  }, [pathname]);

  return (
    <View style={styles.shell}>
      <AppHeader user={user} onProfilePress={() => setSidebarOpen(true)} />
      <TopTabBar />
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="exercises" />
        <Tabs.Screen name="meals" />
        <Tabs.Screen name="daily" />
        <Tabs.Screen name="leaderboard" />
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

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: C.pageBg,
  },
  topBar: {
    backgroundColor: "transparent",
    paddingTop: 0,
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 8,
  },
  tabPill: {
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.border,
  },
  tabPillActive: {
    backgroundColor: C.sun,
    borderColor: C.sun,
  },
});
