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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const { width: SCREEN_W } = Dimensions.get('window');
const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');

const DAYS_OPTIONS = [
  { value: 3, label: '3 Days', sub: 'Balanced & efficient' },
  { value: 4, label: '4 Days', sub: 'Optimal Upper/Lower' },
  { value: 5, label: '5 Days', sub: 'PPL + Upper/Lower' },
  { value: 6, label: '6 Days', sub: 'High volume PPL/Arnold' },
];

const SPLIT_STYLES = [
  { key: 'AI Choice', label: 'AI Choice', desc: 'Coach Spotty recommends best' },
  { key: 'Push / Pull / Legs', label: 'Push / Pull / Legs', desc: 'Classic functional split' },
  { key: 'Upper / Lower', label: 'Upper / Lower', desc: 'High frequency & recovery' },
  { key: 'Arnold Split', label: 'Arnold Split', desc: 'Chest/Back, Delts/Arms, Legs' },
  { key: 'Full Body', label: 'Full Body', desc: 'Total body every session' },
  { key: 'Bro Split', label: 'Bro Split', desc: 'One muscle group per day' },
];

const DURATION_OPTIONS = [
  '45 mins',
  '60 mins',
  '75 mins',
  '90 mins',
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

      const timer1 = setTimeout(() => setProgressStep(1), 2200);
      const timer2 = setTimeout(() => setProgressStep(2), 5000);
      const timer3 = setTimeout(() => setProgressStep(3), 8000);

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
      showToast(err.response?.data?.error || 'Failed to generate workout split. Please retry.', 'error');
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

  const userGoal = userProfile?.fitness_goal || 'Muscle Hypertrophy';
  const userLevel = userProfile?.experience_level || 'Intermediate';
  const userName = userProfile?.full_name?.split(' ')[0] || userProfile?.username || 'Lifter';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── TOP HEADER ── */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: cardBorder }]}
          activeOpacity={0.75}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Split Builder</Text>
            <View style={[styles.sparkleTag, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="sparkles" size={10} color={colors.primary} />
              <Text style={[styles.sparkleTagText, { color: colors.primary }]}>SMART</Text>
            </View>
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
            <View style={[styles.avatarGlow, { borderColor: colors.primary }]}>
              <Image source={coachAvatarSource} style={styles.avatarImg} />
            </View>
          </Animated.View>

          <Text style={[styles.genTitle, { color: colors.text }]}>Coach Spotty is Designing Your Split</Text>

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
                        backgroundColor: isDone ? '#10B981' : isCurrent ? colors.primary : colors.border,
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
        /* ── SPLIT PREVIEW ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.previewScroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Program Overview Banner */}
          <View style={[styles.programCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.goalBadge, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="flame" size={12} color={colors.primary} />
                <Text style={[styles.goalBadgeText, { color: colors.primary }]}>{generatedSplit.template_goal}</Text>
              </View>
              <View style={[styles.goalBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.goalBadgeText, { color: colors.textMuted }]}>{generatedSplit.template_level}</Text>
              </View>
              <View style={[styles.goalBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.goalBadgeText, { color: colors.textMuted }]}>{generatedSplit.template_days}</Text>
              </View>
            </View>

            <Text style={[styles.programName, { color: colors.text }]}>{generatedSplit.name}</Text>
            <Text style={[styles.programDesc, { color: colors.textMuted }]}>{generatedSplit.description}</Text>
          </View>

          {/* Day Navigation Tabs */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Program Sessions</Text>
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
                  <Text style={[styles.dayTabNum, { color: isSelected ? '#FFF' : colors.textMuted }]}>
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
            <View style={{ marginTop: 16 }}>
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
                      <View style={[styles.exerciseThumbPlaceholder, { backgroundColor: colors.inputBg }]}>
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
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>Save Program to My Splits</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGeneratedSplit(null)}
              disabled={saving}
              style={[styles.tweakBtn, { borderColor: cardBorder, backgroundColor: cardBg }]}
            >
              <Ionicons name="options-outline" size={16} color={colors.text} />
              <Text style={[styles.tweakBtnText, { color: colors.text }]}>Tweak Preferences</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ── QUESTIONNAIRE FORM ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.formScroll, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Sync Card */}
          <View style={[styles.syncCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.syncAvatarBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.syncTitle, { color: colors.text }]}>Synced for {userName}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </View>
              <Text style={[styles.syncSub, { color: colors.textMuted }]}>
                Goal: <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>{userGoal}</Text> • Level: {userLevel}
              </Text>
              <Text style={[styles.syncMeta, { color: colors.primary }]}>
                Equipment & focus areas automatically optimized by AI
              </Text>
            </View>
          </View>

          {/* 1. Training Days Per Week */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Training Days Per Week</Text>
            <View style={styles.grid2}>
              {DAYS_OPTIONS.map((opt) => {
                const isSelected = daysPerWeek === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.8}
                    onPress={() => setDaysPerWeek(opt.value)}
                    style={[
                      styles.choiceCard,
                      {
                        backgroundColor: isSelected ? colors.primary + '18' : cardBg,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.choiceValue, { color: isSelected ? colors.primary : colors.text }]}>
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? colors.primary : colors.textDim}
                      />
                    </View>
                    <Text style={[styles.choiceSub, { color: colors.textMuted }]}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. Split Style Preference */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Split Style Preference</Text>
            <View style={{ gap: 8 }}>
              {SPLIT_STYLES.map((style) => {
                const isSelected = splitStyle === style.key;
                return (
                  <TouchableOpacity
                    key={style.key}
                    activeOpacity={0.8}
                    onPress={() => setSplitStyle(style.key)}
                    style={[
                      styles.styleRow,
                      {
                        backgroundColor: isSelected ? colors.primary + '18' : cardBg,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.styleRowTitle, { color: isSelected ? colors.primary : colors.text }]}>
                        {style.label}
                      </Text>
                      <Text style={[styles.styleRowDesc, { color: colors.textMuted }]}>{style.desc}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textDim}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Session Duration */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Target Workout Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((dur) => {
                const isSelected = sessionDuration === dur;
                return (
                  <TouchableOpacity
                    key={dur}
                    activeOpacity={0.8}
                    onPress={() => setSessionDuration(dur)}
                    style={[
                      styles.durChip,
                      {
                        backgroundColor: isSelected ? colors.primary : cardBg,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.durChipText, { color: isSelected ? '#FFF' : colors.text }]}>{dur}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGenerate}
            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="sparkles" size={18} color="#FFF" />
            <Text style={styles.generateBtnText}>Build My Split with AI</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

  // Center Generating State
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarGlow: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  genTitle: { fontFamily: FONTS.bodyBold, fontSize: 18, textAlign: 'center', marginBottom: 28 },
  stepsWrap: { width: '100%', gap: 14, maxWidth: 340 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 13, flex: 1, lineHeight: 18 },

  // Form Scroll
  formScroll: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  syncAvatarBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  syncTitle: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  syncSub: { fontFamily: FONTS.body, fontSize: 12.5 },
  syncMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 11, marginTop: 2 },

  formSection: { gap: 10 },
  formLabel: { fontFamily: FONTS.bodyBold, fontSize: 14 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 4,
  },
  choiceValue: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  choiceSub: { fontFamily: FONTS.body, fontSize: 11 },

  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 12,
  },
  styleRowTitle: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  styleRowDesc: { fontFamily: FONTS.body, fontSize: 11.5, marginTop: 1 },

  durationRow: { flexDirection: 'row', gap: 8 },
  durChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durChipText: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  generateBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' },

  // Preview Styles
  previewScroll: { paddingHorizontal: 16, paddingTop: 16 },
  programCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  goalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
  programName: { fontFamily: FONTS.bodyBold, fontSize: 18 },
  programDesc: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 10 },
  dayTabsList: { gap: 8, paddingBottom: 4 },
  dayTab: {
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  dayTabNum: { fontFamily: FONTS.bodySemiBold, fontSize: 10.5 },
  dayTabTitle: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  sessionHeaderBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  sessionHeaderName: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  targetMusclesText: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  exerciseThumb: { width: 56, height: 56, borderRadius: 10 },
  exerciseThumbPlaceholder: {
    width: 56, height: 56, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  exerciseName: { fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  exTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  exTagText: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  setsRepsText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  restTimeText: { fontFamily: FONTS.body, fontSize: 11 },

  previewActions: { marginTop: 24, gap: 10 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#FFF' },
  tweakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tweakBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13 },
});
