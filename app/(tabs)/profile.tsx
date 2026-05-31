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
import { ProfileSkeleton } from "../../components/ui/Skeleton";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

const SectionHeader = ({ title, colors }: { title: string; colors: any }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
    <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
  </View>
);

const InfoRow = ({ label, value, colors }: { label: string; value: any; colors: any }) => (
  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value || "—"}</Text>
  </View>
);

const Badge = ({ value, colors }: { value: any; colors: any }) => (
  value ? (
    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
      <Text style={styles.badgeText}>{value}</Text>
    </View>
  ) : (
    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: colors.text }}>—</Text>
  )
);

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { fetchUserData(); }, [])
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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      router.replace("/login");
    } catch (e) {
      console.error("Logout error in profile:", e);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const u = user || {};
  const hasBodyStats = u.neck || u.waist || u.chest || u.arm || u.thigh;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            {u.profile_pic_url ? (
              <Image source={{ uri: u.profile_pic_url }} style={[styles.avatar, { borderColor: colors.card }]} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="person" size={40} color={colors.border} />
              </View>
            )}
            <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.primary, borderColor: colors.card }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{u.full_name || "Gym Warrior"}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{u.email || "warrior@spotme.com"}</Text>

          {u && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              {u.league_tier && (
                <View style={[styles.badgeRow, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.1)' }]}>
                  <Ionicons name="trophy" size={12} color={colors.primary} />
                  <Text style={[styles.badgeRowText, { color: colors.primary }]}>{u.league_tier}</Text>
                </View>
              )}
              <Text style={{ fontFamily: FONTS.bodyBold, color: colors.textMuted, fontSize: 13 }}>
                {u.total_xp?.toLocaleString() || 0} XP
              </Text>
            </View>
          )}

          {u?.current_streak > 0 && (
            <View style={{ marginTop: 12 }}>
              <StreakIcon streak={u.current_streak} size={50} />
            </View>
          )}

          {u && (
            <View style={{ width: '85%', marginTop: 24 }}>
              <XPBar level={u.level} currentXp={u.total_xp % (u.level * 2000)} />
            </View>
          )}
        </View>

        {/* Onboarding Details */}
        <View style={{ padding: 20, paddingTop: 24 }}>

          {/* Physical Metrics */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Physical Metrics" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <InfoRow label="Gender" value={u.gender} colors={colors} />
              <InfoRow label="Age" value={u.age} colors={colors} />
              <InfoRow label="Height" value={u.height} colors={colors} />
              <InfoRow label="Weight" value={u.weight} colors={colors} />
              <InfoRow label="Body Fat" value={u.body_fat ? `${u.body_fat}%` : null} colors={colors} />
            </View>
          </View>

          {/* Fitness Strategy */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Fitness Strategy" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {["fitness_goal", "experience_level", "activity_level"].map(key => (
                <View key={key} style={[styles.badgeRowLayout, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                    {key === "fitness_goal" ? "Fitness Goal" : key === "experience_level" ? "Experience" : "Activity"}
                  </Text>
                  <Badge value={u[key]} colors={colors} />
                </View>
              ))}
            </View>
          </View>

          {/* Body Stats */}
          {hasBodyStats && (
            <View style={{ marginBottom: 28 }}>
              <SectionHeader title="Body Stats" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {["neck", "chest", "waist", "hip", "arm", "thigh"].map(key => (
                  <InfoRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={u[key]} colors={colors} />
                ))}
              </View>
            </View>
          )}

          {/* Nutrition */}
          <View style={{ marginBottom: 28 }}>
            <SectionHeader title="Nutrition & Health" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <InfoRow label="Diet Type" value={u.diet_type} colors={colors} />
              <InfoRow label="Food Preference" value={u.food_preference} colors={colors} />
              <InfoRow label="Water Intake" value={u.water_intake} colors={colors} />
              <InfoRow label="Medication" value={u.medication} colors={colors} />
              <InfoRow label="Medical Issues" value={u.medical_conditions} colors={colors} />
              <InfoRow label="Allergies" value={u.allergies} colors={colors} />
            </View>
          </View>

          {/* Menu Items */}
          <View style={{ marginTop: 8 }}>
            {[
              { id: "details", title: "Edit Profile Details", subtitle: "Edit your personal stats & physical data", icon: "account-details-outline", iconType: "MaterialCommunityIcons", onPress: () => router.push("/profile/details") },
              { id: "goals", title: "Fitness Goals", subtitle: "Adjust your targets", icon: "target", iconType: "MaterialCommunityIcons", onPress: () => router.push("/profile/details") },
              { id: "settings", title: "Settings", subtitle: "Preferences & theme", icon: "cog-outline", iconType: "Ionicons", onPress: () => router.push("/profile/settings") },
            ].map((item) => (
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

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={[styles.version, { color: colors.textDim }]}>SpotMe v1.0.4 • Beta Access</Text>
        </View>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  badgeRowText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    marginRight: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  card: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  infoValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
  },
  badgeRowLayout: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#FFF",
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
