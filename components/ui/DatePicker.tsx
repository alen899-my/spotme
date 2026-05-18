import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const DAYS_SHOWN = 7;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const isSameDay = (d1: Date, d2: Date) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear();

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── Mini Calendar Modal ────────────────────────────────────────────────────────
function CalendarModal({
  visible, baseDate, onClose, onSelect,
}: {
  visible: boolean;
  baseDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const { colors } = useTheme();
  const [viewYear, setViewYear]   = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(baseDate.getFullYear());
      setViewMonth(baseDate.getMonth());
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = today();
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isInFuture = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today();
  };

  const isTodayCell = (day: number) => isSameDay(new Date(viewYear, viewMonth, day), today());
  const isSelected  = (day: number) => isSameDay(new Date(viewYear, viewMonth, day), baseDate);

  const nowDate = today();
  const atOrBeyondCurrentMonth =
    viewYear > nowDate.getFullYear() ||
    (viewYear === nowDate.getFullYear() && viewMonth >= nowDate.getMonth());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={cal.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[cal.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[cal.title, { color: colors.text }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={nextMonth}
              style={[cal.navBtn, atOrBeyondCurrentMonth && { opacity: 0.25 }]}
              disabled={atOrBeyondCurrentMonth}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week row */}
          <View style={cal.weekRow}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <Text key={i} style={[cal.weekLabel, { color: colors.textDim }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={idx} style={cal.cell} />;
              const future   = isInFuture(day);
              const todayC   = isTodayCell(day);
              const selected = isSelected(day);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    cal.cell,
                    selected && { backgroundColor: '#E00000', borderRadius: 12 },
                    !selected && todayC && { borderRadius: 12, borderWidth: 1.5, borderColor: '#E00000' },
                    future && { opacity: 0.25 },
                  ]}
                  onPress={() => {
                    if (!future) {
                      const d = new Date(viewYear, viewMonth, day);
                      onSelect(d);
                      onClose();
                    }
                  }}
                  disabled={future}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    cal.dayNum,
                    { color: selected ? '#FFF' : todayC ? '#E00000' : colors.text },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            style={[cal.todayBtn, { borderColor: colors.border }]}
            onPress={() => { onSelect(today()); onClose(); }}
          >
            <Text style={[cal.todayBtnText, { color: colors.primary }]}>Jump to Today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: 320, borderRadius: 24, borderWidth: 1,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FONTS.bodyBold, fontSize: 17 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  todayBtn: {
    marginTop: 16, borderTopWidth: 1, paddingTop: 14, alignItems: 'center',
  },
  todayBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
});

// ── Main DatePicker ────────────────────────────────────────────────────────────
export default function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [showCal, setShowCal] = useState(false);

  const dates = React.useMemo(() => {
    const t = today();
    return Array.from({ length: DAYS_SHOWN }, (_, i) => {
      const d = new Date(t);
      d.setDate(t.getDate() - (DAYS_SHOWN - 1 - i));
      return d;
    });
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, []);

  const isToday = isSameDay(selectedDate, today());
  const selectedLabel = isToday
    ? 'Today'
    : `${DAYS[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`;

  // Check if selected date is in the visible 7-day strip
  const inStrip = dates.some(d => isSameDay(d, selectedDate));

  return (
    <View style={styles.wrapper}>
      {/* Month + selected date label row */}
      <View style={styles.labelRow}>
        {/* Tap month label → open calendar */}
        <TouchableOpacity onPress={() => setShowCal(true)} style={styles.monthBtn} activeOpacity={0.7}>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textDim} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCal(true)}
          style={[styles.todayPill, { backgroundColor: colors.iconCircle }]}
          activeOpacity={0.75}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
          <Text style={[styles.todayPillText, { color: colors.primary }]}>{selectedLabel}</Text>
          {!inStrip && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* 7-day strip */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* If selected date is outside the strip, show it as an extra pill at the start */}
        {!inStrip && (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: '#E00000', borderColor: '#E00000' }]}
            activeOpacity={0.8}
            onPress={() => setShowCal(true)}
          >
            <Text style={[styles.pillDay, { color: 'rgba(255,255,255,0.8)' }]}>
              {MONTHS[selectedDate.getMonth()].slice(0, 3).toUpperCase()}
            </Text>
            <Text style={[styles.pillNum, { color: '#FFF' }]}>{selectedDate.getDate()}</Text>
            <View style={styles.activeDot} />
          </TouchableOpacity>
        )}

        {dates.map((date, idx) => {
          const active = isSameDay(date, selectedDate);
          const isT    = isSameDay(date, today());

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? '#E00000' : colors.card,
                  borderColor: active ? '#E00000' : colors.border,
                  shadowColor: active ? '#E00000' : 'transparent',
                },
              ]}
            >
              <Text style={[styles.pillDay, { color: active ? 'rgba(255,255,255,0.75)' : colors.textDim }]}>
                {isT ? 'TDY' : DAYS[date.getDay()].toUpperCase()}
              </Text>
              <Text style={[styles.pillNum, { color: active ? '#FFF' : colors.text }]}>
                {date.getDate()}
              </Text>
              {active && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full calendar modal */}
      <CalendarModal
        visible={showCal}
        baseDate={selectedDate}
        onClose={() => setShowCal(false)}
        onSelect={onSelectDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingBottom: 8 },
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 12,
  },
  monthBtn: { flexDirection: 'row', alignItems: 'center' },
  monthLabel: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  todayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  todayPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginLeft: 2 },
  scrollContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  pill: {
    width: 54, height: 72, borderRadius: 18, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  pillDay: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 },
  pillNum: { fontFamily: FONTS.heading, fontSize: 22 },
  activeDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 4,
  },
});
