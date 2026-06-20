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
import axios from "axios";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import { useTheme } from "../../contexts/ThemeContext";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

const bgImage = require("../../assets/coach/workout3.jpg");
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface DayEntry {
  date: string;
  count: number;
}

export default function MiniCalendar() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = today.toISOString().split("T")[0];

  const [history, setHistory] = useState<DayEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/daily/calendar-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data.overall || []);
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

  const activeCount = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter((d) => !isFuture(d) && (dateMap[dateStr(d)] || 0) > 0).length;

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
            <Text style={[styles.dayHead, { color: "rgba(255,255,255,0.45)" }]}>{d}</Text>
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

              const future = isFuture(day);
              const todayCell = isTodayCell(day);
              const active = isActive(day);
              const inactivePast = !future && !todayCell && !active;

              return (
                <View
                  key={di}
                  style={[
                    styles.cell,
                    todayCell && styles.cellToday,
                    active && styles.cellActive,
                    inactivePast && styles.cellInactive,
                  ]}
                >
                  {active ? (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  ) : inactivePast ? (
                    <View style={styles.crossCircle}>
                      <Ionicons name="close" size={9} color="#EF4444" />
                    </View>
                  ) : null}
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
                          : "rgba(255,255,255,0.70)",
                        fontFamily: todayCell || active ? FONTS.bodyBold : FONTS.body,
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
            ? `${activeCount} workout${activeCount !== 1 ? "s" : ""} this month`
            : "Loading..."}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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
    backgroundColor: "rgba(16,185,129,0.50)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.55)",
  },
  cellInactive: {
    backgroundColor: "rgba(255,255,255,0.08)",
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
  crossCircle: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(239,68,68,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dayNum: {
    fontSize: scale(11),
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
