import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, PanResponder, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const SLIDER_W = W - 80;

interface Props { selectedDate: Date; }

// ── Smart reminder intervals (minutes) by activity level ─────────────────────
const REMIND_INTERVAL: Record<string, number> = {
  sedentary: 60, lightly: 50, moderate: 40, very: 30, high: 30, extreme: 25,
};

function getInterval(activityLevel?: string): number {
  const lvl = (activityLevel || '').toLowerCase();
  for (const key of Object.keys(REMIND_INTERVAL)) {
    if (lvl.includes(key)) return REMIND_INTERVAL[key];
  }
  return 60;
}

function getWaterTarget(userData: any): { target: number; maxSafe: number } {
  const weight = parseFloat((userData?.weight || '70').toString().replace(/[^0-9.]/g, '')) || 70;
  let target = Math.round(weight * 35);
  const lvl = (userData?.activity_level || '').toLowerCase();
  if (lvl.includes('very') || lvl.includes('high') || lvl.includes('extreme')) target += 750;
  else if (lvl.includes('moderate')) target += 400;
  else if (lvl.includes('light')) target += 200;
  return { target, maxSafe: Math.round(target * 1.6) };
}

// ── Animated water fill bar ───────────────────────────────────────────────────
function WaterBar({ pct, isOver, isGoal }: { pct: number; isOver: boolean; isGoal: boolean }) {
  const { colors } = useTheme();
  const fillAnim = useRef(new Animated.Value(0)).current;
  const color = isOver ? '#EF4444' : isGoal ? '#10B981' : '#3B82F6';

  useEffect(() => {
    Animated.spring(fillAnim, { toValue: Math.min(pct / 100, 1), useNativeDriver: false, friction: 7, tension: 35 }).start();
  }, [pct]);

  const fillW = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={[bar.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[bar.fill, { width: fillW, backgroundColor: color }]} />
        {/* Max limit marker at target position (= 62.5% of maxSafe) */}
        <View style={[bar.marker, { left: '62.5%', borderColor: '#10B981' }]}>
          <View style={[bar.markerLine, { backgroundColor: '#10B981' }]} />
        </View>
        {/* Over-limit marker at 100% */}
        <View style={[bar.marker, { right: 2, borderColor: '#EF4444' }]}>
          <View style={[bar.markerLine, { backgroundColor: '#EF4444' }]} />
        </View>
      </View>
      <View style={bar.labelRow}>
        <Text style={[bar.label, { color: colors.textDim }]}>0 ml</Text>
        <View style={bar.goalBadge}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981', marginRight: 4 }} />
          <Text style={[bar.label, { color: '#10B981' }]}>Goal</Text>
        </View>
        <View style={bar.goalBadge}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444', marginRight: 4 }} />
          <Text style={[bar.label, { color: '#EF4444' }]}>Max</Text>
        </View>
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  track: { height: 14, borderRadius: 7, overflow: 'visible', position: 'relative' },
  fill: { height: '100%', borderRadius: 7 },
  marker: { position: 'absolute', top: -5, width: 2, height: 24, alignItems: 'center' },
  markerLine: { width: 2, flex: 1, borderRadius: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  label: { fontFamily: FONTS.body, fontSize: 10 },
  goalBadge: { flexDirection: 'row', alignItems: 'center' },
});

// ── Smart reminder banner ─────────────────────────────────────────────────────
function ReminderBanner({ lastLog, interval, totalWater, waterTarget }: any) {
  const { colors } = useTheme();
  const [, setTick] = useState(0);

  // Tick every 30s to update the countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const nowMs = Date.now();

  if (!lastLog) {
    return (
      <View style={[rb.banner, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
        <Ionicons name="water-outline" size={18} color="#3B82F6" />
        <Text style={[rb.text, { color: '#3B82F6' }]}>Start your hydration journey! Log your first drink. 💧</Text>
      </View>
    );
  }

  if (totalWater >= waterTarget) {
    return (
      <View style={[rb.banner, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
        <Text style={[rb.text, { color: '#10B981' }]}>Amazing! Daily hydration goal achieved! 🎉</Text>
      </View>
    );
  }

  const elapsedMin = Math.round((nowMs - new Date(lastLog.logged_at).getTime()) / 60_000);
  const nextIn = Math.max(0, interval - elapsedMin);

  if (elapsedMin < interval) {
    return (
      <View style={[rb.banner, { backgroundColor: '#10B98110', borderColor: '#10B98125' }]}>
        <Ionicons name="time-outline" size={18} color="#10B981" />
        <Text style={[rb.text, { color: colors.text }]}>
          Next drink in <Text style={{ color: '#10B981', fontFamily: FONTS.bodyBold }}>{nextIn} min</Text>
          {' '}· Stay consistent! 🚀
        </Text>
      </View>
    );
  }

  // Overdue
  const urgency = elapsedMin > interval * 1.5;
  return (
    <View style={[rb.banner, { backgroundColor: urgency ? '#EF444415' : '#F59E0B15', borderColor: urgency ? '#EF444430' : '#F59E0B30' }]}>
      <Ionicons name={urgency ? 'warning-outline' : 'notifications-outline'} size={18} color={urgency ? '#EF4444' : '#F59E0B'} />
      <Text style={[rb.text, { color: urgency ? '#EF4444' : '#F59E0B' }]}>
        {urgency ? `⚠️ ${elapsedMin} min since last drink! Drink now!` : `Time to hydrate! It's been ${elapsedMin} min. 🙏`}
      </Text>
    </View>
  );
}

const rb = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  text: { fontFamily: FONTS.bodySemiBold, fontSize: 13, flex: 1 },
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function WaterTracker({ selectedDate }: Props) {
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [totalWater, setTotalWater] = useState(0);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [sliderVal, setSliderVal] = useState(250);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load user data from cache
  useEffect(() => {
    AsyncStorage.getItem('userData').then(d => { if (d) setUserData(JSON.parse(d)); });
  }, []);

  useEffect(() => { fetchWaterLogs(); }, [selectedDate]);

  const fetchWaterLogs = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const d = selectedDate.toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/water?date=${d}`, { headers: { Authorization: `Bearer ${token}` } });
      setTotalWater(res.data.total_ml || 0);
      setWaterLogs(res.data.logs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const { target, maxSafe } = getWaterTarget(userData);
  const interval = getInterval(userData?.activity_level);
  const lastLog = waterLogs[0] ?? null;
  const pct = Math.min((totalWater / target) * 100, 100);
  const isOver = totalWater > maxSafe;
  const isGoal = totalWater >= target;

  const handleLog = async (amount: number) => {
    const exceeds = totalWater + amount > maxSafe;
    if (exceeds) showToast('⚠️ Overhydration warning! Logging anyway.', 'error');
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(`${API_URL}/water`, { amount_ml: amount }, { headers: { Authorization: `Bearer ${token}` } });
      if (!exceeds) showToast(`+${amount} ml logged! 💧`);
      setTotalWater(p => p + amount);
      setWaterLogs(p => [res.data, ...p]);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } catch (e) { showToast('Failed to log water', 'error'); }
  };

  const handleDelete = async (id: number, amount: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/water/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Entry removed');
      setTotalWater(p => Math.max(0, p - amount));
      setWaterLogs(p => p.filter(l => l.id !== id));
    } catch (e) { showToast('Failed to remove entry', 'error'); }
  };

  // Slider PanResponder
  const panRef = useRef(new Animated.Value(0)).current;
  const sliderPan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const baseX = ((sliderVal - 50) / 700) * SLIDER_W;
      const newX = Math.max(0, Math.min(SLIDER_W, baseX + g.dx));
      const raw = Math.round((newX / SLIDER_W) * 700 + 50);
      setSliderVal(Math.round(raw / 50) * 50);
    },
  });

  // 4-state water color
  const waterColor = isOver
    ? '#EF4444'
    : isGoal
    ? '#10B981'
    : pct >= 30
    ? '#3B82F6'
    : '#F59E0B'; // low = amber

  // Animated fill for cup
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: Math.min(totalWater / maxSafe, 1.1),
      useNativeDriver: false, friction: 7, tension: 35,
    }).start();
  }, [totalWater]);
  const cupFillH = fillAnim.interpolate({
    inputRange: [0, 0.625, 1, 1.1],           // 0=empty, 0.625=goal, 1=maxSafe, 1.1=overflow
    outputRange: ['0%', '62.5%', '100%', '110%'],
  });

  if (loading) {
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, height: 180, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={[s.headerIcon, { backgroundColor: waterColor + '20' }]}>
            <Ionicons name="water" size={20} color={waterColor} />
          </View>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Hydration</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>Track your water intake</Text>
          </View>
        </View>
        <View style={[s.chip, { backgroundColor: waterColor + '18' }]}>
          <View style={[s.chipDot, { backgroundColor: waterColor }]} />
          <Text style={[s.chipText, { color: waterColor }]}>
            {isOver ? 'Over Limit' : isGoal ? 'Goal Met ✓' : `${Math.round(pct)}%`}
          </Text>
        </View>
      </View>

      {/* ── Smart reminder banner ── */}
      <ReminderBanner lastLog={lastLog} interval={interval} totalWater={totalWater} waterTarget={target} />

      {/* ── Cup + side stats row ── */}
      <Animated.View style={[s.cupRow, { transform: [{ scale: pulseAnim }] }]}>

        {/* Animated cup */}
        <View style={[s.cup, { borderColor: waterColor }]}>
          {/* water fill */}
          <Animated.View style={[
            s.cupFill,
            { height: cupFillH, backgroundColor: waterColor + '90' },
          ]} />
          {/* Goal line marker */}
          <View style={[s.goalLine, { bottom: '62.5%', borderColor: waterColor === '#EF4444' ? '#10B981' : waterColor }]} />
          {/* Center label */}
          <View style={s.cupLabel}>
            <Text style={[s.cupNum, { color: colors.text }]}>{totalWater.toLocaleString()}</Text>
            <Text style={[s.cupUnit, { color: colors.textMuted }]}>ml</Text>
          </View>
        </View>

        {/* Side mini stats */}
        <View style={{ flex: 1, gap: 7 }}>
          <View style={[s.miniCard, { backgroundColor: waterColor + '12', borderColor: waterColor + '30' }]}>
            <Text style={[s.miniCardLabel, { color: colors.textDim }]}>Consumed</Text>
            <Text style={[s.miniCardVal, { color: waterColor }]}>{totalWater.toLocaleString()} ml</Text>
          </View>
          <View style={[s.miniCard, { backgroundColor: '#10B98110', borderColor: '#10B98125' }]}>
            <Text style={[s.miniCardLabel, { color: colors.textDim }]}>Goal</Text>
            <Text style={[s.miniCardVal, { color: '#10B981' }]}>{target.toLocaleString()} ml</Text>
          </View>
          <View style={[s.miniCard, { backgroundColor: '#EF444410', borderColor: '#EF444425' }]}>
            <Text style={[s.miniCardLabel, { color: colors.textDim }]}>Max Safe</Text>
            <Text style={[s.miniCardVal, { color: '#EF4444' }]}>{maxSafe.toLocaleString()} ml</Text>
          </View>
          <View style={[s.miniCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[s.miniCardLabel, { color: colors.textDim }]}>{isOver ? 'Over by' : 'Remaining'}</Text>
            <Text style={[s.miniCardVal, { color: isOver ? '#EF4444' : '#10B981' }]}>
              {Math.abs(target - totalWater).toLocaleString()} ml
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Progress bar with markers ── */}
      <WaterBar pct={(totalWater / maxSafe) * 100} isOver={isOver} isGoal={isGoal} />

      {/* ── Quick preset buttons ── */}
      <View style={s.presets}>
        {[
          { label: 'Sip', amount: 100, icon: 'water-outline' },
          { label: 'Cup', amount: 250, icon: 'cafe-outline' },
          { label: 'Glass', amount: 350, icon: 'wine-outline' },
          { label: 'Bottle', amount: 500, icon: 'beer-outline' },
        ].map(item => (
          <TouchableOpacity
            key={item.label}
            style={[s.presetBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => handleLog(item.amount)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon as any} size={18} color={waterColor} />
            <Text style={[s.presetAmt, { color: colors.text }]}>+{item.amount}</Text>
            <Text style={[s.presetLbl, { color: colors.textDim }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Custom slider ── */}
      <View style={s.sliderSection}>
        <Text style={[s.sliderTitle, { color: colors.text }]}>
          Custom: <Text style={{ color: waterColor, fontFamily: FONTS.heading }}>{sliderVal} ml</Text>
        </Text>
        <View style={{ height: 36, justifyContent: 'center', marginBottom: 4 }}>
          <View style={[s.sliderTrack, { width: SLIDER_W, backgroundColor: colors.border }]}>
            <View style={[s.sliderFill, { width: ((sliderVal - 50) / 700) * SLIDER_W, backgroundColor: waterColor }]} />
            <View
              {...sliderPan.panHandlers}
              style={[s.sliderThumb, { left: Math.max(0, ((sliderVal - 50) / 700) * (SLIDER_W - 26)), backgroundColor: waterColor }]}
            />
          </View>
        </View>
        <View style={[s.sliderLabels, { width: SLIDER_W }]}>
          <Text style={[s.sliderEdge, { color: colors.textDim }]}>50 ml</Text>
          <Text style={[s.sliderEdge, { color: colors.textDim }]}>750 ml</Text>
        </View>
        <TouchableOpacity style={[s.logBtn, { backgroundColor: waterColor }]} onPress={() => handleLog(sliderVal)} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color="#FFF" />
          <Text style={s.logBtnText}>LOG {sliderVal} ML</Text>
        </TouchableOpacity>
      </View>

      {/* ── Interval log list ── */}
      {waterLogs.length > 0 && (
        <View style={[s.logList, { borderTopColor: colors.border }]}>
          <Text style={[s.logListTitle, { color: colors.text }]}>Today's Log</Text>
          {waterLogs.map((log, idx) => {
            const t = new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const logColor = log.amount_ml >= 500 ? '#10B981' : log.amount_ml >= 250 ? '#3B82F6' : colors.textMuted;
            return (
              <View key={log.id} style={[s.logRow, { borderBottomColor: colors.border, opacity: idx > 4 ? 0.6 : 1 }]}>
                <View style={[s.logIcon, { backgroundColor: logColor + '20' }]}>
                  <Ionicons name="water" size={14} color={logColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.logAmt, { color: colors.text }]}>{log.amount_ml} ml</Text>
                  <Text style={[s.logTime, { color: colors.textDim }]}>{t}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(log.id, log.amount_ml)} style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 0, marginBottom: 16, borderRadius: 24, borderWidth: 1, padding: 18,
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.05, 20) },
  subtitle: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  resetBtnText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: '#EF4444' },
  // Cup styles
  cupRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cup: {
    width: 120, height: 155, borderRadius: 20, borderWidth: 3, borderTopWidth: 1,
    overflow: 'hidden', position: 'relative',
    justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.02)',
  },
  cupFill: { width: '100%', position: 'absolute', bottom: 0 },
  goalLine: {
    position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5,
    borderStyle: 'dashed',
  },
  cupLabel: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  cupNum: { fontFamily: FONTS.heading, fontSize: 26, letterSpacing: -1 },
  cupUnit: { fontFamily: FONTS.bodySemiBold, fontSize: 12, marginTop: 2 },
  miniCard: { borderRadius: 12, borderWidth: 1, padding: 9 },
  miniCardLabel: { fontFamily: FONTS.body, fontSize: 10, marginBottom: 2 },
  miniCardVal: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.034, 13) },
  bigNumWrap: { flexDirection: 'row', alignItems: 'baseline' },
  bigNum: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.09, 36), letterSpacing: -1 },
  bigUnit: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.032, 13) },
  miniStatLabel: { fontFamily: FONTS.body, fontSize: 9, marginTop: 2 },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  presetBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  presetAmt: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.033, 13) },
  presetLbl: { fontFamily: FONTS.body, fontSize: 9 },
  sliderSection: { alignItems: 'center', marginBottom: 16 },
  sliderTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginBottom: 10 },
  sliderTrack: { height: 10, borderRadius: 5, position: 'relative' },
  sliderFill: { height: '100%', borderRadius: 5 },
  sliderThumb: {
    position: 'absolute', top: -8, width: 26, height: 26, borderRadius: 13,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sliderEdge: { fontFamily: FONTS.body, fontSize: 10 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 20, width: '100%', justifyContent: 'center',
  },
  logBtnText: { color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.5 },
  logList: { borderTopWidth: 1, paddingTop: 14, gap: 4 },
  logListTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 8, letterSpacing: 0.3 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 0.5,
  },
  logIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logAmt: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  logTime: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 6 },
});
