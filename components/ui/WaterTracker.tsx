import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';
import { getToken } from '../../utils/tokenStorage';

const { width: W } = Dimensions.get('window');

const SLIDER_W = W - 80;
const rem = (size: number) => Math.round((size / 390) * W);

interface Props {
  selectedDate: Date;
}

const HYDRATION = {
  card: '#2596BE',
  deepBlue: '#1A6E8A',
  navy: '#0F5A72',
  sky: '#67C7F0',
  yellow: '#F7CB16',
  amber: '#D9A404',
  orange: '#F28C28',
  red: '#E14B4B',
  green: '#10B981',
  lightGreen: '#8FD694',
  white: '#FFFFFF',
  ink: '#04282B',
};

const REMIND_INTERVAL: Record<string, number> = {
  sedentary: 60,
  lightly: 50,
  moderate: 40,
  very: 30,
  high: 30,
  extreme: 25,
};

const PRESETS = [
  { label: 'Sip', amount: 100, icon: 'water-outline' as const, bg: HYDRATION.yellow, text: HYDRATION.ink },
  { label: 'Cup', amount: 250, icon: 'cafe-outline' as const, bg: HYDRATION.sky, text: HYDRATION.ink },
  { label: 'Glass', amount: 350, icon: 'wine-outline' as const, bg: HYDRATION.deepBlue, text: HYDRATION.white },
  { label: 'Bottle', amount: 500, icon: 'flask-outline' as const, bg: HYDRATION.navy, text: HYDRATION.white },
];

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

function getHydrationState(totalWater: number, target: number, maxSafe: number) {
  const pct = target > 0 ? (totalWater / target) * 100 : 0;

  if (totalWater <= 0) {
    return {
      primary: HYDRATION.red,
      fill: 'rgba(225,75,75,0.82)',
      cupBg: 'rgba(225,75,75,0.10)',
      chipLabel: 'Empty',
    };
  }

  if (totalWater > maxSafe) {
    return {
      primary: HYDRATION.amber,
      fill: 'rgba(217,164,4,0.86)',
      cupBg: 'rgba(217,164,4,0.12)',
      chipLabel: 'Over Limit',
    };
  }

  if (totalWater >= target) {
    return {
      primary: HYDRATION.green,
      fill: 'rgba(16,185,129,0.86)',
      cupBg: 'rgba(16,185,129,0.12)',
      chipLabel: 'Goal Met',
    };
  }

  if (pct >= 55) {
    return {
      primary: HYDRATION.sky,
      fill: 'rgba(103,199,240,0.86)',
      cupBg: 'rgba(103,199,240,0.12)',
      chipLabel: `${Math.round(pct)}%`,
    };
  }

  if (pct >= 25) {
    return {
      primary: HYDRATION.yellow,
      fill: 'rgba(247,203,22,0.88)',
      cupBg: 'rgba(247,203,22,0.12)',
      chipLabel: `${Math.round(pct)}%`,
    };
  }

  return {
    primary: HYDRATION.orange,
    fill: 'rgba(242,140,40,0.86)',
    cupBg: 'rgba(242,140,40,0.12)',
    chipLabel: `${Math.round(pct)}%`,
  };
}

function getLogTone(amount: number) {
  if (amount >= 500) {
    return {
      bg: '#0D0D0D',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.5)',
      iconBg: 'rgba(77,208,225,0.15)',
      icon: '#4DD0E1',
      deleteBg: 'rgba(255,255,255,0.08)',
      deleteIcon: '#888',
    };
  }

  if (amount >= 350) {
    return {
      bg: '#0D0D0D',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.5)',
      iconBg: 'rgba(79,195,247,0.15)',
      icon: '#4FC3F7',
      deleteBg: 'rgba(255,255,255,0.08)',
      deleteIcon: '#888',
    };
  }

  if (amount >= 200) {
    return {
      bg: '#0D0D0D',
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.5)',
      iconBg: 'rgba(100,181,246,0.15)',
      icon: '#64B5F6',
      deleteBg: 'rgba(255,255,255,0.08)',
      deleteIcon: '#888',
    };
  }

  return {
    bg: '#0D0D0D',
    text: '#FFFFFF',
    subText: 'rgba(255,255,255,0.5)',
    iconBg: 'rgba(247,203,22,0.15)',
    icon: '#F7CB16',
    deleteBg: 'rgba(255,255,255,0.08)',
    deleteIcon: '#888',
  };
}

function getLogIcon(amount: number): string {
  if (amount <= 150) return 'water';
  if (amount <= 300) return 'cafe';
  if (amount <= 400) return 'wine';
  return 'flask';
}

function getDrinkTypeLabel(amount: number): string {
  if (amount <= 150) return 'Sip';
  if (amount <= 300) return 'Cup';
  if (amount <= 400) return 'Glass';
  return 'Bottle';
}



function PushReminderDisplay() {
  const { colors, isDark } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [interval, setIntervalVal] = useState(120);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await axios.get(`${API_URL}/water/reminder-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnabled(res.data.water_reminder_enabled);
        setIntervalVal(res.data.water_reminder_interval);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;

  const label = `${interval / 60}h`;

  return (
    <View style={{ marginBottom: rem(12) }}>
      <TouchableOpacity
        onPress={() => {
          try { require('expo-router').router.push('/profile/settings'); } catch {}
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: rem(10),
          paddingHorizontal: rem(4),
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rem(8) }}>
          <Ionicons name="notifications-outline" size={rem(18)} color="#2596BE" />
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: rem(14), color: isDark ? '#DDD' : '#333' }}>
            Push reminders
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: rem(6) }}>
          {enabled && (
            <Text style={{ fontFamily: FONTS.body, fontSize: rem(11), color: isDark ? colors.textMuted : 'rgba(0,0,0,0.5)' }}>
              Every {label}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={rem(14)} color={isDark ? colors.textMuted : 'rgba(0,0,0,0.4)'} />
        </View>
      </TouchableOpacity>
      <Text style={{
        fontFamily: FONTS.body, fontSize: rem(10), color: isDark ? colors.textMuted : 'rgba(0,0,0,0.45)',
        paddingLeft: rem(30), marginTop: rem(-6), marginBottom: rem(4),
      }}>
        Adjust in settings
      </Text>
    </View>
  );
}

function ReminderBanner({ lastLog, interval, totalWater, waterTarget }: any) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const nowMs = Date.now();

  if (!lastLog) {
    return (
      <View style={[rb.banner, { backgroundColor: HYDRATION.yellow }]}>
        <Ionicons name="information-circle-outline" size={18} color={HYDRATION.ink} />
        <Text style={[rb.text, { color: HYDRATION.ink }]}>
          Start your hydration journey and log your first drink.
        </Text>
      </View>
    );
  }

  if (totalWater >= waterTarget) {
    return (
      <View style={[rb.banner, { backgroundColor: HYDRATION.lightGreen }]}>
        <Ionicons name="checkmark-circle" size={18} color={HYDRATION.ink} />
        <Text style={[rb.text, { color: HYDRATION.ink }]}>
          Amazing. Daily hydration goal achieved.
        </Text>
      </View>
    );
  }

  const elapsedMin = Math.round((nowMs - (lastLog._clientLoggedAt || new Date(lastLog.logged_at).getTime())) / 60_000);
  const nextIn = Math.max(0, interval - elapsedMin);

  if (elapsedMin < interval) {
    return (
      <View style={[rb.banner, { backgroundColor: HYDRATION.green }]}>
        <Ionicons name="checkmark-circle-outline" size={18} color={HYDRATION.white} />
        <Text style={[rb.text, { color: HYDRATION.white }]}>
          Next drink in <Text style={[rb.emphasis, { color: HYDRATION.white }]}>{nextIn} min</Text>. Stay consistent.
        </Text>
      </View>
    );
  }

  const urgency = elapsedMin > interval * 1.5;
  const stateColor = urgency ? HYDRATION.red : HYDRATION.yellow;
  const iconColor = urgency ? HYDRATION.white : HYDRATION.ink;
  const textColor = urgency ? HYDRATION.white : HYDRATION.ink;
  return (
    <View style={[rb.banner, { backgroundColor: stateColor }]}>
      <Ionicons name={urgency ? 'warning-outline' : 'time-outline'} size={18} color={iconColor} />
      <Text style={[rb.text, { color: textColor }]}>
        {urgency ? `${elapsedMin} min since your last drink. Hydrate now!` : `Time to hydrate. It has been ${elapsedMin} min.`}
      </Text>
    </View>
  );
}

const rb = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  text: { fontFamily: FONTS.bodySemiBold, fontSize: 13, flex: 1 },
  emphasis: { fontFamily: FONTS.bodyBold, color: HYDRATION.deepBlue },
});

export default function WaterTracker({ selectedDate }: Props) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalWater, setTotalWater] = useState(0);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [sliderVal, setSliderVal] = useState(250);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const emptyGlowOpacity = useRef(new Animated.Value(0)).current;
  const emptyGlowScale = useRef(new Animated.Value(0.96)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('userData').then((d) => {
      if (d) setUserData(JSON.parse(d));
    });
  }, []);

  useEffect(() => {
    fetchWaterLogs();
  }, [selectedDate]);

  const fetchWaterLogs = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const d = selectedDate.toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/water?date=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotalWater(res.data.total_ml || 0);
      setWaterLogs(res.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { target, maxSafe } = getWaterTarget(userData);
  const interval = getInterval(userData?.activity_level);
  const lastLog = waterLogs[0] ?? null;
  const pct = target > 0 ? Math.min((totalWater / target) * 100, 100) : 0;
  const isOver = totalWater > maxSafe;
  const isGoal = totalWater >= target;
  const isToday = selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  const hydrationState = getHydrationState(totalWater, target, maxSafe);
  const progressRatio = maxSafe > 0 ? totalWater / maxSafe : 0;
  const goalRatio = maxSafe > 0 ? target / maxSafe : 0.625;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(totalWater / maxSafe, 1.1),
      duration: 900,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fillAnim, maxSafe, totalWater]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (totalWater <= 0) {
      emptyGlowOpacity.setValue(0.28);
      emptyGlowScale.setValue(0.96);
      loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(emptyGlowOpacity, { toValue: 0.78, duration: 900, useNativeDriver: true }),
            Animated.timing(emptyGlowScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(emptyGlowOpacity, { toValue: 0.24, duration: 900, useNativeDriver: true }),
            Animated.timing(emptyGlowScale, { toValue: 0.94, duration: 900, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
    } else {
      Animated.parallel([
        Animated.timing(emptyGlowOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(emptyGlowScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }

    return () => loop?.stop();
  }, [emptyGlowOpacity, emptyGlowScale, totalWater]);

  const cupFillH = fillAnim.interpolate({
    inputRange: [0, 0.625, 1, 1.1],
    outputRange: ['0%', '62.5%', '100%', '110%'],
  });

  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (totalWater > maxSafe) {
      blinkAnim.setValue(0.15);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.7,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(blinkAnim, {
            toValue: 0.15,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      );
      loop.start();
    } else {
      blinkAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [totalWater, maxSafe, blinkAnim]);

  const handleLog = async (amount: number) => {
    const exceeds = totalWater + amount > maxSafe;
    if (exceeds) showToast('Overhydration warning. Logging anyway.', 'error');
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/water`,
        { amount_ml: amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!exceeds) showToast(`+${amount} ml logged!`);
      setTotalWater((p) => p + amount);
      setWaterLogs((p) => [{ ...res.data, _clientLoggedAt: Date.now() }, ...p]);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 180, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(waveAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    } catch (e) {
      showToast('Failed to log water', 'error');
    }
  };

  const handleDelete = async (id: number, amount: number) => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/water/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Entry removed');
      setTotalWater((p) => Math.max(0, p - amount));
      setWaterLogs((p) => p.filter((l) => l.id !== id));
    } catch (e) {
      showToast('Failed to remove entry', 'error');
    }
  };

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

  if (loading) {
    return (
      <View style={[s.loadingCard, isDark && { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={HYDRATION.yellow} />
      </View>
    );
  }

  return (
    <View style={[s.card, isDark && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.28 }]}>
      <TouchableOpacity style={s.header} activeOpacity={0.88} onPress={() => setExpanded((prev) => !prev)}>
        <View style={s.headerLeft}>
          <View style={[s.headerIcon, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.16)' }]}>
            <Ionicons name="water" size={20} color={isDark ? HYDRATION.sky : HYDRATION.white} />
          </View>
          <View>
            <Text style={[s.title, isDark && { color: colors.text }]}>Hydration</Text>
            <Text style={[s.subtitle, isDark && { color: colors.textMuted }]}>Track your water intake</Text>
          </View>
        </View>

      
        <View style={[s.accordionIconWrap, isDark && { backgroundColor: colors.inputBg }]}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={isDark ? colors.text : '#FFF'} />
        </View>
      </TouchableOpacity>

      {!expanded && (
        <View style={s.collapsedSummaryRow}>
          <View style={[s.summaryChip, isDark ? { backgroundColor: colors.inputBg } : s.summaryChipLight]}>
            <Text style={[s.summaryLabelLight, isDark && { color: colors.textMuted }]}>Consumed</Text>
            <Text style={[s.summaryValueLight, isDark && { color: colors.text }]}>{totalWater.toLocaleString()} ml</Text>
          </View>
          <View style={[s.summaryChip, isDark ? { backgroundColor: colors.inputBg } : s.summaryChipGreen]}>
            <Text style={[s.summaryLabelLight, isDark && { color: colors.textMuted }]}>Goal</Text>
            <Text style={[s.summaryValueLight, isDark && { color: colors.text }]}>{target.toLocaleString()} ml</Text>
          </View>
          <View style={[s.summaryChip, isDark ? { backgroundColor: colors.inputBg } : s.summaryChipRed]}>
            <Text style={[s.summaryLabelLight, isDark && { color: colors.textMuted }]}>{isOver ? 'Over' : 'Remaining'}</Text>
            <Text style={[s.summaryValueLight, isDark && { color: colors.text }]}>{Math.abs(target - totalWater).toLocaleString()} ml</Text>
          </View>
        </View>
      )}

      {expanded && (
        <>
          <ReminderBanner lastLog={lastLog} interval={interval} totalWater={totalWater} waterTarget={target} />

          <PushReminderDisplay />

          <Animated.View style={[s.cupRow, { transform: [{ scale: pulseAnim }] }]}>
            <View style={s.cupWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  s.emptyGlow,
                  {
                    opacity: emptyGlowOpacity,
                    transform: [{ scale: emptyGlowScale }],
                  },
                ]}
              />

              <View
                style={[
                  s.cup,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
                    borderColor: totalWater > maxSafe ? '#EF4444' : (isDark ? colors.border : 'rgba(255,255,255,0.3)'),
                    borderWidth: 3,
                    borderTopWidth: 1,
                  }
                ]}
              >
                {totalWater > maxSafe && (
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFillObject,
                      {
                        backgroundColor: '#EF4444',
                        opacity: blinkAnim,
                        zIndex: 1,
                      }
                    ]}
                    pointerEvents="none"
                  />
                )}
                {totalWater === 0 && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      s.emptyInnerGlow,
                      {
                        opacity: emptyGlowOpacity,
                        transform: [{ scale: emptyGlowScale }],
                      },
                    ]}
                  />
                )}

                <Animated.View
                  style={[
                    s.cupFill,
                    {
                      height: cupFillH,
                      backgroundColor: hydrationState.fill,
                    },
                  ]}
                >
                  <Animated.View style={[s.waveSurface, { transform: [{ translateX: waveTranslateX }] }]} />
                  <View style={s.cupFillGlow} />
                </Animated.View>

                <View style={[s.goalLine, { bottom: '62.5%' }]}>
                  <View style={s.lineLabel}>
                    <Text style={s.lineLabelText}>Goal</Text>
                  </View>
                </View>
                <View style={[s.maxLine, { top: 14 }]}>
                  <View style={[s.lineLabel, { top: -10 }]}>
                    <Text style={s.lineLabelText}>Max Safe</Text>
                  </View>
                </View>
                <View style={s.cupLabel}>
                  <Text style={[s.cupNum, isDark && { color: colors.text }]}>{totalWater.toLocaleString()}</Text>
                  <Text style={[s.cupUnit, isDark && { color: colors.textMuted }]}>ml</Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, gap: 7 }}>
              <View style={[s.statCard, s.consumedCard, isDark && { backgroundColor: colors.inputBg }]}>
                <View style={s.statHeader}>
                  <View style={[s.statIconDark, isDark && { backgroundColor: 'rgba(247,203,22,0.15)' }]}>
                    <Ionicons name="analytics-outline" size={15} color={isDark ? HYDRATION.yellow : HYDRATION.ink} />
                  </View>
                  <Text style={[s.statLabelDark, isDark && { color: colors.textMuted }]}>Consumed</Text>
                </View>
                <Text style={[s.statValueDark, isDark && { color: colors.text }]}>{totalWater.toLocaleString()} ml</Text>
              </View>

              <View style={[s.statCard, s.goalCard, isDark && { backgroundColor: colors.inputBg }]}>
                <View style={s.statHeader}>
                  <View style={[s.statIconWhite, isDark && { backgroundColor: 'rgba(26,110,138,0.15)' }]}>
                    <Ionicons name="water-outline" size={15} color={isDark ? HYDRATION.deepBlue : HYDRATION.deepBlue} />
                  </View>
                  <Text style={[s.statLabelLight, isDark && { color: colors.textMuted }]}>Goal</Text>
                </View>
                <Text style={[s.statValueLight, isDark && { color: colors.text }]}>{target.toLocaleString()} ml</Text>
              </View>

              <View style={[s.statCard, s.maxCard, isDark && { backgroundColor: colors.inputBg }]}>
                <View style={s.statHeader}>
                  <View style={[s.statIconSoft, isDark && { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Ionicons name="shield-checkmark-outline" size={15} color={isDark ? HYDRATION.green : HYDRATION.ink} />
                  </View>
                  <Text style={[s.statLabelDark, isDark && { color: colors.textMuted }]}>Max Safe</Text>
                </View>
                <Text style={[s.statValueDark, isDark && { color: colors.text }]}>{maxSafe.toLocaleString()} ml</Text>
              </View>

              <View style={[s.statCard, isOver ? s.overCard : s.remainingCard, isDark && { backgroundColor: colors.inputBg }]}>
                <View style={s.statHeader}>
                  <View style={[s.statIconWhite, isDark && { backgroundColor: isOver ? 'rgba(217,164,4,0.15)' : 'rgba(103,199,240,0.15)' }]}>
                    <Ionicons name={isOver ? 'warning-outline' : 'hourglass-outline'} size={15} color={isDark ? (isOver ? HYDRATION.amber : HYDRATION.sky) : (isOver ? HYDRATION.ink : HYDRATION.white)} />
                  </View>
                  <Text style={[isOver ? s.statLabelDark : s.statLabelLight, isDark && { color: colors.textMuted }]}>{isOver ? 'Over by' : 'Remaining'}</Text>
                </View>
                <Text style={[isOver ? s.statValueDark : s.statValueLight, isDark && { color: colors.text }]}>
                  {Math.abs(target - totalWater).toLocaleString()} ml
                </Text>
              </View>
            </View>
          </Animated.View>

          {isToday ? (
            <>
              <View style={s.presets}>
                {PRESETS.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      s.presetBtn,
                      { backgroundColor: item.bg }
                    ]}
                    onPress={() => handleLog(item.amount)}
                    activeOpacity={0.78}
                  >
                    <Ionicons name={item.icon as any} size={18} color={item.text} />
                    <Text style={[s.presetAmt, { color: item.text }]}>+{item.amount}</Text>
                    <Text style={[s.presetLbl, { color: item.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[s.sliderSection, isDark && { backgroundColor: colors.inputBg }]}>
                <Text style={[s.sliderTitle, isDark && { color: colors.text }]}>
                  Custom: <Text style={[s.sliderHighlight, { color: hydrationState.primary }]}>{sliderVal} ml</Text>
                </Text>

                <View style={{ height: 36, justifyContent: 'center', marginBottom: 4 }}>
                  <View style={[s.sliderTrack, { width: SLIDER_W }, isDark && { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                    <View style={s.sliderTrackGlow} />
                    <View style={[s.sliderFill, { width: ((sliderVal - 50) / 700) * SLIDER_W, backgroundColor: hydrationState.primary }]} />
                    <View
                      {...sliderPan.panHandlers}
                      style={[
                        s.sliderThumb,
                        {
                          left: Math.max(0, ((sliderVal - 50) / 700) * (SLIDER_W - 26)),
                          backgroundColor: HYDRATION.white,
                        },
                      ]}
                    >
                      <Ionicons name="water" size={13} color={hydrationState.primary} />
                    </View>
                  </View>
                </View>

                <View style={[s.sliderLabels, { width: SLIDER_W }]}>
                  <Text style={[s.sliderEdge, isDark && { color: colors.textMuted }]}>50 ml</Text>
                  <Text style={[s.sliderEdge, isDark && { color: colors.textMuted }]}>750 ml</Text>
                </View>

                <TouchableOpacity
                  style={[s.logBtn, { backgroundColor: hydrationState.primary }]}
                  onPress={() => handleLog(sliderVal)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={18} color={HYDRATION.white} />
                  <Text style={s.logBtnText}>LOG {sliderVal} ML</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={[s.pastDateNotice, isDark && { backgroundColor: colors.inputBg }]}>
              <Ionicons name="lock-closed-outline" size={18} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.6)'} />
              <Text style={[s.pastDateText, isDark && { color: colors.textMuted }]}>Can only log water for today</Text>
            </View>
          )}

          {waterLogs.length > 0 && (
            <View style={s.logList}>
              <Text style={[s.logListTitle, isDark && { color: colors.text }]}>Today's Log</Text>
              {waterLogs.map((log) => {
                const t = new Date(log.logged_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const tone = getLogTone(log.amount_ml);
                const iconName = getLogIcon(log.amount_ml);
                const label = getDrinkTypeLabel(log.amount_ml);

                return (
                  <View
                    key={log.id}
                    style={[
                      s.logRow,
                      {
                        backgroundColor: tone.bg,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.06)',
                        marginBottom: 4,
                      }
                    ]}
                  >
                    <View style={[s.logIcon, { backgroundColor: tone.iconBg }]}>
                      <Ionicons name={iconName as any} size={15} color={tone.icon} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[s.logAmt, { color: tone.text, fontFamily: FONTS.bodyBold, fontSize: 14 }]}>
                        {label} <Text style={{ fontFamily: FONTS.body, fontSize: 12, opacity: 0.85 }}>({log.amount_ml} ml)</Text>
                      </Text>
                      <Text style={[s.logTime, { color: tone.subText, fontSize: 11 }]}>{t}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(log.id, log.amount_ml)}
                      style={[s.deleteBtn, { backgroundColor: tone.deleteBg }]}
                    >
                      <Ionicons name="trash-outline" size={15} color={tone.deleteIcon} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: HYDRATION.card,
    shadowColor: HYDRATION.deepBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  loadingCard: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 24,
    padding: 18,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HYDRATION.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.05, 20), color: HYDRATION.white },
  subtitle: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1, color: 'rgba(255,255,255,0.82)' },
  accordionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 112,
    flexShrink: 1,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 11, flexShrink: 1 },
  collapsedSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  summaryChip: { flex: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10 },
  summaryChipLight: { backgroundColor: HYDRATION.yellow },
  summaryChipGreen: { backgroundColor: HYDRATION.green },
  summaryChipRed: { backgroundColor: HYDRATION.red },
  summaryLabelLight: { fontFamily: FONTS.bodyBold, fontSize: 10, color: 'rgba(255,255,255,0.82)', marginBottom: 2 },
  summaryValueLight: { fontFamily: FONTS.heading, fontSize: 12, color: HYDRATION.white },
  summaryLabelDark: { fontFamily: FONTS.bodyBold, fontSize: 10, color: 'rgba(4,40,43,0.72)', marginBottom: 2 },
  summaryValueDark: { fontFamily: FONTS.heading, fontSize: 12, color: HYDRATION.ink },
  cupRow: { flexDirection: 'row', alignItems: 'stretch', gap: 14, marginBottom: 16 },
  cupWrap: { width: 122, justifyContent: 'flex-start', alignItems: 'center' },
  emptyGlow: {
    position: 'absolute',
    top: 2,
    left: 1,
    right: 1,
    bottom: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(225,75,75,0.45)',
  },
  emptyInnerGlow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 16,
  },
  cup: {
    width: 120,
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  cupFill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
  },
  waveSurface: {
    position: 'absolute',
    top: -3,
    left: -8,
    right: -8,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  cupFillGlow: {
    position: 'absolute',
    top: 6,
    left: 10,
    right: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  goalLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#F7CB16',
    zIndex: 5,
    borderRadius: 2,
  },
  maxLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#10B981',
    zIndex: 5,
    borderRadius: 2,
  },
  lineLabel: {
    position: 'absolute',
    right: 4,
    top: -9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#0D0D0D',
  },
  lineLabelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  cupLabel: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  cupNum: { fontFamily: FONTS.heading, fontSize: 26, letterSpacing: -1, color: HYDRATION.white },
  cupUnit: { fontFamily: FONTS.bodySemiBold, fontSize: 12, marginTop: 2, color: 'rgba(255,255,255,0.82)' },
  statCard: { borderRadius: 14, padding: 10 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  statIconDark: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(4,40,43,0.10)' },
  statIconWhite: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  statIconSoft: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.32)' },
  statLabelDark: { fontFamily: FONTS.bodyBold, fontSize: 10, color: HYDRATION.ink },
  statLabelLight: { fontFamily: FONTS.bodyBold, fontSize: 10, color: HYDRATION.white },
  statValueDark: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.034, 13), color: HYDRATION.ink },
  statValueLight: { fontFamily: FONTS.heading, fontSize: Math.min(W * 0.034, 13), color: HYDRATION.white },
  consumedCard: { backgroundColor: HYDRATION.yellow },
  goalCard: { backgroundColor: HYDRATION.deepBlue },
  maxCard: { backgroundColor: HYDRATION.lightGreen },
  remainingCard: { backgroundColor: HYDRATION.navy },
  overCard: { backgroundColor: HYDRATION.amber },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  presetBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  presetAmt: { fontFamily: FONTS.bodyBold, fontSize: Math.min(W * 0.033, 13) },
  presetLbl: { fontFamily: FONTS.body, fontSize: 9 },
  sliderSection: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 14,
  },
  sliderTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13, marginBottom: 10, color: HYDRATION.white },
  sliderHighlight: { fontFamily: FONTS.heading },
  sliderTrack: { height: 12, borderRadius: 999, position: 'relative', backgroundColor: 'rgba(255,255,255,0.16)' },
  sliderTrackGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sliderFill: { height: '100%', borderRadius: 999 },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sliderEdge: { fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.72)' },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
  },
  logBtnText: { color: HYDRATION.white, fontFamily: FONTS.bodyBold, fontSize: 13, letterSpacing: 0.5 },
  logList: { paddingTop: 4, gap: 8 },
  logListTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, marginBottom: 8, letterSpacing: 0.3, color: HYDRATION.white },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  logIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logAmt: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  logTime: { fontFamily: FONTS.body, fontSize: 11, marginTop: 1 },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastDateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  pastDateText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
});
