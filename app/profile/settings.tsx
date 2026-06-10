import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAll, getToken } from "../../utils/tokenStorage";
import axios from "axios";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { API_URL } from "../../utils/api";

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

const ITEM_H = 44;
const { width: WIN_W } = Dimensions.get('window');

function WheelPicker({
  items,
  selected,
  onSelect,
}: {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const idx = items.indexOf(selected);
  const initIdx = idx >= 0 ? idx : 0;
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: initIdx * ITEM_H, animated: false });
      }
    }
  }, []);

  const snapToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: clamped * ITEM_H, animated: true });
    }
    onSelect(items[clamped]);
  }, [items, onSelect]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    snapToIndex(index);
  }, [snapToIndex]);

  const onDragEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    snapToIndex(index);
  }, [snapToIndex]);

  return (
    <View style={{ height: ITEM_H * 5, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H,
        borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(128,128,128,0.2)', zIndex: 10,
      }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onDragEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {items.map(v => (
          <TouchableOpacity
            key={v}
            onPress={() => snapToIndex(items.indexOf(v))}
            style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 18, color: selected === v ? '#2596BE' : '#999' }}>
              {String(v).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PushReminderSettings() {
  const { colors, isDark } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [interval, setIntervalVal] = useState(120);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickH, setPickH] = useState(1);
  const [pickM, setPickM] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await axios.get(`${API_URL}/water/reminder-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnabled(res.data.water_reminder_enabled);
        setIntervalVal(res.data.water_reminder_interval);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e: boolean, i: number) => {
    setEnabled(e);
    setIntervalVal(i);
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/water/reminder-settings`,
        { water_reminder_enabled: e, water_reminder_interval: i },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {}
  };

  const openPicker = () => {
    const mins = interval;
    setPickH(Math.floor(mins / 60));
    setPickM(mins % 60);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    const total = pickH * 60 + pickM;
    if (total < 5) return;
    save(true, total);
    setShowPicker(false);
  };

  const hours = Array.from({ length: 7 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min}m`;
    if (min === 0) return `${h}h`;
    return `${h}h ${min}m`;
  };

  if (loading) return null;

  const s = makeStyles(colors);

  return (
    <View style={s.card}>
      <View style={[s.settingRow, { borderBottomWidth: enabled ? 1 : 0 }]}>
        <View style={s.settingLeft}>
          <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,150,190,0.1)' }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.settingTitle}>Push reminders</Text>
            <Text style={s.settingSubtitle}>Get notified when it's time to hydrate</Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => save(v, interval)}
          trackColor={{ false: "#E0E0E0", true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E0E0E0"
        />
      </View>
      {enabled && (
        <TouchableOpacity
          onPress={openPicker}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingLeft: 70,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 14, color: colors.primary }}>
            Every {fmt(interval)}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View
            style={{
              backgroundColor: isDark ? colors.card : '#FFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 36,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 20 }}>
              Remind me every
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Hours</Text>
                <WheelPicker items={hours} selected={pickH} onSelect={setPickH} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Minutes</Text>
                <WheelPicker items={minutes} selected={pickM} onSelect={setPickM} />
              </View>
            </View>

            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 16 }}>
              Every {pickH}h {pickM}m
            </Text>

            <TouchableOpacity
              onPress={confirmPicker}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 20,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF' }}>Set Reminder</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}



export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPrivate, setIsPrivate] = useState(false);
  const [shareSplits, setShareSplits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = await getToken();
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
      const token = await getToken();
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
      const token = await getToken();
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
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Session Expired", "Please log in again.");
        router.replace('/login');
        return;
      }
      await axios.post(`${API_URL}/auth/delete-account`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await clearAll();
      router.replace('/login');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to delete account. Please try again.";
      Alert.alert("Error", msg);
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
        <Text style={s.sectionLabel}>APPEARANCE</Text>
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
        </View>

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

        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        <PushReminderSettings />

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

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
        >
          <View
            style={{
              backgroundColor: isDark ? colors.card : '#FFF',
              borderRadius: 24,
              padding: 28,
              marginHorizontal: 28,
              width: '85%',
              maxWidth: 360,
              alignItems: 'center',
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: '#FF000015', justifyContent: 'center', alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="trash-outline" size={28} color="#FF4444" />
            </View>

            <Text style={{
              fontFamily: FONTS.heading, fontSize: 20, color: isDark ? colors.text : '#1A1A1A',
              textAlign: 'center', marginBottom: 8,
            }}>
              Delete Account
            </Text>

            <Text style={{
              fontFamily: FONTS.body, fontSize: 14, color: isDark ? colors.textMuted : '#666',
              textAlign: 'center', lineHeight: 20, marginBottom: 24,
            }}>
              This will permanently delete your account and all your data. This action cannot be undone.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => { setShowDeleteModal(false); }}
                style={{
                  flex: 1, borderRadius: 16, paddingVertical: 14,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: isDark ? colors.text : '#333' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setShowDeleteModal(false); confirmDelete(); }}
                style={{
                  flex: 1, borderRadius: 16, paddingVertical: 14,
                  backgroundColor: '#FF4444', alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
