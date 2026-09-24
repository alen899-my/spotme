"use client"

import React from "react"
import { Repeat, AlertCircle } from "lucide-react"
import { RepSchemes, SkippedExercisePoint, WorkoutKPIs } from "./types"

interface SetsRepsSchemesCardProps {
  repSchemes: RepSchemes
  skippedExercises: SkippedExercisePoint[]
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

export function SetsRepsSchemesCard({
  repSchemes,
  skippedExercises,
  kpis,
}: SetsRepsSchemesCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT 2 COLS: Rep Range Schemes */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Repeat className="h-4 w-4 text-emerald-400" />
              Reps &amp; Sets Breakdown
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Heavy sets (1–5 reps), muscle building (6–12 reps), and endurance (13+ reps)
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-secondary border border-border px-2 py-0.5 text-muted-foreground">
              {kpis.totalReps.toLocaleString()} Total Reps
            </span>
          </div>
        </div>

        {/* 3 Rep Scheme Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. POWER (1-5 REPS) */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Heavy (1–5 Reps)</span>
              <span className="text-xs font-mono font-bold text-amber-500">{repSchemes.powerPct}%</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Strength focus</div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/40">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${repSchemes.powerPct}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground pt-0.5">
              {repSchemes.powerCount} sets
            </div>
          </div>

          {/* 2. HYPERTROPHY (6-12 REPS) */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Moderate (6–12 Reps)</span>
              <span className="text-xs font-mono font-bold text-sky-400">{repSchemes.hypertrophyPct}%</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Muscle building</div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/40">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${repSchemes.hypertrophyPct}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground pt-0.5">
              {repSchemes.hypertrophyCount} sets
            </div>
          </div>

          {/* 3. MUSCULAR ENDURANCE (13+ REPS) */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">High Reps (13+ Reps)</span>
              <span className="text-xs font-mono font-bold text-purple-400">{repSchemes.endurancePct}%</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Stamina &amp; endurance</div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/40">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${repSchemes.endurancePct}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground pt-0.5">
              {repSchemes.enduranceCount} sets
            </div>
          </div>
        </div>

        {/* Set Execution Depth Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/40 text-xs font-mono">
          <div className="p-2.5 rounded bg-secondary/20 border border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase block">Avg Reps / Set</span>
            <span className="text-sm font-bold text-foreground">{kpis.avgRepsPerSet} reps</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/20 border border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase block">Avg Weight / Set</span>
            <span className="text-sm font-bold text-foreground">{kpis.avgWeightPerSetKg} kg</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/20 border border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase block">Avg Sets / Exercise</span>
            <span className="text-sm font-bold text-foreground">{kpis.avgTargetSets} sets</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/20 border border-border/30">
            <span className="text-[10px] text-muted-foreground uppercase block">Exercises Logged</span>
            <span className="text-sm font-bold text-sky-400">{kpis.totalExercisesPerformed}</span>
          </div>
        </div>
      </div>

      {/* RIGHT COL: Skipped Exercises */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Skipped Exercises
            </h2>
            <span className="rounded bg-rose-500/10 text-rose-500 px-1.5 py-0.2 text-[10px] font-mono">
              {kpis.skippedExercisesCount} Skipped
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Exercises marked skipped during workouts
          </p>
        </div>

        <div className="space-y-2 flex-1 my-auto">
          {skippedExercises.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              ✓ No exercises were skipped.
            </div>
          ) : (
            skippedExercises.map((ex, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate capitalize">{ex.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize font-mono">
                    {ex.bodyPart} • {ex.totalScheduledCount} scheduled
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <span className="text-rose-400 font-bold">{ex.skippedCount}x</span>
                  <span className="text-[10px] text-muted-foreground block">{ex.skipRatePct}% skip</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Exercise Completion:</span>
          <span className="text-emerald-400 font-semibold">
            {kpis.totalExercisesPerformed > 0
              ? `${Math.round(((kpis.totalExercisesPerformed - kpis.skippedExercisesCount) / kpis.totalExercisesPerformed) * 100)}%`
              : "100%"}
          </span>
        </div>
      </div>
    </div>
  )
}
