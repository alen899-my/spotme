import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  TouchableOpacity, FlatList,
} from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay } from '../../utils/datetime';

interface DOBPickerProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const MIN_AGE = 14;
const MIN_YEAR = 1900;

const minDOB = () => {
  const d = today();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d;
};

const ITEM_HEIGHT = 48;

export default function DOBPicker({ visible, selectedDate, onSelect, onClose }: DOBPickerProps) {
  const { colors } = useTheme();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [showPicker, setShowPicker] = useState(false);
  const [showYearSlider, setShowYearSlider] = useState(false);
  const yearListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      setShowPicker(false);
      setShowYearSlider(false);
    }
  }, [visible]);

  const nowDate = today();
  const minD = minDOB();

  const canNextMonth =
    viewYear < nowDate.getFullYear() ||
    (viewYear === nowDate.getFullYear() && viewMonth < nowDate.getMonth());

  const canNextMonthForMin =
    viewYear < minD.getFullYear() ||
    (viewYear === minD.getFullYear() && viewMonth < minD.getMonth());

  const nextForward = canNextMonth && canNextMonthForMin;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (!nextForward) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectMonth = (m: number) => {
    setViewMonth(m);
    setShowPicker(false);
  };

  const openYearSlider = () => setShowYearSlider(true);

  const selectYear = (year: number) => {
    setViewYear(year);
    setShowYearSlider(false);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isInFuture = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today();
  };

  const isUnderAge = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > minDOB();
  };

  const isSelected = (day: number) => isSameDay(new Date(viewYear, viewMonth, day), selectedDate);

  const years = Array.from({ length: nowDate.getFullYear() - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

  const renderYearItem = useCallback(({ item }: { item: number }) => {
    const active = item === viewYear;
    return (
      <TouchableOpacity
        style={[styles.yearItem, active && { backgroundColor: colors.primary }]}
        onPress={() => selectYear(item)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.yearItemText,
          { color: active ? '#FFFFFF' : colors.text },
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  }, [viewYear, colors]);

  const curYearIndex = viewYear - MIN_YEAR;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {showYearSlider ? (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderTitle, { color: colors.text }]}>Select Year</Text>
                <TouchableOpacity onPress={() => setShowYearSlider(false)} style={styles.sliderClose}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                ref={yearListRef}
                data={years}
                keyExtractor={(item) => item.toString()}
                renderItem={renderYearItem}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                initialScrollIndex={curYearIndex}
                windowSize={5}
                maxToRenderPerBatch={20}
                initialNumToRender={20}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={false}
                style={styles.yearList}
              />
            </>
          ) : showPicker ? (
            <>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openYearSlider} style={styles.yearBtn}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>{viewYear}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textDim} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextMonth}
                  style={[styles.navBtn, !nextForward && { opacity: 0.25 }]}
                  disabled={!nextForward}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {MONTHS_SHORT.map((name, idx) => {
                  const isActive = idx === viewMonth;
                  const blocked = viewYear > minD.getFullYear() ||
                    (viewYear === minD.getFullYear() && idx > minD.getMonth());

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.monthCell,
                        isActive && { backgroundColor: colors.primary },
                        blocked && styles.monthCellBlocked,
                      ]}
                      onPress={() => !blocked && selectMonth(idx)}
                      disabled={blocked}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.monthCellText,
                        { color: isActive ? '#FFFFFF' : colors.text },
                        blocked && { color: colors.textDim, opacity: 0.35 },
                      ]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.titleBtn}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {MONTHS_FULL[viewMonth]} {viewYear}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textDim} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextMonth}
                  style={[styles.navBtn, !nextForward && { opacity: 0.25 }]}
                  disabled={!nextForward}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <Text key={i} style={[styles.weekLabel, { color: colors.textDim }]}>{d}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, idx) => {
                  if (!day) return <View key={idx} style={styles.cell} />;
                  const future = isInFuture(day);
                  const underAge = isUnderAge(day);
                  const blocked = future || underAge;
                  const selected = isSelected(day);

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.cell,
                        selected && { backgroundColor: colors.primary, borderRadius: 12 },
                      ]}
                      onPress={() => {
                        if (!blocked) {
                          onSelect(new Date(viewYear, viewMonth, day));
                          onClose();
                        }
                      }}
                      disabled={blocked}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dayNum,
                        { color: selected ? '#FFFFFF' : blocked ? colors.textDim : colors.text },
                        blocked && { opacity: 0.35 },
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.ageHint, { borderColor: colors.border }]}>
                <Text style={[styles.ageHintText, { color: colors.textDim }]}>
                  Select your date of birth (minimum 14 years old)
                </Text>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  ageHint: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 14,
    alignItems: 'center',
  },
  ageHintText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
  },
  yearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthCellBlocked: {
    opacity: 0.35,
  },
  monthCellText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
  },
  sliderClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearList: {
    maxHeight: 300,
  },
  yearItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  yearItemText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
  },
});
