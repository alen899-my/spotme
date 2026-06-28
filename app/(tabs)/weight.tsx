import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../constants/theme';
import { scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import WeightScale from '../../components/weight/WeightScale';
import WeightHistoryCard from '../../components/weight/WeightHistoryCard';
import WeightChart from '../../components/weight/WeightChart';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';
import { useUnits } from '../../contexts/UnitContext';
import { formatWeightValue, weightUnit } from '../../utils/units';

const RANGE_OPTIONS = [
  { key: '7d', label: '1W' },
  { key: '30d', label: '1M' },
  { key: '90d', label: '3M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
];

export default function WeightScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { unitSystem } = useUnits();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightValue, setWeightValue] = useState(75);
  const [range, setRange] = useState('7d');

  const fetchLogs = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/weight`, {
        params: { range },
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
      if (res.data.length > 0) {
        setWeightValue(parseFloat(res.data[res.data.length - 1].weight));
      }
    } catch (err: any) {
      console.error('Error fetching weight logs:', err);
      if (!refreshing) showToast('Failed to load weight data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useFocusEffect(useCallback(() => { fetchLogs(); }, [range]));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/weight`, { weight: weightValue }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(prev => [...prev, res.data]);
      showToast('Weight logged! 🎯');
    } catch (err: any) {
      console.error('Error saving weight:', err);
      showToast('Failed to save weight', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/weight/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(prev => prev.filter(l => l.id !== id));
      showToast('Entry deleted');
    } catch (err) {
      console.error('Error deleting weight:', err);
      showToast('Failed to delete entry', 'error');
    }
  };

  const reversedLogs = [...logs].reverse();
  const currentWeight = logs.length > 0 ? parseFloat(logs[logs.length - 1].weight) : null;
  const prevWeight = logs.length > 1 ? parseFloat(logs[logs.length - 2].weight) : null;
  const delta = currentWeight !== null && prevWeight !== null
    ? currentWeight - prevWeight
    : null;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + vs(100) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} tintColor={colors.primary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.screenTitle, { color: colors.text }]}>Weight Tracker</Text>
              <Text style={[styles.screenSub, { color: colors.textMuted }]}>Log your daily body weight and track progress over time</Text>
            </View>
            {currentWeight !== null && (
              <View style={[styles.statPanel, { backgroundColor: isDark ? '#0f0f0f' : '#f0f0eb', borderColor: isDark ? '#1e1e1e' : '#e0e0d8' }]}>
                <Text style={[styles.statWeight, { color: colors.text }]}>
                  {formatWeightValue(currentWeight, unitSystem)}
                  <Text style={[styles.statUnit, { color: colors.textMuted }]}> {weightUnit(unitSystem)}</Text>
                </Text>
                {delta !== null && (
                  <View style={styles.deltaRow}>
                    <Ionicons name={delta === 0 ? 'remove' : delta > 0 ? 'trending-up' : 'trending-down'} size={scale(12)} color={delta === 0 ? colors.textDim : delta > 0 ? '#f87171' : '#34d399'} />
                    <Text style={[styles.deltaText, { color: delta === 0 ? colors.textDim : delta > 0 ? '#f87171' : '#34d399' }]}>
                      {delta > 0 ? '+' : ''}{formatWeightValue(delta, unitSystem)} {weightUnit(unitSystem)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Range Pills */}
          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.rangePill,
                  {
                    backgroundColor: range === opt.key ? colors.primary : (isDark ? '#0f0f0f' : '#f0f0eb'),
                    borderColor: range === opt.key ? colors.primary : (isDark ? '#1e1e1e' : '#e0e0d8'),
                  },
                ]}
                onPress={() => setRange(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    { color: range === opt.key ? '#FFF' : colors.textMuted },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <WeightChart data={logs} range={range} />

          {logs.length > 0 && (
            <View style={[styles.prevWeightBanner, { backgroundColor: isDark ? '#0f0f0f' : '#f0f0eb', borderColor: isDark ? '#1e1e1e' : '#e0e0d8' }]}>
              <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.prevWeightLabel, { color: colors.textMuted }]}>Latest: </Text>
              <Text style={[styles.prevWeightValue, { color: colors.text }]}>{formatWeightValue(Number(currentWeight || 0), unitSystem)}</Text>
              <Text style={[styles.prevWeightUnit, { color: colors.textMuted }]}> {weightUnit(unitSystem)}</Text>
            </View>
          )}

          <WeightScale value={weightValue} onChange={setWeightValue} onSave={handleSave} saving={saving} />

          {logs.length > 0 ? (
            <>
              <View style={styles.historyLabelRow}>
                <Text style={[styles.historyLabel, { color: colors.text }]}>History</Text>
                <Text style={[styles.historyCount, { color: colors.textDim }]}>{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</Text>
              </View>
              {reversedLogs.map((item) => (
                <View key={item.id} style={{ marginBottom: vs(10) }}>
                  <WeightHistoryCard item={item} onDelete={handleDelete} />
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#0f0f0f' : '#f0f0eb' }]}>
                <Ionicons name="scale-outline" size={scale(36)} color={colors.textDim} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No entries yet</Text>
              <Text style={[styles.emptySub, { color: colors.textDim }]}>Log your first weight above to begin</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    flexGrow: 1,
  },
  headerSection: {
    paddingTop: vs(8),
    gap: vs(12),
    marginBottom: vs(4),
  },
  rangeRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  rangePill: {
    flex: 1,
    paddingVertical: vs(8),
    borderRadius: scale(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  rangePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
  prevWeightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: vs(8),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  prevWeightLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
  },
  prevWeightValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(18),
    letterSpacing: -0.3,
  },
  prevWeightUnit: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(32),
    letterSpacing: -1,
    lineHeight: scale(34),
  },
  screenSub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    letterSpacing: 0.5,
    marginTop: vs(2),
  },
  statPanel: {
    borderRadius: scale(14),
    borderWidth: 1,
    paddingHorizontal: scale(14),
    paddingVertical: vs(8),
    alignItems: 'flex-end',
    gap: vs(2),
  },
  statWeight: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    letterSpacing: -0.5,
  },
  statUnit: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  deltaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(11),
  },
  historyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: vs(4),
    marginBottom: vs(-2),
  },
  historyLabel: {
    fontFamily: FONTS.heading,
    fontSize: scale(22),
    letterSpacing: -0.3,
  },
  historyCount: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    letterSpacing: 0.5,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: vs(50),
    gap: vs(8),
  },
  emptyIconWrap: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  emptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(15),
  },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: scale(12),
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
});