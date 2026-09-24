"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot,
} from "recharts"
import {
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  ChevronLeft,
  Filter,
  Play,
  Check,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trophy,
  Clock,
} from "lucide-react"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AthleteExerciseItem,
  AthleteWorkoutItem,
  AthleteExercisesResponse,
  ProgressionResponse,
  ProgressionMetric,
  ProgressionRange,
  ProgressionTimelinePoint,
} from "./types"

interface AthleteExerciseProgressionProps {
  userId: number
  athleteName?: string
}

const METRIC_CONFIG: Record<
  ProgressionMetric,
  { label: string; shortLabel: string; unit: string; color: string; fillGradient: string }
> = {
  maxWeight: {
    label: "Max Weight",
    shortLabel: "Max Wt",
    unit: "kg",
    color: "#F7CB16", // Gold
    fillGradient: "maxWeightGrad",
  },
  estimated1rm: {
    label: "Estimated 1RM",
    shortLabel: "1RM",
    unit: "kg",
    color: "#06B6D4", // Cyan
    fillGradient: "e1rmGrad",
  },
  volume: {
    label: "Volume",
    shortLabel: "Volume",
    unit: "kg",
    color: "#8B5CF6", // Purple
    fillGradient: "volGrad",
  },
  reps: {
    label: "Max Reps",
    shortLabel: "Max Reps",
    unit: "reps",
    color: "#10B981", // Emerald
    fillGradient: "repsGrad",
  },
  avgWeight: {
    label: "Average Weight",
    shortLabel: "Avg Wt",
    unit: "kg",
    color: "#F97316", // Orange
    fillGradient: "avgWtGrad",
  },
}

const RANGES: { key: ProgressionRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "ALL" },
]

export function AthleteExerciseProgression({
  userId,
  athleteName = "Athlete",
}: AthleteExerciseProgressionProps) {
  // Exercises List State
  const [exercises, setExercises] = useState<AthleteExerciseItem[]>([])
  const [workouts, setWorkouts] = useState<AthleteWorkoutItem[]>([])
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [loadingExercises, setLoadingExercises] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBodyPart, setSelectedBodyPart] = useState("all")
  const [selectedWorkout, setSelectedWorkout] = useState("all")
  const [selectedRange, setSelectedRange] = useState<ProgressionRange>("all")
  const [selectedMetric, setSelectedMetric] = useState<ProgressionMetric>("maxWeight")

  // Selected Exercise & Progression State
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [progressionData, setProgressionData] = useState<ProgressionResponse | null>(null)
  const [loadingProgression, setLoadingProgression] = useState(false)

  // Hover / GIF playing state
  const [hoveredExerciseId, setHoveredExerciseId] = useState<string | null>(null)
  const [activeSessionDate, setActiveSessionDate] = useState<string | null>(null)

  // Horizontal scroll refs
  const scrollRailRef = useRef<HTMLDivElement>(null)
  const chartScrollRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Exercises the Athlete has completed at least one set in
  useEffect(() => {
    let isMounted = true
    async function loadAthleteExercises() {
      setLoadingExercises(true)
      try {
        const res = await api.get<AthleteExercisesResponse>("/admin/workouts/athlete-exercises", {
          params: { userId },
        })
        if (!isMounted) return

        const exList = res.data.exercises || []
        setExercises(exList)
        setWorkouts(res.data.workouts || [])
        setBodyParts(res.data.bodyParts || [])

        // Automatically select the first exercise (most trained) if none selected
        if (exList.length > 0) {
          setSelectedExerciseId((prev) => (prev && exList.some((e) => e.id === prev) ? prev : exList[0].id))
        } else {
          setSelectedExerciseId(null)
        }
      } catch (err) {
        console.error("Failed to load athlete exercises:", err)
      } finally {
        if (isMounted) setLoadingExercises(false)
      }
    }

    loadAthleteExercises()
    return () => {
      isMounted = false
    }
  }, [userId])

  // 2. Fetch Progression Data whenever selectedExerciseId, range, or workout changes
  useEffect(() => {
    if (!selectedExerciseId) {
      setProgressionData(null)
      return
    }

    let isMounted = true
    async function loadProgression() {
      setLoadingProgression(true)
      const clientTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"

      try {
        const res = await api.get<ProgressionResponse>("/admin/workouts/exercise-progression", {
          params: {
            userId,
            exerciseId: selectedExerciseId,
            range: selectedRange,
            tz: clientTz,
            workoutTitle: selectedWorkout !== "all" ? selectedWorkout : undefined,
          },
        })
        if (!isMounted) return
        setProgressionData(res.data)
      } catch (err) {
        console.error("Failed to load exercise progression:", err)
      } finally {
        if (isMounted) setLoadingProgression(false)
      }
    }

    loadProgression()
    return () => {
      isMounted = false
    }
  }, [userId, selectedExerciseId, selectedRange, selectedWorkout])

  // Filtered exercises for selector gallery
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        !searchQuery.trim() ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.target.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesBodyPart =
        selectedBodyPart === "all" || ex.bodyPart.toLowerCase() === selectedBodyPart.toLowerCase()

      return matchesSearch && matchesBodyPart
    })
  }, [exercises, searchQuery, selectedBodyPart])

  // Currently active exercise details
  const activeExercise = useMemo(() => {
    return exercises.find((e) => e.id === selectedExerciseId) || progressionData?.exercise || null
  }, [exercises, selectedExerciseId, progressionData])

  // Prepare chart series data based on selected metric
  const chartData = useMemo(() => {
    if (!progressionData?.timeline) return []
    return progressionData.timeline.map((point) => {
      let metricValue = 0
      if (selectedMetric === "maxWeight") metricValue = point.maxWeight
      else if (selectedMetric === "estimated1rm") metricValue = point.estimated1rm
      else if (selectedMetric === "volume") metricValue = point.totalVolume
      else if (selectedMetric === "reps") metricValue = point.maxReps
      else if (selectedMetric === "avgWeight") metricValue = point.avgWeight

      return {
        ...point,
        metricValue,
      }
    })
  }, [progressionData, selectedMetric])

  // Horizontal scroll metrics for progression chart
  const isChartScrollable = chartData.length > 7
  const chartMinWidth = isChartScrollable ? `${Math.max(chartData.length * 64, 600)}px` : "100%"

  const isDraggingChart = useRef(false)
  const chartStartX = useRef(0)
  const chartScrollLeftPos = useRef(0)

  // Auto-scroll chart to the right (most recent session) so current data is visible on load
  useEffect(() => {
    if (chartScrollRef.current && isChartScrollable) {
      const timer = setTimeout(() => {
        if (chartScrollRef.current) {
          chartScrollRef.current.scrollTo({
            left: chartScrollRef.current.scrollWidth,
            behavior: "smooth",
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [chartData, isChartScrollable, selectedMetric])

  const handleChartMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartScrollRef.current) return
    isDraggingChart.current = true
    chartStartX.current = e.pageX - chartScrollRef.current.offsetLeft
    chartScrollLeftPos.current = chartScrollRef.current.scrollLeft
  }

  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingChart.current || !chartScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - chartScrollRef.current.offsetLeft
    const walk = (x - chartStartX.current) * 1.5
    chartScrollRef.current.scrollLeft = chartScrollLeftPos.current - walk
  }

  const handleChartMouseUp = () => {
    isDraggingChart.current = false
  }

  const scrollRail = (direction: "left" | "right") => {
    if (scrollRailRef.current) {
      const amount = direction === "left" ? -280 : 280
      scrollRailRef.current.scrollBy({ left: amount, behavior: "smooth" })
    }
  }

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const data: ProgressionTimelinePoint & { metricValue: number } = payload[0]?.payload
    if (!data) return null

    const cfg = METRIC_CONFIG[selectedMetric]

    return (
      <div className="rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-2xl backdrop-blur-md font-mono z-50 min-w-[200px]">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-1.5">
          <span className="font-semibold text-foreground">{data.formattedDate}</span>
          {data.isPersonalRecord && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] text-amber-500 font-bold">
              <Sparkles className="h-2.5 w-2.5" /> PR Hit
            </span>
          )}
        </div>

        <div className="mt-1.5 text-[11px] text-muted-foreground truncate max-w-[220px]">
          Session: <span className="text-foreground font-medium">{data.workoutTitle}</span>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-border/30 pt-1.5">
          <span className="text-muted-foreground">{cfg.label}:</span>
          <span className="text-sm font-bold" style={{ color: cfg.color }}>
            {data.metricValue.toLocaleString()} {cfg.unit}
          </span>
        </div>

        {/* Mini sets breakdown preview */}
        {data.sets && data.sets.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/30 pt-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Sets Completed ({data.sets.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {data.sets.map((s, idx) => (
                <span
                  key={idx}
                  className="rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-foreground border border-border/40"
                >
                  {s.weight}kg × {s.reps}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Custom PR Dot Marker on line
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.isPersonalRecord) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={METRIC_CONFIG[selectedMetric].color}
          stroke="#09090b"
          strokeWidth={1.5}
        />
      )
    }

    return (
      <g key={`pr-dot-${payload.formattedDate}`}>
        <circle cx={cx} cy={cy} r={7} fill="#F7CB16" opacity={0.25} />
        <circle cx={cx} cy={cy} r={4.5} fill="#F7CB16" stroke="#09090b" strokeWidth={1.5} />
      </g>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-5 space-y-5 shadow-sm">
      {/* ─── SECTION 1: HEADER & STATS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                Exercise Progress
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-mono text-primary font-medium">
                  {exercises.length} Exercises Completed
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select an exercise below to view weight progression, repetitions, and sets logged over time.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {progressionData?.summary && (
            <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                <Activity className="h-3 w-3 text-sky-400" />
                {progressionData.summary.sessionsCount} Workouts
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                <Layers className="h-3 w-3 text-amber-400" />
                {progressionData.summary.setsCount} Sets
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 2: EXERCISE SEARCH & FILTER CONTROLS ─── */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search exercise by name or muscle target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          {/* Workout Split Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase whitespace-nowrap">
              Workout:
            </span>
            <select
              value={selectedWorkout}
              onChange={(e) => setSelectedWorkout(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px] truncate"
            >
              <option value="all">All Workouts ({workouts.reduce((acc, w) => acc + w.sessionCount, 0)})</option>
              {workouts.map((w, idx) => (
                <option key={idx} value={w.title}>
                  {w.title} ({w.sessionCount})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body Part Filter Chips */}
        {bodyParts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedBodyPart("all")}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedBodyPart === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              All Muscles
            </button>
            {bodyParts.map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => setSelectedBodyPart(bp)}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] capitalize font-medium transition-colors whitespace-nowrap ${
                  selectedBodyPart.toLowerCase() === bp.toLowerCase()
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {bp}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECTION 3: EXERCISE SELECTOR GALLERY (MOBILE-FIRST HORIZONTAL RAIL) ─── */}
      <div className="relative">
        {/* Navigation Buttons for Horizontal Scroll */}
        <div className="hidden sm:flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Select Exercise ({filteredExercises.length} available):
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollRail("left")}
              className="p-1 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Scroll left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail("right")}
              className="p-1 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Scroll right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loadingExercises ? (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-56 shrink-0 h-36 rounded-xl border border-border bg-muted/40 animate-pulse p-3 space-y-2"
              />
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs font-mono text-muted-foreground">
            No completed exercises matched the current filters.
          </div>
        ) : (
          <div
            ref={scrollRailRef}
            className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x focus:outline-none"
            tabIndex={0}
          >
            {filteredExercises.map((ex) => {
              const isSelected = ex.id === selectedExerciseId
              const isHovered = hoveredExerciseId === ex.id
              const displayMedia = isHovered && ex.gifUrl ? ex.gifUrl : ex.imageUrl || ex.gifUrl

              return (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExerciseId(ex.id)}
                  onMouseEnter={() => setHoveredExerciseId(ex.id)}
                  onMouseLeave={() => setHoveredExerciseId(null)}
                  className={`group relative w-60 shrink-0 cursor-pointer snap-start rounded-xl border p-2.5 transition-all duration-200 select-none ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                      : "border-border bg-background/80 hover:border-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  {/* Top Media Preview & GIF Badge */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-900 border border-border/50 flex items-center justify-center">
                    {displayMedia ? (
                      <img
                        src={displayMedia}
                        alt={ex.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Dumbbell className="h-6 w-6 opacity-40" />
                        <span className="text-[10px] mt-1 font-mono">No Media</span>
                      </div>
                    )}

                    {/* GIF Indicator Badge */}
                    {ex.gifUrl && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-400 backdrop-blur-xs border border-amber-400/30">
                        <Play className="h-2 w-2 fill-current" />
                        GIF
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 rounded-full bg-primary p-0.5 text-primary-foreground shadow-sm">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Exercise Info */}
                  <div className="mt-2 space-y-1">
                    <h3
                      className={`text-xs font-semibold capitalize line-clamp-1 transition-colors ${
                        isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}
                      title={ex.name}
                    >
                      {ex.name}
                    </h3>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="capitalize text-muted-foreground truncate max-w-[100px]">
                        {ex.target || ex.bodyPart}
                      </span>
                      <span className="font-semibold text-foreground">{ex.allTimeMaxWeight} kg</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/80 pt-1 border-t border-border/30">
                      <span>{ex.totalSessionsCount} sessions</span>
                      <span className="text-amber-500 font-medium">{ex.totalSetsCompleted} sets</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 4: PROGRESSION CHART & ACTIVE EXERCISE SPOTLIGHT ─── */}
      {selectedExerciseId && (
        <div className="rounded-xl border border-border/80 bg-background/50 p-3 sm:p-4 space-y-4">
          {/* Active Exercise Ribbon & Metric / Timeframe Toggles */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-3">
            {/* Active Exercise Summary Header */}
            <div className="flex items-center gap-3">
              {activeExercise?.imageUrl || activeExercise?.gifUrl ? (
                <img
                  src={activeExercise.gifUrl || activeExercise.imageUrl || ""}
                  alt={activeExercise.name}
                  className="h-12 w-12 rounded-lg object-cover border border-border shrink-0 bg-zinc-900"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Dumbbell className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-foreground capitalize">
                    {activeExercise?.name}
                  </h3>
                  <Badge variant="outline" className="font-mono text-[10px] capitalize">
                    {activeExercise?.bodyPart}
                  </Badge>
                  {progressionData?.summary?.maxEstimated1RM ? (
                    <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-400 font-semibold">
                      ⚡ 1RM: {progressionData.summary.maxEstimated1RM} kg
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Target: <span className="capitalize">{activeExercise?.target}</span> • Equipment:{" "}
                  <span className="capitalize">{activeExercise?.equipment || "Free Weight"}</span>
                </p>
              </div>
            </div>

            {/* Filter Pills: Metrics & Ranges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
              {/* Metric Selector Pills */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 text-xs font-mono">
                {(Object.keys(METRIC_CONFIG) as ProgressionMetric[]).map((m) => {
                  const cfg = METRIC_CONFIG[m]
                  const isActive = selectedMetric === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMetric(m)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={isActive ? { borderLeft: `2px solid ${cfg.color}` } : {}}
                    >
                      {cfg.shortLabel}
                    </button>
                  )
                })}
              </div>

              {/* Timeframe Range Pills */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 text-xs font-mono">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRange(r.key)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                      selectedRange === r.key
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Progression Overload KPIs */}
          {progressionData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="rounded-lg border border-border/60 bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Start Weight</span>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  {progressionData.summary.startWeight} kg
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Latest Weight</span>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  {progressionData.summary.currentWeight} kg
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase">Weight Change</span>
                <div
                  className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
                    progressionData.summary.weightDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {progressionData.summary.weightDelta >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {progressionData.summary.weightDelta > 0 ? "+" : ""}
                  {progressionData.summary.weightDelta} kg ({progressionData.summary.weightDeltaPct}%)
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  Personal Record
                </span>
                <div className="text-sm font-bold text-amber-500 mt-0.5">
                  {progressionData.summary.maxWeightAllTime} kg
                  {progressionData.summary.prDate && (
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      ({progressionData.summary.prDate})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Line / Area Chart with Horizontal Scrolling */}
          <div className="pt-2 space-y-2">
            {isChartScrollable && (
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pb-1 border-b border-border/30">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-primary" />
                  Scroll horizontally to view past workouts ({chartData.length} sessions)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => chartScrollRef.current?.scrollBy({ left: -260, behavior: "smooth" })}
                    className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 transition-colors"
                    title="View past workouts"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Past
                  </button>
                  <button
                    type="button"
                    onClick={() => chartScrollRef.current?.scrollBy({ left: 260, behavior: "smooth" })}
                    className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 transition-colors"
                    title="View recent workouts"
                  >
                    Recent
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {loadingProgression ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs font-mono text-muted-foreground space-y-2">
                <p>No completed sets recorded for this exercise within the selected timeframe or workout.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRange("all")
                    setSelectedWorkout("all")
                  }}
                  className="text-xs font-mono"
                >
                  Reset Filters to All Time
                </Button>
              </div>
            ) : (
              <div
                ref={chartScrollRef}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={handleChartMouseUp}
                onMouseLeave={handleChartMouseUp}
                className="h-64 sm:h-72 w-full overflow-x-auto overflow-y-hidden pb-2 select-none cursor-grab active:cursor-grabbing"
              >
                <div style={{ width: chartMinWidth, height: "100%", minWidth: chartMinWidth }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 25, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="maxWeightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F7CB16" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#F7CB16" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="e1rmGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="repsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="avgWtGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.6} />

                      <XAxis
                        dataKey="shortDate"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={5}
                      />

                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Area
                        type="monotone"
                        dataKey="metricValue"
                        stroke={METRIC_CONFIG[selectedMetric].color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#${METRIC_CONFIG[selectedMetric].fillGradient})`}
                        dot={renderCustomDot}
                        activeDot={{ r: 6, stroke: "#09090b", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION 5: SESSION-BY-SESSION LOG & SETS BREAKDOWN ─── */}
          {progressionData?.timeline && progressionData.timeline.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Workout History ({progressionData.timeline.length}):
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Click a workout to see sets
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {progressionData.timeline.map((point) => {
                  const isExpanded = activeSessionDate === point.sessionDate
                  return (
                    <div
                      key={point.workoutId}
                      onClick={() =>
                        setActiveSessionDate(isExpanded ? null : point.sessionDate)
                      }
                      className={`rounded-lg border p-2.5 cursor-pointer transition-all duration-150 ${
                        isExpanded
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-card/60 hover:border-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">
                              {point.formattedDate}
                            </span>
                            {point.isPersonalRecord && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 text-[9px] font-bold text-amber-500 font-mono">
                                <Sparkles className="h-2 w-2" /> PR
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {point.workoutTitle}
                          </span>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-foreground">
                            {point.maxWeight} kg
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {point.setsCompleted} sets • {point.totalVolume} kg vol
                          </span>
                        </div>
                      </div>

                      {/* Sets Breakdown (Expanded or preview) */}
                      {point.sets && point.sets.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-1 font-mono text-[11px]">
                          <div className="flex flex-wrap gap-1">
                            {point.sets.map((s, idx) => (
                              <span
                                key={idx}
                                className={`rounded px-1.5 py-0.5 text-[10px] border ${
                                  s.weight === point.maxWeight && point.isPersonalRecord
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-500 font-bold"
                                    : "bg-muted border-border/40 text-foreground"
                                }`}
                              >
                                Set {s.set_number}: {s.weight}kg × {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
