"use client"

import React from "react"
import {
  Dumbbell,
  Flame,
  Clock,
  Trophy,
  Target,
  Layers,
} from "lucide-react"
import { WorkoutKPIs } from "./types"

interface KpiHeroRibbonProps {
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

export function KpiHeroRibbon({ kpis }: KpiHeroRibbonProps) {
  const formatVolume = (kg: number) => {
    if (kg >= 1000000) return `${(kg / 1000000).toFixed(2)}M kg`
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`
    return `${kg.toLocaleString()} kg`
  }

  const formatHours = (mins: number) => {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    if (hrs === 0) return `${remMins}m`
    return `${hrs}h ${remMins}m`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. TOTAL VOLUME */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Total Volume
          </span>
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Dumbbell className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatVolume(kpis.totalVolumeKg)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Avg / workout</span>
          <span className="text-foreground font-medium">{kpis.avgVolumeKg.toLocaleString()} kg</span>
        </div>
      </div>

      {/* 2. WORKOUTS COMPLETED */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-sky-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Workouts Completed
          </span>
          <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Target className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {kpis.completedWorkouts}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            / {kpis.totalWorkouts} total
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Completion rate</span>
          <span className="text-emerald-500 font-semibold">{kpis.completionRate}%</span>
        </div>
      </div>

      {/* 3. AVERAGE SESSION DURATION */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-indigo-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Avg Duration
          </span>
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {kpis.avgDurationMinutes}
          </span>
          <span className="text-xs font-mono text-muted-foreground">mins</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Total time</span>
          <span className="text-foreground font-medium">{formatHours(kpis.totalDurationMinutes)}</span>
        </div>
      </div>

      {/* 4. PERSONAL RECORDS (PRS) */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-amber-400/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            PRs Hit
          </span>
          <div className="h-7 w-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Trophy className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-500">
            {kpis.totalPrsHit}
          </span>
          <span className="text-xs font-mono text-muted-foreground">records</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Exercises used</span>
          <span className="text-foreground font-medium">{kpis.uniqueExercisesCount}</span>
        </div>
      </div>

      {/* 5. CALORIES */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-rose-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Calories Burned
          </span>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <Flame className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {kpis.totalCaloriesBurned > 1000
              ? `${(kpis.totalCaloriesBurned / 1000).toFixed(1)}k`
              : kpis.totalCaloriesBurned.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-muted-foreground">kcal</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Burn rate</span>
          <span className="text-foreground font-medium">{kpis.calorieBurnRateKcalMin} kcal/min</span>
        </div>
      </div>

      {/* 6. WORKING SETS */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Total Sets
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Layers className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
            {kpis.totalSets.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-muted-foreground">sets</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Total reps</span>
          <span className="text-foreground font-medium">{kpis.totalReps.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
