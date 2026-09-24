"use client"

import React, { useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts"
import { Flame, Calendar } from "lucide-react"
import { NutritionTimelinePoint, DayOfWeekNutritionPoint, NutritionTargets, NutritionKPIs } from "./types"

interface CaloricBalanceCardProps {
  timeline: NutritionTimelinePoint[]
  dayOfWeek: DayOfWeekNutritionPoint[]
  targets?: NutritionTargets
  kpis: NutritionKPIs
  isAthleteMode: boolean
}

function CalorieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md font-mono space-y-1">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {data.date}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Calories:</span>
        <span className="font-bold text-amber-500">{data.calories.toLocaleString()} kcal</span>
      </div>
      {data.targetCalories && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Goal:</span>
          <span className="text-foreground">{data.targetCalories.toLocaleString()} kcal</span>
        </div>
      )}
      {data.caloriesBurned > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Burned:</span>
          <span className="text-rose-400">-{data.caloriesBurned.toLocaleString()} kcal</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-border/40 font-bold">
        <span className="text-muted-foreground">Net:</span>
        <span className={data.netCalories >= 0 ? "text-emerald-400" : "text-sky-400"}>
          {data.netCalories >= 0 ? `+${data.netCalories}` : data.netCalories} kcal
        </span>
      </div>
    </div>
  )
}

function DowTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2 text-xs shadow-xl backdrop-blur-md font-mono">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {data.day}
      </div>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Average:</span>
          <span className="font-bold text-amber-500">{data.avgMealCalories} kcal/meal</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Meals:</span>
          <span className="text-foreground">{data.mealsCount}</span>
        </div>
      </div>
    </div>
  )
}

export function CaloricBalanceCard({
  timeline,
  dayOfWeek,
  targets,
  kpis,
  isAthleteMode,
}: CaloricBalanceCardProps) {
  const [metricView, setMetricView] = useState<"intake" | "net">("intake")
  const targetCalories = targets?.caloriesTarget || 2200

  const formatShortDate = (d: string) => {
    if (!d) return ""
    const parts = d.split("-")
    if (parts.length < 3) return d
    return `${parts[1]}/${parts[2]}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
      {/* LEFT: Calorie Trend Curve (8 cols) */}
      <div className="lg:col-span-8 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                Calories &amp; Burn
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                Goal: {targetCalories} kcal
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily calories compared to your goal and workout burn
            </p>
          </div>

          {/* Toggle between Gross Intake vs Net Balance */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetricView("intake")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                metricView === "intake"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Total Intake
            </button>
            <button
              type="button"
              onClick={() => setMetricView("net")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                metricView === "net"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Net Calories
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-52 sm:h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {metricView === "intake" ? (
              <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calIntakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
                    <stop offset="80%" stopColor="#F59E0B" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
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
                <Tooltip content={<CalorieTooltip />} />
                {targetCalories > 0 && (
                  <ReferenceLine
                    y={targetCalories}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Goal: ${targetCalories}`,
                      fill: "#10B981",
                      fontSize: 10,
                      position: "top",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#calIntakeGrad)"
                  activeDot={{ r: 4, fill: "#F59E0B", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                <Tooltip content={<CalorieTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.2)" />
                <Bar dataKey="netCalories" radius={[3, 3, 0, 0]}>
                  {timeline.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.netCalories >= targetCalories ? "#F59E0B" : entry.netCalories >= 0 ? "#10B981" : "#38BDF8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer Sub-Bar */}
        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Avg: <strong className="text-amber-500">{kpis.avgCalories} kcal</strong></span>
            <span>Goal: <strong className="text-foreground">{targetCalories} kcal</strong></span>
            <span>Net: <strong className={kpis.avgNetBalance >= 0 ? "text-emerald-400" : "text-sky-400"}>{kpis.avgNetBalance} kcal</strong></span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {kpis.complianceRatePct}% days on target
          </span>
        </div>
      </div>

      {/* RIGHT: Day of Week Pattern (4 cols) */}
      <div className="lg:col-span-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              Daily Average
            </h2>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              By Day
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average calories eaten by day of week
          </p>
        </div>

        <div className="h-44 sm:h-48 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeek} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
              <XAxis dataKey="shortDay" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<DowTooltip />} />
              <Bar dataKey="avgMealCalories" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Logged:</span>
          <span className="text-foreground font-semibold">
            {dayOfWeek.filter((d) => d.mealsCount > 0).length} of 7 days
          </span>
        </div>
      </div>
    </div>
  )
}
