"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Flame,
  Trophy,
  Dumbbell,
  Clock,
  User,
  TrendingUp,
  Calendar,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  Pencil,
  Trash2,
  Search,
  X,
  Star,
} from "lucide-react"
import Link from "next/link"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FormSelect } from "@/components/ui/form-select"
import { Pagination } from "@/components/ui/pagination"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import api from "@/lib/api"

// Modular Analytics Components
import { AnalyticsRange, WorkoutAnalyticsData } from "@/components/workout-analytics/types"
import { AnalyticsFilterBar } from "@/components/workout-analytics/analytics-filter-bar"
import { KpiHeroRibbon } from "@/components/workout-analytics/kpi-hero-ribbon"
import { VolumeInsightsCard } from "@/components/workout-analytics/volume-insights-card"
import { FrequencyAdherenceCard } from "@/components/workout-analytics/frequency-adherence-card"
import { DurationPacingCard } from "@/components/workout-analytics/duration-pacing-card"
import { SetsRepsSchemesCard } from "@/components/workout-analytics/sets-reps-schemes-card"
import { BioEnergyWellnessCard } from "@/components/workout-analytics/bio-energy-wellness-card"
import { AthleteExerciseProgression } from "@/components/workout-analytics/athlete-exercise-progression"
import { MuscleHeatMapCard } from "@/components/workout-analytics/muscle-heatmap-card"

interface WorkoutSession {
  id: number
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  title: string | null
  scheduled_date: string
  started_at: string | null
  status: string
  completed_at: string | null
  duration_seconds: number | null
  exercises_count: number
  total_sets: number
  total_volume_kg: number
  rating: number | null
}

function statusBadgeVariant(status: string): "success" | "warning" | "destructive" | "secondary" | "outline" {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "success"
    case "active":
      return "warning"
    case "cancelled":
    case "abandoned":
      return "destructive"
    case "rest":
      return "secondary"
    default:
      return "outline"
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

interface GlobalPR {
  exercise_id: string
  exercise_name: string
  user_id: number
  full_name: string
  email?: string
  profile_pic_url?: string | null
  weight_kg: number
  reps: number
  achieved_at: string
}

function WorkoutsDashboardContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as "analytics" | "sessions" | "prs") || "analytics"
  const initialUserId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!, 10) : null

  // Tabs: "analytics" is the premier first feature
  const [activeTab, setActiveTab] = useState<"analytics" | "sessions" | "prs">(initialTab)

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<WorkoutAnalyticsData | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialUserId)
  const [range, setRange] = useState<AnalyticsRange>("30d")
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true)
  // Live-update state: fresh logs must appear without manual tab switching
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Sessions & PRs State
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [globalPrs, setGlobalPrs] = useState<GlobalPR[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  // Sessions filters
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  // Edit / delete state
  const [editing, setEditing] = useState<WorkoutSession | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editStatus, setEditStatus] = useState("completed")
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState<WorkoutSession | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // 1. Fetch Workout Analytics with Local Timezone (cache-busted so new logs show instantly)
  const fetchAnalytics = async (userId: number | null, rangeVal: AnalyticsRange, silent = false) => {
    if (!silent) setAnalyticsLoading(true)
    const clientTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
    try {
      const res = await api.get<WorkoutAnalyticsData>("/admin/workouts/analytics", {
        params: {
          userId: userId || undefined,
          range: rangeVal,
          tz: clientTz,
          _t: Date.now(),
        },
      })
      setAnalyticsData(res.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to load workout analytics:", err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // 2. Fetch Sessions & PRs (respects toolbar filters + athlete filter)
  const fetchWorkoutsList = async (silent = false) => {
    if (!silent) setSessionsLoading(true)
    try {
      const res = await api.get("/admin/workouts/sessions", {
        params: {
          page,
          limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: search.trim() || undefined,
          userId: selectedUserId || undefined,
          _t: Date.now(),
        },
      })
      setSessions(res.data.sessions || [])
      setGlobalPrs(res.data.globalPrs || [])
      setTotal(res.data.total || 0)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch workouts list:", err)
    } finally {
      setSessionsLoading(false)
    }
  }

  // Debounce the search box so every keystroke doesn't refetch
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const openEdit = (sess: WorkoutSession) => {
    setEditing(sess)
    setEditTitle(sess.title || "")
    setEditStatus((sess.status || "completed").toLowerCase())
  }

  const saveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      await api.put(`/admin/workouts/sessions/${editing.id}`, {
        title: editTitle.trim() || null,
        status: editStatus,
      })
      setEditing(null)
      fetchWorkoutsList(true)
    } catch (err) {
      console.error("Failed to update workout:", err)
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await api.delete(`/admin/workouts/sessions/${deleting.id}`)
      // If we removed the last row of the page, step back so we don't strand on empty
      if (sessions.length <= 1 && page > 1) setPage((p) => p - 1)
      setDeleting(null)
      fetchWorkoutsList(true)
    } catch (err) {
      console.error("Failed to delete workout:", err)
    } finally {
      setDeletingBusy(false)
    }
  }

  const refreshActiveTab = (silent = false) => {
    if (activeTab === "analytics") fetchAnalytics(selectedUserId, range, silent)
    else fetchWorkoutsList(silent)
  }

  // Load analytics when userId or range changes
  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics(selectedUserId, range)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, range, activeTab])

  // Live updates: poll every 30s + refetch on window focus so just-logged
  // workouts appear without switching tabs. Silent = no loading spinner flash.
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => refreshActiveTab(true), 30000)
    const onFocus = () => refreshActiveTab(true)
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshActiveTab(true)
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, activeTab, selectedUserId, range, page, limit, search, statusFilter])

  // Load sessions list when sessions or prs tab is active
  useEffect(() => {
    if (activeTab === "sessions" || activeTab === "prs") {
      fetchWorkoutsList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeTab, search, statusFilter, selectedUserId])

  const formatDuration = (secs: number | null) => {
    if (!secs) return "—"
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-amber-500" />
            Workout Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track workouts, exercise progress, training volume, and consistency.
          </p>
        </div>

        {/* Live status + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshActiveTab(false)}
            disabled={analyticsLoading || sessionsLoading}
            className="gap-1.5"
            title="Refresh now — new logs appear instantly"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${(analyticsLoading || sessionsLoading) ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Auto-refresh every 30s is ON" : "Auto-refresh is OFF"}
            className={`relative h-5 w-9 rounded-full transition-colors ${autoRefresh ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all ${autoRefresh ? "left-[18px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {/* Tab Switcher: Analytics (1st), Sessions (2nd), PRs (3rd) */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span>Workout Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "sessions"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Workout Sessions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prs")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "prs"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Global PRs</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: WORKOUT ANALYTICS (PREMIER FIRST FEATURE) ─── */}
      {activeTab === "analytics" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 1. Athlete Selector & Range Filter Bar */}
          <AnalyticsFilterBar
            athletes={analyticsData?.athletes || []}
            selectedUserId={selectedUserId}
            selectedUserMeta={analyticsData?.meta.selectedUser || null}
            range={range}
            timezone={analyticsData?.meta.timezone}
            onSelectUser={(uid) => setSelectedUserId(uid)}
            onChangeRange={(r) => setRange(r)}
            onRefresh={() => fetchAnalytics(selectedUserId, range)}
            isLoading={analyticsLoading}
            lastUpdated={analyticsData?.meta.generatedAt}
          />

          {analyticsLoading && !analyticsData ? (
            <div className="py-24 text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-mono text-muted-foreground">
                Aggregating 36+ workout performance metrics...
              </p>
            </div>
          ) : analyticsData ? (
            <>
              {/* 2. Top KPI Hero Ribbon (6 Highlight Cards) */}
              <KpiHeroRibbon
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 3. Athlete Individual Exercise Progressive Overload Deep Dive */}
              {selectedUserId ? (
                <AthleteExerciseProgression
                  userId={selectedUserId}
                  athleteName={analyticsData.meta.selectedUser?.full_name || "Athlete"}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-4 sm:p-6 text-center space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Exercise Progress &amp; History
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Select an athlete from the filter bar above to see their exercise history, progress charts, and set logs.
                  </p>
                  {analyticsData.athletes && analyticsData.athletes.length > 0 && (
                    <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-muted-foreground">Quick Select:</span>
                      {analyticsData.athletes.slice(0, 3).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedUserId(a.id)}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <UserAvatar
                            src={a.profile_pic_url}
                            name={a.full_name || "U"}
                            size="xs"
                            className="h-4 w-4"
                          />
                          <span>{a.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">({a.workouts_count} workouts)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Body Part Heat Map & Muscle Intensity (Mobile App Replica) */}
              <MuscleHeatMapCard
                muscleHeatMap={analyticsData.muscleHeatMap || []}
                selectedUserMeta={analyticsData.meta.selectedUser}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 5. Volume Progression Curve, Body Part Donut & Set Fatigue Decay */}
              <VolumeInsightsCard
                timeline={analyticsData.timeline}
                muscleDistribution={analyticsData.muscleDistribution}
                fatigueDecay={analyticsData.fatigueDecay}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 6. Frequency Rhythm, Workout Time & Schedule Adherence */}
              <FrequencyAdherenceCard
                dayOfWeek={analyticsData.dayOfWeek}
                circadian={analyticsData.circadian}
                timeOfDayPeriods={analyticsData.timeOfDayPeriods}
                peakWorkoutTime={analyticsData.peakWorkoutTime}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 6. Duration, Pacing & Intra-Workout Rest Intervals */}
              <DurationPacingCard
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 7. Rep Range Schemes & Set Execution */}
              <SetsRepsSchemesCard
                repSchemes={analyticsData.repSchemes}
                skippedExercises={analyticsData.skippedExercises}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 8. Energy, Hydration & Ratings */}
              <BioEnergyWellnessCard
                ratingsDistribution={analyticsData.ratingsDistribution}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />
            </>
          ) : (
            <div className="py-20 text-center text-xs text-muted-foreground font-mono">
              Unable to load workout analytics data.
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: WORKOUT SESSIONS (MANAGE ALL) ─── */}
      {activeTab === "sessions" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Toolbar: search + status filter + athlete scope */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search athlete, email, or workout…"
                className="pl-8 h-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="w-full sm:w-44">
              <FormSelect
                label="Status"
                items={["all", "active", "completed", "cancelled", "abandoned", "rest"]}
                value={statusFilter}
                onChange={(v) => {
                  setPage(1)
                  setStatusFilter(v)
                }}
              />
            </div>
            {selectedUserId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUserId(null)}
                className="gap-1.5 h-9"
                title="Show workouts from all athletes"
              >
                <User className="h-3.5 w-3.5" />
                Athlete #{selectedUserId}
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <span className="text-xs text-muted-foreground font-mono sm:ml-auto">
              {total} session{total === 1 ? "" : "s"}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {sessionsLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-mono">
                Loading workout sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-mono">
                No workouts match these filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workout</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="text-right">Exs</TableHead>
                    <TableHead className="text-right">Sets</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((sess) => (
                    <TableRow key={sess.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground truncate max-w-44" title={sess.title || ""}>
                          {sess.title || "Workout"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">#{sess.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar src={sess.profile_pic_url} name={sess.full_name} size="sm" />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/users/${sess.user_id}`}
                              className="block text-xs font-semibold text-foreground hover:underline truncate"
                            >
                              {sess.full_name || "Athlete"}
                            </Link>
                            <div className="text-[10px] text-muted-foreground truncate" title={sess.email || ""}>
                              {sess.email || `User #${sess.user_id}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(sess.status)}>
                          {sess.status || "completed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(sess.started_at || sess.scheduled_date)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-sky-500 whitespace-nowrap">
                        {formatDuration(sess.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {sess.exercises_count || 0}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {sess.total_sets ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-amber-500 whitespace-nowrap">
                        {Math.round(sess.total_volume_kg || 0).toLocaleString()} kg
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono whitespace-nowrap">
                        {sess.rating != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {sess.rating}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(sess)}
                          className="h-7 w-7 p-0"
                          title={`Edit workout #${sess.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(sess)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title={`Delete workout #${sess.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(n) => {
              setPage(1)
              setLimit(n)
            }}
          />

          {/* Edit dialog */}
          {editing && (
            <Dialog open={!!editing} onClose={() => !savingEdit && setEditing(null)}>
              <DialogContent onClose={() => !savingEdit && setEditing(null)}>
                <DialogHeader>
                  <DialogTitle>Edit workout #{editing.id}</DialogTitle>
                  <DialogDescription>
                    {editing.full_name ? `${editing.full_name} · ` : ""}
                    {formatDateTime(editing.started_at || editing.scheduled_date)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Workout title"
                      maxLength={120}
                    />
                  </div>
                  <FormSelect
                    label="Status"
                    items={["active", "completed", "cancelled", "abandoned", "rest"]}
                    value={editStatus}
                    onChange={setEditStatus}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Marking completed stamps the finish time; reopening to active clears it.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? "Saving…" : "Save changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete confirm */}
          {deleting && (
            <Dialog open={!!deleting} onClose={() => !deletingBusy && setDeleting(null)}>
              <DialogContent onClose={() => !deletingBusy && setDeleting(null)}>
                <DialogHeader>
                  <DialogTitle>Delete workout #{deleting.id}?</DialogTitle>
                  <DialogDescription>
                    “{deleting.title || "Workout"}” by {deleting.full_name || `User #${deleting.user_id}`} will be
                    permanently removed with all of its exercises and sets. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
                    {deletingBusy ? "Deleting…" : "Delete workout"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* ─── TAB 3: GLOBAL PR LEADERBOARD ─── */}
      {activeTab === "prs" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Exercise Personal Records
            </h2>
          </div>

          {globalPrs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground font-mono">
              No personal records logged yet. Records update automatically as users log max sets.
            </div>
          ) : (
            <div className="divide-y divide-border/40 font-mono text-xs">
              {globalPrs.map((pr, idx) => {
                const dateStr = new Date(pr.achieved_at).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })

                return (
                  <div
                    key={idx}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-[11px] text-foreground shrink-0">
                        #{idx + 1}
                      </span>
                      <UserAvatar
                        src={pr.profile_pic_url}
                        name={pr.full_name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="font-sans font-semibold text-foreground block truncate">
                          {pr.exercise_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans flex items-center gap-1">
                          Athlete:
                          <Link
                            href={`/dashboard/users/${pr.user_id}`}
                            className="text-foreground hover:underline font-medium"
                          >
                            {pr.full_name}
                          </Link>
                          · {dateStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-sm font-bold text-foreground">
                        {pr.weight_kg} kg × {pr.reps} reps
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WorkoutsDashboardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-muted-foreground font-mono">Loading Workout Analytics...</div>}>
      <WorkoutsDashboardContent />
    </Suspense>
  )
}
