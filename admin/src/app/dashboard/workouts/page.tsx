"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Flame,
  Trophy,
  Dumbbell,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
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
  scheduled_date: string
  status: string
  completed_at: string | null
  duration_seconds: number | null
  exercises_count: number
  total_volume_kg: number
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

  // Sessions & PRs State
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [globalPrs, setGlobalPrs] = useState<GlobalPR[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // 1. Fetch Workout Analytics with Local Timezone
  const fetchAnalytics = async (userId: number | null, rangeVal: AnalyticsRange) => {
    setAnalyticsLoading(true)
    const clientTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
    try {
      const res = await api.get<WorkoutAnalyticsData>("/admin/workouts/analytics", {
        params: {
          userId: userId || undefined,
          range: rangeVal,
          tz: clientTz,
        },
      })
      setAnalyticsData(res.data)
    } catch (err) {
      console.error("Failed to load workout analytics:", err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // 2. Fetch Sessions & PRs
  const fetchWorkoutsList = async () => {
    setSessionsLoading(true)
    try {
      const res = await api.get("/admin/workouts/sessions", {
        params: { page, limit: 25 },
      })
      setSessions(res.data.sessions || [])
      setGlobalPrs(res.data.globalPrs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to fetch workouts list:", err)
    } finally {
      setSessionsLoading(false)
    }
  }

  // Load analytics when userId or range changes
  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics(selectedUserId, range)
    }
  }, [selectedUserId, range, activeTab])

  // Load sessions list when sessions or prs tab is active
  useEffect(() => {
    if (activeTab === "sessions" || activeTab === "prs") {
      fetchWorkoutsList()
    }
  }, [page, activeTab])

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

      {/* ─── TAB 2: WORKOUT SESSIONS (AUDIT LOG) ─── */}
      {activeTab === "sessions" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {sessionsLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-mono">
                Loading workout sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-mono">
                No completed workout sessions logged yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sessions.map((sess) => {
                  const dateStr = sess.completed_at
                    ? new Date(sess.completed_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "In progress"

                  return (
                    <div
                      key={sess.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <UserAvatar
                          src={sess.profile_pic_url}
                          name={sess.full_name}
                          size="md"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/users/${sess.user_id}`}
                              className="font-semibold text-foreground hover:underline truncate"
                            >
                              {sess.full_name || "Athlete"}
                            </Link>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium ${
                                sess.status === "completed"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                  : "bg-secondary border-border text-muted-foreground"
                              }`}
                            >
                              {sess.status || "completed"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {sess.email || `User #${sess.user_id}`}
                          </p>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {dateStr}
                          </span>
                        </div>
                      </div>

                      {/* Workout Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono shrink-0 sm:w-72">
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Exercises</span>
                          <div className="font-semibold text-foreground">
                            {sess.exercises_count || 0}
                          </div>
                        </div>
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Duration</span>
                          <div className="font-semibold text-sky-500">
                            {formatDuration(sess.duration_seconds)}
                          </div>
                        </div>
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Volume</span>
                          <div className="font-semibold text-amber-500">
                            {Math.round(sess.total_volume_kg || 0)} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
            <span>
              Page {page} of {Math.max(1, Math.ceil(total / 25))} ({total} sessions)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 25 >= total}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
