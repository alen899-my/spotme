"use client"

import React, { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, ServerOff, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OutageWatchdogProps {
  isDown: boolean
  lastError: string | null
  onRetry: () => void
  isRetrying?: boolean
}

export function OutageWatchdog({
  isDown,
  lastError,
  onRetry,
  isRetrying = false,
}: OutageWatchdogProps) {
  const [downtimeSeconds, setDowntimeSeconds] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (isDown) {
      timer = setInterval(() => {
        setDowntimeSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      setDowntimeSeconds(0)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isDown])

  if (!isDown) return null

  const formatDowntime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-black/80 p-4 shadow-xl backdrop-blur-md transition-all">
      {/* Red pulse background glow */}
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-3xl animate-pulse pointer-events-none" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
            {lastError?.toLowerCase().includes("network") ? (
              <WifiOff className="h-5 w-5 animate-bounce" />
            ) : (
              <ServerOff className="h-5 w-5 animate-bounce" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-rose-200">
                CRITICAL: Backend Offline or Unreachable
              </h3>
              <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/40">
                Downtime: {formatDowntime(downtimeSeconds)}
              </span>
            </div>
            <p className="mt-1 text-xs text-rose-300/80 sm:text-sm">
              {lastError || "The backend server at spotme-api.duckdns.org is not responding to HTTP heartbeat probes."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="destructive"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-9 gap-2 bg-rose-600 text-xs font-semibold shadow-lg hover:bg-rose-500 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Checking..." : "Reconnect"}
          </Button>
        </div>
      </div>
    </div>
  )
}
