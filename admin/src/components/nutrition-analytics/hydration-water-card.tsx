"use client"

import React, { useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts"
import { Droplet, Clock, Sunrise, Sun, Sunset, Moon } from "lucide-react"
import {
  NutritionTimelinePoint,
  CircadianWaterPoint,
  WaterDayPeriod,
  NutritionTargets,
  NutritionKPIs,
} from "./types"

interface HydrationWaterCardProps {
  timeline: NutritionTimelinePoint[]
  circadianWater: CircadianWaterPoint[]
  waterDayPeriods: WaterDayPeriod[]
  targets?: NutritionTargets
  kpis: NutritionKPIs
  isAthleteMode: boolean
}

function WaterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md font-mono space-y-1">
      <div className="font-semibold text-foreground pb-1 border-b border-border/40">
        {data.date}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Water:</span>
        <span className="font-bold text-sky-400">{data.waterMl} ml</span>
      </div>
      {data.workoutWaterLiters > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">In workout:</span>
          <span className="text-emerald-400">+{Math.round(data.workoutWaterLiters * 1000)} ml</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 font-bold">
        <span className="text-muted-foreground">Daily Total:</span>
        <span className="text-sky-400">{data.waterLiters} Liters</span>
      </div>
    </div>
  )
}

function CircadianWaterTooltip({ active, payload }: any) {
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
        <span className="text-muted-foreground">Water:</span>
        <span className="font-bold text-sky-400">{data.waterMl.toLocaleString()} ml</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Logs:</span>
        <span className="text-foreground">{data.logsCount}</span>
      </div>
    </div>
  )
}

export function HydrationWaterCard({
  timeline,
  circadianWater,
  waterDayPeriods,
  targets,
  kpis,
  isAthleteMode,
}: HydrationWaterCardProps) {
  const [hydrationView, setHydrationView] = useState<"daily" | "circadian">("daily")
  const targetWaterLiters = targets ? targets.waterTargetMl / 1000 : 3.0

  const formatShortDate = (d: string) => {
    if (!d) return ""
    const parts = d.split("-")
    if (parts.length < 3) return d
    return `${parts[1]}/${parts[2]}`
  }

  const formatHourTick = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h % 12 === 0 ? 12 : h % 12
    return `${hr} ${ampm}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
      {/* LEFT: Daily Water Logs & Schedule (8 cols) */}
      <div className="lg:col-span-8 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Droplet className="h-4 w-4 text-sky-400" />
                Water Intake
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                Goal: {targetWaterLiters}L / day
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily water total and when you drank it
            </p>
          </div>

          {/* View Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setHydrationView("daily")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                hydrationView === "daily"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Total
            </button>
            <button
              type="button"
              onClick={() => setHydrationView("circadian")}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                hydrationView === "circadian"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By Hour
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-52 sm:h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {hydrationView === "daily" ? (
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
                  unit="L"
                />
                <Tooltip content={<WaterTooltip />} />
                <ReferenceLine
                  y={targetWaterLiters}
                  stroke="#38BDF8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Goal: ${targetWaterLiters}L`,
                    fill: "#38BDF8",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Bar dataKey="waterLiters" radius={[4, 4, 0, 0]}>
                  {timeline.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.waterLiters >= targetWaterLiters ? "#38BDF8" : entry.waterLiters >= targetWaterLiters * 0.7 ? "#0284C7" : "#0369A1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={circadianWater} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
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
                  unit="ml"
                />
                <Tooltip content={<CircadianWaterTooltip />} />
                <Area
                  type="monotone"
                  dataKey="waterMl"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  fill="url(#waterCurveGrad)"
                  activeDot={{ r: 4, fill: "#38BDF8", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer Sub-Bar */}
        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Avg: <strong className="text-sky-400">{kpis.avgWaterLiters} L/day</strong></span>
            <span>Ratio: <strong className="text-foreground">{kpis.fluidCalorieRatio} ml/kcal</strong></span>
          </div>
          <span>Goal met: <strong className="text-emerald-400">{kpis.hydrationHitRatePct}% of days</strong></span>
        </div>
      </div>

      {/* RIGHT: Hydration by Period (4 cols) */}
      <div className="lg:col-span-4 rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
        <div className="border-b border-border/40 pb-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              Time of Day
            </h2>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              Daily Split
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Water intake across different parts of the day
          </p>
        </div>

        {/* 4 Periods Breakdown */}
        <div className="space-y-2.5 my-auto">
          {waterDayPeriods.map((p) => {
            const Icon =
              p.period === "morning"
                ? Sunrise
                : p.period === "afternoon"
                ? Sun
                : p.period === "evening"
                ? Sunset
                : Moon

            return (
              <div key={p.period} className="p-2 rounded-lg border border-border/50 bg-secondary/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 text-sky-400" />
                    {p.label}
                    <span className="text-[10px] font-mono text-muted-foreground font-normal">
                      ({p.timeRange})
                    </span>
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-muted-foreground">{p.amountMl.toLocaleString()} ml</span>
                    <span className="font-bold text-sky-400">{p.pct}%</span>
                  </div>
                </div>

                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, p.pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Daily Goal:</span>
          <span className="text-sky-400 font-bold">{targetWaterLiters} Liters</span>
        </div>
      </div>
    </div>
  )
}
