"use client"

import React, { useEffect, useState } from "react"
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react"
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
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <WifiOff className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-rose-950 dark:text-rose-100">
                Service Telemetry Connection Interrupted
              </h3>
              <span className="rounded-full border border-rose-300/80 bg-rose-100 px-2 py-0.5 text-[11px] font-mono font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-300">
                Downtime: {formatDowntime(downtimeSeconds)}
              </span>
            </div>
            <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-300/80">
              {lastError || "The backend server is not responding to heartbeat telemetry probes."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-8 gap-1.5 text-xs font-medium border-rose-300 text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Reconnecting..." : "Retry Connection"}
          </Button>
        </div>
      </div>
    </div>
  )
}
