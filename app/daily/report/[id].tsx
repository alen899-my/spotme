import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const coachAvatarSource = require('../../../assets/coach/fit-cartoon-character-training.png');

type ReportSection = {
  title: string;
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  body?: string;
};

const sectionAccent = {
  summary: '#2596BE',
  wins: '#10B981',
  improve: '#F59E0B',
  plan: '#8B5CF6',
};

const cleanText = (value?: string) => {
  if (!value) return '';
  return String(value)
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();
};

const splitAdvice = (value?: string) => {
  const text = cleanText(value);
  if (!text) return [];

  const lineItems = text
    .split('\n')
    .map(line => line.replace(/^\s*[-*•]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems;

  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(item => item.trim())
    .filter(Boolean);
};

const formatDate = (value?: string) => {
  if (!value) return 'Workout session';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function StatTile({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function AdviceSection({
  section,
  colors,
  isDark,
}: {
  section: ReportSection;
  colors: any;
  isDark: boolean;
}) {
  const items = splitAdvice(section.body);

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${section.color}1A` }]}>
          <Ionicons name={section.icon} size={19} color={section.color} />
        </View>
        <View style={styles.sectionTitleWrap}>
          <Text style={[styles.sectionEyebrow, { color: section.color }]}>{section.eyebrow}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
        </View>
      </View>

      {items.length > 0 ? (
        <View style={styles.adviceList}>
          {items.map((item, index) => (
            <View
              key={`${section.title}-${index}-${item.slice(0, 12)}`}
              style={[
                styles.adviceItem,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEF2F7',
                },
              ]}
            >
              <View style={[styles.adviceBullet, { backgroundColor: section.color }]} />
              <Text style={[styles.adviceText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>No notes available yet.</Text>
      )}
    </View>
  );
}

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

  const durationMin = report.total_duration_seconds
    ? `${Math.round((report.total_duration_seconds || 0) / 60)} min`
    : '-';
  const volumeKg = report.total_volume ? `${Math.round(Number(report.total_volume)).toLocaleString()} kg` : '-';
  const cals = report.calories_burned ? `${report.calories_burned} kcal` : '-';
  const displayDate = formatDate(report.workout_date);
  const summary = cleanText(report.summary);

  const sections: ReportSection[] = [
    {
      title: 'What went well',
      eyebrow: 'Wins',
      icon: 'checkmark-circle-outline',
      color: sectionAccent.wins,
      body: report.good_things,
    },
    {
      title: 'Where to improve',
      eyebrow: 'Focus',
      icon: 'trending-up-outline',
      color: sectionAccent.improve,
      body: report.areas_to_improve,
    },
    {
      title: 'Coach recommendations',
      eyebrow: 'Next session',
      icon: 'bulb-outline',
      color: sectionAccent.plan,
      body: report.recommendations,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? colors.inputBg : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workout Analysis</Text>
        <TouchableOpacity
          onPress={() => router.push(`/daily/view/${report.daily_workout_id}`)}
          style={[
            styles.viewWorkoutBtn,
            {
              backgroundColor: isDark ? colors.inputBg : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="open-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroStage}>
          <LinearGradient
            colors={isDark ? ['#092532', '#0D0D0D'] : ['#D9F4FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: colors.border }]}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroKicker, { color: isDark ? '#87D9F3' : colors.primary }]}>Workout report</Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Coach analysis</Text>
              </View>

              <Text style={[styles.heroSummary, { color: isDark ? 'rgba(241,245,249,0.78)' : '#334155' }]}>
                {summary || 'No summary available for this report.'}
              </Text>

              <TouchableOpacity
                onPress={() => router.push(`/daily/view/${report.daily_workout_id}`)}
                style={[styles.sessionLink, { backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.72)' }]}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.sessionDate, { color: colors.text }]}>{displayDate}</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <Image source={coachAvatarSource} style={styles.coachCharacter} />
        </View>

        <View style={styles.statsGrid}>
          <StatTile icon="time-outline" label="Duration" value={durationMin} color={colors.primary} colors={colors} />
          <StatTile icon="barbell-outline" label="Volume" value={volumeKg} color="#10B981" colors={colors} />
          <StatTile icon="flame-outline" label="Energy" value={cals} color="#EF4444" colors={colors} />
        </View>

        {sections.map(section => (
          <AdviceSection key={section.title} section={section} colors={colors} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 22,
    letterSpacing: 0,
  },
  viewWorkoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { padding: 16, paddingTop: 6, paddingBottom: 40, flexGrow: 1 },
  heroStage: {
    position: 'relative',
    minHeight: 214,
    marginBottom: 2,
    overflow: 'visible',
  },
  hero: {
    width: '70%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    minHeight: 196,
    overflow: 'hidden',
  },
  heroContent: {
    width: '100%',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  coachCharacter: {
    position: 'absolute',
    right: -12,
    bottom: -6,
    width: 170,
    height: 204,
    resizeMode: 'contain',
    zIndex: 5,
  },
  heroCopy: { flex: 1 },
  heroKicker: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    letterSpacing: 0,
    lineHeight: 29,
  },
  heroSummary: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  sessionLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  sessionDate: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5 },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    minHeight: 102,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 3,
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleWrap: { flex: 1 },
  sectionEyebrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
  },
  adviceList: { gap: 8 },
  adviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  adviceBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  adviceText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 21,
  },
  emptySectionText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
