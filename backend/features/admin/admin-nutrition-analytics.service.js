'use strict';

const { pool } = require('../../db');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SpotME Admin Nutrition & Hydration Analytics Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates 30+ nutrition, macronutrient, hydration, and meal timing metrics:
 * - Caloric Intake vs Target Envelopes
 * - Net Energy Balance (Consumed vs Workout Burned)
 * - Macronutrient Progression (Protein, Carbs, Fats) & Relative Density
 * - Hydration & Water Logs Volume & 24h Circadian Hydration Rhythm
 * - Micronutrient & Cardiovascular Health Guardrails (Fiber, Sugar, Sodium, etc.)
 * - Meal Timing, Circadian Feeding Windows & Late-Night Eating Index
 * - Square Visual Grid of Recent Logged Meals with Cloudflare R2 photos
 * - Top Consumed Foods Ranking
 *
 * Supports:
 * - userId: optional (if omitted or null -> global aggregated platform mode)
 * - range: '7d' | '30d' | '90d' | '1y' | 'all' (default: '30d')
 * - tz: IANA timezone string (default: 'UTC')
 */
async function getNutritionAnalytics({ userId = null, range = '30d', tz = 'UTC' }) {
  // Validate and sanitize local timezone
  const safeTz = typeof tz === 'string' && /^[a-zA-Z0-9_\-\/+]+$/.test(tz) ? tz : 'UTC';

  // Date filter interval
  let mealInterval = '';
  let waterInterval = '';
  let workoutInterval = '';
  if (range === '7d') {
    mealInterval = "AND m.logged_at >= NOW() - INTERVAL '7 days'";
    waterInterval = "AND wl.logged_at >= NOW() - INTERVAL '7 days'";
    workoutInterval = "AND dw.completed_at >= NOW() - INTERVAL '7 days'";
  } else if (range === '30d') {
    mealInterval = "AND m.logged_at >= NOW() - INTERVAL '30 days'";
    waterInterval = "AND wl.logged_at >= NOW() - INTERVAL '30 days'";
    workoutInterval = "AND dw.completed_at >= NOW() - INTERVAL '30 days'";
  } else if (range === '90d') {
    mealInterval = "AND m.logged_at >= NOW() - INTERVAL '90 days'";
    waterInterval = "AND wl.logged_at >= NOW() - INTERVAL '90 days'";
    workoutInterval = "AND dw.completed_at >= NOW() - INTERVAL '90 days'";
  } else if (range === '1y') {
    mealInterval = "AND m.logged_at >= NOW() - INTERVAL '1 year'";
    waterInterval = "AND wl.logged_at >= NOW() - INTERVAL '1 year'";
    workoutInterval = "AND dw.completed_at >= NOW() - INTERVAL '1 year'";
  }

  const userParam = userId ? parseInt(userId, 10) : null;
  const userParamVal = userParam ? [userParam] : [];

  const userMealCondition = userParam ? 'AND m.user_id = $1' : '';
  const userWaterCondition = userParam ? 'AND wl.user_id = $1' : '';
  const userWorkoutCondition = userParam ? 'AND dw.user_id = $1' : '';

  // 1. Fetch Selected User Info & Target Recommendations
  let selectedUser = null;
  let targets = {
    caloriesTarget: 2200,
    proteinTarget: 150,
    carbsTarget: 250,
    fatTarget: 65,
    waterTargetMl: 3000,
    dietType: 'Standard',
  };

  if (userParam) {
    const userRes = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.profile_pic_url, u.gender,
              u.weight AS weight_kg, u.height AS height_cm, u.fitness_goal, u.created_at,
              mr.calories_target, mr.protein_target, mr.carbs_target, mr.fat_target,
              mr.diet_type, mr.bmi, mr.bmi_category
       FROM users u
       LEFT JOIN meal_recommendations mr ON u.id = mr.user_id
       WHERE u.id = $1`,
      [userParam]
    );

    if (userRes.rows.length > 0) {
      const row = userRes.rows[0];
      selectedUser = {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        profile_pic_url: row.profile_pic_url,
        gender: row.gender,
        weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : null,
        height_cm: row.height_cm ? parseFloat(row.height_cm) : null,
        fitness_goal: row.fitness_goal,
        created_at: row.created_at,
        bmi: row.bmi ? parseFloat(row.bmi) : null,
        bmi_category: row.bmi_category,
      };

      if (row.calories_target) targets.caloriesTarget = parseInt(row.calories_target, 10);
      if (row.protein_target) targets.proteinTarget = parseInt(row.protein_target, 10);
      if (row.carbs_target) targets.carbsTarget = parseInt(row.carbs_target, 10);
      if (row.fat_target) targets.fatTarget = parseInt(row.fat_target, 10);
      if (row.diet_type) targets.dietType = row.diet_type;
    }
  }

  // 2. Timeline Aggregation Query (Daily Meals + Macros + Micros)
  const mealsDailyQuery = `
    SELECT
      TO_CHAR(((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD') AS log_date,
      COUNT(m.id)::int AS meals_count,
      COALESCE(SUM(m.total_calories), 0)::numeric AS calories,
      COALESCE(SUM(m.total_protein), 0)::numeric AS protein,
      COALESCE(SUM(m.total_carbs), 0)::numeric AS carbs,
      COALESCE(SUM(m.total_fat), 0)::numeric AS fat,
      COALESCE(SUM(m.total_fiber), 0)::numeric AS fiber,
      COALESCE(SUM(m.total_sugar), 0)::numeric AS sugar,
      COALESCE(SUM(m.total_sodium), 0)::numeric AS sodium,
      COALESCE(SUM(m.total_saturated_fat), 0)::numeric AS saturated_fat,
      COALESCE(SUM(m.total_cholesterol), 0)::numeric AS cholesterol
    FROM meals m
    WHERE 1=1 ${userMealCondition} ${mealInterval}
    GROUP BY TO_CHAR(((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD')
    ORDER BY log_date ASC
  `;

  // 3. Water Logs Daily Aggregation Query
  const waterDailyQuery = `
    SELECT
      TO_CHAR(((wl.logged_at AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD') AS log_date,
      COUNT(wl.id)::int AS logs_count,
      COALESCE(SUM(wl.amount_ml), 0)::int AS total_water_ml
    FROM water_logs wl
    WHERE 1=1 ${userWaterCondition} ${waterInterval}
    GROUP BY TO_CHAR(((wl.logged_at AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD')
    ORDER BY log_date ASC
  `;

  // 4. Workout Calories Burned & Workout Water Daily Query
  const workoutDailyQuery = `
    SELECT
      TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD') AS log_date,
      COALESCE(SUM(dw.calories_burned), 0)::int AS calories_burned,
      COALESCE(SUM(dw.water_intake_liters), 0)::numeric AS workout_water_liters
    FROM daily_workouts dw
    WHERE dw.status = 'completed' ${userWorkoutCondition} ${workoutInterval}
    GROUP BY TO_CHAR(((COALESCE(dw.completed_at, dw.started_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD')
    ORDER BY log_date ASC
  `;

  // 5. Meal Type Breakdown (Breakfast, Lunch, Dinner, Snack)
  const mealTypeQuery = `
    SELECT
      COALESCE(NULLIF(TRIM(m.meal_type), ''), 'Snack') AS meal_type,
      COUNT(m.id)::int AS count,
      COALESCE(SUM(m.total_calories), 0)::numeric AS calories,
      COALESCE(SUM(m.total_protein), 0)::numeric AS protein,
      COALESCE(SUM(m.total_carbs), 0)::numeric AS carbs,
      COALESCE(SUM(m.total_fat), 0)::numeric AS fat
    FROM meals m
    WHERE 1=1 ${userMealCondition} ${mealInterval}
    GROUP BY COALESCE(NULLIF(TRIM(m.meal_type), ''), 'Snack')
    ORDER BY calories DESC
  `;

  // 6. Circadian Meal & Water Hours (0 to 23 in Local Time)
  const circadianMealsQuery = `
    SELECT
      EXTRACT(HOUR FROM (((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))::int AS hour_num,
      COUNT(m.id)::int AS meals_count,
      COALESCE(SUM(m.total_calories), 0)::numeric AS calories
    FROM meals m
    WHERE 1=1 ${userMealCondition} ${mealInterval}
    GROUP BY EXTRACT(HOUR FROM (((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))
    ORDER BY hour_num ASC
  `;

  const circadianWaterQuery = `
    SELECT
      EXTRACT(HOUR FROM (((wl.logged_at AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))::int AS hour_num,
      COUNT(wl.id)::int AS logs_count,
      COALESCE(SUM(wl.amount_ml), 0)::int AS water_ml
    FROM water_logs wl
    WHERE 1=1 ${userWaterCondition} ${waterInterval}
    GROUP BY EXTRACT(HOUR FROM (((wl.logged_at AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))
    ORDER BY hour_num ASC
  `;

  // 7. Day of Week Distribution in Local Time (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  const dayOfWeekQuery = `
    SELECT
      EXTRACT(DOW FROM (((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))::int AS day_num,
      COUNT(m.id)::int AS meals_count,
      COALESCE(AVG(m.total_calories), 0)::numeric AS avg_meal_calories,
      COALESCE(SUM(m.total_calories), 0)::numeric AS total_calories
    FROM meals m
    WHERE 1=1 ${userMealCondition} ${mealInterval}
    GROUP BY EXTRACT(DOW FROM (((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}')))
    ORDER BY day_num ASC
  `;

  // 8. Top Consumed Food Items (Ranked by Frequency)
  const topFoodsQuery = `
    SELECT
      mi.item_name,
      COUNT(mi.id)::int AS logged_count,
      COALESCE(AVG(mi.calories), 0)::numeric AS avg_calories,
      COALESCE(AVG(mi.protein), 0)::numeric AS avg_protein,
      COALESCE(AVG(mi.carbs), 0)::numeric AS avg_carbs,
      COALESCE(AVG(mi.fat), 0)::numeric AS avg_fat,
      COALESCE(SUM(mi.calories), 0)::numeric AS total_calories
    FROM meal_items mi
    JOIN meals m ON mi.meal_id = m.id
    WHERE 1=1 ${userMealCondition} ${mealInterval}
    GROUP BY mi.item_name
    ORDER BY logged_count DESC, total_calories DESC
    LIMIT 15
  `;

  // 9. Athletes List (Users who have logged meals or water)
  const athletesListQuery = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.profile_pic_url,
      u.gender,
      COUNT(DISTINCT m.id)::int AS meals_count,
      COUNT(DISTINCT wl.id)::int AS water_logs_count,
      MAX(COALESCE(m.logged_at, wl.logged_at)) AS last_active_at
    FROM users u
    LEFT JOIN meals m ON u.id = m.user_id
    LEFT JOIN water_logs wl ON u.id = wl.user_id
    GROUP BY u.id, u.full_name, u.email, u.profile_pic_url, u.gender
    HAVING COUNT(m.id) > 0 OR COUNT(wl.id) > 0
    ORDER BY meals_count DESC, u.id ASC
    LIMIT 50
  `;

  // 10. Execute all analytical queries concurrently
  const [
    mealsDailyRes,
    waterDailyRes,
    workoutDailyRes,
    mealTypeRes,
    circadianMealsRes,
    circadianWaterRes,
    dowRes,
    topFoodsRes,
    athletesRes,
  ] = await Promise.all([
    pool.query(mealsDailyQuery, userParamVal),
    pool.query(waterDailyQuery, userParamVal),
    pool.query(workoutDailyQuery, userParamVal),
    pool.query(mealTypeQuery, userParamVal),
    pool.query(circadianMealsQuery, userParamVal),
    pool.query(circadianWaterQuery, userParamVal),
    pool.query(dayOfWeekQuery, userParamVal),
    pool.query(topFoodsQuery, userParamVal),
    pool.query(athletesListQuery),
  ]);

  // ─── Post-Processing & Derived Analytical Insights ───────────────────────────

  // Map daily data by date
  const dateMap = new Map();

  mealsDailyRes.rows.forEach((r) => {
    const d = r.log_date;
    if (!dateMap.has(d)) {
      dateMap.set(d, {
        date: d,
        mealsCount: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        saturatedFat: 0,
        cholesterol: 0,
        waterMl: 0,
        caloriesBurned: 0,
        workoutWaterLiters: 0,
      });
    }
    const item = dateMap.get(d);
    item.mealsCount = parseInt(r.meals_count, 10);
    item.calories = Math.round(parseFloat(r.calories));
    item.protein = Math.round(parseFloat(r.protein) * 10) / 10;
    item.carbs = Math.round(parseFloat(r.carbs) * 10) / 10;
    item.fat = Math.round(parseFloat(r.fat) * 10) / 10;
    item.fiber = Math.round(parseFloat(r.fiber) * 10) / 10;
    item.sugar = Math.round(parseFloat(r.sugar) * 10) / 10;
    item.sodium = Math.round(parseFloat(r.sodium));
    item.saturatedFat = Math.round(parseFloat(r.saturated_fat) * 10) / 10;
    item.cholesterol = Math.round(parseFloat(r.cholesterol));
  });

  waterDailyRes.rows.forEach((r) => {
    const d = r.log_date;
    if (!dateMap.has(d)) {
      dateMap.set(d, {
        date: d,
        mealsCount: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        saturatedFat: 0,
        cholesterol: 0,
        waterMl: 0,
        caloriesBurned: 0,
        workoutWaterLiters: 0,
      });
    }
    const item = dateMap.get(d);
    item.waterMl = parseInt(r.total_water_ml, 10) || 0;
  });

  workoutDailyRes.rows.forEach((r) => {
    const d = r.log_date;
    if (dateMap.has(d)) {
      const item = dateMap.get(d);
      item.caloriesBurned = parseInt(r.calories_burned, 10) || 0;
      item.workoutWaterLiters = parseFloat(r.workout_water_liters) || 0;
    }
  });

  // Convert map to sorted timeline array
  const timeline = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => {
      const netCalories = item.calories - item.caloriesBurned;
      const deficitSurplus = item.calories - targets.caloriesTarget;
      const totalHydrationMl = item.waterMl + Math.round(item.workoutWaterLiters * 1000);
      return {
        ...item,
        waterLiters: parseFloat((totalHydrationMl / 1000).toFixed(2)),
        netCalories,
        deficitSurplus,
        targetCalories: targets.caloriesTarget,
        targetProtein: targets.proteinTarget,
        targetCarbs: targets.carbsTarget,
        targetFat: targets.fatTarget,
        targetWaterLiters: parseFloat((targets.waterTargetMl / 1000).toFixed(2)),
      };
    });

  // Calculate Averages & Core KPIs
  const loggedDaysCount = timeline.filter((d) => d.mealsCount > 0 || d.waterMl > 0).length || 1;
  const totalCaloriesAll = timeline.reduce((acc, d) => acc + d.calories, 0);
  const totalProteinAll = timeline.reduce((acc, d) => acc + d.protein, 0);
  const totalCarbsAll = timeline.reduce((acc, d) => acc + d.carbs, 0);
  const totalFatAll = timeline.reduce((acc, d) => acc + d.fat, 0);
  const totalFiberAll = timeline.reduce((acc, d) => acc + d.fiber, 0);
  const totalSugarAll = timeline.reduce((acc, d) => acc + d.sugar, 0);
  const totalSodiumAll = timeline.reduce((acc, d) => acc + d.sodium, 0);
  const totalWaterMlAll = timeline.reduce((acc, d) => acc + d.waterMl + Math.round(d.workoutWaterLiters * 1000), 0);
  const totalBurnedAll = timeline.reduce((acc, d) => acc + d.caloriesBurned, 0);

  const avgCalories = Math.round(totalCaloriesAll / loggedDaysCount);
  const avgProtein = parseFloat((totalProteinAll / loggedDaysCount).toFixed(1));
  const avgCarbs = parseFloat((totalCarbsAll / loggedDaysCount).toFixed(1));
  const avgFat = parseFloat((totalFatAll / loggedDaysCount).toFixed(1));
  const avgFiber = parseFloat((totalFiberAll / loggedDaysCount).toFixed(1));
  const avgSugar = parseFloat((totalSugarAll / loggedDaysCount).toFixed(1));
  const avgSodium = Math.round(totalSodiumAll / loggedDaysCount);
  const avgWaterLiters = parseFloat(((totalWaterMlAll / loggedDaysCount) / 1000).toFixed(2));
  const avgNetBalance = avgCalories - Math.round(totalBurnedAll / loggedDaysCount);

  // Protein per kg of bodyweight
  const athleteWeight = selectedUser?.weight_kg || 75;
  const proteinPerKg = parseFloat((avgProtein / athleteWeight).toFixed(2));

  // Macronutrient Energy Contributions (Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g)
  const proteinCalories = avgProtein * 4;
  const carbsCalories = avgCarbs * 4;
  const fatCalories = avgFat * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories || 1;

  const macroRatio = {
    proteinPct: Math.round((proteinCalories / totalMacroCalories) * 100),
    carbsPct: Math.round((carbsCalories / totalMacroCalories) * 100),
    fatPct: Math.round((fatCalories / totalMacroCalories) * 100),
  };

  // Protein Density (Grams of protein per 100 kcal)
  const proteinDensity = avgCalories > 0 ? parseFloat(((avgProtein / avgCalories) * 100).toFixed(1)) : 0;

  // Fluid to Calorie Balance (ml of water per kcal)
  const fluidCalorieRatio = avgCalories > 0 ? parseFloat(((avgWaterLiters * 1000) / avgCalories).toFixed(2)) : 0;

  // Calorie Target Compliance Rate (within ±10% of target)
  const compliantDays = timeline.filter((d) => {
    if (d.calories <= 0) return false;
    const diff = Math.abs(d.calories - targets.caloriesTarget);
    return diff <= targets.caloriesTarget * 0.1;
  }).length;
  const complianceRatePct = loggedDaysCount > 0 ? Math.round((compliantDays / loggedDaysCount) * 100) : 0;

  // Hydration Goal Hit Rate (>= 2.5L or target)
  const hydrationTargetLiters = targets.waterTargetMl / 1000;
  const hydratedDays = timeline.filter((d) => d.waterLiters >= hydrationTargetLiters * 0.9).length;
  const hydrationHitRatePct = loggedDaysCount > 0 ? Math.round((hydratedDays / loggedDaysCount) * 100) : 0;

  // Consecutive Days Streak
  let currentStreak = 0;
  if (timeline.length > 0) {
    const rev = [...timeline].reverse();
    for (const d of rev) {
      if (d.mealsCount > 0 || d.waterMl > 0) currentStreak++;
      else break;
    }
  }

  // Circadian Meal Timing (24 hours) & Late Night Eating Index (> 20:30 / 8:30 PM)
  const circadianMealsMap = {};
  for (let h = 0; h < 24; h++) {
    circadianMealsMap[h] = {
      hour: h,
      label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`,
      count: 0,
      calories: 0,
    };
  }

  let lateNightCalories = 0;
  let totalCircadianCalories = 0;
  let minHourLogged = 24;
  let maxHourLogged = 0;

  circadianMealsRes.rows.forEach((r) => {
    const h = r.hour_num;
    const count = parseInt(r.meals_count, 10) || 0;
    const cal = Math.round(parseFloat(r.calories) || 0);

    if (circadianMealsMap[h]) {
      circadianMealsMap[h].count = count;
      circadianMealsMap[h].calories = cal;
    }

    if (count > 0) {
      if (h < minHourLogged) minHourLogged = h;
      if (h > maxHourLogged) maxHourLogged = h;
      totalCircadianCalories += cal;
      if (h >= 21) {
        lateNightCalories += cal;
      }
    }
  });

  const circadianMeals = Object.values(circadianMealsMap);
  const lateNightIndexPct = totalCircadianCalories > 0 ? Math.round((lateNightCalories / totalCircadianCalories) * 100) : 0;
  const feedingWindowHours = maxHourLogged >= minHourLogged ? maxHourLogged - minHourLogged + 1 : 12;

  // 24h Circadian Water Rhythm
  const circadianWaterMap = {};
  for (let h = 0; h < 24; h++) {
    circadianWaterMap[h] = {
      hour: h,
      label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`,
      waterMl: 0,
      logsCount: 0,
    };
  }

  let morningWaterMl = 0;
  let afternoonWaterMl = 0;
  let eveningWaterMl = 0;
  let nightWaterMl = 0;
  let totalWaterLoggedMl = 0;

  circadianWaterRes.rows.forEach((r) => {
    const h = r.hour_num;
    const ml = parseInt(r.water_ml, 10) || 0;
    const c = parseInt(r.logs_count, 10) || 0;

    if (circadianWaterMap[h]) {
      circadianWaterMap[h].waterMl = ml;
      circadianWaterMap[h].logsCount = c;
    }

    totalWaterLoggedMl += ml;
    if (h >= 5 && h < 12) morningWaterMl += ml;
    else if (h >= 12 && h < 17) afternoonWaterMl += ml;
    else if (h >= 17 && h < 21) eveningWaterMl += ml;
    else nightWaterMl += ml;
  });

  const circadianWater = Object.values(circadianWaterMap);
  const totalWaterSafe = totalWaterLoggedMl || 1;

  const waterDayPeriods = [
    { period: 'morning', label: 'Morning', timeRange: '5:00 AM – 11:59 AM', amountMl: morningWaterMl, pct: Math.round((morningWaterMl / totalWaterSafe) * 100) },
    { period: 'afternoon', label: 'Afternoon', timeRange: '12:00 PM – 4:59 PM', amountMl: afternoonWaterMl, pct: Math.round((afternoonWaterMl / totalWaterSafe) * 100) },
    { period: 'evening', label: 'Evening', timeRange: '5:00 PM – 8:59 PM', amountMl: eveningWaterMl, pct: Math.round((eveningWaterMl / totalWaterSafe) * 100) },
    { period: 'night', label: 'Night', timeRange: '9:00 PM – 4:59 AM', amountMl: nightWaterMl, pct: Math.round((nightWaterMl / totalWaterSafe) * 100) },
  ];

  // Day of Week Distribution
  const DAYS_ORDER = [
    { dayNum: 1, day: 'Monday', shortDay: 'Mon' },
    { dayNum: 2, day: 'Tuesday', shortDay: 'Tue' },
    { dayNum: 3, day: 'Wednesday', shortDay: 'Wed' },
    { dayNum: 4, day: 'Thursday', shortDay: 'Thu' },
    { dayNum: 5, day: 'Friday', shortDay: 'Fri' },
    { dayNum: 6, day: 'Saturday', shortDay: 'Sat' },
    { dayNum: 0, day: 'Sunday', shortDay: 'Sun' },
  ];

  const dowMap = {};
  dowRes.rows.forEach((r) => {
    dowMap[r.day_num] = {
      mealsCount: parseInt(r.meals_count, 10),
      avgMealCalories: Math.round(parseFloat(r.avg_meal_calories)),
      totalCalories: Math.round(parseFloat(r.total_calories)),
    };
  });

  const dayOfWeek = DAYS_ORDER.map((d) => ({
    day: d.day,
    shortDay: d.shortDay,
    mealsCount: dowMap[d.dayNum]?.mealsCount || 0,
    avgMealCalories: dowMap[d.dayNum]?.avgMealCalories || 0,
    totalCalories: dowMap[d.dayNum]?.totalCalories || 0,
  }));

  // Meal Types Breakdown
  const totalMealCalories = mealTypeRes.rows.reduce((acc, r) => acc + parseFloat(r.calories || 0), 0) || 1;
  const mealTypes = mealTypeRes.rows.map((r) => {
    const cal = Math.round(parseFloat(r.calories));
    return {
      mealType: r.meal_type,
      count: parseInt(r.count, 10),
      calories: cal,
      protein: Math.round(parseFloat(r.protein)),
      carbs: Math.round(parseFloat(r.carbs)),
      fat: Math.round(parseFloat(r.fat)),
      pct: Math.round((cal / totalMealCalories) * 100),
    };
  });

  // Top Consumed Foods
  const topFoods = topFoodsRes.rows.map((r, idx) => ({
    rank: idx + 1,
    name: r.item_name,
    loggedCount: parseInt(r.logged_count, 10),
    avgCalories: Math.round(parseFloat(r.avg_calories)),
    avgProtein: Math.round(parseFloat(r.avg_protein) * 10) / 10,
    avgCarbs: Math.round(parseFloat(r.avg_carbs) * 10) / 10,
    avgFat: Math.round(parseFloat(r.avg_fat) * 10) / 10,
    totalCalories: Math.round(parseFloat(r.total_calories)),
  }));

  return {
    meta: {
      userId: userParam,
      range,
      timezone: safeTz,
      generatedAt: new Date().toISOString(),
      mode: userParam ? 'athlete' : 'global',
      selectedUser,
      targets,
    },
    athletes: athletesRes.rows,
    kpis: {
      avgCalories,
      avgProtein,
      proteinPerKg,
      avgCarbs,
      avgFat,
      avgFiber,
      avgSugar,
      avgSodium,
      avgWaterLiters,
      avgNetBalance,
      complianceRatePct,
      hydrationHitRatePct,
      currentStreak,
      loggedDaysCount,
      proteinDensity,
      fluidCalorieRatio,
      feedingWindowHours,
      lateNightIndexPct,
      macroRatio,
    },
    timeline,
    mealTypes,
    circadianMeals,
    circadianWater,
    waterDayPeriods,
    dayOfWeek,
    topFoods,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SpotME Admin Recent Logged Meals Explorer (Square Grid & View All Modal)
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function getRecentLoggedMeals({
  userId = null,
  page = 1,
  limit = 12,
  mealType = null,
  minProtein = null,
  maxCalories = null,
  search = null,
  tz = 'UTC',
}) {
  const safeTz = typeof tz === 'string' && /^[a-zA-Z0-9_\-\/+]+$/.test(tz) ? tz : 'UTC';
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (userId) {
    conditions.push(`m.user_id = $${paramIdx++}`);
    params.push(parseInt(userId, 10));
  }

  if (mealType && mealType !== 'ALL') {
    conditions.push(`LOWER(m.meal_type) = LOWER($${paramIdx++})`);
    params.push(mealType.trim());
  }

  if (minProtein !== null && minProtein !== undefined && !isNaN(minProtein)) {
    conditions.push(`m.total_protein >= $${paramIdx++}`);
    params.push(parseFloat(minProtein));
  }

  if (maxCalories !== null && maxCalories !== undefined && !isNaN(maxCalories)) {
    conditions.push(`m.total_calories <= $${paramIdx++}`);
    params.push(parseFloat(maxCalories));
  }

  if (search && search.trim()) {
    conditions.push(`(
      EXISTS (
        SELECT 1 FROM meal_items mi_search
        WHERE mi_search.meal_id = m.id AND mi_search.item_name ILIKE $${paramIdx}
      ) OR m.meal_type ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx}
    )`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total meals
  const countQuery = `
    SELECT COUNT(m.id)::int AS total
    FROM meals m
    JOIN users u ON m.user_id = u.id
    ${whereClause}
  `;

  // Fetch meals with aggregated food items
  const mealsQuery = `
    SELECT
      m.id,
      m.user_id,
      u.full_name AS athlete_name,
      u.email AS athlete_email,
      u.profile_pic_url AS athlete_avatar,
      m.image_url,
      COALESCE(NULLIF(TRIM(m.meal_type), ''), 'Meal') AS meal_type,
      COALESCE(m.total_calories, 0)::numeric AS calories,
      COALESCE(m.total_protein, 0)::numeric AS protein,
      COALESCE(m.total_carbs, 0)::numeric AS carbs,
      COALESCE(m.total_fat, 0)::numeric AS fat,
      COALESCE(m.total_fiber, 0)::numeric AS fiber,
      COALESCE(m.total_sugar, 0)::numeric AS sugar,
      COALESCE(m.total_sodium, 0)::numeric AS sodium,
      COALESCE(m.total_saturated_fat, 0)::numeric AS saturated_fat,
      COALESCE(m.total_cholesterol, 0)::numeric AS cholesterol,
      m.logged_at,
      TO_CHAR(((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'YYYY-MM-DD HH24:MI') AS local_datetime,
      TO_CHAR(((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'Mon DD, YYYY') AS formatted_date,
      TO_CHAR(((COALESCE(m.logged_at, m.created_at) AT TIME ZONE 'UTC') AT TIME ZONE '${safeTz}'), 'HH12:MI AM') AS formatted_time,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', mi.id,
            'name', mi.item_name,
            'quantity', mi.quantity,
            'calories', mi.calories,
            'protein', mi.protein,
            'carbs', mi.carbs,
            'fat', mi.fat
          ) ORDER BY mi.id ASC
        ) FILTER (WHERE mi.id IS NOT NULL), '[]'::json
      ) AS items
    FROM meals m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN meal_items mi ON m.id = mi.meal_id
    ${whereClause}
    GROUP BY m.id, m.user_id, u.full_name, u.email, u.profile_pic_url
    ORDER BY m.logged_at DESC, m.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const queryParams = [...params, limitNum, offset];

  const [countRes, mealsRes] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(mealsQuery, queryParams),
  ]);

  const total = countRes.rows[0]?.total || 0;
  const meals = mealsRes.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    athleteName: r.athlete_name,
    athleteEmail: r.athlete_email,
    athleteAvatar: r.athlete_avatar,
    imageUrl: r.image_url,
    mealType: r.meal_type,
    calories: Math.round(parseFloat(r.calories)),
    protein: Math.round(parseFloat(r.protein) * 10) / 10,
    carbs: Math.round(parseFloat(r.carbs) * 10) / 10,
    fat: Math.round(parseFloat(r.fat) * 10) / 10,
    fiber: Math.round(parseFloat(r.fiber) * 10) / 10,
    sugar: Math.round(parseFloat(r.sugar) * 10) / 10,
    sodium: Math.round(parseFloat(r.sodium)),
    saturatedFat: Math.round(parseFloat(r.saturated_fat) * 10) / 10,
    cholesterol: Math.round(parseFloat(r.cholesterol)),
    loggedAt: r.logged_at,
    localDatetime: r.local_datetime,
    formattedDate: r.formatted_date,
    formattedTime: r.formatted_time,
    items: r.items || [],
  }));

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    meals,
  };
}

module.exports = {
  getNutritionAnalytics,
  getRecentLoggedMeals,
};
