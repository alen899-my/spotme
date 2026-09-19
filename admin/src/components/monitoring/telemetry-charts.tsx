"use client"

import React, { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Activity, Cpu, HardDrive, Clock, Radio, Server } from "lucide-react"
import { RollingSecondBucket, SystemMetrics, HistoricalBucket } from "./types"

interface TelemetryChartsProps {
  rollingData: RollingSecondBucket[]
  historyData?: HistoricalBucket[]
  system: SystemMetrics | null
}

function NotionChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover/95 p-2.5 text-xs shadow-md backdrop-blur-sm">
      <div className="text-[11px] font-mono text-muted-foreground pb-1 border-b border-border/40">
        {data.displayLabel || data.time || "Recent timestamp"}
      </div>
      <div className="mt-1.5 space-y-1 font-mono text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Throughput:
          </span>
          <span className="font-semibold text-foreground">
            {data.rps !== undefined ? data.rps : data.requests} req/s
          </span>
        </div>
        {(data.errors > 0 || data.errorRate > 0) && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Errors:
            </span>
            <span className="font-semibold text-rose-500">{data.errors}</span>
          </div>
        )}
        {data.avgLatency > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Avg Latency:
            </span>
            <span className="font-medium text-foreground">{data.avgLatency}ms</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TelemetryCharts({
  rollingData = [],
  historyData = [],
  system,
}: TelemetryChartsProps) {
  const [mounted, setMounted] = useState(false)
  const [chartView, setChartView] = useState<"live" | "history">("live")

  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Prepare 60 data points for live rolling
  const rawData =
    rollingData.length > 0
      ? rollingData
      : Array.from({ length: 60 }, (_, i) => ({
          time: "",
          timestamp: Date.now() - (60 - i) * 1000,
          rps: 0,
          errors: 0,
          avgLatency: 0,
        }))

  interface ChartPoint {
    time: string
    timestamp: number
    displayTime: string
    displayLabel: string
    rps: number
    errors: number
    avgLatency: number
  }

  const liveChartData: ChartPoint[] = rawData.map((d, idx) => {
    const secsAgo = rawData.length - 1 - idx
    const displayLabel = secsAgo === 0 ? "Now" : `${secsAgo}s ago`
    const displayTime =
      secsAgo === 0 ? "now" : secsAgo % 15 === 0 ? `-${secsAgo}s` : ""
    return {
      time: d.time || displayTime,
      timestamp: d.timestamp,
      displayLabel,
      displayTime,
      rps: d.rps,
      errors: d.errors,
      avgLatency: d.avgLatency,
    }
  })

  // 2. Prepare 24-hour historical data points
  const histChartData: ChartPoint[] = (historyData.length > 0
    ? historyData
    : Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (24 - i) * 3600000).toISOString(),
        requests: 0,
        errors: 0,
        totalDuration: 0,
        avgLatency: 0,
      }))
  ).map((d) => {
    const date = new Date(d.timestamp)
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return {
      time: timeStr,
      timestamp: date.getTime(),
      displayTime: timeStr,
      displayLabel: `${date.toLocaleDateString()} ${timeStr}`,
      rps: Math.round((d.requests / 300) * 10) / 10, // 5-minute bucket normalized to req/s
      errors: d.errors || 0,
      avgLatency: d.avgLatency || 0,
    }
  })

  const currentDataset: ChartPoint[] = chartView === "live" ? liveChartData : histChartData
  const maxRps = Math.max(5, ...currentDataset.map((d) => d.rps || 0))

  // System Host Metrics
  const cpuPercent = system ? system.cpu.estimatedUsagePercent : 0
  const heapUsed = system ? system.memory.heapUsedMb : 0
  const heapTotal = system ? system.memory.heapTotalMb : 1
  const heapLimit = system?.memory.heapLimitMb || Math.round(heapTotal * 1.5)
  const heapPercent = Math.min(100, Math.round((heapUsed / heapTotal) * 100))
  const systemRamPercent = system ? system.memory.systemUsedPercent : 0
  const eventLoopLag = system ? system.eventLoop.lagMs : 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Real-Time / 24h Throughput & Latency Chart */}
      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-foreground">
                {chartView === "live" ? "Live Throughput & Latency Pulse" : "24-Hour Historical Activity"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {chartView === "live"
                ? "Rolling 60-second real-time request volume & latency curve"
                : "Aggregated 5-minute intervals over the last 24 hours"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Live vs 24h */}
            <div className="flex items-center rounded-lg border bg-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setChartView("live")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  chartView === "live"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Live (60s)
              </button>
              <button
                type="button"
                onClick={() => setChartView("history")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  chartView === "history"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                24h Trend
              </button>
            </div>

            {/* Legend Pills */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-muted-foreground pl-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Throughput
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Errors
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Container with explicit height to guarantee rendering */}
        <div className="w-full mt-3 min-h-[220px] h-[220px]">
          {mounted ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={currentDataset}
                margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="notionThroughputGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="notionErrorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayTime"
                  stroke="none"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="rps"
                  stroke="none"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, maxRps]}
                  width={32}
                />
                <YAxis
                  yAxisId="errors"
                  orientation="right"
                  hide
                  domain={[0, 10]}
                />
                <Tooltip content={<NotionChartTooltip />} />
                <Area
                  yAxisId="rps"
                  type="monotone"
                  dataKey="rps"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fill="url(#notionThroughputGradient)"
                  isAnimationActive={false}
                  dot={false}
                />
                <Line
                  yAxisId="errors"
                  type="monotone"
                  dataKey="errors"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: "#f43f5e" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Initialising telemetry canvas...
            </div>
          )}
        </div>

        <div className="flex justify-between px-1 pt-2.5 text-[11px] font-mono text-muted-foreground border-t border-border/40 mt-2">
          <span>{chartView === "live" ? "60s ago" : "24h ago"}</span>
          <span>{chartView === "live" ? "30s ago" : "12h ago"}</span>
          <span>Now (Real-time)</span>
        </div>
      </div>

      {/* 2. Host Resources & Saturation */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <Cpu className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Host Saturation</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Compute, memory pressure, and event loop metrics
          </p>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* CPU Utilization */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                CPU Utilization
              </span>
              <span className="font-mono font-medium text-foreground">
                {cpuPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  cpuPercent > 80
                    ? "bg-rose-500"
                    : cpuPercent > 50
                    ? "bg-amber-500"
                    : "bg-foreground"
                }`}
                style={{ width: `${Math.max(3, Math.min(100, cpuPercent))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Load: {system ? `${system.cpu.load1m} (1m)` : "0"}</span>
              <span>{system?.cpu.cores || 1} vCPU Cores</span>
            </div>
          </div>

          {/* V8 Heap Memory */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                V8 Heap Memory
              </span>
              <span className="font-mono font-medium text-foreground">
                {heapUsed} / {heapTotal} MB ({heapPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300"
                style={{ width: `${Math.max(3, heapPercent)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>RSS: {system?.memory.rssMb || 0} MB</span>
              <span>Limit: {heapLimit} MB</span>
            </div>
          </div>

          {/* System RAM */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                Total System RAM
              </span>
              <span className="font-mono font-medium text-foreground">
                {systemRamPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300"
                style={{ width: `${Math.max(3, systemRamPercent)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Total: {system?.memory.systemTotalMb || 0} MB</span>
              <span>Free: {system?.memory.systemFreeMb || 0} MB</span>
            </div>
          </div>

          {/* Event Loop Delay */}
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                Event Loop Delay
              </span>
              <span
                className={`font-mono font-semibold ${
                  eventLoopLag > 50
                    ? "text-rose-500"
                    : eventLoopLag > 15
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
              >
                {eventLoopLag} ms
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {eventLoopLag < 20
                ? "Main execution thread is responsive and healthy."
                : "Synchronous blocking detected in process loop."}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-border/40 pt-2 text-right">
          <span className="text-[10px] text-muted-foreground font-mono">
            Node {system?.process.nodeVersion || "v20"} · {system?.process.platform || "linux"} ({system?.process.arch || "x64"})
          </span>
        </div>
      </div>
    </div>
  )
}
