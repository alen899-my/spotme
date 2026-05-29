import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";
import StreakIcon from "../../components/ui/StreakIcon";
import XPBar from "../../components/ui/XPBar";

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { router.replace("/"); return; }
      const res = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user in profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: "details",
      title: "My Profile Details",
      subtitle: "Personal stats & physical data",
      icon: "account-details-outline",
      iconType: "MaterialCommunityIcons",
      onPress: () => router.push("/profile/details"),
    },
    {
      id: "goals",
      title: "Fitness Goals",
      subtitle: "Adjust your targets",
      icon: "target",
      iconType: "MaterialCommunityIcons",
      onPress: () => alert("Goals module coming soon"),
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "Preferences & theme",
      icon: "cog-outline",
      iconType: "Ionicons",
      onPress: () => router.push("/profile/settings"),
    },
  ];

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      router.replace("/login");
    } catch (e) {
      console.error("Logout error in profile:", e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header Section - Centered */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            {user?.profile_pic_url ? (
              <Image source={{ uri: user.profile_pic_url }} style={[styles.avatar, { borderColor: colors.card }]} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="person" size={40} color={colors.border} />
              </View>
            )}
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.full_name || "Gym Warrior"}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || "warrior@spotme.com"}</Text>

          {user && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              {user.league_tier && (
                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.1)', paddingVertical: 4, paddingHorizontal: 10 }]}>
                  <Ionicons name="trophy" size={12} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{user.league_tier}</Text>
                </View>
              )}
              <Text style={{ fontFamily: FONTS.bodyBold, color: colors.textMuted, fontSize: 13 }}>
                {user.total_xp?.toLocaleString() || 0} XP
              </Text>
            </View>
          )}

          {user?.current_streak > 0 && (
            <View style={{ marginTop: 12 }}>
              <StreakIcon streak={user.current_streak} size={50} />
            </View>
          )}

          {user && (
            <View style={{ width: '85%', marginTop: 24 }}>
              <XPBar level={user.level} currentXp={user.total_xp % (user.level * 1000)} />
            </View>
          )}
        </View>

        {/* Menu Section */}
        <View style={{ padding: 20, paddingTop: 30 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.inputBg }]}>
                {item.iconType === "MaterialCommunityIcons" ? (
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={colors.text} />
                ) : (
                  <Ionicons name={item.icon as any} size={24} color={colors.text} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Instagram-style logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textDim }]}>SpotMe v1.0.4 • Beta Access</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  placeholderAvatar: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#E00000",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF", // fallback, overridden inline
  },
  userName: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: FONTS.body,
    fontSize: 14,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: "#E00000",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  logoutBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: "#E00000",
  },
  version: {
    textAlign: "center",
    fontFamily: FONTS.body,
    fontSize: 10,
    marginTop: 40,
  },
});
