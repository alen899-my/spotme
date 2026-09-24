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
  Cell,
} from "recharts"
import { Clock, Sunrise, Sun, Sunset, Moon, Utensils, MoonStar } from "lucide-react"
import { CircadianMealPoint, MealTypeDistributionPoint, NutritionKPIs } from "./types"

interface CircadianMealTimingCardProps {
  circadianMeals: CircadianMealPoint[]
  mealTypes: MealTypeDistributionPoint[]
  kpis: NutritionKPIs
  isAthleteMode: boolean
}

function CircadianMealTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  const hour = data.hour
  const nextHour = (hour + 1) % 24
  const startStr = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? "PM" : "AM"}`
  const endStr = `${nextHour % 12 === 0 ? 12 : nextHour % 12}:00 ${nextHour >= 12 ? "PM" : "AM"}`

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2 text-xs shadow-xl backdrop-blur-md font-mono space-y-1">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {startStr} – {endStr}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Calories:</span>
        <span className="font-bold text-amber-500">{data.calories.toLocaleString()} kcal</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Meals:</span>
        <span className="text-foreground">{data.count}</span>
      </div>
      {hour >= 21 && (
        <div className="text-[10px] text-purple-400 font-medium pt-0.5">
          🌙 Late meal
        </div>
      )}
    </div>
  )
}

export function CircadianMealTimingCard({
  circadianMeals,
  mealTypes,
  kpis,
  isAthleteMode,
}: CircadianMealTimingCardProps) {
  const [chartType, setChartType] = useState<"curve" | "bars">("curve")

  const formatHourTick = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h % 12 === 0 ? 12 : h % 12
    return `${hr} ${ampm}`
  }

  const peakHour = [...circadianMeals].sort((a, b) => b.calories - a.calories)[0] || { hour: 13, label: "1 PM" }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
      {/* LEFT: 24-Hour Meal Timing Graph (8 cols) */}
      <div className="lg:col-span-8 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Meal Times
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                Peak: {peakHour.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              When calories are eaten throughout the day
            </p>
          </div>

          {/* View Switcher: Curve vs Bars */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType("curve")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                chartType === "curve"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Curve
            </button>
            <button
              type="button"
              onClick={() => setChartType("bars")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                chartType === "bars"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bars
            </button>
          </div>
        </div>

        {/* 24h Graph */}
        <div className="h-48 sm:h-52 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "curve" ? (
              <AreaChart data={circadianMeals} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mealCircadianGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  ticks={[0, 4, 8, 12, 16, 20]}
                  tickFormatter={formatHourTick}
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
                <Tooltip content={<CircadianMealTooltip />} />
                <Area
                  type="monotone"
                  dataKey="calories"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#mealCircadianGrad)"
                  activeDot={{ r: 4, fill: "#F59E0B", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={circadianMeals} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  ticks={[0, 4, 8, 12, 16, 20]}
                  tickFormatter={formatHourTick}
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
                <Tooltip content={<CircadianMealTooltip />} />
                <Bar dataKey="calories" radius={[3, 3, 0, 0]}>
                  {circadianMeals.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hour >= 21 ? "#C084FC" : entry.calories > 0 ? "#F59E0B" : "rgba(255,255,255,0.06)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer Sub-Bar */}
        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div>
            <span>Eating window: <strong className="text-foreground">~{kpis.feedingWindowHours} hrs</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <MoonStar className="h-3.5 w-3.5 text-purple-400" />
            <span>Late meals: <strong className={kpis.lateNightIndexPct > 25 ? "text-purple-400" : "text-foreground"}>{kpis.lateNightIndexPct}% after 8:30 PM</strong></span>
          </div>
        </div>
      </div>

      {/* RIGHT: Meal Type Distribution (Breakfast, Lunch, Dinner, Snack) (4 cols) */}
      <div className="lg:col-span-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              Meals &amp; Snacks
            </h2>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Types
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calories and logs by meal type
          </p>
        </div>

        {/* Meal Types List */}
        <div className="space-y-2 my-auto">
          {mealTypes.map((m) => {
            const Icon =
              m.mealType.toLowerCase() === "breakfast"
                ? Sunrise
                : m.mealType.toLowerCase() === "lunch"
                ? Sun
                : m.mealType.toLowerCase() === "dinner"
                ? Sunset
                : Moon

            const iconColor =
              m.mealType.toLowerCase() === "breakfast"
                ? "text-amber-400"
                : m.mealType.toLowerCase() === "lunch"
                ? "text-sky-400"
                : m.mealType.toLowerCase() === "dinner"
                ? "text-purple-400"
                : "text-emerald-400"

            return (
              <div key={m.mealType} className="p-2 rounded-lg border border-border/50 bg-secondary/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                    {m.mealType}
                    <span className="text-[10px] font-mono text-muted-foreground font-normal">
                      ({m.count})
                    </span>
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-muted-foreground">{m.calories.toLocaleString()} kcal</span>
                    <span className="font-bold text-foreground">{m.pct}%</span>
                  </div>
                </div>

                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, m.pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-0.5">
                  <span>P: {m.protein}g</span>
                  <span>C: {m.carbs}g</span>
                  <span>F: {m.fat}g</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Total:</span>
          <span className="text-foreground font-semibold">
            {mealTypes.reduce((acc, m) => acc + m.count, 0)} meals logged
          </span>
        </div>
      </div>
    </div>
  )
}
