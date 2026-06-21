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
