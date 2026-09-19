"use client"

import React, { useState } from "react"
import { Activity, Search, Smartphone, Globe, Terminal } from "lucide-react"
import { RequestRecord } from "./types"

interface RequestWaterfallProps {
  requests: RequestRecord[]
}

export function RequestWaterfall({ requests }: RequestWaterfallProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "errors" | "slow" | "mobile">("all")

  const filtered = requests.filter((req) => {
    const matchesSearch =
      req.path.toLowerCase().includes(search.toLowerCase()) ||
      req.method.toLowerCase().includes(search.toLowerCase()) ||
      req.clientIp.includes(search)
    if (!matchesSearch) return false

    if (filter === "errors") return req.isError
    if (filter === "slow") return req.durationMs > 150
    if (filter === "mobile") return req.clientPlatform === "mobile"
    return true
  })

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
    }
    if (status >= 300 && status < 400) {
      return "border-sky-500/30 bg-sky-500/10 text-sky-500"
    }
    if (status >= 400 && status < 500) {
      return "border-amber-500/30 bg-amber-500/10 text-amber-500"
    }
    return "border-rose-500/30 bg-rose-500/10 text-rose-500"
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Live Request Stream (Ring Buffer)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Streaming in-memory ring-buffer of recent incoming HTTP requests
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Tabs */}
          <div className="flex rounded-lg border bg-secondary/40 p-0.5">
            {[
              { id: "all" as const, label: "All" },
              { id: "errors" as const, label: "Errors" },
              { id: "slow" as const, label: "Slow (>150ms)" },
              { id: "mobile" as const, label: "Mobile" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  filter === tab.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[150px] flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search route or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded-md border border-border bg-secondary/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Stream List */}
      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            {requests.length === 0
              ? "Waiting for incoming requests... Real-time stream will appear here."
              : "No requests match the current search or filter."}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filtered.map((req) => {
              const timeFormatted = new Date(req.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })

              return (
                <div
                  key={req.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-secondary/15 p-2 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  {/* Method, Status & Path */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                      {req.method}
                    </span>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${getStatusBadge(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>

                    <span className="truncate font-mono font-medium text-foreground text-xs">
                      {req.path}
                    </span>
                  </div>

                  {/* Client, Latency & Timestamp */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                    <span className="hidden md:inline text-[10px] text-muted-foreground">
                      {req.clientIp}
                    </span>

                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        req.durationMs > 250
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : req.durationMs > 100
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-secondary text-foreground border border-border"
                      }`}
                    >
                      {req.durationMs} ms
                    </span>

                    <span>{timeFormatted}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border/40 pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Showing {filtered.length} of {requests.length} requests</span>
        <span>Auto-streams live updates</span>
      </div>
    </div>
  )
}
