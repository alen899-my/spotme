import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAll } from "../../utils/tokenStorage";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { API_URL } from "../../utils/api";



export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPrivate, setIsPrivate] = useState(false);
  const [shareSplits, setShareSplits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingShare, setSavingShare] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsPrivate(res.data.is_private || false);
      setShareSplits(res.data.share_splits || false);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacy = async (value: boolean) => {
    setIsPrivate(value);
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.put(`${API_URL}/profile/update`,
        { is_private: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local storage user data
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userData.is_private = value;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to update privacy:', err);
      setIsPrivate(!value);
    } finally {
      setSaving(false);
    }
  };

  const toggleShareSplits = async (value: boolean) => {
    setShareSplits(value);
    setSavingShare(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.put(`${API_URL}/profile/update`,
        { share_splits: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userData.share_splits = value;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to update share splits:', err);
      setShareSplits(!value);
    } finally {
      setSavingShare(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/auth/delete-account`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await clearAll();
      router.replace('/login');
    } catch (err) {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[
        s.header,
        {
          backgroundColor: isDark ? colors.bg : colors.primary,
          paddingTop: Math.max(insets.top, 12),
          borderBottomWidth: isDark ? 1 : 0,
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.card}>
          <View style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? colors.iconCircle : 'rgba(37,150,190,0.1)' }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={s.settingTitle}>Dark Mode</Text>
                <Text style={s.settingSubtitle}>{isDark ? "Dark theme enabled" : "Light theme enabled"}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E0E0E0", true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View> */}

        <Text style={s.sectionLabel}>PRIVACY</Text>
        <View style={s.card}>
          <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,150,190,0.1)' }]}>
                <Ionicons
                  name={isPrivate ? "lock-closed" : "lock-open"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingTitle}>Private Profile</Text>
                <Text style={s.settingSubtitle}>
                  {isPrivate
                    ? "Only approved followers can see your full profile"
                    : "Everyone can see your full profile"}
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={togglePrivacy}
              trackColor={{ false: "#E0E0E0", true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
              disabled={saving}
            />
          </View>
        </View>

        <Text style={s.sectionLabel}>SHARING</Text>
        <View style={s.card}>
          <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,150,190,0.1)' }]}>
                <Ionicons
                  name={shareSplits ? "share" : "share-outline"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingTitle}>Shared Splits</Text>
                <Text style={s.settingSubtitle}>
                  {shareSplits
                    ? "Your programs are visible to the community"
                    : "Only you can see your programs"}
                </Text>
              </View>
            </View>
            <Switch
              value={shareSplits}
              onValueChange={toggleShareSplits}
              trackColor={{ false: "#E0E0E0", true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E0E0E0"
              disabled={savingShare}
            />
          </View>
        </View>

        <Text style={s.sectionLabel}>ABOUT</Text>
        <View style={s.card}>
          <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
            <View style={s.settingLeft}>
              <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={s.settingTitle}>SpotMe v1.0.4 · Beta</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.6}>
            <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
              <View style={s.settingLeft}>
                <View style={[s.iconCircle, { backgroundColor: '#FF000015' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FF4444" />
                </View>
                <Text style={[s.settingTitle, { color: '#FF4444' }]}>Delete Account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: colors.text,
    letterSpacing: 1,
  },
  scrollContent: {
      padding: 20,
      paddingBottom: 60,
      flexGrow: 1,
    },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  settingSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
