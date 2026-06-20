import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform, Image,
  Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { P } from '../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { NewWorkoutSkeleton } from '../../components/ui/Skeleton';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

// ── Rest Type Config ────────────────────────────────────────────────────────
const REST_TYPES = [
  {
    key: 'fatigue',
    label: 'Normal Fatigue Rest',
    sublabel: 'Post-workout recovery — muscles need time to rebuild.',
    letter: 'F',
    color: '#3B82F6',
    icon: 'bed-outline' as const,
    streakNote: '✅ Streak preserved — rest is part of training!',
    affectsStreak: false,
  },
  {
    key: 'sick',
    label: 'Sick Day',
    sublabel: 'Under the weather — health always comes first.',
    letter: 'S',
    color: '#F59E0B',
    icon: 'thermometer' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'injury',
    label: 'Injury Rest',
    sublabel: 'Dealing with a physical injury — recover safely.',
    letter: 'I',
    color: '#EF4444',
    icon: 'bandage' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'after_workout',
    label: 'After Workout Rest',
    sublabel: 'Resting after hitting weekly workout goals.',
    letter: 'A',
    color: '#14B8A6',
    icon: 'calendar-check-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'late',
    label: 'Late / Busy Day',
    sublabel: 'Life got in the way today — happens to everyone.',
    letter: 'L',
    color: '#8B5CF6',
    icon: 'clock-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
  {
    key: 'other',
    label: 'Other',
    sublabel: 'A rest day for another reason.',
    letter: 'O',
    color: '#6B7280',
    icon: 'dots-horizontal-circle-outline' as const,
    streakNote: '⚠️ Streak affected — breaks your current streak.',
    affectsStreak: true,
  },
];

export default function NewDailyWorkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [splits, setSplits] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSplit, setSelectedSplit] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loadingSplits, setLoadingSplits] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [starting, setStarting] = useState(false);

  // Rest day modal state
  const [showRestModal, setShowRestModal] = useState(false);
  const [loggingRest, setLoggingRest] = useState(false);
  const [selectedRestType, setSelectedRestType] = useState<string | null>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const fetchSplits = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/workouts/splits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSplits(res.data);
      } catch (err) {
        console.error('Error fetching splits:', err);
      } finally {
        setLoadingSplits(false);
      }
    };
    fetchSplits();
  }, []);

  const handleSelectSplit = async (split: any) => {
    setSelectedSplit(split);
    setSelectedSession(null);
    setLoadingSessions(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/workouts/splits/${split.id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRestDay = async (restType: string) => {
    setLoggingRest(true);
    try {
      const token = await getToken();
      await axios.post(`${API_URL}/daily/rest-day`, { rest_type: restType }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowRestModal(false);
      const cfg = REST_TYPES.find(r => r.key === restType);
      showToast(`${cfg?.label || 'Rest day'} logged!`, 'success');
      router.replace('/(tabs)/daily');
    } catch (err) {
      console.error('Error logging rest day:', err);
      showToast('Failed to log rest day', 'error');
    } finally {
      setLoggingRest(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const token = await getToken();
      const cleanTitle = selectedSession?.name || selectedSplit?.name || 'Quick Workout';
      const title = selectedSession
        ? `${selectedSplit?.name} — ${selectedSession?.name}`
        : selectedSplit?.name || 'Quick Workout';

      const res = await axios.post(`${API_URL}/daily/workouts`, {
        title: cleanTitle,
        split_id: selectedSplit.id,
        session_id: selectedSession.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      router.replace(`/daily/${res.data.id}`);
    } catch (err) {
      console.error('Error starting workout:', err);
      showToast('Failed to start workout', 'error');
    } finally {
      setStarting(false);
    }
  };

  if (loadingSplits) return <NewWorkoutSkeleton />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Workout</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Date/Time Hero Card */}
        <View style={[styles.heroCard, isDark && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.heroBadge}>
            <Ionicons name="flash" size={14} color={isDark ? colors.primary : "#FFF"} />
            <Text style={[styles.heroBadgeText, isDark && { color: colors.textMuted }]}>TODAY'S SESSION</Text>
          </View>
          <Text style={[styles.heroDate, isDark && { color: colors.text }]}>{dateStr}</Text>
          <Text style={[styles.heroTime, isDark && { color: colors.textMuted }]}>{timeStr}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 140 + Math.max(insets.bottom, 12) }
          ]}
        >
          {!selectedSplit ? (
            <>
              {/* Step 1: Choose Split */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Text style={{ color: colors.primary }}>1. </Text>Choose Program
              </Text>

              {loadingSplits ? (
                <ActivityIndicator color={P.cta} style={{ marginVertical: 20 }} />
              ) : splits.length === 0 ? (
                <TouchableOpacity
                  style={[styles.createSplitCard, { borderColor: colors.border }]}
                  onPress={() => router.push('/splits/create')}
                >
                  <Ionicons name="add-circle-outline" size={32} color={P.cta} />
                  <Text style={[styles.createSplitText, { color: colors.textMuted }]}>No programs yet. Create one first.</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.splitList}>
                  {splits.map((split) => (
                    <TouchableOpacity
                      key={split.id}
                      style={[
                        styles.splitCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => handleSelectSplit(split)}
                    >
                      <View style={[styles.splitIcon, { backgroundColor: colors.inputBg }]}>
                        <MaterialCommunityIcons
                          name="dumbbell"
                          size={20}
                          color={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.splitName, { color: colors.text }]}>{split.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.splitMeta, { color: colors.textMuted }]}>{split.session_count} sessions</Text>
                          {split.original_creator_name && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              {split.original_creator_pic ? (
                                <Image source={{ uri: split.original_creator_pic }} style={{ width: 14, height: 14, borderRadius: 7 }} />
                              ) : (
                                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="person" size={8} color="#FFF" />
                                </View>
                              )}
                              <Text style={[styles.splitMeta, { color: colors.textMuted, fontSize: 10 }]} numberOfLines={1}>
                                @{split.original_creator_name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Step 2: Choose Session */}
              <View style={[styles.sessionHeaderWrap, { marginBottom: 14 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 0, marginBottom: 0 }]}>
                  <Text style={{ color: colors.primary }}>2. </Text>Choose Day
                </Text>
                <TouchableOpacity
                  onPress={() => { setSelectedSplit(null); setSelectedSession(null); }}
                  style={styles.sessionCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.selectedSplitLabel, { color: colors.textMuted }]}>Program: {selectedSplit.name}</Text>

              {loadingSessions ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : sessions.length === 0 ? (
                <Text style={[styles.noSessions, { color: colors.textMuted }]}>No sessions in this program yet.</Text>
              ) : (
                <View style={styles.splitList}>
                  {sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.splitCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        selectedSession?.id === session.id && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.08)' }
                      ]}
                      onPress={() => setSelectedSession(session)}
                    >
                      <View style={[styles.splitIcon, { backgroundColor: selectedSession?.id === session.id ? colors.primary : colors.inputBg }]}>
                        <Ionicons
                          name="calendar"
                          size={18}
                          color={selectedSession?.id === session.id ? '#FFF' : colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.splitName, { color: colors.text }]}>{session.name}</Text>
                        <Text style={[styles.splitMeta, { color: colors.textMuted }]}>{session.exercise_count} exercises</Text>
                      </View>
                      {selectedSession?.id === session.id && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.bg,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
              gap: 8,
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.startBtn, (!selectedSplit || !selectedSession) && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={!selectedSplit || !selectedSession || starting || loggingRest}
          >
            <View style={[styles.startBtnGradient, { backgroundColor: colors.primary }]}>
              {starting ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="play" size={20} color="#FFF" />
                  <Text style={styles.startBtnText}>START WORKOUT</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.restBtn, { borderColor: colors.border }]}
            onPress={() => setShowRestModal(true)}
            disabled={starting || loggingRest}
          >
            <View style={styles.restBtnInner}>
              <MaterialCommunityIcons name="bed-clock" size={20} color={colors.primary} />
              <Text style={[styles.restBtnText, { color: colors.text }]}>LOG REST DAY</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Rest Day Type Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showRestModal}
        transparent
        animationType="slide"
        onRequestClose={() => !loggingRest && setShowRestModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !loggingRest && setShowRestModal(false)}>
          <Pressable onPress={() => {}} style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
            {/* Handle */}
            <View style={styles.modalHandle} />
            <View style={[styles.modalHandleBar, { backgroundColor: colors.textMuted + '40' }]} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Log Rest Day</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Select the reason for resting today
              </Text>
            </View>

            {/* Rest type options */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            >
              {REST_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.key}
                  style={[
                    styles.restTypeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: selectedRestType === rt.key ? rt.color : colors.border,
                      borderWidth: selectedRestType === rt.key ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedRestType(rt.key)}
                  disabled={loggingRest}
                  activeOpacity={0.75}
                >
                  {/* Letter badge */}
                  <View style={[styles.restTypeBadge, { backgroundColor: rt.color }]}>
                    <Text style={styles.restTypeBadgeLetter}>{rt.letter}</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.restTypeInfo}>
                    <Text style={[styles.restTypeLabel, { color: colors.text }]}>{rt.label}</Text>
                    <Text style={[styles.restTypeSublabel, { color: colors.textMuted }]} numberOfLines={2}>
                      {rt.sublabel}
                    </Text>
                    {selectedRestType === rt.key && (
                      <Text style={[styles.restTypeStreakNote, { color: rt.color }]}>
                        {rt.streakNote}
                      </Text>
                    )}
                  </View>

                  {/* Check */}
                  {selectedRestType === rt.key && (
                    <Ionicons name="checkmark-circle" size={22} color={rt.color} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Confirm button */}
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: selectedRestType
                      ? (REST_TYPES.find(r => r.key === selectedRestType)?.color ?? colors.primary)
                      : colors.border,
                    opacity: selectedRestType ? 1 : 0.5,
                  },
                ]}
                disabled={!selectedRestType || loggingRest}
                onPress={() => selectedRestType && handleRestDay(selectedRestType)}
              >
                {loggingRest ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="bed-clock" size={20} color="#FFF" />
                    <Text style={styles.confirmBtnText}>
                      {selectedRestType
                        ? `Log ${REST_TYPES.find(r => r.key === selectedRestType)?.label ?? 'Rest Day'}`
                        : 'Select a type above'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8, marginBottom: 12 },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 24 },
  heroCard: { marginHorizontal: 20, borderRadius: 24, padding: 24, marginBottom: 28, backgroundColor: P.cta },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  heroBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  heroDate: { fontFamily: FONTS.heading, fontSize: 26, color: '#FFF', marginBottom: 4 },
  heroTime: { fontFamily: FONTS.body, fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  scrollContent: { paddingBottom: 120, flexGrow: 1 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, paddingHorizontal: 20, marginBottom: 14 },
  splitList: { paddingHorizontal: 20, gap: 12 },
  splitCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, borderWidth: 1.5 },
  splitIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  splitName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  splitMeta: { fontFamily: FONTS.body, fontSize: 12 },
  createSplitCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 10 },
  createSplitText: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center' },
  noSessions: { fontFamily: FONTS.body, fontSize: 14, paddingHorizontal: 20, marginTop: 8 },
  sessionHeaderWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  sessionCloseBtn: { padding: 4 },
  selectedSplitLabel: { fontFamily: FONTS.body, fontSize: 13, paddingHorizontal: 20, marginBottom: 14, marginTop: -6 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, backgroundColor: P.cta },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
  restBtn: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  restBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 54,
  },
  restBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    letterSpacing: 1,
  },

  // ── Rest Day Modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: 400,
    paddingTop: 10,
  },
  modalHandle: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  modalList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 16,
  },
  restTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  restTypeBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  restTypeBadgeLetter: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#FFF',
  },
  restTypeInfo: {
    flex: 1,
  },
  restTypeLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  restTypeSublabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 17,
  },
  restTypeStreakNote: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    marginTop: 6,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  confirmBtn: {
    borderRadius: 18,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
