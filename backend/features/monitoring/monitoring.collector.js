'use strict';

const os = require('os');
const v8 = require('v8');
const { pool } = require('../../db');

// In-Memory Ring Buffer for recent requests
const MAX_RECENT_REQUESTS = 100;
const recentRequests = [];

// Rolling 60-Second Buckets (1 bucket per second)
const SECONDS_WINDOW = 60;
const secondBuckets = new Map(); // timestampSec -> { count, errors, durations: [], bytes: 0, statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } }

// Rolling 24-Hour Buckets (5-minute intervals = 288 buckets)
const BUCKET_INTERVAL_MS = 5 * 60 * 1000;
const MAX_HISTORICAL_BUCKETS = 288;
const historyBuckets = new Map(); // bucketKey -> { timestamp, requests, errors, totalDuration, avgLatency, bytes }

// Route Aggregation Stats
const routeStats = new Map(); // routeKey -> { path, method, count, errors, totalDuration, minDuration, maxDuration }

// Peak Pulse Records & Global Counters
const peakMetrics = {
  peakRps: 0,
  peakRpsTimestamp: null,
  peakLatencyMs: 0,
  peakLatencyRoute: null,
  allTimeRequests: 0,
  allTimeErrors: 0,
  allTimeBytes: 0,
  statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  clientPlatforms: { mobile: 0, web: 0, api: 0 },
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

      // Classify status code group
      let codeGroup = '2xx';
      if (statusCode >= 300 && statusCode < 400) codeGroup = '3xx';
      else if (statusCode >= 400 && statusCode < 500) codeGroup = '4xx';
      else if (statusCode >= 500) codeGroup = '5xx';

      // Estimate bytes transferred
      const contentLen = Number(res.getHeader('content-length')) || 256;
      peakMetrics.allTimeBytes += contentLen;
      peakMetrics.statusCodes[codeGroup] = (peakMetrics.statusCodes[codeGroup] || 0) + 1;

      // Classify client platform
      const userAgent = req.headers['user-agent'] || '';
      let clientPlatform = 'api';
      if (/SpotMe|okhttp|CFNetwork|Expo/i.test(userAgent)) {
        clientPlatform = 'mobile';
      } else if (/Mozilla|Chrome|Safari|Firefox|Edge/i.test(userAgent)) {
        clientPlatform = 'web';
      }
      peakMetrics.clientPlatforms[clientPlatform] = (peakMetrics.clientPlatforms[clientPlatform] || 0) + 1;

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
        clientPlatform,
        bytes: contentLen,
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
        secData = {
          count: 0,
          errors: 0,
          durations: [],
          bytes: 0,
          statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
        };
        secondBuckets.set(currentSec, secData);
      }
      secData.count += 1;
      if (isError) secData.errors += 1;
      secData.durations.push(roundedDuration);
      secData.bytes = (secData.bytes || 0) + contentLen;
      secData.statusCodes[codeGroup] = (secData.statusCodes[codeGroup] || 0) + 1;

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
          bytes: 0,
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
      histData.bytes = (histData.bytes || 0) + contentLen;

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
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  const p50 = sorted[Math.floor(len * 0.5)] || 0;
  const p75 = sorted[Math.floor(len * 0.75)] || 0;
  const p90 = sorted[Math.floor(len * 0.90)] || 0;
  const p95 = sorted[Math.floor(len * 0.95)] || 0;
  const p99 = sorted[Math.floor(len * 0.99)] || 0;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round((sum / len) * 10) / 10;

  return {
    p50: Math.round(p50 * 10) / 10,
    p75: Math.round(p75 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
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
  let currentWindowBytes = 0;
  const currentWindowStatusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };

  for (let i = SECONDS_WINDOW - 1; i >= 0; i--) {
    const secKey = currentSec - i;
    const bucket = secondBuckets.get(secKey);
    const count = bucket ? bucket.count : 0;
    const errors = bucket ? bucket.errors : 0;
    const bytes = bucket ? bucket.bytes || 0 : 0;
    const avgLatency = bucket && bucket.durations.length > 0
      ? Math.round((bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length) * 10) / 10
      : 0;

    last60Seconds.push({
      time: new Date(secKey * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: secKey * 1000,
      rps: count,
      errors,
      avgLatency,
      bytes,
    });

    if (bucket) {
      currentWindowRequests += count;
      currentWindowErrors += errors;
      currentWindowBytes += bytes;
      if (bucket.statusCodes) {
        currentWindowStatusCodes['2xx'] += bucket.statusCodes['2xx'] || 0;
        currentWindowStatusCodes['3xx'] += bucket.statusCodes['3xx'] || 0;
        currentWindowStatusCodes['4xx'] += bucket.statusCodes['4xx'] || 0;
        currentWindowStatusCodes['5xx'] += bucket.statusCodes['5xx'] || 0;
      }
      allRecentDurations.push(...bucket.durations);
    }
  }

  // Calculate current active RPS & KB/s (average over last 5 seconds)
  const last5Secs = last60Seconds.slice(-5);
  const activeRps = Math.round((last5Secs.reduce((acc, s) => acc + s.rps, 0) / 5) * 10) / 10;
  const currentKbps = Math.round(((last5Secs.reduce((acc, s) => acc + s.bytes, 0) / 5) / 1024) * 10) / 10;

  // 2. Latency percentiles
  const latencyPercentiles = calculatePercentiles(allRecentDurations.slice(-200));

  // 3. System Resources
  const memUsage = process.memoryUsage();
  const v8Stats = v8.getHeapStatistics ? v8.getHeapStatistics() : {};
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
      heapLimitMb: v8Stats.heap_size_limit ? Math.round(v8Stats.heap_size_limit / 1024 / 1024) : 0,
      physicalMb: v8Stats.total_physical_size ? Math.round(v8Stats.total_physical_size / 1024 / 1024) : 0,
      mallocedMb: v8Stats.malloced_memory ? Math.round(v8Stats.malloced_memory / 1024 / 1024) : 0,
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

  // 7. Recent Errors Ring Buffer
  const recentErrors = recentRequests.filter(r => r.isError).slice(-20).reverse();

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
    statusCodes: {
      window: currentWindowStatusCodes,
      allTime: { ...peakMetrics.statusCodes },
    },
    bandwidth: {
      currentKbps,
      windowBytes: currentWindowBytes,
      allTimeBytes: peakMetrics.allTimeBytes,
    },
    clients: { ...peakMetrics.clientPlatforms },
    system: systemMetrics,
    database: dbHealth,
    rolling60Seconds: last60Seconds,
    history: Array.from(historyBuckets.values()).slice(-288),
    recentRequests: [...recentRequests].reverse().slice(0, 50),
    recentErrors,
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
