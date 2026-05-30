import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, useWindowDimensions } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../../components/ui/AppHeader";
import ProfileSidebar from "../../components/ui/ProfileSidebar";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";

const BLUE = "#2596BE";
const INK = "#04282B";

const TABS = [
  { name: "index",       icon: "home",          label: "Home" },
  { name: "exercises",   icon: "fitness",       label: "Exercises" },
  { name: "meals",       icon: "restaurant",     label: "Meals" },
  { name: "daily",       icon: "calendar",       label: "Daily" },
  { name: "leaderboard", icon: "trophy",         label: "Leaderboard" },
] as const;

function isActiveTab(tabName: string, pathname: string) {
  if (tabName === "index")
    return pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/";
  return pathname.includes(tabName);
}

function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const pillMargin = 20;
  const pillPadding = 12;
  const tabWidth = Math.floor((screenWidth - pillMargin * 2 - pillPadding) / TABS.length);

  return (
    <View style={[styles.bottomBarWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[
        styles.bottomBar,
        {
          backgroundColor: isDark ? "#0D0D0D" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
      ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsScroll, { minWidth: screenWidth - pillMargin * 2 - pillPadding * 2 }]}
          bounces={false}
        >
          {TABS.map((tab) => {
            const active = isActiveTab(tab.name, pathname);
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => router.push(`/(tabs)/${tab.name === "index" ? "" : tab.name}` as any)}
                activeOpacity={0.7}
                style={[styles.tabItem, { width: tabWidth }]}
              >
                <Ionicons
                  name={active ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
                  size={22}
                  color={active ? BLUE : (isDark ? "rgba(255,255,255,0.35)" : "#78909C")}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? BLUE : (isDark ? "rgba(255,255,255,0.35)" : "#78909C") },
                    active && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
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
    <View style={[styles.shell, { backgroundColor: colors.bg }]}>
      <View style={styles.contentWrap}>
        <AppHeader user={user} onProfilePress={() => setSidebarOpen(true)} />
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
      </View>
      <BottomTabBar />
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
  },
  contentWrap: {
    flex: 1,
    paddingBottom: 90,
  },
  bottomBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  bottomBar: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsScroll: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: FONTS.bodyBold,
  },
});
