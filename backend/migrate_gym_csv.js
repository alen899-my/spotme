const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { pool, initDB } = require('./db');

async function migrate() {
  const csvPath = path.join(__dirname, 'data/newdatas/GYM.csv');
  console.log("Starting migration. Checking CSV file at:", csvPath);

  if (!fs.existsSync(csvPath)) {
    console.error("GYM.csv file not found. Make sure path is correct.");
    process.exit(1);
  }

  // Initialize DB tables first to ensure the table exists
  console.log("Initializing database tables...");
  await initDB();

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalRows = 0;
  const uniqueKeys = new Map();
  let isHeader = true;

  console.log("Reading CSV and extracting unique combinations...");
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    totalRows++;

    // Simple CSV parser
    let parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (parts.length >= 5) {
      const gender = parts[0].trim().toLowerCase();
      const goal = parts[1].trim().toLowerCase();
      const bmiCategory = parts[2].trim().toLowerCase();
      const schedule = parts[3].trim();
      const mealPlan = parts[4].trim();

      const key = `${gender}|${goal}|${bmiCategory}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, { gender, goal, bmiCategory, schedule, mealPlan });
      }
    }
  }

  console.log(`Found ${totalRows} total rows. Extracted ${uniqueKeys.size} unique recommendation combinations.`);

  console.log("Inserting unique recommendations into gym_csv_recommendations table...");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [_, rec] of uniqueKeys.entries()) {
      await client.query(`
        INSERT INTO gym_csv_recommendations (gender, goal, bmi_category, schedule, meal_plan)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (gender, goal, bmi_category) 
        DO UPDATE SET 
          schedule = EXCLUDED.schedule,
          meal_plan = EXCLUDED.meal_plan
      `, [rec.gender, rec.goal, rec.bmiCategory, rec.schedule, rec.mealPlan]);
    }

    await client.query('COMMIT');
    console.log("Migration completed successfully! 🎉");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration transaction failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
