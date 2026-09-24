"use client"

import React from "react"
import { Apple, Activity, ShieldAlert, Heart } from "lucide-react"
import { NutritionKPIs } from "./types"

interface MicronutrientHealthCardProps {
  kpis: NutritionKPIs
  isAthleteMode: boolean
}

export function MicronutrientHealthCard({
  kpis,
  isAthleteMode,
}: MicronutrientHealthCardProps) {
  const FIBER_TARGET = 30 // grams/day
  const SUGAR_CEILING = 35 // grams/day
  const SODIUM_CEILING = 2300 // mg/day

  const fiberPct = Math.min(100, Math.round((kpis.avgFiber / FIBER_TARGET) * 100))
  const sugarPct = Math.min(100, Math.round((kpis.avgSugar / SUGAR_CEILING) * 100))
  const sodiumPct = Math.min(100, Math.round((kpis.avgSodium / SODIUM_CEILING) * 100))

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3.5 shadow-xs">
      <div className="border-b border-border/40 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Fiber, Sugar &amp; Sodium
            </h2>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
              Daily Limits
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily intake compared to recommended health limits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Fiber */}
        <div className="rounded-xl border border-border/60 bg-secondary/10 p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Apple className="h-4 w-4 text-emerald-400" />
              Fiber
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Goal: 30g</span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                {kpis.avgFiber}g
              </span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.avgFiber >= 25
                ? "Great for digestion and gut health"
                : "Low fiber — eat more fruits, oats, and vegetables"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${fiberPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>0g</span>
              <span>{fiberPct}% of goal</span>
              <span>30g</span>
            </div>
          </div>
        </div>

        {/* 2. Sugar */}
        <div className="rounded-xl border border-border/60 bg-secondary/10 p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-amber-400" />
              Sugar
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Limit: 35g</span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${kpis.avgSugar > 35 ? "text-rose-500" : "text-amber-400"}`}>
                {kpis.avgSugar}g
              </span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.avgSugar <= 35
                ? "Within healthy daily limits"
                : "High sugar — reduce sugary drinks and sweets"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${kpis.avgSugar > 35 ? "bg-rose-500" : "bg-amber-400"}`}
                style={{ width: `${sugarPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>0g</span>
              <span>{sugarPct}% of limit</span>
              <span>35g</span>
            </div>
          </div>
        </div>

        {/* 3. Sodium */}
        <div className="rounded-xl border border-border/60 bg-secondary/10 p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-sky-400" />
              Sodium
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Limit: 2,300mg</span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-xl sm:text-2xl font-bold ${kpis.avgSodium > 2300 ? "text-rose-500" : "text-sky-400"}`}>
                {kpis.avgSodium.toLocaleString()}mg
              </span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {kpis.avgSodium <= 2300
                ? "Healthy sodium level"
                : "High sodium — drink extra water to stay balanced"}
            </p>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${kpis.avgSodium > 2300 ? "bg-rose-500" : "bg-sky-400"}`}
                style={{ width: `${sodiumPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>0mg</span>
              <span>{sodiumPct}% of limit</span>
              <span>2,300mg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
