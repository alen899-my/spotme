import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { P, scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { isToday } from '../../utils/datetime';

interface WeightEntry {
  id: number;
  weight: string;
  notes?: string;
  logged_at: string;
}

interface WeightHistoryCardProps {
  item: WeightEntry;
  onDelete?: (id: number) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return {
    day: days[d.getDay()],
    date: `${months[d.getMonth()]} ${d.getDate()}`,
    time: `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`,
  };
}

// BMI-like zone color hint (just for visual indicator, no health claims)
function getWeightZoneColor(weight: number): string {
  if (weight < 50) return '#60a5fa';
  if (weight < 80) return '#34d399';
  if (weight < 100) return '#f59e0b';
  return '#f87171';
}

export default function WeightHistoryCard({ item, onDelete }: WeightHistoryCardProps) {
  const { colors, isDark } = useTheme();
  const today = isToday(item.logged_at);
  const weightVal = parseFloat(item.weight);
  const { day, date, time } = formatDate(item.logged_at);
  const zoneColor = getWeightZoneColor(weightVal);

  // Receipt tape style card
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? '#000000' : '#f5f5f0', borderColor: isDark ? '#1e1e1e' : '#e0e0d8', borderWidth: 1 },
      ]}
    >
      {/* Left: date column, like a receipt stub */}
      <View style={[styles.dateStub, { borderRightColor: isDark ? '#1e1e1e' : '#e0e0d8', backgroundColor: isDark ? '#0a0a0a' : '#eeeee8' }]}>
        <Text style={[styles.dayLabel, { color: today ? colors.primary : isDark ? '#555' : '#aaa' }]}>{day}</Text>
        <Text style={[styles.dateNum, { color: isDark ? '#888' : '#555' }]}>{date}</Text>
        <Text style={[styles.timeLabel, { color: isDark ? '#444' : '#bbb' }]}>{time}</Text>
      </View>

      {/* Center: weight reading */}
      <View style={styles.readingArea}>
        {today && (
          <View style={[styles.todayPill, { backgroundColor: isDark ? 'rgba(37,150,190,0.12)' : P.ctaLight }]}>
            <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.todayText, { color: colors.primary }]}>TODAY</Text>
          </View>
        )}
        <View style={styles.weightRow}>
          <Text style={[styles.weightInt, { color: isDark ? '#f0f0f0' : '#111' }]}>
            {Math.floor(weightVal)}
          </Text>
          <View style={styles.weightDecWrap}>
            <Text style={[styles.weightDec, { color: isDark ? '#888' : '#aaa' }]}>
              .{(weightVal % 1).toFixed(1).slice(2)}
            </Text>
            <Text style={[styles.weightUnit, { color: isDark ? '#555' : '#bbb' }]}>kg</Text>
          </View>
        </View>
        {item.notes && (
          <Text style={[styles.notesText, { color: isDark ? '#444' : '#bbb' }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>

      {/* Right: zone indicator + delete */}
      <View style={styles.rightCol}>
        <View style={[styles.zoneDot, { backgroundColor: zoneColor }]} />
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={[styles.deleteBtn, { backgroundColor: isDark ? '#1a1a1a' : '#e8e8e0' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={scale(15)} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  dateStub: {
    width: scale(72),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    borderRightWidth: 1,
    gap: vs(2),
  },
  dayLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(10),
    letterSpacing: 2,
  },
  dateNum: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    letterSpacing: 0.3,
  },
  timeLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
    letterSpacing: 0.5,
  },
  readingArea: {
    flex: 1,
    paddingHorizontal: scale(14),
    paddingVertical: vs(10),
    justifyContent: 'center',
    gap: vs(4),
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: vs(2),
    borderRadius: scale(20),
    gap: scale(4),
    marginBottom: vs(2),
  },
  todayDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
  },
  todayText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    letterSpacing: 1.5,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(2),
  },
  weightInt: {
    fontFamily: FONTS.heading,
    fontSize: scale(34),
    lineHeight: scale(36),
    letterSpacing: -1,
  },
  weightDecWrap: {
    paddingBottom: vs(4),
  },
  weightDec: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(16),
    lineHeight: scale(18),
  },
  weightUnit: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    letterSpacing: 1,
  },
  notesText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    fontStyle: 'italic',
  },
  rightCol: {
    width: scale(44),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(12),
    paddingRight: scale(4),
  },
  zoneDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  deleteBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
});