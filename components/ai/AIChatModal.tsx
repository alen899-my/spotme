import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Dimensions, Image, Keyboard, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { FONTS } from '../../constants/theme';
import { aiApi, AIChatMessage, AIChatSession } from '../../utils/aiApi';

const { width: SCREEN_W } = Dimensions.get('window');
const coachAvatarSource = require('../../assets/coach/fit-cartoon-character-training.png');

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  user?: any;
}

const STARTER_CARDS = [
  {
    icon: 'dumbbell' as const,
    title: 'Workout Analysis',
    desc: 'Volume, intensity & fatigue drops',
    prompt: 'Analyze my recent workouts and tell me where my strength and fatigue patterns stand.',
    color: '#2596BE',
  },
  {
    icon: 'food-apple' as const,
    title: 'Nutrition & Macros',
    desc: 'Calories, protein & diet check',
    prompt: 'Review my logged meals this week. Am I hitting optimal protein and calories for my goal?',
    color: '#10B981',
  },
  {
    icon: 'calendar-sync' as const,
    title: 'Personalize Split',
    desc: 'Routines, days & muscle focus',
    prompt: 'Look at my active training split and recommend any exercise adjustments for better muscle growth.',
    color: '#8B5CF6',
  },
  {
    icon: 'water-percent' as const,
    title: 'Recovery & Water',
    desc: 'Hydration and rest intervals',
    prompt: 'Check my hydration logs and tell me how my water intake and recovery are supporting my workouts.',
    color: '#F59E0B',
  },
];

const QUICK_TAGS = [
  { label: '🥗 High protein snacks', prompt: 'Give me 5 quick high-protein snack ideas suited for my goal.' },
  { label: '📈 Break bench plateau', prompt: 'How can I break through my current bench press plateau?' },
  { label: '⏱️ Ideal rest intervals', prompt: 'What are the ideal rest periods between heavy compound sets for hypertrophy?' },
  { label: '🔥 Warm-up routine', prompt: 'Suggest a quick 5-minute dynamic warm-up before my next lifting session.' },
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

// ── Neat Formatter & Markdown Cleaner ───────────────────────────────────────
function cleanRawMarkdownTokens(text: string): string {
  if (!text) return '';
  // Strip any stray markdown symbols: multiple hashes, stray asterisks, underscores
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
  // Matches **bold**, *italic*, or `code`
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
    // Code snippet: `text`
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
    // Plain text chunk: strip any stray markdown characters (#, *, _)
    const cleanChunk = cleanRawMarkdownTokens(part);
    return cleanChunk;
  });
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
    <View style={S.chatRowCoach}>
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
          <Text style={[S.thinkingLabel, { color: colors.textMuted }]}>Coach Spotty is analyzing your fitness data</Text>
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

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AIChatModal({ visible, onClose, user }: AIChatModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const historyPanelAnim = useRef(new Animated.Value(SCREEN_W)).current;

  // User details
  const userName = user?.full_name || user?.username || 'You';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const userAvatar = user?.profile_pic_url || null;

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await aiApi.getSessions();
      setSessions(data);
    } catch {
      // silent
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSessions();
    } else {
      setCurrentSessionId(undefined);
      setMessages([]);
      setInputValue('');
      setShowHistory(false);
    }
  }, [visible, loadSessions]);

  // History panel animation
  useEffect(() => {
    Animated.spring(historyPanelAnim, {
      toValue: showHistory ? 0 : SCREEN_W,
      useNativeDriver: true,
      tension: 70,
      friction: 14,
    }).start();
  }, [showHistory]);

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
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
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
      const res = await aiApi.sendMessage(text, currentSessionId);
      if (!currentSessionId && res.session_id) {
        setCurrentSessionId(res.session_id);
      }

      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      loadSessions(); // refresh session list in background
    } catch (err: any) {
      console.error('Send error:', err);
      const fallbackMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Don't forget: stay hydrated, eat your protein, and keep consistent!",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const cardBg = isDark ? '#11161B' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[S.root, { backgroundColor: colors.bg }]}>
        {/* ── TOP HEADER ── */}
        <View
          style={[
            S.header,
            {
              paddingTop: insets.top + 8,
              backgroundColor: colors.card,
              borderBottomColor: cardBorder,
            },
          ]}
        >
          {/* Back/Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Coach info center */}
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
                  <Text style={[S.aiChipText, { color: colors.primary }]}>AI BRAIN</Text>
                </View>
              </View>
              <Text style={[S.headerSub, { color: '#10B981' }]}>Live Database Context Connected</Text>
            </View>
          </View>

          {/* Right actions: History & New Chat */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="time-outline" size={18} color={colors.text} />
              {sessions.length > 0 && (
                <View style={[S.badgeDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNewChat}
              style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CHAT FEED & INPUT (KeyboardAvoidingView) ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 54) : 0}
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
                <View style={[S.welcomeBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
                  <Ionicons name="sparkles" size={13} color={colors.primary} />
                  <Text style={[S.welcomeBadgeText, { color: colors.primary }]}>PERSONAL AI TRAINER</Text>
                </View>

                <Text style={[S.welcomeTitle, { color: colors.text }]}>
                  Hey, {userName.split(' ')[0]}! 💪
                </Text>

                <Text style={[S.welcomeSub, { color: colors.textMuted }]}>
                  I know all your workouts, logged meals, weights, water, and active splits. Ask me anything to crush your goals!
                </Text>

                {/* 2x2 Starter Cards Grid */}
                <View style={S.starterGrid}>
                  {STARTER_CARDS.map((card, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => handleSend(card.prompt)}
                      style={[
                        S.starterCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                        },
                      ]}
                    >
                      <View style={[S.starterIconBox, { backgroundColor: card.color + '18' }]}>
                        <MaterialCommunityIcons name={card.icon} size={18} color={card.color} />
                      </View>
                      <Text style={[S.starterTitle, { color: colors.text }]}>{card.title}</Text>
                      <Text style={[S.starterDesc, { color: colors.textMuted }]}>{card.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick tags */}
                <View style={S.quickTagsWrap}>
                  <Text style={[S.quickTagsTitle, { color: colors.textDim }]}>Popular Questions</Text>
                  <View style={S.quickTags}>
                    {QUICK_TAGS.map((tag, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.75}
                        onPress={() => handleSend(tag.prompt)}
                        style={[
                          S.quickTag,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            borderColor: cardBorder,
                          },
                        ]}
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
                    <View
                      key={msg.id}
                      style={[
                        S.chatRow,
                        isUser ? S.chatRowUser : S.chatRowCoach,
                      ]}
                    >
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

                      {isUser && (
                        <View style={[S.userAvatarCircle, { backgroundColor: colors.primary + '28' }]}>
                          {userAvatar ? (
                            <Image source={{ uri: userAvatar }} style={S.userAvatarImg} />
                          ) : (
                            <Text style={[S.userAvatarInitials, { color: colors.primary }]}>{userInitials}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {sending && <ThinkingBubble colors={colors} isDark={isDark} />}
              </View>
            )}
          </ScrollView>

          {/* ── BOTTOM INPUT BAR ── */}
          <View
            style={[
              S.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: cardBorder,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <View
              style={[
                S.inputWrapper,
                {
                  backgroundColor: isDark ? '#0D1115' : '#F1F5F9',
                  borderColor: cardBorder,
                },
              ]}
            >
              <TextInput
                style={[S.textInput, { color: colors.text }]}
                placeholder={sending ? 'Coach Spotty is thinking…' : 'Ask about workouts, diet, splits, recovery…'}
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
                style={[
                  S.sendBtn,
                  {
                    backgroundColor: inputValue.trim() && !sending ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up"
                  size={17}
                  color={inputValue.trim() && !sending ? '#FFFFFF' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={[S.disclaimerText, { color: colors.textDim }]}>
              Coach Spotty references your live fitness logs. Train safely & listen to your body.
            </Text>
          </View>
        </KeyboardAvoidingView>

        {/* ── PAST CHATS HISTORY PANEL (SLIDE-OVER) ── */}
        <Animated.View
          style={[
            S.historyPanel,
            {
              backgroundColor: colors.bg,
              transform: [{ translateX: historyPanelAnim }],
            },
          ]}
        >
          <View
            style={[
              S.historyHeader,
              {
                paddingTop: insets.top + 8,
                backgroundColor: colors.card,
                borderBottomColor: cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              style={[S.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text style={[S.historyTitle, { color: colors.text }]}>Past Conversations</Text>

            <TouchableOpacity
              onPress={handleNewChat}
              style={[S.headerBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}
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
              <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text, marginTop: 12 }}>No Past Chats</Text>
              <Text style={{ fontFamily: FONTS.body, color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Ask Coach Spotty anything to start your first session!
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={S.historyList}>
              {sessions.map((sess) => (
                <TouchableOpacity
                  key={sess.id}
                  activeOpacity={0.75}
                  onPress={() => handleSelectSession(sess.id)}
                  style={[
                    S.sessionCard,
                    {
                      backgroundColor: sess.id === currentSessionId ? colors.primary + '14' : cardBg,
                      borderColor: sess.id === currentSessionId ? colors.primary : cardBorder,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[S.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                      {sess.title}
                    </Text>
                    {sess.last_message ? (
                      <Text style={[S.sessionLastMsg, { color: colors.textMuted }]} numberOfLines={2}>
                        {sess.last_message}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[S.sessionDate, { color: colors.textDim }]}>
                        {formatRelativeDate(sess.updated_at)}
                      </Text>
                      {sess.message_count ? (
                        <Text style={[S.sessionCount, { color: colors.primary }]}>
                          • {sess.message_count} messages
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(sess.id);
                    }}
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
      </View>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  // Header
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
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  avatarWrap: { position: 'relative' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', borderWidth: 1.5, borderColor: '#FFF',
  },
  headerName: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  headerSub: { fontFamily: FONTS.body, fontSize: 10.5, marginTop: 1 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5 },
  aiChipText: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5 },

  // Messages Content
  messagesContent: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 12 },
  messagesList: { gap: 12 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 4 },
  welcomeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 12,
  },
  welcomeBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  welcomeTitle: { fontFamily: FONTS.bodyBold, fontSize: 22, textAlign: 'center', marginBottom: 6 },
  welcomeSub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 320, marginBottom: 20 },

  starterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  starterCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 6,
  },
  starterIconBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  starterTitle: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  starterDesc: { fontFamily: FONTS.body, fontSize: 11, lineHeight: 15 },

  quickTagsWrap: { width: '100%', alignItems: 'center', gap: 8 },
  quickTagsTitle: { fontFamily: FONTS.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickTag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  quickTagText: { fontFamily: FONTS.body, fontSize: 12 },

  // Chat rows
  chatRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  chatRowCoach: { justifyContent: 'flex-start' },
  chatRowUser: { justifyContent: 'flex-end' },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, flexShrink: 0 },

  userAvatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    marginLeft: 8, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  userAvatarInitials: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  chatBubble: { borderRadius: 18, padding: 13 },
  userBubble: { borderBottomRightRadius: 4, maxWidth: '75%' },
  userBubbleText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20, color: '#FFFFFF' },

  coachBubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    padding: 13,
  },

  // Thinking
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingLabel: { fontFamily: FONTS.body, fontSize: 12 },
  dotsWrap: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Input Bar
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    maxHeight: 90,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  disclaimerText: {
    fontFamily: FONTS.body,
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 2,
  },

  // History slide-over
  historyPanel: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyTitle: { fontFamily: FONTS.bodyBold, fontSize: 15 },
  historyList: { padding: 14, gap: 10 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sessionTitle: { fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  sessionLastMsg: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16 },
  sessionDate: { fontFamily: FONTS.body, fontSize: 11 },
  sessionCount: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
  sessionDeleteBtn: { padding: 6 },

  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { fontFamily: FONTS.body, fontSize: 13, marginTop: 10 },

  // Markdown
  mdHeading: { fontFamily: FONTS.bodyBold, fontSize: 14.5, marginTop: 4, marginBottom: 2 },
  mdBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 1.5 },
  mdBulletDot: { fontSize: 16, lineHeight: 19 },
  mdNumPrefix: { fontFamily: FONTS.bodyBold, fontSize: 12, lineHeight: 19, minWidth: 16 },
  mdBodyText: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19.5 },
  mdBold: { fontFamily: FONTS.bodyBold },
  mdItalic: { fontStyle: 'italic' },
  mdCode: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, paddingHorizontal: 4, borderRadius: 4 },
});
