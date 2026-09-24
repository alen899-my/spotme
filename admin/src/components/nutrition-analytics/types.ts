export type NutritionRange = "7d" | "30d" | "90d" | "1y" | "all"

export interface AthleteNutritionSummary {
  id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  gender?: string | null
  meals_count: number
  water_logs_count: number
  last_active_at: string | null
}

export interface SelectedNutritionUserMeta {
  id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  gender?: string | null
  weight_kg: number | null
  height_cm: number | null
  fitness_goal: string | null
  created_at: string
  bmi: number | null
  bmi_category: string | null
}

export interface NutritionTargets {
  caloriesTarget: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  waterTargetMl: number
  dietType: string
}

export interface NutritionKPIs {
  avgCalories: number
  avgProtein: number
  proteinPerKg: number
  avgCarbs: number
  avgFat: number
  avgFiber: number
  avgSugar: number
  avgSodium: number
  avgWaterLiters: number
  avgNetBalance: number
  complianceRatePct: number
  hydrationHitRatePct: number
  currentStreak: number
  loggedDaysCount: number
  proteinDensity: number
  fluidCalorieRatio: number
  feedingWindowHours: number
  lateNightIndexPct: number
  macroRatio: {
    proteinPct: number
    carbsPct: number
    fatPct: number
  }
}

export interface NutritionTimelinePoint {
  date: string
  mealsCount: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  saturatedFat: number
  cholesterol: number
  waterMl: number
  waterLiters: number
  caloriesBurned: number
  workoutWaterLiters: number
  netCalories: number
  deficitSurplus: number
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  targetWaterLiters: number
}

export interface MealTypeDistributionPoint {
  mealType: string
  count: number
  calories: number
  protein: number
  carbs: number
  fat: number
  pct: number
}

export interface CircadianMealPoint {
  hour: number
  label: string
  count: number
  calories: number
}

export interface CircadianWaterPoint {
  hour: number
  label: string
  waterMl: number
  logsCount: number
}

export interface WaterDayPeriod {
  period: "morning" | "afternoon" | "evening" | "night"
  label: string
  timeRange: string
  amountMl: number
  pct: number
}

export interface DayOfWeekNutritionPoint {
  day: string
  shortDay: string
  mealsCount: number
  avgMealCalories: number
  totalCalories: number
}

export interface TopFoodItem {
  rank: number
  name: string
  loggedCount: number
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  totalCalories: number
}

export interface LoggedMealSubItem {
  id: number
  name: string
  quantity?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface RecentLoggedMeal {
  id: number
  userId: number
  athleteName: string
  athleteEmail: string
  athleteAvatar: string | null
  imageUrl: string | null
  mealType: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  saturatedFat: number
  cholesterol: number
  loggedAt: string
  localDatetime: string
  formattedDate: string
  formattedTime: string
  items: LoggedMealSubItem[]
}

export interface RecentMealsResponse {
  total: number
  page: number
  limit: number
  totalPages: number
  meals: RecentLoggedMeal[]
}

export interface NutritionAnalyticsData {
  meta: {
    userId: number | null
    range: NutritionRange
    timezone: string
    generatedAt: string
    mode: "athlete" | "global"
    selectedUser: SelectedNutritionUserMeta | null
    targets: NutritionTargets
  }
  athletes: AthleteNutritionSummary[]
  kpis: NutritionKPIs
  timeline: NutritionTimelinePoint[]
  mealTypes: MealTypeDistributionPoint[]
  circadianMeals: CircadianMealPoint[]
  circadianWater: CircadianWaterPoint[]
  waterDayPeriods: WaterDayPeriod[]
  dayOfWeek: DayOfWeekNutritionPoint[]
  topFoods: TopFoodItem[]
}
