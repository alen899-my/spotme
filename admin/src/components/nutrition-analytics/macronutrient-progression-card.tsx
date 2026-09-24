"use client"

import React, { useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { Beef, Wheat, Droplets, PieChart, Layers } from "lucide-react"
import { NutritionTimelinePoint, NutritionKPIs, NutritionTargets } from "./types"

interface MacronutrientProgressionCardProps {
  timeline: NutritionTimelinePoint[]
  kpis: NutritionKPIs
  targets?: NutritionTargets
  isAthleteMode: boolean
}

function MacroTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md font-mono space-y-1">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {data.date}
      </div>
      <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
        <span>Protein:</span>
        <span>{data.protein}g ({Math.round(data.protein * 4)} kcal)</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-amber-400 font-bold">
        <span>Carbs:</span>
        <span>{data.carbs}g ({Math.round(data.carbs * 4)} kcal)</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-rose-400 font-bold">
        <span>Fat:</span>
        <span>{data.fat}g ({Math.round(data.fat * 9)} kcal)</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-muted-foreground text-[10px]">
        <span>Total:</span>
        <span>{data.calories} kcal</span>
      </div>
    </div>
  )
}

export function MacronutrientProgressionCard({
  timeline,
  kpis,
  targets,
  isAthleteMode,
}: MacronutrientProgressionCardProps) {
  const [macroFilter, setMacroFilter] = useState<"all" | "protein" | "carbs" | "fat">("all")

  const targetProtein = targets?.proteinTarget || 150
  const targetCarbs = targets?.carbsTarget || 250
  const targetFat = targets?.fatTarget || 65

  const formatShortDate = (d: string) => {
    if (!d) return ""
    const parts = d.split("-")
    if (parts.length < 3) return d
    return `${parts[1]}/${parts[2]}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
      {/* LEFT: Macronutrient Timeline Progression (8 cols) */}
      <div className="lg:col-span-8 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Protein, Carbs &amp; Fat
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                P: {targetProtein}g · C: {targetCarbs}g · F: {targetFat}g
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily grams of each macro
            </p>
          </div>

          {/* Macro View Filter Pills */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5 text-xs self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setMacroFilter("all")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                macroFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setMacroFilter("protein")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                macroFilter === "protein"
                  ? "bg-emerald-500 text-black shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Protein
            </button>
            <button
              type="button"
              onClick={() => setMacroFilter("carbs")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                macroFilter === "carbs"
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Carbs
            </button>
            <button
              type="button"
              onClick={() => setMacroFilter("fat")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                macroFilter === "fat"
                  ? "bg-rose-500 text-black shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fat
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-52 sm:h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="carbsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip content={<MacroTooltip />} />

              {macroFilter === "protein" && targetProtein > 0 && (
                <ReferenceLine
                  y={targetProtein}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  label={{ value: `Goal: ${targetProtein}g`, fill: "#10B981", fontSize: 10, position: "top" }}
                />
              )}

              {(macroFilter === "all" || macroFilter === "carbs") && (
                <Area
                  type="monotone"
                  dataKey="carbs"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#carbsGrad)"
                  name="Carbs (g)"
                />
              )}
              {(macroFilter === "all" || macroFilter === "protein") && (
                <Area
                  type="monotone"
                  dataKey="protein"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#proteinGrad)"
                  name="Protein (g)"
                />
              )}
              {(macroFilter === "all" || macroFilter === "fat") && (
                <Area
                  type="monotone"
                  dataKey="fat"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#fatGrad)"
                  name="Fat (g)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Sub-Bar */}
        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              Protein: <strong>{kpis.avgProtein}g</strong>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
              Carbs: <strong>{kpis.avgCarbs}g</strong>
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />
              Fat: <strong>{kpis.avgFat}g</strong>
            </span>
          </div>
          <span>Density: <strong className="text-foreground">{kpis.proteinDensity}g / 100 kcal</strong></span>
        </div>
      </div>

      {/* RIGHT: Energy Contribution (4 cols) */}
      <div className="lg:col-span-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-400" />
              Calorie Split
            </h2>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Breakdown
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where your daily calories come from
          </p>
        </div>

        {/* 3 Macro Breakdown Cards */}
        <div className="space-y-2.5 my-auto text-xs">
          {/* Protein */}
          <div className="p-2.5 rounded-lg border border-border/50 bg-secondary/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Beef className="h-3.5 w-3.5" />
                Protein
              </span>
              <span className="font-bold text-foreground font-mono">{kpis.macroRatio.proteinPct}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.macroRatio.proteinPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{Math.round(kpis.avgProtein * 4)} kcal/day</span>
              <span>Goal: {targetProtein}g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="p-2.5 rounded-lg border border-border/50 bg-secondary/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Wheat className="h-3.5 w-3.5" />
                Carbohydrates
              </span>
              <span className="font-bold text-foreground font-mono">{kpis.macroRatio.carbsPct}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.macroRatio.carbsPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{Math.round(kpis.avgCarbs * 4)} kcal/day</span>
              <span>Goal: {targetCarbs}g</span>
            </div>
          </div>

          {/* Fat */}
          <div className="p-2.5 rounded-lg border border-border/50 bg-secondary/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" />
                Fat
              </span>
              <span className="font-bold text-foreground font-mono">{kpis.macroRatio.fatPct}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-rose-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.macroRatio.fatPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>{Math.round(kpis.avgFat * 9)} kcal/day</span>
              <span>Goal: {targetFat}g</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Protein per kg:</span>
          <span className="text-emerald-400 font-bold">
            {kpis.proteinPerKg} g/kg
          </span>
        </div>
      </div>
    </div>
  )
}
