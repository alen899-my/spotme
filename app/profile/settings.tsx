import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Modal,
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
import { useUnits } from "../../contexts/UnitContext";
import { FONTS } from "../../constants/theme";
import { API_URL } from "../../utils/api";
import ActionModal from "../../components/ui/ActionModal";

const ITEM_H = 44;

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

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[cardStyles.row, { borderBottomWidth: enabled ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }]}>
        <View style={cardStyles.left}>
          <Ionicons name="notifications-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.title, { color: colors.text }]}>Push Reminders</Text>
            <Text style={[cardStyles.subtitle, { color: colors.textDim }]}>Get notified when it's time to hydrate</Text>
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
          style={cardStyles.intervalRow}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: colors.textMuted }}>
            Remind me every
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 14, color: colors.primary }}>
              {fmt(interval)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </View>
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
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 20 }}>
              Remind me every
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim, marginBottom: 4 }}>Hours</Text>
                <WheelPicker items={hours} selected={pickH} onSelect={setPickH} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim, marginBottom: 4 }}>Minutes</Text>
                <WheelPicker items={minutes} selected={pickM} onSelect={setPickM} />
              </View>
            </View>

            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textDim, textAlign: 'center', marginTop: 16 }}>
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
  const { unitSystem, setUnitSystem } = useUnits();
  const insets = useSafeAreaInsets();
  const [isPrivate, setIsPrivate] = useState(false);
  const [shareSplits, setShareSplits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearType, setClearType] = useState<'cache' | 'data' | null>(null);
  const [cacheSize, setCacheSize] = useState('');
  const [dataSize, setDataSize] = useState('');
  const [clearing, setClearing] = useState(false);
  const [alertModal, setAlertModal] = useState<{ visible: boolean; type: 'info' | 'success' | 'error'; title: string; message: string }>({ visible: false, type: 'info', title: '', message: '' });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStorageSizes = async () => {
    const keys = await AsyncStorage.getAllKeys();
    let cacheBytes = 0;
    let totalBytes = 0;
    for (const key of keys) {
      const val = await AsyncStorage.getItem(key);
      const size = val ? val.length * 2 : 0;
      totalBytes += size;
      if (!key.includes('token') && !key.includes('auth')) {
        cacheBytes += size;
      }
    }
    setCacheSize(formatBytes(cacheBytes));
    setDataSize(formatBytes(totalBytes));
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      if (clearType === 'cache') {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => !k.includes('token') && !k.includes('auth'));
        await AsyncStorage.multiRemove(cacheKeys);
      } else {
        await AsyncStorage.clear();
      }
      setShowClearModal(false);
      setAlertModal({ visible: true, type: 'success', title: 'Done', message: clearType === 'cache' ? 'Cache cleared successfully.' : 'All local data cleared successfully.' });
    } catch (e) {
      setAlertModal({ visible: true, type: 'error', title: 'Error', message: 'Failed to clear data.' });
    } finally {
      setClearing(false);
    }
  };

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
        setAlertModal({ visible: true, type: 'info', title: 'Session Expired', message: 'Please log in again.' });
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
      setAlertModal({ visible: true, type: 'error', title: 'Error', message: msg });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[
        headerStyles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={headerStyles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[headerStyles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[sectionStyles.label, { color: colors.textDim }]}>PRIVACY</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={cardStyles.row}>
            <View style={cardStyles.left}>
              <Ionicons
                name={isPrivate ? "lock-closed" : "lock-open"}
                size={20}
                color={colors.textMuted}
                style={{ width: 28 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[cardStyles.title, { color: colors.text }]}>Private Profile</Text>
                <Text style={[cardStyles.subtitle, { color: colors.textDim }]}>
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

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>NOTIFICATIONS</Text>
        <PushReminderSettings />

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>SHARING</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={cardStyles.row}>
            <View style={cardStyles.left}>
              <Ionicons
                name={shareSplits ? "share" : "share-outline"}
                size={20}
                color={colors.textMuted}
                style={{ width: 28 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[cardStyles.title, { color: colors.text }]}>Shared Splits</Text>
                <Text style={[cardStyles.subtitle, { color: colors.textDim }]}>
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

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>APPEARANCE</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={toggleTheme} activeOpacity={0.6}>
            <View style={cardStyles.row}>
              <View style={cardStyles.left}>
                <Ionicons
                  name={isDark ? "moon" : "sunny"}
                  size={20}
                  color={colors.textMuted}
                  style={{ width: 28 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[cardStyles.title, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[cardStyles.subtitle, { color: colors.textDim }]}>
                    {isDark ? "On" : "Off"}
                  </Text>
                </View>
              </View>
              <View style={{
                width: 44, height: 26, borderRadius: 13,
                backgroundColor: isDark ? colors.primary : '#E0E0E0',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: '#FFF',
                  alignSelf: isDark ? 'flex-end' : 'flex-start',
                }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>UNITS</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Ionicons name="speedometer-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <Text style={[cardStyles.title, { color: colors.text }]}>Unit System</Text>
              </View>
              <Text style={[cardStyles.subtitle, { color: colors.textDim }]}>
                {unitSystem === 'metric' ? 'kg, cm' : 'lbs, ft'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginTop: 12, alignSelf: 'flex-start' }}>
              <TouchableOpacity
                onPress={() => setUnitSystem('metric')}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: unitSystem === 'metric' ? colors.primary : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontFamily: FONTS.bodySemiBold, fontSize: 13,
                  color: unitSystem === 'metric' ? '#FFF' : colors.textMuted,
                }}>Metric</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUnitSystem('imperial')}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  backgroundColor: unitSystem === 'imperial' ? colors.primary : 'transparent',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontFamily: FONTS.bodySemiBold, fontSize: 13,
                  color: unitSystem === 'imperial' ? '#FFF' : colors.textMuted,
                }}>Imperial</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>DATA</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={async () => {
              await getStorageSizes();
              setClearType('cache');
              setShowClearModal(true);
            }}
            activeOpacity={0.6}
          >
            <View style={[cardStyles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={cardStyles.left}>
                <Ionicons name="trash-bin-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[cardStyles.title, { color: colors.text }]}>Clear Cache</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await getStorageSizes();
              setClearType('data');
              setShowClearModal(true);
            }}
            activeOpacity={0.6}
          >
            <View style={cardStyles.row}>
              <View style={cardStyles.left}>
                <Ionicons name="server-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[cardStyles.title, { color: colors.text }]}>Clear All Data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>ACCOUNT</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.push("/profile/change-password")}
            activeOpacity={0.6}
          >
            <View style={[cardStyles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={cardStyles.left}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <Text style={[cardStyles.title, { color: colors.text }]}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.6}>
            <View style={cardStyles.row}>
              <View style={cardStyles.left}>
                <Ionicons name="trash-outline" size={20} color="#FF4444" style={{ width: 28 }} />
                <Text style={[cardStyles.title, { color: '#FF4444' }]}>Delete Account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>ABOUT</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[cardStyles.row, { borderBottomWidth: 0 }]}>
            <View style={cardStyles.left}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textDim} style={{ width: 28 }} />
              <Text style={[cardStyles.title, { color: colors.text }]}>SpotMe v1.0.4</Text>
            </View>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: colors.textDim }}>Beta</Text>
          </View>
        </View>

        <Text style={[sectionStyles.label, { color: colors.textDim }]}>LEGAL</Text>
        <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.push("/profile/privacy")}
            activeOpacity={0.6}
          >
            <View style={[cardStyles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={cardStyles.left}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <Text style={[cardStyles.title, { color: colors.text }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/profile/terms")}
            activeOpacity={0.6}
          >
            <View style={cardStyles.row}>
              <View style={cardStyles.left}>
                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} style={{ width: 28 }} />
                <Text style={[cardStyles.title, { color: colors.text }]}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
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
              fontFamily: FONTS.bodySemiBold, fontSize: 20, color: colors.text,
              textAlign: 'center', marginBottom: 8,
            }}>
              Delete Account
            </Text>

            <Text style={{
              fontFamily: FONTS.body, fontSize: 14, color: colors.textDim,
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
                <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: colors.text }}>
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

      <ActionModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ ...alertModal, visible: false })}
      />

      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => !clearing && setShowClearModal(false)}
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
              backgroundColor: clearType === 'cache' ? '#2596BE20' : '#FF4D4D20',
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name={clearType === 'cache' ? 'trash-bin-outline' : 'server-outline'} size={28} color={clearType === 'cache' ? '#2596BE' : '#FF4D4D'} />
            </View>

            <Text style={{
              fontFamily: FONTS.bodySemiBold, fontSize: 20, color: colors.text,
              textAlign: 'center', marginBottom: 4,
            }}>
              {clearType === 'cache' ? 'Clear Cache' : 'Clear All Data'}
            </Text>

            <View style={{ width: '100%', backgroundColor: colors.inputBg, borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 20, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted }}>{clearType === 'cache' ? 'Cache Size' : 'Data Size'}</Text>
                <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: colors.text }}>{clearType === 'cache' ? cacheSize : dataSize || '...'}</Text>
              </View>
            </View>

            <Text style={{
              fontFamily: FONTS.body, fontSize: 13, color: colors.textDim,
              textAlign: 'center', lineHeight: 18, marginBottom: 20,
            }}>
              {clearType === 'cache'
                ? 'This will clear cached preferences and temporary data. Your account will not be affected.'
                : 'This will remove all locally stored data. Your server data will not be affected.'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setShowClearModal(false)}
                style={{
                  flex: 1, borderRadius: 16, paddingVertical: 14,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0',
                  alignItems: 'center',
                }}
                disabled={clearing}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: colors.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClear}
                disabled={clearing}
                style={{
                  flex: 1, borderRadius: 16, paddingVertical: 14,
                  backgroundColor: clearType === 'cache' ? '#2596BE' : '#FF4444',
                  alignItems: 'center', opacity: clearing ? 0.6 : 1,
                }}
                activeOpacity={0.8}
              >
                {clearing ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' }}>
                    {clearType === 'cache' ? 'Clear' : 'Clear All'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
  },
});

const sectionStyles = StyleSheet.create({
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 28,
    marginLeft: 4,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginTop: 1,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 56,
  },
});
