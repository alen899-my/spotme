"use client"

import React, { useEffect, useState } from "react"
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
} from "lucide-react"
import Link from "next/link"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

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

export default function WorkoutsDashboardPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [globalPrs, setGlobalPrs] = useState<GlobalPR[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"sessions" | "prs">("sessions")

  const fetchWorkouts = async () => {
    setLoading(true)
    try {
      const res = await api.get("/admin/workouts/sessions", {
        params: { page, limit: 25 },
      })
      setSessions(res.data.sessions || [])
      setGlobalPrs(res.data.globalPrs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to fetch workouts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [page])

  const formatDuration = (secs: number | null) => {
    if (!secs) return "—"
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Workout Sessions &amp; PR Leaderboard
            </h1>
            <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium font-mono text-muted-foreground">
              {total} Logged Sessions
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time audit log of completed mobile gym workouts and global strength records
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "sessions"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Workout Sessions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prs")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "prs"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Global PRs
          </button>
        </div>
      </div>

      {/* TAB 1: WORKOUT SESSIONS */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Loading workout sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
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

      {/* TAB 2: GLOBAL PR LEADERBOARD */}
      {activeTab === "prs" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Exercise Personal Records
            </h2>
          </div>

          {globalPrs.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              No personal records logged yet. Records update automatically as users log max sets.
            </div>
          ) : (
            <div className="divide-y divide-border/40 font-mono text-xs">
              {globalPrs.map((pr, idx) => {
                const dateStr = new Date(pr.achieved_at).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
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
