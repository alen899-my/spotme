import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Pressable, ImageBackground,
} from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay } from '../../utils/datetime';

const DAYS_SHOWN = 7;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

interface DatePickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  variant?: 'default' | 'nutrition';
  backgroundImage?: any;
  loggedDates?: string[];
  showStatusMarkers?: boolean;
}

// ── Mini Calendar Modal ────────────────────────────────────────────────────────
function CalendarModal({
  visible, baseDate, onClose, onSelect, variant = 'default',
  loggedDates, showStatusMarkers,
}: {
  visible: boolean;
  baseDate: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  variant?: 'default' | 'nutrition';
  loggedDates?: string[];
  showStatusMarkers?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const [viewYear, setViewYear]   = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth());
  const isNutrition = variant === 'nutrition';
  
  const palette = isNutrition
    ? (isDark
        ? {
            sheetBg: colors.card,
            sheetBorder: colors.border,
            text: colors.text,
            muted: colors.textDim,
            accent: '#F7CB16',
            accentSoft: 'rgba(247,203,22,0.16)',
            inactiveText: colors.text,
            activeText: '#04282B',
          }
        : {
            sheetBg: '#2596BE',
            sheetBorder: 'rgba(247,203,22,0.34)',
            text: '#FFFFFF',
            muted: 'rgba(255,255,255,0.70)',
            accent: '#F7CB16',
            accentSoft: 'rgba(247,203,22,0.16)',
            inactiveText: '#FFFFFF',
            activeText: '#04282B',
          })
    : {
        sheetBg: colors.card,
        sheetBorder: colors.border,
        text: colors.text,
        muted: colors.textDim,
        accent: '#2596BE',
        accentSoft: colors.iconCircle,
        inactiveText: colors.text,
        activeText: '#FFFFFF',
      };

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
        <Pressable onPress={() => {}} style={[cal.sheet, { backgroundColor: palette.sheetBg, borderColor: palette.sheetBorder }]}>
          {/* Header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={[cal.navBtn, isNutrition && { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </TouchableOpacity>
            <Text style={[cal.title, { color: palette.text }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={nextMonth}
              style={[cal.navBtn, isNutrition && { backgroundColor: palette.accentSoft }, atOrBeyondCurrentMonth && { opacity: 0.25 }]}
              disabled={atOrBeyondCurrentMonth}
            >
              <Ionicons name="chevron-forward" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week row */}
          <View style={cal.weekRow}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <Text key={i} style={[cal.weekLabel, { color: palette.muted }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={idx} style={cal.cell} />;
              const future   = isInFuture(day);
              const todayC   = isTodayCell(day);
              const selected = isSelected(day);

              const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isLogged = loggedDates?.includes(dayStr);
              const isPast = !future && !todayC;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    cal.cell,
                    selected && { backgroundColor: palette.accent, borderRadius: 12 },
                    !selected && todayC && { borderRadius: 12, borderWidth: 1.5, borderColor: palette.accent },
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
                  {showStatusMarkers && isLogged && (
                    <View style={cal.checkCircle}>
                      <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                    </View>
                  )}
                  {showStatusMarkers && isPast && !isLogged && (
                    <Ionicons name="close" size={8} color="#EF4444" style={cal.crossIcon} />
                  )}
                  <Text style={[
                    cal.dayNum,
                    { color: selected ? palette.activeText : todayC ? palette.accent : palette.inactiveText },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            style={[cal.todayBtn, { borderColor: palette.sheetBorder }]}
            onPress={() => { onSelect(today()); onClose(); }}
          >
            <Text style={[cal.todayBtnText, { color: palette.accent }]}>Jump to Today</Text>
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
  dayNum: { fontFamily: FONTS.bodySemiBold, fontSize: 14, zIndex: 1 },
  todayBtn: {
    marginTop: 16, borderTopWidth: 1, paddingTop: 14, alignItems: 'center',
  },
  todayBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  checkCircle: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  crossIcon: {
    position: 'absolute',
    top: 1,
    right: 1,
    zIndex: 2,
  },
});

// ── Main DatePicker ────────────────────────────────────────────────────────────
export default function DatePicker({
  selectedDate, onSelectDate, variant = 'default', backgroundImage,
  loggedDates, showStatusMarkers,
}: DatePickerProps) {
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [showCal, setShowCal] = useState(false);
  const isNutrition = variant === 'nutrition';
  
  const palette = isNutrition
    ? (isDark
        ? {
            cardBg: colors.card,
            cardBorder: colors.border,
            text: colors.text,
            muted: colors.textDim,
            accent: '#F7CB16',
            accentSoft: 'rgba(247,203,22,0.15)',
            pillBg: colors.inputBg,
            pillBorder: colors.border,
            pillText: colors.text,
            pillMuted: colors.textDim,
            activeText: '#04282B',
            shadow: 'transparent',
          }
        : {
            cardBg: '#2596BE',
            cardBorder: 'rgba(247,203,22,0.34)',
            text: '#FFFFFF',
            muted: 'rgba(255,255,255,0.72)',
            accent: '#F7CB16',
            accentSoft: 'rgba(247,203,22,0.16)',
            pillBg: '#FBE58A',
            pillBorder: '#F7CB16',
            pillText: '#04282B',
            pillMuted: 'rgba(4,40,43,0.72)',
            activeText: '#04282B',
            shadow: '#2596BE',
          })
    : {
        cardBg: 'transparent',
        cardBorder: 'transparent',
        text: colors.text,
        muted: colors.textDim,
        accent: '#2596BE',
        accentSoft: colors.iconCircle,
        pillBg: colors.card,
        pillBorder: colors.border,
        pillText: colors.text,
        pillMuted: colors.textDim,
        activeText: '#FFFFFF',
        shadow: '#2596BE',
      };

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
  const todayLabel = `Today - ${DAYS[today().getDay()]}, ${today().getDate()} ${MONTHS[today().getMonth()]}`;

  // Check if selected date is in the visible 7-day strip
  const inStrip = dates.some((d) => isSameDay(d, selectedDate));

  const wrapperStyle = [
    styles.wrapper,
    isNutrition && [
      styles.nutritionWrapper,
      {
        backgroundColor: backgroundImage ? 'transparent' : palette.cardBg,
        borderColor: palette.cardBorder,
        shadowColor: palette.shadow,
      },
    ],
  ];

  const content = (
    <>
      {isNutrition && <Text style={[styles.nutritionTodayLabel, { color: palette.text }]}>{todayLabel}</Text>}
      {/* Month + selected date label row */}
      <View style={[styles.labelRow, isNutrition && styles.nutritionLabelRow]}>
        {/* Tap month label → open calendar */}
        <TouchableOpacity
          onPress={() => setShowCal(true)}
          style={[styles.monthBtn, isNutrition && [styles.nutritionMonthBtn, { backgroundColor: palette.accentSoft, borderColor: palette.cardBorder }]]}
          activeOpacity={0.7}
        >
          <Text style={[styles.monthLabel, { color: palette.text }]}>
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isNutrition ? palette.accent : palette.muted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {!isNutrition && (
          <TouchableOpacity
            onPress={() => setShowCal(true)}
            style={[styles.todayPill, { backgroundColor: colors.iconCircle }]}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={13} color="#2596BE" />
            <Text style={[styles.todayPillText, { color: '#2596BE' }]}>{selectedLabel}</Text>
            {!inStrip && <View style={[styles.dot, { backgroundColor: '#2596BE' }]} />}
          </TouchableOpacity>
        )}
      </View>

      {/* 7-day strip */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isNutrition && styles.nutritionScrollContent]}
      >
        {/* If selected date is outside the strip, show it as an extra pill at the start */}
        {/* If selected date is outside the strip, show it as an extra pill at the start */}
        {!inStrip && (() => {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
          const isLogged = loggedDates?.includes(dateStr);
          const future = selectedDate > today();
          const isPast = !future && !isSameDay(selectedDate, today());

          return (
            <TouchableOpacity
              style={[styles.pill, isNutrition && styles.nutritionPill, { backgroundColor: palette.accent, borderColor: palette.accent }]}
              activeOpacity={0.8}
              onPress={() => setShowCal(true)}
            >
              {showStatusMarkers && isLogged && (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                </View>
              )}
              {showStatusMarkers && isPast && !isLogged && (
                <Ionicons name="close" size={8} color="#EF4444" style={styles.crossIcon} />
              )}
              <Text style={[styles.pillDay, { color: isNutrition ? 'rgba(4,40,43,0.72)' : 'rgba(255,255,255,0.8)' }]}>
                {MONTHS[selectedDate.getMonth()].slice(0, 3).toUpperCase()}
              </Text>
              <Text style={[styles.pillNum, { color: palette.activeText }]}>{selectedDate.getDate()}</Text>
              <View style={[styles.activeDot, { backgroundColor: isNutrition ? 'rgba(4,40,43,0.72)' : 'rgba(255,255,255,0.7)' }]} />
            </TouchableOpacity>
          );
        })()}

        {dates.map((date, idx) => {
          const active = isSameDay(date, selectedDate);
          const isT = isSameDay(date, today());

          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const isLogged = loggedDates?.includes(dateStr);
          const future = date > today();
          const isPast = !future && !isT;

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                isNutrition && styles.nutritionPill,
                {
                  backgroundColor: active ? palette.accent : palette.pillBg,
                  borderColor: active ? palette.accent : palette.pillBorder,
                  shadowColor: active ? palette.accent : 'transparent',
                },
              ]}
            >
              {showStatusMarkers && isLogged && (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                </View>
              )}
              {showStatusMarkers && isPast && !isLogged && (
                <Ionicons name="close" size={8} color="#EF4444" style={styles.crossIcon} />
              )}
              <Text style={[styles.pillDay, { color: active ? 'rgba(4,40,43,0.72)' : palette.pillMuted }]}>
                {isT ? 'TDY' : DAYS[date.getDay()].toUpperCase()}
              </Text>
              <Text style={[styles.pillNum, { color: active ? palette.activeText : palette.pillText }]}>
                {date.getDate()}
              </Text>
              {active && <View style={[styles.activeDot, { backgroundColor: isNutrition ? 'rgba(4,40,43,0.72)' : 'rgba(255,255,255,0.7)' }]} />}
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
        variant={variant}
        loggedDates={loggedDates}
        showStatusMarkers={showStatusMarkers}
      />
    </>
  );

  return backgroundImage ? (
    <View style={wrapperStyle}>
      <ImageBackground source={backgroundImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 0 }]} />
      <View style={{ zIndex: 1 }}>{content}</View>
    </View>
  ) : (
    <View style={wrapperStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingBottom: 8 },
  nutritionWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 12,
  },
  nutritionLabelRow: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  nutritionTodayLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.9,
  },
  monthBtn: { flexDirection: 'row', alignItems: 'center' },
  nutritionMonthBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthLabel: { fontFamily: FONTS.bodyBold, fontSize: 14 },
  todayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  todayPillText: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginLeft: 2 },
  scrollContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  nutritionScrollContent: { paddingHorizontal: 0, gap: 8 },
  pill: {
    width: 54, height: 72, borderRadius: 18, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  nutritionPill: {
    width: 50,
    height: 64,
  },
  pillDay: { fontFamily: FONTS.bodyBold, fontSize: 8, letterSpacing: 0.5, marginBottom: 3, zIndex: 1 },
  pillNum: { fontFamily: FONTS.heading, fontSize: 18, zIndex: 1 },
  activeDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 4, zIndex: 1,
  },
  checkCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  crossIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
  },
});
