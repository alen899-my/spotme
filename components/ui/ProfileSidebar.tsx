import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StreakIcon from "./StreakIcon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.78;

interface ProfileSidebarProps {
  visible: boolean;
  user: any;
  onClose: () => void;
}

const MENU_ITEMS = [
  {
    id: "home",
    title: "Home",
    subtitle: "Dashboard overview",
    icon: "home-outline",
    iconType: "Ionicons",
    href: "/(tabs)/",
  },
  {
    id: "exercises",
    title: "Exercises",
    subtitle: "Browse & manage exercises",
    icon: "fitness-outline",
    iconType: "Ionicons",
    href: "/(tabs)/exercises",
  },
  {
    id: "meals",
    title: "Meals",
    subtitle: "Nutrition & food tracking",
    icon: "restaurant-outline",
    iconType: "Ionicons",
    href: "/(tabs)/meals",
  },
  {
    id: "daily",
    title: "Daily Log",
    subtitle: "Today's workout activity",
    icon: "calendar-outline",
    iconType: "Ionicons",
    href: "/(tabs)/daily",
  },
  {
    id: "splits",
    title: "Splits",
    subtitle: "Training splits & programs",
    icon: "layers-outline",
    iconType: "Ionicons",
    href: "/(tabs)/splits",
  },
  {
    id: "divider",
    title: "",
    subtitle: "",
    icon: "",
    iconType: "",
    href: "",
  },
  {
    id: "details",
    title: "My Profile Details",
    subtitle: "Personal stats & physical data",
    icon: "account-details-outline",
    iconType: "MaterialCommunityIcons",
    href: "/profile/details",
  },
  {
    id: "goals",
    title: "Fitness Goals",
    subtitle: "Adjust your targets",
    icon: "target",
    iconType: "MaterialCommunityIcons",
    href: null,
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Preferences & theme",
    icon: "settings-outline",
    iconType: "Ionicons",
    href: "/profile/settings",
  },
];

export default function ProfileSidebar({ visible, user, onClose }: ProfileSidebarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  const handleNav = (href: string | null) => {
    onClose();
    if (!href) {
      setTimeout(() => alert("Coming soon!"), 300);
      return;
    }
    setTimeout(() => router.push(href as any), 250);
  };

  const handleLogout = async () => {
    onClose();
    setTimeout(async () => {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      router.replace("/");
    }, 300);
  };

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={visible || shouldRender}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? "auto" : "none"}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sidebar Panel */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.card,
            transform: [{ translateX: slideAnim }],
            paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) + 12,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        {/* Close Button */}
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.inputBg }]} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Profile Header */}
        <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.avatarRow}>
            {user?.profile_pic_url ? (
              <Image source={{ uri: user.profile_pic_url }} style={[styles.avatar, { borderColor: colors.primary }]} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="person" size={28} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user?.full_name || "Gym Warrior"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.email || "warrior@spotme.com"}
              </Text>
            </View>
          </View>

          {user?.current_streak > 0 && (
            <View style={styles.streakRow}>
              <StreakIcon streak={user.current_streak} size={38} />
            </View>
          )}
        </View>

        {/* Menu Items */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            if (item.id === "divider") {
              return (
                <View key="divider" style={[styles.divider, { backgroundColor: colors.border }]} />
              );
            }
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, { borderColor: colors.border }]}
                onPress={() => handleNav(item.href)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: colors.iconCircle }]}>
                  {item.iconType === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, { borderTopColor: colors.border }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E00000" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textDim }]}>SpotMe v1.0.4 • Beta</Text>
      </Animated.View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 2,
  },
  streakRow: {
    marginTop: 14,
    alignItems: "flex-start",
  },
  menuList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  menuSub: {
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 4,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    gap: 12,
  },
  logoutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: "#E00000",
  },
  version: {
    textAlign: "center",
    fontFamily: FONTS.body,
    fontSize: 10,
    paddingBottom: 6,
  },
});
