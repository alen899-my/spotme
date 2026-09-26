import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Image, Keyboard, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { FONTS } from '../../constants/theme';
import { aiApi, AIChatMessage, AIChatSession, AIChatAction } from '../../utils/aiApi';
import ExerciseCard from '../exercises/ExerciseCard';
import ExercisePreviewModal from '../modals/ExercisePreviewModal';
import { getExerciseIndex, findMentionedExercises, MentionableExercise } from '../../utils/exerciseMentions';
const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  user?: any;
  splitId?: number;
  splitName?: string;
}

const STARTER_CARDS = [
  {
    icon: 'dumbbell' as const,
    title: 'Workout Routine',
    desc: 'Volume, sets & intensity advice',
    prompt: 'Review my recent workouts and tell me where my strength and volume progression stand.',
    color: '#1D4ED8',
  },
  {
    icon: 'silverware-fork-knife' as const,
    title: 'Nutrition & Macros',
    desc: 'Calorie & protein targets',
    prompt: 'Review my logged meals this week. Am I hitting optimal protein and calories for my goal?',
    color: '#059669',
  },
  {
    icon: 'calendar-sync' as const,
    title: 'Training Split',
    desc: 'Exercise selection & balance',
    prompt: 'Look at my active training split and recommend any exercise adjustments for better progression.',
    color: '#7C3AED',
  },
  {
    icon: 'water-percent' as const,
    title: 'Rest & Recovery',
    desc: 'Hydration & rest intervals',
    prompt: 'Check my hydration and rest days and tell me how my recovery is supporting my training.',
    color: '#EA580C',
  },
  {
    icon: 'sparkles' as const,
    title: 'Edit My Split',
    desc: 'Add, swap or reorder exercises',
    prompt: 'Show me my workout splits, then help me edit them — I want full control over days and exercises.',
    color: '#2596BE',
  },
];

const QUICK_TAGS = [
  { label: 'High protein snacks', prompt: 'Give me 5 quick high-protein snack ideas suited for my goal.' },
  { label: 'Break bench plateau', prompt: 'How can I break through my current bench press plateau?' },
  { label: 'Ideal rest intervals', prompt: 'What are the ideal rest periods between heavy compound sets for hypertrophy?' },
  { label: 'Warm-up routine', prompt: 'Suggest a quick 5-minute dynamic warm-up before my next lifting session.' },
];

function formatRelativeDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return '';
  }
}

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Markdown Cleaner ─────────────────────────────────────────────────────────
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
      elements.push(<View key={`sp-${i}`} style={{ height: 6 }} />);
      continue;
    }
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(
        <View key={`hr-${i}`} style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', marginVertical: 6 }} />
      );
      continue;
    }
    if (/^#{1,6}\s+/.test(raw)) {
      const heading = raw.replace(/^#{1,6}\s+/, '').replace(/[*_`]/g, '').trim();
      elements.push(<Text key={`h-${i}`} style={[S.mdHeading, { color: textColor }]}>{heading}</Text>);
      continue;
    }
    if (/^[-*+•]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*+•]\s+/, '');
      elements.push(
        <View key={`li-${i}`} style={S.mdBulletRow}>
          <Text style={[S.mdBulletDot, { color: primaryColor }]}>•</Text>
          <Text style={[S.mdBodyText, { color: textColor, flex: 1 }]}>{renderInlineSpans(bulletText, textColor, primaryColor, isDark)}</Text>
        </View>
      );
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <View key={`nl-${i}`} style={S.mdBulletRow}>
          <Text style={[S.mdNumPrefix, { color: primaryColor }]}>{numMatch[1]}.</Text>
          <Text style={[S.mdBodyText, { color: textColor, flex: 1 }]}>{renderInlineSpans(numMatch[2], textColor, primaryColor, isDark)}</Text>
        </View>
      );
      continue;
    }
    elements.push(
      <Text key={`p-${i}`} style={[S.mdBodyText, { color: textColor }]}>{renderInlineSpans(trimmed, textColor, primaryColor, isDark)}</Text>
    );
  }
  return <View style={{ gap: 2 }}>{elements}</View>;
}

function renderInlineSpans(text: string, textColor: string, primaryColor: string, isDark: boolean) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_|`.*?`)/g);
  return parts.map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      return <Text key={index} style={[S.mdBold, { color: textColor }]}>{part.slice(2, -2).replace(/[*_]/g, '')}</Text>;
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      return <Text key={index} style={[S.mdBold, { color: textColor }]}>{part.slice(1, -1).replace(/[*_]/g, '')}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={index} style={[S.mdCode, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: primaryColor }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return cleanRawMarkdownTokens(part);
  });
}

// ── Animated Typing Indicator (Standard Modern Chat) ─────────────────────────
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
    pulse(dot1, 0); pulse(dot2, 140); pulse(dot3, 280);
  }, [dot1, dot2, dot3]);

  return (
    <View style={S.chatRowCoach}>
      <Image source={coachAvatarSource} style={S.coachAvatar} />
      <View style={[S.coachBubble, { backgroundColor: isDark ? '#141A1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
        <View style={S.thinkingRow}>
          <Text style={[S.thinkingLabel, { color: colors.textMuted }]}>Typing</Text>
          <View style={S.dotsWrap}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[S.dot, { backgroundColor: colors.primary, opacity: dot }]} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Assistant message: raw text + rich exercise cards ────────────────────────
// Detects library exercises named in the reply and renders our ExerciseCard
// (image, rating, target/equipment) under the text, tappable for preview.
function CoachMessage({ msg, exerciseIndex, onPreview, onConfirm, confirmingToken, cardBg, cardBorder }: {
  msg: AIChatMessage;
  exerciseIndex: MentionableExercise[];
  onPreview: (exercise: any) => void;
  onConfirm: (action: AIChatAction, confirmed: boolean) => void;
  confirmingToken: string | null;
  cardBg: string;
  cardBorder: string;
}) {
  const { colors, isDark } = useTheme();
  const mentioned = React.useMemo(
    () => findMentionedExercises(msg.content || '', exerciseIndex, 3),
    [msg.content, exerciseIndex]
  );

  return (
    <View style={[S.chatBubble, S.coachBubble, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <MarkdownText content={msg.content} textColor={colors.text} primaryColor={colors.primary} isDark={isDark} />
      {mentioned.length > 0 && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="barbell-outline" size={13} color={colors.primary} />
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: colors.primary, letterSpacing: 0.4 }}>
              {mentioned.length === 1 ? 'MENTIONED EXERCISE' : 'MENTIONED EXERCISES'}
            </Text>
          </View>
          {mentioned.map((ex) => (
            <ExerciseCard
              key={`mention-${msg.id}-${ex.id}`}
              exercise={ex}
              variant="compact"
              onPress={() => onPreview(ex)}
            />
          ))}
        </View>
      )}
      {msg.actions?.map((action, ai) => (
        <View
          key={`${msg.id}-act-${ai}`}
          style={[S.actionCard, { backgroundColor: isDark ? 'rgba(37,150,190,0.10)' : 'rgba(37,150,190,0.08)', borderColor: colors.primary + '44' }]}
        >
          <View style={S.actionRow}>
            <Ionicons
              name={action.kind === 'pending' ? 'alert-circle-outline' : action.kind === 'deleted' && action.label.endsWith('cancelled') ? 'close-circle-outline' : 'checkmark-circle-outline'}
              size={16}
              color={action.kind === 'pending' ? '#F7CB16' : colors.primary}
            />
            <Text style={[S.actionLabel, { color: colors.text }]}>{action.label}</Text>
          </View>
          {action.kind === 'pending' && action.confirmToken ? (
            <View style={S.actionBtnRow}>
              <TouchableOpacity
                onPress={() => onConfirm(action, false)}
                disabled={confirmingToken === action.confirmToken}
                style={[S.actionBtn, S.actionBtnGhost, { borderColor: cardBorder }]}
                activeOpacity={0.8}
              >
                <Text style={[S.actionBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onConfirm(action, true)}
                disabled={confirmingToken === action.confirmToken}
                style={[S.actionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                {confirmingToken === action.confirmToken
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={[S.actionBtnText, { color: '#FFFFFF' }]}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
      {msg.created_at ? (
        <Text style={[S.msgTime, { color: colors.textDim, alignSelf: 'flex-start' }]}>
          {formatTime(msg.created_at)}
        </Text>
      ) : null}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AIChatModal({ visible, onClose, user, splitId, splitName }: AIChatModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();

  // Responsive helpers
  const isSmall = SW < 360;
  const cardGap = isSmall ? 8 : 10;
  const heroPx = isSmall ? 56 : 72;
  const starterCardBasis = SW < 340 ? '100%' : '48%';

  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingToken, setConfirmingToken] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState<MentionableExercise[]>([]);
  const [previewEx, setPreviewEx] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const historyPanelAnim = useRef(new Animated.Value(SW)).current;

  const userName = user?.full_name || user?.username || 'Athlete';
  const firstName = userName.split(' ')[0] || 'Athlete';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const userAvatar = user?.profile_pic_url || null;

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await aiApi.getSessions();
      setSessions(data);
    } catch { /* silent */ } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSessions();
      // Exercise library for rich cards under assistant replies (cached).
      getExerciseIndex().then(setExerciseIndex).catch(() => {});
    } else {
      setCurrentSessionId(undefined);
      setMessages([]);
      setInputValue('');
      setShowHistory(false);
      setPreviewEx(null);
    }
  }, [visible, loadSessions]);

  useEffect(() => {
    Animated.spring(historyPanelAnim, {
      toValue: showHistory ? 0 : SW,
      useNativeDriver: true,
      tension: 70,
      friction: 14,
    }).start();
  }, [showHistory, historyPanelAnim, SW]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    setShowHistory(false);
    setCurrentSessionId(sessionId);
    setHistoryLoading(true);
    try {
      const data = await aiApi.getSessionMessages(sessionId);
      setMessages(data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load session messages:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleNewChat = () => {
    setShowHistory(false);
    setCurrentSessionId(undefined);
    setMessages([]);
    setInputValue('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await aiApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) handleNewChat();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || inputValue).trim();
    if (!text || sending) return;

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSending(true);
    scrollToBottom();

    try {
      const res = await aiApi.sendMessage(text, currentSessionId, splitId);
      if (!currentSessionId && res.session_id) setCurrentSessionId(res.session_id);
      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
        actions: res.actions,
      };
      setMessages(prev => [...prev, assistantMsg]);
      loadSessions();
    } catch (err: any) {
      const fallbackMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Keep your hydration up, hit your protein targets, and stay consistent!",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const handleConfirmAction = async (action: AIChatAction, confirmed: boolean) => {
    if (!action.confirmToken || !currentSessionId || confirmingToken) return;
    setConfirmingToken(action.confirmToken);
    try {
      const res = await aiApi.confirmAction(action.confirmToken, currentSessionId, confirmed);
      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
        actions: res.actions,
      };
      setMessages(prev => {
        // Mark the confirmed action so its buttons disappear.
        const next = prev.map(m => ({
          ...m,
          actions: m.actions?.map(a =>
            a.confirmToken === action.confirmToken ? { ...a, kind: (confirmed ? 'updated' : 'deleted') as const, label: `${a.label} — ${confirmed ? 'confirmed' : 'cancelled'}`, confirmToken: undefined } : a
          ),
        }));
        return [...next, assistantMsg];
      });
      loadSessions();
    } catch (err: any) {
      const fallbackMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: err?.response?.data?.error || 'That confirmation expired. Please ask again.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setConfirmingToken(null);
      scrollToBottom();
    }
  };

  const cardBg = isDark ? '#141A1E' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[S.root, { backgroundColor: colors.bg }]}>

        {/* ── TOP HEADER ── */}
        <View style={[S.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: cardBorder }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[S.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Coach identity */}
          <View style={S.headerCenter}>
            <View style={S.avatarWrap}>
              <Image source={coachAvatarSource} style={S.headerAvatar} />
              <View style={S.onlineDot} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[S.headerName, { color: colors.text }]} numberOfLines={1}>Coach Spotty</Text>
           
            </View>
          </View>

          {/* Right buttons */}
          <View style={S.headerRight}>
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={[S.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
              accessibilityLabel="Chat History"
            >
              <Ionicons name="time-outline" size={18} color={colors.text} />
              {sessions.length > 0 && <View style={[S.badgeDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewChat}
              style={[S.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
              accessibilityLabel="New Chat"
            >
              <Ionicons name="create-outline" size={19} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CHAT FEED ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 56) : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={S.messagesContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            {historyLoading ? (
              <View style={S.centerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[S.loadingText, { color: colors.textMuted }]}>Loading conversation…</Text>
              </View>
            ) : messages.length === 0 ? (

              /* ── EMPTY / STARTER STATE ── */
              <View style={S.emptyState}>
                <View style={S.heroAvatarWrap}>
                  <Image source={coachAvatarSource} style={[S.heroAvatar, { width: heroPx, height: heroPx, borderRadius: heroPx / 2 }]} />
                  <View style={S.heroOnlineBadge}>
                    <View style={S.heroOnlineInner} />
                  </View>
                </View>

                <Text style={[S.welcomeTitle, { color: colors.text }]}>
                  Welcome, {firstName}
                </Text>

                <View style={[S.coachRolePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}>
                  <Text style={[S.coachRoleText, { color: colors.primary }]}>PERSONAL FITNESS COACH</Text>
                </View>

                <Text style={[S.welcomeSub, { color: colors.textMuted }]}>
                  Ask me about your workout programming, nutrition targets, exercise form, or recovery.
                </Text>

                {/* 2-column starter card grid */}
                <View style={[S.starterGrid, { gap: cardGap }]}>
                  {STARTER_CARDS.map((card, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => handleSend(card.prompt)}
                      style={[
                        S.starterCard,
                        {
                          flexBasis: starterCardBasis,
                          backgroundColor: card.color,
                          borderColor: 'rgba(255,255,255,0.18)',
                          shadowColor: card.color,
                        },
                      ]}
                    >
                      <View style={S.starterIconBox}>
                        <MaterialCommunityIcons name={card.icon} size={18} color="#FFFFFF" />
                      </View>
                      <Text style={S.starterTitle}>{card.title}</Text>
                      <Text style={S.starterDesc}>{card.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick tags */}
                <View style={S.quickTagsWrap}>
                  <Text style={[S.quickTagsTitle, { color: colors.textDim }]}>Suggested Topics</Text>
                  <View style={S.quickTags}>
                    {QUICK_TAGS.map((tag, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.75}
                        onPress={() => handleSend(tag.prompt)}
                        style={[S.quickTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
                      >
                        <Text style={[S.quickTagText, { color: colors.text }]}>{tag.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

            ) : (
              /* ── MESSAGES LIST ── */
              <View style={S.messagesList}>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <View key={msg.id} style={[S.chatRow, isUser ? S.chatRowUser : S.chatRowCoach]}>
                      {!isUser && <Image source={coachAvatarSource} style={S.coachAvatar} />}
                      {isUser ? (
                        <View style={[S.chatBubble, S.userBubble, { backgroundColor: colors.primary }]}>
                          <Text style={S.userBubbleText}>{msg.content}</Text>
                          {msg.created_at ? (
                            <Text style={[S.msgTime, { color: 'rgba(255,255,255,0.65)', alignSelf: 'flex-end' }]}>
                              {formatTime(msg.created_at)}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <CoachMessage
                          msg={msg}
                          exerciseIndex={exerciseIndex}
                          onPreview={setPreviewEx}
                          onConfirm={handleConfirmAction}
                          confirmingToken={confirmingToken}
                          cardBg={cardBg}
                          cardBorder={cardBorder}
                        />
                      )}
                      {isUser && (
                        <View style={[S.userAvatarCircle, { backgroundColor: colors.primary + '28' }]}>
                          {userAvatar
                            ? <Image source={{ uri: userAvatar }} style={S.userAvatarImg} />
                            : <Text style={[S.userAvatarInitials, { color: colors.primary }]}>{userInitials}</Text>
                          }
                        </View>
                      )}
                    </View>
                  );
                })}
                {sending && <ThinkingBubble colors={colors} isDark={isDark} />}
              </View>
            )}
          </ScrollView>

          {/* ── SPLIT CONTEXT PILL ── */}
          {splitId ? (
            <View style={[S.ctxPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '44' }]}>
              <Ionicons name="barbell-outline" size={13} color={colors.primary} />
              <Text style={[S.ctxPillText, { color: colors.text }]} numberOfLines={1}>
                Editing: {splitName || `Split #${splitId}`}
              </Text>
            </View>
          ) : null}

          {/* ── BOTTOM INPUT BAR ── */}
          <View style={[S.inputBar, { backgroundColor: colors.card, borderTopColor: cardBorder, paddingBottom: Math.max(insets.bottom, 14), paddingHorizontal: isSmall ? 10 : 14 }]}>
            <View style={[S.inputWrapper, { backgroundColor: isDark ? '#0D1115' : '#F1F5F9', borderColor: cardBorder }]}>
              <TextInput
                style={[S.textInput, { color: colors.text, fontSize: isSmall ? 13 : 14 }]}
                placeholder={sending ? 'Typing…' : 'Message Coach Spotty…'}
                placeholderTextColor={colors.textMuted}
                value={inputValue}
                onChangeText={setInputValue}
                multiline
                maxLength={1000}
                editable={!sending}
                onFocus={() => setTimeout(scrollToBottom, 350)}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!inputValue.trim() || sending}
                style={[S.sendBtn, { backgroundColor: inputValue.trim() && !sending ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') }]}
                activeOpacity={0.8}
                accessibilityLabel="Send message"
              >
                <Ionicons name="arrow-up" size={17} color={inputValue.trim() && !sending ? '#FFFFFF' : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ── PAST CHATS HISTORY PANEL (SLIDE-OVER) ── */}
        <Animated.View style={[S.historyPanel, { backgroundColor: colors.bg, transform: [{ translateX: historyPanelAnim }] }]}>
          <View style={[S.historyHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: cardBorder }]}>
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              style={[S.headerIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[S.historyTitle, { color: colors.text }]}>Chat History</Text>
            <TouchableOpacity
              onPress={handleNewChat}
              style={[S.headerIconBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {sessionsLoading ? (
            <View style={S.centerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : sessions.length === 0 ? (
            <View style={S.centerLoading}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textDim} />
              <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text, marginTop: 12, fontSize: 15 }}>No Past Chats</Text>
              <Text style={{ fontFamily: FONTS.body, color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Start a chat to keep track of your coaching sessions.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={S.historyList}>
              {sessions.map((sess) => (
                <TouchableOpacity
                  key={sess.id}
                  activeOpacity={0.75}
                  onPress={() => handleSelectSession(sess.id)}
                  style={[S.sessionCard, {
                    backgroundColor: sess.id === currentSessionId ? colors.primary + '14' : cardBg,
                    borderColor: sess.id === currentSessionId ? colors.primary : cardBorder,
                  }]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[S.sessionTitle, { color: colors.text }]} numberOfLines={1}>{sess.title}</Text>
                    {sess.last_message ? (
                      <Text style={[S.sessionLastMsg, { color: colors.textMuted }]} numberOfLines={2}>{sess.last_message}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[S.sessionDate, { color: colors.textDim }]}>{formatRelativeDate(sess.updated_at)}</Text>
                      {sess.message_count ? (
                        <Text style={[S.sessionCount, { color: colors.primary }]}>• {sess.message_count} msgs</Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); handleDeleteSession(sess.id); }}
                    style={S.sessionDeleteBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Exercise detail when tapping a mentioned-exercise card */}
        <ExercisePreviewModal
          visible={previewEx !== null}
          exercise={previewEx}
          onClose={() => setPreviewEx(null)}
        />
      </View>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerSub: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  // ── Messages ──
  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  messagesList: {
    gap: 12,
  },

  // ── Empty / Starter State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroOnlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOnlineInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  welcomeTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  coachRolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  coachRoleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  welcomeSub: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },

  starterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 18,
  },
  starterCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 5,
    minHeight: 44,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  starterIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  starterTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  starterDesc: {
    fontFamily: FONTS.body,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255, 255, 255, 0.88)',
  },

  quickTagsWrap: {
    width: '100%',
    gap: 10,
  },
  quickTagsTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  quickTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickTag: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  quickTagText: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },

  // ── Chat rows ──
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chatRowCoach: {
    justifyContent: 'flex-start',
  },
  chatRowUser: {
    justifyContent: 'flex-end',
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    flexShrink: 0,
    marginBottom: 2,
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 2,
  },
  userAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatarInitials: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

  chatBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    maxWidth: '80%',
    flexShrink: 1,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  userBubbleText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  coachBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
    maxWidth: '82%',
    flexShrink: 1,
  },
  msgTime: {
    fontFamily: FONTS.body,
    fontSize: 10,
    marginTop: 4,
  },

  // ── Thinking / Typing ──
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  thinkingLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Input bar ──
  ctxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '90%',
  },
  ctxPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    flexShrink: 1,
  },
  // ── Action cards inside assistant bubbles ──
  actionCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    minWidth: 84,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  actionBtnGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 36,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // ── History slide-over ──
  historyPanel: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  historyList: {
    padding: 14,
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sessionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
  },
  sessionLastMsg: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 16,
  },
  sessionDate: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  sessionCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  sessionDeleteBtn: {
    padding: 6,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    marginTop: 10,
  },

  // ── Markdown ──
  mdHeading: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    marginTop: 4,
    marginBottom: 2,
  },
  mdBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 1.5,
  },
  mdBulletDot: {
    fontSize: 16,
    lineHeight: 19,
  },
  mdNumPrefix: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    lineHeight: 19,
    minWidth: 16,
  },
  mdBodyText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  mdBold: {
    fontFamily: FONTS.bodyBold,
  },
  mdItalic: {
    fontStyle: 'italic',
  },
  mdCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
