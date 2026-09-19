"use client"

import React from "react"
import { Cpu, HardDrive, Layers, Radio, TrendingUp, Zap } from "lucide-react"
import { RollingSecondBucket, SystemMetrics } from "./types"

interface TelemetryChartsProps {
  rollingData: RollingSecondBucket[]
  system: SystemMetrics | null
}

export function TelemetryCharts({ rollingData, system }: TelemetryChartsProps) {
  // Extract RPS values for SVG path calculation
  const data = rollingData.length > 0 ? rollingData : Array.from({ length: 60 }, () => ({ rps: 0, errors: 0, avgLatency: 0 }))
  const maxRps = Math.max(5, ...data.map((d) => d.rps))

  // Build SVG path for 60-second rolling area chart
  const width = 600
  const height = 160
  const paddingBottom = 20
  const chartHeight = height - paddingBottom

  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width
    const y = chartHeight - (d.rps / maxRps) * (chartHeight - 15)
    return { x, y, rps: d.rps, errors: d.errors }
  })

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  }, "")

  const areaD = `${pathD} L ${width},${chartHeight} L 0,${chartHeight} Z`

  // System CPU & Memory
  const cpuPercent = system ? system.cpu.estimatedUsagePercent : 0
  const heapUsed = system ? system.memory.heapUsedMb : 0
  const heapTotal = system ? system.memory.heapTotalMb : 1
  const heapPercent = Math.min(100, Math.round((heapUsed / heapTotal) * 100))
  const systemRamPercent = system ? system.memory.systemUsedPercent : 0
  const eventLoopLag = system ? system.eventLoop.lagMs : 0

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 1. Live 60-Second Rolling Throughput Chart (2 Columns on Desktop) */}
      <div className="overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              Live Throughput Pulse (Last 60 Seconds)
            </h3>
            <p className="text-xs text-muted-foreground">
              Rolling real-time request volume & error spikes
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Requests/s
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Errors
            </span>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="relative w-full overflow-hidden rounded-lg bg-black/40 p-2">
          <svg
            className="h-44 w-full"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={width} y2={chartHeight * 0.25} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.5} x2={width} y2={chartHeight * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.75} x2={width} y2={chartHeight * 0.75} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

            {/* Shaded Area */}
            <path d={areaD} fill="url(#areaGradient)" />

            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Error Spike Dots */}
            {points.map((pt, i) =>
              pt.errors > 0 ? (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#F43F5E"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              ) : null
            )}
          </svg>

          {/* Time scale tags */}
          <div className="flex justify-between px-1 pt-1 text-[10px] font-mono text-muted-foreground">
            <span>60s ago</span>
            <span>30s ago</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      {/* 2. System Saturation & Host Metrics (1 Column on Desktop) */}
      <div className="flex flex-col justify-between rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" />
            Host Resource Saturation
          </h3>
          <p className="text-xs text-muted-foreground">
            EC2 CPU, Node.js Memory, and Event Loop Lag
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {/* CPU Usage Bar */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-sky-400" />
                CPU Utilization
              </span>
              <span className="font-mono font-bold text-foreground">
                {cpuPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  cpuPercent > 80 ? "bg-rose-500" : cpuPercent > 50 ? "bg-amber-500" : "bg-sky-500"
                }`}
                style={{ width: `${Math.max(4, Math.min(100, cpuPercent))}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Load: {system ? `${system.cpu.load1m} (1m), ${system.cpu.load5m} (5m)` : "0"} • {system?.cpu.cores || 1} vCPU
            </span>
          </div>

          {/* Node.js Heap Memory */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-violet-400" />
                Node.js Heap Memory
              </span>
              <span className="font-mono font-bold text-foreground">
                {heapUsed} / {heapTotal} MB ({heapPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${Math.max(4, heapPercent)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              RSS: {system?.memory.rssMb || 0} MB • Host Free RAM: {system?.memory.systemFreeMb || 0} MB
            </span>
          </div>

          {/* Event Loop Lag */}
          <div className="rounded-lg border bg-secondary/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-amber-400" />
                Event Loop Delay
              </span>
              <span
                className={`font-mono font-bold ${
                  eventLoopLag > 50 ? "text-rose-400" : eventLoopLag > 15 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {eventLoopLag} ms
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {eventLoopLag < 20
                ? "Optimal responsiveness: Thread loop is executing smoothly."
                : "Elevated lag: Node.js main thread is executing synchronous workloads."}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-border/40 pt-2 text-right">
          <span className="text-[11px] text-muted-foreground font-mono">
            Node.js {system?.process.nodeVersion || "v20"} • {system?.process.platform || "linux"} ({system?.process.arch || "x64"})
          </span>
        </div>
      </div>
    </div>
  )
}
