"use client"

import React, { useEffect, useRef, useState } from "react"
import api from "@/lib/api"
import { TelemetrySnapshot } from "@/components/monitoring/types"
import { OutageWatchdog } from "@/components/monitoring/outage-watchdog"
import { LivePulseHero } from "@/components/monitoring/live-pulse-hero"
import { KpiGrid } from "@/components/monitoring/kpi-grid"
import { TelemetryCharts } from "@/components/monitoring/telemetry-charts"
import { LatencySpectrum } from "@/components/monitoring/latency-spectrum"
import { StatusDistribution } from "@/components/monitoring/status-distribution"
import { ErrorLogsCard } from "@/components/monitoring/error-logs-card"
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
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to connect to backend telemetry."
      setLastError(errMsg)

      // Flag offline after 2 consecutive failures
      if (consecutiveFailures.current >= 2) {
        setIsOnline(false)
      }
    } finally {
      if (manual) setIsRefreshing(false)
    }
  }

  // Polling loop based on refreshInterval
  useEffect(() => {
    fetchTelemetry()

    if (refreshInterval === 0) return

    const intervalId = setInterval(() => {
      fetchTelemetry()
    }, refreshInterval * 1000)

    return () => clearInterval(intervalId)
  }, [refreshInterval])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Outage Incident Watchdog Banner (Appears only if server fails) */}
      <OutageWatchdog
        isDown={!isOnline}
        lastError={lastError}
        onRetry={() => fetchTelemetry(true)}
        isRetrying={isRefreshing}
      />

      {/* 2. Status & Header (Cadence selector & Sync action) */}
      <LivePulseHero
        snapshot={snapshot}
        isOnline={isOnline}
        isRefreshing={isRefreshing}
        refreshInterval={refreshInterval}
        onChangeInterval={setRefreshInterval}
        onManualRefresh={() => fetchTelemetry(true)}
      />

      {/* 3. Core KPI Telemetry Grid (Throughput, Latency, SLO Availability, DB Ping) */}
      <KpiGrid snapshot={snapshot} />

      {/* 4. Live Pulse Chart (Smooth Area curve, 24h trend toggle) & Host Saturation */}
      <TelemetryCharts
        rollingData={snapshot?.rolling60Seconds || []}
        historyData={snapshot?.history || []}
        system={snapshot?.system || null}
      />

      {/* 5. Latency Percentile Spectrum (p50..p99), Transfer Bandwidth & V8 Memory */}
      <LatencySpectrum snapshot={snapshot} />

      {/* 6. HTTP Status Distribution (2xx-5xx), Client Platforms, Neon DB Pool */}
      <StatusDistribution snapshot={snapshot} />

      {/* 7. Incident & Error Stream Log with Copyable JSON & SLO Tracker */}
      <ErrorLogsCard snapshot={snapshot} />

      {/* 8. Diagnostics Action Bar (Ping Roundtrip, Copy/Download JSON, Reset Peaks) */}
      <DiagnosticsToolbar
        snapshot={snapshot}
        onResetPeaks={() => fetchTelemetry(true)}
      />

      {/* 9. Endpoint Performance Matrix & Route Bottlenecks */}
      <SlowRoutesCard
        topRoutes={snapshot?.topRoutes || []}
        slowestRoutes={snapshot?.slowestRoutes || []}
      />

      {/* 10. Live Request Ring-Buffer Stream & Route Filter */}
      <RequestWaterfall requests={snapshot?.recentRequests || []} />
    </div>
  )
}
