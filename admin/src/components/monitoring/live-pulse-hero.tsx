"use client"

import React from "react"
import {
  Activity,
  Cpu,
  Globe,
  Radio,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TelemetrySnapshot } from "./types"

interface LivePulseHeroProps {
  snapshot: TelemetrySnapshot | null
  isOnline: boolean
  isRefreshing: boolean
  refreshInterval: number // in seconds, 0 = paused
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
      color: "text-emerald-400",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      label: "ALL SYSTEMS OPERATIONAL",
      beaconClass: "bg-emerald-500 shadow-[0_0_12px_#10B981]",
    },
    degraded: {
      color: "text-amber-400",
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/20",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      label: "PERFORMANCE DEGRADED",
      beaconClass: "bg-amber-500 shadow-[0_0_12px_#F59E0B]",
    },
    down: {
      color: "text-rose-400",
      bg: "bg-rose-500/15",
      border: "border-rose-500/30",
      glow: "shadow-rose-500/20",
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      label: "SERVER OFFLINE",
      beaconClass: "bg-rose-500 shadow-[0_0_12px_#F43F5E]",
    },
  }[status]

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border bg-card/90 p-4 shadow-xl backdrop-blur-xl transition-all sm:p-6">
      {/* Background Ambient Glow */}
      <div
        className={`absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl transition-all duration-700 ${
          status === "optimal"
            ? "bg-emerald-500"
            : status === "degraded"
            ? "bg-amber-500"
            : "bg-rose-500"
        }`}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Pulse Indicator & Title */}
        <div className="flex items-start gap-4">
          <div
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${statusConfig.border} ${statusConfig.bg} shadow-lg`}
          >
            {/* Animated Pulse Rings */}
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-2xl opacity-40 ${statusConfig.beaconClass}`}
            />
            <Radio className={`relative h-7 w-7 ${statusConfig.color}`} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                Telemetry & Mission Control
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${statusConfig.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusConfig.beaconClass}`} />
                {statusConfig.label}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Real-time APM telemetry, throughput pulse, and host saturation monitoring.
            </p>

            {/* Quick Badges on Mobile / Desktop */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/60 px-2 py-0.5 text-muted-foreground font-mono">
                <Globe className="h-3 w-3 text-sky-400" />
                AWS EC2 (eu-north-1)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/60 px-2 py-0.5 text-muted-foreground font-mono">
                <Server className="h-3 w-3 text-emerald-400" />
                {snapshot ? `PID ${snapshot.system.process.pid}` : "Standalone Node.js"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-secondary/60 px-2 py-0.5 text-muted-foreground font-mono">
                <Activity className="h-3 w-3 text-amber-400" />
                Uptime: {snapshot ? formatUptime(snapshot.system.process.uptimeSeconds) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Touch-Friendly Controls & Refresh Selector */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto sm:justify-end">
          {/* Refresh Rate Selector */}
          <div className="flex w-full items-center justify-between gap-1 rounded-xl border bg-secondary/40 p-1 sm:w-auto">
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
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:flex-initial ${
                  refreshInterval === opt.val
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Manual Ping Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="h-9 min-w-[90px] flex-1 gap-2 text-xs font-semibold shadow-sm sm:flex-initial"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
            {isRefreshing ? "Pinging..." : "Ping Now"}
          </Button>
        </div>
      </div>

      {/* Real-time Heartbeat EKG Pulse Waveform */}
      <div className="mt-5 border-t border-border/40 pt-3">
        <div className="flex items-center justify-between pb-1 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-400 animate-pulse" />
            LIVE TELEMETRY PULSE
          </span>
          <span>
            {snapshot ? `${snapshot.throughput.currentRps} req/s` : "0 req/s"} •{" "}
            {snapshot ? `${snapshot.latency.p50}ms P50` : "0ms"}
          </span>
        </div>

        {/* Animated SVG EKG line */}
        <div className="relative h-9 w-full overflow-hidden rounded-lg bg-black/40 px-2 py-1">
          <svg
            className="h-full w-full"
            viewBox="0 0 500 30"
            preserveAspectRatio="none"
          >
            {/* Grid background lines */}
            <line x1="0" y1="15" x2="500" y2="15" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="0" y1="5" x2="500" y2="5" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="25" x2="500" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

            {/* Pulsing EKG path */}
            <path
              d="M 0,15 L 60,15 L 75,5 L 85,25 L 95,10 L 105,18 L 115,15 L 200,15 L 215,3 L 225,27 L 235,8 L 245,18 L 255,15 L 340,15 L 355,6 L 365,24 L 375,10 L 385,18 L 395,15 L 500,15"
              fill="none"
              stroke={status === "optimal" ? "#10B981" : status === "degraded" ? "#F59E0B" : "#F43F5E"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            />
          </svg>

          {/* Sweeping scanline */}
          <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan" />
        </div>
      </div>
    </div>
  )
}
