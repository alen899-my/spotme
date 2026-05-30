import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform,
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const fetchSplits = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
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
      const token = await AsyncStorage.getItem('userToken');
      const cleanTitle = selectedSession?.name || selectedSplit?.name || 'Quick Workout';
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

  const handleStart = async () => {
    setStarting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
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
                    selectedSplit?.id === split.id && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.08)' }
                  ]}
                  onPress={() => handleSelectSplit(split)}
                >
                  <View style={[styles.splitIcon, { backgroundColor: selectedSplit?.id === split.id ? colors.primary : colors.inputBg }]}>
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={20}
                      color={selectedSplit?.id === split.id ? '#FFF' : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.splitName, { color: colors.text }]}>{split.name}</Text>
                    <Text style={[styles.splitMeta, { color: colors.textMuted }]}>{split.session_count} sessions</Text>
                  </View>
                  {selectedSplit?.id === split.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: Choose Session */}
          {selectedSplit && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                <Text style={{ color: colors.primary }}>2. </Text>Choose Day
              </Text>

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
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.startBtn, (!selectedSplit || !selectedSession) && { opacity: 0.5 }]}
            onPress={handleStart}
            disabled={!selectedSplit || !selectedSession || starting}
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
        </View>
      </View>
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
  scrollContent: { paddingBottom: 120 },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, paddingHorizontal: 20, marginBottom: 14 },
  splitList: { paddingHorizontal: 20, gap: 12 },
  splitCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, borderWidth: 1.5 },
  splitIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  splitName: { fontFamily: FONTS.bodyBold, fontSize: 15, marginBottom: 2 },
  splitMeta: { fontFamily: FONTS.body, fontSize: 12 },
  createSplitCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 10 },
  createSplitText: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center' },
  noSessions: { fontFamily: FONTS.body, fontSize: 14, paddingHorizontal: 20, marginTop: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12 },
  startBtn: { borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, backgroundColor: P.cta },
  startBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFF', letterSpacing: 1 },
});
