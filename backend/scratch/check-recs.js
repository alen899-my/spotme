require('dotenv').config();
const { pool } = require('../db');

async function checkMealRecs() {
  try {
    // Check what's in meal_recommendations (the user-specific cached recs)
    console.log("=== meal_recommendations table ===");
    const cached = await pool.query('SELECT user_id, bmi, bmi_category, user_weight, user_height, user_goal, array_length(ARRAY(SELECT jsonb_array_elements(recommended_meals)), 1) as meal_count, updated_at FROM meal_recommendations');
    console.log("Rows:", JSON.stringify(cached.rows, null, 2));

    // Check gym_csv_recommendations
    console.log("\n=== gym_csv_recommendations table ===");
    const gymRecs = await pool.query('SELECT id, gender, goal, bmi_category, LEFT(schedule, 40) as schedule_preview, LEFT(meal_plan, 40) as meal_plan_preview FROM gym_csv_recommendations');
    console.log(`Found ${gymRecs.rows.length} rows`);
    console.log(JSON.stringify(gymRecs.rows, null, 2));

    // Check sample recommended_meals structure from meal_recommendations
    if (cached.rows.length > 0) {
      console.log("\n=== Sample recommended_meals for user_id:", cached.rows[0].user_id, "===");
      const sample = await pool.query('SELECT recommended_meals FROM meal_recommendations WHERE user_id = $1', [cached.rows[0].user_id]);
      const meals = sample.rows[0].recommended_meals;
      if (Array.isArray(meals) && meals.length > 0) {
        console.log("First meal sample:", JSON.stringify(meals[0], null, 2));
      } else {
        console.log("recommended_meals value:", JSON.stringify(meals));
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkMealRecs();
