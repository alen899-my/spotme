import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));

  const handleRead = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleReadAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationPress = (item: any) => {
    handleRead(item.id);
    if (item.type === 'workout_report') {
      if (item.reference_id) {
        router.push(`/daily/report/${item.reference_id}`);
      } else {
        router.push('/daily/reports');
      }
    } else if (item.from_user_id) {
      router.push(`/profile/${item.from_user_id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow_request': return 'person-add';
      case 'follow_accept': return 'person-add';
      case 'follow_accepted': return 'checkmark-circle';
      case 'workout_report': return 'clipboard-outline';
      default: return 'notifications';
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
      {/* Header */}
      <View style={[
        s.header,
        {
          backgroundColor: isDark ? colors.bg : colors.primary,
          paddingTop: insets.top,
          borderBottomWidth: isDark ? 1 : 0,
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={handleReadAll}>
            <Text style={[s.readAll, { color: isDark ? colors.primary : '#FFF' }]}>Read All</Text>
          </TouchableOpacity>
        )}
        {!notifications.some(n => !n.is_read) && <View style={{ width: 60 }} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textDim} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.notifCard, {
              backgroundColor: item.is_read ? colors.card : (isDark ? 'rgba(37,150,190,0.08)' : 'rgba(37,150,190,0.05)'),
              borderColor: isDark ? colors.border : 'rgba(37,150,190,0.18)',
            }]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            <View style={[s.notifIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(37,150,190,0.1)' }]}>
              <Ionicons name={getIcon(item.type) as any} size={22} color={colors.primary} />
            </View>
            <View style={s.notifContent}>
              <View style={s.notifRow}>
                {item.from_user_pic ? (
                  <Image source={{ uri: item.from_user_pic }} style={s.notifAvatar} />
                ) : null}
                <Text style={[s.notifMessage, { color: colors.text }]} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>
              <Text style={[s.notifTime, { color: colors.textMuted }]}>
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>
            {!item.is_read && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 22, color: colors.text, letterSpacing: 1 },
  readAll: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 10,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  notifContent: { flex: 1, marginLeft: 12 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifAvatar: { width: 24, height: 24, borderRadius: 12 },
  notifMessage: { fontFamily: FONTS.body, fontSize: 13, flex: 1, lineHeight: 18 },
  notifTime: { fontFamily: FONTS.body, fontSize: 11, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
});
