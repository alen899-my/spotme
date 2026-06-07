/**
 * WorkoutCalendarHeatmap
 *
 * A reusable, navigable month-calendar heatmap.
 * Pass `history` (all-time per-day workout counts) and the component handles
 * navigation, colouring, and layout internally.
 *
 * Usage:
 *   <WorkoutCalendarHeatmap history={detail.history} accentColor="#FF4B4B" />
 */

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

const SCREEN_W  = Dimensions.get("window").width;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export interface DayEntry {
  date:  string; // "YYYY-MM-DD"
  count: number;
}

interface Props {
  /** All-time per-day history, any order. */
  history: DayEntry[];
  /** Hex colour used for the heat fill — defaults to red. */
  accentColor?: string;
  /** Optional label shown above the calendar (e.g. muscle name). */
  title?: string;
  /** External year control — syncs the heatmap's view year. */
  controlledYear?: number;
  /** External month control — syncs the heatmap's view month (0-indexed). */
  controlledMonth?: number;
  /** Called when the heatmap navigates internally. */
  onViewChange?: (year: number, month: number) => void;
  /** Called when a day cell is tapped. */
  onDayPress?: (date: string, count: number) => void;
}

export default function WorkoutCalendarHeatmap({
  history,
  accentColor = "#FF4B4B",
  title,
  controlledYear,
  controlledMonth,
  onViewChange,
  onDayPress,
}: Props) {
  const { colors, isDark } = useTheme();

  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // Sync external year/month controls
  useEffect(() => {
    if (controlledYear !== undefined) setViewYear(controlledYear);
  }, [controlledYear]);
  useEffect(() => {
    if (controlledMonth !== undefined) setViewMonth(controlledMonth);
  }, [controlledMonth]);

  const notify = (y: number, m: number) => {
    onViewChange?.(y, m);
  };

  // ── Build O(1) lookup from history ──────────────────────────────────────────
  const dateMap: Record<string, number> = {};
  history.forEach(h => { dateMap[h.date] = h.count; });

  // ── Month navigation ─────────────────────────────────────────────────────────
  const isAtCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goPrev = () => {
    let y = viewYear, m = viewMonth;
    if (m === 0) { m = 11; y -= 1; } else { m -= 1; }
    setViewYear(y); setViewMonth(m);
    notify(y, m);
  };

  const goNext = () => {
    if (isAtCurrentMonth) return;
    let y = viewYear, m = viewMonth;
    if (m === 11) { m = 0; y += 1; } else { m += 1; }
    setViewYear(y); setViewMonth(m);
    notify(y, m);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    notify(today.getFullYear(), today.getMonth());
  };

  // ── Build calendar grid ──────────────────────────────────────────────────────
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Leading empty slots + actual day numbers + trailing empties (complete grid)
  const rawCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (rawCells.length % 7 !== 0) rawCells.push(null);

  // Split into rows of 7 (weeks)
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < rawCells.length; i += 7) {
    weeks.push(rawCells.slice(i, i + 7));
  }

  // ── Cell helpers ─────────────────────────────────────────────────────────────
  const dateString = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isFutureDay = (day: number) => dateString(day) > todayStr;

  const cellBg = (day: number | null): string => {
    if (day === null) return "transparent";
    if (isFutureDay(day)) return "transparent";
    const count = dateMap[dateString(day)] || 0;
    if (count === 0) return isDark ? "#252525" : "rgba(0,0,0,0.06)";
    if (count === 1) return `${accentColor}45`;
    if (count <= 3)  return `${accentColor}80`;
    if (count <= 6)  return `${accentColor}B0`;
    return `${accentColor}E0`;
  };

  const isTodayCell = (day: number) => dateString(day) === todayStr;
  const hasActivity = (day: number | null) =>
    day !== null && !isFutureDay(day) && (dateMap[dateString(day)] || 0) > 0;

  // ── Derived: active days this month ──────────────────────────────────────────
  const activeDaysThisMonth = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter(d => !isFutureDay(d) && (dateMap[dateString(d)] || 0) > 0).length;

  // ── Cell size: 7 columns, 4px gap, 32px side padding each ───────────────────
  const CONTAINER_PAD = 32;
  const GAP           = 4;
  const CELL_W        = Math.floor((SCREEN_W - CONTAINER_PAD * 2 - GAP * 6) / 7);

  return (
    <View style={styles.root}>
      {/* ── Optional title ────────────────────────────────────────────────────── */}
      {title && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}

      {/* ── Navigation bar ───────────────────────────────────────────────────── */}
      <View style={[styles.navBar, { backgroundColor: isDark ? "#1c1c1c" : "#f2f2f2", borderColor: colors.border }]}>
        <TouchableOpacity onPress={goPrev} style={styles.navArrow} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToday} activeOpacity={0.7} style={styles.monthPill}>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          {!isAtCurrentMonth && (
            <View style={[styles.todayDot, { backgroundColor: accentColor }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goNext}
          style={[styles.navArrow, isAtCurrentMonth && { opacity: 0.25 }]}
          activeOpacity={0.6}
          disabled={isAtCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

    

      {/* ── Day-of-week headers ───────────────────────────────────────────────── */}
      <View style={[styles.dayRow, { gap: GAP }]}>
        {DAY_NAMES.map(d => (
          <Text
            key={d}
            style={[styles.dayHeader, { width: CELL_W, color: colors.textMuted }]}
          >
            {d.slice(0, 1)}
          </Text>
        ))}
      </View>

      {/* ── Calendar weeks ───────────────────────────────────────────────────── */}
      <View style={{ gap: GAP }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={[styles.weekRow, { gap: GAP }]}>
            {week.map((day, di) => {
              const todayCell   = day !== null && isTodayCell(day);
              const futureCell  = day !== null && isFutureDay(day);
              const activeCell  = hasActivity(day);

              const dateStr = day !== null ? dateString(day) : null;
              const count   = dateStr ? (dateMap[dateStr] || 0) : 0;

              return (
                <TouchableOpacity
                  key={di}
                  activeOpacity={day !== null && !futureCell ? 0.6 : 1}
                  disabled={day === null || futureCell}
                  onPress={() => {
                    if (dateStr && onDayPress) onDayPress(dateStr, count);
                  }}
                  style={[
                    styles.cell,
                    {
                      width:           CELL_W,
                      height:          CELL_W,
                      backgroundColor: cellBg(day),
                      borderRadius:    6,
                      borderWidth:     todayCell ? 1.5 : 0,
                      borderColor:     todayCell ? accentColor : "transparent",
                      opacity:         futureCell ? 0 : 1,
                    },
                  ]}
                >
                  {day !== null && (
                    <Text
                      style={[
                        styles.dayNum,
                        {
                          color: todayCell
                            ? accentColor
                            : activeCell
                            ? isDark ? "#ffffff" : "#111111"
                            : colors.textMuted,
                          fontFamily: todayCell ? FONTS.bodyBold : FONTS.body,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <Text style={[styles.legendTxt, { color: colors.textMuted }]}>None</Text>
        {(["#252525", `${accentColor}45`, `${accentColor}80`, `${accentColor}B0`, `${accentColor}E0`] as string[]).map((bg, i) => (
          <View
            key={i}
            style={[
              styles.legendCell,
              {
                backgroundColor: i === 0
                  ? isDark ? "#252525" : "rgba(0,0,0,0.06)"
                  : bg,
                borderRadius: 3,
              },
            ]}
          />
        ))}
        <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Heavy</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize:   13,
    letterSpacing: 0.2,
  },

  // nav bar
  navBar: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    borderRadius:   14,
    borderWidth:    1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navArrow: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
  },
  monthPill: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  monthText: {
    fontFamily: FONTS.heading,
    fontSize:   15,
  },
  todayDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },

  // badge
  badgeRow: {
    alignItems: "flex-start",
  },
  badge: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             6,
    borderRadius:    20,
    borderWidth:     1,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  badgeDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize:   12,
  },

  // headers + grid
  dayRow: {
    flexDirection: "row",
  },
  dayHeader: {
    textAlign:  "center",
    fontFamily: FONTS.bodyBold,
    fontSize:   10,
    opacity:    0.6,
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    alignItems:     "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 11,
  },

  // legend
  legend: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
    justifyContent: "flex-end",
    paddingTop:    2,
  },
  legendTxt: {
    fontFamily: FONTS.body,
    fontSize:   10,
    marginHorizontal: 2,
  },
  legendCell: {
    width:  12,
    height: 12,
  },
});
