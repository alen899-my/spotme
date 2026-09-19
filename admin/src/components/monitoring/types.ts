export interface RequestRecord {
  id: string
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  clientIp: string
  isError: boolean
  is5xx: boolean
}

export interface RollingSecondBucket {
  time: string
  timestamp: number
  rps: number
  errors: number
  avgLatency: number
}

export interface RouteStat {
  path: string
  method: string
  count: number
  errors: number
  totalDuration: number
  minDuration: number
  maxDuration: number
  avgDuration: number
}

export interface SystemMetrics {
  cpu: {
    cores: number
    model: string
    load1m: number
    load5m: number
    load15m: number
    estimatedUsagePercent: number
  }
  memory: {
    heapUsedMb: number
    heapTotalMb: number
    rssMb: number
    externalMb: number
    systemTotalMb: number
    systemFreeMb: number
    systemUsedPercent: number
  }
  eventLoop: {
    lagMs: number
    status: "healthy" | "degraded" | "critical"
  }
  process: {
    uptimeSeconds: number
    pid: number
    nodeVersion: string
    platform: string
    release: string
    arch: string
  }
}

export interface DatabaseHealth {
  status: "healthy" | "degraded" | "down"
  latencyMs: number
  pool: {
    total: number
    idle: number
    waiting: number
  }
  message?: string
  error?: string
}

export interface TelemetrySnapshot {
  status: "optimal" | "degraded" | "down"
  timestamp: string
  throughput: {
    currentRps: number
    windowRequests: number
    windowErrors: number
    errorRatePercent: number
    peakRps: number
    peakRpsTime: string | null
    allTimeRequests: number
    allTimeErrors: number
  }
  latency: {
    p50: number
    p95: number
    p99: number
    avg: number
    min: number
    max: number
    peakLatencyMs: number
    peakLatencyRoute: string | null
  }
  system: SystemMetrics
  database: DatabaseHealth
  rolling60Seconds: RollingSecondBucket[]
  recentRequests: RequestRecord[]
  topRoutes: RouteStat[]
  slowestRoutes: RouteStat[]
}

export interface BenchmarkResult {
  clientRoundtripMs: number
  serverDurationMs: number
  dbLatencyMs: number
  dbStatus: string
  timestamp: number
}
