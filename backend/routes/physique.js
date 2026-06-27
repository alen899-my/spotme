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
    const prompt = `You are Coach Spotty, a brutally honest physique coach looking at a photo of one of your clients. Address the person directly as "you" — never refer to them as "the athlete" or "the client". Study the image carefully and give a completely honest assessment — the kind you'd give in person, not a sugar-coated app notification.

NEVER HALLUCINATE:
- NEVER invent body parts, scores, or observations. Only reference what you can actually see in the image.
- If nothing is remarkable or stands out, say so honestly — never invent praise or criticism.
- Do not guess body fat percentage if it's not clearly visible from the image.
- If you cannot see enough detail to assess something, leave it out entirely.

CRITICAL RULE — ONLY COMMENT ON WHAT YOU CAN SEE:
Examine the photo and determine which body parts are actually visible. If this is an upper-body shot, do NOT mention legs, glutes, or anything below the waist. If it's a front shot, do NOT comment on back detail or spinal erectors. If you're unsure whether a body part is visible, leave it out. Never infer or assume body parts you cannot actually see — this destroys trust in the assessment.

SCORING (be strict):
- Beginner physique: 20-45 | Intermediate: 45-65 | Advanced: 65-80 | Elite/competition: 80+
- Each muscle group score: flat/underdeveloped 15-35, average 40-60, genuinely impressive 70+
- Do not inflate, do not round up out of kindness

WHAT TO LOOK FOR (only for clearly visible body parts):
- Body fat distribution — where does this person carry fat? Is it masking muscle?
- Muscle shape and belly development — not just "has muscle" but actual quality, roundness, separation
- Symmetry and proportion — visible imbalances, lagging body parts
- Posture — forward head, rounded shoulders, pelvic tilt visible in the photo's angle
- Specific details: shoulder-to-waist ratio, clavicle width, chest thickness, arm vascularity

STRENGTHS (up to 3):
Only list these if genuinely impressive and clearly visible in the image. A real strength is something that would stand out on a stage or beach. If nothing stands out, return an empty array or at most 1 item. Be specific: "Your shoulders have good width and roundness — lateral delts pop well from the front" not "good shoulders."

IMPROVEMENTS (3-4 items, ONLY for visible body parts):
Write these as direct, specific observations a coach would make mid-conversation. Each one should identify exactly what's lacking and what to do about it. Base each observation ONLY on what is visible in the image. Never include improvements for body parts not visible.

Examples:
- "Your chest is flat, especially upper chest — focus on incline dumbbell press for 8 weeks to add upper chest thickness."
- "Your waist looks soft with no ab definition visible. At your body fat level this is expected — focus on nutrition rather than more core work."
- "Your traps overpower your rear delts, giving your shoulders a slightly rolled-forward appearance. Add face pulls and rear-delt flyes 2x/week."

If no specific improvements are clearly warranted from the image, be honest and say so — do not invent issues.

COACH MESSAGE (2-3 sentences):
Write this exactly like you'd say to someone after a consultation. Start with one honest positive or observation based ONLY on what you see, then state the main area of focus, then end with a direct challenge. Example: "You've built a solid foundation in your shoulders and arms — they show real commitment. But your chest is lagging noticeably and it throws off your whole silhouette. Fix that incline press and we'll balance this out in 12 weeks. No excuses."

MUSCLE GROUPS:
Include ONLY the body parts clearly visible in the image. Use lowercase keys. Score each 0-100. If no body parts are clearly visible, return an empty object.

Return ONLY a valid JSON object. No markdown, no code fences, no text outside the JSON.
{
  "overall_score": 42,
  "body_fat_estimate": "24-28%",
  "muscle_symmetry": 55,
  "posture_score": 48,
  "strengths": ["Your shoulders have good width and roundness — lateral delts pop well from the front"],
  "improvements": [
    "Your chest is flat, especially upper chest — I'd guess you focus on flat bench and neglect incline. Swap your first chest exercise to incline dumbbell press for 8 weeks.",
    "Your waist looks soft with no ab definition visible. At your body fat level this is expected — focus on nutrition, not more core work.",
    "High body fat (24-28%) is masking whatever muscle you have underneath. Cut 300-500 kcal/day and add 3 weekly LISS sessions."
  ],
  "coach_message": "You've built a solid foundation in your shoulders and arms — they show real commitment. But your chest is lagging noticeably and it throws off your whole silhouette. Fix that incline press and we'll balance this out in 12 weeks.",
  "muscle_groups": {
    "chest": 30,
    "shoulders": 50,
    "arms": 40
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

    // ── Data-driven fallbacks (no hallucination) ────────────────────────
    if (!analysis.strengths || !Array.isArray(analysis.strengths) || analysis.strengths.length === 0) {
      analysis.strengths = ['Nothing remarkable stood out — keep training consistently and reassess at a lower body fat.'];
    }
    if (!analysis.improvements || !Array.isArray(analysis.improvements) || analysis.improvements.length === 0) {
      analysis.improvements = ['No specific issues clearly visible from this image. Continue progressive overload and monitor progress.'];
    }
    if (!analysis.coach_message || analysis.coach_message.trim().length === 0) {
      analysis.coach_message = 'Based on what I can see, you\'re putting in the work. Keep training hard, stay consistent with your nutrition, and your next assessment will show the progress.';
    }
    if (!analysis.muscle_groups || typeof analysis.muscle_groups !== 'object' || Object.keys(analysis.muscle_groups).length === 0) {
      analysis.muscle_groups = {};
    }
    if (!analysis.body_fat_estimate || analysis.body_fat_estimate.trim().length === 0) {
      analysis.body_fat_estimate = 'Not clearly visible from this image';
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
