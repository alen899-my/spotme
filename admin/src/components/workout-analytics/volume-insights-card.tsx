"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Dumbbell, Activity, TrendingDown, Layers, PieChart as PieIcon, Sparkles, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { TimelinePoint, MuscleDistributionPoint, FatigueDecayPoint, WorkoutKPIs } from "./types"

interface VolumeInsightsCardProps {
  timeline: TimelinePoint[]
  muscleDistribution: MuscleDistributionPoint[]
  fatigueDecay: FatigueDecayPoint[]
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

const BODY_PART_COLORS = [
  "#F7CB16", // SpotME Gold
  "#2596BE", // SpotME Cyan/Primary
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F43F5E", // Rose
  "#F97316", // Orange
  "#06B6D4", // Light Cyan
  "#64748B", // Slate
]

function VolumeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  const displayDate = data.date
    ? new Date(`${data.date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : "Recent Date"

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md">
      <div className="text-[11px] font-mono text-muted-foreground pb-1 border-b border-border/40">
        {displayDate}
      </div>
      <div className="mt-1.5 space-y-1 font-mono text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Volume:
          </span>
          <span className="font-semibold text-foreground">{data.volumeKg.toLocaleString()} kg</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Duration:
          </span>
          <span className="font-medium text-foreground">{data.durationMinutes} mins</span>
        </div>
        {data.prsCount > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-amber-500">
              <Sparkles className="h-2.5 w-2.5" />
              PRs Hit:
            </span>
            <span className="font-bold text-amber-500">{data.prsCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function FatigueTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md font-mono">
      <div className="text-[11px] font-semibold text-foreground pb-1 border-b border-border/40">
        {data.setNumber}
      </div>
      <div className="mt-1.5 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Avg Tonnage:</span>
          <span className="font-semibold text-sky-400">{data.avgSetVolume.toLocaleString()} kg</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Avg Weight:</span>
          <span className="text-foreground">{data.avgWeightKg} kg</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Avg Reps:</span>
          <span className="text-foreground">{data.avgReps} reps</span>
        </div>
        {data.dropOffPct !== 0 && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
            <span className="text-muted-foreground">Decay vs Set 1:</span>
            <span className={data.dropOffPct < 0 ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {data.dropOffPct > 0 ? `+${data.dropOffPct}%` : `${data.dropOffPct}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function VolumeInsightsCard({
  timeline,
  muscleDistribution,
  fatigueDecay,
  kpis,
  isAthleteMode,
}: VolumeInsightsCardProps) {
  const [activeView, setActiveView] = useState<"timeline" | "fatigue">("timeline")
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const isDraggingTimeline = useRef(false)
  const timelineStartX = useRef(0)
  const timelineScrollLeftPos = useRef(0)

  // Horizontal scroll metrics for timeline chart
  const isTimelineScrollable = timeline.length > 7
  const timelineMinWidth = isTimelineScrollable ? `${Math.max(timeline.length * 56, 600)}px` : "100%"

  // Auto-scroll timeline to the right (most recent workout) so current data is visible on load
  useEffect(() => {
    if (timelineScrollRef.current && isTimelineScrollable && activeView === "timeline") {
      const timer = setTimeout(() => {
        if (timelineScrollRef.current) {
          timelineScrollRef.current.scrollTo({
            left: timelineScrollRef.current.scrollWidth,
            behavior: "smooth",
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [timeline, isTimelineScrollable, activeView])

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineScrollRef.current) return
    isDraggingTimeline.current = true
    timelineStartX.current = e.pageX - timelineScrollRef.current.offsetLeft
    timelineScrollLeftPos.current = timelineScrollRef.current.scrollLeft
  }

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTimeline.current || !timelineScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - timelineScrollRef.current.offsetLeft
    const walk = (x - timelineStartX.current) * 1.5
    timelineScrollRef.current.scrollLeft = timelineScrollLeftPos.current - walk
  }

  const handleTimelineMouseUp = () => {
    isDraggingTimeline.current = false
  }

  const totalMuscleVolume = muscleDistribution.reduce((acc, m) => acc + m.volume, 0) || 1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT 2 COLS: Volume Progression Timeline / Set Fatigue Decay */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-amber-500" />
                {activeView === "timeline" ? "Workout Volume" : "Weight Lifted by Set"}
              </h2>
              <span className="rounded bg-secondary border border-border px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                {timeline.length} Sessions
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeView === "timeline"
                ? "Daily lifting volume (kg) across workouts"
                : "Average weight and reps across Set 1 to Set 5+"}
            </p>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveView("timeline")}
              className={`rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                activeView === "timeline"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Volume Over Time
            </button>
            <button
              type="button"
              onClick={() => setActiveView("fatigue")}
              className={`rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                activeView === "fatigue"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sets Breakdown
            </button>
          </div>
        </div>

        {/* Horizontal Scroll Past/Recent Navigation Indicator */}
        {activeView === "timeline" && isTimelineScrollable && (
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pb-1 border-b border-border/30">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-500" />
              Scroll horizontally to view past workouts ({timeline.length} sessions)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => timelineScrollRef.current?.scrollBy({ left: -260, behavior: "smooth" })}
                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                title="View past workouts"
              >
                <ChevronLeft className="h-3 w-3" />
                Past
              </button>
              <button
                type="button"
                onClick={() => timelineScrollRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                title="View recent workouts"
              >
                Recent
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Chart View with Horizontal Scrolling */}
        <div className="w-full pt-1">
          {activeView === "timeline" ? (
            timeline.length === 0 ? (
              <div className="h-64 sm:h-72 flex items-center justify-center text-xs text-muted-foreground">
                No volume data logged in this timeframe.
              </div>
            ) : (
              <div
                ref={timelineScrollRef}
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleTimelineMouseMove}
                onMouseUp={handleTimelineMouseUp}
                onMouseLeave={handleTimelineMouseUp}
                className="h-64 sm:h-72 w-full overflow-x-auto overflow-y-hidden pb-2 select-none cursor-grab active:cursor-grabbing"
              >
                <div style={{ width: timelineMinWidth, minWidth: timelineMinWidth, height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 10, right: 25, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F7CB16" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F7CB16" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        dy={4}
                        tickFormatter={(val) => {
                          if (!val) return ""
                          const parts = val.split("-")
                          if (parts.length === 3) {
                            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                            const m = parseInt(parts[1], 10) - 1
                            return `${months[m] || parts[1]} ${parts[2]}`
                          }
                          return val
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip content={<VolumeTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="volumeKg"
                        stroke="#F7CB16"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#volGradient)"
                        dot={{ r: 3, fill: "#F7CB16", stroke: "#000", strokeWidth: 1 }}
                        activeDot={{ r: 5, stroke: "#F7CB16", strokeWidth: 2, fill: "#000" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          ) : (
            fatigueDecay.length === 0 ? (
              <div className="h-64 sm:h-72 flex items-center justify-center text-xs text-muted-foreground">
                No set data available for fatigue decay analysis.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fatigueDecay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                    <XAxis dataKey="setNumber" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                    />
                    <Tooltip content={<FatigueTooltip />} />
                    <Bar dataKey="avgSetVolume" fill="#2596BE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>

        {/* Bottom Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-xs font-mono">
          <div className="p-2 rounded bg-secondary/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase block">Avg Session Tonnage</span>
            <span className="font-semibold text-foreground">{kpis.avgVolumeKg.toLocaleString()} kg</span>
          </div>
          <div className="p-2 rounded bg-secondary/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase block">Relative Ratio</span>
            <span className="font-semibold text-amber-500">{kpis.relativeVolumeRatio}x Bodyweight</span>
          </div>
          <div className="p-2 rounded bg-secondary/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase block">Active Lift Time</span>
            <span className="font-semibold text-sky-400">{kpis.activeDurationMinutes} mins</span>
          </div>
          <div className="p-2 rounded bg-secondary/30 border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase block">Workload Rate</span>
            <span className="font-semibold text-emerald-400">{kpis.trainingDensityKgMin} kg/min</span>
          </div>
        </div>
      </div>

      {/* RIGHT COL: Muscle Group Distribution Donut */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-sky-500" />
            Volume by Muscle Group
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total kilograms lifted per muscle group
          </p>
        </div>

        {/* Donut Chart */}
        <div className="h-44 w-full relative flex items-center justify-center">
          {muscleDistribution.length === 0 ? (
            <div className="text-xs text-muted-foreground">No muscle data recorded.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={muscleDistribution}
                    dataKey="volume"
                    nameKey="bodyPart"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {muscleDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BODY_PART_COLORS[index % BODY_PART_COLORS.length]}
                        stroke="rgba(0,0,0,0.5)"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, "Volume"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Total</span>
                <span className="text-xs font-bold font-mono text-foreground">
                  {kpis.totalVolumeKg >= 1000
                    ? `${(kpis.totalVolumeKg / 1000).toFixed(0)}k kg`
                    : `${kpis.totalVolumeKg} kg`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Legend / Breakdown List */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs pr-1">
          {muscleDistribution.map((m, idx) => {
            const pct = Math.round((m.volume / totalMuscleVolume) * 100)
            const color = BODY_PART_COLORS[idx % BODY_PART_COLORS.length]
            return (
              <div key={m.bodyPart} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-secondary/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate text-foreground capitalize font-sans">{m.bodyPart}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-[11px]">
                  <span>{m.volume.toLocaleString()} kg</span>
                  <span className="font-semibold text-foreground w-7 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
