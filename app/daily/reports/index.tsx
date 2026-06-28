import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import ActionModal from '../../../components/ui/ActionModal';
import { API_URL } from '../../../utils/api';
import { getToken } from '../../../utils/tokenStorage';
import { useUnits } from '../../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../../utils/units';

const coachAvatarSource = require('../../../assets/coach/fit-cartoon-character-training.png');



export default function ReportsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { unitSystem } = useUnits();
  const [reports, setReports] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const [reportsRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/daily/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/daily/reports/pending-workouts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      setReports(reportsRes.data);
      setPendingCount(pendingRes.data.length);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const handleRetry = useCallback(async (item: any) => {
    const key = `retry-${item.id}`;
    try {
      setActionId(key);
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/daily/workouts/${item.daily_workout_id}/generate-report`,
        { force: true },
        { headers }
      );
      showToast('Report retry started...', 'info');
      await fetch();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to retry report', 'error');
    } finally {
      setActionId(null);
    }
  }, [fetch, getAuthHeaders, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const key = `delete-${deleteTarget.id}`;
    try {
      setActionId(key);
      const headers = await getAuthHeaders();
      await axios.delete(`${API_URL}/daily/reports/${deleteTarget.id}`, { headers });
      showToast('Report deleted');
      setDeleteTarget(null);
      await fetch();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete report', 'error');
    } finally {
      setActionId(null);
    }
  }, [deleteTarget, fetch, getAuthHeaders, showToast]);

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      <View style={[s.header, { backgroundColor: isDark ? colors.bg : colors.primary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.primary : '#FFF'} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>Workout Reports</Text>
        <View style={{ flex: 1 }} />
        {pendingCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/daily/reports/new')}
            style={[s.newBtn, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="add" size={20} color={isDark ? colors.primary : '#FFF'} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            pendingCount > 0 ? (
              <TouchableOpacity
                style={[s.generateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/daily/reports/new')}
                activeOpacity={0.7}
              >
                <View style={[s.generateIcon, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
                  <MaterialCommunityIcons name="robot-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.generateTitle, { color: colors.text }]}>Generate Reports</Text>
                  <Text style={[s.generateSub, { color: colors.textMuted }]}>
                    {pendingCount} workout{pendingCount !== 1 ? 's' : ''} without analysis
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const isGenerating = item.status === 'generating';
            const retrying = actionId === `retry-${item.id}`;
            const deleting = actionId === `delete-${item.id}`;
            const progPct = item.progress_pct || 0;
            const phase = item.current_phase || '';

            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  router.push(`/daily/report/${item.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={s.cardTop}>
                  {isGenerating ? (
                    <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : 'rgba(37,150,190,0.1)' }]}>
                      <MaterialCommunityIcons name="progress-check" size={20} color={colors.primary} />
                    </View>
                  ) : (
                    <Image source={coachAvatarSource} style={s.coachAvatar} />
                  )}
                  <View style={s.cardInfo}>
                    <Text style={[s.cardDate, { color: colors.textMuted }]}>{item.workout_date}</Text>
                    <Text style={[s.cardSummary, { color: colors.text }]} numberOfLines={2}>
                      {isGenerating ? (phase || 'Generating workout analysis...') : item.summary}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <View style={s.cardStats}>
                  {item.total_duration_seconds ? (
                    <Text style={[s.stat, { color: colors.textDim }]}>
                      {Math.round(item.total_duration_seconds / 60)} min
                    </Text>
                  ) : null}
                  {item.total_volume ? (
                    <Text style={[s.stat, { color: colors.textDim }]}>
                      {formatWeightValue(Math.round(Number(item.total_volume)), unitSystem)} {weightUnit(unitSystem)}
                    </Text>
                  ) : null}
                  {isGenerating ? (
                    <View style={s.progressRow}>
                      <View style={[s.miniProgressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View style={[s.miniProgressFill, { width: `${Math.min(progPct, 100)}%` }]} />
                      </View>
                      <Text style={[s.stat, { color: '#F59E0B' }]}>{progPct}%</Text>
                    </View>
                  ) : null}
                </View>
                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => handleRetry(item)}
                    disabled={Boolean(actionId)}
                    activeOpacity={0.75}
                  >
                    {retrying ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                    )}
                    <Text style={[s.actionText, { color: colors.primary }]}>
                      {isGenerating ? 'Retry' : 'Regenerate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { 
                      backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', 
                      borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)' 
                    }]}
                    onPress={() => setDeleteTarget(item)}
                    disabled={Boolean(actionId)}
                    activeOpacity={0.75}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    )}
                    <Text style={[s.actionText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            pendingCount === 0 ? (
              <View style={s.center}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={colors.textDim} />
                <Text style={[s.emptyText, { color: colors.textMuted }]}>No reports yet</Text>
                <Text style={[s.emptySub, { color: colors.textDim }]}>Complete a workout to get an AI analysis</Text>
              </View>
            ) : null
          }
        />
      )}

      <ActionModal
        visible={Boolean(deleteTarget)}
        type="delete"
        title="Delete Report?"
        message="This removes the workout analysis from your reports. Your original workout stays saved."
        confirmText={actionId === `delete-${deleteTarget?.id}` ? 'DELETING...' : 'DELETE'}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!actionId) setDeleteTarget(null);
        }}
      />
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
  newBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 20, letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FONTS.body, fontSize: 15 },
  emptySub: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  coachAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardDate: { fontFamily: FONTS.body, fontSize: 11 },
  cardSummary: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  cardStats: { flexDirection: 'row', gap: 12, marginTop: 8, paddingLeft: 52, alignItems: 'center', flexWrap: 'wrap' },
  stat: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  miniProgressBg: { height: 4, borderRadius: 2, flex: 1, overflow: 'hidden' },
  miniProgressFill: { height: 4, borderRadius: 2, backgroundColor: '#F59E0B' },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingLeft: 52,
  },
  actionBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { fontFamily: FONTS.bodyBold, fontSize: 12 },
  generateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 8,
  },
  generateIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  generateTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  generateSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
});
