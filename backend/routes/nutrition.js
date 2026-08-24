const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// Helper: compute streak and best streak from a list of dates (sorted asc)
function computeStreaks(datesSet) {
  // datesSet: Set of 'YYYY-MM-DD' strings where cut === true
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Current streak: count consecutive days up to today where date is in set
  let current = 0;
  let d = new Date(todayStr);
  while (datesSet.has(d.toISOString().split('T')[0])) {
    current += 1;
    d.setDate(d.getDate() - 1);
  }

  // Best streak: scan through sorted dates and count longest consecutive run
  const sorted = Array.from(datesSet).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const s of sorted) {
    if (!prev) { run = 1; prev = s; best = Math.max(best, run); continue; }
    const pd = new Date(prev);
    pd.setDate(pd.getDate() + 1);
    const next = pd.toISOString().split('T')[0];
    if (next === s) { run += 1; } else { run = 1; }
    prev = s;
    best = Math.max(best, run);
  }

  return { current, best };
}

// GET /nutrition/sugar-cuts
// Returns { history: [{date, cut}], sugarCuts: {date: boolean}, streak: {current, best} }
router.get('/sugar-cuts', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT date::text AS date, cut FROM sugar_cuts WHERE user_id = $1 ORDER BY date DESC`,
      [userId]
    );

    const history = result.rows.map(r => ({ date: r.date, cut: r.cut }));
    const sugarCuts = {};
    const cutDates = new Set();
    for (const row of result.rows) {
      sugarCuts[row.date] = row.cut;
      if (row.cut) cutDates.add(row.date);
    }

    const streak = computeStreaks(cutDates);

    res.json({ history, sugarCuts, streak });
  } catch (err) {
    console.error('GET /nutrition/sugar-cuts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Validation schema for sugar-cut payload
const sugarSchema = require('zod').object({
  date: require('zod').string().min(1),
  cut: require('zod').boolean(),
});

// POST /nutrition/sugar-cuts
// Body: { date: 'YYYY-MM-DD', cut: true }
router.post('/sugar-cuts', authenticateToken, validate(sugarSchema), async (req, res) => {
  const userId = req.user.id;
  const { date, cut } = req.body;
  try {
    // Upsert
    await pool.query(
      `INSERT INTO sugar_cuts (user_id, date, cut, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, date) DO UPDATE SET cut = EXCLUDED.cut, updated_at = NOW()`,
      [userId, date, cut]
    );

    // Return updated summary
    const r2 = await pool.query(`SELECT date::text AS date, cut FROM sugar_cuts WHERE user_id = $1 ORDER BY date DESC`, [userId]);
    const history = r2.rows.map(r => ({ date: r.date, cut: r.cut }));
    const sugarCuts = {};
    const cutDates = new Set();
    for (const row of r2.rows) { sugarCuts[row.date] = row.cut; if (row.cut) cutDates.add(row.date); }
    const streak = computeStreaks(cutDates);

    res.json({ ok: true, saved: { date, cut }, history, sugarCuts, streak });
  } catch (err) {
    console.error('POST /nutrition/sugar-cuts error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
