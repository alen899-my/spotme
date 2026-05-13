/**
 * Seed Script: Pre-built Template Splits
 * Creates 6 expert workout splits using real exercises from the DB.
 * Templates have user_id = NULL and is_template = true — they cannot be deleted.
 */
const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper: get N exercises from a category, optionally filtered by target/equipment
async function getExercises(category, limit = 6, target = null, equipment = null) {
  let q = 'SELECT id FROM exercises WHERE category = $1';
  const params = [category];
  let idx = 2;
  if (target) { q += ` AND target ILIKE $${idx++}`; params.push(`%${target}%`); }
  if (equipment) { q += ` AND equipment ILIKE $${idx++}`; params.push(`%${equipment}%`); }
  q += ` ORDER BY name ASC LIMIT $${idx}`;
  params.push(limit);
  const res = await pool.query(q, params);
  return res.rows.map(r => r.id);
}

// Helper: create a split, sessions, and exercises inside each session
async function createTemplate(splitData, sessions) {
  // Check if template already exists to avoid duplicates
  const exists = await pool.query(
    "SELECT id FROM workout_splits WHERE is_template = true AND name = $1",
    [splitData.name]
  );
  if (exists.rows.length > 0) {
    console.log(`⏭  Skipping "${splitData.name}" (already exists)`);
    return;
  }

  const splitRes = await pool.query(
    `INSERT INTO workout_splits (user_id, name, description, is_template, template_goal, template_level, template_days, template_color, template_icon)
     VALUES (NULL, $1, $2, true, $3, $4, $5, $6, $7) RETURNING id`,
    [splitData.name, splitData.description, splitData.goal, splitData.level, splitData.days, splitData.color, splitData.icon]
  );
  const splitId = splitRes.rows[0].id;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const sessRes = await pool.query(
      'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [splitId, session.name, i]
    );
    const sessionId = sessRes.rows[0].id;

    for (let j = 0; j < session.exercises.length; j++) {
      const ex = session.exercises[j];
      await pool.query(
        'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [sessionId, ex.id, ex.sets || 3, ex.reps || '8-12', ex.rest || '60s', '0', j]
      );
    }
    console.log(`   ✓ Session "${session.name}" — ${session.exercises.length} exercises`);
  }
  console.log(`✅ Created template: "${splitData.name}"`);
}

async function seed() {
  console.log('🌱 Seeding workout templates...\n');

  // ── 1. PUSH PULL LEGS (PPL) ────────────────────────────────────────────────
  const chestDumbbell  = await getExercises('chest',    4, null, 'dumbbell');
  const chestBodywt    = await getExercises('chest',    2, null, 'body weight');
  const chestBarbell   = await getExercises('chest',    2, null, 'barbell');
  const shoulderDumbb  = await getExercises('shoulders',4, null, 'dumbbell');
  const shoulderBarb   = await getExercises('shoulders',2, null, 'barbell');
  const tricepsCable   = await getExercises('upper arms',3, 'triceps', 'cable');
  const tricepsBodywt  = await getExercises('upper arms',2, 'triceps', 'body weight');
  const backBarbell    = await getExercises('back',      4, 'lats', 'barbell');
  const backCable      = await getExercises('back',      3, 'lats', 'cable');
  const bicepsDumbb    = await getExercises('upper arms',3, 'biceps', 'dumbbell');
  const bicepsBarbell  = await getExercises('upper arms',2, 'biceps', 'barbell');
  const quadsBarbell   = await getExercises('upper legs',4, 'quads', 'barbell');
  const quadsDumbb     = await getExercises('upper legs',2, 'quads', 'dumbbell');
  const hamstrings     = await getExercises('upper legs',3, 'hamstrings', null);
  const calves         = await getExercises('lower legs',3, 'calves', null);
  const glutes         = await getExercises('upper legs',2, 'glutes', null);
  const waistBodywt    = await getExercises('waist',    4, null, 'body weight');

  const toEx = (ids, sets, reps, rest) => ids.map(id => ({ id, sets, reps, rest }));

  await createTemplate({
    name: 'Push Pull Legs (PPL)',
    description: '6-day split for maximum muscle volume. Separate push, pull, and leg movements for optimal recovery.',
    goal: 'muscle_building',
    level: 'Intermediate',
    days: 6,
    color: '#E00000',
    icon: 'barbell',
  }, [
    {
      name: 'Push Day A — Chest & Shoulders',
      exercises: [
        ...toEx(chestBarbell.slice(0,2),  4, '6-8',   '90s'),
        ...toEx(chestDumbbell.slice(0,2), 3, '10-12', '60s'),
        ...toEx(shoulderBarb.slice(0,1),  4, '6-8',   '90s'),
        ...toEx(shoulderDumbb.slice(0,2), 3, '12-15', '60s'),
        ...toEx(tricepsCable.slice(0,2),  3, '12-15', '45s'),
      ]
    },
    {
      name: 'Pull Day A — Back & Biceps',
      exercises: [
        ...toEx(backBarbell.slice(0,2),   4, '6-8',   '90s'),
        ...toEx(backCable.slice(0,2),     3, '10-12', '60s'),
        ...toEx(bicepsBarbell.slice(0,2), 4, '8-10',  '60s'),
        ...toEx(bicepsDumbb.slice(0,2),   3, '12-15', '45s'),
      ]
    },
    {
      name: 'Leg Day A — Quads & Hamstrings',
      exercises: [
        ...toEx(quadsBarbell.slice(0,2),  4, '6-8',   '120s'),
        ...toEx(quadsDumbb.slice(0,1),    3, '10-12', '90s'),
        ...toEx(hamstrings.slice(0,2),    3, '10-12', '60s'),
        ...toEx(calves.slice(0,2),        4, '15-20', '45s'),
        ...toEx(waistBodywt.slice(0,2),   3, '15-20', '30s'),
      ]
    },
    {
      name: 'Push Day B — Chest & Triceps',
      exercises: [
        ...toEx(chestDumbbell.slice(2,4), 4, '8-10',  '90s'),
        ...toEx(chestBodywt.slice(0,2),   3, '12-15', '60s'),
        ...toEx(shoulderDumbb.slice(2,4), 3, '12-15', '60s'),
        ...toEx(tricepsBodywt.slice(0,2), 3, '12-15', '45s'),
        ...toEx(tricepsCable.slice(2,3),  3, '15-20', '45s'),
      ]
    },
    {
      name: 'Pull Day B — Back & Arms',
      exercises: [
        ...toEx(backBarbell.slice(2,4),   4, '8-10',  '90s'),
        ...toEx(backCable.slice(1,3),     3, '12-15', '60s'),
        ...toEx(bicepsDumbb.slice(1,3),   3, '12-15', '60s'),
        ...toEx(bicepsBarbell.slice(0,1), 3, '10-12', '60s'),
      ]
    },
    {
      name: 'Leg Day B — Glutes & Calves',
      exercises: [
        ...toEx(quadsBarbell.slice(2,4),  4, '8-10',  '120s'),
        ...toEx(glutes.slice(0,2),        3, '12-15', '60s'),
        ...toEx(hamstrings.slice(1,3),    3, '12-15', '60s'),
        ...toEx(calves.slice(1,3),        4, '15-20', '45s'),
        ...toEx(waistBodywt.slice(2,4),   3, '20',    '30s'),
      ]
    },
  ]);

  // ── 2. UPPER / LOWER SPLIT ────────────────────────────────────────────────
  const chestAll    = await getExercises('chest',    5, null, 'barbell');
  const backAll     = await getExercises('back',     5, 'lats', null);
  const shoulderAll = await getExercises('shoulders',4, null, 'dumbbell');
  const armsAll     = await getExercises('upper arms',4, null, 'dumbbell');
  const legsAll     = await getExercises('upper legs',5, null, 'barbell');
  const legsLower   = await getExercises('lower legs',4, null, null);

  await createTemplate({
    name: 'Upper / Lower Split',
    description: '4-day split balancing upper and lower body for strength and symmetry. Perfect for intermediate lifters.',
    goal: 'strength',
    level: 'Intermediate',
    days: 4,
    color: '#3B82F6',
    icon: 'fitness',
  }, [
    {
      name: 'Upper A — Strength',
      exercises: [
        ...toEx(chestAll.slice(0,2),    4, '5',     '120s'),
        ...toEx(backAll.slice(0,2),     4, '5',     '120s'),
        ...toEx(shoulderAll.slice(0,1), 3, '8-10',  '90s'),
        ...toEx(armsAll.slice(0,2),     3, '10-12', '60s'),
      ]
    },
    {
      name: 'Lower A — Quads Focus',
      exercises: [
        ...toEx(legsAll.slice(0,3),     4, '5',     '180s'),
        ...toEx(legsLower.slice(0,2),   3, '12-15', '60s'),
        ...toEx(waistBodywt.slice(0,2), 3, '15-20', '30s'),
      ]
    },
    {
      name: 'Upper B — Hypertrophy',
      exercises: [
        ...toEx(chestAll.slice(2,4),    4, '8-10',  '90s'),
        ...toEx(backAll.slice(2,4),     4, '8-10',  '90s'),
        ...toEx(shoulderAll.slice(1,3), 3, '12-15', '60s'),
        ...toEx(armsAll.slice(2,4),     3, '12-15', '60s'),
      ]
    },
    {
      name: 'Lower B — Hamstrings & Glutes',
      exercises: [
        ...toEx(legsAll.slice(3,5),     4, '8-10',  '120s'),
        ...toEx(glutes.slice(0,2),      3, '12-15', '90s'),
        ...toEx(legsLower.slice(2,4),   4, '15-20', '45s'),
        ...toEx(waistBodywt.slice(2,4), 3, '15-20', '30s'),
      ]
    },
  ]);

  // ── 3. BRO SPLIT (5-DAY) ─────────────────────────────────────────────────
  const chestFull   = await getExercises('chest',    6, null, null);
  const backFull    = await getExercises('back',     6, null, null);
  const shouldFull  = await getExercises('shoulders',6, null, null);
  const tricFull    = await getExercises('upper arms',4, 'triceps', null);
  const bicFull     = await getExercises('upper arms',4, 'biceps', null);
  const forearms    = await getExercises('lower arms',3, null, null);
  const legsFull    = await getExercises('upper legs',6, null, null);
  const calfFull    = await getExercises('lower legs',3, null, null);
  const coreFull    = await getExercises('waist',    4, null, null);

  await createTemplate({
    name: 'Classic Bro Split (5-Day)',
    description: 'Train each muscle group once a week with maximum volume. The gold standard for hypertrophy.',
    goal: 'hypertrophy',
    level: 'Intermediate',
    days: 5,
    color: '#10B981',
    icon: 'trophy',
  }, [
    {
      name: 'Chest Day',
      exercises: [
        ...toEx(chestFull.slice(0,6), 4, '8-12', '60s'),
      ]
    },
    {
      name: 'Back & Biceps',
      exercises: [
        ...toEx(backFull.slice(0,4),  4, '8-12', '60s'),
        ...toEx(bicFull.slice(0,3),   3, '10-15', '45s'),
      ]
    },
    {
      name: 'Shoulder & Traps',
      exercises: [
        ...toEx(shouldFull.slice(0,5), 4, '10-15', '60s'),
        ...toEx(forearms.slice(0,2),   3, '15-20', '30s'),
      ]
    },
    {
      name: 'Arms Day',
      exercises: [
        ...toEx(tricFull.slice(0,4),  4, '10-15', '45s'),
        ...toEx(bicFull.slice(1,4),   4, '10-15', '45s'),
        ...toEx(forearms.slice(0,2),  3, '15-20', '30s'),
      ]
    },
    {
      name: 'Leg Day',
      exercises: [
        ...toEx(legsFull.slice(0,4),  4, '10-12', '90s'),
        ...toEx(calfFull.slice(0,3),  4, '15-20', '45s'),
        ...toEx(coreFull.slice(0,2),  3, '20',    '30s'),
      ]
    },
  ]);

  // ── 4. FULL BODY BEGINNER (3-DAY) ────────────────────────────────────────
  const chestBeg   = await getExercises('chest',     2, null, 'body weight');
  const backBeg    = await getExercises('back',      2, null, 'body weight');
  const legsBeg    = await getExercises('upper legs', 3, null, 'body weight');
  const shouldBeg  = await getExercises('shoulders',  2, null, 'dumbbell');
  const armsBeg    = await getExercises('upper arms',  2, null, 'dumbbell');
  const calfBeg    = await getExercises('lower legs',  2, null, 'body weight');
  const coreBeg    = await getExercises('waist',       3, null, 'body weight');
  const cardioBeg  = await getExercises('cardio',      2, null, 'body weight');

  await createTemplate({
    name: 'Full Body Beginner (3-Day)',
    description: 'Simple 3-day full body routine for beginners. Focuses on fundamental movement patterns.',
    goal: 'general_fitness',
    level: 'Beginner',
    days: 3,
    color: '#F59E0B',
    icon: 'star',
  }, [
    {
      name: 'Full Body A',
      exercises: [
        ...toEx(chestBeg.slice(0,2),  3, '8-10',  '90s'),
        ...toEx(backBeg.slice(0,2),   3, '8-10',  '90s'),
        ...toEx(legsBeg.slice(0,2),   3, '10-12', '60s'),
        ...toEx(coreBeg.slice(0,2),   3, '15',    '30s'),
      ]
    },
    {
      name: 'Full Body B',
      exercises: [
        ...toEx(shouldBeg.slice(0,2), 3, '10-12', '60s'),
        ...toEx(armsBeg.slice(0,2),   3, '10-12', '60s'),
        ...toEx(legsBeg.slice(1,3),   3, '10-12', '60s'),
        ...toEx(calfBeg.slice(0,2),   3, '15-20', '30s'),
      ]
    },
    {
      name: 'Full Body C',
      exercises: [
        ...toEx(chestBeg.slice(0,2),  3, '10-12', '60s'),
        ...toEx(backBeg.slice(0,2),   3, '10-12', '60s'),
        ...toEx(coreBeg.slice(1,3),   3, '15-20', '30s'),
        ...toEx(cardioBeg.slice(0,2), 2, '30 sec', '30s'),
      ]
    },
  ]);

  // ── 5. FAT BURN & WEIGHT LOSS (5-DAY) ───────────────────────────────────
  const cardioFull  = await getExercises('cardio',    5, null, 'body weight');
  const waistFull   = await getExercises('waist',     5, null, 'body weight');
  const chestWL     = await getExercises('chest',     3, null, 'body weight');
  const backWL      = await getExercises('back',      3, null, 'body weight');
  const shouldWL    = await getExercises('shoulders', 3, null, 'dumbbell');
  const legsWL      = await getExercises('upper legs',4, null, 'body weight');
  const calvesWL    = await getExercises('lower legs', 2, null, 'body weight');

  await createTemplate({
    name: 'Fat Burn & Weight Loss (5-Day)',
    description: 'High-intensity training with cardio circuits to torch fat. Combines strength and cardio for caloric burn.',
    goal: 'weight_loss',
    level: 'Beginner',
    days: 5,
    color: '#EF4444',
    icon: 'flame',
  }, [
    {
      name: 'Cardio + Core',
      exercises: [
        ...toEx(cardioFull.slice(0,3), 3, '30 sec', '15s'),
        ...toEx(waistFull.slice(0,3),  3, '20',     '30s'),
      ]
    },
    {
      name: 'Upper Body Strength',
      exercises: [
        ...toEx(chestWL.slice(0,3),   3, '12-15', '45s'),
        ...toEx(backWL.slice(0,3),    3, '12-15', '45s'),
        ...toEx(shouldWL.slice(0,2),  3, '15-20', '30s'),
      ]
    },
    {
      name: 'HIIT + Legs',
      exercises: [
        ...toEx(cardioFull.slice(2,4), 4, '30 sec', '15s'),
        ...toEx(legsWL.slice(0,3),     3, '15-20', '45s'),
        ...toEx(calvesWL.slice(0,2),   3, '20-25', '30s'),
      ]
    },
    {
      name: 'Arms & Core Circuit',
      exercises: [
        ...toEx(armsBeg.slice(0,2),    3, '15-20', '30s'),
        ...toEx(waistFull.slice(2,5),  3, '20',    '20s'),
        ...toEx(cardioFull.slice(0,2), 2, '30 sec', '15s'),
      ]
    },
    {
      name: 'Cardio Blast',
      exercises: [
        ...toEx(cardioFull.slice(0,5), 3, '45 sec', '15s'),
        ...toEx(waistFull.slice(0,3),  3, '20',     '20s'),
      ]
    },
  ]);

  // ── 6. HOME WORKOUT — NO EQUIPMENT (4-DAY) ───────────────────────────────
  const chestHome  = await getExercises('chest',     4, null, 'body weight');
  const backHome   = await getExercises('back',      4, null, 'body weight');
  const shouldHome = await getExercises('shoulders', 3, null, 'body weight');
  const armsHome   = await getExercises('upper arms',3, null, 'body weight');
  const legsHome   = await getExercises('upper legs',4, null, 'body weight');
  const calvHome   = await getExercises('lower legs', 3, null, 'body weight');
  const coreHome   = await getExercises('waist',     4, null, 'body weight');
  const cardHome   = await getExercises('cardio',    3, null, 'body weight');

  await createTemplate({
    name: 'Home Workout (No Equipment)',
    description: 'Train anywhere with zero equipment. Body weight only — great for travel or home lifters.',
    goal: 'general_fitness',
    level: 'All Levels',
    days: 4,
    color: '#8B5CF6',
    icon: 'home',
  }, [
    {
      name: 'Upper Body Push',
      exercises: [
        ...toEx(chestHome.slice(0,4),  4, '10-15', '60s'),
        ...toEx(shouldHome.slice(0,2), 3, '12-15', '45s'),
        ...toEx(armsHome.slice(0,2),   3, '12-15', '45s'),
      ]
    },
    {
      name: 'Lower Body Power',
      exercises: [
        ...toEx(legsHome.slice(0,4),   4, '15-20', '60s'),
        ...toEx(calvHome.slice(0,3),   3, '20-25', '30s'),
        ...toEx(coreHome.slice(0,2),   3, '20',    '20s'),
      ]
    },
    {
      name: 'Core & Cardio',
      exercises: [
        ...toEx(coreHome.slice(0,4),   3, '20',    '20s'),
        ...toEx(cardHome.slice(0,3),   3, '30 sec', '15s'),
      ]
    },
    {
      name: 'Full Body Circuit',
      exercises: [
        ...toEx(chestHome.slice(2,4),  3, '12-15', '30s'),
        ...toEx(backHome.slice(2,4),   3, '12-15', '30s'),
        ...toEx(legsHome.slice(2,4),   3, '15-20', '30s'),
        ...toEx(cardHome.slice(0,2),   3, '30 sec', '15s'),
      ]
    },
  ]);

  // ── 7. ELITE SINGLE MUSCLE SPLIT (6-DAY) ──────────────────────────────────
  const chestElite   = await getExercises('chest',      8, null, null);
  const backElite    = await getExercises('back',       8, null, null);
  const shouldElite  = await getExercises('shoulders',  8, null, null);
  const armsElite    = await getExercises('upper arms', 8, null, null);
  const legsElite    = await getExercises('upper legs', 8, null, null);
  const waistElite   = await getExercises('waist',      6, null, null);

  await createTemplate({
    name: 'Elite Single Muscle Split',
    description: 'The ultimate 6-day body part split. Focus 100% of your energy on one muscle group per day for maximum growth and recovery.',
    goal: 'muscle_building',
    level: 'Advanced',
    days: 6,
    color: '#F43F5E',
    icon: 'flame',
  }, [
    { name: 'Monday: Chest Focus', exercises: toEx(chestElite.slice(0,7), 4, '8-12', '90s') },
    { name: 'Tuesday: Back Focus', exercises: toEx(backElite.slice(0,7), 4, '8-12', '90s') },
    { name: 'Wednesday: Shoulder Focus', exercises: toEx(shouldElite.slice(0,6), 4, '10-15', '60s') },
    { name: 'Thursday: Arms Focus (Biceps/Triceps)', exercises: toEx(armsElite.slice(0,8), 3, '12-15', '45s') },
    { name: 'Friday: Leg Focus (Quads/Hams)', exercises: toEx(legsElite.slice(0,7), 4, '10-12', '120s') },
    { name: 'Saturday: Core & Definition', exercises: [
        ...toEx(waistElite.slice(0,5), 3, '15-20', '30s'),
        ...toEx(cardioFull.slice(0,2), 3, '45s', '30s')
      ]
    },
  ]);

  console.log('\n🎉 All templates seeded successfully!');
  await pool.end();
}

seed().catch(e => { console.error('❌ Seed failed:', e.message, e.stack); pool.end(); });
