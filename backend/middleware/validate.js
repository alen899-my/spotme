const { z } = require('zod');

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure it responds with 422 and a structured list of field errors.
 * On success it replaces req.body with the parsed (coerced + stripped) data.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(422).json({
      error: 'Validation failed',
      details: errors,
    });
  }
  req.body = result.data; // use parsed/coerced data
  next();
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const startWorkoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  split_id: z.number({ required_error: 'Program selection is required' }).int().positive(),
  session_id: z.number({ required_error: 'Split day selection is required' }).int().positive(),
});

const logSetSchema = z.object({
  set_number: z.number({ required_error: 'set_number is required' }).int().min(1),
  weight: z.number().min(0).default(0),
  reps: z.number({ required_error: 'reps is required' }).int().min(0, 'Reps must be at least 0').optional(),
  duration_seconds: z.number().int().min(0).default(0),
  rest_seconds: z.number().int().min(0).default(0),
  workout_duration: z.number().int().min(0).optional(),
  total_rest_duration: z.number().int().min(0).optional(),
  is_skipped: z.boolean().default(false),
});

const completeWorkoutSchema = z.object({
  total_duration_seconds: z.number().int().min(0).default(0),
  total_volume: z.number().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
  completion_photo_url: z.string().nullable().optional()
    .transform(v => v || null),
  water_intake_liters: z.number().min(0).optional(),
  post_workout_weight: z.number().min(0).optional(),
  total_rest_seconds: z.number().int().min(0).optional(),
  photos: z.array(z.string()).optional(),
});

const addExerciseSchema = z.object({
  exercise_id: z.string({ required_error: 'exercise_id is required' }).min(1),
  target_sets: z.number().int().min(1).default(3),
  target_reps: z.coerce.string().default('8-12'),
  target_weight: z.coerce.string().default('0'),
  target_rest_time: z.coerce.string().default('60s'),
});

const mealSchema = z.object({
  image_url: z.string().min(1, 'Image URL is required'),
  meal_type: z.string().min(1, 'Meal type is required'),
  total_calories: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fat: z.number().min(0),
  total_fiber: z.number().min(0).optional().default(0),
  total_sugar: z.number().min(0).optional().default(0),
  total_sodium: z.number().min(0).optional().default(0),
  total_saturated_fat: z.number().min(0).optional().default(0),
  total_cholesterol: z.number().min(0).optional().default(0),
  items: z.array(z.object({
    item_name: z.string().min(1),
    quantity: z.string().optional(),
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
    fiber: z.number().min(0).optional().default(0),
    sugar: z.number().min(0).optional().default(0),
    sodium: z.number().min(0).optional().default(0),
    saturated_fat: z.number().min(0).optional().default(0),
    cholesterol: z.number().min(0).optional().default(0),
  })),
});

const createExerciseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional().default(''),
  body_part: z.string().optional().default(''),
  equipment: z.string().optional().default(''),
  target: z.string().optional().default(''),
  muscle_group: z.string().optional().default(''),
  secondary_muscles: z.string().optional().default(''),
  instructions_en: z.string().optional().default(''),
});

module.exports = {
  validate,
  schemas: {
    startWorkout: startWorkoutSchema,
    logSet: logSetSchema,
    completeWorkout: completeWorkoutSchema,
    addExercise: addExerciseSchema,
    meal: mealSchema,
    createExercise: createExerciseSchema,
  },
};
