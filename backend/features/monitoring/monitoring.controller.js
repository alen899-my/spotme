'use strict';

const collector = require('./monitoring.collector');

/**
 * Controller to fetch real-time telemetry snapshot
 */
async function getRealtime(req, res) {
  try {
    const snapshot = await collector.getRealtimeSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Error fetching monitoring snapshot:', err);
    res.status(500).json({ error: 'Failed to fetch monitoring telemetry' });
  }
}

/**
 * Controller to fetch historical 24-hour trends
 */
function getHistory(req, res) {
  try {
    const history = collector.getHistoryData();
    res.json({ history });
  } catch (err) {
    console.error('Error fetching historical telemetry:', err);
    res.status(500).json({ error: 'Failed to fetch historical telemetry' });
  }
}

/**
 * Controller to perform an on-demand latency benchmark ping
 */
async function pingBenchmark(req, res) {
  const clientSendTime = req.body?.clientTime ? Number(req.body.clientTime) : null;
  const serverStart = process.hrtime.bigint();

  try {
    const dbHealth = await collector.getDatabaseHealth();
    const serverEnd = process.hrtime.bigint();
    const serverDurationMs = Math.round((Number(serverEnd - serverStart) / 1e6) * 100) / 100;

    res.json({
      status: 'ok',
      serverTimestamp: Date.now(),
      clientSendTime,
      serverDurationMs,
      dbLatencyMs: dbHealth.latencyMs,
      dbStatus: dbHealth.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Benchmark failed', message: err.message });
  }
}

/**
 * Controller to reset peak metrics
 */
function resetPeaks(req, res) {
  try {
    const result = collector.resetPeaks();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset peak metrics' });
  }
}

module.exports = {
  getRealtime,
  getHistory,
  pingBenchmark,
  resetPeaks,
};
