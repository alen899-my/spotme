import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../../constants/theme";
import axios from "axios";

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
      const res = await axios.get(`${API_URL}/auth/me`, {
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
      title: "My Details",
      subtitle: "Personal information & metrics",
      icon: "account-details-outline",
      iconType: "MaterialCommunityIcons",
      onPress: () => router.push("/profile/details"),
    },
    {
      id: "settings",
      title: "Settings",
      subtitle: "App preferences & security",
      icon: "settings-outline",
      iconType: "Ionicons",
      onPress: () => alert("Settings clicked"),
    },
  ];

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Profile Header */}
        <View style={styles.header}>
          <View style={styles.profilePicWrap}>
            {user?.profile_pic_url || user?.profilePicUrl ? (
              <Image 
                source={{ uri: user.profile_pic_url || user.profilePicUrl }} 
                style={styles.profilePic} 
              />
            ) : (
              <View style={[styles.profilePic, styles.placeholderPic]}>
                <Ionicons name="person" size={40} color="#CCC" />
              </View>
            )}
            <TouchableOpacity style={styles.editBtn}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {user?.full_name || user?.fullName || "User Name"}
          </Text>
          <Text style={styles.userEmail}>{user?.email || "email@example.com"}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
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
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E00000" />
          <Text style={styles.logoutText}>Logout Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  profilePicWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    position: "relative",
  },
  profilePic: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#F0F0F0",
  },
  placeholderPic: {
    backgroundColor: "#F7F7F7",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#E00000",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: "#111",
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#888",
  },
  menuContainer: {
    padding: 24,
    gap: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  menuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
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
    color: "#111",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#888",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFE5E5",
    backgroundColor: "#FFF5F5",
    gap: 8,
  },
  logoutText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#E00000",
  },
});
