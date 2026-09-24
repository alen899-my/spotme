'use strict';

const { pool } = require('../../db');

// ── Muscle Slug Mappings & Intensity Decay Constants ─────────────────────────
const TO_SLUG = {
  abductors: 'abductors',
  abs: 'abs',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calves',
  delts: 'deltoids',
  forearms: 'forearm',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  lats: 'upper-back',
  'levator scapulae': 'trapezius',
  pectorals: 'chest',
  quads: 'quadriceps',
  'serratus anterior': 'chest',
  spine: 'lower-back',
  traps: 'trapezius',
  triceps: 'triceps',
  'upper back': 'upper-back',
  back: 'upper-back',
  chest: 'chest',
  'lower arms': 'forearm',
  'lower legs': 'calves',
  neck: 'neck',
  shoulders: 'deltoids',
  'upper arms': 'biceps',
  'upper legs': 'quadriceps',
  waist: 'abs',
  abdominals: 'abs',
  'ankle stabilizers': 'ankles',
  ankles: 'ankles',
  core: 'abs',
  deltoids: 'deltoids',
  hands: 'hands',
  'hip flexors': 'abs',
  'latissimus dorsi': 'upper-back',
  'lower back': 'lower-back',
  obliques: 'obliques',
  quadriceps: 'quadriceps',
  rhomboids: 'upper-back',
  'rotator cuff': 'deltoids',
  soleus: 'calves',
  trapezius: 'trapezius',
  'wrist extensors': 'forearm',
  'wrist flexors': 'forearm',
  wrists: 'forearm',
};

const SLUG_LABELS = {
  chest: 'Chest',
  'upper-back': 'Upper Back',
  'lower-back': 'Lower Back',
  deltoids: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  gluteal: 'Glutes',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  calves: 'Calves',
  trapezius: 'Traps',
  neck: 'Neck',
  adductors: 'Adductors',
  abductors: 'Abductors',
  ankles: 'Ankles',
  hands: 'Hands',
  tibialis: 'Tibialis',
  knees: 'Knees',
  feet: 'Feet',
};

const THRESHOLDS = Array.from({ length: 50 }, (_, idx) => {
  const i = idx + 1;
  return Math.round((0.5 + 0.1 * i + 0.118 * i * i) * 10) / 10;
});

/**
 * Returns comprehensive workout analytics (36+ insights) across:
 * - Volume & Tonnage
 * - Frequency, Consistency & Adherence
 * - Duration, Time & Pacing
 * - Sets, Reps & Exercise Execution
 * - Strength, Progression & PRs
 * - Physiology, Bio-Metrics & Recovery
 * - Body Muscle Heat Map & Intensity
 *
 * Supports:
 * - userId: optional (if omitted or null -> global aggregated platform mode)
 * - range: '7d' | '30d' | '90d' | '1y' | 'all' (default: '30d')
 */
async function getWorkoutAnalytics({ userId = null, range = '30d', tz = 'UTC' }) {
  // Validate and sanitize local timezone
  const safeTz = typeof tz === 'string' && /^[a-zA-Z0-9_\-\/+]+$/.test(tz) ? tz : 'UTC';

  // Date filter clause
  let intervalClause = '';
  if (range === '7d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '7 days'";
  else if (range === '30d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '30 days'";
  else if (range === '90d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '90 days'";
  else if (range === '1y') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '1 year'";
  // 'all' has no interval clause

  const userParam = userId ? parseInt(userId, 10) : null;
  const userCondition = userParam ? 'AND dw.user_id = $1' : '';
  const queryParams = userParam ? [userParam] : [];

  // 1. Fetch Selected User Info (if userParam)
  let selectedUser = null;
  if (userParam) {
    const userRes = await pool.query(
      `SELECT id, full_name, email, profile_pic_url, gender, weight AS weight_kg, height AS height_cm, fitness_goal, experience_level, current_streak, total_xp, level, created_at
       FROM users WHERE id = $1`,
      [userParam]
    );
    selectedUser = userRes.rows[0] || null;
  }

  // 2. Core Workout KPIs & Aggregates
  const coreStatsQuery = `
    SELECT
      COUNT(dw.id)::int AS total_workouts,
      COUNT(CASE WHEN dw.status = 'completed' THEN 1 END)::int AS completed_workouts,
      COUNT(CASE WHEN dw.status = 'active' THEN 1 END)::int AS active_workouts,
      COUNT(CASE WHEN dw.status = 'cancelled' OR dw.status = 'abandoned' THEN 1 END)::int AS abandoned_workouts,
      COALESCE(SUM(dw.total_volume), 0)::numeric AS total_volume_kg,
      COALESCE(AVG(CASE WHEN dw.total_volume > 0 THEN dw.total_volume END), 0)::numeric AS avg_volume_kg,
      COALESCE(SUM(dw.total_duration_seconds), 0)::int AS total_duration_seconds,
      COALESCE(AVG(CASE WHEN dw.total_duration_seconds > 0 THEN dw.total_duration_seconds END), 0)::int AS avg_duration_seconds,
      COALESCE(SUM(dw.total_rest_seconds), 0)::int AS total_rest_seconds,
      COALESCE(AVG(CASE WHEN dw.total_rest_seconds > 0 THEN dw.total_rest_seconds END), 0)::int AS avg_rest_seconds,
      COALESCE(SUM(dw.calories_burned), 0)::int AS total_calories_burned,
      COALESCE(AVG(CASE WHEN dw.calories_burned > 0 THEN dw.calories_burned END), 0)::numeric AS avg_calories_burned,
      COALESCE(AVG(CASE WHEN dw.workout_met > 0 THEN dw.workout_met END), 0)::numeric AS avg_met,
      COALESCE(SUM(dw.water_intake_liters), 0)::numeric AS total_water_liters,
      COALESCE(AVG(CASE WHEN dw.water_intake_liters > 0 THEN dw.water_intake_liters END), 0)::numeric AS avg_water_liters,
      COALESCE(AVG(dw.rating), 0)::numeric AS avg_rating,
      COUNT(CASE WHEN dw.rating IS NOT NULL THEN 1 END)::int AS total_ratings_count,
      MAX(dw.streak_at_completion)::int AS max_streak_recorded,
      MAX(dw.completed_at) AS last_workout_at
    FROM daily_workouts dw
    WHERE 1=1 ${userCondition} ${intervalClause}
  `;

  // 3. Sets & Reps Aggregation
  const setsRepsQuery = `
    SELECT
      COUNT(dws.id)::int AS total_sets,
      COALESCE(SUM(dws.reps), 0)::int AS total_reps,
      COALESCE(AVG(dws.reps), 0)::numeric AS avg_reps_per_set,
      COALESCE(AVG(dws.weight), 0)::numeric AS avg_weight_per_set,
      COALESCE(AVG(dws.duration_seconds), 0)::int AS avg_set_duration_seconds,
      COALESCE(SUM(dws.duration_seconds), 0)::int AS total_tut_seconds,
      COUNT(CASE WHEN dws.reps BETWEEN 1 AND 5 THEN 1 END)::int AS sets_power_1_5,
      COUNT(CASE WHEN dws.reps BETWEEN 6 AND 12 THEN 1 END)::int AS sets_hypertrophy_6_12,
      COUNT(CASE WHEN dws.reps >= 13 THEN 1 END)::int AS sets_endurance_13_plus,
      COUNT(CASE WHEN dws.is_skipped = TRUE THEN 1 END)::int AS skipped_sets
    FROM daily_workout_sets dws
    JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    WHERE 1=1 ${userCondition} ${intervalClause}
  `;

  // 4. Exercises Count & Variety
  const exercisesStatsQuery = `
    SELECT
      COUNT(dwe.id)::int AS total_exercises_performed,
      COUNT(DISTINCT dwe.exercise_id)::int AS unique_exercises_count,
      COUNT(CASE WHEN dwe.is_skipped = TRUE THEN 1 END)::int AS skipped_exercises_count,
      COUNT(CASE WHEN dwe.is_personal_record = TRUE THEN 1 END)::int AS total_prs_hit,
      COALESCE(AVG(dwe.target_sets), 0)::numeric AS avg_target_sets,
      COALESCE(AVG(dwe.estimated_1rm), 0)::numeric AS avg_estimated_1rm
    FROM daily_workout_exercises dwe
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    WHERE 1=1 ${userCondition} ${intervalClause}
  `;

  // 5. Timeline / Progression Trend (Grouped by local date)
  const timelineQuery = `
    SELECT
      TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD') AS date,
      COUNT(dw.id)::int AS workouts_count,
      COALESCE(SUM(dw.total_volume), 0)::numeric AS volume_kg,
      COALESCE(SUM(dw.total_duration_seconds) / 60.0, 0)::numeric AS duration_minutes,
      COALESCE(SUM(dw.calories_burned), 0)::int AS calories,
      COALESCE(AVG(dw.workout_met), 0)::numeric AS avg_met,
      COUNT(dwe_sub.pr_count)::int AS prs_count
    FROM daily_workouts dw
    LEFT JOIN (
      SELECT daily_workout_id, COUNT(*)::int AS pr_count
      FROM daily_workout_exercises
      WHERE is_personal_record = TRUE
      GROUP BY daily_workout_id
    ) dwe_sub ON dw.id = dwe_sub.daily_workout_id
    WHERE dw.status = 'completed' ${userCondition} ${intervalClause}
    GROUP BY TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD')
    ORDER BY date ASC
    LIMIT 90
  `;

  // 6. Muscle Group / Body Part Volume Distribution
  const muscleDistributionQuery = `
    SELECT
      COALESCE(e.body_part, 'Other') AS body_part,
      COALESCE(e.target, 'General') AS target_muscle,
      COUNT(dwe.id)::int AS exercises_count,
      COALESCE(SUM(dwe.total_set_volume), 0)::numeric AS total_volume_kg,
      COUNT(CASE WHEN dwe.is_personal_record = TRUE THEN 1 END)::int AS prs_count
    FROM daily_workout_exercises dwe
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    JOIN exercises e ON dwe.exercise_id = e.id
    WHERE 1=1 ${userCondition} ${intervalClause}
    GROUP BY e.body_part, e.target
    ORDER BY total_volume_kg DESC
    LIMIT 12
  `;

  // 7. Day of Week Distribution in Local Time (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  const dayOfWeekQuery = `
    SELECT
      EXTRACT(DOW FROM (((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))::int AS day_num,
      COUNT(dw.id)::int AS workouts_count,
      COALESCE(SUM(dw.total_volume), 0)::numeric AS total_volume_kg,
      COALESCE(AVG(dw.total_duration_seconds) / 60.0, 0)::numeric AS avg_duration_minutes
    FROM daily_workouts dw
    WHERE 1=1 ${userCondition} ${intervalClause}
    GROUP BY EXTRACT(DOW FROM (((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))
    ORDER BY day_num ASC
  `;

  // 8. Hour of Day / Circadian Spectrum in Local Time (0 to 23)
  const hourOfDayQuery = `
    SELECT
      EXTRACT(HOUR FROM (((COALESCE(dw.started_at, dw.completed_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))::int AS hour_num,
      COUNT(dw.id)::int AS workouts_count
    FROM daily_workouts dw
    WHERE 1=1 ${userCondition} ${intervalClause}
    GROUP BY EXTRACT(HOUR FROM (((COALESCE(dw.started_at, dw.completed_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))
    ORDER BY hour_num ASC
  `;

  // 15. Body Part & Muscle Heat Map Query (45-Day Exponential Decay)
  const muscleHeatMapQuery = `
    SELECT
      e.target,
      e.body_part,
      e.category,
      DATE(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')) AS workout_date,
      COUNT(DISTINCT dwe.id)::int AS exercise_count,
      COUNT(dws.id)::int AS total_sets,
      COALESCE(SUM(dws.weight * dws.reps), 0)::numeric AS total_volume
    FROM daily_workout_exercises dwe
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    JOIN exercises e ON dwe.exercise_id = e.id
    LEFT JOIN daily_workout_sets dws ON dws.daily_exercise_id = dwe.id AND COALESCE(dws.is_skipped, false) = false
    WHERE dw.status = 'completed' ${userCondition} ${intervalClause}
    GROUP BY e.target, e.body_part, e.category, DATE(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'))
  `;

  // 9. Set-by-Set Fatigue Decay (Average tonnage across Set 1, 2, 3, 4, 5+)
  const fatigueDecayQuery = `
    SELECT
      dws.set_number,
      COALESCE(AVG(dws.weight * dws.reps), 0)::numeric AS avg_set_volume,
      COALESCE(AVG(dws.weight), 0)::numeric AS avg_weight,
      COALESCE(AVG(dws.reps), 0)::numeric AS avg_reps,
      COUNT(dws.id)::int AS sets_count
    FROM daily_workout_sets dws
    JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    WHERE dws.is_skipped = FALSE AND dws.set_number BETWEEN 1 AND 6 ${userCondition} ${intervalClause}
    GROUP BY dws.set_number
    ORDER BY dws.set_number ASC
  `;

  // 10. Top PR Records & Exercises
  const topPrsQuery = `
    SELECT
      dwe.exercise_id,
      e.name AS exercise_name,
      e.body_part,
      COALESCE(MAX(dwe.best_set_weight), 0)::numeric AS max_weight_kg,
      COALESCE(MAX(dwe.estimated_1rm), 0)::numeric AS max_estimated_1rm,
      COALESCE(SUM(dwe.total_set_volume), 0)::numeric AS total_volume_kg,
      COUNT(CASE WHEN dwe.is_personal_record = TRUE THEN 1 END)::int AS prs_count
    FROM daily_workout_exercises dwe
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    JOIN exercises e ON dwe.exercise_id = e.id
    WHERE 1=1 ${userCondition} ${intervalClause}
    GROUP BY dwe.exercise_id, e.name, e.body_part
    ORDER BY max_estimated_1rm DESC
    LIMIT 8
  `;

  // 11. Most Skipped / Abandoned Exercises
  const skippedExercisesQuery = `
    SELECT
      e.name AS exercise_name,
      e.body_part,
      COUNT(CASE WHEN dwe.is_skipped = TRUE THEN 1 END)::int AS skipped_count,
      COUNT(dwe.id)::int AS total_scheduled_count
    FROM daily_workout_exercises dwe
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    JOIN exercises e ON dwe.exercise_id = e.id
    WHERE 1=1 ${userCondition} ${intervalClause}
    GROUP BY e.name, e.body_part
    HAVING COUNT(CASE WHEN dwe.is_skipped = TRUE THEN 1 END) > 0
    ORDER BY skipped_count DESC
    LIMIT 6
  `;

  // 12. Subjective Session Ratings Distribution (1 to 5 stars)
  const ratingsDistributionQuery = `
    SELECT
      COALESCE(dw.rating, 0)::int AS rating_score,
      COUNT(dw.id)::int AS count
    FROM daily_workouts dw
    WHERE dw.rating IS NOT NULL ${userCondition} ${intervalClause}
    GROUP BY dw.rating
    ORDER BY rating_score ASC
  `;

  // 13. AI Workout Reports Synthesis (recent good_things & recommendations)
  const aiReportsQuery = `
    SELECT
      wr.id,
      wr.user_id,
      u.full_name AS athlete_name,
      wr.daily_workout_id,
      wr.summary,
      wr.good_things,
      wr.areas_to_improve,
      wr.recommendations,
      wr.created_at
    FROM workout_reports wr
    JOIN users u ON wr.user_id = u.id
    JOIN daily_workouts dw ON wr.daily_workout_id = dw.id
    WHERE 1=1 ${userCondition} ${intervalClause}
    ORDER BY wr.created_at DESC
    LIMIT 5
  `;

  // 14. Users List for Quick Selector
  const usersListQuery = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.profile_pic_url,
      u.gender,
      COUNT(dw.id)::int AS workouts_count,
      MAX(dw.completed_at) AS last_active_at
    FROM users u
    LEFT JOIN daily_workouts dw ON u.id = dw.user_id AND dw.status = 'completed'
    GROUP BY u.id, u.full_name, u.email, u.profile_pic_url, u.gender
    ORDER BY workouts_count DESC, u.id ASC
    LIMIT 50
  `;

  // Execute all analytical queries in parallel
  const [
    coreStatsRes,
    setsRepsRes,
    exercisesStatsRes,
    timelineRes,
    muscleDistRes,
    dowRes,
    hodRes,
    fatigueDecayRes,
    topPrsRes,
    skippedExRes,
    ratingsDistRes,
    aiReportsRes,
    usersListRes,
    muscleHeatMapRes,
  ] = await Promise.all([
    pool.query(coreStatsQuery, queryParams),
    pool.query(setsRepsQuery, queryParams),
    pool.query(exercisesStatsQuery, queryParams),
    pool.query(timelineQuery, queryParams),
    pool.query(muscleDistributionQuery, queryParams),
    pool.query(dayOfWeekQuery, queryParams),
    pool.query(hourOfDayQuery, queryParams),
    pool.query(fatigueDecayQuery, queryParams),
    pool.query(topPrsQuery, queryParams),
    pool.query(skippedExercisesQuery, queryParams),
    pool.query(ratingsDistributionQuery, queryParams),
    pool.query(aiReportsQuery, queryParams),
    pool.query(usersListQuery),
    pool.query(muscleHeatMapQuery, queryParams),
  ]);

  const core = coreStatsRes.rows[0] || {};
  const setsReps = setsRepsRes.rows[0] || {};
  const exStats = exercisesStatsRes.rows[0] || {};

  // Post-processing & Derived Insights Computation
  const totalWorkouts = core.total_workouts || 0;
  const completedWorkouts = core.completed_workouts || 0;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 100;

  const totalVolume = parseFloat(core.total_volume_kg || 0);
  const avgVolume = parseFloat(core.avg_volume_kg || 0);
  const totalDurationSec = parseInt(core.total_duration_seconds || 0, 10);
  const avgDurationSec = parseInt(core.avg_duration_seconds || 0, 10);
  const totalRestSec = parseInt(core.total_rest_seconds || 0, 10);
  const activeDurationSec = Math.max(0, totalDurationSec - totalRestSec);

  // Training Density: kg moved per active minute
  const activeMinutes = activeDurationSec / 60.0;
  const trainingDensityKgMin = activeMinutes > 0 ? parseFloat((totalVolume / activeMinutes).toFixed(1)) : 0;

  // Relative Volume per Bodyweight
  const athleteWeight = selectedUser?.weight_kg ? parseFloat(selectedUser.weight_kg) : 75;
  const relativeVolumeRatio = athleteWeight > 0 ? parseFloat((avgVolume / athleteWeight).toFixed(1)) : 0;

  // Average Rest Per Set
  const totalSets = setsReps.total_sets || 0;
  const avgRestPerSetSec = totalSets > 0 ? Math.round(totalRestSec / totalSets) : 60;

  // Day of Week Names mapping
  const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekMap = {};
  for (let i = 0; i < 7; i++) {
    dayOfWeekMap[i] = { day: DOW_NAMES[i], shortDay: DOW_NAMES[i].slice(0, 3), count: 0, volume: 0 };
  }
  dowRes.rows.forEach((r) => {
    if (dayOfWeekMap[r.day_num]) {
      dayOfWeekMap[r.day_num].count = r.workouts_count;
      dayOfWeekMap[r.day_num].volume = Math.round(parseFloat(r.total_volume_kg));
    }
  });
  const dayOfWeekData = Object.values(dayOfWeekMap);

  // 24-Hour Circadian Map & Time of Day Periods
  const circadianMap = {};
  let morningWorkouts = 0;
  let afternoonWorkouts = 0;
  let eveningWorkouts = 0;
  let nightWorkouts = 0;
  let totalTimeWorkouts = 0;

  for (let h = 0; h < 24; h++) {
    circadianMap[h] = {
      hour: h,
      label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`,
      count: 0,
    };
  }
  hodRes.rows.forEach((r) => {
    const h = r.hour_num;
    const count = parseInt(r.workouts_count, 10) || 0;
    if (circadianMap[h]) {
      circadianMap[h].count = count;
    }
    totalTimeWorkouts += count;

    if (h >= 5 && h < 12) morningWorkouts += count;
    else if (h >= 12 && h < 17) afternoonWorkouts += count;
    else if (h >= 17 && h < 21) eveningWorkouts += count;
    else nightWorkouts += count;
  });
  const circadianData = Object.values(circadianMap);

  const totalHod = totalTimeWorkouts || 1;
  const timeOfDayPeriods = [
    {
      period: 'morning',
      label: 'Morning',
      timeRange: '5:00 AM – 11:59 AM',
      count: morningWorkouts,
      pct: Math.round((morningWorkouts / totalHod) * 100),
    },
    {
      period: 'afternoon',
      label: 'Afternoon',
      timeRange: '12:00 PM – 4:59 PM',
      count: afternoonWorkouts,
      pct: Math.round((afternoonWorkouts / totalHod) * 100),
    },
    {
      period: 'evening',
      label: 'Evening',
      timeRange: '5:00 PM – 8:59 PM',
      count: eveningWorkouts,
      pct: Math.round((eveningWorkouts / totalHod) * 100),
    },
    {
      period: 'night',
      label: 'Night',
      timeRange: '9:00 PM – 4:59 AM',
      count: nightWorkouts,
      pct: Math.round((nightWorkouts / totalHod) * 100),
    },
  ];

  // Peak Workout Time Window
  const sortedHours = Object.values(circadianMap).filter((h) => h.count > 0).sort((a, b) => b.count - a.count);
  const peak = sortedHours[0] || { hour: 15, label: '3 PM', count: 0 };
  const peakHourNum = peak.hour;
  const peakPeriod =
    peakHourNum >= 5 && peakHourNum < 12
      ? 'Morning'
      : peakHourNum >= 12 && peakHourNum < 17
      ? 'Afternoon'
      : peakHourNum >= 17 && peakHourNum < 21
      ? 'Evening'
      : 'Night';

  const nextHourNum = (peakHourNum + 1) % 24;
  const nextHourLabel = `${nextHourNum % 12 === 0 ? 12 : nextHourNum % 12} ${nextHourNum >= 12 ? 'PM' : 'AM'}`;
  const peakWorkoutTime = {
    hour: peakHourNum,
    label: peak.label,
    timeWindow: `${peak.label} – ${nextHourLabel}`,
    period: peakPeriod,
    count: peak.count,
  };

  // 15. Muscle Heat Map Processing (45-Day Exponential Half-Life Decay)
  const HALF_LIFE_DAYS = 45;
  const nowMs = Date.now();
  const slugDataMap = {};

  Object.keys(SLUG_LABELS).forEach((slug) => {
    slugDataMap[slug] = {
      slug,
      label: SLUG_LABELS[slug],
      score: 0,
      daysSet: new Set(),
      totalSets: 0,
      totalVolumeKg: 0,
      lastDate: null,
    };
  });

  muscleHeatMapRes.rows.forEach((row) => {
    const candidates = [row.target, row.body_part, row.category];
    let slug = null;
    for (const raw of candidates) {
      if (!raw) continue;
      const key = raw.trim().toLowerCase();
      const mapped = TO_SLUG[key];
      if (mapped) {
        slug = mapped;
        break;
      }
    }
    if (!slug || !slugDataMap[slug]) return;

    const rowDate = row.workout_date ? (row.workout_date.toISOString ? row.workout_date.toISOString().split('T')[0] : String(row.workout_date)) : null;
    const daysAgo = rowDate ? Math.max(0, (nowMs - new Date(rowDate).getTime()) / 86_400_000) : 0;
    const decayFactor = Math.pow(2, -daysAgo / HALF_LIFE_DAYS);

    slugDataMap[slug].score += (parseInt(row.exercise_count, 10) || 1) * decayFactor;
    if (rowDate) slugDataMap[slug].daysSet.add(rowDate);
    slugDataMap[slug].totalSets += parseInt(row.total_sets, 10) || 0;
    slugDataMap[slug].totalVolumeKg += Math.round(parseFloat(row.total_volume) || 0);

    if (rowDate && (!slugDataMap[slug].lastDate || rowDate > slugDataMap[slug].lastDate)) {
      slugDataMap[slug].lastDate = rowDate;
    }
  });

  const muscleHeatMapData = Object.values(slugDataMap)
    .map((item) => {
      const intensity = THRESHOLDS.filter((t) => item.score >= t).length;
      return {
        slug: item.slug,
        label: item.label,
        intensity,
        score: Math.round(item.score * 10) / 10,
        daysTrained: item.daysSet.size,
        totalSets: item.totalSets,
        totalVolumeKg: item.totalVolumeKg,
        lastTrainedDate: item.lastDate,
      };
    })
    .sort((a, b) => b.intensity - a.intensity || b.totalVolumeKg - a.totalVolumeKg);

  // Fatigue Decay: calculate % drop-off relative to Set 1
  const set1Volume = fatigueDecayRes.rows.find((r) => r.set_number === 1)?.avg_set_volume || 1;
  const fatigueDecayData = fatigueDecayRes.rows.map((r) => {
    const vol = parseFloat(r.avg_set_volume);
    const dropOffPct = set1Volume > 0 ? Math.round(((vol - set1Volume) / set1Volume) * 100) : 0;
    return {
      setNumber: `Set ${r.set_number}`,
      avgSetVolume: Math.round(vol),
      avgWeightKg: parseFloat(r.avg_weight),
      avgReps: Math.round(parseFloat(r.avg_reps)),
      dropOffPct,
    };
  });

  // Rep Scheme Percentage
  const setsPower = setsReps.sets_power_1_5 || 0;
  const setsHypertrophy = setsReps.sets_hypertrophy_6_12 || 0;
  const setsEndurance = setsReps.sets_endurance_13_plus || 0;
  const repSchemeTotal = setsPower + setsHypertrophy + setsEndurance || 1;

  const repSchemes = {
    powerCount: setsPower,
    powerPct: Math.round((setsPower / repSchemeTotal) * 100),
    hypertrophyCount: setsHypertrophy,
    hypertrophyPct: Math.round((setsHypertrophy / repSchemeTotal) * 100),
    enduranceCount: setsEndurance,
    endurancePct: Math.round((setsEndurance / repSchemeTotal) * 100),
  };

  // Body Part Grouping summary
  const bodyPartTotals = {};
  muscleDistRes.rows.forEach((r) => {
    const bp = r.body_part || 'Other';
    if (!bodyPartTotals[bp]) {
      bodyPartTotals[bp] = { bodyPart: bp, volume: 0, exercisesCount: 0, prsCount: 0 };
    }
    bodyPartTotals[bp].volume += Math.round(parseFloat(r.total_volume_kg));
    bodyPartTotals[bp].exercisesCount += r.exercises_count;
    bodyPartTotals[bp].prsCount += r.prs_count;
  });
  const muscleDistributionData = Object.values(bodyPartTotals).sort((a, b) => b.volume - a.volume);

  return {
    meta: {
      userId: userParam,
      range,
      timezone: safeTz,
      generatedAt: new Date().toISOString(),
      mode: userParam ? 'athlete' : 'global',
      selectedUser,
    },
    athletes: usersListRes.rows,
    kpis: {
      totalWorkouts,
      completedWorkouts,
      activeWorkouts: core.active_workouts || 0,
      abandonedWorkouts: core.abandoned_workouts || 0,
      completionRate,
      totalVolumeKg: Math.round(totalVolume),
      avgVolumeKg: Math.round(avgVolume),
      totalDurationMinutes: Math.round(totalDurationSec / 60),
      avgDurationMinutes: Math.round(avgDurationSec / 60),
      totalRestMinutes: Math.round(totalRestSec / 60),
      activeDurationMinutes: Math.round(activeDurationSec / 60),
      activeRestRatio: totalDurationSec > 0 ? Math.round((activeDurationSec / totalDurationSec) * 100) : 75,
      avgRestPerSetSec,
      trainingDensityKgMin,
      relativeVolumeRatio,
      totalSets,
      totalReps: setsReps.total_reps || 0,
      avgRepsPerSet: parseFloat(parseFloat(setsReps.avg_reps_per_set || 0).toFixed(1)),
      avgWeightPerSetKg: parseFloat(parseFloat(setsReps.avg_weight_per_set || 0).toFixed(1)),
      totalTutMinutes: Math.round((setsReps.total_tut_seconds || 0) / 60),
      totalExercisesPerformed: exStats.total_exercises_performed || 0,
      uniqueExercisesCount: exStats.unique_exercises_count || 0,
      skippedExercisesCount: exStats.skipped_exercises_count || 0,
      totalPrsHit: exStats.total_prs_hit || 0,
      avgTargetSets: parseFloat(parseFloat(exStats.avg_target_sets || 0).toFixed(1)),
      totalCaloriesBurned: core.total_calories_burned || 0,
      avgCaloriesBurned: Math.round(parseFloat(core.avg_calories_burned || 0)),
      calorieBurnRateKcalMin:
        avgDurationSec > 0
          ? parseFloat((parseFloat(core.avg_calories_burned || 0) / (avgDurationSec / 60)).toFixed(1))
          : 0,
      avgMet: parseFloat(parseFloat(core.avg_met || 0).toFixed(2)),
      totalWaterLiters: parseFloat(parseFloat(core.total_water_liters || 0).toFixed(1)),
      avgWaterLiters: parseFloat(parseFloat(core.avg_water_liters || 0).toFixed(2)),
      avgRating: parseFloat(parseFloat(core.avg_rating || 0).toFixed(1)),
      totalRatingsCount: core.total_ratings_count || 0,
      maxStreakRecorded: core.max_streak_recorded || 0,
      lastWorkoutAt: core.last_workout_at,
    },
    repSchemes,
    timeline: timelineRes.rows.map((t) => ({
      date: t.date,
      workoutsCount: t.workouts_count,
      volumeKg: Math.round(parseFloat(t.volume_kg)),
      durationMinutes: Math.round(parseFloat(t.duration_minutes)),
      calories: t.calories,
      avgMet: parseFloat(parseFloat(t.avg_met).toFixed(2)),
      prsCount: t.prs_count,
    })),
    muscleDistribution: muscleDistributionData,
    muscleTargets: muscleDistRes.rows.map((r) => ({
      bodyPart: r.body_part,
      target: r.target_muscle,
      volumeKg: Math.round(parseFloat(r.total_volume_kg)),
      exercisesCount: r.exercises_count,
      prsCount: r.prs_count,
    })),
    dayOfWeek: dayOfWeekData,
    circadian: circadianData,
    timeOfDayPeriods,
    peakWorkoutTime,
    muscleHeatMap: muscleHeatMapData,
    fatigueDecay: fatigueDecayData,
    topPrs: topPrsRes.rows.map((r) => ({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      bodyPart: r.body_part,
      maxWeightKg: parseFloat(r.max_weight_kg),
      maxEstimated1rm: parseFloat(r.max_estimated_1rm),
      totalVolumeKg: Math.round(parseFloat(r.total_volume_kg)),
      prsCount: r.prs_count,
      relativeStrengthRatio:
        athleteWeight > 0 ? parseFloat((parseFloat(r.max_estimated_1rm) / athleteWeight).toFixed(2)) : null,
    })),
    skippedExercises: skippedExRes.rows.map((r) => ({
      name: r.exercise_name,
      bodyPart: r.body_part,
      skippedCount: r.skipped_count,
      totalScheduledCount: r.total_scheduled_count,
      skipRatePct:
        r.total_scheduled_count > 0 ? Math.round((r.skipped_count / r.total_scheduled_count) * 100) : 0,
    })),
    ratingsDistribution: ratingsDistRes.rows.map((r) => ({
      score: r.rating_score,
      stars: `${r.rating_score} Star${r.rating_score > 1 ? 's' : ''}`,
      count: r.count,
    })),
    aiReports: aiReportsRes.rows,
  };
}

/**
 * Returns all exercises an athlete has ever completed at least one set in.
 * Guaranteed: only exercises with >= 1 non-skipped set and weight/reps > 0.
 */
async function getAthleteExercises({ userId, search = '', bodyPart = '' }) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const userParam = parseInt(userId, 10);
  const conditions = [
    'dw.user_id = $1',
    'COALESCE(dws.is_skipped, false) = false',
    'COALESCE(dwe.is_skipped, false) = false',
    '(dws.weight > 0 OR dws.reps > 0)',
  ];
  const queryParams = [userParam];

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`LOWER(e.name) LIKE $${queryParams.length}`);
  }

  if (bodyPart && bodyPart.trim() && bodyPart.toLowerCase() !== 'all') {
    queryParams.push(bodyPart.trim().toLowerCase());
    conditions.push(`LOWER(COALESCE(e.body_part, '')) = $${queryParams.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      e.id,
      e.name,
      e.category,
      COALESCE(e.body_part, 'Other') AS body_part,
      COALESCE(e.target, 'General') AS target,
      e.equipment,
      e.image_url,
      e.gif_url,
      COUNT(DISTINCT dw.id)::int AS total_sessions_count,
      COUNT(dws.id)::int AS total_sets_completed,
      COALESCE(MAX(dws.weight), 0)::numeric AS all_time_max_weight,
      COALESCE(MAX(dws.reps), 0)::int AS all_time_max_reps,
      COALESCE(MAX(dwe.estimated_1rm), 0)::numeric AS max_estimated_1rm,
      COALESCE(SUM(dws.weight * dws.reps), 0)::numeric AS total_volume_kg,
      MIN(COALESCE(dw.completed_at, dw.started_at)) AS first_performed_at,
      MAX(COALESCE(dw.completed_at, dw.started_at)) AS last_performed_at
    FROM daily_workout_sets dws
    JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
    JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
    JOIN exercises e ON dwe.exercise_id = e.id
    WHERE ${whereClause}
    GROUP BY e.id, e.name, e.category, e.body_part, e.target, e.equipment, e.image_url, e.gif_url
    HAVING COUNT(dws.id) > 0
    ORDER BY total_sessions_count DESC, last_performed_at DESC
  `;

  // Workouts/splits performed by this user (for workout switcher filter)
  const workoutsQuery = `
    SELECT DISTINCT dw.title, COUNT(DISTINCT dw.id)::int AS session_count
    FROM daily_workouts dw
    JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
    JOIN daily_workout_sets dws ON dwe.id = dws.daily_exercise_id
    WHERE dw.user_id = $1
      AND COALESCE(dws.is_skipped, false) = false
      AND COALESCE(dwe.is_skipped, false) = false
      AND (dws.weight > 0 OR dws.reps > 0)
      AND dw.title IS NOT NULL
      AND TRIM(dw.title) <> ''
    GROUP BY dw.title
    ORDER BY session_count DESC
    LIMIT 30
  `;

  const [exercisesRes, workoutsRes] = await Promise.all([
    pool.query(query, queryParams),
    pool.query(workoutsQuery, [userParam]),
  ]);

  // Extract distinct body parts available for this user
  const bodyPartsSet = new Set();
  exercisesRes.rows.forEach((r) => {
    if (r.body_part) bodyPartsSet.add(r.body_part);
  });

  return {
    userId: userParam,
    totalCount: exercisesRes.rows.length,
    bodyParts: Array.from(bodyPartsSet).sort(),
    workouts: workoutsRes.rows.map((w) => ({
      title: w.title,
      sessionCount: w.session_count,
    })),
    exercises: exercisesRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      bodyPart: r.body_part,
      target: r.target,
      equipment: r.equipment,
      imageUrl: r.image_url,
      gifUrl: r.gif_url,
      totalSessionsCount: r.total_sessions_count,
      totalSetsCompleted: r.total_sets_completed,
      allTimeMaxWeight: parseFloat(r.all_time_max_weight),
      allTimeMaxReps: r.all_time_max_reps,
      maxEstimated1rm: parseFloat(r.max_estimated_1rm),
      totalVolumeKg: Math.round(parseFloat(r.total_volume_kg)),
      firstPerformedAt: r.first_performed_at,
      lastPerformedAt: r.last_performed_at,
    })),
  };
}

/**
 * Returns progression timeline and logged sets for a specific athlete and exercise.
 * Supports date range and workout title filters.
 */
async function getAthleteExerciseProgression({
  userId,
  exerciseId,
  range = 'all',
  tz = 'UTC',
  workoutTitle = null,
}) {
  if (!userId || !exerciseId) {
    throw new Error('userId and exerciseId are required');
  }

  const userParam = parseInt(userId, 10);
  const safeTz = typeof tz === 'string' && /^[a-zA-Z0-9_\-\/+]+$/.test(tz) ? tz : 'UTC';

  // Date range filtering
  let intervalClause = '';
  if (range === '7d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '7 days'";
  else if (range === '30d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '30 days'";
  else if (range === '90d') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '90 days'";
  else if (range === '6m') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '6 months'";
  else if (range === '1y') intervalClause = "AND dw.completed_at >= NOW() - INTERVAL '1 year'";

  const conditions = [
    'dw.user_id = $1',
    'dwe.exercise_id = $2',
    'COALESCE(dws.is_skipped, false) = false',
    'COALESCE(dwe.is_skipped, false) = false',
    '(dws.weight > 0 OR dws.reps > 0)',
  ];
  const queryParams = [userParam, exerciseId];

  if (workoutTitle && workoutTitle.trim() && workoutTitle.toLowerCase() !== 'all') {
    queryParams.push(workoutTitle.trim());
    conditions.push(`dw.title = $${queryParams.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Fetch exercise details
  const exerciseRes = await pool.query(
    `SELECT id, name, category, COALESCE(body_part, 'Other') AS body_part,
            COALESCE(target, 'General') AS target, equipment, image_url, gif_url
     FROM exercises WHERE id = $1`,
    [exerciseId]
  );
  const exercise = exerciseRes.rows[0] || null;

  // Progression query across workout sessions
  const progressionQuery = `
    SELECT
      dw.id AS workout_id,
      COALESCE(dw.title, 'Workout') AS workout_title,
      COALESCE(dw.completed_at, dw.started_at) AS session_date,
      TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD') AS formatted_date,
      TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'Mon DD') AS short_date,
      dwe.id AS daily_exercise_id,
      COALESCE(dwe.is_personal_record, false) AS is_personal_record,
      COALESCE(dwe.estimated_1rm, 0)::numeric AS estimated_1rm,
      COALESCE(dwe.best_set_weight, 0)::numeric AS best_set_weight,
      COALESCE(dwe.best_set_reps, 0)::int AS best_set_reps,
      COALESCE(MAX(dws.weight), 0)::numeric AS session_max_weight,
      COALESCE(AVG(CASE WHEN dws.weight > 0 THEN dws.weight END), 0)::numeric AS session_avg_weight,
      COALESCE(SUM(dws.weight * dws.reps), 0)::numeric AS session_total_volume,
      COALESCE(MAX(dws.reps), 0)::int AS session_max_reps,
      COUNT(dws.id)::int AS sets_completed,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'set_number', dws.set_number,
          'weight', dws.weight::numeric,
          'reps', dws.reps,
          'duration_seconds', dws.duration_seconds,
          'rest_seconds', dws.rest_seconds,
          'completed_at', dws.completed_at
        ) ORDER BY dws.set_number ASC
      ) AS sets
    FROM daily_workouts dw
    JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
    JOIN daily_workout_sets dws ON dwe.id = dws.daily_exercise_id
    WHERE ${whereClause} ${intervalClause}
    GROUP BY dw.id, dw.title, dw.completed_at, dw.started_at, dwe.id, dwe.is_personal_record, dwe.estimated_1rm, dwe.best_set_weight, dwe.best_set_reps
    ORDER BY session_date ASC
  `;

  const progressionRes = await pool.query(progressionQuery, queryParams);
  const rows = progressionRes.rows;

  // Aggregate progressive overload summary metrics
  let startWeight = 0;
  let currentWeight = 0;
  let maxWeightAllTime = 0;
  let maxEstimated1RM = 0;
  let totalVolumeAllTime = 0;
  let totalSetsCount = 0;
  let prDate = null;

  if (rows.length > 0) {
    startWeight = parseFloat(rows[0].session_max_weight);
    currentWeight = parseFloat(rows[rows.length - 1].session_max_weight);

    rows.forEach((r) => {
      const mw = parseFloat(r.session_max_weight);
      const e1rm = parseFloat(r.estimated_1rm);
      const vol = parseFloat(r.session_total_volume);

      if (mw > maxWeightAllTime) {
        maxWeightAllTime = mw;
        prDate = r.formatted_date;
      }
      if (e1rm > maxEstimated1RM) {
        maxEstimated1RM = e1rm;
      }
      totalVolumeAllTime += vol;
      totalSetsCount += r.sets_completed;
    });
  }

  const weightDelta = currentWeight - startWeight;
  const weightDeltaPct = startWeight > 0 ? Math.round((weightDelta / startWeight) * 100) : 0;

  return {
    exercise: exercise
      ? {
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          bodyPart: exercise.body_part,
          target: exercise.target,
          equipment: exercise.equipment,
          imageUrl: exercise.image_url,
          gifUrl: exercise.gif_url,
        }
      : null,
    summary: {
      sessionsCount: rows.length,
      setsCount: totalSetsCount,
      startWeight,
      currentWeight,
      weightDelta: parseFloat(weightDelta.toFixed(1)),
      weightDeltaPct,
      maxWeightAllTime,
      maxEstimated1RM: parseFloat(maxEstimated1RM.toFixed(1)),
      totalVolumeAllTime: Math.round(totalVolumeAllTime),
      prDate,
    },
    timeline: rows.map((r) => ({
      workoutId: r.workout_id,
      workoutTitle: r.workout_title,
      sessionDate: r.session_date,
      formattedDate: r.formatted_date,
      shortDate: r.short_date,
      isPersonalRecord: r.is_personal_record,
      estimated1rm: parseFloat(r.estimated_1rm),
      bestSetWeight: parseFloat(r.best_set_weight),
      bestSetReps: r.best_set_reps,
      maxWeight: parseFloat(r.session_max_weight),
      avgWeight: parseFloat(parseFloat(r.session_avg_weight).toFixed(1)),
      totalVolume: Math.round(parseFloat(r.session_total_volume)),
      maxReps: r.session_max_reps,
      setsCompleted: r.sets_completed,
      sets: r.sets || [],
    })),
  };
}

module.exports = {
  getWorkoutAnalytics,
  getAthleteExercises,
  getAthleteExerciseProgression,
};
