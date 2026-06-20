import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  Dimensions, Animated,
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

const coachAvatarSource = require('../../../assets/coach/fit-cartoon-character-training.png');

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
  
  const scrollRef = useRef<ScrollView>(null);
  const typingOpacity = useRef(new Animated.Value(0.4)).current;

  // Typist animation for coaching simulation
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isTyping) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      );
      animation.start();
    } else {
      typingOpacity.setValue(0.4);
    }
    return () => animation?.stop();
  }, [isTyping]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = await getToken();
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
        <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: colors.textMuted }}>Report not found</Text>
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

  const wins = splitAdvice(report.good_things);
  const improve = splitAdvice(report.areas_to_improve);
  const recommendations = splitAdvice(report.recommendations);

  const handleRegenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    setIsTyping(true);
    try {
      const token = await getToken();
      await axios.post(`${API_URL}/daily/workouts/${report.daily_workout_id}/generate-report`, { force: true }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Fetch fresh report details
      setTimeout(async () => {
        try {
          const token2 = await getToken();
          const res = await axios.get(`${API_URL}/daily/reports/${id}`, {
            headers: { Authorization: `Bearer ${token2}` },
          });
          setReport(res.data);
          showToast('Report updated by Coach Spotty! 🏋️');
        } catch (_) {}
        setRegenerating(false);
        setIsTyping(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      }, 3500);
    } catch (err) {
      console.error('Failed to regenerate report:', err);
      setRegenerating(false);
      setIsTyping(false);
    }
  };



  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Styled like a Chat Conversation Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.coachHeaderProfile}>
          <View style={styles.avatarWrapper}>
            <Image source={coachAvatarSource} style={styles.headerCoachAvatar} />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.headerInfoBlock}>
            <Text style={[styles.coachHeaderName, { color: colors.text }]}>Coach Spotty</Text>
            <Text style={[styles.coachHeaderStatus, { color: colors.textMuted }]}>AI Advisor · Active</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push(`/daily/view/${report.daily_workout_id}`)}
          style={[styles.headerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
          activeOpacity={0.75}
        >
          <Ionicons name="open-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Conversation Thread */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.chatContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date / Separator Kicker */}
        <View style={styles.chatDivider}>
          <View style={[styles.chatDividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
          <View style={[styles.chatDividerTextWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={11} color={colors.textDim} style={{ marginRight: 4 }} />
            <Text style={[styles.chatDividerText, { color: colors.textDim }]}>{displayDate}</Text>
          </View>
          <View style={[styles.chatDividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
        </View>

        {/* Message 1: Welcome & Summary */}
        <View style={styles.messageRow}>
          <Image source={coachAvatarSource} style={styles.chatAvatar} />
          <View style={styles.bubbleCol}>
            <Text style={[styles.senderName, { color: colors.textMuted }]}>Coach Spotty</Text>
            <View style={[styles.bubble, styles.blueBubble, { backgroundColor: isDark ? 'rgba(37,150,190,0.08)' : '#F0F9FF', borderColor: isDark ? 'rgba(37,150,190,0.18)' : '#E0F2FE' }]}>
              <Text style={[styles.bubbleText, { color: colors.text }]}>
                Hey! Here is my detailed coaching analysis for your session. You worked hard today.
              </Text>
            </View>
            
            <View style={[styles.bubble, styles.bubbleFollowUp, { backgroundColor: isDark ? colors.card : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.bubbleLabel, { color: colors.primary }]}>Overall Session Summary</Text>
              <Text style={[styles.bubbleText, { color: colors.text, marginTop: 4, lineHeight: 20 }]}>
                {summary || 'No summary available.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Message 2: Rich Stats Card Attachment */}
        <View style={styles.messageRowGrouped}>
          <View style={styles.bubbleCol}>
            <View style={[styles.attachmentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.attachmentHeader}>
                <Ionicons name="stats-chart" size={14} color={colors.primary} />
                <Text style={[styles.attachmentTitle, { color: colors.textMuted }]}>Workout Stats Attachment</Text>
              </View>
              
              <View style={styles.statsHorizontalRow}>
                <View style={styles.statCell}>
                  <Ionicons name="time" size={15} color={colors.primary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.statCellVal, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{durationMin}</Text>
                  <Text style={[styles.statCellLbl, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Duration</Text>
                </View>
                <View style={[styles.cellDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCell}>
                  <Ionicons name="barbell" size={15} color="#10B981" style={{ marginBottom: 4 }} />
                  <Text style={[styles.statCellVal, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{volumeKg}</Text>
                  <Text style={[styles.statCellLbl, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Volume</Text>
                </View>
                <View style={[styles.cellDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCell}>
                  <Ionicons name="flame" size={15} color="#EF4444" style={{ marginBottom: 4 }} />
                  <Text style={[styles.statCellVal, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{cals}</Text>
                  <Text style={[styles.statCellLbl, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>Burned</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Message 3: Wins */}
        {wins.length > 0 && (
          <View style={styles.messageRow}>
            <Image source={coachAvatarSource} style={styles.chatAvatar} />
            <View style={styles.bubbleCol}>
              <Text style={[styles.senderName, { color: colors.textMuted }]}>Coach Spotty</Text>
              <View style={[styles.bubble, styles.greenBubble, { backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4', borderColor: isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7' }]}>
                <View style={styles.bubbleHeaderRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.bubbleCategoryTitle, { color: '#10B981' }]}>Wins (What went well)</Text>
                </View>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {wins.map((w, idx) => (
                    <View key={idx} style={styles.listLine}>
                      <View style={[styles.listDot, { backgroundColor: '#10B981' }]} />
                      <Text style={[styles.listText, { color: colors.text }]}>{w}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Message 4: Areas to Improve */}
        {improve.length > 0 && (
          <View style={styles.messageRowGrouped}>
            <View style={styles.bubbleCol}>
              <View style={[styles.bubble, styles.amberBubble, { backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', borderColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7' }]}>
                <View style={styles.bubbleHeaderRow}>
                  <Ionicons name="trending-up" size={16} color="#F59E0B" />
                  <Text style={[styles.bubbleCategoryTitle, { color: '#F59E0B' }]}>Focus (Where to improve)</Text>
                </View>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {improve.map((i, idx) => (
                    <View key={idx} style={styles.listLine}>
                      <View style={[styles.listDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[styles.listText, { color: colors.text }]}>{i}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Message 5: Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.messageRow}>
            <Image source={coachAvatarSource} style={styles.chatAvatar} />
            <View style={styles.bubbleCol}>
              <Text style={[styles.senderName, { color: colors.textMuted }]}>Coach Spotty</Text>
              <View style={[styles.bubble, styles.purpleBubble, { backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : '#FAF5FF', borderColor: isDark ? 'rgba(139,92,246,0.18)' : '#F3E8FF' }]}>
                <View style={styles.bubbleHeaderRow}>
                  <Ionicons name="bulb" size={16} color="#8B5CF6" />
                  <Text style={[styles.bubbleCategoryTitle, { color: '#8B5CF6' }]}>Next Session Advice</Text>
                </View>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {recommendations.map((r, idx) => (
                    <View key={idx} style={styles.listLine}>
                      <View style={[styles.listDot, { backgroundColor: '#8B5CF6' }]} />
                      <Text style={[styles.listText, { color: colors.text }]}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Typing / Regenerating Indicator */}
        {isTyping && (
          <View style={styles.messageRow}>
            <Image source={coachAvatarSource} style={styles.chatAvatar} />
            <View style={styles.bubbleCol}>
              <Text style={[styles.senderName, { color: colors.textMuted }]}>Coach Spotty</Text>
              <Animated.View style={[styles.bubble, styles.typingBubble, { backgroundColor: isDark ? colors.card : '#F1F5F9', borderColor: colors.border, opacity: typingOpacity, alignSelf: 'flex-start' }]}>
                <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: colors.textDim }}>
                  {regenerating ? 'Coach is analyzing workout details...' : 'Coach is writing...'}
                </Text>
              </Animated.View>
            </View>
          </View>
        )}

        {/* Regenerate Action Link in chat thread */}
        {!isTyping && (
          <View style={styles.regenerateContainer}>
            <TouchableOpacity
              onPress={handleRegenerate}
              style={[styles.regenerateChatBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.primary} />
              <Text style={[styles.regenerateChatText, { color: colors.primary }]}>Ask Coach to Re-analyze workout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  
  // Header Custom Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachHeaderProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  headerCoachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  headerInfoBlock: {
    marginLeft: 10,
  },
  coachHeaderName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
  },
  coachHeaderStatus: {
    fontFamily: FONTS.body,
    fontSize: 11,
    marginTop: 1,
  },

  // Chat Feed Layout
  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    flexGrow: 1,
    paddingBottom: 32,
  },
  chatDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 10,
  },
  chatDividerLine: {
    flex: 1,
    height: 1,
  },
  chatDividerTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 10,
  },
  chatDividerText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
  },

  // Message Row Styles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  messageRowGrouped: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 46, // Aligns content exactly underneath the avatar space
  },
  chatAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 12,
    marginTop: 4,
  },
  bubbleCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  senderName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    marginBottom: 4,
    marginLeft: 4,
  },

  // Speech Bubble Core
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    maxWidth: '92%',
    alignSelf: 'stretch',
    borderTopLeftRadius: 3, // speech bubble tail style
  },
  bubbleFollowUp: {
    marginTop: 6,
    borderTopLeftRadius: 18, // grouped bubbles don't get tail style
  },
  bubbleText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  // Speec Bubble Variations
  blueBubble: {
    borderTopLeftRadius: 3,
  },
  greenBubble: {
    borderTopLeftRadius: 3,
    maxWidth: '96%',
  },
  amberBubble: {
    borderTopLeftRadius: 18,
    maxWidth: '96%',
  },
  purpleBubble: {
    borderTopLeftRadius: 3,
    maxWidth: '96%',
  },
  bubbleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bubbleCategoryTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },

  // Stats Attachment Card
  attachmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    alignSelf: 'stretch',
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsHorizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellVal: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  statCellLbl: {
    fontFamily: FONTS.body,
    fontSize: 10,
    marginTop: 2,
  },
  cellDivider: {
    width: 1,
    height: 32,
  },

  // Bullet Lists inside Bubble
  listLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },

  // Regenerate Button Row
  regenerateContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  regenerateChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  regenerateChatText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
  },

});
