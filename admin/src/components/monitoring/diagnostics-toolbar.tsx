"use client"

import React, { useState } from "react"
import {
  Check,
  ClipboardCheck,
  Copy,
  Database,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
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
    <div className="mb-6 rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Diagnostic Benchmark & Control Actions
          </h3>
          <p className="text-xs text-muted-foreground">
            End-to-end roundtrip latency test, peak metric resets, and diagnostic reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Benchmark Button */}
          <Button
            size="sm"
            onClick={runBenchmark}
            disabled={isBenchmarking}
            className="h-8 gap-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white"
          >
            <Play className={`h-3.5 w-3.5 ${isBenchmarking ? "animate-spin" : ""}`} />
            {isBenchmarking ? "Benchmarking..." : "Run Latency Benchmark"}
          </Button>

          {/* Copy Report Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={copyDiagnostics}
            disabled={!snapshot}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Export Diagnostics</span>
              </>
            )}
          </Button>

          {/* Reset Peaks Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isResetting}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-rose-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Peaks</span>
          </Button>
        </div>
      </div>

      {/* Benchmark Results Display */}
      {benchmarkResult && (
        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Benchmark Results (Live Roundtrip Test):</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Tested at {new Date(benchmarkResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded border border-border/40 bg-background/60 p-2 text-center">
              <span className="text-[10px] text-muted-foreground uppercase">Client ➔ Server</span>
              <div className="text-base font-bold font-mono text-sky-400">
                {benchmarkResult.clientRoundtripMs} ms
              </div>
            </div>

            <div className="rounded border border-border/40 bg-background/60 p-2 text-center">
              <span className="text-[10px] text-muted-foreground uppercase">Node.js Execution</span>
              <div className="text-base font-bold font-mono text-emerald-400">
                {benchmarkResult.serverDurationMs} ms
              </div>
            </div>

            <div className="rounded border border-border/40 bg-background/60 p-2 text-center">
              <span className="text-[10px] text-muted-foreground uppercase">Neon DB Roundtrip</span>
              <div className="text-base font-bold font-mono text-cyan-400">
                {benchmarkResult.dbLatencyMs} ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
