const { pool } = require('../../db');
const { callAI, extractJson } = require('../../utils/ai');

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

/**
 * Match exercise suggestions from AI to database library.
 */
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

/**
 * Get shared community splits.
 */
async function getSharedSplits(viewerId, filters) {
  const { q, creator_id, sort, order, min_rating, min_user_count, page = '1', limit = '10' } = filters;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;
  const sortOrder = (order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereExtra = '';
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

  return { data: result.rows, total, page: pageNum, totalPages };
}

/**
 * Get shared split detail with sessions & exercises.
 */
async function getSharedSplitDetail(splitId, userId) {
  const split = await pool.query(`
    SELECT s.*, COALESCE(u.username, u.full_name) AS creator_name, u.profile_pic_url AS creator_pic,
      (SELECT rating FROM split_ratings WHERE split_id = s.id AND user_id = $2) AS user_rating,
      EXISTS(SELECT 1 FROM daily_workouts WHERE split_id = s.id AND user_id = $2 AND status = 'completed') AS can_rate,
      (SELECT COUNT(DISTINCT user_id) FROM workout_splits WHERE cloned_from_id = s.id) as user_count
    FROM workout_splits s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1 AND u.share_splits = true
  `, [splitId, userId]);

  if (split.rows.length === 0) return null;

  const existingCheck = await pool.query(
    'SELECT id FROM workout_splits WHERE user_id = $1 AND name = $2 LIMIT 1',
    [userId, split.rows[0].name]
  );
  const isAlreadyAdded = existingCheck.rows.length > 0;
  const sessions = await pool.query(
    'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC',
    [splitId]
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

  return { ...split.rows[0], sessions: sessionsWithExercises, is_already_added: isAlreadyAdded };
}

/**
 * Clone shared split to user's splits.
 */
async function cloneSharedSplit(splitId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shared = await client.query(`
      SELECT s.* FROM workout_splits s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND u.share_splits = true
    `, [splitId]);

    if (shared.rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('Shared split not found');
      err.status = 404;
      throw err;
    }

    const src = shared.rows[0];

    const newSplit = await client.query(
      `INSERT INTO workout_splits (user_id, name, description, cloned_from_id, avg_rating, rating_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, src.name, src.description, src.id, src.avg_rating, src.rating_count]
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
    return { success: true, split_id: newSplitId, message: `"${src.name}" added to your programs!` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get user's splits.
 */
async function getUserSplits(userId) {
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
    [userId]
  );
  const usedImages = new Set();
  const usedCategories = new Set();

  return result.rows.map((split) => ({
    ...split,
    cover_image_url: pickSplitCoverImage(split, usedImages, usedCategories),
  }));
}

/**
 * Get single split detail.
 */
async function getSplitDetail(splitId, userId) {
  const result = await pool.query(
    `SELECT s.id, s.user_id, s.name, s.description, s.created_at,
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
    [splitId, userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * AI generate split.
 */
async function generateAiSplit(userId, params) {
  const { days_per_week, split_style, session_duration, custom_notes } = params;

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

  // 'workout_split_generate' task: generates a new structured N-day training plan as JSON.
  const rawAI = await callAI(prompt, null, 'workout_split_generate');
  const parsed = extractJson(rawAI);

  let sessionsArray = [];
  if (Array.isArray(parsed)) {
    sessionsArray = parsed;
  } else if (parsed && typeof parsed === 'object') {
    sessionsArray = parsed.sessions || parsed.days || parsed.workouts || parsed.program?.sessions || parsed.workout_split?.sessions || parsed.routine || [];
  }

  if (!parsed || !Array.isArray(sessionsArray) || sessionsArray.length === 0) {
    throw new Error('AI failed to generate a structured workout split. Please try again.');
  }

  const matchedSessions = await matchExercisesToLibrary(sessionsArray);

  return {
    name: parsed.name || `${days}-Day ${goal} Program`,
    description: parsed.description || 'Customized science-based training program built by AI.',
    template_goal: parsed.template_goal || goal,
    template_level: parsed.template_level || level,
    template_days: `${days} Days`,
    sessions: matchedSessions,
  };
}

/**
 * AI refine split.
 */
async function refineAiSplit(userId, { current_split, replace_exercises, refine_notes }) {
  if (!current_split || !Array.isArray(current_split.sessions)) {
    const err = new Error('Current workout split is required for refinement.');
    err.status = 400;
    throw err;
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
    replaceInstructions = replace_exercises.map((item) => 
      `- Replace "${item.name}" (in ${item.session_name || `Session ${(item.session_idx || 0) + 1}`}) with a superior alternate exercise for ${item.target || 'target muscle'}.`
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

  // 'workout_split_refine' task: updates/refines an existing training split as JSON.
  const rawAI = await callAI(prompt, null, 'workout_split_refine');
  const parsed = extractJson(rawAI);
  let sessionsArray = [];
  if (Array.isArray(parsed)) {
    sessionsArray = parsed;
  } else if (parsed && typeof parsed === 'object') {
    sessionsArray = parsed.sessions || parsed.days || parsed.workouts || parsed.program?.sessions || parsed.workout_split?.sessions || parsed.routine || [];
  }

  if (!parsed || !Array.isArray(sessionsArray) || sessionsArray.length === 0) {
    throw new Error('AI failed to refine the workout split. Please try again.');
  }

  const matchedSessions = await matchExercisesToLibrary(sessionsArray);

  return {
    name: parsed.name || current_split.name,
    description: parsed.description || current_split.description,
    template_goal: parsed.template_goal || goal,
    template_level: parsed.template_level || level,
    template_days: parsed.template_days || current_split.template_days,
    sessions: matchedSessions,
  };
}

/**
 * Save AI split transactionally.
 */
async function saveAiSplit(userId, data) {
  const { name, description, template_goal, template_level, template_days, sessions } = data;
  if (!name || !name.trim()) {
    const err = new Error('Program name is required');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
    return {
      id: split.id,
      name: split.name,
      message: 'Program created and saved successfully!',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Create split manually.
 */
async function createSplit(userId, { name, description }) {
  const result = await pool.query(
    'INSERT INTO workout_splits (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [userId, name, description]
  );
  return result.rows[0];
}

/**
 * Update split name / description.
 */
async function updateSplit(userId, splitId, { name, description }) {
  const result = await pool.query(
    'UPDATE workout_splits SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 AND user_id = $4 RETURNING *',
    [name, description, splitId, userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Delete split.
 */
async function deleteSplit(userId, splitId) {
  await pool.query('DELETE FROM workout_splits WHERE id = $1 AND user_id = $2', [splitId, userId]);
}

/**
 * Rate split.
 */
async function rateSplit(userId, splitId, rating) {
  if (!rating || rating < 1 || rating > 10) {
    const err = new Error('Rating must be between 1 and 10');
    err.status = 400;
    throw err;
  }

  const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1', [splitId]);
  if (split.rows.length === 0) {
    const err = new Error('Split not found');
    err.status = 404;
    throw err;
  }

  const usage = await pool.query(
    `SELECT EXISTS(
      SELECT 1 FROM daily_workouts
      WHERE split_id = $1 AND user_id = $2 AND status = 'completed'
    ) AS used`,
    [splitId, userId]
  );
  if (!usage.rows[0].used) {
    const err = new Error('Complete at least one workout with this split before rating');
    err.status = 403;
    throw err;
  }

  await pool.query(
    `INSERT INTO split_ratings (split_id, user_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (split_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating, created_at = CURRENT_TIMESTAMP`,
    [splitId, userId, rating]
  );

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

  return { avg_rating: newAvg, rating_count: newCnt, user_rating: rating };
}

/**
 * Get sessions for split.
 */
async function getSessionsForSplit(splitId, userId) {
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
    [splitId, userId]
  );
  return result.rows;
}

/**
 * Create session within split.
 */
async function createSession(splitId, userId, { name, sort_order }) {
  const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2', [splitId, userId]);
  if (split.rows.length === 0) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [splitId, name, sort_order || 0]
  );
  return result.rows[0];
}

/**
 * Update session name & sort order.
 */
async function updateSession(sessionId, userId, { name, sort_order }) {
  const session = await pool.query(
    'SELECT ws.id FROM workout_sessions ws JOIN workout_splits sp ON ws.split_id = sp.id WHERE ws.id = $1 AND sp.user_id = $2',
    [sessionId, userId]
  );
  if (session.rows.length === 0) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    'UPDATE workout_sessions SET name = COALESCE($1, name), sort_order = COALESCE($2, sort_order) WHERE id = $3 RETURNING *',
    [name, sort_order, sessionId]
  );
  return result.rows[0];
}

/**
 * Get single session detail.
 */
async function getSessionDetail(sessionId, userId) {
  const result = await pool.query(
    `SELECT ws.*, s.name AS split_name, s.user_id AS split_owner_id
     FROM workout_sessions ws
     JOIN workout_splits s ON ws.split_id = s.id
     WHERE ws.id = $1 AND (
       s.user_id = $2
       OR
        (EXISTS (SELECT 1 FROM users WHERE id = s.user_id AND share_splits = true))
     )`,
    [sessionId, userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Delete session.
 */
async function deleteSession(sessionId, userId) {
  await pool.query(
    `DELETE FROM workout_sessions 
     WHERE id = $1 AND split_id IN (SELECT id FROM workout_splits WHERE user_id = $2)`,
    [sessionId, userId]
  );
}

/**
 * Get exercises for a session.
 */
async function getSessionExercises(sessionId, userId) {
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
    [sessionId, userId]
  );
  return result.rows;
}

/**
 * Add exercise to session.
 */
async function addExerciseToSession(sessionId, userId, data) {
  const { exercise_id, sets, reps, rest_time, sort_order } = data;
  const session = await pool.query(
    `SELECT ws.id FROM workout_sessions ws 
     JOIN workout_splits s ON ws.split_id = s.id 
     WHERE ws.id = $1 AND s.user_id = $2`,
    [sessionId, userId]
  );
  if (session.rows.length === 0) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }

  const result = await pool.query(
    'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [sessionId, exercise_id, sets || 3, reps || '8-12', rest_time || '60s', '0', sort_order || 0]
  );
  return result.rows[0];
}

/**
 * Delete exercise from session.
 */
async function deleteExerciseFromSession(exerciseSessionId, userId) {
  await pool.query(
    `DELETE FROM workout_session_exercises 
     WHERE id = $1 AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $2)`,
    [exerciseSessionId, userId]
  );
}

/**
 * Update exercise within session.
 * Supports partial updates; accepts sort_order and exercise_id (swap) too.
 */
async function updateExerciseInSession(exerciseSessionId, userId, { sets, reps, rest_time, weight, sort_order, exercise_id }) {
  const owner = await pool.query(
    `SELECT wse.id FROM workout_session_exercises wse
      JOIN workout_sessions ws ON ws.id = wse.session_id
      JOIN workout_splits s ON s.id = ws.split_id
      WHERE wse.id = $1 AND s.user_id = $2`,
    [exerciseSessionId, userId]
  );
  if (owner.rows.length === 0) return null;

  const setsArr = [];
  const params = [];
  if (sets !== undefined) { params.push(sets); setsArr.push(`sets = $${params.length}`); }
  if (reps !== undefined) { params.push(reps); setsArr.push(`reps = $${params.length}`); }
  if (rest_time !== undefined) { params.push(rest_time); setsArr.push(`rest_time = $${params.length}`); }
  if (weight !== undefined) { params.push(weight); setsArr.push(`weight = $${params.length}`); }
  if (sort_order !== undefined) { params.push(sort_order); setsArr.push(`sort_order = $${params.length}`); }
  if (exercise_id !== undefined) {
    const exCheck = await pool.query('SELECT id FROM exercises WHERE id = $1', [exercise_id]);
    if (exCheck.rows.length === 0) {
      const err = new Error('Exercise not found in library.');
      err.status = 404;
      throw err;
    }
    params.push(exercise_id);
    setsArr.push(`exercise_id = $${params.length}`);
  }
  if (!setsArr.length) {
    const cur = await pool.query('SELECT * FROM workout_session_exercises WHERE id = $1', [exerciseSessionId]);
    return cur.rows[0] || null;
  }
  params.push(exerciseSessionId, userId);
  const result = await pool.query(
    `UPDATE workout_session_exercises
      SET ${setsArr.join(', ')}
      WHERE id = $${params.length - 1} AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $${params.length})
      RETURNING *`,
    params
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Move an exercise row to another session (same split, owner only),
 * optionally at a specific position. Re-normalizes sort_order in both sessions.
 */
async function moveExerciseToSession(exerciseSessionId, userId, { to_session_id, sort_order }) {
  const owner = await pool.query(
    `SELECT wse.id, wse.session_id, ws.split_id FROM workout_session_exercises wse
      JOIN workout_sessions ws ON ws.id = wse.session_id
      JOIN workout_splits s ON s.id = ws.split_id
      WHERE wse.id = $1 AND s.user_id = $2`,
    [exerciseSessionId, userId]
  );
  if (owner.rows.length === 0) return null;
  const fromSessionId = owner.rows[0].session_id;
  const splitId = owner.rows[0].split_id;

  const dest = await pool.query(
    `SELECT ws.id FROM workout_sessions ws
      JOIN workout_splits s ON s.id = ws.split_id
      WHERE ws.id = $1 AND s.user_id = $2`,
    [to_session_id, userId]
  );
  if (dest.rows.length === 0) {
    const err = new Error('Destination session not found.');
    err.status = 404;
    throw err;
  }
  // Enforce same-split moves (cross-split moves would orphan programming).
  const destSplit = await pool.query('SELECT split_id FROM workout_sessions WHERE id = $1', [to_session_id]);
  if (destSplit.rows[0].split_id !== splitId) {
    const err = new Error('Can only move exercises within the same split.');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE workout_session_exercises SET session_id = $1 WHERE id = $2', [to_session_id, exerciseSessionId]);
    // Append at end or splice at position, then renormalize both sessions.
    const tgt = await client.query(
      'SELECT id FROM workout_session_exercises WHERE session_id = $1 AND id <> $2 ORDER BY sort_order ASC, id ASC',
      [to_session_id, exerciseSessionId]
    );
    const ids = tgt.rows.map(r => r.id);
    const pos = sort_order == null ? ids.length : Math.max(0, Math.min(Number(sort_order) || 0, ids.length));
    ids.splice(pos, 0, Number(exerciseSessionId));
    for (let i = 0; i < ids.length; i++) {
      await client.query('UPDATE workout_session_exercises SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
    }
    const src = await client.query(
      'SELECT id FROM workout_session_exercises WHERE session_id = $1 ORDER BY sort_order ASC, id ASC',
      [fromSessionId]
    );
    for (let i = 0; i < src.rows.length; i++) {
      await client.query('UPDATE workout_session_exercises SET sort_order = $1 WHERE id = $2', [i, src.rows[i].id]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  const moved = await pool.query('SELECT * FROM workout_session_exercises WHERE id = $1', [exerciseSessionId]);
  return moved.rows[0] || null;
}

/**
 * Duplicate a session (with all its exercises) inside the same split.
 */
async function duplicateSession(sessionId, userId, { name } = {}) {
  const src = await pool.query(
    `SELECT ws.* FROM workout_sessions ws
      JOIN workout_splits s ON s.id = ws.split_id
      WHERE ws.id = $1 AND s.user_id = $2`,
    [sessionId, userId]
  );
  if (src.rows.length === 0) return null;
  const source = src.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const maxRes = await client.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS nxt FROM workout_sessions WHERE split_id = $1', [source.split_id]);
    const created = await client.query(
      'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [source.split_id, name || `${source.name} (Copy)`, maxRes.rows[0].nxt]
    );
    const newSession = created.rows[0];
    const exRes = await client.query(
      'SELECT * FROM workout_session_exercises WHERE session_id = $1 ORDER BY sort_order ASC, id ASC',
      [sessionId]
    );
    for (const ex of exRes.rows) {
      await client.query(
        'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [newSession.id, ex.exercise_id, ex.sets, ex.reps, ex.rest_time, ex.weight, ex.sort_order]
      );
    }
    await client.query('COMMIT');
    return newSession;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Bulk layout update: reorder sessions and exercises atomically.
 * Body: { sessions: [{ id, sort_order, exercises?: [{ id, sort_order }] }] }
 */
async function updateSplitLayout(splitId, userId, { sessions }) {
  const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2', [splitId, userId]);
  if (split.rows.length === 0) {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
  if (!Array.isArray(sessions)) {
    const err = new Error('sessions must be an array.');
    err.status = 400;
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sessions) {
      if (s.id == null) continue;
      const own = await client.query('SELECT id FROM workout_sessions WHERE id = $1 AND split_id = $2', [s.id, splitId]);
      if (own.rows.length === 0) {
        throw Object.assign(new Error(`Session ${s.id} does not belong to this split.`), { status: 400 });
      }
      if (s.sort_order !== undefined) {
        await client.query('UPDATE workout_sessions SET sort_order = $1 WHERE id = $2', [s.sort_order, s.id]);
      }
      if (Array.isArray(s.exercises)) {
        for (const e of s.exercises) {
          if (e.id == null) continue;
          const exOwn = await client.query('SELECT id FROM workout_session_exercises WHERE id = $1 AND session_id = $2', [e.id, s.id]);
          if (exOwn.rows.length === 0) {
            throw Object.assign(new Error(`Exercise ${e.id} does not belong to session ${s.id}.`), { status: 400 });
          }
          if (e.sort_order !== undefined) {
            await client.query('UPDATE workout_session_exercises SET sort_order = $1 WHERE id = $2', [e.sort_order, e.id]);
          }
        }
      }
    }
    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get categories list for browser.
 */
async function getUniqueExerciseCategories() {
  const result = await pool.query('SELECT DISTINCT category FROM exercises ORDER BY category ASC');
  return result.rows.map(r => r.category);
}

/**
 * Get exercises by category.
 */
async function getExercisesByCategory(category, limit = 20, offset = 0) {
  const result = await pool.query(
    'SELECT * FROM exercises WHERE category = $1 ORDER BY name ASC LIMIT $2 OFFSET $3',
    [category, parseInt(limit), parseInt(offset)]
  );
  return result.rows;
}

/**
 * Search exercises.
 */
async function searchExercises(filters) {
  const { q, category, body_part, equipment, target, min_rating, sort_by = 'name', sort_order = 'asc', limit = 20, offset = 0 } = filters;
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
  return result.rows;
}

module.exports = {
  SPLIT_THEME_RULES,
  normalizePreviewText,
  getSplitThemePreference,
  pickSplitCoverImage,
  matchExercisesToLibrary,
  getSharedSplits,
  getSharedSplitDetail,
  cloneSharedSplit,
  getUserSplits,
  getSplitDetail,
  generateAiSplit,
  refineAiSplit,
  saveAiSplit,
  createSplit,
  updateSplit,
  deleteSplit,
  rateSplit,
  getSessionsForSplit,
  createSession,
  updateSession,
  getSessionDetail,
  deleteSession,
  getSessionExercises,
  addExerciseToSession,
  deleteExerciseFromSession,
  updateExerciseInSession,
  moveExerciseToSession,
  duplicateSession,
  updateSplitLayout,
  getUniqueExerciseCategories,
  getExercisesByCategory,
  searchExercises,
};
