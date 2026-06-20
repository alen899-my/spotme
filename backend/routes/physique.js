const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const upload = require('../uploadConfig');
const { callAI } = require('../utils/ai');

const DAILY_LIMIT = 5;

// ── GET /physique — List all analyses for current user ───────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM physique_analyses
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Count today's completed analyses (including soft-deleted) to preserve the limit
    const countResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM physique_analyses
       WHERE user_id = $1
         AND DATE(created_at AT TIME ZONE 'UTC') = $2`,
      [req.user.id, new Date().toISOString().split('T')[0]]
    );
    const todayCount = parseInt(countResult.rows[0].cnt, 10);

    res.json({ analyses: rows, todayCount, dailyLimit: DAILY_LIMIT });
  } catch (err) {
    console.error('GET /physique error:', err);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// ── POST /physique/analyze — Upload photo + run AI analysis ─────────────────
router.post('/analyze', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Check daily limit (only completed analyses count)
    const today = new Date().toISOString().split('T')[0];
    const limitCheck = await pool.query(
      `SELECT COUNT(*) as cnt FROM physique_analyses
       WHERE user_id = $1
         AND DATE(created_at AT TIME ZONE 'UTC') = $2`,
      [req.user.id, today]
    );
    const usedToday = parseInt(limitCheck.rows[0].cnt, 10);
    if (usedToday >= DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily limit reached. You can perform ${DAILY_LIMIT} physique analyses per day.`,
        limitReached: true,
        usedToday,
        dailyLimit: DAILY_LIMIT,
      });
    }

    // Build image URL
    const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
    const imageUrl = `${publicUrl}/${req.file.key}`;

    // AI physique analysis prompt — honest, direct, real-coach feedback
    const prompt = `You are a brutally honest, professional physique coach and sports scientist. Your job is to give accurate, real-world assessments — not feel-good fluff. Think of yourself as a coach preparing someone for a competition: you respect the person enough to tell them the truth.

CORE PRINCIPLES:
- Do NOT inflate scores. A beginner physique should score 20-45. An intermediate 45-65. Advanced 65-80. Elite/competition-ready 80+.
- Do NOT list fake strengths just to be nice. Only mention a strength if it genuinely stands out.
- Weaknesses must be specific and direct (e.g. "Your chest lacks thickness — likely from neglecting incline pressing" not just "keep working on chest").
- If posture is bad, say so clearly. If body fat is high, state the range honestly.
- The coach_message should sound like a real coach — direct, occasionally blunt, but still constructive. Not a motivational poster.

SCORING GUIDE (be strict):
- overall_score: 0-100. Base it on muscle development, body composition, symmetry, posture combined. Don't round up out of kindness.
- muscle_symmetry: 0-100. Penalize heavily for visible imbalances (left/right, upper/lower body ratio, lagging groups).
- posture_score: 0-100. Look for forward head, rounded shoulders, anterior pelvic tilt, uneven hips.
- muscle_groups: Score each 0-100 based on actual visible development. A flat chest gets 20-35. Average gets 40-60. Only above 70 if genuinely impressive.

ANALYSIS STEPS:
1. Estimate overall_score (strict — see guide above)
2. Estimate body fat percentage range honestly (e.g. "28-32%" if overweight, don't soften it)
3. Rate muscle_symmetry (penalize visible imbalances)
4. Rate posture_score (be specific about what's wrong)
5. List up to 3 GENUINE STRENGTHS — skip this field or reduce the list if nothing stands out. Do not invent positives.
6. List 3-4 CRITICAL WEAKNESSES with specific, actionable corrections — these must be real, not generic
7. Write a coach_message (2-3 sentences): honest, direct, motivating through truth not flattery
8. Rate each visible muscle group individually

RETURN FORMAT:
Return ONLY a valid JSON object. No text outside the JSON.
{
  "overall_score": 42,
  "body_fat_estimate": "24-28%",
  "muscle_symmetry": 55,
  "posture_score": 48,
  "strengths": [
    "Broad clavicles give a naturally wide shoulder structure — good genetic foundation to build on"
  ],
  "improvements": [
    "High body fat (estimated 24-28%) is masking any underlying muscle — cut calories by 300-500 kcal/day and prioritize cardio 3x/week",
    "Severe forward head posture visible — add chin tucks, face pulls, and thoracic extension work daily",
    "Upper/lower body imbalance — legs appear undertrained relative to the upper body, add 2 dedicated leg days per week",
    "Chest flatness suggests either avoidance of chest training or poor mind-muscle connection — focus on slow, controlled incline dumbbell press"
  ],
  "coach_message": "You have a decent frame to work with, but right now the body fat is the biggest obstacle to seeing your progress. Get that under control first — everything else becomes clearer from there. No shortcuts.",
  "muscle_groups": {
    "chest": 30,
    "back": 45,
    "shoulders": 50,
    "arms": 40,
    "core": 25,
    "legs": 35
  }
}`.trim();

    const aiResponse = await callAI(prompt, imageUrl, null);

    // Robust JSON extraction
    const fencedMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const bareMatch = aiResponse.match(/\{[\s\S]*\}/);
    const jsonString = fencedMatch ? fencedMatch[1].trim() : bareMatch ? bareMatch[0] : null;

    if (!jsonString) throw new Error('Failed to locate JSON in AI response');

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse JSON from AI response');
    }

    // Store in database
    const { rows } = await pool.query(
      `INSERT INTO physique_analyses
         (user_id, photo_url, overall_score, body_fat_estimate, muscle_symmetry,
          posture_score, strengths, improvements, muscle_groups, coach_message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed')
       RETURNING *`,
      [
        req.user.id,
        imageUrl,
        analysis.overall_score ?? 0,
        analysis.body_fat_estimate ?? 'N/A',
        analysis.muscle_symmetry ?? 0,
        analysis.posture_score ?? 0,
        JSON.stringify(analysis.strengths ?? []),
        JSON.stringify(analysis.improvements ?? []),
        JSON.stringify(analysis.muscle_groups ?? {}),
        analysis.coach_message ?? '',
      ]
    );

    res.json({
      analysis: rows[0],
      usedToday: usedToday + 1,
      dailyLimit: DAILY_LIMIT,
    });
  } catch (err) {
    console.error('POST /physique/analyze error:', err);
    if (err.message === 'Daily limit reached') {
      return res.status(429).json({ error: err.message, limitReached: true });
    }
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

// ── DELETE /physique/:id — Soft-delete an analysis ──────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Soft-delete: mark as 'deleted' so the daily count is preserved.
    // Users who delete an analysis still consumed that slot for the day.
    const { rowCount } = await pool.query(
      `UPDATE physique_analyses SET status = 'deleted'
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Analysis not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /physique/:id error:', err);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

module.exports = router;
