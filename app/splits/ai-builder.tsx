import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const { width: SCREEN_W } = Dimensions.get('window');
const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');

const DAYS_OPTIONS = [
  { value: 3, label: '3 Days / Week', sub: 'Balanced & high recovery', icon: 'calendar-outline', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { value: 4, label: '4 Days / Week', sub: 'Optimal Upper / Lower split', icon: 'barbell-outline', color: '#2596BE', bg: 'rgba(37,150,190,0.12)' },
  { value: 5, label: '5 Days / Week', sub: 'PPL + Upper/Lower power', icon: 'flame-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 6, label: '6 Days / Week', sub: 'High volume hypertrophy', icon: 'flash-outline', color: '#FF6B35', bg: 'rgba(255,107,53,0.12)' },
];

const SPLIT_STYLES = [
  {
    key: 'AI Choice',
    label: 'AI Choice (Recommended)',
    desc: 'Coach Spotty selects the scientifically proven split for your goal',
    icon: 'sparkles-outline',
    color: '#2596BE',
    bg: 'rgba(37,150,190,0.12)',
  },
  {
    key: 'Push / Pull / Legs',
    label: 'Push / Pull / Legs (PPL)',
    desc: 'Chest, Shoulders & Tris • Back & Bis • Quads & Hamstrings',
    icon: 'barbell-outline',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    key: 'Upper / Lower',
    label: 'Upper / Lower Split',
    desc: 'High weekly frequency, optimal strength progression & recovery',
    icon: 'layers-outline',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    key: 'Arnold Split',
    label: 'Arnold Golden Era Split',
    desc: 'Chest & Back • Shoulders & Arms • Quads, Hamstrings & Calves',
    icon: 'trophy-outline',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    key: 'Full Body',
    label: 'Full Body Stimulation',
    desc: 'Total body muscular stimulus on every single training day',
    icon: 'fitness-outline',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.12)',
  },
  {
    key: 'Bro Split',
    label: 'Classic Bodypart Split',
    desc: 'Deep isolation focusing on one primary muscle group per day',
    icon: 'body-outline',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
];

const DURATION_OPTIONS = [
  { value: '45 mins', label: '45 min', sub: 'Short & intense' },
  { value: '60 mins', label: '60 min', sub: 'Recommended' },
  { value: '75 mins', label: '75 min', sub: 'High volume' },
  { value: '90 mins', label: '90 min', sub: 'Extended' },
];

export default function AISplitBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  // User Profile
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Form State
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [splitStyle, setSplitStyle] = useState('AI Choice');
  const [sessionDuration, setSessionDuration] = useState('60 mins');

  // Generation & Result State
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [generatedSplit, setGeneratedSplit] = useState<any>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // Pulse animation for generation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Animate during generation
  useEffect(() => {
    if (generating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      const timer1 = setTimeout(() => setProgressStep(1), 2000);
      const timer2 = setTimeout(() => setProgressStep(2), 4500);
      const timer3 = setTimeout(() => setProgressStep(3), 7500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [generating, pulseAnim]);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgressStep(0);
    setGeneratedSplit(null);

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/workouts/splits/ai-generate`,
        {
          days_per_week: daysPerWeek,
          split_style: splitStyle,
          session_duration: sessionDuration,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000,
        }
      );

      setGeneratedSplit(res.data);
      setSelectedDayIdx(0);
    } catch (err: any) {
      console.error('Split generation error:', err);
      showToast(err.response?.data?.error || 'Failed to generate workout split. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSplit = async () => {
    if (!generatedSplit) return;
    setSaving(true);

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/workouts/splits/save-ai-split`,
        generatedSplit,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showToast('Program created successfully! 🎉', 'success');
      router.replace(`/splits/${res.data.id}` as any);
    } catch (err: any) {
      console.error('Save split error:', err);
      showToast(err.response?.data?.error || 'Failed to save workout split.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isDark ? '#11161B' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const userGoal = userProfile?.fitness_goal || 'Build Muscle';
  const userLevel = userProfile?.experience_level || 'Intermediate';
  const userName = userProfile?.full_name?.split(' ')[0] || userProfile?.username || 'Lifter';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── TOP HEADER ── */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Split Builder</Text>
            
          </View>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Personalized progressive overload routine
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ── CONTENT BODY ── */}
      {generating ? (
        /* ── GENERATING ANIMATION ── */
        <View style={styles.centerContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[styles.avatarGlow, { borderColor: colors.primary, backgroundColor: cardBg }]}>
              <Image source={coachAvatarSource} style={styles.avatarImg} />
            </View>
          </Animated.View>

          <Text style={[styles.genTitle, { color: colors.text }]}>Coach Spotty is Designing Your Split</Text>
          <Text style={[styles.genSub, { color: colors.textMuted }]}>
            Structuring volume, selecting library exercises, and tuning rest periods
          </Text>

          {/* Progress Steps */}
          <View style={styles.stepsWrap}>
            {[
              'Analyzing your fitness goal and recovery capacity...',
              'Structuring optimal training frequency and day splits...',
              'Querying SpotMe 1,300+ verified exercise library...',
              'Dialing in progressive overload sets and rep ranges...',
            ].map((stepText, idx) => {
              const isDone = progressStep > idx;
              const isCurrent = progressStep === idx;
              return (
                <View key={idx} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isDone ? '#10B981' : isCurrent ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      },
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isCurrent ? colors.text : isDone ? colors.textMuted : colors.textDim,
                        fontFamily: isCurrent ? FONTS.bodyBold : FONTS.body,
                      },
                    ]}
                  >
                    {stepText}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : generatedSplit ? (
        /* ── SPLIT PREVIEW (ONBOARDING CARD AESTHETIC) ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.previewScroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Program Overview Banner */}
          <View style={[styles.programCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={[styles.badgePill, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="flame" size={12} color={colors.primary} />
                <Text style={[styles.badgePillText, { color: colors.primary }]}>{generatedSplit.template_goal}</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.badgePillText, { color: colors.textMuted }]}>{generatedSplit.template_level}</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.badgePillText, { color: colors.textMuted }]}>{generatedSplit.template_days}</Text>
              </View>
            </View>

            <Text style={[styles.programName, { color: colors.text }]}>{generatedSplit.name}</Text>
            <Text style={[styles.programDesc, { color: colors.textMuted }]}>{generatedSplit.description}</Text>
          </View>

          {/* Day Navigation Tabs */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PROGRAM SESSIONS</Text>
            <View style={[styles.sectionLine, { backgroundColor: cardBorder }]} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsList}
          >
            {generatedSplit.sessions.map((sess: any, idx: number) => {
              const isSelected = selectedDayIdx === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDayIdx(idx)}
                  style={[
                    styles.dayTab,
                    {
                      backgroundColor: isSelected ? colors.primary : cardBg,
                      borderColor: isSelected ? colors.primary : cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.dayTabNum, { color: isSelected ? '#FFF' : colors.primary }]}>
                    Day {idx + 1}
                  </Text>
                  <Text
                    style={[styles.dayTabTitle, { color: isSelected ? '#FFF' : colors.text }]}
                    numberOfLines={1}
                  >
                    {sess.name.replace(/^Day\s*\d+\s*[-:]?\s*/i, '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Session Details & Exercises */}
          {generatedSplit.sessions[selectedDayIdx] && (
            <View style={{ marginTop: 14 }}>
              <View style={[styles.sessionHeaderBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.sessionHeaderName, { color: colors.text }]}>
                  {generatedSplit.sessions[selectedDayIdx].name}
                </Text>
                {generatedSplit.sessions[selectedDayIdx].target_muscles ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <MaterialCommunityIcons name="target" size={14} color={colors.primary} />
                    <Text style={[styles.targetMusclesText, { color: colors.primary }]}>
                      {generatedSplit.sessions[selectedDayIdx].target_muscles}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Exercises List */}
              <View style={{ gap: 10, marginTop: 12 }}>
                {generatedSplit.sessions[selectedDayIdx].exercises.map((ex: any, exIdx: number) => (
                  <View
                    key={exIdx}
                    style={[styles.exerciseCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  >
                    {ex.image_url ? (
                      <Image source={{ uri: ex.image_url }} style={styles.exerciseThumb} />
                    ) : (
                      <View style={[styles.exerciseThumbPlaceholder, { backgroundColor: isDark ? '#141E24' : '#E2E8F0' }]}>
                        <Ionicons name="barbell-outline" size={24} color={colors.textDim} />
                      </View>
                    )}

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                        {ex.name}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={[styles.exTag, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[styles.exTagText, { color: colors.primary }]}>{ex.target}</Text>
                        </View>
                        <View style={[styles.exTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.exTagText, { color: colors.textMuted }]}>{ex.equipment}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <Text style={[styles.setsRepsText, { color: colors.text }]}>
                          {ex.sets} sets × {ex.reps} reps
                        </Text>
                        <Text style={[styles.restTimeText, { color: colors.textMuted }]}>
                          ⏱️ {ex.rest_time} rest
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.previewActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveSplit}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Save Program to My Splits</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGeneratedSplit(null)}
              disabled={saving}
              style={[styles.secondaryBtn, { borderColor: cardBorder, backgroundColor: cardBg }]}
            >
              <Ionicons name="options-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Tweak Preferences</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ── QUESTIONNAIRE FORM (COMPLETE PROFILE AESTHETIC) ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.formScroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Sync Card (Matches Complete Profile Header) */}
          <View style={[styles.profileSyncCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.profileSyncAvatar, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.profileSyncName, { color: colors.text }]}>Synced for {userName}</Text>
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
              </View>
              <Text style={[styles.profileSyncDetail, { color: colors.textMuted }]}>
                Goal: <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>{userGoal}</Text> • Level: {userLevel}
              </Text>
              <Text style={[styles.profileSyncNote, { color: colors.primary }]}>
                Equipment & focus areas automatically optimized by AI
              </Text>
            </View>
          </View>

          {/* Section 1: Training Frequency */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TRAINING FREQUENCY</Text>
            <View style={[styles.sectionLine, { backgroundColor: cardBorder }]} />
          </View>

          <View style={styles.daysGrid}>
            {DAYS_OPTIONS.map((opt) => {
              const isSelected = daysPerWeek === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.82}
                  onPress={() => setDaysPerWeek(opt.value)}
                  style={[
                    styles.dayCard,
                    {
                      borderColor: isSelected ? opt.color : cardBorder,
                      backgroundColor: isSelected ? opt.bg : cardBg,
                    },
                  ]}
                >
                  <View style={[styles.dayIconWrap, { backgroundColor: isSelected ? opt.bg : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }]}>
                    <Ionicons name={opt.icon as any} size={22} color={isSelected ? opt.color : colors.textMuted} />
                  </View>
                  <Text style={[styles.dayCardLabel, { color: isSelected ? colors.text : colors.textMuted }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.dayCardSub, { color: colors.textDim }]}>{opt.sub}</Text>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Ionicons name="checkmark-circle" size={17} color={opt.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: Split Style */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SPLIT STYLE PREFERENCE</Text>
            <View style={[styles.sectionLine, { backgroundColor: cardBorder }]} />
          </View>

          <View style={{ gap: 10 }}>
            {SPLIT_STYLES.map((style) => {
              const isSelected = splitStyle === style.key;
              return (
                <TouchableOpacity
                  key={style.key}
                  activeOpacity={0.82}
                  onPress={() => setSplitStyle(style.key)}
                  style={[
                    styles.styleCard,
                    {
                      borderColor: isSelected ? style.color : cardBorder,
                      backgroundColor: isSelected ? style.bg : cardBg,
                    },
                  ]}
                >
                  <View style={[styles.styleIconWrap, { backgroundColor: isSelected ? style.bg : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') }]}>
                    <Ionicons name={style.icon as any} size={24} color={isSelected ? style.color : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.styleCardLabel, { color: isSelected ? colors.text : colors.textMuted }]}>
                      {style.label}
                    </Text>
                    <Text style={[styles.styleCardDesc, { color: colors.textDim }]}>{style.desc}</Text>
                  </View>
                  {isSelected ? (
                    <View style={[styles.styleCheckBadge, { backgroundColor: style.color }]}>
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={colors.textDim} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 3: Duration */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SESSION DURATION</Text>
            <View style={[styles.sectionLine, { backgroundColor: cardBorder }]} />
          </View>

          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((dur) => {
              const isSelected = sessionDuration === dur.value;
              return (
                <TouchableOpacity
                  key={dur.value}
                  activeOpacity={0.8}
                  onPress={() => setSessionDuration(dur.value)}
                  style={[
                    styles.durationCard,
                    {
                      backgroundColor: isSelected ? colors.primary : cardBg,
                      borderColor: isSelected ? colors.primary : cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.durationCardText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {dur.label}
                  </Text>
                  <Text style={[styles.durationCardSub, { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textDim }]}>
                    {dur.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGenerate}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
          >
            <Ionicons name="sparkles" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Build My Split with AI</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  headerSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  sparkleTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  sparkleTagText: { fontFamily: FONTS.bodyBold, fontSize: 9.5, letterSpacing: 0.5 },

  // Section Dividers (Matches Complete Profile)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },

  // Profile Sync Card
  profileSyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  profileSyncAvatar: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  profileSyncName: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  profileSyncDetail: { fontFamily: FONTS.body, fontSize: 12.5 },
  profileSyncNote: { fontFamily: FONTS.bodySemiBold, fontSize: 11, marginTop: 2 },

  // Form Scroll
  formScroll: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },

  // Days Grid (Matches Goal Grid in Onboarding)
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    position: 'relative',
    gap: 4,
  },
  dayIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  dayCardLabel: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  dayCardSub: { fontFamily: FONTS.body, fontSize: 11, lineHeight: 15 },
  selectedCheckBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Split Styles (Matches Experience Level Cards in Onboarding)
  styleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 15,
    gap: 14,
  },
  styleIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  styleCardLabel: { fontFamily: FONTS.bodyBold, fontSize: 14.5, marginBottom: 2 },
  styleCardDesc: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 16 },
  styleCheckBadge: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  // Duration Row
  durationRow: { flexDirection: 'row', gap: 8 },
  durationCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  durationCardText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  durationCardSub: { fontFamily: FONTS.body, fontSize: 9.5 },

  // Primary Button (Matches Onboarding PrimaryBtn)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14 },

  // Generating State
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarGlow: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImg: { width: 76, height: 76, borderRadius: 38 },
  genTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, textAlign: 'center', marginBottom: 4 },
  genSub: { fontFamily: FONTS.body, fontSize: 12.5, textAlign: 'center', marginBottom: 28, maxWidth: 300 },
  stepsWrap: { width: '100%', gap: 14, maxWidth: 340 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 13, flex: 1, lineHeight: 18 },

  // Preview Styles
  previewScroll: { paddingHorizontal: 16, paddingTop: 16 },
  programCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePillText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
  programName: { fontFamily: FONTS.bodyBold, fontSize: 18.5 },
  programDesc: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },

  dayTabsList: { gap: 8, paddingBottom: 6 },
  dayTab: {
    width: 124,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 11,
    gap: 2,
  },
  dayTabNum: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  dayTabTitle: { fontFamily: FONTS.bodyBold, fontSize: 12.5 },

  sessionHeaderBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  sessionHeaderName: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  targetMusclesText: { fontFamily: FONTS.bodyBold, fontSize: 11.5 },

  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    gap: 12,
  },
  exerciseThumb: { width: 58, height: 58, borderRadius: 12 },
  exerciseThumbPlaceholder: {
    width: 58, height: 58, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  exerciseName: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  exTag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  exTagText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
  setsRepsText: { fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  restTimeText: { fontFamily: FONTS.body, fontSize: 11.5 },

  previewActions: { marginTop: 24, gap: 10 },
});
