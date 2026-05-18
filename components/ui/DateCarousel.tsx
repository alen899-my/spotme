import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { FONTS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface DateCarouselProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  daysBack?: number;
}

export default function DateCarousel({ selectedDate, onSelectDate, daysBack = 14 }: DateCarouselProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate array of dates
  const dates = React.useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, [daysBack]);

  useEffect(() => {
    // Scroll to end (today) on mount
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, idx) => {
          const selected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = daysArr[date.getDay()];
          const dayNum = date.getDate();

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dateCard,
                { backgroundColor: selected ? '#E00000' : colors.card, borderColor: selected ? '#E00000' : colors.border }
              ]}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayName, { color: selected ? '#FFF' : colors.textMuted }]}>
                {isToday ? 'Today' : dayName}
              </Text>
              <Text style={[styles.dayNum, { color: selected ? '#FFF' : colors.text }]}>
                {dayNum}
              </Text>
              {selected && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    marginBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dateCard: {
    width: 60,
    height: 70,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dayName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    marginBottom: 4,
  },
  dayNum: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    marginTop: 4,
  },
});
