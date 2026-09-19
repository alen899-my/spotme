"use client"

import React from "react"
import { RefreshCw, Server, Activity, Globe, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TelemetrySnapshot } from "./types"

interface LivePulseHeroProps {
  snapshot: TelemetrySnapshot | null
  isOnline: boolean
  isRefreshing: boolean
  refreshInterval: number
  onChangeInterval: (val: number) => void
  onManualRefresh: () => void
}

export function LivePulseHero({
  snapshot,
  isOnline,
  isRefreshing,
  refreshInterval,
  onChangeInterval,
  onManualRefresh,
}: LivePulseHeroProps) {
  const status = !isOnline ? "down" : snapshot?.status || "optimal"

  const formatUptime = (secs: number) => {
    const days = Math.floor(secs / 86400)
    const hours = Math.floor((secs % 86400) / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m ${secs % 60}s`
  }

  const statusConfig = {
    optimal: {
      dot: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
      label: "Operational",
      icon: CheckCircle2,
    },
    degraded: {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
      label: "Degraded",
      icon: AlertCircle,
    },
    down: {
      dot: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400",
      label: "Offline",
      icon: XCircle,
    },
  }[status]

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            System Telemetry
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time request throughput, latency distribution, and host performance
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 font-mono text-[11px]">
            <Globe className="h-3 w-3 text-muted-foreground" />
            AWS EC2 (eu-north-1)
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 font-mono text-[11px]">
            <Server className="h-3 w-3 text-muted-foreground" />
            {snapshot ? `PID ${snapshot.system.process.pid}` : "Node.js"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 font-mono text-[11px]">
            <Activity className="h-3 w-3 text-muted-foreground" />
            Uptime: {snapshot ? formatUptime(snapshot.system.process.uptimeSeconds) : "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
          {[
            { label: "1s", val: 1 },
            { label: "2s", val: 2 },
            { label: "5s", val: 5 },
            { label: "Pause", val: 0 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChangeInterval(opt.val)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                refreshInterval === opt.val
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-secondary/60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-muted-foreground ${isRefreshing ? "animate-spin text-foreground" : ""}`}
          />
          {isRefreshing ? "Syncing..." : "Refresh"}
        </Button>
      </div>
    </div>
  )
}
