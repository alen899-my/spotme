import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function WorkoutReportScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await axios.get(`${API_URL}/daily/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReport(res.data);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textDim} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Report not found</Text>
      </View>
    );
  }

  const durationMin = Math.round((report.total_duration_seconds || 0) / 60);
  const volumeKg = report.total_volume ? `${Math.round(Number(report.total_volume)).toLocaleString()} kg` : '—';
  const cals = report.calories_burned || '—';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: isDark ? colors.bg : colors.primary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <MaterialCommunityIcons name="clipboard-text" size={28} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Workout Analysis</Text>
        </View>

        {/* Session link */}
        <TouchableOpacity
          onPress={() => router.push(`/daily/view/${report.daily_workout_id}`)}
          style={[styles.sessionLink, { backgroundColor: isDark ? 'rgba(37,150,190,0.08)' : 'rgba(37,150,190,0.06)', borderColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(37,150,190,0.12)' }]}
          activeOpacity={0.7}
        >
          <View style={[styles.sessionIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionLabel, { color: colors.textMuted }]}>Session</Text>
            <Text style={[styles.sessionDate, { color: colors.text }]}>{report.workout_date || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.statVal, { color: colors.text }]}>{durationMin}m</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={16} color="#10B981" />
            <Text style={[styles.statVal, { color: colors.text }]}>{volumeKg}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flame-outline" size={16} color="#EF4444" />
            <Text style={[styles.statVal, { color: colors.text }]}>{cals}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{report.summary}</Text>
        </View>

        {/* Good Things */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Good Things</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{report.good_things}</Text>
        </View>

        {/* Areas to Improve */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Areas to Improve</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{report.areas_to_improve}</Text>
        </View>

        {/* Recommendations */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recommendations</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.text }]}>{report.recommendations}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  titleSection: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 4,
  },
  title: { fontFamily: FONTS.heading, fontSize: 24, letterSpacing: 0.5 },
  date: { fontFamily: FONTS.body, fontSize: 12, marginBottom: 16 },
  sessionLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16,
  },
  sessionIcon: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  sessionLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 1, marginBottom: 1 },
  sessionDate: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12,
  },
  statVal: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 15 },
  cardBody: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21 },
});
