const { pool } = require('../../db');
const { callAI, extractJson } = require('../../utils/ai');
const aiTools = require('./ai-tools');

const CONFIRM_WORDS = /^(yes|yeah|yep|yup|confirm|confirm it|do it|proceed|go ahead|delete it|remove it|ok do it)\.?$/i;

function formatTime(sec) {
  if (!sec) return '0m';
  const m = Math.floor(sec / 60);
  return `${m} min`;
}

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

/**
 * Build User Context Snapshot from profile, workouts, meals, weights, water, splits.
 */
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
      pool.query(`
        SELECT id, username, full_name, email, age, gender, height, weight,
               fitness_goal, experience_level, activity_level, league_tier,
               total_xp, current_streak, body_fat, neck, waist, chest, arm, thigh
        FROM users WHERE id = $1
      `, [userId]),

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

      pool.query(`
        SELECT weight, notes, TO_CHAR(logged_at, 'YYYY-MM-DD') as log_date
        FROM weight_logs
        WHERE user_id = $1
        ORDER BY logged_at DESC
        LIMIT 10
      `, [userId]),

      pool.query(`
        SELECT TO_CHAR(logged_at, 'YYYY-MM-DD') as log_date, SUM(amount_ml) as total_ml
        FROM water_logs
        WHERE user_id = $1 AND logged_at >= NOW() - INTERVAL '7 days'
        GROUP BY TO_CHAR(logged_at, 'YYYY-MM-DD')
        ORDER BY log_date DESC
        LIMIT 7
      `, [userId]),

      pool.query(`
        SELECT id, name, description, template_goal, template_level, template_days
        FROM workout_splits
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 3
      `, [userId]),

      pool.query(`
        SELECT calories_target, protein_target, carbs_target, fat_target,
               diet_type, food_preference, meals_per_day, bmi, bmi_category
        FROM meal_recommendations
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [userId]),

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

    const mealLines = mealsRes.rows.map(m =>
      `• [${m.logged_time}] ${m.meal_type || 'Meal'}: ${Math.round(m.total_calories || 0)} kcal (P: ${Math.round(m.total_protein || 0)}g, C: ${Math.round(m.total_carbs || 0)}g, F: ${Math.round(m.total_fat || 0)}g) — Items: ${m.food_items || 'N/A'}`
    );

    const weightLines = weightRes.rows.map(wt =>
      `• ${wt.log_date}: ${wt.weight} kg${wt.notes ? ` (${wt.notes})` : ''}`
    );

    const waterLines = waterRes.rows.map(w =>
      `• ${w.log_date}: ${(w.total_ml / 1000).toFixed(1)} L (${w.total_ml} ml)`
    );

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

/**
 * Build a compact splits detail section so the regular chat (no split_id)
 * can still resolve split/session/exercise names to act on them.
 * Focused split (when chat is opened from a program screen) gets full
 * sets/reps detail; other recent splits get names only to bound tokens.
 */
async function buildSplitsDetailContext(userId, focusedSplitId) {
  try {
    const splitsRes = await pool.query(
      `SELECT id, name FROM workout_splits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    if (!splitsRes.rows.length) return '\n\n===== WORKOUT SPLITS DETAIL =====\nNo workout splits yet. Offer to build one (generateSplit needs days_per_week 1-7).';
    const lines = [];
    for (const s of splitsRes.rows) {
      const focused = focusedSplitId && Number(focusedSplitId) === Number(s.id);
      const sessRes = await pool.query(
        `SELECT id, name FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC, id ASC`,
        [s.id]
      );
      if (!sessRes.rows.length) {
        lines.push(`• Split #${s.id} "${s.name}"${focused ? ' [FOCUSED — user is viewing this]' : ''}: no days yet`);
        continue;
      }
      const dayLines = [];
      for (const sess of sessRes.rows) {
        const exRes = await pool.query(
          `SELECT wse.id AS wse_id, e.name, wse.sets, wse.reps, wse.rest_time, wse.weight
           FROM workout_session_exercises wse JOIN exercises e ON e.id = wse.exercise_id
           WHERE wse.session_id = $1 ORDER BY wse.sort_order ASC, wse.id ASC`,
          [sess.id]
        );
        if (focused) {
          const exDetail = exRes.rows.length
            ? exRes.rows.map(e => `${e.name} (#${e.wse_id}, ${e.sets}x${e.reps}, rest ${e.rest_time})`).join('; ')
            : 'empty';
          dayLines.push(`  - Day #${sess.id} "${sess.name}": ${exDetail}`);
        } else {
          const names = exRes.rows.length ? exRes.rows.map(e => e.name).join(', ') : 'empty';
          dayLines.push(`  - "${sess.name}": ${names}`);
        }
      }
      lines.push(`• Split #${s.id} "${s.name}"${focused ? ' [FOCUSED — user is viewing this, prefer it]' : ''}:\n${dayLines.join('\n')}`);
    }
    return `\n\n===== WORKOUT SPLITS DETAIL (act on these with tools; use exact names) =====\n${lines.join('\n')}`;
  } catch (e) {
    console.warn('[buildSplitsDetailContext] failed:', e.message);
    return '';
  }
}
/**
 * Send a message to Coach Spotty in AI chat.
 * Supports an agentic tool loop for workout splits: the model may emit a
 * JSON tool envelope (```tool {"tool": "...", "args": {...}}```), which is
 * validated and executed server-side (scoped to the JWT user). Non-destructive
 * writes run immediately; destructive ones create a pending action the user
 * confirms via POST /ai/actions/confirm or a "yes" follow-up.
 * Returns { session_id, session_title, reply, actions[] } — actions is
 * additive so older app versions keep working on `reply` alone.
 */
async function sendChatMessage(userId, { message, session_id, split_id } = {}) {
  let activeSessionId = session_id;

  if (activeSessionId) {
    const sessCheck = await pool.query(
      'SELECT id, title FROM ai_sessions WHERE id = $1 AND user_id = $2',
      [activeSessionId, userId]
    );
    if (sessCheck.rows.length === 0) {
      activeSessionId = null;
    }
  }

  if (!activeSessionId) {
    const titleSnippet = message.trim().slice(0, 45) + (message.trim().length > 45 ? '…' : '');
    const newSess = await pool.query(
      'INSERT INTO ai_sessions (user_id, title) VALUES ($1, $2) RETURNING id, title',
      [userId, titleSnippet]
    );
    activeSessionId = newSess.rows[0].id;
  }

  await pool.query(
    'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
    [activeSessionId, 'user', message.trim()]
  );

  // "Yes" fast-path: user confirming a pending destructive action.
  if (CONFIRM_WORDS.test(message.trim())) {
    const pendings = await aiTools.listPending(activeSessionId, userId);
    if (pendings.length === 1) {
      const p = pendings[0];
      const outcome = await runConfirmedTool(userId, activeSessionId, p.token, true);
      return outcome;
    }
    if (pendings.length > 1) {
      const reply = 'Which change should I apply? ' + pendings.map(p => `"${p.label}"`).join(' / ') + ' — tap Confirm on the right one, or tell me by name.';
      const cleanReply = sanitizeCleanText(reply);
      await pool.query(
        'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
        [activeSessionId, 'assistant', cleanReply]
      );
      const sessionRes = await pool.query(
        'UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1 RETURNING id, title',
        [activeSessionId]
      );
      return {
        session_id: activeSessionId,
        session_title: sessionRes.rows[0]?.title || 'Chat',
        reply: cleanReply,
        actions: pendings.map(p => ({ kind: 'pending', label: p.label, confirmToken: p.token, tool: p.tool_name })),
      };
    }
  }

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

  const contextSnapshot = await buildUserContextSnapshot(userId);

  // Splits detail is ALWAYS included so the regular chat can act on splits
  // without being opened from a program screen. Focused split gets full stats.
  const splitsDetailSection = await buildSplitsDetailContext(userId, split_id);

  const toolSpec = aiTools.toolPromptSpec();

  const masterPrompt = `You are Coach Spotty, the elite master AI personal trainer, strength & conditioning coach, and sports nutritionist for the SpotMe fitness app.
You have COMPLETE, real-time access to the user's fitness profile, workout logs, nutrition logs, water intake, weight history, and active training splits.
You can also ACT on workout splits via tools — read the tool spec and use it whenever the user asks to create, view, change, or organize splits, days, or exercises.

===== YOUR MISSION & PERSONALITY =====
- Address the user directly as "you". Be motivating, sharp, scientific, empathetic, and relentlessly dedicated to their progress.
- ALWAYS cite their actual logged data (their weight, volume, recent exercises, calories, protein, hydration, streak) when relevant.
- When they ask about workouts, splits, diet plans, recovery, or weight progression, provide tailored, actionable advice based specifically on their logged numbers.
- Answer whatever they ask: workout adjustments, form cues, macronutrient splits, meal ideas, rest periods, progressive overload plans, or general fitness questions.

===== SPLIT TOOL USE (provider-agnostic JSON envelope) =====
Available tools (arguments marked * are required):
${toolSpec}

Rules:
- To act, reply with ONLY fenced blocks, one per tool (several allowed per reply): \`\`\`tool {"tool": "<name>", "args": {...}}\`\`\` and nothing else. NEVER use <toolcall> tags or any other format.
- Prefer reads first when the target is ambiguous (listSplits, getSplit, searchExercises) before writing.
- Refer to splits/sessions/exercises by the exact names from context; ids also accepted.
- NEVER emit deleteSplit, deleteSession, or removeExercise expecting execution — the server will ask the user to confirm instead. Propose the deletion in words.
- When no tool is needed, answer in plain coaching prose (no envelope).
- After tool results arrive, summarize what changed in 1-3 short sentences plus the deep facts (sets x reps).

===== CRITICAL FORMATTING INSTRUCTIONS =====
- Do NOT use markdown symbols like hashtags (#, ##, ###), dashes (-), asterisks (* or **), or horizontal rules (---) in your response.
- Write in clean, beautifully spaced paragraphs.
- Put section titles naturally on their own line in plain text.
- Use natural numbers (1., 2.) for lists or steps.
- Make the output clean, polished, and human-readable without raw syntax characters.

===== LIVE USER DATABASE CONTEXT =====
${contextSnapshot}${splitsDetailSection}

===== RECENT CONVERSATION =====
${historyMessages}

User's Latest Message: "${message.trim()}"

Provide your expert coaching response now (tool envelope or prose):`;

  // Agentic loop: tool envelopes → validate → execute → feed results → final prose.
  // Multiple envelopes per reply are executed in order (cap 3 per round).
  const actions = [];
  let toolTranscript = '';
  let reply = null;

  for (let round = 0; round < 4; round++) {
    const prompt = toolTranscript
      ? `${masterPrompt}\n\n===== TOOL RESULTS SO FAR =====\n${toolTranscript}\n\nContinue: emit more tool envelopes if more action is needed, otherwise give the final coaching answer in prose (no envelope, no tags).`
      : masterPrompt;
    // 'coach_chat' is the task key for the AI Coach (Spotty) conversation feature.
    const raw = await callAI(prompt, null, 'coach_chat');
    const envelopes = parseToolEnvelopes(raw).slice(0, 3);
    if (!envelopes.length) {
      reply = raw;
      break;
    }
    let hitPending = false;
    for (const envelope of envelopes) {
      const { tool, args } = envelope;
      if (!aiTools.TOOL_DEFS[tool]) {
        toolTranscript += `\nTool ${tool} result: ERROR — unknown tool. Available: ${Object.keys(aiTools.TOOL_DEFS).join(', ')}.`;
        continue;
      }
      if (aiTools.TOOL_DEFS[tool].destructive) {
        const label = describePendingTool(tool, args);
        const token = await aiTools.createPending(activeSessionId, userId, tool, args, label);
        await aiTools.logTool(activeSessionId, userId, tool, args, 'pending', label);
        actions.push({ kind: 'pending', label, confirmToken: token, tool });
        toolTranscript += `\nTool ${tool} result: PENDING USER CONFIRMATION ("${label}"). Ask the user to confirm in words.`;
        hitPending = true;
        break;
      }
      try {
        const outcome = await aiTools.executeTool(userId, activeSessionId, tool, args || {});
        await aiTools.logTool(activeSessionId, userId, tool, args || {}, 'ok', outcome.summary);
        if (outcome.action) actions.push(outcome.action);
        toolTranscript += `\nTool ${tool} result: OK — ${outcome.summary}`;
      } catch (e) {
        const msg = e.message || 'Tool failed.';
        await aiTools.logTool(activeSessionId, userId, tool, args || {}, 'error', msg);
        toolTranscript += `\nTool ${tool} result: ERROR — ${msg} Fix the args (use listSplits/getSplit/searchExercises to resolve names) or explain to the user.`;
      }
    }
    if (hitPending) {
      // Ask for confirmation now rather than chaining more tools.
      const confirmAsk = await callAI(
        `${masterPrompt}\n\n===== TOOL RESULTS SO FAR =====\n${toolTranscript}\n\nNow ask the user to confirm the pending action in one short paragraph (no tool envelope, no tags). Tell them to tap Confirm or reply yes.`,
        null,
        'coach_chat'
      );
      reply = confirmAsk;
      break;
    }
  }

  if (!reply) {
    // Loop exhausted on tools without prose — summarize from transcript.
    const fallback = await callAI(
      `${masterPrompt}\n\n===== TOOL RESULTS SO FAR =====\n${toolTranscript}\n\nGive the final coaching answer in prose now (no tool envelope, no tags), summarizing what was done.`,
      null,
      'coach_chat'
    );
    reply = fallback;
  }

  const cleanReply = reply ? sanitizeCleanText(stripToolBlocks(reply)) : "I'm reviewing your workout stats! Keep up the great consistency and progressive overload.";

  await pool.query(
    'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
    [activeSessionId, 'assistant', cleanReply]
  );

  const sessionRes = await pool.query(
    'UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1 RETURNING id, title',
    [activeSessionId]
  );

  return {
    session_id: activeSessionId,
    session_title: sessionRes.rows[0]?.title || 'Chat',
    reply: cleanReply,
    actions,
  };
}

/**
 * parseToolEnvelopes(raw)
 * Accepts (possibly multiple per reply):
 *  1. Fenced JSON: ```tool {"tool": "name", "args": {...}}```
 *  2. Bare JSON object with {tool|name, args}
 *  3. XML-ish tags the models often prefer:
 *     <toolcall>toolName <argkey>k</argkey> <argvalue>v</argvalue> ... </toolcall>
 * Returns [{ tool, args }] (empty array = prose answer).
 */
function parseToolEnvelopes(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const found = [];

  // 3. <toolcall> blocks first (strip them from JSON attempts later).
  let scrubbed = raw;
  const tagRe = /<toolcall>\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([\s\S]*?)<\/toolcall>/gi;
  let m;
  while ((m = tagRe.exec(raw)) !== null) {
    const tool = m[1].trim();
    const body = m[2] || '';
    const args = {};
    const argRe = /<argkey>\s*([\s\S]*?)\s*<\/argkey>\s*<argvalue>\s*([\s\S]*?)\s*<\/argvalue>/gi;
    let a;
    while ((a = argRe.exec(body)) !== null) {
      const k = a[1].trim();
      let v = a[2].trim();
      // Coerce obvious numbers/arrays.
      if (/^-?\d+$/.test(v)) v = Number(v);
      else if (/^\[.*\]$/.test(v)) { try { v = JSON.parse(v); } catch (_) {} }
      if (k) args[k] = v;
    }
    if (tool) found.push({ tool, args });
  }
  scrubbed = raw.replace(tagRe, ' ').trim();

  // 1. Fenced ```tool blocks (possibly multiple).
  const fenceRe = /```tool\s*([\s\S]*?)```/gi;
  while ((m = fenceRe.exec(scrubbed)) !== null) {
    const parsed = tryParseJsonObject(m[1].trim());
    if (parsed) found.push(parsed);
  }
  scrubbed = scrubbed.replace(fenceRe, ' ').trim();

  // 2. Bare JSON object (whole reply or embedded).
  if (!found.length) {
    const parsed = tryParseJsonObject(scrubbed);
    if (parsed) found.push(parsed);
  }
  return found;
}

function tryParseJsonObject(text) {
  if (!text) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = extractJson(text);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const tool = parsed.tool || parsed.name;
  if (typeof tool !== 'string' || !tool.trim()) return null;
  const args = parsed.args && typeof parsed.args === 'object' && !Array.isArray(parsed.args) ? parsed.args : {};
  return { tool: tool.trim(), args };
}

/**
 * parseToolEnvelope(raw) — single-envelope compat wrapper.
 */
function parseToolEnvelope(raw) {
  const all = parseToolEnvelopes(raw);
  return all.length ? all[0] : null;
}

/**
 * stripToolBlocks(text) — removes any tool envelopes so they never leak
 * into user-visible chat bubbles.
 */
function stripToolBlocks(text) {
  if (!text) return text;
  return String(text)
    .replace(/<toolcall>[\s\S]*?<\/toolcall>/gi, ' ')
    .replace(/```tool[\s\S]*?```/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function describePendingTool(tool, args = {}) {
  const a = args || {};
  if (tool === 'deleteSplit') return `Delete split "${a.split}" and all its days`;
  if (tool === 'deleteSession') return `Delete day "${a.session}" from "${a.split}"`;
  if (tool === 'removeExercise') return `Remove "${a.exercise}" from "${a.session}"`;
  return `${tool} ${JSON.stringify(a).slice(0, 120)}`;
}

/**
 * runConfirmedTool(userId, sessionId, token, confirmed)
 * Executes (or discards) a pending destructive action.
 */
async function runConfirmedTool(userId, sessionId, token, confirmed) {
  const pending = await aiTools.consumePending(token, userId);
  if (!pending) {
    const err = new Error('That confirmation expired or was already used. Please ask again.');
    err.status = 404;
    throw err;
  }
  // Verify the pending belongs to this session.
  if (pending.session_id !== sessionId) {
    const err = new Error('Confirmation does not belong to this chat.');
    err.status = 403;
    throw err;
  }
  let reply;
  const actions = [];
  if (!confirmed) {
    await aiTools.logTool(sessionId, userId, pending.tool_name, pending.args, 'cancelled', `User cancelled: ${pending.label}`);
    reply = `Understood — I left "${pending.label}" undone. Nothing changed.`;
  } else {
    try {
      const outcome = await aiTools.executeTool(userId, sessionId, pending.tool_name, { ...(pending.args || {}), _confirmed: true });
      await aiTools.logTool(sessionId, userId, pending.tool_name, pending.args, 'ok', outcome.summary);
      if (outcome.action) actions.push(outcome.action);
      reply = `${outcome.summary} Done.`;
    } catch (e) {
      const msg = e.message || 'Action failed.';
      await aiTools.logTool(sessionId, userId, pending.tool_name, pending.args, 'error', msg);
      reply = `I couldn't complete "${pending.label}": ${msg}`;
    }
  }
  const cleanReply = sanitizeCleanText(reply);
  await pool.query(
    'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3)',
    [sessionId, 'assistant', cleanReply]
  );
  const sessionRes = await pool.query(
    'UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1 RETURNING id, title',
    [sessionId]
  );
  return {
    session_id: sessionId,
    session_title: sessionRes.rows[0]?.title || 'Chat',
    reply: cleanReply,
    actions,
  };
}

/**
 * List user's AI chat sessions.
 */
async function getChatSessions(userId) {
  const result = await pool.query(`
    SELECT s.id, s.title, s.created_at, s.updated_at,
           (SELECT content FROM ai_messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT COUNT(*) FROM ai_messages WHERE session_id = s.id)::int as message_count
    FROM ai_sessions s
    WHERE s.user_id = $1
    ORDER BY s.updated_at DESC
  `, [userId]);
  return result.rows;
}

/**
 * Get all messages for an AI chat session.
 */
async function getSessionMessages(userId, sessionId) {
  const sessRes = await pool.query(
    'SELECT id, title, created_at, updated_at FROM ai_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  if (sessRes.rows.length === 0) return null;

  const messagesRes = await pool.query(
    `SELECT id, role, content, created_at
     FROM ai_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return {
    session: sessRes.rows[0],
    messages: messagesRes.rows,
  };
}

/**
 * Delete a chat session.
 */
async function deleteChatSession(userId, sessionId) {
  await pool.query(
    'DELETE FROM ai_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
}

module.exports = {
  formatTime,
  sanitizeCleanText,
  buildUserContextSnapshot,
  sendChatMessage,
  getChatSessions,
  getSessionMessages,
  deleteChatSession,
  runConfirmedTool,
  parseToolEnvelope,
};
