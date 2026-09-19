"use client"

import React from "react"
import { Database, PieChart, Smartphone, Globe, Terminal, Layers } from "lucide-react"
import { TelemetrySnapshot } from "./types"

interface StatusDistributionProps {
  snapshot: TelemetrySnapshot | null
}

export function StatusDistribution({ snapshot }: StatusDistributionProps) {
  const statusCodes = snapshot?.statusCodes?.allTime || { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 }
  const clients = snapshot?.clients || { mobile: 0, web: 0, api: 0 }
  const database = snapshot?.database

  const totalCodes = Math.max(
    1,
    (statusCodes["2xx"] || 0) +
      (statusCodes["3xx"] || 0) +
      (statusCodes["4xx"] || 0) +
      (statusCodes["5xx"] || 0)
  )

  const pct2xx = Math.round(((statusCodes["2xx"] || 0) / totalCodes) * 100)
  const pct3xx = Math.round(((statusCodes["3xx"] || 0) / totalCodes) * 100)
  const pct4xx = Math.round(((statusCodes["4xx"] || 0) / totalCodes) * 100)
  const pct5xx = Math.round(((statusCodes["5xx"] || 0) / totalCodes) * 100)

  const totalClients = Math.max(1, (clients.mobile || 0) + (clients.web || 0) + (clients.api || 0))
  const pctMobile = Math.round(((clients.mobile || 0) / totalClients) * 100)
  const pctWeb = Math.round(((clients.web || 0) / totalClients) * 100)
  const pctApi = Math.round(((clients.api || 0) / totalClients) * 100)

  // Neon DB pool saturation
  const poolTotal = database?.pool?.total || 10
  const poolIdle = database?.pool?.idle || 0
  const poolActive = Math.max(0, poolTotal - poolIdle)
  const poolWaiting = database?.pool?.waiting || 0
  const poolSaturation = Math.min(100, Math.round((poolActive / poolTotal) * 100))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. HTTP Status Distribution */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <PieChart className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-semibold text-foreground">Status Code Breakdown</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            HTTP response status classifications
          </p>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="my-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div style={{ width: `${pct2xx}%` }} className="bg-emerald-500 transition-all duration-300" />
            <div style={{ width: `${pct3xx}%` }} className="bg-sky-500 transition-all duration-300" />
            <div style={{ width: `${pct4xx}%` }} className="bg-amber-500 transition-all duration-300" />
            <div style={{ width: `${pct5xx}%` }} className="bg-rose-500 transition-all duration-300" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-2 py-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                2xx OK
              </span>
              <span className="font-semibold text-foreground">
                {statusCodes["2xx"] || 0} ({pct2xx}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-2 py-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                3xx Redirect
              </span>
              <span className="font-semibold text-foreground">
                {statusCodes["3xx"] || 0} ({pct3xx}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-2 py-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                4xx Client
              </span>
              <span className="font-semibold text-foreground">
                {statusCodes["4xx"] || 0} ({pct4xx}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-2 py-1">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                5xx Server
              </span>
              <span className="font-semibold text-foreground">
                {statusCodes["5xx"] || 0} ({pct5xx}%)
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 pt-2 text-right">
          <span className="text-[11px] font-mono text-muted-foreground">
            Total Captured: {totalCodes} responses
          </span>
        </div>
      </div>

      {/* 2. Client Traffic Source Classifier */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <Smartphone className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Client Platforms</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Traffic segmented by device & user agent
          </p>
        </div>

        <div className="my-4 space-y-3">
          {/* Mobile App */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Smartphone className="h-3 w-3 text-muted-foreground" />
                SpotMe Mobile App (iOS / Android)
              </span>
              <span className="font-mono font-medium text-foreground">
                {clients.mobile || 0} ({pctMobile}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${Math.max(3, pctMobile)}%` }}
              />
            </div>
          </div>

          {/* Web Client */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-muted-foreground" />
                Web Browsers & Admin Panel
              </span>
              <span className="font-mono font-medium text-foreground">
                {clients.web || 0} ({pctWeb}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-300"
                style={{ width: `${Math.max(3, pctWeb)}%` }}
              />
            </div>
          </div>

          {/* API / Bot / System */}
          <div>
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-muted-foreground" />
                API, Webhooks & Automated Tasks
              </span>
              <span className="font-mono font-medium text-foreground">
                {clients.api || 0} ({pctApi}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300"
                style={{ width: `${Math.max(3, pctApi)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 pt-2 text-right">
          <span className="text-[11px] font-mono text-muted-foreground">
            {totalClients} client calls logged
          </span>
        </div>
      </div>

      {/* 3. Neon PostgreSQL Pool Saturation */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-1">
            <Database className="h-4 w-4 text-cyan-500" />
            <h2 className="text-sm font-semibold text-foreground">Database Pool Health</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Neon PostgreSQL connection pool & latency
          </p>
        </div>

        <div className="my-4 space-y-3">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pool Saturation</span>
              <span className="font-mono font-semibold text-foreground">
                {poolSaturation}% ({poolActive} / {poolTotal} conn)
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  poolSaturation > 80
                    ? "bg-rose-500"
                    : poolSaturation > 50
                    ? "bg-amber-500"
                    : "bg-cyan-500"
                }`}
                style={{ width: `${Math.max(3, poolSaturation)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
              <span className="text-[10px] text-muted-foreground uppercase">Active</span>
              <div className="text-sm font-bold text-foreground">{poolActive}</div>
            </div>
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
              <span className="text-[10px] text-muted-foreground uppercase">Idle</span>
              <div className="text-sm font-bold text-foreground">{poolIdle}</div>
            </div>
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
              <span className="text-[10px] text-muted-foreground uppercase">Waiting</span>
              <div className="text-sm font-bold text-foreground">{poolWaiting}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Status: {database?.status || "optimal"}</span>
          <span>Latency: {database?.latencyMs ?? 0} ms</span>
        </div>
      </div>
    </div>
  )
}
