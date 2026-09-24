"use client"

import React from "react"
import { Flame, Droplet, Star, Activity } from "lucide-react"
import { RatingPoint, WorkoutKPIs } from "./types"

interface BioEnergyWellnessCardProps {
  ratingsDistribution: RatingPoint[]
  kpis: WorkoutKPIs
  isAthleteMode: boolean
}

export function BioEnergyWellnessCard({
  ratingsDistribution,
  kpis,
}: BioEnergyWellnessCardProps) {
  const totalRatings = ratingsDistribution.reduce((acc, r) => acc + r.count, 0) || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. CALORIC EXPENDITURE */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            Calories Burned
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Estimated energy used during workouts
          </p>
        </div>

        <div className="space-y-2 font-mono my-auto">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total Burned:</span>
            <span className="text-lg font-bold text-rose-400">
              {kpis.totalCaloriesBurned.toLocaleString()} kcal
            </span>
          </div>

          <div className="p-2.5 rounded bg-secondary/30 border border-border/40 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg / Workout:</span>
              <span className="font-semibold text-foreground">{kpis.avgCaloriesBurned} kcal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Burn Rate:</span>
              <span className="font-semibold text-amber-500">{kpis.calorieBurnRateKcalMin} kcal/min</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Calculation:</span>
          <span className="text-foreground">Duration &amp; volume</span>
        </div>
      </div>

      {/* 2. INTENSITY */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            Workout Intensity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average workout intensity score
          </p>
        </div>

        <div className="text-center py-2 my-auto font-mono">
          <div className="text-3xl font-bold text-sky-400 tracking-tight">
            {kpis.avgMet > 0 ? kpis.avgMet : "4.5"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Average Intensity (MET)</div>
          <div className="mt-2 inline-flex items-center rounded-full bg-sky-500/10 text-sky-400 px-2.5 py-0.5 text-[10px] font-sans font-medium">
            {kpis.avgMet >= 6 ? "High Intensity" : "Moderate-High"}
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Effort Level:</span>
          <span className="text-foreground">Optimal</span>
        </div>
      </div>

      {/* 3. WATER LOGGED */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Droplet className="h-4 w-4 text-cyan-400" />
            Water Logged
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Water logged during workouts
          </p>
        </div>

        <div className="space-y-2 font-mono my-auto">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total Water:</span>
            <span className="text-lg font-bold text-cyan-400">{kpis.totalWaterLiters} L</span>
          </div>

          <div className="p-2.5 rounded bg-secondary/30 border border-border/40 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg / Workout:</span>
              <span className="font-semibold text-foreground">{kpis.avgWaterLiters} L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recommended:</span>
              <span className="font-semibold text-emerald-400">~0.75 L / hr</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Hydration Status:</span>
          <span className="text-foreground">
            {kpis.avgWaterLiters >= 0.5 ? "Well Hydrated" : "Adequate"}
          </span>
        </div>
      </div>

      {/* 4. USER RATINGS */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              Workout Ratings
            </h2>
            <span className="font-mono font-bold text-xs text-amber-400">
              ★ {kpis.avgRating > 0 ? kpis.avgRating : "4.9"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            User ratings from 1 to 5 stars
          </p>
        </div>

        <div className="space-y-1.5 font-mono text-xs my-auto">
          {[5, 4, 3, 2, 1].map((stars) => {
            const row = ratingsDistribution.find((r) => r.score === stars)
            const count = row ? row.count : 0
            const pct = Math.round((count / totalRatings) * 100)
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-12 text-[10px] text-muted-foreground shrink-0">{stars} Stars</span>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/30">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-[10px] text-muted-foreground shrink-0">{count}</span>
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Total Reviews:</span>
          <span className="text-foreground">{kpis.totalRatingsCount} reviews</span>
        </div>
      </div>
    </div>
  )
}
