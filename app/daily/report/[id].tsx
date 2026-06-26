import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_URL } from '../../../utils/api';
import { getToken } from '../../../utils/tokenStorage';
import { formatDateWithWeekday as formatDate } from '../../../utils/datetime';

const { width: SCREEN_W } = Dimensions.get('window');
const coachAvatarSource = require('../../../assets/coach/fit-cartoon-character-training.png');

const cleanText = (value?: string) => {
  if (!value) return '';
  return String(value).replace(/\r/g, '').trim();
};

function SkeletonBlock({ width, height, style, isDark }: any) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height: height || 14,
          borderRadius: 8,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Bubble wrapper: coach message bubble ──
function CoachBubble({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[S.bubble, style]}>{children}</View>;
}

// ── Stat pill ──
function StatPill({ icon, iconColor, value, label, colors }: any) {
  return (
    <View style={S.statPill}>
      <View style={[S.statIconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[S.statPillValue, { color: colors.text }]}>{value}</Text>
      <Text style={[S.statPillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function WorkoutReportScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pollFailed, setPollFailed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [workoutId, setWorkoutId] = useState<number | null>(null);

  const [progressPct, setProgressPct] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [fullContent, setFullContent] = useState<any>(null);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  const scrollRef = useRef<ScrollView>(null);
  const typingOpacity = useRef(new Animated.Value(0.4)).current;
  const regenerateScale = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, SCREEN_W - 48],
  });
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    if (pollTimeout.current) { clearTimeout(pollTimeout.current); pollTimeout.current = null; }
    setIsTyping(false); setRegenerating(false); setPollFailed(false);
  }, []);

  const showSuccessModal = useCallback(() => {
    setShowSuccess(true);
    successOpacity.setValue(0);
    Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(successOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setShowSuccess(false));
    }, 2500);
  }, []);

  const startPoll = useCallback((onComplete?: () => void) => {
    const done = () => {
      setIsTyping(false); setRegenerating(false); setPollFailed(false);
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
      if (pollTimeout.current) { clearTimeout(pollTimeout.current); pollTimeout.current = null; }
    };
    let timedOut = false;
    pollTimeout.current = setTimeout(() => { timedOut = true; done(); setPollFailed(true); }, 120000);
    pollTimer.current = setInterval(async () => {
      try {
        const t2 = await getToken();
        const r2 = await axios.get(`${API_URL}/daily/reports/${id}`, { headers: { Authorization: `Bearer ${t2}` } });
        if (r2.data.progress_pct != null) {
          setProgressPct(r2.data.progress_pct);
          Animated.timing(progressAnim, { toValue: r2.data.progress_pct, duration: 500, useNativeDriver: false }).start();
        }
        if (r2.data.current_phase) setCurrentPhase(r2.data.current_phase);
        if (r2.data.full_content) setFullContent(r2.data.full_content);
        if (r2.data.status === 'completed') {
          setReport(r2.data);
          setProgressPct(100);
          Animated.timing(progressAnim, { toValue: 100, duration: 300, useNativeDriver: false }).start();
          done();
          onComplete?.();
        }
      } catch { if (timedOut) return; }
    }, 2000);
  }, [id]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isTyping) {
      animation = Animated.loop(Animated.sequence([
        Animated.timing(typingOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(typingOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]));
      animation.start();
    } else typingOpacity.setValue(0.4);
    return () => animation?.stop();
  }, [isTyping]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/daily/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setReport(res.data);
        setWorkoutId(res.data.daily_workout_id);
        if (res.data.full_content) setFullContent(res.data.full_content);
        if (res.data.progress_pct != null) {
          setProgressPct(res.data.progress_pct);
          Animated.timing(progressAnim, { toValue: res.data.progress_pct, duration: 300, useNativeDriver: false }).start();
        }
        if (res.data.current_phase) setCurrentPhase(res.data.current_phase);
        if (res.data.status === 'generating') { setIsTyping(true); startPoll(showSuccessModal); }
      } catch (err) { console.error('Failed to load report:', err); }
      finally { setLoading(false); }
    };
    fetchReport();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
  }, [id, startPoll, showSuccessModal]);

  const initialContentLoaded = useRef(false);
  useEffect(() => {
    if (fullContent && isTyping && initialContentLoaded.current && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
    if (fullContent && !initialContentLoaded.current) initialContentLoaded.current = true;
  }, [fullContent, isTyping]);

  const toggleExercise = (name: string) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true); setIsTyping(true); setPollFailed(false);
    try {
      const token = await getToken();
      const genRes = await axios.post(
        `${API_URL}/daily/workouts/${workoutId}/generate-report`,
        { force: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (genRes.data.report_id) router.replace(`/daily/report/${genRes.data.report_id}`);
    } catch (err) { console.error('Failed to regenerate report:', err); clearPoll(); }
  };

  const durationMin = report?.total_duration_seconds ? `${Math.round((report.total_duration_seconds || 0) / 60)} min` : '-';
  const volumeKg = report?.total_volume ? `${Math.round(Number(report.total_volume)).toLocaleString()} kg` : '-';
  const cals = report?.calories_burned ? `${report.calories_burned} kcal` : '-';
  const displayDate = report ? formatDate(report.workout_date) : '';

  const oldSummary = cleanText(report?.summary);
  const oldWins = report?.good_things ? cleanText(report.good_things).split('\n').filter(Boolean) : [];
  const oldImprove = report?.areas_to_improve ? cleanText(report.areas_to_improve).split('\n').filter(Boolean) : [];
  const oldRecommendations = report?.recommendations ? cleanText(report.recommendations).split('\n').filter(Boolean) : [];

  const isLegacy = !fullContent && report?.status === 'completed';
  const isGenerating = (report?.status === 'generating' || isTyping) && !pollFailed;
  const isDone = report?.status === 'completed' || (fullContent && !isGenerating);

  const hasContent = (key: string) =>
    fullContent && fullContent[key] && (
      (Array.isArray(fullContent[key]) && fullContent[key].length > 0) ||
      (typeof fullContent[key] === 'string' && fullContent[key].trim().length > 0)
    );

  // ── BG tint helpers ──
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const tintBg = (hex: string) =>
    isDark ? hex + '14' : hex + '0F';
  const tintBorder = (hex: string) =>
    isDark ? hex + '28' : hex + '22';

  // ── Avatar row helper ──
  const AvatarRow = ({ children }: { children: React.ReactNode }) => (
    <View style={S.msgRow}>
      <Image source={coachAvatarSource} style={S.avatar} />
      <View style={S.msgCol}>{children}</View>
    </View>
  );

  const SenderLabel = () => (
    <Text style={[S.senderLabel, { color: colors.textMuted }]}>Coach Spotty</Text>
  );

  // ────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[S.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!report && !pollFailed) {
    return (
      <View style={[S.center, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textDim} />
        <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: colors.textMuted }}>Report not found</Text>
      </View>
    );
  }

  if (pollFailed && !fullContent) {
    return (
      <View style={[S.center, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors.text, marginTop: 8 }}>Generation Failed</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 260, marginTop: 4 }}>
          Coach Spotty couldn't generate your report. This might be due to server load or missing data.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setPollFailed(false); setLoading(true); setReport(null);
            const retry = async () => {
              try {
                const token = await getToken();
                const genRes = await axios.post(`${API_URL}/daily/workouts/${workoutId}/generate-report`, {}, { headers: { Authorization: `Bearer ${token}` } });
                if (genRes.data.report_id) router.replace(`/daily/report/${genRes.data.report_id}`);
              } catch {}
              setLoading(false);
            };
            retry();
          }}
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 14 }}
        >
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' }}>Retry Generation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ── */}
      <View style={[S.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: cardBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[S.headerBtn, { backgroundColor: colors.inputBg }]}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={S.headerCenter}>
          <View style={S.avatarWrap}>
            <Image source={coachAvatarSource} style={S.headerAvatar} />
            <View style={S.onlineDot} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[S.headerName, { color: colors.text }]}>Coach Spotty</Text>
            {isGenerating
              ? <Text style={[S.headerSub, { color: colors.primary }]}>Analyzing your workout…</Text>
              : <Text style={[S.headerSub, { color: '#10B981' }]}>Ready</Text>
            }
          </View>
        </View>

        {isDone ? (
          <TouchableOpacity
            onPress={() => router.push(`/daily/view/${report.daily_workout_id}`)}
            style={[S.headerBtn, { backgroundColor: colors.inputBg }]}
            activeOpacity={0.75}
          >
            <Ionicons name="open-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
      </View>

      {/* ── SCROLL ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[S.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── GENERATING SKELETONS ─── */}
        {isGenerating && (
          <>
            {/* Progress */}
            <View style={S.progressWrap}>
              <View style={[S.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Animated.View style={[S.progressFill, { width: progressBarWidth }]} />
              </View>
              <View style={S.progressLabels}>
                <Text style={[S.phaseText, { color: colors.textMuted }]}>{currentPhase || 'Analyzing your workout…'}</Text>
                <Text style={[S.phasePct, { color: colors.primary }]}>{progressPct}%</Text>
              </View>
            </View>

            {[
              [[80, 10], [100, 10], [85, 10], [60, 10]],
              [[100, 10], [70, 10]],
              [[60, 12], [100, 10], [90, 10], [80, 10]],
              [[35, 10], [100, 10], [100, 10], [75, 10]],
            ].map((lines, gi) => (
              <View key={gi} style={[S.msgRow, { marginBottom: 14 }]}>
                <SkeletonBlock isDark={isDark} width={34} height={34} style={{ borderRadius: 17, marginRight: 10, flexShrink: 0 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock isDark={isDark} width={70} height={9} style={{ marginBottom: 8 }} />
                  <View style={[S.skeletonCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                    {lines.map(([w, h], li) => (
                      <SkeletonBlock key={li} isDark={isDark} width={`${w}%`} height={h} style={li > 0 ? { marginTop: 7 } : undefined} />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ─── COMPLETED ─── */}
        {isDone && (
          <>
            {/* Date divider */}
            <View style={S.dividerRow}>
              <View style={[S.dividerLine, { backgroundColor: cardBorder }]} />
              <View style={[S.dividerPill, { backgroundColor: colors.card, borderColor: cardBorder }]}>
                <Ionicons name="barbell-outline" size={11} color={colors.textDim} style={{ marginRight: 4 }} />
                <Text style={[S.dividerText, { color: colors.textDim }]}>{displayDate}</Text>
              </View>
              <View style={[S.dividerLine, { backgroundColor: cardBorder }]} />
            </View>

            {/* Greeting bubble */}
            <AvatarRow>
              <SenderLabel />
              <CoachBubble style={{ backgroundColor: tintBg('#2596BE'), borderColor: tintBorder('#2596BE') }}>
                <Text style={[S.bubbleText, { color: colors.text }]}>
                  Hey! Here's my full coaching analysis for your session. Let's break it down. 💪
                </Text>
              </CoachBubble>
            </AvatarRow>

            {/* Stats card */}
            <View style={[S.statsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={S.statsCardHeader}>
                <Ionicons name="pulse-outline" size={15} color={colors.primary} />
                <Text style={[S.statsCardTitle, { color: colors.textMuted }]}>Session Stats</Text>
              </View>
              <View style={S.statsRow}>
                <StatPill icon="time-outline" iconColor={colors.primary} value={durationMin} label="Duration" colors={colors} />
                <View style={[S.statsSep, { backgroundColor: cardBorder }]} />
                <StatPill icon="barbell-outline" iconColor="#10B981" value={volumeKg} label="Volume" colors={colors} />
                <View style={[S.statsSep, { backgroundColor: cardBorder }]} />
                <StatPill icon="flame-outline" iconColor="#EF4444" value={cals} label="Burned" colors={colors} />
              </View>
            </View>

            {/* ─── LEGACY FORMAT ─── */}
            {isLegacy && (
              <>
                {oldSummary ? (
                  <View style={S.msgRowGrouped}>
                    <CoachBubble style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                        <Text style={[S.bubbleLabel, { color: colors.primary }]}>Session Summary</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{oldSummary}</Text>
                    </CoachBubble>
                  </View>
                ) : null}

                {oldWins.length > 0 && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#10B981'), borderColor: tintBorder('#10B981') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={[S.bubbleLabel, { color: '#10B981' }]}>Highlights</Text>
                      </View>
                      {oldWins.map((w, i) => (
                        <View key={i} style={[S.listRow, i === 0 && { marginTop: 10 }]}>
                          <View style={[S.listDot, { backgroundColor: '#10B981' }]} />
                          <Text style={[S.listText, { color: colors.text }]}>{w}</Text>
                        </View>
                      ))}
                    </CoachBubble>
                  </AvatarRow>
                )}

                {oldImprove.length > 0 && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#F59E0B'), borderColor: tintBorder('#F59E0B') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="trending-up" size={14} color="#F59E0B" />
                        <Text style={[S.bubbleLabel, { color: '#F59E0B' }]}>Areas to Improve</Text>
                      </View>
                      {oldImprove.map((item, i) => (
                        <View key={i} style={[S.listRow, i === 0 && { marginTop: 10 }]}>
                          <View style={[S.listDot, { backgroundColor: '#F59E0B' }]} />
                          <Text style={[S.listText, { color: colors.text }]}>{item}</Text>
                        </View>
                      ))}
                    </CoachBubble>
                  </AvatarRow>
                )}

                {oldRecommendations.length > 0 && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#8B5CF6'), borderColor: tintBorder('#8B5CF6') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="bulb-outline" size={14} color="#8B5CF6" />
                        <Text style={[S.bubbleLabel, { color: '#8B5CF6' }]}>Recommendations</Text>
                      </View>
                      {oldRecommendations.map((r, i) => (
                        <View key={i} style={[S.listRow, i === 0 && { marginTop: 10 }]}>
                          <View style={[S.numChip, { backgroundColor: '#8B5CF6' }]}>
                            <Text style={S.numChipText}>{i + 1}</Text>
                          </View>
                          <Text style={[S.listText, { color: colors.text }]}>{r}</Text>
                        </View>
                      ))}
                    </CoachBubble>
                  </AvatarRow>
                )}
              </>
            )}

            {/* ─── NEW full_content FORMAT ─── */}
            {!isLegacy && (
              <>
                {/* Profile Context */}
                {hasContent('profile_context') && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#8B5CF6'), borderColor: tintBorder('#8B5CF6') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="person-circle-outline" size={14} color="#8B5CF6" />
                        <Text style={[S.bubbleLabel, { color: '#8B5CF6' }]}>Profile Context</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.profile_context}</Text>
                    </CoachBubble>
                  </AvatarRow>
                )}

                {/* Workout Summary */}
                {hasContent('workout_summary') && (
                  <View style={S.msgRowGrouped}>
                    <CoachBubble style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                        <Text style={[S.bubbleLabel, { color: colors.primary }]}>Workout Summary</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.workout_summary}</Text>
                    </CoachBubble>
                  </View>
                )}

                {/* Exercise Analyses */}
                {hasContent('exercise_analyses') && Array.isArray(fullContent.exercise_analyses) && fullContent.exercise_analyses.length > 0 && (
                  <AvatarRow>
                    <SenderLabel />
                    <View style={{ width: '100%' }}>
                      <Text style={[S.sectionTag, { color: colors.textMuted }]}>
                        <Ionicons name="fitness-outline" size={12} color={colors.textMuted} /> Exercise Breakdown
                      </Text>
                      {fullContent.exercise_analyses.map((ex: any, idx: number) => {
                        const isExpanded = expandedExercises.has(ex.name);
                        const isPositive = ex.verdict
                          ? /good|strong|consistent|solid|great|excellent/i.test(ex.verdict)
                          : false;
                        const verdictColor = isPositive ? '#10B981' : '#F59E0B';

                        return (
                          <View
                            key={idx}
                            style={[
                              S.accordionCard,
                              idx > 0 && { marginTop: 8 },
                              { backgroundColor: cardBg, borderColor: cardBorder },
                            ]}
                          >
                            {/* Accordion header */}
                            <TouchableOpacity
                              activeOpacity={0.75}
                              onPress={() => toggleExercise(ex.name)}
                              style={S.accordionHeader}
                            >
                              <View style={S.accordionTopRow}>
                                {ex.image_url ? (
                                  <Image source={{ uri: ex.image_url }} style={S.accordionExerciseImg} />
                                ) : (
                                  <View style={[S.accordionIconWrap, { backgroundColor: colors.primary + '18' }]}>
                                    <MaterialCommunityIcons name="dumbbell" size={14} color={colors.primary} />
                                  </View>
                                )}
                                <Text style={[S.accordionName, { color: colors.text }]} numberOfLines={1}>
                                  {ex.name}
                                </Text>
                              </View>
                              <View style={S.accordionBottomRow}>
                                {ex.verdict ? (
                                  <View style={[S.verdictChip, { backgroundColor: verdictColor + '18' }]}>
                                    <Text style={[S.verdictChipText, { color: verdictColor }]}>{ex.verdict}</Text>
                                  </View>
                                ) : null}
                                <View style={[S.chevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                  <Ionicons
                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={14}
                                    color={colors.textDim}
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>

                            {/* Accordion body */}
                            {isExpanded && (
                              <View style={[S.accordionBody, { borderTopColor: cardBorder }]}>
                                {ex.sets_detail ? (
                                  <View style={S.accordionSection}>
                                    <View style={S.accordionSectionHeader}>
                                      <Ionicons name="list-outline" size={12} color={colors.textDim} />
                                      <Text style={[S.accordionSectionLabel, { color: colors.textMuted }]}>Sets Performed</Text>
                                    </View>
                                    <Text style={[S.accordionSectionText, { color: colors.textMuted }]}>{ex.sets_detail}</Text>
                                  </View>
                                ) : null}
                                {ex.analysis ? (
                                  <View style={[S.accordionSection, ex.sets_detail && S.accordionSectionSpaced, { backgroundColor: colors.primary + '0A', borderRadius: 10, padding: 10 }]}>
                                    <View style={S.accordionSectionHeader}>
                                      <Ionicons name="analytics-outline" size={12} color={colors.primary} />
                                      <Text style={[S.accordionSectionLabel, { color: colors.primary }]}>Coach's Take</Text>
                                    </View>
                                    <Text style={[S.accordionSectionText, { color: colors.text }]}>{ex.analysis}</Text>
                                  </View>
                                ) : null}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </AvatarRow>
                )}

                {/* Overall Assessment */}
                {hasContent('overall_assessment') && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#10B981'), borderColor: tintBorder('#10B981') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="trophy-outline" size={14} color="#10B981" />
                        <Text style={[S.bubbleLabel, { color: '#10B981' }]}>Overall Assessment</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.overall_assessment}</Text>
                    </CoachBubble>
                  </AvatarRow>
                )}

                {/* Rest Analysis */}
                {hasContent('rest_analysis') && (
                  <View style={S.msgRowGrouped}>
                    <CoachBubble style={{ backgroundColor: tintBg('#F59E0B'), borderColor: tintBorder('#F59E0B') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="timer-outline" size={14} color="#F59E0B" />
                        <Text style={[S.bubbleLabel, { color: '#F59E0B' }]}>Rest & Recovery</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.rest_analysis}</Text>
                    </CoachBubble>
                  </View>
                )}

                {/* Skip Analysis */}
                {hasContent('skip_analysis') && !fullContent.skip_analysis.toLowerCase().includes('no exercises were skipped') && (
                  <View style={S.msgRowGrouped}>
                    <CoachBubble style={{ backgroundColor: tintBg('#EF4444'), borderColor: tintBorder('#EF4444') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                        <Text style={[S.bubbleLabel, { color: '#EF4444' }]}>Skipped Exercises</Text>
                      </View>
                      <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.skip_analysis}</Text>
                    </CoachBubble>
                  </View>
                )}

                {/* Recommendations */}
                {hasContent('recommendations') && Array.isArray(fullContent.recommendations) && fullContent.recommendations.length > 0 && (
                  <AvatarRow>
                    <SenderLabel />
                    <CoachBubble style={{ backgroundColor: tintBg('#8B5CF6'), borderColor: tintBorder('#8B5CF6') }}>
                      <View style={S.bubbleHeader}>
                        <Ionicons name="bulb-outline" size={14} color="#8B5CF6" />
                        <Text style={[S.bubbleLabel, { color: '#8B5CF6' }]}>Recommendations</Text>
                      </View>
                      {fullContent.recommendations.map((rec: string, i: number) => (
                        <View
                          key={i}
                          style={[
                            S.listRow,
                            i === 0 && { marginTop: 10 },
                            i > 0 && { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                          ]}
                        >
                          <View style={[S.numChip, { backgroundColor: '#8B5CF6' }]}>
                            <Text style={S.numChipText}>{i + 1}</Text>
                          </View>
                          <Text style={[S.listText, { color: colors.text }]}>{rec}</Text>
                        </View>
                      ))}
                    </CoachBubble>
                  </AvatarRow>
                )}
              </>
            )}

            {/* Regenerate */}
            <AvatarRow>
              <SenderLabel />
              <Animated.View style={{ transform: [{ scale: regenerateScale }], width: '100%' }}>
                <View style={[S.regenCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <View style={S.regenTop}>
                    <View style={[S.regenIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <Ionicons name="help-circle-outline" size={18} color={colors.textDim} />
                    </View>
                    <Text style={[S.regenHint, { color: colors.textMuted }]}>
                      Not satisfied with this analysis? I can take another look.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleRegenerate}
                    activeOpacity={0.85}
                    onPressIn={() => Animated.spring(regenerateScale, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()}
                    onPressOut={() => Animated.spring(regenerateScale, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
                    style={S.regenBtn}
                  >
                    <LinearGradient
                      colors={['#2596BE', '#1A7A9E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={S.regenBtnInner}
                    >
                      <Ionicons name="refresh-outline" size={15} color="#FFF" />
                      <Text style={S.regenBtnText}>Re-analyze Workout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </AvatarRow>
          </>
        )}
      </ScrollView>

      {/* ── SUCCESS OVERLAY ── */}
      {showSuccess && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', opacity: successOpacity },
          ]}
        >
          <View style={[S.successCard, { backgroundColor: colors.card, borderColor: cardBorder }]}>
            <View style={S.successIcon}>
              <Ionicons name="checkmark" size={28} color="#10B981" />
            </View>
            <Text style={[S.successTitle, { color: colors.text }]}>Report Generated!</Text>
            <Text style={[S.successSub, { color: colors.textMuted }]}>Coach Spotty has analyzed your workout</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  avatarWrap: { position: 'relative' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', borderWidth: 1.5, borderColor: '#FFF',
  },
  headerName: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  headerSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },

  // ── Progress ──
  progressWrap: { paddingHorizontal: 24, paddingVertical: 16 },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#2596BE' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  phaseText: { fontFamily: FONTS.body, fontSize: 12 },
  phasePct: { fontFamily: FONTS.bodyBold, fontSize: 15 },

  // ── Scroll ──
  scroll: { paddingHorizontal: 14, paddingTop: 14, flexGrow: 1 },

  // ── Date divider ──
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginHorizontal: 12,
  },
  dividerText: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  // ── Message rows ──
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  msgRowGrouped: { paddingLeft: 44, marginBottom: 14 },
  msgCol: { flex: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginTop: 18 },
  senderLabel: { fontFamily: FONTS.bodyBold, fontSize: 10.5, marginBottom: 5, marginLeft: 2 },
  sectionTag: { fontFamily: FONTS.bodyBold, fontSize: 11, marginBottom: 8, marginLeft: 2 },

  // ── Bubble ──
  bubble: {
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
    alignSelf: 'stretch',
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbleLabel: { fontFamily: FONTS.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20 },

  // ── Stats card ──
  statsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginLeft: 44,
    marginBottom: 14,
  },
  statsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  statsCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statPill: { flex: 1, alignItems: 'center', gap: 5 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statPillValue: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  statPillLabel: { fontFamily: FONTS.body, fontSize: 10 },
  statsSep: { width: StyleSheet.hairlineWidth, height: 36 },

  // ── List items ──
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  listText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20, flex: 1 },
  numChip: {
    width: 20, height: 20, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  numChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#FFF' },

  // ── Accordion ──
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    padding: 13,
    gap: 8,
  },
  accordionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accordionBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 38,
  },
  accordionIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  accordionExerciseImg: {
    width: 28, height: 28, borderRadius: 8,
    flexShrink: 0,
  },
  accordionName: { fontFamily: FONTS.bodyBold, fontSize: 13.5, flex: 1 },
  verdictChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  verdictChipText: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.2 },
  chevronWrap: {
    width: 24, height: 24, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  accordionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 13,
    gap: 8,
  },
  accordionSection: {},
  accordionSectionSpaced: { marginTop: 10 },
  accordionSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  accordionSectionLabel: { fontFamily: FONTS.bodyBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.3 },
  accordionSectionText: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },

  // ── Skeleton card ──
  skeletonCard: { borderRadius: 14, padding: 14, gap: 0 },

  // ── Regen ──
  regenCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  regenTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  regenIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  regenHint: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, flex: 1 },
  regenBtn: { borderRadius: 12, overflow: 'hidden' },
  regenBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, paddingHorizontal: 16,
  },
  regenBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFF' },

  // ── Success ──
  successCard: {
    borderRadius: 24, borderWidth: 1,
    paddingVertical: 32, paddingHorizontal: 40,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
  },
  successIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#10B98118',
    justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { fontFamily: FONTS.heading, fontSize: 20 },
  successSub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center' },
});