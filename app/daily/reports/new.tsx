import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_URL } from '../../../utils/api';



export default function GenerateReportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/daily/reports/pending-workouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkouts(res.data);
    } catch (err) {
      console.error('Failed to load pending workouts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleGenerate = async (workoutId: number) => {
    if (generatingIds.has(workoutId)) return;
    setGeneratingIds(prev => new Set(prev).add(workoutId));
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_URL}/daily/workouts/${workoutId}/generate-report`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Report generating...', 'info');
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to generate report', 'error');
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(workoutId);
        return next;
      });
    }
  };

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <View style={[s.header, { backgroundColor: isDark ? colors.bg : colors.primary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Generate Report</Text>
        <View style={{ flex: 1 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : workouts.length === 0 ? (
        <View style={s.center}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.primary} />
          <Text style={[s.emptyText, { color: colors.textMuted }]}>All caught up!</Text>
          <Text style={[s.emptySub, { color: colors.textDim }]}>Every completed workout has been analyzed.</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[s.hint, { color: colors.textMuted }]}>
              Select a workout to generate an AI analysis report
            </Text>
          }
          renderItem={({ item }) => {
            const isGenerating = generatingIds.has(item.id);
            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: isGenerating ? 0.6 : 1 }]}
                onPress={() => handleGenerate(item.id)}
                disabled={isGenerating}
                activeOpacity={0.7}
              >
                <View style={s.cardLeft}>
                  <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color={colors.primary} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardTitle, { color: colors.text }]}>
                      {item.title || `Workout ${item.workout_date}`}
                    </Text>
                    <Text style={[s.cardDate, { color: colors.textMuted }]}>
                      {item.workout_date} &middot; {item.workout_time || ''}
                    </Text>
                    <View style={s.statsRow}>
                      {item.total_duration_seconds ? (
                        <Text style={[s.stat, { color: colors.textDim }]}>
                          {Math.round(item.total_duration_seconds / 60)} min
                        </Text>
                      ) : null}
                      {item.total_volume ? (
                        <Text style={[s.stat, { color: colors.textDim }]}>
                          {Math.round(Number(item.total_volume)).toLocaleString()} kg
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={[s.generateBtn, {
                  backgroundColor: isGenerating
                    ? (isDark ? 'rgba(247,203,22,0.1)' : 'rgba(37,150,190,0.1)')
                    : (isDark ? 'rgba(37,150,190,0.15)' : colors.primary)
                }]}>
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#F7CB16" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="robot-outline" size={16} color={isDark ? colors.primary : '#FFF'} />
                      <Text style={[s.generateBtnText, { color: isDark ? colors.primary : '#FFF' }]}>Generate</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontFamily: FONTS.heading, fontSize: 20, marginTop: 12 },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  hint: { fontFamily: FONTS.body, fontSize: 12, marginBottom: 16, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 1 },
  cardTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  cardDate: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  stat: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  generateBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.3 },
});
