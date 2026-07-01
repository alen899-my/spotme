export interface User {
  id: string
  name: string
  email: string
  role: string
  status: "active" | "suspended" | "inactive"
  joinedAt: string
  lastActiveAt?: string
  phone?: string
  plan?: string
  avatar?: string
  username?: string
  gender?: string
  dob?: string
  is_private?: boolean
  onboarding_completed?: boolean
  total_xp?: number
  league_tier?: string

  // Body & fitness
  age?: number
  height?: string
  weight?: string
  body_fat?: string
  fitness_goal?: string
  experience_level?: string
  activity_level?: string
  target_weight?: string
  meals_per_day?: number

  // Body measurements
  neck?: string
  waist?: string
  hip?: string
  chest?: string
  arm?: string
  thigh?: string

  // Health
  medical_conditions?: string
  medication?: string
  allergies?: string
  food_allergies?: string
  diet_type?: string
  food_preference?: string
  water_intake?: string

  // Preferences
  share_splits?: boolean
  completed_steps?: string[]
  water_reminder_enabled?: boolean
  water_reminder_interval?: number
  last_water_reminded_at?: string
  motivation_enabled?: boolean
  last_motivation_sent_at?: string
  water_goal_date?: string
  prev_rank?: number

  // Photos
  front_photo_url?: string
  back_photo_url?: string
  side_photo_url?: string

  // Computed stats
  totalWorkouts?: number
  totalMeals?: number
  totalWaterLogs?: number
}

export interface Feedback {
  id: string
  user_id: number
  category: string
  title: string
  description: string
  created_at: string
  userName?: string
  userEmail?: string
}

export interface Exercise {
  id: string
  name: string
  category: string
  body_part: string
  equipment: string
  muscle_group: string
  secondary_muscles: string[]
  target: string
  image_url: string
  gif_url: string
  instructions_en: string
  gif_prompt?: string
  avg_rating: number
  rating_count: number
  category_image_url?: string
  body_part_image_url?: string
  equipment_image_url?: string
  target_image_url?: string
  muscle_group_image_url?: string
}

export interface LibraryEntity {
  id: string
  name: string
  image_url: string | null
  created_at: string
}

export type EntityType = "categories" | "body_parts" | "equipment" | "targets" | "muscle_groups" | "secondary_muscles"

export type ReplacerStatus = "pending" | "uploading" | "frames_ready" | "generating_gif" | "replaced" | "failed"

export interface ExerciseReplacerState {
  exerciseId: string
  status: ReplacerStatus
  referenceImageUrl?: string
  frameUrls?: string[]
  frameProgress: number[]
  referenceProgress: number
  generatingGif?: boolean
}

export interface GifSettings {
  frameDelay: number
  loopCount: number
  quality: number
  width: number
  height: number
}

export interface EntityConfig {
  type: EntityType
  label: string
  slug: string
  table: string
}

export interface WorkoutSplit {
  id: string
  name: string
  description: string | null
  is_template: boolean
  template_goal?: string
  template_level?: string
  template_days?: string
  template_color?: string
  template_icon?: string
  created_at: string
  session_count?: number
  sessions?: WorkoutSession[]
}

export interface WorkoutSession {
  id: string
  split_id: string
  name: string
  sort_order: number
  created_at: string
  exercises?: WorkoutSessionExercise[]
}

export interface WorkoutSessionExercise {
  id: string
  session_id: string
  exercise_id: string
  sets: number
  reps: string
  rest_time: string
  weight: string
  sort_order: number
  name?: string
  category?: string
  image_url?: string
  target?: string
  equipment?: string
}
