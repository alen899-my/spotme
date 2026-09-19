"use client"

import React, { useState } from "react"
import { AlertCircle, Clock, Compass, Layers } from "lucide-react"
import { RouteStat } from "./types"

interface SlowRoutesCardProps {
  topRoutes: RouteStat[]
  slowestRoutes: RouteStat[]
}

export function SlowRoutesCard({ topRoutes, slowestRoutes }: SlowRoutesCardProps) {
  const [tab, setTab] = useState<"slowest" | "top">("slowest")

  const activeList = tab === "slowest" ? slowestRoutes : topRoutes

  // Helper for HTTP method badge colors
  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      case "POST":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30"
      case "PUT":
      case "PATCH":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30"
      case "DELETE":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30"
      default:
        return "bg-secondary text-muted-foreground border-border"
    }
  }

  // Max latency in active list for comparative bar width
  const maxAvgDuration = Math.max(1, ...activeList.map((r) => r.avgDuration))

  return (
    <div className="mb-6 rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Compass className="h-4 w-4 text-sky-400" />
            Endpoint Performance & Bottleneck Analysis
          </h3>
          <p className="text-xs text-muted-foreground">
            Latency breakdown and traffic frequency by API route
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-lg border bg-secondary/40 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTab("slowest")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              tab === "slowest"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Slowest Routes ({slowestRoutes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("top")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              tab === "top"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Traffic ({topRoutes.length})
          </button>
        </div>
      </div>

      {/* Routes List (Mobile-friendly Stack) */}
      <div className="mt-3 divide-y divide-border/30">
        {activeList.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No route telemetry recorded yet. Make API requests to populate data.
          </div>
        ) : (
          activeList.map((route, i) => {
            const barWidth = Math.min(100, Math.max(8, (route.avgDuration / maxAvgDuration) * 100))
            const isSlow = route.avgDuration > 200

            return (
              <div
                key={`${route.method}-${route.path}-${i}`}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-secondary/20 rounded-lg px-2 transition-colors"
              >
                {/* Route Path & Method */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-black font-mono tracking-wider ${getMethodBadge(
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
                  {/* Visual Bar (hidden on very small screens, visible sm+) */}
                  <div className="hidden sm:block w-28 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isSlow ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground font-mono">
                      {route.count} calls
                    </span>

                    {route.errors > 0 && (
                      <span className="flex items-center gap-1 text-rose-400 font-mono font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {route.errors} err
                      </span>
                    )}

                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded ${
                        isSlow
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
