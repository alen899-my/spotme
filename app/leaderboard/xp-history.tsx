import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { P } from '../../constants/homeTheme';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

export default function XPHistoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [xpLog, setXpLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchXpLog();
  }, []);

  const fetchXpLog = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`${API_URL}/leaderboard/xp-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setXpLog(data);
    } catch (err) {
      console.error('Error fetching XP log:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>XP History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="small" color={P.cta} style={{ paddingVertical: 40 }} />
        ) : xpLog.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center', paddingVertical: 40 }]}>
            No XP transactions yet
          </Text>
        ) : (
          xpLog.map((entry: any, idx: number) => {
            const amount = entry.amount;
            const color = amount >= 100 ? '#8B5CF6' :
                          amount >= 50  ? '#F59E0B' :
                          amount >= 20  ? '#10B981' :
                          amount >= 10  ? '#3B82F6' :
                                          '#6B7280';
            return (
              <View key={idx} style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reason, { color: colors.text }]}>
                    {entry.reason.replace(/_/g, ' ')}
                  </Text>
                  <Text style={[styles.date, { color: colors.textMuted }]}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.badgeText, { color }]}>+{amount} XP</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reason: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  date: {
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
});
