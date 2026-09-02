const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { callAI, extractJson } = require('../utils/ai');

const SPLIT_THEME_RULES = [
  {
    patterns: ['push', 'chest', 'tricep', 'shoulder', 'upper'],
    categories: ['chest', 'shoulders', 'upper arms'],
    targets: ['pectorals', 'pecs', 'delts', 'triceps'],
  },
  {
    patterns: ['pull', 'back', 'bicep', 'lat', 'rear'],
    categories: ['back', 'upper arms', 'lower arms'],
    targets: ['lats', 'upper back', 'traps', 'biceps', 'forearms'],
  },
  {
    patterns: ['leg', 'lower', 'glute', 'quad', 'hamstring', 'calf'],
    categories: ['upper legs', 'lower legs'],
    targets: ['quads', 'hamstrings', 'glutes', 'calves'],
  },
  {
    patterns: ['core', 'ab', 'waist'],
    categories: ['waist'],
    targets: ['abs', 'obliques'],
  },
  {
    patterns: ['cardio', 'conditioning', 'hiit'],
    categories: ['cardio'],
    targets: ['cardio'],
  },
];

function normalizePreviewText(value) {
  return String(value || '').trim().toLowerCase();
}

function getSplitThemePreference(split) {
  const text = `${split?.name || ''} ${split?.description || ''}`.toLowerCase();
  const categories = new Set();
  const targets = new Set();

  for (const rule of SPLIT_THEME_RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      rule.categories.forEach((category) => categories.add(category));
      rule.targets.forEach((target) => targets.add(target));
    }
  }

  return { categories, targets };
}

function pickSplitCoverImage(split, usedImages, usedCategories) {
  const candidates = Array.isArray(split?.preview_candidates)
    ? split.preview_candidates.filter((candidate) => candidate?.image_url)
    : [];

  if (candidates.length === 0) {
    return split?.cover_image_url || null;
  }

  const preferences = getSplitThemePreference(split);

  const ranked = candidates
    .map((candidate, index) => {
      const category = normalizePreviewText(candidate.category);
      const target = normalizePreviewText(candidate.target);
      let score = 0;

      if (!usedImages.has(candidate.image_url)) score += 6;
      if (preferences.categories.has(category)) score += 5;
      if (preferences.targets.has(target)) score += 4;
      if (category && !usedCategories.has(category)) score += 1.5;
      score += Math.max(0, 8 - index) * 0.1;

      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.candidate || candidates[0];

  if (selected?.image_url) usedImages.add(selected.image_url);
  if (selected?.category) usedCategories.add(normalizePreviewText(selected.category));

  return selected?.image_url || split?.cover_image_url || null;
}

// ─── SHARED SPLITS (user-enabled community splits) ──────────────────────────

// GET /workouts/shared-splits — list splits from users with share_splits enabled
router.get('/shared-splits', authenticateToken, async (req, res) => {
  try {
    const { q, creator_id, sort, order, min_rating, min_user_count, page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const sortOrder = (order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let whereExtra = '';
    const viewerId = req.user.id;
    const params = [];
    let paramIdx = 1;
    if (!creator_id) {
      whereExtra += ` AND s.user_id != $${paramIdx}`;
      params.push(viewerId);
      paramIdx++;
    }
    if (q && q.trim()) {
      whereExtra += ` AND (u.username ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`;
      params.push(`%${q.trim()}%`);
      paramIdx++;
    }
    if (creator_id) {
      const cid = parseInt(creator_id, 10);
      if (!isNaN(cid)) {
        whereExtra += ` AND u.id = $${paramIdx}`;
        params.push(cid);
        paramIdx++;
      }
    }
    const mRating = parseFloat(min_rating);
    if (!isNaN(mRating) && mRating > 0) {
      whereExtra += ` AND s.avg_rating >= $${paramIdx}`;
      params.push(mRating);
      paramIdx++;
    }
    const mUserCount = parseInt(min_user_count, 10);
    if (!isNaN(mUserCount) && mUserCount > 0) {
      whereExtra += ` AND (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) >= $${paramIdx}`;
      params.push(mUserCount);
      paramIdx++;
    }
    const commonWhere = `u.share_splits = true${whereExtra}`;
    const countResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM workout_splits s
      JOIN users u ON s.user_id = u.id
      WHERE ${commonWhere}
    `, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum);

    // Build dynamic ORDER BY
    let orderBy;
    switch (sort) {
      case 'avg_rating':
        orderBy = `sub.avg_rating ${sortOrder} NULLS LAST`;
        break;
      case 'user_count':
        orderBy = `sub.user_count ${sortOrder} NULLS LAST`;
        break;
      case 'session_count':
        orderBy = `sub.session_count ${sortOrder} NULLS LAST`;
        break;
      case 'created_at':
        orderBy = `sub.created_at ${sortOrder} NULLS LAST`;
        break;
      case 'name':
        orderBy = `sub.name ${sortOrder} NULLS LAST`;
        break;
      default:
        orderBy = `sub.creator_name ASC, sub.created_at DESC`;
        break;
    }

    params.push(viewerId);
    const subIdx = paramIdx;
    paramIdx++;
    params.push(limitNum, offset);
    const result = await pool.query(`
      SELECT * FROM (
        SELECT s.*,
          COALESCE(u.username, u.full_name) AS creator_name,
          u.profile_pic_url AS creator_pic,
          u.id AS creator_id,
          (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) as session_count,
          (
            SELECT json_agg(image_url) FROM (
              SELECT DISTINCT e.image_url 
              FROM workout_sessions ws
              JOIN workout_session_exercises wse ON ws.id = wse.session_id
              JOIN exercises e ON wse.exercise_id = e.id
              WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
              LIMIT 5
            ) sub
          ) as exercise_images,
          EXISTS (SELECT 1 FROM workout_splits WHERE user_id = $${subIdx} AND name = s.name) AS is_already_added,
          (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) as user_count
        FROM workout_splits s
        JOIN users u ON s.user_id = u.id
        WHERE ${commonWhere}
      ) sub
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, params);

    res.json({ data: result.rows, total, page: pageNum, totalPages });
  } catch (err) {
    console.error('Shared Splits Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /workouts/shared-splits/:id — get shared split detail with sessions + exercises
router.get('/shared-splits/:id', authenticateToken, async (req, res) => {
  try {
    const split = await pool.query(`
      SELECT s.*, COALESCE(u.username, u.full_name) AS creator_name, u.profile_pic_url AS creator_pic,
        (SELECT rating FROM split_ratings WHERE split_id = s.id AND user_id = $2) AS user_rating,
        EXISTS(SELECT 1 FROM daily_workouts WHERE split_id = s.id AND user_id = $2 AND status = 'completed') AS can_rate,
        (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) as user_count
      FROM workout_splits s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND u.share_splits = true
    `, [req.params.id, req.user.id]);

    if (split.rows.length === 0) {
      return res.status(404).json({ error: 'Shared split not found' });
    }

    const existingCheck = await pool.query(
      'SELECT id FROM workout_splits WHERE user_id = $1 AND name = $2 LIMIT 1',
      [req.user.id, split.rows[0].name]
    );
    const isAlreadyAdded = existingCheck.rows.length > 0;
    const sessions = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );

    const sessionIds = sessions.rows.map(s => s.id);
    let exercises = [];
    if (sessionIds.length > 0) {
      const exRes = await pool.query(
        `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment
         FROM workout_session_exercises wse
         JOIN exercises e ON wse.exercise_id = e.id
         WHERE wse.session_id = ANY($1::int[])
         ORDER BY wse.sort_order ASC`,
        [sessionIds]
      );
      exercises = exRes.rows;
    }

    const sessionsWithExercises = sessions.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    res.json({ ...split.rows[0], sessions: sessionsWithExercises, is_already_added: isAlreadyAdded });
  } catch (err) {
    console.error('Shared Split Detail Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /workouts/shared-splits/:id/clone — clone a shared split to user's own programs
router.post('/shared-splits/:id/clone', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shared = await client.query(`
      SELECT s.* FROM workout_splits s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND u.share_splits = true
    `, [req.params.id]);

    if (shared.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Shared split not found' });
    }

    const src = shared.rows[0];

    const newSplit = await client.query(
      `      INSERT INTO workout_splits (user_id, name, description, cloned_from_id, avg_rating, rating_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, src.name, src.description, src.id, src.avg_rating, src.rating_count]
    );
    const newSplitId = newSplit.rows[0].id;

    const sessions = await client.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC',
      [src.id]
    );

    for (const sess of sessions.rows) {
      const newSess = await client.query(
        'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [newSplitId, sess.name, sess.sort_order]
      );
      const newSessId = newSess.rows[0].id;

      const exercises = await client.query(
        'SELECT * FROM workout_session_exercises WHERE session_id = $1 ORDER BY sort_order ASC',
        [sess.id]
      );

      for (const ex of exercises.rows) {
        await client.query(
          'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [newSessId, ex.exercise_id, ex.sets, ex.reps, ex.rest_time, ex.weight, ex.sort_order]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, split_id: newSplitId, message: `"${src.name}" added to your programs!` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Clone shared split error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── MAIN SPLITS ─────────────────────────────────────────────────────────────

// Get all splits for current user
router.get('/splits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        COALESCE(ou.username, ou.full_name) AS original_creator_name,
        ou.profile_pic_url AS original_creator_pic,
        ou.id AS original_creator_id,
        (SELECT rating FROM split_ratings WHERE split_id = s.id AND user_id = $1) AS user_rating,
        (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) as user_count,
        (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) as session_count,
        (
          SELECT e.image_url
          FROM workout_sessions ws
          JOIN workout_session_exercises wse ON ws.id = wse.session_id
          JOIN exercises e ON wse.exercise_id = e.id
          WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
          ORDER BY COALESCE(ws.sort_order, 0) ASC, COALESCE(wse.sort_order, 0) ASC, wse.id ASC
          LIMIT 1
        ) as cover_image_url,
        (
          SELECT json_agg(candidate_rows)
          FROM (
            SELECT DISTINCT ON (e.image_url)
              e.image_url,
              COALESCE(NULLIF(e.category, ''), 'general') AS category,
              COALESCE(NULLIF(e.target, ''), 'general') AS target,
              e.name
            FROM workout_sessions ws
            JOIN workout_session_exercises wse ON ws.id = wse.session_id
            JOIN exercises e ON wse.exercise_id = e.id
            WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
            ORDER BY e.image_url, COALESCE(ws.sort_order, 0) ASC, COALESCE(wse.sort_order, 0) ASC, wse.id ASC
            LIMIT 8
          ) candidate_rows
        ) as preview_candidates,
        (
          SELECT json_agg(image_url) FROM (
            SELECT DISTINCT e.image_url 
            FROM workout_sessions ws
            JOIN workout_session_exercises wse ON ws.id = wse.session_id
            JOIN exercises e ON wse.exercise_id = e.id
            WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
            LIMIT 5
          ) sub
        ) as exercise_images
       FROM workout_splits s
       LEFT JOIN workout_splits os ON s.cloned_from_id = os.id
       LEFT JOIN users ou ON os.user_id = ou.id
       WHERE s.user_id = $1 
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    const usedImages = new Set();
    const usedCategories = new Set();

    const rows = result.rows.map((split) => ({
      ...split,
      cover_image_url: pickSplitCoverImage(split, usedImages, usedCategories),
    }));

    res.json(rows);
  } catch (error) {
    console.error('Fetch user splits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single split detail
router.get('/splits/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `      SELECT s.id, s.user_id, s.name, s.description, s.created_at,
              s.avg_rating, s.rating_count, s.cloned_from_id,
              COALESCE(ou.username, ou.full_name) AS original_creator_name,
              ou.profile_pic_url AS original_creator_pic,
              ou.id AS original_creator_id,
        (SELECT rating FROM split_ratings WHERE split_id = s.id AND user_id = $2) AS user_rating,
        EXISTS(SELECT 1 FROM daily_workouts WHERE split_id = s.id AND user_id = $2 AND status = 'completed') AS can_rate,
        (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) as user_count
       FROM workout_splits s
       LEFT JOIN workout_splits os ON s.cloned_from_id = os.id
       LEFT JOIN users ou ON os.user_id = ou.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Split not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── AI WORKOUT SPLIT BUILDER ──────────────────────────────────────────────────
// POST /workouts/splits/ai-generate – Generate personalized split and match with exercise library
router.post('/splits/ai-generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days_per_week, split_style, session_duration, custom_notes } = req.body;

    // 1. Fetch user profile
    const userRes = await pool.query(
      'SELECT full_name, username, fitness_goal, experience_level, gender, weight, height, age FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0] || {};

    const goal = user.fitness_goal || 'Muscle Hypertrophy';
    const level = user.experience_level || 'Intermediate';
    const days = Number(days_per_week) || 4;
    const style = split_style || 'AI Choice';
    const duration = session_duration || '60 mins';

    // 2. Build prompt for AI engine
    const prompt = `You are Coach Spotty, the elite master strength and hypertrophy AI coach for SpotMe.
Design a complete, scientifically backed workout split tailored specifically for this lifter.

User Profile:
- Goal: ${goal}
- Experience Level: ${level}
- Gender: ${user.gender || 'Not specified'}, Weight: ${user.weight || 'N/A'} kg, Height: ${user.height || 'N/A'} cm
- Training Frequency: Exactly ${days} Days Per Week
- Split Style Preference: ${style} (if "AI Choice", select the most proven split structure for ${days} days and ${goal}, e.g. Upper/Lower, PPL, Full Body, or Arnold Split)
- Target Session Duration: ${duration}
${custom_notes && custom_notes.trim() ? `- Lifter Custom Focus / Theme Note: "${custom_notes.trim()}". You MUST strictly honor this special theme (e.g. if Winter Arc, structure high intensity hypertrophy; if specific muscles like upper chest & arms requested, bias volume heavily toward them; if injuries or movements to avoid are noted, omit them).` : ''}

AI Directives:
1. Equipment Choice: Automatically pick the optimal commercial gym equipment (Barbells, Dumbbells, Cables, and Selectorized Machines) for highest hypertrophy stimulus and safety.
2. Focus Areas: Automatically distribute volume and weak-point focus according to ${goal} and ${level} (compounds first, followed by hypertrophy accessories and isolation finishers).
3. Number of Sessions: Provide EXACTLY ${days} sessions (Day 1 to Day ${days}).
4. Exercises Per Session: 5 to 6 high-stimulus exercises per session with optimal sets (3-4), rep ranges (e.g. "6-8", "8-12", "10-15"), and rest periods (e.g. "90s", "120s").

IMPORTANT: Respond ONLY with a valid JSON object in this EXACT structure (no markdown fences, no extra text outside JSON):
{
  "name": "Creative Program Title (e.g. 4-Day Upper/Lower Hypertrophy Forge)",
  "description": "2-3 sentences explaining why this program is optimal for their goal, weekly muscle volume distribution, and progression model.",
  "template_goal": "${goal}",
  "template_level": "${level}",
  "template_days": "${days} Days",
  "sessions": [
    {
      "name": "Day 1 - Upper Body Power (Chest, Back, Delts)",
      "target_muscles": "Pectorals, Lats, Delts",
      "exercises": [
        {
          "query_name": "dumbbell incline bench press",
          "target_muscle": "pectorals",
          "sets": 4,
          "reps": "6-8",
          "rest_time": "120s"
        }
      ]
    }
  ]
}`;

    console.log('================================================================');
    console.log('[AI Split] 📥 New Split Generation Request');
    console.log(`  -> User ID: ${userId} | Goal: ${goal} | Level: ${level}`);
    console.log(`  -> Frequency: ${days} Days | Style: ${style} | Duration: ${duration}`);
    if (custom_notes) console.log(`  -> Custom Note: "${custom_notes}"`);

    const rawAI = await callAI(prompt);

    console.log('----------------------------------------------------------------');
    console.log('[AI Split] 🤖 Raw AI Output:\n', rawAI);
    console.log('----------------------------------------------------------------');

    const parsed = extractJson(rawAI);

    console.log('[AI Split] 🔍 Parsed JSON Object Keys:', parsed ? Object.keys(parsed) : 'NULL');

    let sessionsArray = [];
    if (Array.isArray(parsed)) {
      sessionsArray = parsed;
    } else if (parsed && typeof parsed === 'object') {
      sessionsArray = parsed.sessions || parsed.days || parsed.workouts || parsed.program?.sessions || parsed.workout_split?.sessions || parsed.routine || [];
    }

    if (!parsed || !Array.isArray(sessionsArray) || sessionsArray.length === 0) {
      console.error('[AI Split] ❌ Extraction Error: Could not find valid sessions array!');
      console.error('[AI Split] Parsed was:', JSON.stringify(parsed, null, 2));
      throw new Error('AI failed to generate a structured workout split. Please try again.');
    }

    console.log(`[AI Split] ✅ Successfully extracted ${sessionsArray.length} sessions from AI response`);

    const matchedSessions = await matchExercisesToLibrary(sessionsArray);

    res.json({
      name: parsed.name || `${days}-Day ${goal} Program`,
      description: parsed.description || 'Customized science-based training program built by AI.',
      template_goal: parsed.template_goal || goal,
      template_level: parsed.template_level || level,
      template_days: `${days} Days`,
      sessions: matchedSessions,
    });
  } catch (err) {
    console.error('POST /workouts/splits/ai-generate error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI split' });
  }
});

// Helper function to match AI exercise suggestions to SpotMe's 1,324 exercise library
async function matchExercisesToLibrary(sessionsArray) {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  } catch (_) {}

  const matchedSessions = [];

  for (let i = 0; i < sessionsArray.length; i++) {
    const sess = sessionsArray[i];
    const matchedExercises = [];
    const exercisesList = sess.exercises || sess.workout_exercises || sess.movements || sess.routine || [];

    if (Array.isArray(exercisesList)) {
      for (let j = 0; j < exercisesList.length; j++) {
        const ex = exercisesList[j];

        // If this exercise already has a valid library ID and photo, keep it unless marked for re-match
        if (ex.exercise_id && ex.image_url && !ex.needs_rematch) {
          matchedExercises.push({
            exercise_id: String(ex.exercise_id),
            name: ex.name,
            target: ex.target,
            equipment: ex.equipment,
            image_url: ex.image_url,
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps || '8-12'),
            rest_time: String(ex.rest_time || '90s'),
            sort_order: j,
          });
          continue;
        }

        const queryTerm = (ex.query_name || ex.name || '').toLowerCase().trim();
        let chosenEx = null;

        if (queryTerm) {
          // Fuzzy match using trigram similarity
          const simRes = await pool.query(
            `SELECT id, name, target, equipment, image_url, gif_url, body_part, instructions_en, instruction_steps_en,
                    similarity(name, $1) as sim
             FROM exercises
             ORDER BY similarity(name, $1) DESC
             LIMIT 1`,
            [queryTerm]
          );
          if (simRes.rows.length > 0 && simRes.rows[0].sim > 0.22) {
            chosenEx = simRes.rows[0];
          }
        }

        // Fallback: search by target muscle and common equipment
        if (!chosenEx) {
          const muscleTarget = (ex.target_muscle || ex.target || 'pectorals').toLowerCase().trim();
          const fallbackRes = await pool.query(
            `SELECT id, name, target, equipment, image_url, gif_url, body_part, instructions_en, instruction_steps_en
             FROM exercises
             WHERE target ILIKE $1 OR body_part ILIKE $1
             ORDER BY rating_count DESC, id ASC
             LIMIT 1`,
            [`%${muscleTarget}%`]
          );
          if (fallbackRes.rows.length > 0) {
            chosenEx = fallbackRes.rows[0];
          }
        }

        if (chosenEx) {
          matchedExercises.push({
            exercise_id: String(chosenEx.id),
            name: chosenEx.name,
            target: chosenEx.target,
            equipment: chosenEx.equipment,
            image_url: chosenEx.image_url,
            gif_url: chosenEx.gif_url,
            instructions_en: chosenEx.instructions_en,
            instruction_steps_en: chosenEx.instruction_steps_en,
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps || '8-12'),
            rest_time: String(ex.rest_time || '90s'),
            sort_order: j,
          });
        }
      }
    }

    matchedSessions.push({
      name: sess.name || `Day ${i + 1}`,
      target_muscles: sess.target_muscles || '',
      sort_order: i,
      exercises: matchedExercises,
    });
  }

  return matchedSessions;
}

// POST /workouts/splits/ai-refine – Retry and refine existing split with replacements and user feedback notes
router.post('/splits/ai-refine', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_split, replace_exercises, refine_notes } = req.body;

    if (!current_split || !Array.isArray(current_split.sessions)) {
      return res.status(400).json({ error: 'Current workout split is required for refinement.' });
    }

    const userRes = await pool.query(
      'SELECT full_name, username, fitness_goal, experience_level, gender, weight, height, age FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0] || {};
    const goal = current_split.template_goal || user.fitness_goal || 'Muscle Hypertrophy';
    const level = current_split.template_level || user.experience_level || 'Intermediate';

    let replaceInstructions = 'None specifically marked.';
    if (Array.isArray(replace_exercises) && replace_exercises.length > 0) {
      replaceInstructions = replace_exercises.map((item, idx) => 
        `- Replace "${item.name}" (in ${item.session_name || `Session ${item.session_idx + 1}`}) with a superior alternate exercise for ${item.target || 'target muscle'}.`
      ).join('\n');
    }

    const prompt = `You are Coach Spotty, the elite master strength and hypertrophy AI coach for SpotMe.
The lifter has reviewed their workout split and requested specific adjustments, replacements, and retries.

User Profile:
- Goal: ${goal} | Level: ${level}

Lifter's Feedback / Revision Note:
"${refine_notes && refine_notes.trim() ? refine_notes.trim() : 'Please provide fresh, alternative exercises for the selected movements.'}"

Exercises Explicitly Marked for Replacement:
${replaceInstructions}

Current Program Structure:
${JSON.stringify(current_split.sessions.map((s, sIdx) => ({
  session_idx: sIdx,
  name: s.name,
  target_muscles: s.target_muscles,
  exercises: (s.exercises || []).map((e, eIdx) => ({
    exercise_idx: eIdx,
    name: e.name,
    target: e.target,
    sets: e.sets,
    reps: e.reps,
    rest_time: e.rest_time
  }))
})), null, 2)}

AI Directives:
1. Replace every exercise explicitly marked for replacement with a different high-impact exercise from commercial gyms (Barbells, Dumbbells, Cables, Machines).
2. Keep the non-replaced exercises intact unless the lifter's revision note asks for broad adjustments (e.g. Winter Arc intensity, more arm volume, etc.).
3. Maintain optimal progression sets (3-4), rep ranges (e.g. "6-8", "8-12", "10-15"), and rest intervals.

IMPORTANT: Respond ONLY with a valid JSON object in this EXACT structure (no markdown fences, no extra text outside JSON):
{
  "name": "${current_split.name || 'Refined Workout Split'}",
  "description": "Updated 2-3 sentence scientific explanation reflecting the revisions and why these new movements suit the lifter's goal...",
  "template_goal": "${goal}",
  "template_level": "${level}",
  "template_days": "${current_split.template_days || '4 Days'}",
  "sessions": [
    {
      "name": "Day 1 - ...",
      "target_muscles": "...",
      "exercises": [
        {
          "query_name": "new exercise name",
          "target_muscle": "muscle group",
          "sets": 3,
          "reps": "8-12",
          "rest_time": "90s"
        }
      ]
    }
  ]
}`;

    console.log('================================================================');
    console.log('[AI Split] 🔄 Split Refinement Request');
    console.log(`  -> User ID: ${userId} | Goal: ${goal}`);
    console.log(`  -> Replace Count: ${Array.isArray(replace_exercises) ? replace_exercises.length : 0}`);
    console.log(`  -> Refine Note: "${refine_notes || ''}"`);

    const rawAI = await callAI(prompt);
    console.log('----------------------------------------------------------------');
    console.log('[AI Split] 🤖 Refine Raw Output:\n', rawAI);
    console.log('----------------------------------------------------------------');

    const parsed = extractJson(rawAI);
    let sessionsArray = [];
    if (Array.isArray(parsed)) {
      sessionsArray = parsed;
    } else if (parsed && typeof parsed === 'object') {
      sessionsArray = parsed.sessions || parsed.days || parsed.workouts || parsed.program?.sessions || parsed.workout_split?.sessions || parsed.routine || [];
    }

    if (!parsed || !Array.isArray(sessionsArray) || sessionsArray.length === 0) {
      console.error('[AI Split] ❌ Refinement extraction failed!');
      throw new Error('AI failed to refine the workout split. Please try again.');
    }

    const matchedSessions = await matchExercisesToLibrary(sessionsArray);

    res.json({
      name: parsed.name || current_split.name,
      description: parsed.description || current_split.description,
      template_goal: parsed.template_goal || goal,
      template_level: parsed.template_level || level,
      template_days: parsed.template_days || current_split.template_days,
      sessions: matchedSessions,
    });
  } catch (err) {
    console.error('POST /workouts/splits/ai-refine error:', err);
    res.status(500).json({ error: err.message || 'Failed to refine AI split' });
  }
});

// POST /workouts/splits/save-ai-split – Transactionally save the generated split to user's account
router.post('/splits/save-ai-split', authenticateToken, async (req, res) => {
  const { name, description, template_goal, template_level, template_days, sessions } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Program name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create split
    const splitRes = await client.query(
      `INSERT INTO workout_splits (user_id, name, description, template_goal, template_level, template_days, is_template)
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [
        userId,
        name.trim(),
        description || null,
        template_goal || null,
        template_level || null,
        template_days || null,
      ]
    );
    const split = splitRes.rows[0];

    // 2. Create sessions and exercises
    if (Array.isArray(sessions)) {
      for (let i = 0; i < sessions.length; i++) {
        const sess = sessions[i];
        const sessRes = await client.query(
          'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
          [split.id, sess.name || `Day ${i + 1}`, i]
        );
        const session = sessRes.rows[0];

        if (Array.isArray(sess.exercises)) {
          for (let j = 0; j < sess.exercises.length; j++) {
            const ex = sess.exercises[j];
            await client.query(
              'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [session.id, ex.exercise_id, ex.sets || 3, ex.reps || '8-12', ex.rest_time || '90s', '0', j]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: split.id,
      name: split.name,
      message: 'Program created and saved successfully!',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /workouts/splits/save-ai-split error:', err);
    res.status(500).json({ error: err.message || 'Failed to save split' });
  } finally {
    client.release();
  }
});

// Create new split (Group)
router.post('/splits', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO workout_splits (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete split (users cannot delete templates)
// Update split name/description
router.put('/splits/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE workout_splits SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, description, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Split not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete split (users cannot delete templates)
router.delete('/splits/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM workout_splits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Split deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── SPLIT RATINGS ────────────────────────────────────────────────────────────

// POST /workouts/splits/:id/rate — rate a split (1-10), requires 1+ completed workout
router.post('/splits/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    const splitId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    // Check split exists
    const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1', [splitId]);
    if (split.rows.length === 0) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Check user has completed at least one workout with this split
    const usage = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM daily_workouts
        WHERE split_id = $1 AND user_id = $2 AND status = 'completed'
      ) AS used`,
      [splitId, userId]
    );
    if (!usage.rows[0].used) {
      return res.status(403).json({ error: 'Complete at least one workout with this split before rating' });
    }

    // Upsert rating
    await pool.query(
      `INSERT INTO split_ratings (split_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (split_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, created_at = CURRENT_TIMESTAMP`,
      [splitId, userId, rating]
    );

    // Recalculate avg
    const agg = await pool.query(
      `SELECT AVG(rating::numeric) AS avg, COUNT(*) AS cnt
       FROM split_ratings WHERE split_id = $1`,
      [splitId]
    );
    const newAvg = agg.rows[0].avg ? parseFloat(parseFloat(agg.rows[0].avg).toFixed(1)) : 0;
    const newCnt = parseInt(agg.rows[0].cnt, 10);

    await pool.query(
      'UPDATE workout_splits SET avg_rating = $1, rating_count = $2 WHERE id = $3',
      [newAvg, newCnt, splitId]
    );

    res.json({ avg_rating: newAvg, rating_count: newCnt, user_rating: rating });
  } catch (err) {
    console.error('Rate split error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SESSIONS (DAYS WITHIN A SPLIT) ──────────────────────────────────────────

// Get sessions for a split (own or shared)
router.get('/splits/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ws.*, 
        (SELECT COUNT(*) FROM workout_session_exercises WHERE session_id = ws.id) as exercise_count,
        (
          SELECT e.image_url 
          FROM workout_session_exercises wse
          JOIN exercises e ON wse.exercise_id = e.id
          WHERE wse.session_id = ws.id AND e.image_url IS NOT NULL
          LIMIT 1
        ) as sample_image
       FROM workout_sessions ws 
       WHERE ws.split_id = $1 AND (
         $1 IN (SELECT id FROM workout_splits WHERE user_id = $2)
         OR
         $1 IN (SELECT s.id FROM workout_splits s JOIN users u ON s.user_id = u.id WHERE u.share_splits = true)
        )
        ORDER BY sort_order ASC`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/splits/:id/sessions', authenticateToken, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    // Verify ownership
    const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (split.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, name, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session name/sort_order
router.put('/sessions/:id', authenticateToken, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const session = await pool.query(
      'SELECT ws.id FROM workout_sessions ws JOIN workout_splits sp ON ws.split_id = sp.id WHERE ws.id = $1 AND sp.user_id = $2',
      [req.params.id, req.user.id]
    );
    if (session.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });
    const result = await pool.query(
      'UPDATE workout_sessions SET name = COALESCE($1, name), sort_order = COALESCE($2, sort_order) WHERE id = $3 RETURNING *',
      [name, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single session detail
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ws.*, s.name AS split_name, s.user_id AS split_owner_id
       FROM workout_sessions ws
       JOIN workout_splits s ON ws.split_id = s.id
       WHERE ws.id = $1 AND (
         s.user_id = $2
         OR
          (EXISTS (SELECT 1 FROM users WHERE id = s.user_id AND share_splits = true))
       )`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM workout_sessions 
       WHERE id = $1 AND split_id IN (SELECT id FROM workout_splits WHERE user_id = $2)`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── EXERCISES (WITHIN A SESSION) ─────────────────────────────────────────────

// Get exercises for a session (own or shared)
router.get('/sessions/:id/exercises', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wse.*, e.name, e.category, e.image_url, e.gif_url, e.target, e.equipment, e.instructions_en, e.instruction_steps_en,
              e.avg_rating::float8 AS avg_rating, e.rating_count
       FROM workout_session_exercises wse 
       JOIN exercises e ON wse.exercise_id = e.id 
       WHERE wse.session_id = $1 AND (
         $1 IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $2)
         OR
         $1 IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id JOIN users u ON s.user_id = u.id WHERE u.share_splits = true)
       )
       ORDER BY wse.sort_order ASC`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add exercise to session
router.post('/sessions/:id/exercises', authenticateToken, async (req, res) => {
  const { exercise_id, sets, reps, rest_time, sort_order } = req.body;
  try {
    // Verify ownership
    const session = await pool.query(
      `SELECT ws.id FROM workout_sessions ws 
       JOIN workout_splits s ON ws.split_id = s.id 
       WHERE ws.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (session.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.params.id, exercise_id, sets || 3, reps || '8-12', rest_time || '60s', '0', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove exercise from session
router.delete('/exercises/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM workout_session_exercises 
       WHERE id = $1 AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $2)`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Exercise removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exercise stats in session
router.put('/exercises/:id', authenticateToken, async (req, res) => {
  const { sets, reps, rest_time, weight } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workout_session_exercises 
       SET sets = $1, reps = $2, rest_time = $3, weight = $4
       WHERE id = $5 AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $6)
       RETURNING *`,
      [sets, reps, rest_time, weight, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GLOBAL EXERCISES BROWSER ────────────────────────────────────────────────

// Get all unique categories
router.get('/exercises/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM exercises ORDER BY category ASC');
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exercises by category
router.get('/exercises/by-category/:category', authenticateToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE category = $1 ORDER BY name ASC LIMIT $2 OFFSET $3',
      [req.params.category, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/exercises/search', authenticateToken, async (req, res) => {
  const { q, category, body_part, equipment, target, min_rating, sort_by = 'name', sort_order = 'asc', limit = 20, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    function addExactFilter(col, vals) {
      if (!vals) return;
      const parts = String(vals).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return;
      if (parts.length === 1) {
        conditions.push(`${col} = $${idx++}`);
        params.push(parts[0]);
      } else {
        const orClauses = parts.map(() => `${col} = $${idx++}`);
        conditions.push(`(${orClauses.join(' OR ')})`);
        params.push(...parts);
      }
    }

    if (q && q.trim()) {
      conditions.push(`(name ILIKE $${idx} OR target ILIKE $${idx})`);
      params.push(`%${q.trim()}%`);
      idx++;
    }

    addExactFilter('category', category);
    addExactFilter('body_part', body_part);
    addExactFilter('equipment', equipment);
    addExactFilter('target', target);

    if (min_rating) {
      conditions.push(`avg_rating >= $${idx}`);
      params.push(parseFloat(min_rating));
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['name', 'avg_rating'];
    const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderClause = `ORDER BY e.${sortCol} ${sortDir}`;

    const queryText = `
      SELECT e.*
      FROM exercises e
      ${where}
      ${orderClause}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
