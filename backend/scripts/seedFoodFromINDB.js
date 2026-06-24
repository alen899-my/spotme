const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const XLSX = require('xlsx');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function val(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function valStr(v) {
  if (v === undefined || v === null || v === '') return null;
  return String(v).trim() || null;
}

async function seed() {
  console.log('Reading INDB.xlsx...');
  const wb = XLSX.readFile(`${__dirname}/../data/INDB.xlsx`);
  const ws = wb.Sheets['Nutrient Data'];
  const rows = XLSX.utils.sheet_to_json(ws);

  console.log(`Found ${rows.length} food items. Deleting existing data...`);
  await pool.query('DELETE FROM food_database');

  let inserted = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let p = 1;

    for (const r of batch) {
      params.push(
        valStr(r.food_name),
        val(r.energy_kcal),
        val(r.energy_kj),
        val(r.protein_g),
        val(r.carb_g),
        val(r.fat_g),
        val(r.freesugar_g),
        val(r.fibre_g),
        val(r.sfa_mg) !== null ? val(r.sfa_mg) / 1000 : null,
        val(r.mufa_mg) !== null ? val(r.mufa_mg) / 1000 : null,
        val(r.pufa_mg) !== null ? val(r.pufa_mg) / 1000 : null,
        val(r.cholesterol_mg),
        val(r.sodium_mg),
        val(r.calcium_mg),
        val(r.phosphorus_mg),
        val(r.magnesium_mg),
        val(r.potassium_mg),
        val(r.iron_mg),
        val(r.copper_mg),
        val(r.selenium_ug),
        val(r.chromium_mg),
        val(r.manganese_mg),
        val(r.molybdenum_mg),
        val(r.zinc_mg),
        val(r.vita_ug),
        val(r.vite_mg),
        val(r.vitd2_ug) !== null && val(r.vitd3_ug) !== null
          ? val(r.vitd2_ug) + val(r.vitd3_ug)
          : val(r.vitd2_ug) ?? val(r.vitd3_ug),
        val(r.vitk1_ug) !== null && val(r.vitk2_ug) !== null
          ? val(r.vitk1_ug) + val(r.vitk2_ug)
          : val(r.vitk1_ug) ?? val(r.vitk2_ug),
        val(r.vitc_mg),
        val(r.vitb1_mg),
        val(r.vitb2_mg),
        val(r.vitb3_mg),
        val(r.vitb5_mg),
        val(r.vitb6_mg),
        val(r.vitb7_ug),
        val(r.vitb9_ug),
        val(r.folate_ug),
        val(r.carotenoids_ug),
        valStr(r.primarysource),
        valStr(r.servings_unit),
      );
      const template = `(
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++},
        $${p++}, $${p++}, $${p++}, $${p++}, $${p++}
      )`;
      values.push(template);
    }

    const sql = `INSERT INTO food_database (
      food_name, calories_kcal, energy_kj, protein_g, carbohydrates_g,
      fat_g, sugars_g, fiber_g, saturated_fat_g, monounsaturated_fat_g,
      polyunsaturated_fat_g, cholesterol_mg, sodium_mg, calcium_mg, phosphorus_mg,
      magnesium_mg, potassium_mg, iron_mg, copper_mg, selenium_ug,
      chromium_mg, manganese_mg, molybdenum_mg, zinc_mg, vitamin_a,
      vitamin_e, vitamin_d, vitamin_k, vitamin_c, vitamin_b1,
      vitamin_b2, vitamin_b3_niacin, vitamin_b5, vitamin_b6, biotin_ug,
      folate_ug, vitamin_b11_folate, carotenoids_ug, source_group, servings_unit
    ) VALUES ${values.join(',')}`;

    await pool.query(sql, params);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${rows.length}`);
  }

  console.log(`\nDone! ${inserted} foods imported from INDB.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
