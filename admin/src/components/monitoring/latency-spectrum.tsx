"use client"

import React from "react"
import { Clock, Cpu, Gauge, HardDrive, ShieldAlert, Wifi } from "lucide-react"
import { TelemetrySnapshot } from "./types"

interface LatencySpectrumProps {
  snapshot: TelemetrySnapshot | null
}

export function LatencySpectrum({ snapshot }: LatencySpectrumProps) {
  const latency = snapshot?.latency
  const memory = snapshot?.system?.memory
  const bandwidth = snapshot?.bandwidth
  const throughput = snapshot?.throughput

  const percentiles = [
    { label: "p50 (Median)", val: latency?.p50 ?? 0, target: "< 50ms", isWarn: (latency?.p50 ?? 0) > 50 },
    { label: "p75", val: latency?.p75 ?? Math.round(((latency?.p50 ?? 0) + (latency?.p95 ?? 0)) / 2), target: "< 100ms", isWarn: (latency?.p75 ?? 0) > 100 },
    { label: "p90", val: latency?.p90 ?? Math.round((latency?.p95 ?? 0) * 0.9), target: "< 150ms", isWarn: (latency?.p90 ?? 0) > 150 },
    { label: "p95", val: latency?.p95 ?? 0, target: "< 250ms", isWarn: (latency?.p95 ?? 0) > 250 },
    { label: "p99 (Tail)", val: latency?.p99 ?? 0, target: "< 500ms", isWarn: (latency?.p99 ?? 0) > 500 },
  ]

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // System Sentinels
  const cpuUsage = snapshot?.system?.cpu?.estimatedUsagePercent ?? 0
  const memUsage = memory?.systemUsedPercent ?? 0
  const errorRate = throughput?.errorRatePercent ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Percentile Distribution Matrix */}
      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Latency Distribution Spectrum
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Peak: {latency?.peakLatencyMs ?? 0}ms ({latency?.peakLatencyRoute || "None"})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Percentile response time breakdown against production SLO targets
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-4">
          {percentiles.map((p) => (
            <div
              key={p.label}
              className={`rounded-lg border p-2.5 transition-colors ${
                p.isWarn
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border/60 bg-secondary/30"
              }`}
            >
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                {p.label}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-foreground tabular-nums">
                  {p.val}
                </span>
                <span className="text-[10px] text-muted-foreground">ms</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Target:</span>
                <span>{p.target}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground font-mono">
          <span>Min: {latency?.min ?? 0}ms</span>
          <span>Average: {latency?.avg ?? 0}ms</span>
          <span>Max: {latency?.max ?? 0}ms</span>
        </div>
      </div>

      {/* 2. Bandwidth & Deep Memory Inspector */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <Gauge className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Traffic & V8 Runtime</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Data throughput rate and V8 engine memory limits
          </p>
        </div>

        <div className="mt-3 space-y-3">
          {/* Real-time Bandwidth */}
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-sky-500" />
                Transfer Rate
              </span>
              <span className="font-mono font-semibold text-foreground">
                {bandwidth?.currentKbps ?? 0} KB/s
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>Window: {formatBytes(bandwidth?.windowBytes ?? 0)}</span>
              <span>All-Time: {formatBytes(bandwidth?.allTimeBytes ?? 0)}</span>
            </div>
          </div>

          {/* V8 Deep Heap Metrics */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">V8 Heap Limit</span>
              <span className="text-foreground">{memory?.heapLimitMb || 2048} MB</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Physical Size</span>
              <span className="text-foreground">{memory?.physicalMb || memory?.rssMb || 0} MB</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">C++ Malloc Memory</span>
              <span className="text-foreground">{memory?.mallocedMb || memory?.externalMb || 0} MB</span>
            </div>
          </div>

          {/* Sentinel Health Status */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1.5 text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
              Threshold Alerts
            </span>
            <span
              className={`font-medium ${
                cpuUsage > 80 || memUsage > 85 || errorRate > 2
                  ? "text-amber-500"
                  : "text-emerald-500"
              }`}
            >
              {cpuUsage > 80 || memUsage > 85 || errorRate > 2
                ? "Warning Threshold Exceeded"
                : "All Thresholds Normal"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
