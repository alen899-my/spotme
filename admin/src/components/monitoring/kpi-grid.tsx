"use client"

import React from "react"
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Gauge,
  Layers,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react"
import { TelemetrySnapshot } from "./types"

interface KpiGridProps {
  snapshot: TelemetrySnapshot | null
}

export function KpiGrid({ snapshot }: KpiGridProps) {
  const throughput = snapshot?.throughput
  const latency = snapshot?.latency
  const database = snapshot?.database

  // Latency Speed Tier Color
  const getLatencyColor = (ms: number) => {
    if (ms < 50) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    if (ms < 150) return "text-sky-400 bg-sky-500/10 border-sky-500/30"
    if (ms < 300) return "text-amber-400 bg-amber-500/10 border-amber-500/30"
    return "text-rose-400 bg-rose-500/10 border-rose-500/30"
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Throughput & Peak Pulse */}
      <div className="group relative overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-sky-500/40 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Throughput Pulse
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground font-mono">
            {throughput ? throughput.currentRps : "0"}
          </span>
          <span className="text-xs text-muted-foreground">req/sec</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Flame className="h-3 w-3 text-amber-400" />
            <span>Peak Pulse:</span>
          </div>
          <span className="font-mono font-bold text-amber-400">
            {throughput ? `${throughput.peakRps} req/s` : "0 req/s"}
          </span>
        </div>
      </div>

      {/* 2. Latency Percentile Spectrum */}
      <div className="group relative overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Latency (P50 / P95)
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground font-mono">
            {latency ? `${latency.p50}` : "0"}
          </span>
          <span className="text-xs text-muted-foreground">ms (median)</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">P95:</span>
            <span className="font-mono font-semibold text-foreground">
              {latency ? `${latency.p95}ms` : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">P99:</span>
            <span className="font-mono font-semibold text-foreground">
              {latency ? `${latency.p99}ms` : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Error Rate & Reliability */}
      <div className="group relative overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-violet-500/40 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Reliability
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground font-mono">
            {throughput
              ? `${Math.max(0, 100 - throughput.errorRatePercent).toFixed(2)}%`
              : "100%"}
          </span>
          <span className="text-xs text-muted-foreground">uptime score</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2 text-xs">
          <span className="text-muted-foreground">Error Rate:</span>
          <span
            className={`font-mono font-bold ${
              throughput && throughput.errorRatePercent > 0
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {throughput ? `${throughput.errorRatePercent}%` : "0%"}
          </span>
        </div>
      </div>

      {/* 4. Neon Database Health */}
      <div className="group relative overflow-hidden rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-cyan-500/40 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Neon Database
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <Database className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-foreground font-mono">
            {database && database.latencyMs >= 0 ? `${database.latencyMs}` : "-"}
          </span>
          <span className="text-xs text-muted-foreground">ms roundtrip</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border/40 pt-2 text-xs">
          <span className="text-muted-foreground">Pool Status:</span>
          <span className="font-mono font-semibold text-cyan-400">
            {database
              ? `${database.pool.total} total • ${database.pool.idle} idle`
              : "Active"}
          </span>
        </div>
      </div>
    </div>
  )
}
