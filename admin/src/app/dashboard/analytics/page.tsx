"use client"

import React, { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { TelemetrySnapshot } from "@/components/monitoring/types"
import { OutageWatchdog } from "@/components/monitoring/outage-watchdog"
import { LivePulseHero } from "@/components/monitoring/live-pulse-hero"
import { KpiGrid } from "@/components/monitoring/kpi-grid"
import { TelemetryCharts } from "@/components/monitoring/telemetry-charts"
import { SlowRoutesCard } from "@/components/monitoring/slow-routes-card"
import { RequestWaterfall } from "@/components/monitoring/request-waterfall"
import { DiagnosticsToolbar } from "@/components/monitoring/diagnostics-toolbar"

export default function AnalyticsMonitoringPage() {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(2) // Default 2 seconds
  const consecutiveFailures = useRef<number>(0)

  // Fetch telemetry snapshot from backend
  const fetchTelemetry = async (manual = false) => {
    if (manual) setIsRefreshing(true)
    try {
      const res = await api.get<TelemetrySnapshot>("/admin/monitoring/realtime")
      setSnapshot(res.data)
      setIsOnline(true)
      setLastError(null)
      consecutiveFailures.current = 0
    } catch (err: any) {
      consecutiveFailures.current += 1
      const errMsg = err.response?.data?.message || err.message || "Failed to connect to backend telemetry."
      setLastError(errMsg)

      // If 2 consecutive failures occur, flag server as DOWN
      if (consecutiveFailures.current >= 2) {
        setIsOnline(false)
      }
    } finally {
      if (manual) setIsRefreshing(false)
    }
  }

  // Polling loop based on refreshInterval
  useEffect(() => {
    // Initial fetch
    fetchTelemetry()

    if (refreshInterval === 0) return

    const intervalId = setInterval(() => {
      fetchTelemetry()
    }, refreshInterval * 1000)

    return () => clearInterval(intervalId)
  }, [refreshInterval])

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6">
      {/* 1. Downtime & Outage Watchdog (Appears only if server fails) */}
      <OutageWatchdog
        isDown={!isOnline}
        lastError={lastError}
        onRetry={() => fetchTelemetry(true)}
        isRetrying={isRefreshing}
      />

      {/* 2. Status & Live Pulse Hero Header */}
      <LivePulseHero
        snapshot={snapshot}
        isOnline={isOnline}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeInterval={setRefreshInterval}
        onManualRefresh={() => fetchTelemetry(true)}
      />

      {/* 3. Core KPI Telemetry Grid (Throughput, Latency, Errors, Database) */}
      <KpiGrid snapshot={snapshot} />

      {/* 4. Real-Time Charts & Saturation Gauges */}
      <TelemetryCharts
        rollingData={snapshot?.rolling60Seconds || []}
        system={snapshot?.system || null}
      />

      {/* 5. Diagnostics Toolbar (Instant Latency Benchmark & JSON Export) */}
      <DiagnosticsToolbar
        snapshot={snapshot}
        onResetPeaks={() => fetchTelemetry(true)}
      />

      {/* 6. Endpoint Performance & Slowest Routes */}
      <SlowRoutesCard
        topRoutes={snapshot?.topRoutes || []}
        slowestRoutes={snapshot?.slowestRoutes || []}
      />

      {/* 7. Live Request Waterfall Stream */}
      <RequestWaterfall requests={snapshot?.recentRequests || []} />
    </div>
  )
}
