"use client"

import React from "react"
import { Clock, Hourglass, Zap, Timer, Gauge } from "lucide-react"
import { WorkoutKPIs } from "./types"

interface DurationPacingCardProps {
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

export function DurationPacingCard({ kpis }: DurationPacingCardProps) {
  const activePct =
    kpis.totalDurationMinutes > 0
      ? Math.round((kpis.activeDurationMinutes / kpis.totalDurationMinutes) * 100)
      : 70
  const restPct = Math.max(0, 100 - activePct)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            Workout Time &amp; Rest
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active lifting time vs rest time between sets
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded bg-indigo-500/10 text-indigo-400 px-2 py-0.5 border border-indigo-500/20">
            {kpis.avgDurationMinutes} mins avg / workout
          </span>
        </div>
      </div>

      {/* Main 4 Pacing Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Active vs Rest Ratio */}
        <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Hourglass className="h-3.5 w-3.5 text-sky-400" />
              Active vs Rest Time
            </span>
            <span className="font-mono font-bold text-foreground">{activePct}% Active</span>
          </div>

          {/* Dual Bar */}
          <div className="h-2 w-full rounded-full overflow-hidden flex bg-border/40">
            <div className="bg-sky-500 h-full" style={{ width: `${activePct}%` }} title={`Active: ${activePct}%`} />
            <div className="bg-indigo-400/80 h-full" style={{ width: `${restPct}%` }} title={`Rest: ${restPct}%`} />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1">
            <span>{kpis.activeDurationMinutes}m active lifting</span>
            <span>{kpis.totalRestMinutes}m rest</span>
          </div>
        </div>

        {/* 2. Rest Time Compliance Per Set */}
        <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-amber-500" />
              Avg Rest Between Sets
            </span>
            <span className="font-mono font-bold text-amber-500">{kpis.avgRestPerSetSec}s</span>
          </div>

          <div className="text-[11px] text-muted-foreground leading-tight">
            Typical target: <span className="text-foreground font-mono">60s - 90s</span>
          </div>

          <div className="text-[10px] font-mono pt-1 text-emerald-400 flex items-center gap-1">
            <span>{kpis.avgRestPerSetSec <= 90 ? "✓ Good rest pacing" : "Notice: Longer rest periods"}</span>
          </div>
        </div>

        {/* 3. Training Density */}
        <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Lifting Rate
            </span>
            <span className="font-mono font-bold text-emerald-400">{kpis.trainingDensityKgMin}</span>
          </div>

          <div className="text-[11px] text-muted-foreground leading-tight">
            Kilograms lifted per active minute
          </div>

          <div className="text-[10px] font-mono pt-1 text-muted-foreground">
            Total active time: <span className="text-foreground">{kpis.activeDurationMinutes} mins</span>
          </div>
        </div>

        {/* 4. Time Under Tension (TUT) */}
        <div className="p-3.5 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-purple-400" />
              Total Lifting Time
            </span>
            <span className="font-mono font-bold text-purple-400">{kpis.totalTutMinutes} mins</span>
          </div>

          <div className="text-[11px] text-muted-foreground leading-tight">
            Time spent performing exercise sets
          </div>

          <div className="text-[10px] font-mono pt-1 text-muted-foreground">
            Avg per set: <span className="text-foreground">~{kpis.totalSets > 0 ? Math.round((kpis.totalTutMinutes * 60) / kpis.totalSets) : 0}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
