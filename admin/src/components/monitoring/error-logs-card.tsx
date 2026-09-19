"use client"

import React, { useState } from "react"
import { AlertCircle, AlertTriangle, Check, Copy, ShieldCheck, Terminal } from "lucide-react"
import { RequestRecord, TelemetrySnapshot } from "./types"

interface ErrorLogsCardProps {
  snapshot: TelemetrySnapshot | null
}

export function ErrorLogsCard({ snapshot }: ErrorLogsCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const recentErrors = snapshot?.recentErrors || []
  const throughput = snapshot?.throughput

  const errorRate = throughput?.errorRatePercent ?? 0
  const sloTarget = 99.9
  const currentAvailability = Math.max(0, 100 - errorRate)
  const isSloMet = currentAvailability >= sloTarget

  const copyError = (err: RequestRecord) => {
    navigator.clipboard.writeText(JSON.stringify(err, null, 2))
    setCopiedId(err.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. Error Budget & Availability SLO */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Error Budget & Service SLO</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Availability tracking against 99.90% production service level objective
          </p>
        </div>

        <div className="my-4 space-y-3.5">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rolling Availability</span>
              <span
                className={`font-mono font-bold text-sm ${
                  isSloMet ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {currentAvailability.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isSloMet ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.max(5, currentAvailability)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>Target: {sloTarget}%</span>
              <span>{isSloMet ? "SLO Compliant" : "SLO At Risk"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
              <span className="text-[10px] text-muted-foreground uppercase">Window Errors</span>
              <div className="text-base font-bold text-foreground">
                {throughput?.windowErrors ?? 0}
              </div>
            </div>
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
              <span className="text-[10px] text-muted-foreground uppercase">All-Time Errors</span>
              <div className="text-base font-bold text-foreground">
                {throughput?.allTimeErrors ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 pt-2 text-right">
          <span className="text-[11px] font-mono text-muted-foreground">
            Total Requests: {throughput?.allTimeRequests ?? 0}
          </span>
        </div>
      </div>

      {/* 2. Recent Incident & Error Log Inspector */}
      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Incident & Error Stream ({recentErrors.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Last 20 HTTP 4xx / 5xx incidents
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time audit log of failed requests with client IP and execution time
          </p>
        </div>

        {/* Error Items List */}
        <div className="my-3 max-h-[220px] overflow-y-auto space-y-2 pr-1">
          {recentErrors.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No recent HTTP errors recorded. All systems performing normally.
            </div>
          ) : (
            recentErrors.map((err) => {
              const timeStr = new Date(err.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })

              return (
                <div
                  key={err.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 bg-secondary/20 p-2.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        err.status >= 500
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {err.status}
                    </span>
                    <span className="shrink-0 font-mono font-bold text-muted-foreground text-[10px]">
                      {err.method}
                    </span>
                    <span className="truncate font-mono font-medium text-foreground">
                      {err.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-[11px] font-mono text-muted-foreground">
                    <span>{err.durationMs}ms</span>
                    <span>{err.clientIp}</span>
                    <span>{timeStr}</span>
                    <button
                      type="button"
                      onClick={() => copyError(err)}
                      className="rounded p-1 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      title="Copy error JSON"
                    >
                      {copiedId === err.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Buffer: Last 20 exceptions</span>
          <span>Click icon to copy JSON payload</span>
        </div>
      </div>
    </div>
  )
}
