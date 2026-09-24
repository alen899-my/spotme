"use client"

import React from "react"
import {
  Flame,
  Beef,
  Droplet,
  Scale,
  PieChart,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { NutritionKPIs, NutritionTargets } from "./types"

interface NutritionHeroRibbonProps {
  kpis: NutritionKPIs
  targets?: NutritionTargets
  isAthleteMode: boolean
}

export function NutritionHeroRibbon({
  kpis,
  targets,
  isAthleteMode,
}: NutritionHeroRibbonProps) {
  const targetCalories = targets?.caloriesTarget || 2200
  const targetProtein = targets?.proteinTarget || 150
  const targetWaterLiters = targets ? targets.waterTargetMl / 1000 : 3.0

  const calDiff = kpis.avgCalories - targetCalories

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
      {/* 1. Calories */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            Calories
          </span>
          <span className="text-[10px] text-muted-foreground">daily</span>
        </div>

        <div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.avgCalories.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] font-mono">
            {calDiff >= 0 ? (
              <span className="text-amber-500 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                +{calDiff}
              </span>
            ) : (
              <span className="text-sky-400 flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                {calDiff}
              </span>
            )}
            <span className="text-muted-foreground text-[10px]">vs {targetCalories} goal</span>
          </div>
        </div>

        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((kpis.avgCalories / targetCalories) * 100))}%` }}
          />
        </div>
      </div>

      {/* 2. Protein */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Beef className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            Protein
          </span>
          <span className="text-[10px] text-muted-foreground">daily</span>
        </div>

        <div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.avgProtein}g
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] font-mono">
            <span className="font-bold text-emerald-400">
              {kpis.proteinPerKg} g/kg
            </span>
            <span className="text-muted-foreground text-[10px]">body weight</span>
          </div>
        </div>

        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((kpis.avgProtein / targetProtein) * 100))}%` }}
          />
        </div>
      </div>

      {/* 3. Water */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Droplet className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            Water
          </span>
          <span className="text-[10px] text-muted-foreground">daily</span>
        </div>

        <div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-sky-400 font-mono">
            {kpis.avgWaterLiters}L
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[11px]">
            <span className="text-muted-foreground text-[10px]">
              {Math.round((kpis.avgWaterLiters / targetWaterLiters) * 100)}% of {targetWaterLiters}L goal
            </span>
          </div>
        </div>

        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-sky-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((kpis.avgWaterLiters / targetWaterLiters) * 100))}%` }}
          />
        </div>
      </div>

      {/* 4. Net Calories */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            Net
          </span>
          <span className="text-[10px] text-muted-foreground">in − burned</span>
        </div>

        <div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.avgNetBalance >= 0 ? `+${kpis.avgNetBalance}` : kpis.avgNetBalance}
            <span className="text-xs font-normal text-muted-foreground"> kcal</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {kpis.avgNetBalance > 300
              ? "Surplus"
              : kpis.avgNetBalance < -300
              ? "Deficit"
              : "Balanced"}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground">
          Intake minus workout burn
        </div>
      </div>

      {/* 5. Macro Ratio */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <PieChart className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            Macros
          </span>
          <span className="text-[10px] text-muted-foreground">P / C / F</span>
        </div>

        <div>
          <div className="text-sm sm:text-base font-bold tracking-tight text-foreground font-mono">
            <span className="text-emerald-400">{kpis.macroRatio.proteinPct}%</span> /{" "}
            <span className="text-amber-400">{kpis.macroRatio.carbsPct}%</span> /{" "}
            <span className="text-rose-400">{kpis.macroRatio.fatPct}%</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Protein · Carbs · Fat
          </div>
        </div>

        {/* 3-color mini bar */}
        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden flex gap-[1px]">
          <div style={{ width: `${kpis.macroRatio.proteinPct}%` }} className="bg-emerald-400 h-full" />
          <div style={{ width: `${kpis.macroRatio.carbsPct}%` }} className="bg-amber-400 h-full" />
          <div style={{ width: `${kpis.macroRatio.fatPct}%` }} className="bg-rose-400 h-full" />
        </div>
      </div>

      {/* 6. Consistency */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 flex flex-col justify-between hover:border-foreground/20 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80 flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            Consistency
          </span>
          <span className="text-[10px] font-mono text-amber-500 font-semibold">
            {kpis.currentStreak}d streak
          </span>
        </div>

        <div>
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            {kpis.loggedDaysCount}
            <span className="text-xs font-normal text-muted-foreground"> days</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {kpis.complianceRatePct}% goal reached
          </div>
        </div>

        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, kpis.complianceRatePct || 50)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
