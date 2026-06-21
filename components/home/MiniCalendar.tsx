import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { api } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

const bgImage = require("../../assets/coach/workout3.jpg");
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const REST_TYPE_CONFIG: Record<string, { letter: string; color: string }> = {
  fatigue:       { letter: "F", color: "#3B82F6" },
  sick:          { letter: "S", color: "#F59E0B" },
  injury:        { letter: "I", color: "#EF4444" },
  after_workout: { letter: "A", color: "#14B8A6" },
  late:          { letter: "L", color: "#8B5CF6" },
  other:         { letter: "O", color: "#6B7280" },
};

const getRestCfg = (type?: string) =>
  REST_TYPE_CONFIG[type ?? "fatigue"] ?? REST_TYPE_CONFIG.fatigue;

interface DayEntry {
  date: string;
  count: number;
}

const MiniCalendar = React.memo(function MiniCalendar() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = today.toISOString().split("T")[0];

  const [history, setHistory] = useState<DayEntry[]>([]);
  const [restDays, setRestDays] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get('/daily/calendar-stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data.overall || []);
        setRestDays(res.data.restDays || {});
      } catch (e) {
        console.error("MiniCalendar fetch error", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const dateMap: Record<string, number> = {};
  history.forEach((h) => { dateMap[h.date] = h.count; });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rawCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (rawCells.length % 7 !== 0) rawCells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < rawCells.length; i += 7) {
    weeks.push(rawCells.slice(i, i + 7));
  }

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isFuture = (d: number) => dateStr(d) > todayStr;
  const isTodayCell = (d: number) => dateStr(d) === todayStr;
  const isActive = (d: number) => !isFuture(d) && (dateMap[dateStr(d)] || 0) > 0;
  const isRest = (d: number) => !isFuture(d) && !!restDays[dateStr(d)];

  const activeCount = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter((d) => !isFuture(d) && (dateMap[dateStr(d)] || 0) > 0).length;

  const restCount = Object.keys(restDays).filter((ds) => {
    const [y, m] = ds.split("-").map(Number);
    return y === year && m === month + 1;
  }).length;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
      ]}
      onPress={() => router.push("/calendar")}
      activeOpacity={0.92}
    >
      <ImageBackground
        source={bgImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        imageStyle={{ borderRadius: scale(20) }}
      />
      <View style={[StyleSheet.absoluteFill, styles.cardOverlay, { borderRadius: scale(20) }]} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(37,150,190,0.20)" }]}>
            <Ionicons name="calendar" size={16} color="#2596BE" />
          </View>
          <Text style={[styles.monthLabel, { color: "#FFFFFF" }]}>
            {MONTHS[month]} {year}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={[styles.viewAll, { color: "#2596BE" }]}>View All</Text>
          <Ionicons name="chevron-forward" size={12} color="#2596BE" />
        </View>
      </View>

      <View style={styles.daysRow}>
        {DAYS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.dayHead, { color: "rgba(255,255,255,0.70)" }]}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
              }

              const ds = dateStr(day);
              const future = isFuture(day);
              const todayCell = isTodayCell(day);
              const active = isActive(day);
              const restDay = isRest(day);
              const restCfg = restDay ? getRestCfg(restDays[ds]) : null;
              const inactivePast = !future && !todayCell && !active && !restDay;

              return (
                <View
                  key={di}
                  style={[
                    styles.cell,
                    todayCell && styles.cellToday,
                    active && styles.cellActive,
                    restDay && !todayCell && { backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: restCfg?.color ?? "#3B82F6" },
                    inactivePast && styles.cellInactive,
                    future && { opacity: 0.2 },
                  ]}
                >
                  {/* Workout checkmark badge */}
                  {active && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}

                  {/* Rest day letter badge */}
                  {restDay && restCfg && (
                    <View style={[styles.restBadge, { backgroundColor: restCfg.color }]}>
                      <Text style={styles.restLetter}>{restCfg.letter}</Text>
                    </View>
                  )}

                  {/* Missed day X */}
                  {inactivePast && (
                    <Ionicons name="close" size={10} color="#EF4444" style={styles.crossIcon} />
                  )}

                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: future
                          ? "rgba(255,255,255,0.20)"
                          : todayCell
                          ? "#FFFFFF"
                          : active
                          ? "#FFFFFF"
                          : restDay
                          ? restCfg?.color ?? "#FFFFFF"
                          : "rgba(255,255,255,0.70)",
                        fontFamily: todayCell || active || restDay ? FONTS.bodyBold : FONTS.body,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

 

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          {loaded
            ? `${activeCount} workout${activeCount !== 1 ? "s" : ""}${restCount > 0 ? ` · ${restCount} rest day${restCount !== 1 ? "s" : ""}` : ""} this month`
            : "Loading..."}
        </Text>
      </View>
    </TouchableOpacity>
  );
})

const styles = StyleSheet.create({
  card: {
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: vs(20),
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  cardOverlay: {
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    justifyContent: "center",
    alignItems: "center",
  },
  monthLabel: {
    fontFamily: FONTS.heading,
    fontSize: scale(17),
    letterSpacing: -0.3,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
  },
  daysRow: {
    flexDirection: "row",
    marginBottom: vs(3),
    gap: 4,
  },
  dayHead: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(9),
    opacity: 0.7,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cellToday: {
    backgroundColor: "#2596BE",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  cellActive: {
    backgroundColor: "#065F46",
    borderWidth: 1,
    borderColor: "#059669",
  },
  cellInactive: {
    backgroundColor: "transparent",
  },
  checkCircle: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  restBadge: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  restLetter: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 7,
    lineHeight: 14,
    textAlign: "center",
  },
  crossIcon: {
    position: "absolute",
    top: 1,
    right: 1,
    zIndex: 1,
  },
  dayNum: {
    fontSize: scale(11),
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: vs(8),
    paddingTop: vs(6),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  legendItem: {
    alignItems: "center",
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  legendLetter: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: vs(8),
    paddingTop: vs(8),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  footerText: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    color: "rgba(255,255,255,0.65)",
  },
});

export default MiniCalendar;
