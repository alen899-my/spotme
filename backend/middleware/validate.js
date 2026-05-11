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
  is_skipped: z.boolean().default(false),
});

const completeWorkoutSchema = z.object({
  total_duration_seconds: z.number().int().min(0).default(0),
  total_volume: z.number().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
  completion_photo_url: z.string().nullable().optional()
    .transform(v => v || null),
});

const addExerciseSchema = z.object({
  exercise_id: z.string({ required_error: 'exercise_id is required' }).min(1),
  target_sets: z.number().int().min(1).default(3),
  target_reps: z.coerce.string().default('8-12'),
  target_weight: z.coerce.string().default('0'),
});

module.exports = {
  validate,
  schemas: {
    startWorkout: startWorkoutSchema,
    logSet: logSetSchema,
    completeWorkout: completeWorkoutSchema,
    addExercise: addExerciseSchema,
  },
};
