const { pool } = require('../db.js');

async function testAlternatives() {
  try {
    // Example: Replacing 150g Chicken breast (roughly: 165 kcal, 31g protein, 0g carbs, 3.6g fat)
    const targetProtein = 31;
    const targetCarbs = 0;
    const targetFat = 3.6;

    const totalMacros = targetProtein + targetCarbs + targetFat;
    const pctProtein = targetProtein / totalMacros;
    const pctCarbs = targetCarbs / totalMacros;
    const pctFat = targetFat / totalMacros;

    console.log(`Target Pct: P=${(pctProtein*100).toFixed(1)}% C=${(pctCarbs*100).toFixed(1)}% F=${(pctFat*100).toFixed(1)}%`);

    const query = `
      WITH valid_foods AS (
        SELECT
          id, food_name, category, image_url, image_small_url,
          calories_kcal, protein_g, carbohydrates_g, fat_g, nutrition_density,
          (COALESCE(protein_g, 0) + COALESCE(carbohydrates_g, 0) + COALESCE(fat_g, 0)) AS total_macros
        FROM food_database
        WHERE calories_kcal > 0 
          AND (COALESCE(protein_g, 0) + COALESCE(carbohydrates_g, 0) + COALESCE(fat_g, 0)) > 0
          AND (image_url IS NOT NULL AND image_url != '')
      )
      SELECT 
        id, food_name, calories_kcal, protein_g, carbohydrates_g, fat_g,
        (
          ABS((COALESCE(protein_g, 0) / total_macros) - $1) + 
          ABS((COALESCE(carbohydrates_g, 0) / total_macros) - $2) + 
          ABS((COALESCE(fat_g, 0) / total_macros) - $3)
        ) AS distance
      FROM valid_foods
      WHERE food_name NOT ILIKE '%chicken%'
      ORDER BY distance ASC, nutrition_density DESC NULLS LAST
      LIMIT 10;
    `;

    const res = await pool.query(query, [pctProtein, pctCarbs, pctFat]);
    
    console.log("Top Alternatives for Chicken:");
    console.table(res.rows.map(r => ({
      name: r.food_name,
      distance: Number(r.distance).toFixed(3),
      p: r.protein_g,
      c: r.carbohydrates_g,
      f: r.fat_g
    })));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}

testAlternatives();
