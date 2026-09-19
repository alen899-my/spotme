"use client"

import React, { useEffect, useState } from "react"
import {
  Compass,
  Users,
  CheckCircle2,
  TrendingDown,
  Target,
  Dumbbell,
  PieChart,
  Salad,
  Activity,
} from "lucide-react"
import api from "@/lib/api"

interface FunnelStep {
  step: number
  name: string
  count: number
  pct: number
}

interface CategoryCount {
  goal?: string
  level?: string
  gender?: string
  diet?: string
  count: number
}

interface OnboardingData {
  totalUsers: number
  completedOnboarding: number
  completionRate: number
  funnel: FunnelStep[]
  goals: CategoryCount[]
  experience: CategoryCount[]
  gender: CategoryCount[]
  diet: CategoryCount[]
}

export default function OnboardingAnalyticsPage() {
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<OnboardingData>("/admin/onboarding/analytics")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to fetch onboarding analytics:", err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground font-mono">
        Loading onboarding funnel &amp; demographic intelligence...
      </div>
    )
  }

  const funnel = data?.funnel || []
  const total = data?.totalUsers || 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Onboarding Funnel &amp; Demographics
            </h1>
            <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium font-mono text-muted-foreground">
              {data?.completionRate || 0}% Completion Rate
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Step-by-step conversion tracking through the 10-step mobile onboarding experience
          </p>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Registered</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-foreground">{data?.totalUsers || 0}</span>
            <span className="text-xs text-muted-foreground">users</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">All registered mobile accounts</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Onboarding Completed</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-500">
              {data?.completedOnboarding || 0}
            </span>
            <span className="text-xs text-muted-foreground">({data?.completionRate || 0}%)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Finished all profiling steps</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Top Goal</span>
          <div className="mt-2">
            <span className="text-lg font-bold text-foreground truncate block">
              {data?.goals?.[0]?.goal || "Muscle Gain"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data?.goals?.[0]?.count || 0} athletes registered
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground">Primary Experience</span>
          <div className="mt-2">
            <span className="text-lg font-bold text-foreground truncate block capitalize">
              {data?.experience?.[0]?.level || "Beginner"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data?.experience?.[0]?.count || 0} athletes registered
          </p>
        </div>
      </div>

      {/* Step-by-Step Funnel Matrix */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Step-by-Step Funnel Conversion
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            10-Step Mobile Sequence
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {funnel.map((step, idx) => {
            const dropoff = idx > 0 ? funnel[idx - 1].count - step.count : 0
            const dropoffPct = idx > 0 && funnel[idx - 1].count > 0
              ? Math.round((dropoff / funnel[idx - 1].count) * 100)
              : 0

            return (
              <div key={step.step} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded bg-secondary border border-border flex items-center justify-center font-mono font-bold text-[10px] text-foreground">
                      {step.step}
                    </span>
                    <span className="font-medium text-foreground">{step.name}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    {idx > 0 && dropoff > 0 && (
                      <span className="hidden sm:inline text-[10px] text-rose-500">
                        -{dropoff} ({dropoffPct}% drop)
                      </span>
                    )}
                    <span className="text-muted-foreground">{step.count} users</span>
                    <span className="font-bold text-foreground w-12 text-right">
                      {step.pct}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      step.pct >= 75
                        ? "bg-emerald-500"
                        : step.pct >= 50
                        ? "bg-sky-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.max(3, step.pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2x2 Demographic Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Goals */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Target className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Primary Fitness Goals</h2>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            {(data?.goals || []).map((g) => {
              const pct = Math.round(((g.count || 0) / total) * 100)
              return (
                <div key={g.goal} className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-foreground font-medium capitalize">{g.goal}</span>
                    <span className="font-mono">{g.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Experience Levels */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Dumbbell className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-foreground">Gym Experience Levels</h2>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            {(data?.experience || []).map((e) => {
              const pct = Math.round(((e.count || 0) / total) * 100)
              return (
                <div key={e.level} className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-foreground font-medium capitalize">{e.level}</span>
                    <span className="font-mono">{e.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Diet Types */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Salad className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Dietary Preferences</h2>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            {(data?.diet || []).map((d) => {
              const pct = Math.round(((d.count || 0) / total) * 100)
              return (
                <div key={d.diet} className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-foreground font-medium capitalize">{d.diet}</span>
                    <span className="font-mono">{d.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Users className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Gender Demographics</h2>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            {(data?.gender || []).map((g) => {
              const pct = Math.round(((g.count || 0) / total) * 100)
              return (
                <div key={g.gender} className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-foreground font-medium capitalize">{g.gender}</span>
                    <span className="font-mono">{g.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
