"use client"

import React, { useState } from "react"
import {
  Check,
  Copy,
  Download,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { BenchmarkResult, TelemetrySnapshot } from "./types"

interface DiagnosticsToolbarProps {
  snapshot: TelemetrySnapshot | null
  onResetPeaks: () => void
}

export function DiagnosticsToolbar({ snapshot, onResetPeaks }: DiagnosticsToolbarProps) {
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Run On-Demand Diagnostic Benchmark
  const runBenchmark = async () => {
    setIsBenchmarking(true)
    const clientSend = Date.now()
    try {
      const res = await api.post("/admin/monitoring/benchmark", { clientTime: clientSend })
      const clientReceived = Date.now()
      setBenchmarkResult({
        clientRoundtripMs: clientReceived - clientSend,
        serverDurationMs: res.data.serverDurationMs,
        dbLatencyMs: res.data.dbLatencyMs,
        dbStatus: res.data.dbStatus,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.error("Benchmark error:", err)
    } finally {
      setIsBenchmarking(false)
    }
  }

  // Copy Full Diagnostics JSON to clipboard
  const copyDiagnostics = () => {
    if (!snapshot) return
    const report = {
      ...snapshot,
      reportType: "SpotMe Production Diagnostic Snapshot",
      exportedAt: new Date().toISOString(),
    }
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Download diagnostic report as JSON file
  const downloadReport = () => {
    if (!snapshot) return
    const report = {
      ...snapshot,
      reportType: "SpotMe Production Diagnostic Snapshot",
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `spotme-telemetry-snapshot-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Reset Peak Pulse Records
  const handleReset = async () => {
    if (!confirm("Reset peak throughput and peak latency metrics?")) return
    setIsResetting(true)
    try {
      await api.post("/admin/monitoring/reset-peaks")
      onResetPeaks()
    } catch (err) {
      console.error("Failed to reset peaks:", err)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Diagnostics & Control Actions
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Roundtrip ping benchmarks, JSON telemetry export, and metric resets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Benchmark Button */}
          <Button
            size="sm"
            onClick={runBenchmark}
            disabled={isBenchmarking}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Play className={`h-3.5 w-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
            {isBenchmarking ? "Pinging..." : "Run Latency Ping"}
          </Button>

          {/* Copy Report Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={copyDiagnostics}
            disabled={!snapshot}
            className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-secondary/60"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy JSON</span>
              </>
            )}
          </Button>

          {/* Download Report Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={downloadReport}
            disabled={!snapshot}
            className="h-8 gap-1.5 text-xs font-medium border-border hover:bg-secondary/60"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Download</span>
          </Button>

          {/* Reset Peaks Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isResetting}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Peaks</span>
          </Button>
        </div>
      </div>

      {/* Benchmark Results Display */}
      {benchmarkResult && (
        <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              Latency Ping Breakdown:
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Tested at {new Date(benchmarkResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3 text-center text-xs font-mono">
            <div className="rounded-md border border-border/50 bg-background p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase">Client ➔ Server</span>
              <div className="text-base font-semibold text-foreground mt-0.5">
                {benchmarkResult.clientRoundtripMs} ms
              </div>
            </div>

            <div className="rounded-md border border-border/50 bg-background p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase">Node.js Execution</span>
              <div className="text-base font-semibold text-foreground mt-0.5">
                {benchmarkResult.serverDurationMs} ms
              </div>
            </div>

            <div className="rounded-md border border-border/50 bg-background p-2.5">
              <span className="text-[10px] text-muted-foreground uppercase">Neon DB Query</span>
              <div className="text-base font-semibold text-foreground mt-0.5">
                {benchmarkResult.dbLatencyMs} ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
