import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../../constants/theme";
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
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
      if (!token) {
        router.replace("/");
        return;
      }
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
      color: "#111111"
    },
    {
      id: "goals",
      title: "Fitness Goals",
      subtitle: "Adjust your targets",
      icon: "target",
      iconType: "MaterialCommunityIcons",
      onPress: () => alert("Goals module coming soon"),
      color: "#111111"
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "Preferences & Security",
      icon: "cog-outline",
      iconType: "Ionicons",
      onPress: () => alert("Settings module coming soon"),
      color: "#111111"
    },
  ];

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section - Centered */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.profile_pic_url ? (
              <Image source={{ uri: user.profile_pic_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={40} color="#DDD" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraBtn}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.full_name || "Gym Warrior"}</Text>
          <Text style={styles.userEmail}>{user?.email || "warrior@spotme.com"}</Text>
          
          <View style={styles.badge}>
            <Ionicons name="flame" size={12} color="#E00000" />
            <Text style={styles.badgeText}>7 Day Streak</Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuItem} 
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                {item.iconType === "MaterialCommunityIcons" ? (
                  <MaterialCommunityIcons name={item.icon as any} size={24} color="#111" />
                ) : (
                  <Ionicons name={item.icon as any} size={24} color="#111" />
                )}
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#DDD" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Signout - Instagram Style (Centered Red Text) */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>SpotMe v1.0.4 • Beta Access</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: '#F5F5F5',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#E00000',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#E00000',
  },
  menuSection: {
    padding: 20,
    paddingTop: 30,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  logoutBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 12,
  },
  logoutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#E00000',
  },
  version: {
    textAlign: 'center',
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.textDim,
    marginTop: 40,
  }
});
