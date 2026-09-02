const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { callAI } = require('../utils/ai');

// ── Helper: Format seconds to mm:ss ──────────────────────────────────────────
function formatTime(sec) {
  if (!sec) return '0m';
  const m = Math.floor(sec / 60);
  return `${m} min`;
}

// ── Helper: Build User Context Snapshot ──────────────────────────────────────
async function buildUserContextSnapshot(userId) {
  try {
    const [
      userRes,
      workoutsRes,
      mealsRes,
      weightRes,
      waterRes,
      splitsRes,
      mealPlanRes,
      reportsRes,
    ] = await Promise.all([
      // 1. User Profile
      pool.query(`
        SELECT id, username, full_name, email, age, gender, height, weight,
               fitness_goal, experience_level, activity_level, league_tier,
               total_xp, current_streak, body_fat, neck, waist, chest, arm, thigh
        FROM users WHERE id = $1
      `, [userId]),

      // 2. Last 5 Workouts
      pool.query(`
        SELECT id, title, status, total_duration_seconds, total_volume,
               calories_burned, post_workout_weight, water_intake_liters,
               streak_at_completion, notes,
               TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI') as completed_time
        FROM daily_workouts
        WHERE user_id = $1 AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 5
      `, [userId]),

      // 3. Last 7 Days of Meals
      pool.query(`
        SELECT m.id, m.meal_type, m.total_calories, m.total_protein,
               m.total_carbs, m.total_fat,
               TO_CHAR(m.logged_at, 'YYYY-MM-DD HH24:MI') as logged_time,
               STRING_AGG(mi.item_name || ' (' || mi.quantity || ')', ', ') as food_items
        FROM meals m
        LEFT JOIN meal_items mi ON m.id = mi.meal_id
        WHERE m.user_id = $1 AND m.logged_at >= NOW() - INTERVAL '7 days'
        GROUP BY m.id, m.meal_type, m.total_calories, m.total_protein, m.total_carbs, m.total_fat, m.logged_at
        ORDER BY m.logged_at DESC
        LIMIT 15
      `, [userId]),

      // 4. Weight Logs (Last 10 entries)
      pool.query(`
        SELECT weight, notes, TO_CHAR(logged_at, 'YYYY-MM-DD') as log_date
        FROM weight_logs
        WHERE user_id = $1
        ORDER BY logged_at DESC
        LIMIT 10
      `, [userId]),

      // 5. Water Logs (Last 7 days total & daily)
      pool.query(`
        SELECT TO_CHAR(logged_at, 'YYYY-MM-DD') as log_date, SUM(amount_ml) as total_ml
        FROM water_logs
        WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(logged_at, 'YYYY-MM-DD')
        ORDER BY log_date DESC
        LIMIT 7
      `, [userId]),

      // 6. Active Workout Splits
      pool.query(`
        SELECT id, name, description, template_goal, template_level, template_days
        FROM workout_splits
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 3
      `, [userId]),

      // 7. Nutrition Targets / Meal Recommendation
      pool.query(`
        SELECT calories_target, protein_target, carbs_target, fat_target,
               diet_type, food_preference, meals_per_day, bmi, bmi_category
        FROM meal_recommendations
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [userId]),

      // 8. Latest Workout Report
      pool.query(`
        SELECT wr.summary, wr.good_things, wr.areas_to_improve, wr.recommendations,
               TO_CHAR(wr.created_at, 'YYYY-MM-DD') as report_date
        FROM workout_reports wr
        WHERE wr.user_id = $1 AND wr.status = 'completed'
        ORDER BY wr.created_at DESC
        LIMIT 2
      `, [userId]),
    ]);

    const user = userRes.rows[0] || {};
    const workouts = workoutsRes.rows;

    // Fetch exercises for the recent workouts
    let workoutDetails = [];
    if (workouts.length > 0) {
      const workoutIds = workouts.map(w => w.id);
      const exRes = await pool.query(`
        SELECT dwe.daily_workout_id, e.name as exercise_name, e.target,
               dwe.best_set_weight, dwe.best_set_reps,
               COUNT(dws.id) as sets_count
        FROM daily_workout_exercises dwe
        JOIN exercises e ON dwe.exercise_id = e.id
        LEFT JOIN daily_workout_sets dws ON dws.daily_exercise_id = dwe.id
        WHERE dwe.daily_workout_id = ANY($1::int[]) AND dwe.is_skipped = false
        GROUP BY dwe.daily_workout_id, e.name, e.target, dwe.best_set_weight, dwe.best_set_reps, dwe.sort_order
        ORDER BY dwe.daily_workout_id, dwe.sort_order
      `, [workoutIds]);

      const exByWorkout = {};
      exRes.rows.forEach(ex => {
        if (!exByWorkout[ex.daily_workout_id]) exByWorkout[ex.daily_workout_id] = [];
        exByWorkout[ex.daily_workout_id].push(
          `${ex.exercise_name} (${ex.target}): ${ex.sets_count} sets, best ${ex.best_set_weight || 0}kg × ${ex.best_set_reps || 0} reps`
        );
      });

      workoutDetails = workouts.map(w => {
        const exs = exByWorkout[w.id] || [];
        return `• [${w.completed_time}] "${w.title}" | Duration: ${formatTime(w.total_duration_seconds)} | Volume: ${Math.round(w.total_volume || 0)}kg | Calories: ${w.calories_burned || 0} kcal\n  Exercises:\n    ${exs.length ? exs.join('\n    ') : 'None recorded'}`;
      });
    }

    // Format meals
    const mealLines = mealsRes.rows.map(m =>
      `• [${m.logged_time}] ${m.meal_type || 'Meal'}: ${Math.round(m.total_calories || 0)} kcal (P: ${Math.round(m.total_protein || 0)}g, C: ${Math.round(m.total_carbs || 0)}g, F: ${Math.round(m.total_fat || 0)}g) — Items: ${m.food_items || 'N/A'}`
    );

    // Format weights
    const weightLines = weightRes.rows.map(wt =>
      `• ${wt.log_date}: ${wt.weight} kg${wt.notes ? ` (${wt.notes})` : ''}`
    );

    // Format water
    const waterLines = waterRes.rows.map(w =>
      `• ${w.log_date}: ${(w.total_ml / 1000).toFixed(1)} L (${w.total_ml} ml)`
    );

    // Format splits
    const splitLines = splitsRes.rows.map(s =>
      `• ${s.name}: ${s.description || 'Custom routine'} (Goal: ${s.template_goal || 'General'}, Days: ${s.template_days || 'N/A'})`
    );

    const mealPlan = mealPlanRes.rows[0];
    const latestReport = reportsRes.rows[0];

    return `
===== USER PROFILE =====
• Name: ${user.full_name || user.username || 'Lifter'}
• Goal: ${user.fitness_goal || 'Fitness & Strength'}
• Experience: ${user.experience_level || 'Intermediate'} | Activity Level: ${user.activity_level || 'Moderate'}
• Age: ${user.age || 'N/A'} | Gender: ${user.gender || 'N/A'}
• Height: ${user.height || 'N/A'} cm | Current Weight: ${user.weight || 'N/A'} kg
• Body Fat: ${user.body_fat ? `${user.body_fat}%` : 'N/A'}
• Level / League: ${user.league_tier || 'Bronze'} (${user.total_xp || 0} XP)
• Workout Streak: ${user.current_streak || 0} days

===== NUTRITION TARGETS =====
${mealPlan ? `• Daily Target: ${mealPlan.calories_target || 'N/A'} kcal | Protein: ${mealPlan.protein_target || 'N/A'}g | Carbs: ${mealPlan.carbs_target || 'N/A'}g | Fats: ${mealPlan.fat_target || 'N/A'}g
• Diet Type: ${mealPlan.diet_type || 'Standard'} | Food Preference: ${mealPlan.food_preference || 'Balanced'} | BMI: ${mealPlan.bmi || 'N/A'} (${mealPlan.bmi_category || 'N/A'})` : 'No custom nutrition targets configured.'}

===== RECENT MEALS LOGGED (PAST 7 DAYS) =====
${mealLines.length ? mealLines.join('\n') : 'No meals logged recently.'}

===== RECENT COMPLETED WORKOUTS =====
${workoutDetails.length ? workoutDetails.join('\n\n') : 'No completed workouts yet.'}

===== WEIGHT LOG HISTORY =====
${weightLines.length ? weightLines.join('\n') : 'No weight logs recorded.'}

===== HYDRATION LOGS (PAST 7 DAYS) =====
${waterLines.length ? waterLines.join('\n') : 'No water logs recorded.'}

===== ACTIVE WORKOUT SPLITS / ROUTINES =====
${splitLines.length ? splitLines.join('\n') : 'No custom splits assigned.'}

===== LATEST COACHING REPORT =====
${latestReport ? `• Summary: ${latestReport.summary || 'N/A'}
• Strengths: ${latestReport.good_things || 'N/A'}
• Areas to Improve: ${latestReport.areas_to_improve || 'N/A'}
• Recommendations: ${latestReport.recommendations || 'N/A'}` : 'No previous coaching reports found.'}
    `.trim();
  } catch (err) {
    console.error('[buildUserContextSnapshot] Error:', err);
    return 'User profile and fitness history unavailable.';
  }
}

// ── POST /ai/chat ── Send a message to Coach Spotty ──────────────────────────
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, session_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let activeSessionId = session_id;

    // 1. If session_id provided, verify it belongs to user
    if (activeSessionId) {
      const sessCheck = await pool.query(
        'SELECT id, title FROM ai_sessions WHERE id = $1 AND user_id = $2',
        [activeSessionId, userId]
      );
      if (sessCheck.rows.length === 0) {
        activeSessionId = null; // create fresh session if invalid
      }
    }

    // 2. Create new session if none exists
    if (!activeSessionId) {
      const titleSnippet = message.trim().slice(0, 45) + (message.trim().length > 45 ? '…' : '');
      const newSess = await pool.query(
        'INSERT INTO ai_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title',
        [userId, titleSnippet]
      );
      activeSessionId = newSess.rows[0].id;
    }

    // 3. Save the user's message
    await pool.query(
      'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [activeSessionId, 'user', message.trim()]
    );

    // 4. Fetch recent conversation history for this session (up to last 6 messages)
    const historyRes = await pool.query(
      `SELECT role, content
       FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT 8`,
      [activeSessionId]
    );

    const historyMessages = historyRes.rows.map(m =>
      `${m.role === 'user' ? 'User' : 'Coach Spotty'}: ${m.content}`
    ).join('\n\n');

// ── Helper: Sanitize & Clean AI Output ───────────────────────────────────────
function sanitizeCleanText(text) {
  if (!text) return '';
  let cleaned = String(text);

  // Remove horizontal divider lines (---, ***, ___)
  cleaned = cleaned.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // Remove markdown header hashes (#, ##, ###, ####)
  cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');

  // Remove bold / italic asterisks and underscores (**word**, *word*, etc.)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // Convert bullet dashes/asterisks into clean bullet symbols
  cleaned = cleaned.replace(/^[ \t]*[-*+][ \t]+/gm, '• ');

  // Remove raw code backticks
  cleaned = cleaned.replace(/```[a-zA-Z]*\n?/g, '');
  cleaned = cleaned.replace(/```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Collapse excess blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

    // 5. Gather real-time database context snapshot
    const contextSnapshot = await buildUserContextSnapshot(userId);

    // 6. Build Master Coach Prompt
    const masterPrompt = `You are Coach Spotty, the elite master AI personal trainer, strength & conditioning coach, and sports nutritionist for the SpotMe fitness app.
You have COMPLETE, real-time access to the user's fitness profile, workout logs, nutrition logs, water intake, weight history, and active training splits.

===== YOUR MISSION & PERSONALITY =====
- Address the user directly as "you". Be motivating, sharp, scientific, empathetic, and relentlessly dedicated to their progress.
- ALWAYS cite their actual logged data (their weight, volume, recent exercises, calories, protein, hydration, streak) when relevant.
- When they ask about workouts, splits, diet plans, recovery, or weight progression, provide tailored, actionable advice based specifically on their logged numbers.
- Answer whatever they ask: workout adjustments, form cues, macronutrient splits, meal ideas, rest periods, progressive overload plans, or general fitness questions.

===== CRITICAL FORMATTING INSTRUCTIONS =====
- Do NOT use markdown symbols like hashtags (#, ##, ###), dashes (-), asterisks (* or **), or horizontal rules (---) in your response.
- Write in clean, beautifully spaced paragraphs.
- Put section titles naturally on their own line in plain text.
- Use natural numbers (1., 2.) for lists or steps.
- Make the output clean, polished, and human-readable without raw syntax characters.

===== LIVE USER DATABASE CONTEXT =====
${contextSnapshot}

===== RECENT CONVERSATION =====
${historyMessages}

User's Latest Message: "${message.trim()}"

Provide your expert coaching response now:`;

    // 7. Call AI Engine (OpenRouter -> Gemini -> Groq priority chain)
    const reply = await callAI(masterPrompt);

    const cleanReply = reply ? sanitizeCleanText(reply) : "I'm reviewing your workout stats! Keep up the great consistency and progressive overload.";

    // 8. Save assistant reply in database
    await pool.query(
      'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [activeSessionId, 'assistant', cleanReply]
    );

    // 9. Touch session updated_at
    const sessionRes = await pool.query(
      'UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1 RETURNING id, title',
      [activeSessionId]
    );

    res.json({
      session_id: activeSessionId,
      session_title: sessionRes.rows[0]?.title || 'Chat',
      reply: cleanReply,
    });
  } catch (err) {
    console.error('POST /ai/chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to process AI chat message' });
  }
});

// ── GET /ai/sessions ── List user's past AI chat sessions ───────────────────
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT s.id, s.title, s.created_at, s.updated_at,
             (SELECT content FROM ai_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM ai_messages WHERE session_id = s.id)::int as message_count
      FROM ai_sessions s
      WHERE s.user_id = $1
      ORDER BY s.updated_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /ai/sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// ── GET /ai/sessions/:id ── Get all messages for a session ─────────────────
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;

    const sessRes = await pool.query(
      'SELECT id, title, created_at, updated_at FROM ai_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (sessRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messagesRes = await pool.query(
      `SELECT id, role, content, created_at
       FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      session: sessRes.rows[0],
      messages: messagesRes.rows,
    });
  } catch (err) {
    console.error('GET /ai/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
});

// ── DELETE /ai/sessions/:id ── Delete a chat session ───────────────────────
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;

    await pool.query(
      'DELETE FROM ai_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    console.error('DELETE /ai/sessions/:id error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
