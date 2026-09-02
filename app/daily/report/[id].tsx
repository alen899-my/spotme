import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  Animated, Dimensions, TextInput, KeyboardAvoidingView,
  Platform, Keyboard, StatusBar,
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
import { useUnits } from '../../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../../utils/units';

const { width: SCREEN_W } = Dimensions.get('window');
const coachAvatarSource = require('../../../assets/coach/fit-cartoon-character-training.png');

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

const QUICK_PROMPTS = [
  { label: '💡 How to improve next session?', text: 'How can I progressively overload and improve on my next session?' },
  { label: '⏱️ Rate my rest intervals', text: 'Were my rest intervals optimal for muscle hypertrophy and strength?' },
  { label: '🏋️‍♂️ Analyze my top sets', text: 'Break down my best sets and where my muscular fatigue started accumulating.' },
  { label: '🥗 Post-workout nutrition tips', text: 'What should I eat right now to maximize recovery and protein synthesis?' },
];

const cleanText = (value?: string) => {
  if (!value) return '';
  return String(value).replace(/\r/g, '').trim();
};

// ── Inline Markdown Renderer ────────────────────────────────────────────────
// ── Neat Formatter & Markdown Cleaner ───────────────────────────────────────
function cleanRawMarkdownTokens(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s*/g, '')
    .replace(/[*_~`]/g, '');
}

function MarkdownText({ content, textColor, primaryColor, isDark }: { content: string; textColor: string; primaryColor: string; isDark: boolean }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      elements.push(<View key={`space-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Horizontal divider (---, ***, ___)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(
        <View
          key={`hr-${i}`}
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
            marginVertical: 6,
          }}
        />
      );
      continue;
    }

    // Heading #, ##, ###, ####
    if (/^#{1,6}\s+/.test(raw)) {
      const heading = raw.replace(/^#{1,6}\s+/, '').replace(/[*_`]/g, '').trim();
      elements.push(
        <Text key={`h-${i}`} style={[S.mdHeading, { color: textColor }]}>
          {heading}
        </Text>
      );
      continue;
    }

    // Bullet item (-, *, +, •, with any spacing)
    if (/^[-*+•]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*+•]\s+/, '');
      elements.push(
        <View key={`li-${i}`} style={S.mdBulletRow}>
          <Text style={[S.mdBulletDot, { color: primaryColor }]}>•</Text>
          <Text style={[S.mdBodyText, { color: textColor, flex: 1 }]}>
            {renderInlineSpans(bulletText, textColor, primaryColor, isDark)}
          </Text>
        </View>
      );
      continue;
    }

    // Numbered item (1. 2.)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <View key={`nl-${i}`} style={S.mdBulletRow}>
          <Text style={[S.mdNumPrefix, { color: primaryColor }]}>{numMatch[1]}.</Text>
          <Text style={[S.mdBodyText, { color: textColor, flex: 1 }]}>
            {renderInlineSpans(numMatch[2], textColor, primaryColor, isDark)}
          </Text>
        </View>
      );
      continue;
    }

    // Standard paragraph line
    elements.push(
      <Text key={`p-${i}`} style={[S.mdBodyText, { color: textColor }]}>
        {renderInlineSpans(trimmed, textColor, primaryColor, isDark)}
      </Text>
    );
  }

  return <View style={{ gap: 2 }}>{elements}</View>;
}

function renderInlineSpans(text: string, textColor: string, primaryColor: string, isDark: boolean) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_|`.*?`)/g);

  return parts.map((part, index) => {
    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      const inner = part.slice(2, -2).replace(/[*_]/g, '');
      return (
        <Text key={index} style={[S.mdBold, { color: textColor }]}>
          {inner}
        </Text>
      );
    }
    // Italic/Emphasis: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      const inner = part.slice(1, -1).replace(/[*_]/g, '');
      return (
        <Text key={index} style={[S.mdBold, { color: textColor }]}>
          {inner}
        </Text>
      );
    }
    // Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text
          key={index}
          style={[
            S.mdCode,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: primaryColor,
            },
          ]}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }
    const cleanChunk = cleanRawMarkdownTokens(part);
    return cleanChunk;
  });
}

// ── Animated Skeleton Block ─────────────────────────────────────────────────
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

// ── Animated 3-Dot Thinking Bubble ──────────────────────────────────────────
function ThinkingBubble({ colors, isDark }: { colors: any; isDark: boolean }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ])
      ).start();
    };
    pulse(dot1, 0);
    pulse(dot2, 140);
    pulse(dot3, 280);
  }, []);

  return (
    <View style={S.chatRow}>
      <Image source={coachAvatarSource} style={S.coachAvatar} />
      <View
        style={[
          S.coachBubble,
          {
            backgroundColor: isDark ? '#141A1E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
            borderLeftColor: colors.primary,
          },
        ]}
      >
        <View style={S.thinkingRow}>
          <Text style={[S.thinkingLabel, { color: colors.textMuted }]}>Coach Spotty is analyzing</Text>
          <View style={S.dotsWrap}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[S.dot, { backgroundColor: colors.primary, opacity: dot }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Stat Pill ───────────────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function WorkoutReportScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { unitSystem } = useUnits();

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

  // User profile for chat bubbles
  const [userProfile, setUserProfile] = useState<{ name: string; picUrl: string | null }>({ name: 'You', picUrl: null });

  // Interactive chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
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
    const fetchReport = async () => {
      try {
        const token = await getToken();
        const [reportRes, profileRes] = await Promise.all([
          axios.get(`${API_URL}/daily/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        setReport(reportRes.data);
        setWorkoutId(reportRes.data.daily_workout_id);
        if (reportRes.data.full_content) setFullContent(reportRes.data.full_content);
        if (reportRes.data.progress_pct != null) {
          setProgressPct(reportRes.data.progress_pct);
          Animated.timing(progressAnim, { toValue: reportRes.data.progress_pct, duration: 300, useNativeDriver: false }).start();
        }
        if (reportRes.data.current_phase) setCurrentPhase(reportRes.data.current_phase);
        if (reportRes.data.status === 'generating') { setIsTyping(true); startPoll(showSuccessModal); }
        if (profileRes?.data) {
          setUserProfile({
            name: profileRes.data.full_name || profileRes.data.username || 'You',
            picUrl: profileRes.data.profile_pic_url || null,
          });
        }
      } catch (err) { console.error('Failed to load report:', err); }
      finally { setLoading(false); }
    };
    fetchReport();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
    };
  }, [id, startPoll, showSuccessModal]);

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

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || sendingMessage || !workoutId) return;

    setInputValue('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: messageText,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setSendingMessage(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/daily/workouts/${workoutId}/chat`,
        {
          message: messageText,
          history: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.data?.reply || "I've reviewed your workout! Keep pushing with strong progressive overload.",
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      showToast('Could not send message. Please try again.', 'error');
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "I'm temporarily having trouble connecting. Ensure you stay well hydrated and prioritize adequate rest between heavy sets!",
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setSendingMessage(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const durationMin = report?.total_duration_seconds ? `${Math.round((report.total_duration_seconds || 0) / 60)} min` : '-';
  const volumeKg = report?.total_volume ? `${formatWeightValue(Math.round(Number(report.total_volume)), unitSystem)} ${weightUnit(unitSystem)}` : '-';
  const cals = report?.calories_burned ? `${report.calories_burned} kcal` : '-';
  const displayDate = report ? formatDate(report.workout_date) : '';

  const isGenerating = (report?.status === 'generating' || isTyping) && !pollFailed;
  const isDone = report?.status === 'completed' || (fullContent && !isGenerating);

  const cardBg = isDark ? '#11161B' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const tintBg = (hex: string) => isDark ? hex + '14' : hex + '0F';
  const tintBorder = (hex: string) => isDark ? hex + '28' : hex + '22';

  if (loading) {
    return (
      <View style={[S.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pollFailed && !fullContent) {
    return (
      <View style={[S.center, { backgroundColor: colors.bg }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: colors.text, marginTop: 8 }}>Generation Failed</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 260, marginTop: 4 }}>
          Coach Spotty couldn't generate your report. Tap below to retry.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setPollFailed(false); setLoading(true); setReport(null);
            const retry = async () => {
              try {
                const token = await getToken();
                const genRes = await axios.post(`${API_URL}/daily/workouts/${workoutId}/generate-report`, { force: true }, { headers: { Authorization: `Bearer ${token}` } });
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── TOP HEADER (BankApplication style with SpotMe Theme) ── */}
      <View style={[S.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: cardBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={S.headerCenter}>
          <View style={S.avatarWrap}>
            <Image source={coachAvatarSource} style={S.headerAvatar} />
            <View style={S.onlineDot} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[S.headerName, { color: colors.text }]}>Coach Spotty</Text>
              <View style={[S.aiChip, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="sparkles" size={10} color={colors.primary} />
                <Text style={[S.aiChipText, { color: colors.primary }]}>AI COACH</Text>
              </View>
            </View>
            {isGenerating ? (
              <Text style={[S.headerSub, { color: colors.primary }]}>Analyzing your workout…</Text>
            ) : (
              <Text style={[S.headerSub, { color: '#10B981' }]}>Online • Session Loaded</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isDone && (
            <TouchableOpacity
              onPress={() => router.push(`/daily/view/${report?.daily_workout_id}`)}
              style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="open-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleRegenerate}
            disabled={regenerating || isGenerating}
            style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 56) : 0}
      >
        {/* ── MAIN SCROLL FEED ── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[S.scroll, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Progress bar when generating */}
          {isGenerating && (
            <View style={S.progressWrap}>
              <View style={[S.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Animated.View style={[S.progressFill, { width: progressBarWidth, backgroundColor: colors.primary }]} />
              </View>
              <View style={S.progressLabels}>
                <Text style={[S.phaseText, { color: colors.textMuted }]}>{currentPhase || 'Coach Spotty is analyzing…'}</Text>
                <Text style={[S.phasePct, { color: colors.primary }]}>{progressPct}%</Text>
              </View>
            </View>
          )}

          {/* Generating Skeletons */}
          {isGenerating && (
            <View style={{ gap: 14, marginVertical: 8 }}>
              {[
                [[75, 12], [100, 10], [90, 10], [60, 10]],
                [[100, 10], [80, 10]],
                [[60, 12], [100, 10], [85, 10]],
              ].map((lines, gi) => (
                <View key={gi} style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    {lines.map(([w, h], li) => (
                      <SkeletonBlock key={li} isDark={isDark} width={`${w}%`} height={h} style={li > 0 ? { marginTop: 8 } : undefined} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Date Divider */}
          {displayDate ? (
            <View style={S.dividerRow}>
              <View style={[S.dividerLine, { backgroundColor: cardBorder }]} />
              <View style={[S.dividerPill, { backgroundColor: colors.card, borderColor: cardBorder }]}>
                <Ionicons name="barbell-outline" size={12} color={colors.textDim} style={{ marginRight: 4 }} />
                <Text style={[S.dividerText, { color: colors.textDim }]}>{displayDate}</Text>
              </View>
              <View style={[S.dividerLine, { backgroundColor: cardBorder }]} />
            </View>
          ) : null}

          {/* Welcome Message */}
          {isDone && (
            <View style={S.chatRow}>
              <Image source={coachAvatarSource} style={S.coachAvatar} />
              <View style={[S.coachBubble, { backgroundColor: tintBg(colors.primary), borderColor: tintBorder(colors.primary), borderLeftColor: colors.primary }]}>
                <Text style={[S.bubbleText, { color: colors.text }]}>
                  Hey! I've completed your post-workout coaching analysis. Here is the full technical breakdown, fatigue metrics, and recommendations! 💪
                </Text>
              </View>
            </View>
          )}

          {/* ── STATS CARD ── */}
          {isDone && (
            <View style={[S.statsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={S.statsCardHeader}>
                <Ionicons name="pulse-outline" size={15} color={colors.primary} />
                <Text style={[S.statsCardTitle, { color: colors.textMuted }]}>Session Summary Stats</Text>
              </View>
              <View style={S.statsRow}>
                <StatPill icon="time-outline" iconColor={colors.primary} value={durationMin} label="Duration" colors={colors} />
                <View style={[S.statsSep, { backgroundColor: cardBorder }]} />
                <StatPill icon="barbell-outline" iconColor="#10B981" value={volumeKg} label="Volume" colors={colors} />
                <View style={[S.statsSep, { backgroundColor: cardBorder }]} />
                <StatPill icon="flame-outline" iconColor="#EF4444" value={cals} label="Calories" colors={colors} />
              </View>
            </View>
          )}

          {/* ── FULL CONTENT SECTIONS ── */}
          {fullContent && isDone && (
            <>
              {/* Profile Context */}
              {fullContent.profile_context ? (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: tintBg('#8B5CF6'), borderColor: tintBorder('#8B5CF6'), borderLeftColor: '#8B5CF6' }]}>
                    <View style={S.bubbleHeader}>
                      <Ionicons name="person-circle-outline" size={14} color="#8B5CF6" />
                      <Text style={[S.bubbleLabel, { color: '#8B5CF6' }]}>Goal & Profile Alignment</Text>
                    </View>
                    <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.profile_context}</Text>
                  </View>
                </View>
              ) : null}

              {/* Workout Summary */}
              {fullContent.workout_summary ? (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: cardBg, borderColor: cardBorder, borderLeftColor: colors.primary }]}>
                    <View style={S.bubbleHeader}>
                      <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                      <Text style={[S.bubbleLabel, { color: colors.primary }]}>Coaching Overview</Text>
                    </View>
                    <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.workout_summary}</Text>
                  </View>
                </View>
              ) : null}

              {/* In-depth Exercise Breakdown Accordion */}
              {Array.isArray(fullContent.exercise_analyses) && fullContent.exercise_analyses.length > 0 && (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 2 }}>
                      <Ionicons name="fitness" size={14} color={colors.primary} />
                      <Text style={[S.sectionTag, { color: colors.textMuted }]}>Deep Exercise Breakdown</Text>
                    </View>

                    {fullContent.exercise_analyses.map((ex: any, idx: number) => {
                      const isExpanded = expandedExercises.has(ex.name);
                      const isPositive = ex.verdict
                        ? /good|strong|consistent|solid|great|excellent|pr/i.test(ex.verdict)
                        : false;
                      const verdictColor = isPositive ? '#10B981' : '#F59E0B';

                      return (
                        <View
                          key={idx}
                          style={[
                            S.accordionCard,
                            idx > 0 && { marginTop: 10 },
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
                                    <Text style={[S.accordionSectionLabel, { color: colors.primary }]}>Coach's Master Take</Text>
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
                </View>
              )}

              {/* Overall Assessment */}
              {fullContent.overall_assessment ? (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: tintBg('#10B981'), borderColor: tintBorder('#10B981'), borderLeftColor: '#10B981' }]}>
                    <View style={S.bubbleHeader}>
                      <Ionicons name="trophy-outline" size={14} color="#10B981" />
                      <Text style={[S.bubbleLabel, { color: '#10B981' }]}>Overall Evaluation</Text>
                    </View>
                    <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.overall_assessment}</Text>
                  </View>
                </View>
              ) : null}

              {/* Rest Analysis */}
              {fullContent.rest_analysis ? (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: tintBg('#F59E0B'), borderColor: tintBorder('#F59E0B'), borderLeftColor: '#F59E0B' }]}>
                    <View style={S.bubbleHeader}>
                      <Ionicons name="timer-outline" size={14} color="#F59E0B" />
                      <Text style={[S.bubbleLabel, { color: '#F59E0B' }]}>Rest & Recovery Patterns</Text>
                    </View>
                    <Text style={[S.bubbleText, { color: colors.text, marginTop: 8 }]}>{fullContent.rest_analysis}</Text>
                  </View>
                </View>
              ) : null}

              {/* Actionable Recommendations */}
              {Array.isArray(fullContent.recommendations) && fullContent.recommendations.length > 0 && (
                <View style={S.chatRow}>
                  <Image source={coachAvatarSource} style={S.coachAvatar} />
                  <View style={[S.coachBubble, { backgroundColor: cardBg, borderColor: cardBorder, borderLeftColor: colors.primary }]}>
                    <View style={S.bubbleHeader}>
                      <Ionicons name="bulb-outline" size={14} color={colors.primary} />
                      <Text style={[S.bubbleLabel, { color: colors.primary }]}>Key Directives for Next Session</Text>
                    </View>
                    <View style={{ gap: 8, marginTop: 10 }}>
                      {fullContent.recommendations.map((rec: string, rIdx: number) => (
                        <View key={rIdx} style={S.recRow}>
                          <View style={[S.recNum, { backgroundColor: colors.primary }]}>
                            <Text style={S.recNumText}>{rIdx + 1}</Text>
                          </View>
                          <Text style={[S.recText, { color: colors.text }]}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── CONVERSATIONAL CHAT MESSAGES ── */}
          {chatMessages.map(msg => {
            const isUser = msg.role === 'user';
            const userInitials = userProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <View
                key={msg.id}
                style={[
                  S.chatRow,
                  isUser ? S.chatRowUser : S.chatRowCoach,
                ]}
              >
                {/* Coach avatar on left */}
                {!isUser && <Image source={coachAvatarSource} style={S.coachAvatar} />}

                <View
                  style={[
                    S.chatBubble,
                    isUser
                      ? [S.userBubble, { backgroundColor: colors.primary }]
                      : [
                          S.coachBubble,
                          {
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            borderLeftColor: colors.primary,
                          },
                        ],
                  ]}
                >
                  {isUser ? (
                    <Text style={S.userBubbleText}>{msg.content}</Text>
                  ) : (
                    <MarkdownText
                      content={msg.content}
                      textColor={colors.text}
                      primaryColor={colors.primary}
                      isDark={isDark}
                    />
                  )}
                </View>

                {/* User avatar on right */}
                {isUser && (
                  <View style={[S.userAvatarCircle, { backgroundColor: colors.primary + '28' }]}>
                    {userProfile.picUrl ? (
                      <Image source={{ uri: userProfile.picUrl }} style={S.userAvatarImg} />
                    ) : (
                      <Text style={[S.userAvatarInitials, { color: colors.primary }]}>{userInitials}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Thinking Bubble while sending message */}
          {sendingMessage && <ThinkingBubble colors={colors} isDark={isDark} />}

          {/* Quick Prompt Suggestions */}
          {isDone && !sendingMessage && (
            <View style={S.quickSuggestionsWrap}>
              <Text style={[S.quickSuggestionsTitle, { color: colors.textMuted }]}>
                Ask Coach Spotty:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.quickSuggestionsList}
              >
                {QUICK_PROMPTS.map((qp, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.75}
                    onPress={() => handleSendMessage(qp.text)}
                    style={[
                      S.quickChip,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: cardBorder,
                      },
                    ]}
                  >
                    <Text style={[S.quickChipText, { color: colors.text }]}>{qp.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* ── BOTTOM INPUT BAR (BankApplication style with SpotMe Theme) ── */}
        <View
          style={[
            S.inputBarContainer,
            {
              backgroundColor: colors.card,
              borderTopColor: cardBorder,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View
            style={[
              S.inputWrap,
              {
                backgroundColor: isDark ? '#0D1115' : '#F1F5F9',
                borderColor: cardBorder,
              },
            ]}
          >
            <TextInput
              style={[S.inputField, { color: colors.text }]}
              placeholder="Ask Coach Spotty about your workout..."
              placeholderTextColor={colors.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              multiline
              maxLength={1000}
              editable={!sendingMessage}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350)}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              onPress={() => handleSendMessage()}
              disabled={!inputValue.trim() || sendingMessage}
              style={[
                S.sendBtn,
                {
                  backgroundColor: inputValue.trim() && !sendingMessage ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputValue.trim() && !sendingMessage ? '#FFFFFF' : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[S.disclaimerText, { color: colors.textDim }]}>
            Coach Spotty AI gives tailored fitness guidance • Train safely & listen to your body
          </Text>
        </View>
      </KeyboardAvoidingView>

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
            <Text style={[S.successTitle, { color: colors.text }]}>Master Report Ready!</Text>
            <Text style={[S.successSub, { color: colors.textMuted }]}>Coach Spotty has completed your full coaching breakdown</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
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
    width: 36, height: 36, borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  avatarWrap: { position: 'relative' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', borderWidth: 1.5, borderColor: '#FFF',
  },
  headerName: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  headerSub: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  aiChipText: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5 },

  // ── Progress ──
  progressWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  progressTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  phaseText: { fontFamily: FONTS.body, fontSize: 11 },
  phasePct: { fontFamily: FONTS.bodyBold, fontSize: 13 },

  // ── Scroll & Chat Rows ──
  scroll: { paddingHorizontal: 14, paddingTop: 10, flexGrow: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, marginHorizontal: 10,
  },
  dividerText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },

  chatRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  chatRowCoach: { justifyContent: 'flex-start' },
  chatRowUser: { justifyContent: 'flex-end' },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, flexShrink: 0 },

  // User avatar bubble (right side)
  userAvatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    marginLeft: 8, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  userAvatarInitials: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  chatBubble: { borderRadius: 18, padding: 13 },
  userBubble: {
    borderBottomRightRadius: 4,
    maxWidth: '75%',
  },
  userBubbleText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#FFFFFF',
  },

  coachBubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    padding: 13,
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbleLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20 },
  sectionTag: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.3 },

  // ── Stats card ──
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginLeft: 40,
    marginBottom: 12,
  },
  statsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statsCardTitle: { fontFamily: FONTS.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statPill: { flex: 1, alignItems: 'center', gap: 4 },
  statIconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statPillValue: { fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  statPillLabel: { fontFamily: FONTS.body, fontSize: 9.5 },
  statsSep: { width: StyleSheet.hairlineWidth, height: 32 },

  // ── Accordion Exercise Breakdown ──
  accordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    padding: 12,
    gap: 6,
  },
  accordionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 36,
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
  accordionName: { fontFamily: FONTS.bodyBold, fontSize: 13, flex: 1 },
  verdictChip: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 6 },
  verdictChipText: { fontFamily: FONTS.bodyBold, fontSize: 9.5, letterSpacing: 0.2 },
  chevronWrap: {
    width: 22, height: 22, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  accordionBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  accordionSection: {},
  accordionSectionSpaced: { marginTop: 8 },
  accordionSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  accordionSectionLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  accordionSectionText: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18 },

  // ── Directives / Recommendations ──
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recNum: { width: 18, height: 18, borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  recNumText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#FFF' },
  recText: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18.5, flex: 1 },

  // ── Thinking animation ──
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingLabel: { fontFamily: FONTS.body, fontSize: 12 },
  dotsWrap: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // ── Quick suggestions chips ──
  quickSuggestionsWrap: { marginTop: 8, marginBottom: 4, paddingLeft: 40 },
  quickSuggestionsTitle: { fontFamily: FONTS.bodyBold, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  quickSuggestionsList: { gap: 8, paddingRight: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontFamily: FONTS.bodyBold, fontSize: 11.5 },

  // ── Input Bar ──
  inputBarContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  inputField: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    maxHeight: 90,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  disclaimerText: {
    fontFamily: FONTS.body,
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Success Modal ──
  successCard: {
    width: SCREEN_W * 0.78,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  successIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#10B98118',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: { fontFamily: FONTS.bodyBold, fontSize: 17, textAlign: 'center' },
  successSub: { fontFamily: FONTS.body, fontSize: 12, textAlign: 'center', lineHeight: 17 },

  // ── Markdown Styles ──
  mdHeading: { fontFamily: FONTS.bodyBold, fontSize: 14.5, marginTop: 4, marginBottom: 2 },
  mdBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 1.5 },
  mdBulletDot: { fontSize: 16, lineHeight: 19 },
  mdNumPrefix: { fontFamily: FONTS.bodyBold, fontSize: 12, lineHeight: 19, minWidth: 16 },
  mdBodyText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19.5 },
  mdBold: { fontFamily: FONTS.bodyBold },
  mdItalic: { fontStyle: 'italic' },
  mdCode: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, paddingHorizontal: 4, borderRadius: 4 },
});