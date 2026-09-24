"use client"

import React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Calendar, Clock, Flame, CheckCircle2, AlertTriangle, ShieldCheck, Sunrise, Sun, Sunset, Moon } from "lucide-react"
import { DayOfWeekPoint, CircadianPoint, WorkoutKPIs, TimeOfDayPeriod, PeakWorkoutTime } from "./types"

interface FrequencyAdherenceCardProps {
  dayOfWeek: DayOfWeekPoint[]
  circadian: CircadianPoint[]
  timeOfDayPeriods?: TimeOfDayPeriod[]
  peakWorkoutTime?: PeakWorkoutTime
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

function DowTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2 text-xs shadow-xl backdrop-blur-md font-mono">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {data.day}
      </div>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Workouts:</span>
          <span className="font-bold text-amber-500">{data.count}</span>
        </div>
        {data.volume > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Volume:</span>
            <span className="text-foreground">{data.volume.toLocaleString()} kg</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CircadianTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  const isPeak = data.isPeak
  const hour = data.hour
  const nextHour = (hour + 1) % 24
  const startStr = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? "PM" : "AM"}`
  const endStr = `${nextHour % 12 === 0 ? 12 : nextHour % 12}:00 ${nextHour >= 12 ? "PM" : "AM"}`

  const periodName =
    hour >= 5 && hour < 12
      ? "Morning"
      : hour >= 12 && hour < 17
      ? "Afternoon"
      : hour >= 17 && hour < 21
      ? "Evening"
      : "Night"

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md font-mono space-y-1">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-1">
        <span className="font-bold text-foreground">
          {startStr} – {endStr}
        </span>
        <span className="text-[10px] text-muted-foreground">{periodName}</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-0.5">
        <span className="text-muted-foreground">Workouts:</span>
        <span className="font-bold text-sky-400">
          {data.count} session{data.count === 1 ? "" : "s"}
        </span>
      </div>
      {isPeak && data.count > 0 && (
        <div className="text-[10px] font-bold text-amber-500 pt-0.5">
          🔥 Peak Workout Window
        </div>
      )}
    </div>
  )
}

export function FrequencyAdherenceCard({
  dayOfWeek,
  circadian,
  timeOfDayPeriods,
  peakWorkoutTime,
  kpis,
  isAthleteMode,
}: FrequencyAdherenceCardProps) {
  const [timeChartType, setTimeChartType] = React.useState<"curve" | "bars">("curve")

  // Identify peak training day
  const maxDow = [...dayOfWeek].sort((a, b) => b.count - a.count)[0]

  // Default periods if not provided from backend
  const periods = timeOfDayPeriods && timeOfDayPeriods.length > 0 ? timeOfDayPeriods : [
    { period: "morning" as const, label: "Morning", timeRange: "5:00 AM – 11:59 AM", count: 0, pct: 0 },
    { period: "afternoon" as const, label: "Afternoon", timeRange: "12:00 PM – 4:59 PM", count: 0, pct: 0 },
    { period: "evening" as const, label: "Evening", timeRange: "5:00 PM – 8:59 PM", count: 0, pct: 0 },
    { period: "night" as const, label: "Night", timeRange: "9:00 PM – 4:59 AM", count: 0, pct: 0 },
  ]

  // Peak time values
  const peakLabel = peakWorkoutTime?.label || "8 PM"
  const peakPeriod = peakWorkoutTime?.period || "Evening"
  const peakWindow = peakWorkoutTime?.timeWindow || "8 PM – 9 PM"

  // Prepare 24-hour chart points
  const chartCircadian = React.useMemo(() => {
    return circadian.map((c) => ({
      ...c,
      isPeak: c.hour === peakWorkoutTime?.hour,
    }))
  }, [circadian, peakWorkoutTime])

  const formatHourTick = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h % 12 === 0 ? 12 : h % 12
    return `${hr} ${ampm}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. DAY-OF-WEEK HISTOGRAM */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Workouts by Day
            </h2>
            {maxDow && maxDow.count > 0 && (
              <span className="rounded bg-amber-500/10 text-amber-500 px-1.5 py-0.5 text-[10px] font-mono">
                Most: {maxDow.shortDay}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Workouts logged from Monday to Sunday
          </p>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeek} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
              <XAxis dataKey="shortDay" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<DowTooltip />} />
              <Bar dataKey="count" fill="#F7CB16" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Weekly Average:</span>
          <span className="text-foreground font-semibold">
            {kpis.totalWorkouts > 0 ? `${(kpis.totalWorkouts / 4).toFixed(1)} workouts/week` : "—"}
          </span>
        </div>
      </div>

      {/* 2. 24-HOUR WORKOUT TIME OF DAY GRAPH */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              Workout Time of Day
            </h2>

            <div className="flex items-center gap-1.5">
              <span className="rounded bg-sky-500/10 text-sky-400 px-2 py-0.5 text-[10px] font-mono font-bold">
                Peak: {peakLabel}
              </span>

              {/* View Switcher: Curve vs Bars */}
              <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setTimeChartType("curve")}
                  className={`rounded px-1.5 py-0.5 transition-all ${
                    timeChartType === "curve"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Curve
                </button>
                <button
                  type="button"
                  onClick={() => setTimeChartType("bars")}
                  className={`rounded px-1.5 py-0.5 transition-all ${
                    timeChartType === "bars"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            24-hour distribution of workout start times
          </p>
        </div>

        {/* 24-Hour Time Graph */}
        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {timeChartType === "curve" ? (
              <AreaChart data={chartCircadian} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="timeWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.65} />
                    <stop offset="50%" stopColor="#38BDF8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  ticks={[0, 4, 8, 12, 16, 20]}
                  tickFormatter={formatHourTick}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CircadianTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fill="url(#timeWaveGrad)"
                  dot={(props: any) => {
                    if (props.payload.isPeak && props.payload.count > 0) {
                      return (
                        <circle
                          key={`peak-${props.cx}-${props.cy}`}
                          cx={props.cx}
                          cy={props.cy}
                          r={5}
                          fill="#38BDF8"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      )
                    }
                    return null
                  }}
                  activeDot={{ r: 5, fill: "#38BDF8", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartCircadian} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  ticks={[0, 4, 8, 12, 16, 20]}
                  tickFormatter={formatHourTick}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CircadianTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {chartCircadian.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.isPeak && entry.count > 0
                          ? "#38BDF8"
                          : entry.count > 0
                          ? "#38BDF880"
                          : "rgba(255,255,255,0.06)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Compact Schedule Rhythm Strip */}
        <div className="pt-2 border-t border-border/40 space-y-1.5 font-mono text-[10px]">
          {/* Segmented Period Ratio Bar */}
          <div className="h-2 w-full rounded-full overflow-hidden flex bg-secondary/50 gap-[1px]">
            {periods.map((p) => {
              const bg =
                p.period === "morning"
                  ? "bg-amber-500"
                  : p.period === "afternoon"
                  ? "bg-sky-400"
                  : p.period === "evening"
                  ? "bg-purple-400"
                  : "bg-indigo-400"
              return p.pct > 0 ? (
                <div
                  key={p.period}
                  style={{ width: `${p.pct}%` }}
                  className={`${bg} h-full`}
                  title={`${p.label}: ${p.count} (${p.pct}%)`}
                />
              ) : null
            })}
          </div>

          {/* Period Labels & Counts */}
          <div className="flex items-center justify-between text-muted-foreground flex-wrap gap-1">
            <span className="flex items-center gap-1 text-foreground">
              <span className="h-2 w-2 rounded-full bg-purple-400 inline-block" />
              Evening: <strong className="text-purple-400">{periods.find((p) => p.period === "evening")?.count || 0} ({periods.find((p) => p.period === "evening")?.pct || 0}%)</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              Morn: {periods.find((p) => p.period === "morning")?.count || 0}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" />
              Aft: {periods.find((p) => p.period === "afternoon")?.count || 0}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" />
              Night: {periods.find((p) => p.period === "night")?.count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 3. COMPLETION, STREAK & ADHERENCE GAUGES */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Workout Consistency
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completed vs unfinished workouts
          </p>
        </div>

        {/* Adherence Progress Rings / Bars */}
        <div className="space-y-3 font-mono text-xs my-auto">
          {/* Completion Rate Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Completion Rate
              </span>
              <span className="font-bold text-emerald-400">{kpis.completionRate}%</span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/50">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.completionRate)}%` }}
              />
            </div>
          </div>

          {/* Active Workouts in Progress */}
          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="p-2 rounded bg-secondary/30 border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase block">Completed</span>
              <span className="text-base font-bold text-foreground">{kpis.completedWorkouts}</span>
            </div>
            <div className="p-2 rounded bg-secondary/30 border border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase block">Unfinished</span>
              <span className="text-base font-bold text-amber-500">{kpis.activeWorkouts + kpis.abandonedWorkouts}</span>
            </div>
          </div>

          {/* Peak Streak Record */}
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <Flame className="h-4 w-4" />
              <span className="text-[11px] font-sans font-semibold">Longest Streak</span>
            </div>
            <span className="text-sm font-bold text-amber-500">{kpis.maxStreakRecorded} Days</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Last Active:</span>
          <span className="text-foreground">
            {kpis.lastWorkoutAt
              ? new Date(kpis.lastWorkoutAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}
