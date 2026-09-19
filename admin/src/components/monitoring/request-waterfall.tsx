"use client"

import React, { useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Clock,
  Filter,
  Layers,
  Search,
} from "lucide-react"
import { RequestRecord } from "./types"

interface RequestWaterfallProps {
  requests: RequestRecord[]
}

export function RequestWaterfall({ requests }: RequestWaterfallProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "errors" | "slow">("all")

  // Filter requests
  const filtered = requests.filter((req) => {
    const matchesSearch = req.path.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (filter === "errors") return req.isError
    if (filter === "slow") return req.durationMs > 150
    return true
  })

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    }
    if (status >= 300 && status < 400) {
      return "bg-sky-500/15 text-sky-400 border-sky-500/30"
    }
    if (status >= 400 && status < 500) {
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    }
    return "bg-rose-500/15 text-rose-400 border-rose-500/30"
  }

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      case "POST":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30"
      case "PUT":
      case "PATCH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30"
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30"
      default:
        return "bg-secondary text-muted-foreground border-border"
    }
  }

  return (
    <div className="rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400 animate-pulse" />
            Live Request Stream (Recent Traffic)
          </h3>
          <p className="text-xs text-muted-foreground">
            Streaming ring-buffer of incoming HTTP requests
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Tabs */}
          <div className="flex rounded-lg border bg-secondary/40 p-1">
            {[
              { id: "all" as const, label: "All" },
              { id: "errors" as const, label: "Errors" },
              { id: "slow" as const, label: "Slow (>150ms)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[140px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border bg-secondary/40 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Stream List / Table */}
      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            {requests.length === 0
              ? "Waiting for incoming requests... Real-time stream will appear here."
              : "No requests matching your current filter criteria."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {filtered.map((req) => {
              const timeFormatted = new Date(req.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })

              return (
                <div
                  key={req.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/40 bg-secondary/20 p-2.5 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Method, Status & Path */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono font-black ${getMethodBadge(
                        req.method
                      )}`}
                    >
                      {req.method}
                    </span>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${getStatusBadge(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>

                    <span className="truncate text-xs font-mono font-medium text-foreground">
                      {req.path}
                    </span>
                  </div>

                  {/* Latency & Timestamp */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 text-xs">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        req.durationMs > 250
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : req.durationMs > 100
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {req.durationMs} ms
                    </span>

                    <span className="font-mono text-[11px] text-muted-foreground">
                      {timeFormatted}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
