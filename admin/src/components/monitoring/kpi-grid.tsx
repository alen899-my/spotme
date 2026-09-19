"use client"

import React from "react"
import { Activity, Clock, ShieldCheck, Database } from "lucide-react"
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
      subtext: `Peak: ${throughput?.peakRps ?? 0} req/s`,
      icon: Activity,
      iconColor: "text-sky-500",
      iconBg: "bg-sky-500/10",
    },
    {
      title: "Median Latency (p50)",
      value: latency ? `${latency.p50}` : "0",
      unit: "ms",
      subtext: `p95: ${latency?.p95 ?? 0}ms · p99: ${latency?.p99 ?? 0}ms`,
      icon: Clock,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Success Rate",
      value: `${successRate}`,
      unit: "%",
      subtext: `${throughput?.windowErrors ?? 0} errors (${throughput?.errorRatePercent ?? 0}%)`,
      icon: ShieldCheck,
      iconColor:
        throughput && throughput.errorRatePercent > 0
          ? "text-rose-500"
          : "text-violet-500",
      iconBg:
        throughput && throughput.errorRatePercent > 0
          ? "bg-rose-500/10"
          : "bg-violet-500/10",
    },
    {
      title: "Database Latency",
      value: database && database.latencyMs >= 0 ? `${database.latencyMs}` : "—",
      unit: "ms",
      subtext: `Pool: ${database?.pool?.idle ?? 0} idle · ${database?.pool?.total ?? 0} total`,
      icon: Database,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {card.title}
              </span>
              <div className={`rounded-md p-1.5 ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight font-mono tabular-nums">
                {card.value}
              </span>
              <span className="text-xs text-muted-foreground">{card.unit}</span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground font-mono">
              {card.subtext}
            </p>
          </div>
        )
      })}
    </div>
  )
}
