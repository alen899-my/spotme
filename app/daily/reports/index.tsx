import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const STAGES = [
  'Analyzing your workout...',
  'Reviewing your exercises...',
  'Generating insights...',
  'Building your report...',
];

function ReportSkeleton() {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const [stageIdx, setStageIdx] = React.useState(0);
  const barAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const cycle = setInterval(() => {
      setStageIdx(prev => (prev + 1) % STAGES.length);
    }, 2500);

    const bar = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(barAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    );
    bar.start();

    return () => { pulse.stop(); clearInterval(cycle); bar.stop(); };
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '80%'],
  });

  return (
    <Animated.View style={{ opacity: pulseAnim }}>
      <View style={[skeleton.card, { backgroundColor: '#1a1a2e', borderColor: 'rgba(37,150,190,0.25)' }]}>
        <View style={skeleton.top}>
          <View style={[skeleton.circle, { backgroundColor: 'rgba(37,150,190,0.15)' }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[skeleton.bar, { width: '40%', backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={[skeleton.bar, { width: '80%', backgroundColor: 'rgba(255,255,255,0.05)' }]} />
          </View>
          <View style={[skeleton.bar, { width: 16, height: 16, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        </View>
        <View style={skeleton.stats}>
          <View style={[skeleton.bar, { width: 60, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
          <View style={[skeleton.bar, { width: 80, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        </View>
        <View style={skeleton.badge}>
          <View style={skeleton.spinner}>
            <ActivityIndicator size="small" color="#F7CB16" />
          </View>
          <Text style={skeleton.badgeText}>{STAGES[stageIdx]}</Text>
        </View>
        <View style={skeleton.progressTrack}>
          <Animated.View style={[skeleton.progressFill, { width: barWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const skeleton = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 40, height: 40, borderRadius: 12 },
  bar: { height: 12, borderRadius: 6 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 12, paddingLeft: 52 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingLeft: 52,
  },
  spinner: { width: 14, height: 14 },
  badgeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F7CB16',
  },
  badgeText: {
    fontFamily: FONTS.body, fontSize: 11,
    color: '#F7CB16', letterSpacing: 0.5,
  },
  progressTrack: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(247,203,22,0.12)',
    marginTop: 10, marginLeft: 52, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
    backgroundColor: '#F7CB16',
  },
});

export default function ReportsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const [reportsRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/daily/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/daily/reports/pending-workouts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      setReports(reportsRes.data);
      setPendingCount(pendingRes.data.length);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const generating = reports.filter(r => r.status === 'generating');

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <View style={[s.header, { backgroundColor: isDark ? colors.bg : colors.primary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Workout Reports</Text>
        <View style={{ flex: 1 }} />
        {pendingCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/daily/reports/new')}
            style={[s.newBtn, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="add" size={20} color={isDark ? colors.primary : '#FFF'} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={generating.length > 0 ? (
            <View style={{ marginBottom: 4 }}>
              {generating.map(r => (
                <ReportSkeleton key={r.id} />
              ))}
            </View>
          ) : null}
          ListFooterComponent={
            pendingCount > 0 ? (
              <TouchableOpacity
                style={[s.generateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/daily/reports/new')}
                activeOpacity={0.7}
              >
                <View style={[s.generateIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
                  <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.generateTitle, { color: colors.text }]}>Generate Reports</Text>
                  <Text style={[s.generateSub, { color: colors.textMuted }]}>
                    {pendingCount} workout{pendingCount !== 1 ? 's' : ''} without analysis
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const isGenerating = item.status === 'generating';
            if (isGenerating) return null;

            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/daily/report/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.cardTop}>
                  <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
                    <MaterialCommunityIcons name="clipboard-text" size={20} color={colors.primary} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardDate, { color: colors.textMuted }]}>{item.workout_date}</Text>
                    <Text style={[s.cardSummary, { color: colors.text }]} numberOfLines={2}>{item.summary}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <View style={s.cardStats}>
                  {item.total_duration_seconds ? (
                    <Text style={[s.stat, { color: colors.textDim }]}>
                      {Math.round(item.total_duration_seconds / 60)} min
                    </Text>
                  ) : null}
                  {item.total_volume ? (
                    <Text style={[s.stat, { color: colors.textDim }]}>
                      {Math.round(Number(item.total_volume)).toLocaleString()} kg
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            pendingCount === 0 ? (
              <View style={s.center}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={colors.textDim} />
                <Text style={[s.emptyText, { color: colors.textMuted }]}>No reports yet</Text>
                <Text style={[s.emptySub, { color: colors.textDim }]}>Complete a workout to get an AI analysis</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  newBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  cardDate: { fontFamily: FONTS.body, fontSize: 11 },
  cardSummary: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  cardStats: { flexDirection: 'row', gap: 12, marginTop: 8, paddingLeft: 52 },
  stat: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  generateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 8,
  },
  generateIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  generateTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  generateSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
});
