'use strict';

const os = require('os');
const { pool } = require('../../db');

// In-Memory Ring Buffer for recent requests
const MAX_RECENT_REQUESTS = 100;
const recentRequests = [];

// Rolling 60-Second Buckets (1 bucket per second)
const SECONDS_WINDOW = 60;
const secondBuckets = new Map(); // timestampSec -> { count, errors, durations: [] }

// Rolling 24-Hour Buckets (5-minute intervals = 288 buckets)
const BUCKET_INTERVAL_MS = 5 * 60 * 1000;
const MAX_HISTORICAL_BUCKETS = 288;
const historyBuckets = new Map(); // bucketKey -> { timestamp, requests, errors, totalDuration, avgLatency }

// Route Aggregation Stats
const routeStats = new Map(); // routeKey -> { path, method, count, errors, totalDuration, minDuration, maxDuration }

// Peak Pulse Records
const peakMetrics = {
  peakRps: 0,
  peakRpsTimestamp: null,
  peakLatencyMs: 0,
  peakLatencyRoute: null,
  allTimeRequests: 0,
  allTimeErrors: 0,
  serverStartTime: new Date(),
};

// Event Loop Delay Tracker
let lastTick = Date.now();
let eventLoopLagMs = 0;
setInterval(() => {
  const now = Date.now();
  // Expected interval is 500ms. Any delay beyond 500ms is event loop lag.
  eventLoopLagMs = Math.max(0, now - lastTick - 500);
  lastTick = now;
}, 500).unref();

// Clean up old rolling second buckets every 5 seconds
setInterval(() => {
  const currentSec = Math.floor(Date.now() / 1000);
  for (const sec of secondBuckets.keys()) {
    if (currentSec - sec > SECONDS_WINDOW + 5) {
      secondBuckets.delete(sec);
    }
  }
}, 5000).unref();

/**
 * Express Middleware to capture request telemetry
 */
function telemetryMiddleware(req, res, next) {
  // Exclude noisy health checks from bloating route latency averages if desired,
  // but track all user & API traffic accurately
  const startHr = process.hrtime.bigint();
  const startTime = new Date();

  res.on('finish', () => {
    try {
      const endHr = process.hrtime.bigint();
      const durationMs = Number(endHr - startHr) / 1e6;
      const roundedDuration = Math.round(durationMs * 100) / 100;

      const statusCode = res.statusCode;
      const isError = statusCode >= 400;
      const is5xx = statusCode >= 500;
      const method = req.method;
      // Sanitize path (strip query params for route categorization)
      const rawPath = req.originalUrl || req.url || '/';
      const cleanPath = rawPath.split('?')[0];

      // Ignore static assets or favicon if any
      if (cleanPath.startsWith('/favicon.ico')) return;

      peakMetrics.allTimeRequests += 1;
      if (isError) peakMetrics.allTimeErrors += 1;

      // 1. Update Recent Requests Ring Buffer
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
      const reqRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: startTime.toISOString(),
        method,
        path: cleanPath,
        status: statusCode,
        durationMs: roundedDuration,
        clientIp,
        isError,
        is5xx,
      };

      if (recentRequests.length >= MAX_RECENT_REQUESTS) {
        recentRequests.shift();
      }
      recentRequests.push(reqRecord);

      // 2. Record to Rolling Second Bucket
      const currentSec = Math.floor(Date.now() / 1000);
      let secData = secondBuckets.get(currentSec);
      if (!secData) {
        secData = { count: 0, errors: 0, durations: [] };
        secondBuckets.set(currentSec, secData);
      }
      secData.count += 1;
      if (isError) secData.errors += 1;
      secData.durations.push(roundedDuration);

      // Check Peak RPS
      if (secData.count > peakMetrics.peakRps) {
        peakMetrics.peakRps = secData.count;
        peakMetrics.peakRpsTimestamp = new Date();
      }

      // Check Peak Latency
      if (roundedDuration > peakMetrics.peakLatencyMs) {
        peakMetrics.peakLatencyMs = roundedDuration;
        peakMetrics.peakLatencyRoute = `${method} ${cleanPath}`;
      }

      // 3. Record to Historical 5-min Bucket
      const bucketTimestamp = Math.floor(Date.now() / BUCKET_INTERVAL_MS) * BUCKET_INTERVAL_MS;
      let histData = historyBuckets.get(bucketTimestamp);
      if (!histData) {
        histData = {
          timestamp: new Date(bucketTimestamp).toISOString(),
          requests: 0,
          errors: 0,
          totalDuration: 0,
          avgLatency: 0,
        };
        historyBuckets.set(bucketTimestamp, histData);

        // Keep maximum 24 hours of buckets
        if (historyBuckets.size > MAX_HISTORICAL_BUCKETS) {
          const oldestKey = historyBuckets.keys().next().value;
          historyBuckets.delete(oldestKey);
        }
      }
      histData.requests += 1;
      if (isError) histData.errors += 1;
      histData.totalDuration += roundedDuration;
      histData.avgLatency = Math.round((histData.totalDuration / histData.requests) * 10) / 10;

      // 4. Update Route Aggregation
      const routeKey = `${method} ${cleanPath}`;
      let rStat = routeStats.get(routeKey);
      if (!rStat) {
        rStat = {
          path: cleanPath,
          method,
          count: 0,
          errors: 0,
          totalDuration: 0,
          minDuration: roundedDuration,
          maxDuration: roundedDuration,
          avgDuration: roundedDuration,
        };
        routeStats.set(routeKey, rStat);
      }
      rStat.count += 1;
      if (isError) rStat.errors += 1;
      rStat.totalDuration += roundedDuration;
      rStat.minDuration = Math.min(rStat.minDuration, roundedDuration);
      rStat.maxDuration = Math.max(rStat.maxDuration, roundedDuration);
      rStat.avgDuration = Math.round((rStat.totalDuration / rStat.count) * 10) / 10;
    } catch (err) {
      console.error('Telemetry tracking error:', err);
    }
  });

  next();
}

/**
 * Calculates percentiles from an array of numbers
 */
function calculatePercentiles(values) {
  if (!values || values.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  const p50 = sorted[Math.floor(len * 0.5)] || 0;
  const p95 = sorted[Math.floor(len * 0.95)] || 0;
  const p99 = sorted[Math.floor(len * 0.99)] || 0;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / len) * 10) / 10;

  return {
    p50: Math.round(p50 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    p99: Math.round(p99 * 10) / 10,
    avg,
    min: Math.round(sorted[0] * 10) / 10,
    max: Math.round(sorted[len - 1] * 10) / 10,
  };
}

/**
 * Check Database Health & Latency
 */
async function getDatabaseHealth() {
  const start = process.hrtime.bigint();
  try {
    await pool.query('SELECT 1');
    const end = process.hrtime.bigint();
    const latencyMs = Math.round((Number(end - start) / 1e6) * 100) / 100;

    return {
      status: 'healthy',
      latencyMs,
      pool: {
        total: pool.totalCount || 0,
        idle: pool.idleCount || 0,
        waiting: pool.waitingCount || 0,
      },
      message: 'Database operational (Neon PostgreSQL)',
    };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: -1,
      pool: {
        total: pool?.totalCount || 0,
        idle: pool?.idleCount || 0,
        waiting: pool?.waitingCount || 0,
      },
      error: err.message,
    };
  }
}

/**
 * Get Comprehensive Real-Time Telemetry Snapshot
 */
async function getRealtimeSnapshot() {
  const now = Date.now();
  const currentSec = Math.floor(now / 1000);

  // 1. Build 60-second rolling array
  const last60Seconds = [];
  const allRecentDurations = [];
  let currentWindowRequests = 0;
  let currentWindowErrors = 0;

  for (let i = SECONDS_WINDOW - 1; i >= 0; i--) {
    const secKey = currentSec - i;
    const bucket = secondBuckets.get(secKey);
    const count = bucket ? bucket.count : 0;
    const errors = bucket ? bucket.errors : 0;
    const avgLatency = bucket && bucket.durations.length > 0
      ? Math.round((bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length) * 10) / 10
      : 0;

    last60Seconds.push({
      time: new Date(secKey * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: secKey * 1000,
      rps: count,
      errors,
      avgLatency,
    });

    if (bucket) {
      currentWindowRequests += count;
      currentWindowErrors += errors;
      allRecentDurations.push(...bucket.durations);
    }
  }

  // Calculate current active RPS (average over last 5 seconds)
  const last5Secs = last60Seconds.slice(-5);
  const activeRps = Math.round((last5Secs.reduce((acc, s) => acc + s.rps, 0) / 5) * 10) / 10;

  // 2. Latency percentiles
  const latencyPercentiles = calculatePercentiles(allRecentDurations.slice(-200));

  // 3. System Resources
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  const systemMetrics = {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      load1m: Math.round(loadAvg[0] * 100) / 100,
      load5m: Math.round(loadAvg[1] * 100) / 100,
      load15m: Math.round(loadAvg[2] * 100) / 100,
      estimatedUsagePercent: Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)),
    },
    memory: {
      heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
      heapTotalMb: Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10,
      rssMb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
      externalMb: Math.round((memUsage.external / 1024 / 1024) * 10) / 10,
      systemTotalMb: Math.round(totalMem / 1024 / 1024),
      systemFreeMb: Math.round(freeMem / 1024 / 1024),
      systemUsedPercent: Math.round((usedMem / totalMem) * 100),
    },
    eventLoop: {
      lagMs: eventLoopLagMs,
      status: eventLoopLagMs < 20 ? 'healthy' : eventLoopLagMs < 75 ? 'degraded' : 'critical',
    },
    process: {
      uptimeSeconds: Math.floor(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
    },
  };

  // 4. Database Health
  const dbHealth = await getDatabaseHealth();

  // 5. Top & Slowest Routes
  const sortedRoutes = Array.from(routeStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const slowestRoutes = Array.from(routeStats.values())
    .filter(r => r.count >= 2)
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 8);

  // 6. Overall Service Status
  let overallStatus = 'optimal';
  if (dbHealth.status !== 'healthy' || eventLoopLagMs > 100 || (latencyPercentiles.p95 > 500 && currentWindowRequests > 5)) {
    overallStatus = 'degraded';
  }
  if (dbHealth.status === 'down') {
    overallStatus = 'down';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    throughput: {
      currentRps: activeRps,
      windowRequests: currentWindowRequests,
      windowErrors: currentWindowErrors,
      errorRatePercent: currentWindowRequests > 0
        ? Math.round((currentWindowErrors / currentWindowRequests) * 10000) / 100
        : 0,
      peakRps: peakMetrics.peakRps,
      peakRpsTime: peakMetrics.peakRpsTimestamp,
      allTimeRequests: peakMetrics.allTimeRequests,
      allTimeErrors: peakMetrics.allTimeErrors,
    },
    latency: {
      ...latencyPercentiles,
      peakLatencyMs: peakMetrics.peakLatencyMs,
      peakLatencyRoute: peakMetrics.peakLatencyRoute,
    },
    system: systemMetrics,
    database: dbHealth,
    rolling60Seconds: last60Seconds,
    recentRequests: [...recentRequests].reverse().slice(0, 50),
    topRoutes: sortedRoutes,
    slowestRoutes,
  };
}

/**
 * Get Historical Trend Data (Last 24 Hours)
 */
function getHistoryData() {
  return Array.from(historyBuckets.values());
}

/**
 * Reset Peak Records
 */
function resetPeaks() {
  peakMetrics.peakRps = 0;
  peakMetrics.peakRpsTimestamp = null;
  peakMetrics.peakLatencyMs = 0;
  peakMetrics.peakLatencyRoute = null;
  return { success: true, message: 'Peak pulse metrics reset successfully' };
}

module.exports = {
  telemetryMiddleware,
  getRealtimeSnapshot,
  getHistoryData,
  getDatabaseHealth,
  resetPeaks,
};
