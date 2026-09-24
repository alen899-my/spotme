export type AnalyticsRange = "7d" | "30d" | "90d" | "1y" | "all"

export interface AthleteSummary {
  id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  gender?: string | null
  workouts_count: number
  last_active_at: string | null
}

export interface SelectedUserMeta {
  id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  gender?: string | null
  weight_kg: string | number | null
  height_cm: string | number | null
  fitness_goal: string | null
  experience_level: string | null
  current_streak: number | null
  total_xp: number | null
  level: number | null
  created_at: string
}

export interface WorkoutKPIs {
  totalWorkouts: number
  completedWorkouts: number
  activeWorkouts: number
  abandonedWorkouts: number
  completionRate: number
  totalVolumeKg: number
  avgVolumeKg: number
  totalDurationMinutes: number
  avgDurationMinutes: number
  totalRestMinutes: number
  activeDurationMinutes: number
  activeRestRatio: number
  avgRestPerSetSec: number
  trainingDensityKgMin: number
  relativeVolumeRatio: number
  totalSets: number
  totalReps: number
  avgRepsPerSet: number
  avgWeightPerSetKg: number
  totalTutMinutes: number
  totalExercisesPerformed: number
  uniqueExercisesCount: number
  skippedExercisesCount: number
  totalPrsHit: number
  avgTargetSets: number
  totalCaloriesBurned: number
  avgCaloriesBurned: number
  calorieBurnRateKcalMin: number
  avgMet: number
  totalWaterLiters: number
  avgWaterLiters: number
  avgRating: number
  totalRatingsCount: number
  maxStreakRecorded: number
  lastWorkoutAt: string | null
}

export interface RepSchemes {
  powerCount: number
  powerPct: number
  hypertrophyCount: number
  hypertrophyPct: number
  enduranceCount: number
  endurancePct: number
}

export interface TimelinePoint {
  date: string
  workoutsCount: number
  volumeKg: number
  durationMinutes: number
  calories: number
  avgMet: number
  prsCount: number
}

export interface MuscleDistributionPoint {
  bodyPart: string
  volume: number
  exercisesCount: number
  prsCount: number
}

export interface MuscleTargetPoint {
  bodyPart: string
  target: string
  volumeKg: number
  exercisesCount: number
  prsCount: number
}

export interface DayOfWeekPoint {
  day: string
  shortDay: string
  count: number
  volume: number
}

export interface CircadianPoint {
  hour: number
  label: string
  count: number
}

export interface FatigueDecayPoint {
  setNumber: string
  avgSetVolume: number
  avgWeightKg: number
  avgReps: number
  dropOffPct: number
}

export interface TopPRPoint {
  exerciseId: string
  exerciseName: string
  bodyPart: string
  maxWeightKg: number
  maxEstimated1rm: number
  totalVolumeKg: number
  prsCount: number
  relativeStrengthRatio: number | null
}

export interface SkippedExercisePoint {
  name: string
  bodyPart: string
  skippedCount: number
  totalScheduledCount: number
  skipRatePct: number
}

export interface RatingPoint {
  score: number
  stars: string
  count: number
}

export interface AIReprtPoint {
  id: number
  user_id: number
  athlete_name: string
  daily_workout_id: number
  summary: string
  good_things: string
  areas_to_improve: string
  recommendations: string
  created_at: string
}

export interface TimeOfDayPeriod {
  period: "morning" | "afternoon" | "evening" | "night"
  label: string
  timeRange: string
  count: number
  pct: number
}

export interface PeakWorkoutTime {
  hour: number
  label: string
  timeWindow: string
  period: string
  count: number
}

export interface MuscleHeatMapItem {
  slug: string
  label: string
  intensity: number // 1 to 50
  score: number
  daysTrained: number
  totalSets: number
  totalVolumeKg: number
  lastTrainedDate: string | null
}

export interface WorkoutAnalyticsData {
  meta: {
    userId: number | null
    range: AnalyticsRange
    timezone: string
    generatedAt: string
    mode: "athlete" | "global"
    selectedUser: SelectedUserMeta | null
  }
  athletes: AthleteSummary[]
  kpis: WorkoutKPIs
  repSchemes: RepSchemes
  timeline: TimelinePoint[]
  muscleDistribution: MuscleDistributionPoint[]
  muscleTargets: MuscleTargetPoint[]
  dayOfWeek: DayOfWeekPoint[]
  circadian: CircadianPoint[]
  timeOfDayPeriods: TimeOfDayPeriod[]
  peakWorkoutTime: PeakWorkoutTime
  muscleHeatMap: MuscleHeatMapItem[]
  fatigueDecay: FatigueDecayPoint[]
  topPrs: TopPRPoint[]
  skippedExercises: SkippedExercisePoint[]
  ratingsDistribution: RatingPoint[]
  aiReports: AIReprtPoint[]
}

// ─── Athlete Exercise Progression Types ──────────────────────────────────────────
export interface AthleteExerciseItem {
  id: string
  name: string
  category: string
  bodyPart: string
  target: string
  equipment: string | null
  imageUrl: string | null
  gifUrl: string | null
  totalSessionsCount: number
  totalSetsCompleted: number
  allTimeMaxWeight: number
  allTimeMaxReps: number
  maxEstimated1rm: number
  totalVolumeKg: number
  firstPerformedAt: string
  lastPerformedAt: string
}

export interface AthleteWorkoutItem {
  title: string
  sessionCount: number
}

export interface AthleteExercisesResponse {
  userId: number
  totalCount: number
  bodyParts: string[]
  workouts: AthleteWorkoutItem[]
  exercises: AthleteExerciseItem[]
}

export interface ProgressionSetItem {
  set_number: number
  weight: number
  reps: number
  duration_seconds: number
  rest_seconds: number
  completed_at: string
}

export interface ProgressionTimelinePoint {
  workoutId: number
  workoutTitle: string
  sessionDate: string
  formattedDate: string
  shortDate: string
  isPersonalRecord: boolean
  estimated1rm: number
  bestSetWeight: number
  bestSetReps: number
  maxWeight: number
  avgWeight: number
  totalVolume: number
  maxReps: number
  setsCompleted: number
  sets: ProgressionSetItem[]
}

export interface ProgressionSummary {
  sessionsCount: number
  setsCount: number
  startWeight: number
  currentWeight: number
  weightDelta: number
  weightDeltaPct: number
  maxWeightAllTime: number
  maxEstimated1RM: number
  totalVolumeAllTime: number
  prDate: string | null
}

export interface ProgressionResponse {
  exercise: {
    id: string
    name: string
    category: string
    bodyPart: string
    target: string
    equipment: string | null
    imageUrl: string | null
    gifUrl: string | null
  } | null
  summary: ProgressionSummary
  timeline: ProgressionTimelinePoint[]
}

export type ProgressionMetric = "maxWeight" | "estimated1rm" | "volume" | "reps" | "avgWeight"
export type ProgressionRange = "7d" | "30d" | "90d" | "6m" | "1y" | "all"

