import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

interface WaterTrackerProps {
  selectedDate: Date;
}

export default function WaterTracker({ selectedDate }: WaterTrackerProps) {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [totalWater, setTotalWater] = useState(0);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  // Animated wave / level height
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Custom slider log state (in ml)
  const [sliderVal, setSliderVal] = useState(250);
  const sliderWidth = SCREEN_WIDTH - 72; // responsive width for slider track
  const pan = useRef(new Animated.Value(0)).current;

  // Calculate targets
  const getWaterTargets = () => {
    let weight = 70; // kg default
    if (userData) {
      if (userData.weight) {
        weight = parseFloat(userData.weight.toString().replace(/[^0-9.]/g, '')) || 70;
      }
    }
    // Base recommendation: 35ml per kg body weight
    let target = Math.round(weight * 35);
    // Adjust target based on fitness goals or active levels if present
    if (userData?.activity_level?.toLowerCase().includes('very') || userData?.activity_level?.toLowerCase().includes('high')) {
      target += 750; // Active users need more hydration
    } else if (userData?.activity_level?.toLowerCase().includes('moderate')) {
      target += 350;
    }
    
    // Max safe water limit is target * 1.6 (to prevent water intoxication)
    const maxSafe = Math.round(target * 1.6);
    return { target, maxSafe };
  };

  const { target: waterTarget, maxSafe: waterMaxSafe } = getWaterTargets();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    fetchWaterLogs();
  }, [selectedDate]);

  useEffect(() => {
    // Animate the fill level of water cup/container
    const pct = waterTarget > 0 ? totalWater / waterTarget : 0;
    Animated.spring(fillAnim, {
      toValue: Math.min(pct, 1.2), // allow overflowing visual slightly but capped
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    // Pulse animation if limit exceeded or completed
    if (totalWater >= waterTarget) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 250, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [totalWater, waterTarget]);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUserData(JSON.parse(data));
    } catch (e) {
      console.error('Error loading userData', e);
    }
  };

  const fetchWaterLogs = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const dateString = selectedDate.toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/water?date=${dateString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotalWater(res.data.total_ml || 0);
      setWaterLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching water logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWater = async (amount: number) => {
    const isExceeding = totalWater + amount > waterMaxSafe;
    if (isExceeding) {
      showToast('⚠️ Overhydration Warning! You are exceeding the maximum safe hydration limit.', 'error');
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.post(
        `${API_URL}/water`,
        { amount_ml: amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!isExceeding) {
        showToast(`Logged ${amount}ml of Water! 💧`);
      }
      
      // Update locally immediately
      setTotalWater((prev) => prev + amount);
      setWaterLogs((prev) => [res.data, ...prev]);
    } catch (err) {
      console.error('Error logging water:', err);
      showToast('Failed to log water', 'error');
    }
  };

  const handleDeleteLog = async (id: number, amount: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_URL}/water/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Water entry deleted');
      setTotalWater((prev) => Math.max(0, prev - amount));
      setWaterLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (err) {
      console.error('Error deleting water log:', err);
      showToast('Failed to delete water entry', 'error');
    }
  };

  // PanResponder for custom animated interactive slider
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const newX = Math.max(0, Math.min(sliderWidth, gestureState.dx + (sliderVal - 50) / (750) * sliderWidth));
      const calculatedMl = Math.round((newX / sliderWidth) * 750 + 50);
      // Snap to nearest 50ml
      setSliderVal(Math.round(calculatedMl / 50) * 50);
    },
  });

  const waterHeight = fillAnim.interpolate({
    inputRange: [0, 1, 1.2],
    outputRange: ['0%', '100%', '115%'],
  });

  const isOverHydrated = totalWater >= waterMaxSafe;
  const isTargetMet = totalWater >= waterTarget;

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', height: 200 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water" size={24} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>Hydration Tracker</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: isOverHydrated ? '#EF444415' : isTargetMet ? '#10B98115' : '#3B82F615' }]}>
          <View style={[styles.statusDot, { backgroundColor: isOverHydrated ? '#EF4444' : isTargetMet ? '#10B981' : '#3B82F6' }]} />
          <Text style={[styles.statusChipText, { color: isOverHydrated ? '#EF4444' : isTargetMet ? '#10B981' : '#3B82F6' }]}>
            {isOverHydrated ? 'Limit Reached' : isTargetMet ? 'Goal Met' : 'Hydrating'}
          </Text>
        </View>
      </View>

      {/* Responsive Visual Cup Representation */}
      <View style={styles.trackerContent}>
        <Animated.View style={[
          styles.cupOutline,
          {
            borderColor: isOverHydrated ? '#EF4444' : isTargetMet ? '#10B981' : '#3B82F6',
            transform: [{ scale: pulseAnim }],
          }
        ]}>
          {/* Animated Water Fill Layer */}
          <Animated.View style={[
            styles.waterFill,
            {
              height: waterHeight,
              backgroundColor: isOverHydrated ? '#EF444490' : isTargetMet ? '#10B98180' : '#3B82F680',
            }
          ]} />
          
          <View style={styles.cupOverlayText}>
            <Text style={[styles.amountText, { color: colors.text }]}>
              {totalWater} <Text style={styles.unitLabel}>ml</Text>
            </Text>
            <Text style={[styles.targetLabel, { color: colors.textMuted }]}>
              Goal: {waterTarget} ml
            </Text>
          </View>
        </Animated.View>

        {/* Dynamic Water Stats and details */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: colors.textDim }]}>Your Requirement</Text>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{waterTarget} ml</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: colors.textDim }]}>Max Safe Intake</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{waterMaxSafe} ml</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: colors.textDim }]}>Status</Text>
            {isOverHydrated ? (
              <Text style={[styles.statusIndicator, { color: '#EF4444' }]}>Over Limit ⚠️</Text>
            ) : isTargetMet ? (
              <Text style={[styles.statusIndicator, { color: '#10B981' }]}>Perfect! 🎉</Text>
            ) : (
              <Text style={[styles.statusIndicator, { color: '#3B82F6' }]}>
                {Math.round((totalWater / waterTarget) * 100)}% Reached
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Preset log buttons */}
      <View style={styles.presetContainer}>
        {[
          { label: 'Cup', amount: 250, icon: 'wine-outline' },
          { label: 'Glass', amount: 350, icon: 'cafe-outline' },
          { label: 'Bottle', amount: 500, icon: 'beer-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.presetBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => handleLogWater(item.amount)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon as any} size={20} color="#3B82F6" />
            <Text style={[styles.presetVal, { color: colors.text }]}>+{item.amount}ml</Text>
            <Text style={[styles.presetLbl, { color: colors.textMuted }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Slider / Pan Logging element */}
      <View style={styles.sliderSection}>
        <Text style={[styles.sliderTitle, { color: colors.text }]}>
          Custom Log amount: <Text style={{ color: '#3B82F6', fontFamily: FONTS.heading }}>{sliderVal} ml</Text>
        </Text>
        <View style={styles.sliderTrackWrapper}>
          <View style={[styles.sliderTrack, { width: sliderWidth, backgroundColor: colors.border }]}>
            {/* Filled bar up to slider value */}
            <View style={[styles.sliderTrackFill, { width: ((sliderVal - 50) / 700) * sliderWidth }]} />
            <View
              {...panResponder.panHandlers}
              style={[
                styles.sliderThumb,
                {
                  left: ((sliderVal - 50) / 700) * (sliderWidth - 24),
                  backgroundColor: '#3B82F6',
                },
              ]}
            />
          </View>
        </View>
        <View style={[styles.sliderLabels, { width: sliderWidth }]}>
          <Text style={[styles.sliderMinMax, { color: colors.textMuted }]}>50 ml</Text>
          <Text style={[styles.sliderMinMax, { color: colors.textMuted }]}>750 ml</Text>
        </View>

        <TouchableOpacity style={styles.logSliderBtn} onPress={() => handleLogWater(sliderVal)} activeOpacity={0.8}>
          <Text style={styles.logSliderBtnText}>DRANK {sliderVal} ML</Text>
        </TouchableOpacity>
      </View>

      {/* Recent hydration logs list */}
      {waterLogs.length > 0 && (
        <View style={[styles.logsWrapper, { borderTopColor: colors.border }]}>
          <Text style={[styles.logsTitle, { color: colors.text }]}>Interval Logs</Text>
          {waterLogs.map((log) => {
            const time = new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <View key={log.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="water" size={18} color="#3B82F6" />
                  <Text style={[styles.logAmount, { color: colors.text }]}>{log.amount_ml} ml</Text>
                  <Text style={[styles.logTime, { color: colors.textMuted }]}>at {time}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteLog(log.id, log.amount_ml)}>
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
    letterSpacing: 0.3,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: Math.min(SCREEN_WIDTH * 0.027, 11),
  },
  trackerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 16,
  },
  cupOutline: {
    width: 130,
    height: 150,
    borderRadius: 24,
    borderWidth: 3,
    borderTopWidth: 1, // open cup feel
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  waterFill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  cupOverlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontFamily: FONTS.heading,
    fontSize: 28,
  },
  unitLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  targetLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    marginTop: 2,
  },
  statsContainer: {
    flex: 1,
    gap: 10,
  },
  statBox: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statTitle: {
    fontFamily: FONTS.body,
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  statusIndicator: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  presetBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  presetVal: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
  },
  presetLbl: {
    fontFamily: FONTS.body,
    fontSize: 10,
  },
  sliderSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    marginBottom: 10,
  },
  sliderTrackWrapper: {
    height: 30,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 16,
  },
  sliderMinMax: {
    fontFamily: FONTS.body,
    fontSize: 10,
  },
  logSliderBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  logSliderBtnText: {
    color: '#FFF',
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  logsWrapper: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  logsTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    marginBottom: 4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  logAmount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  logTime: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
});
