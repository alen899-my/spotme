const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { pool, initDB } = require('./db');

function floatOrNull(val) {
  if (val === undefined || val === null) return null;
  const cleaned = val.trim();
  if (cleaned === '') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function multiplyBy1000(val) {
  const f = floatOrNull(val);
  return f === null ? null : f * 1000;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const COLUMNS = [
  'source_file',
  'source_group',
  'food_name',
  'category',
  'meal_type',
  'nutrition_grade',
  'serving_size',
  'ingredients_text',
  'image_url',
  'image_small_url',
  'calories_kcal',
  'energy_kj',
  'protein_g',
  'carbohydrates_g',
  'fat_g',
  'fiber_g',
  'sugars_g',
  'saturated_fat_g',
  'monounsaturated_fat_g',
  'polyunsaturated_fat_g',
  'trans_fat_g',
  'omega3_fat_g',
  'omega6_fat_g',
  'salt_g',
  'sodium_mg',
  'cholesterol_mg',
  'water_g',
  'water_intake_ml',
  'vitamin_a',
  'vitamin_b1',
  'vitamin_b2',
  'vitamin_b3_niacin',
  'vitamin_b5',
  'vitamin_b6',
  'vitamin_b11_folate',
  'vitamin_b12',
  'vitamin_c',
  'vitamin_d',
  'vitamin_e',
  'vitamin_k',
  'vitamin_pp',
  'calcium_mg',
  'phosphorus_mg',
  'potassium_mg',
  'iron_mg',
  'magnesium_mg',
  'zinc_mg',
  'copper_mg',
  'manganese_mg',
  'selenium_ug',
  'nutrition_density'
];

async function bulkInsert(client, rows) {
  if (rows.length === 0) return;
  const valuePlaceholders = [];
  const flatValues = [];
  let paramCount = 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const placeholders = [];
    for (let j = 0; j < COLUMNS.length; j++) {
      placeholders.push(`$${paramCount++}`);
      flatValues.push(row[COLUMNS[j]]);
    }
    valuePlaceholders.push(`(${placeholders.join(',')})`);
  }

  const query = `
    INSERT INTO food_database (${COLUMNS.join(',')})
    VALUES ${valuePlaceholders.join(',')}
  `;
  await client.query(query, flatValues);
}

function createBaseRowObject(sourceFile) {
  const rowObj = {};
  for (const col of COLUMNS) {
    rowObj[col] = null;
  }
  rowObj.source_file = sourceFile;
  return rowObj;
}

async function migrateFile(client, filePath, sourceFile, mapper) {
  console.log(`Starting migration of ${sourceFile} from ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalRows = 0;
  let batch = [];
  const BATCH_SIZE = 1200;
  let isHeader = true;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const parts = parseCsvLine(line);
    // Ignore completely empty lines or rows that are obviously corrupt/too short
    if (parts.length < 3 || (parts.length === 1 && parts[0].trim() === '')) {
      continue;
    }

    const rowObj = mapper(parts);
    batch.push(rowObj);
    totalRows++;

    if (batch.length >= BATCH_SIZE) {
      await bulkInsert(client, batch);
      batch = [];
      if (totalRows % 12000 === 0) {
        console.log(`  - Imported ${totalRows} rows from ${sourceFile}...`);
      }
    }
  }

  // Insert any remaining rows in the last batch
  if (batch.length > 0) {
    await bulkInsert(client, batch);
  }

  console.log(`Finished ${sourceFile}. Total rows imported: ${totalRows}`);
}

async function runMigration() {
  console.log("Dropping existing food_database if any to re-create with unrestricted NUMERIC types...");
  const tempClient = await pool.connect();
  try {
    await tempClient.query("DROP TABLE IF EXISTS food_database CASCADE;");
  } finally {
    tempClient.release();
  }

  console.log("Initializing DB schema first...");
  await initDB();

  const client = await pool.connect();
  try {
    console.log("Clearing existing food_database records to ensure clean migration...");
    await client.query("TRUNCATE TABLE food_database RESTART IDENTITY");

    // ── 1. food2.csv ─────────────────────────────────────────────────────────
    const food2Path = path.join(__dirname, 'data/newdatas/food2.csv');
    const food2Mapper = (parts) => {
      const row = createBaseRowObject('food2');
      row.food_name = parts[0]?.trim() || 'Unknown';
      row.category = parts[1]?.trim() || null;
      row.meal_type = parts[2]?.trim() || null;
      row.calories_kcal = floatOrNull(parts[3]);
      row.protein_g = floatOrNull(parts[4]);
      row.carbohydrates_g = floatOrNull(parts[5]);
      row.fat_g = floatOrNull(parts[6]);
      row.fiber_g = floatOrNull(parts[7]);
      row.sugars_g = floatOrNull(parts[8]);
      row.sodium_mg = floatOrNull(parts[9]);
      row.cholesterol_mg = floatOrNull(parts[10]);
      row.water_intake_ml = floatOrNull(parts[11]);
      return row;
    };
    await migrateFile(client, food2Path, 'food2', food2Mapper);

    // ── 2. food3.csv ─────────────────────────────────────────────────────────
    const food3Path = path.join(__dirname, 'data/newdatas/food3.csv');
    const food3Mapper = (parts) => {
      const row = createBaseRowObject('food3');
      row.food_name = parts[0]?.trim() || 'Unknown';
      row.source_group = parts[1]?.trim() || null;
      row.calories_kcal = floatOrNull(parts[2]);
      row.fat_g = floatOrNull(parts[3]);
      row.saturated_fat_g = floatOrNull(parts[4]);
      row.monounsaturated_fat_g = floatOrNull(parts[5]);
      row.polyunsaturated_fat_g = floatOrNull(parts[6]);
      row.carbohydrates_g = floatOrNull(parts[7]);
      row.sugars_g = floatOrNull(parts[8]);
      row.protein_g = floatOrNull(parts[9]);
      row.fiber_g = floatOrNull(parts[10]);
      row.cholesterol_mg = floatOrNull(parts[11]);
      row.sodium_mg = floatOrNull(parts[12]);
      row.water_g = floatOrNull(parts[13]);
      row.vitamin_a = floatOrNull(parts[14]);
      row.vitamin_b1 = floatOrNull(parts[15]);
      row.vitamin_b11_folate = floatOrNull(parts[16]);
      row.vitamin_b12 = floatOrNull(parts[17]);
      row.vitamin_b2 = floatOrNull(parts[18]);
      row.vitamin_b3_niacin = floatOrNull(parts[19]);
      row.vitamin_b5 = floatOrNull(parts[20]);
      row.vitamin_b6 = floatOrNull(parts[21]);
      row.vitamin_c = floatOrNull(parts[22]);
      row.vitamin_d = floatOrNull(parts[23]);
      row.vitamin_e = floatOrNull(parts[24]);
      row.vitamin_k = floatOrNull(parts[25]);
      row.calcium_mg = floatOrNull(parts[26]);
      row.copper_mg = floatOrNull(parts[27]);
      row.iron_mg = floatOrNull(parts[28]);
      row.magnesium_mg = floatOrNull(parts[29]);
      row.manganese_mg = floatOrNull(parts[30]);
      row.phosphorus_mg = floatOrNull(parts[31]);
      row.potassium_mg = floatOrNull(parts[32]);
      row.selenium_ug = floatOrNull(parts[33]);
      row.zinc_mg = floatOrNull(parts[34]);
      row.nutrition_density = floatOrNull(parts[35]);
      return row;
    };
    await migrateFile(client, food3Path, 'food3', food3Mapper);

    // ── 3. food1new.csv ──────────────────────────────────────────────────────
    const food1Path = path.join(__dirname, 'data/newdatas/food1new.csv');
    const food1Mapper = (parts) => {
      const row = createBaseRowObject('food1new');
      row.food_name = parts[0]?.trim() || 'Unknown';
      row.ingredients_text = parts[1]?.trim() || null;
      row.serving_size = parts[2]?.trim() || null;
      row.nutrition_grade = parts[3]?.trim() || null;
      row.image_url = parts[4]?.trim() || null;
      row.image_small_url = parts[5]?.trim() || null;
      row.energy_kj = floatOrNull(parts[6]);
      row.fat_g = floatOrNull(parts[7]);
      row.saturated_fat_g = floatOrNull(parts[8]);
      row.omega3_fat_g = floatOrNull(parts[9]);
      row.omega6_fat_g = floatOrNull(parts[10]);
      row.trans_fat_g = floatOrNull(parts[11]);
      row.cholesterol_mg = multiplyBy1000(parts[12]);
      row.carbohydrates_g = floatOrNull(parts[13]);
      row.sugars_g = floatOrNull(parts[14]);
      row.fiber_g = floatOrNull(parts[15]);
      row.protein_g = floatOrNull(parts[16]);
      row.salt_g = floatOrNull(parts[17]);
      row.sodium_mg = multiplyBy1000(parts[18]);
      row.vitamin_a = floatOrNull(parts[19]);
      row.vitamin_d = floatOrNull(parts[20]);
      row.vitamin_e = floatOrNull(parts[21]);
      row.vitamin_c = floatOrNull(parts[22]);
      row.vitamin_b1 = floatOrNull(parts[23]);
      row.vitamin_b2 = floatOrNull(parts[24]);
      row.vitamin_b3_niacin = floatOrNull(parts[25]);
      row.vitamin_b6 = floatOrNull(parts[26]);
      row.vitamin_b11_folate = floatOrNull(parts[27]);
      row.vitamin_b12 = floatOrNull(parts[28]);
      row.potassium_mg = multiplyBy1000(parts[29]);
      row.calcium_mg = multiplyBy1000(parts[30]);
      row.phosphorus_mg = multiplyBy1000(parts[31]);
      row.iron_mg = multiplyBy1000(parts[32]);
      row.magnesium_mg = multiplyBy1000(parts[33]);
      row.zinc_mg = multiplyBy1000(parts[34]);
      row.calories_kcal = floatOrNull(parts[35]);
      row.vitamin_pp = floatOrNull(parts[25]);
      return row;
    };
    await migrateFile(client, food1Path, 'food1new', food1Mapper);

    console.log("Migration of all food files complete! 🎉");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
