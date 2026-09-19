"use client"

import React from "react"
import { Activity, Clock, ShieldCheck, Database, ArrowUpRight, CheckCircle2 } from "lucide-react"
import { TelemetrySnapshot } from "./types"

interface KpiGridProps {
  snapshot: TelemetrySnapshot | null
}

export function KpiGrid({ snapshot }: KpiGridProps) {
  const throughput = snapshot?.throughput
  const latency = snapshot?.latency
  const database = snapshot?.database

  const successRate = throughput
    ? Math.max(0, 100 - throughput.errorRatePercent).toFixed(2)
    : "100.00"

  const cards = [
    {
      title: "Throughput",
      value: throughput ? throughput.currentRps.toFixed(1) : "0.0",
      unit: "req/s",
      subtext: `Peak: ${throughput?.peakRps ?? 0} req/s · ${throughput?.windowRequests ?? 0} in window`,
      icon: Activity,
      status: "normal",
    },
    {
      title: "Median Latency (p50)",
      value: latency ? `${latency.p50}` : "0",
      unit: "ms",
      subtext: `p90: ${latency?.p90 ?? latency?.p95 ?? 0}ms · p99: ${latency?.p99 ?? 0}ms`,
      icon: Clock,
      status: latency && latency.p50 > 200 ? "warning" : "normal",
    },
    {
      title: "Availability (SLO)",
      value: `${successRate}`,
      unit: "%",
      subtext: `${throughput?.windowErrors ?? 0} errors · 99.9% target`,
      icon: ShieldCheck,
      status: throughput && throughput.errorRatePercent > 1 ? "warning" : "normal",
    },
    {
      title: "Database Latency",
      value: database && database.latencyMs >= 0 ? `${database.latencyMs}` : "—",
      unit: "ms",
      subtext: `Neon Pool: ${database?.pool?.idle ?? 0} idle / ${database?.pool?.total ?? 0} conn`,
      icon: Database,
      status: database?.status === "healthy" ? "normal" : "warning",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {card.title}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight font-mono tabular-nums text-foreground">
                {card.value}
              </span>
              <span className="text-xs text-muted-foreground font-normal">{card.unit}</span>
            </div>

            <p className="mt-1.5 text-xs text-muted-foreground font-mono truncate">
              {card.subtext}
            </p>
          </div>
        )
      })}
    </div>
  )
}
