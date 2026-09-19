"use client"

import React, { useState } from "react"
import { AlertCircle, Clock, Compass, Layers, Filter } from "lucide-react"
import { RouteStat } from "./types"

interface SlowRoutesCardProps {
  topRoutes: RouteStat[]
  slowestRoutes: RouteStat[]
}

export function SlowRoutesCard({ topRoutes, slowestRoutes }: SlowRoutesCardProps) {
  const [tab, setTab] = useState<"slowest" | "top">("slowest")
  const [methodFilter, setMethodFilter] = useState<string>("ALL")

  const baseList = tab === "slowest" ? slowestRoutes : topRoutes
  const filteredList = methodFilter === "ALL"
    ? baseList
    : baseList.filter((r) => r.method.toUpperCase() === methodFilter)

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-secondary text-foreground border-border"
      case "POST":
        return "bg-secondary text-foreground border-border"
      case "PUT":
      case "PATCH":
        return "bg-secondary text-foreground border-border"
      case "DELETE":
        return "bg-secondary text-foreground border-border"
      default:
        return "bg-secondary text-muted-foreground border-border"
    }
  }

  const maxAvgDuration = Math.max(1, ...filteredList.map((r) => r.avgDuration))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Endpoint Performance & Route Bottlenecks
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average response duration and call volume categorized by API route
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Method Filter Chips */}
          <div className="flex items-center rounded-lg border bg-secondary/40 p-0.5 text-xs font-mono">
            {["ALL", "GET", "POST", "DELETE"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${
                  methodFilter === m
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg border bg-secondary/40 p-0.5">
            <button
              type="button"
              onClick={() => setTab("slowest")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                tab === "slowest"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Slowest ({slowestRoutes.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("top")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                tab === "top"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Top Traffic ({topRoutes.length})
            </button>
          </div>
        </div>
      </div>

      {/* Routes List */}
      <div className="mt-3 divide-y divide-border/30">
        {filteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No route telemetry matching criteria. As API calls occur, route metrics will populate.
          </div>
        ) : (
          filteredList.map((route, i) => {
            const barWidth = Math.min(100, Math.max(8, (route.avgDuration / maxAvgDuration) * 100))
            const isSlow = route.avgDuration > 200

            return (
              <div
                key={`${route.method}-${route.path}-${i}`}
                className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between hover:bg-secondary/30 rounded-lg px-2 transition-colors"
              >
                {/* Method & Path */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${getMethodBadge(
                      route.method
                    )}`}
                  >
                    {route.method}
                  </span>
                  <span className="truncate text-xs font-mono font-medium text-foreground">
                    {route.path}
                  </span>
                </div>

                {/* Relative Latency Bar & Metrics */}
                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="hidden sm:block w-28 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSlow ? "bg-amber-500" : "bg-foreground"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {route.count} calls
                    </span>

                    {route.errors > 0 && (
                      <span className="flex items-center gap-1 text-rose-500 font-mono text-[11px] font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {route.errors} err
                      </span>
                    )}

                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                        isSlow
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-secondary text-foreground border border-border"
                      }`}
                    >
                      {route.avgDuration} ms
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
