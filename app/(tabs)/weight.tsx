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
import { P, scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import WeightScale from '../../components/weight/WeightScale';
import WeightHistoryCard from '../../components/weight/WeightHistoryCard';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function WeightScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightValue, setWeightValue] = useState(75);

  const fetchLogs = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_URL}/weight`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
      if (res.data.length > 0) {
        setWeightValue(parseFloat(res.data[0].weight));
      }
    } catch (err: any) {
      console.error('Error fetching weight logs:', err);
      if (!refreshing) showToast('Failed to load weight data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchLogs(); }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/weight`, { weight: weightValue }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(prev => [res.data, ...prev]);
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
      const token = await AsyncStorage.getItem('userToken');
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

  const currentWeight = logs.length > 0 ? parseFloat(logs[0].weight) : null;
  const prevWeight = logs.length > 1 ? parseFloat(logs[1].weight) : null;
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + vs(20) }]}
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
                  {currentWeight.toFixed(1)}
                  <Text style={[styles.statUnit, { color: colors.textMuted }]}> kg</Text>
                </Text>
                {delta !== null && (
                  <View style={styles.deltaRow}>
                    <Ionicons name={delta === 0 ? 'remove' : delta > 0 ? 'trending-up' : 'trending-down'} size={scale(12)} color={delta === 0 ? colors.textDim : delta > 0 ? '#f87171' : '#34d399'} />
                    <Text style={[styles.deltaText, { color: delta === 0 ? colors.textDim : delta > 0 ? '#f87171' : '#34d399' }]}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <WeightScale value={weightValue} onChange={setWeightValue} onSave={handleSave} saving={saving} />

          {logs.length > 0 ? (
            <>
              <View style={styles.historyLabelRow}>
                <Text style={[styles.historyLabel, { color: colors.text }]}>History</Text>
                <Text style={[styles.historyCount, { color: colors.textDim }]}>{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</Text>
              </View>
              {logs.map((item) => (
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
  },
  headerSection: {
    paddingTop: vs(8),
    gap: vs(14),
    marginBottom: vs(4),
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