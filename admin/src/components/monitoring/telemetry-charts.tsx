"use client"

import React, { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Activity, Cpu, HardDrive, Radio } from "lucide-react"
import { RollingSecondBucket, SystemMetrics } from "./types"

interface TelemetryChartsProps {
  rollingData: RollingSecondBucket[]
  system: SystemMetrics | null
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="rounded-md border bg-popover/95 p-2 text-xs shadow-md backdrop-blur-sm">
      <div className="text-[11px] font-mono text-muted-foreground">{data.time || "Recent"}</div>
      <div className="mt-1 flex items-center justify-between gap-4 font-mono">
        <span className="flex items-center gap-1.5 text-sky-400">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          Throughput:
        </span>
        <span className="font-semibold text-foreground">{data.rps} req/s</span>
      </div>
      {data.errors > 0 && (
        <div className="mt-1 flex items-center justify-between gap-4 font-mono">
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Errors:
          </span>
          <span className="font-bold text-rose-400">{data.errors}</span>
        </div>
      )}
      {data.avgLatency > 0 && (
        <div className="mt-1 flex items-center justify-between gap-4 font-mono text-muted-foreground">
          <span>Latency:</span>
          <span className="text-foreground">{data.avgLatency}ms</span>
        </div>
      )}
    </div>
  )
}

export function TelemetryCharts({ rollingData, system }: TelemetryChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prepare 60 data points
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

  const chartData = rawData.map((d, idx) => {
    // Relative seconds label for X-axis
    const secsAgo = rawData.length - 1 - idx
    const displayTime =
      secsAgo === 0 ? "now" : secsAgo % 15 === 0 ? `-${secsAgo}s` : ""
    return {
      ...d,
      displayTime,
    }
  })

  const maxRps = Math.max(5, ...chartData.map((d) => d.rps))
  const maxErrors = Math.max(2, ...chartData.map((d) => d.errors))

  // System CPU & Memory
  const cpuPercent = system ? system.cpu.estimatedUsagePercent : 0
  const heapUsed = system ? system.memory.heapUsedMb : 0
  const heapTotal = system ? system.memory.heapTotalMb : 1
  const heapPercent = Math.min(100, Math.round((heapUsed / heapTotal) * 100))
  const systemRamPercent = system ? system.memory.systemUsedPercent : 0
  const eventLoopLag = system ? system.eventLoop.lagMs : 0

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Rolling Throughput & Error Spikes Rechart */}
      <div className="rounded-lg border bg-card p-4 lg:col-span-2 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-500" />
              Throughput & Error Spikes
            </h3>
            <p className="text-xs text-muted-foreground">
              Rolling 60-second real-time volume and error rate
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Requests/s
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Error Spike
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-48 w-full mt-2">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rpsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayTime"
                  stroke="none"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  yAxisId="rps"
                  stroke="none"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, maxRps]}
                  width={30}
                />
                <YAxis
                  yAxisId="errors"
                  orientation="right"
                  hide
                  domain={[0, maxErrors]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="rps"
                  type="monotone"
                  dataKey="rps"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  fill="url(#rpsArea)"
                  isAnimationActive={false}
                  dot={false}
                />
                <Bar
                  yAxisId="errors"
                  dataKey="errors"
                  fill="#f43f5e"
                  barSize={3}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Loading chart...
            </div>
          )}
        </div>

        <div className="flex justify-between px-1 pt-2 text-[11px] font-mono text-muted-foreground border-t border-border/40 mt-2">
          <span>60s ago</span>
          <span>30s ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* 2. Host Resources */}
      <div className="rounded-lg border bg-card p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-500" />
            Host Resources
          </h3>
          <p className="text-xs text-muted-foreground">
            CPU, Memory, and Event Loop latency
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {/* CPU Usage */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-sky-400" />
                CPU Utilization
              </span>
              <span className="font-mono font-medium text-foreground">
                {cpuPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cpuPercent > 80
                    ? "bg-rose-500"
                    : cpuPercent > 50
                    ? "bg-amber-500"
                    : "bg-sky-500"
                }`}
                style={{ width: `${Math.max(4, Math.min(100, cpuPercent))}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground font-mono">
              Load: {system ? `${system.cpu.load1m} (1m), ${system.cpu.load5m} (5m)` : "0"} · {system?.cpu.cores || 1} vCPU
            </div>
          </div>

          {/* Heap Memory */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-violet-400" />
                Node.js Heap Memory
              </span>
              <span className="font-mono font-medium text-foreground">
                {heapUsed} / {heapTotal} MB ({heapPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${Math.max(4, heapPercent)}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground font-mono">
              RSS: {system?.memory.rssMb || 0} MB · Free RAM: {system?.memory.systemFreeMb || 0} MB
            </div>
          </div>

          {/* Event Loop Delay */}
          <div className="rounded-md border bg-secondary/30 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                Event Loop Delay
              </span>
              <span
                className={`font-mono font-medium ${
                  eventLoopLag > 50
                    ? "text-rose-400"
                    : eventLoopLag > 15
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {eventLoopLag} ms
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {eventLoopLag < 20
                ? "Main thread execution loop is responsive."
                : "Workloads are introducing synchronous latency."}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-border/40 pt-2 text-right">
          <span className="text-[11px] text-muted-foreground font-mono">
            Node {system?.process.nodeVersion || "v20"} · {system?.process.platform || "linux"} ({system?.process.arch || "x64"})
          </span>
        </div>
      </div>
    </div>
  )
}
