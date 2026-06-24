import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator, Animated, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OptimizedImage from '../../components/ui/OptimizedImage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const CACHE_KEY = 'cached_notifications_list';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load cache on mount for instant rendering
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setNotifications(JSON.parse(cached));
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load notifications cache:', err);
      }
    })();
  }, []);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent && notifications.length === 0) {
        setLoading(true);
      }
      const token = await getToken();
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data.notifications || [];
      setNotifications(list);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(true); // Silent update on focus
    }, [notifications.length])
  );

  const handleRead = async (id: number) => {
    try {
      const token = await getToken();
      await axios.post(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      setNotifications(updated);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleReadAll = async () => {
    try {
      const token = await getToken();
      await axios.post(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(true);
    setRefreshing(false);
  };

  const getBadgeDetails = (type: string) => {
    switch (type) {
      case 'follow_request':
        return { icon: 'person-add' as const, color: '#3B82F6' };
      case 'follow_accept':
      case 'follow_accepted':
        return { icon: 'checkmark-circle' as const, color: '#10B981' };
      case 'workout_report':
        return { icon: 'barbell' as const, color: '#F59E0B' };
      case 'water_reminder':
        return { icon: 'water' as const, color: '#2596BE' };
      default:
        return { icon: 'notifications' as const, color: colors.primary };
    }
  };

  const s = makeStyles(colors, isDark);

  // Skeleton screen rendering
  const SkeletonItem = () => {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    return (
      <View style={[s.notifCard, { opacity: 0.85 }]}>
        <Animated.View style={[s.avatarPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', opacity: pulseAnim }]} />
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <Animated.View style={{ height: 14, width: '70%', borderRadius: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', opacity: pulseAnim }} />
          <Animated.View style={{ height: 10, width: '35%', borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', opacity: pulseAnim }} />
        </View>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </View>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={[1, 2, 3, 4, 5]}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={s.listContent}
        renderItem={() => <SkeletonItem />}
      />
    </View>
  );

  if (loading && notifications.length === 0) {
    return renderSkeleton();
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </TouchableOpacity>
        
        <View style={s.headerTitleWrap}>
          <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badgeCount}>
              <Text style={s.badgeCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleReadAll} style={s.readAllBtn} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={16} color={isDark ? colors.primary : '#FFF'} />
            <Text style={[s.readAll, { color: isDark ? colors.primary : '#FFF' }]}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <LinearGradient
              colors={isDark ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)'] : ['#F1F5F9', '#E2E8F0']}
              style={s.emptyIconContainer}
            >
              <Ionicons name="notifications-outline" size={36} color={colors.textDim} />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>When you receive notifications, they'll show up here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getBadgeDetails(item.type);
          return (
            <TouchableOpacity
              style={[
                s.notifCard,
                !item.is_read && s.unreadCard,
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={35}
                tint={isDark ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, s.cardRadius]}
              />
              <LinearGradient
                colors={(!item.is_read
                  ? [badge.color + '18', badge.color + '04']
                  : ['rgba(255,255,255,0.04)', 'transparent']
                ) as [string, string]}
                style={[StyleSheet.absoluteFill, s.cardRadius]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'transparent'] as [string, string]}
                style={[StyleSheet.absoluteFill, s.cardRadius]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.25, y: 0.5 }}
                pointerEvents="none"
              />

              {/* Icon / Avatar Box */}
              <View style={s.avatarContainer}>
                {item.from_user_pic ? (
                  <OptimizedImage uri={item.from_user_pic} style={s.avatar} />
                ) : (
                  <LinearGradient
                    colors={[badge.color + '25', badge.color + '08']}
                    style={s.avatarPlaceholder}
                  >
                    <Ionicons name={badge.icon} size={18} color={badge.color} />
                  </LinearGradient>
                )}
                {/* Micro-badge indicator */}
                <View style={[s.badgeIconWrap, { backgroundColor: badge.color }]}>
                  <Ionicons name={badge.icon} size={7} color="#FFF" />
                </View>
              </View>

              {/* Message text */}
              <View style={s.notifContent}>
                <Text style={[s.notifMessage, { color: colors.text }]}>
                  {item.message}
                </Text>
                <Text style={[s.notifTime, { color: colors.textDim }]}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>

              {/* Chevron arrow for actions */}
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textDim}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          );
        }}
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

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    backgroundColor: isDark ? colors.bg : colors.primary,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, letterSpacing: 0.5 },
  badgeCount: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: { color: '#FFF', fontSize: 10, fontFamily: FONTS.bodyBold },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(37,150,190,0.1)' : 'rgba(255,255,255,0.16)',
  },
  readAll: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  listContent: { padding: 14, paddingBottom: 40, flexGrow: 1 },
  
  // Empty State Layout
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 28 },
  emptyIconContainer: {
    width: 72, height: 72, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 18, marginBottom: 6 },
  emptyText: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', opacity: 0.7, lineHeight: 18 },

  // Notification Cards
  cardRadius: { borderRadius: 16 },
  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10, marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    borderColor: 'rgba(37,150,190,0.25)',
  },

  // Avatar + Icon Container
  avatarContainer: { position: 'relative' },
  avatar: { width: 36, height: 36, borderRadius: 12 },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeIconWrap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notifContent: { flex: 1, marginLeft: 10, marginRight: 4 },
  notifMessage: { fontFamily: FONTS.bodySemiBold, fontSize: 12, lineHeight: 16 },
  notifTime: { fontFamily: FONTS.body, fontSize: 10, marginTop: 3 },
});
