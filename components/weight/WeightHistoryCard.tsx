import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../../constants/theme';
import { scale, vs } from '../../constants/homeTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { parseUTC } from '../../utils/datetime';

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
  const d = parseUTC(dateStr);
  if (!d) return { date: '', time: '' };
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return {
    date: `${months[d.getMonth()]} ${d.getDate()}`,
    time: `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`,
  };
}

export default function WeightHistoryCard({ item, onDelete }: WeightHistoryCardProps) {
  const { colors, isDark } = useTheme();
  const weightVal = parseFloat(item.weight);
  const { date, time } = formatDate(item.logged_at);

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#fff', borderColor: isDark ? '#222' : '#e5e5e0' }]}>
      <View style={styles.leftCol}>
        <Text style={[styles.weightValue, { color: colors.text }]}>
          {weightVal.toFixed(1)}
          <Text style={[styles.weightUnit, { color: colors.textMuted }]}> kg</Text>
        </Text>
        {item.notes && (
          <Text style={[styles.notes, { color: colors.textDim }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>

      <View style={styles.rightCol}>
        <View style={styles.dateWrap}>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{date}</Text>
          <Text style={[styles.timeText, { color: colors.textDim }]}>{time}</Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={[styles.deleteBtn, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0eb' }]}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: scale(14),
    borderWidth: 1,
    paddingVertical: vs(12),
    paddingHorizontal: scale(16),
  },
  leftCol: {
    flex: 1,
    gap: vs(2),
  },
  weightValue: {
    fontFamily: FONTS.heading,
    fontSize: scale(24),
    letterSpacing: -0.5,
  },
  weightUnit: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
  },
  notes: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    fontStyle: 'italic',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  dateWrap: {
    alignItems: 'flex-end',
    gap: vs(1),
  },
  dateText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(11),
  },
  timeText: {
    fontFamily: FONTS.body,
    fontSize: scale(10),
  },
  deleteBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
