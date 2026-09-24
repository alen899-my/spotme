"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Utensils,
  Search,
  Plus,
  Trash2,
  Filter,
  Check,
  Flame,
  Wheat,
  Beef,
  Droplet,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import api from "@/lib/api"
import {
  NutritionRange,
  NutritionAnalyticsData,
} from "@/components/nutrition-analytics/types"
import { NutritionFilterBar } from "@/components/nutrition-analytics/nutrition-filter-bar"
import { NutritionHeroRibbon } from "@/components/nutrition-analytics/nutrition-hero-ribbon"
import { CaloricBalanceCard } from "@/components/nutrition-analytics/caloric-balance-card"
import { MacronutrientProgressionCard } from "@/components/nutrition-analytics/macronutrient-progression-card"
import { HydrationWaterCard } from "@/components/nutrition-analytics/hydration-water-card"
import { MicronutrientHealthCard } from "@/components/nutrition-analytics/micronutrient-health-card"
import { CircadianMealTimingCard } from "@/components/nutrition-analytics/circadian-meal-timing-card"
import { RecentMealsSquareGrid } from "@/components/nutrition-analytics/recent-meals-square-grid"

interface FoodItem {
  id: number
  food_name: string
  category: string
  meal_type: string | null
  serving_size: string
  calories_kcal: number
  protein_g: number
  carbohydrates_g: number
  fat_g: number
  fiber_g: number
  image_url: string | null
  source_file: string
}

interface MealItemDetail {
  id: number
  name: string
  quantity?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

interface LoggedMeal {
  id: number
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  meal_type: string
  photo_url: string | null
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber?: number
  items?: MealItemDetail[]
  created_at: string
}

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "meals" | "foods">("analytics")

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<NutritionAnalyticsData | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [range, setRange] = useState<NutritionRange>("30d")
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true)

  // Fetch Nutrition Analytics
  const fetchNutritionAnalytics = async (userId: number | null, rangeVal: NutritionRange) => {
    setAnalyticsLoading(true)
    const clientTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
    try {
      const res = await api.get<NutritionAnalyticsData>("/admin/nutrition/analytics", {
        params: {
          userId: userId || undefined,
          range: rangeVal,
          tz: clientTz,
        },
      })
      setAnalyticsData(res.data)
    } catch (err) {
      console.error("Failed to load nutrition analytics:", err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchNutritionAnalytics(selectedUserId, range)
    }
  }, [selectedUserId, range, activeTab])

  // Foods state
  const [foods, setFoods] = useState<FoodItem[]>([])
  const [foodsTotal, setFoodsTotal] = useState(0)
  const [foodsLoading, setFoodsLoading] = useState(true)
  const [foodsPage, setFoodsPage] = useState(1)
  const [foodsSearch, setFoodsSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  // Meals state
  const [meals, setMeals] = useState<LoggedMeal[]>([])
  const [mealsTotal, setMealsTotal] = useState(0)
  const [mealsLoading, setMealsLoading] = useState(true)
  const [mealsPage, setMealsPage] = useState(1)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Add Food Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    food_name: "",
    category: "General",
    serving_size: "100g",
    calories_kcal: "",
    protein_g: "",
    carbohydrates_g: "",
    fat_g: "",
    fiber_g: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Foods
  const fetchFoods = async () => {
    setFoodsLoading(true)
    try {
      const res = await api.get("/admin/nutrition/foods", {
        params: {
          page: foodsPage,
          limit: 25,
          search: foodsSearch || undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        },
      })
      setFoods(res.data.foods || [])
      setFoodsTotal(res.data.total || 0)
    } catch (err) {
      console.error("Error fetching foods:", err)
    } finally {
      setFoodsLoading(false)
    }
  }

  // Fetch Meals
  const fetchMeals = async () => {
    setMealsLoading(true)
    try {
      const res = await api.get("/admin/nutrition/meals", {
        params: { page: mealsPage, limit: 25 },
      })
      setMeals(res.data.meals || [])
      setMealsTotal(res.data.total || 0)
    } catch (err) {
      console.error("Error fetching meals:", err)
    } finally {
      setMealsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "foods") {
      fetchFoods()
    } else if (activeTab === "meals") {
      fetchMeals()
    }
  }, [activeTab, foodsPage, selectedCategory, mealsPage])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFoodsPage(1)
    fetchFoods()
  }

  const handleDeleteFood = async (id: number) => {
    if (!confirm("Are you sure you want to delete this food item?")) return
    try {
      await api.delete(`/admin/nutrition/foods/${id}`)
      fetchFoods()
    } catch (err) {
      console.error("Failed to delete food:", err)
    }
  }

  const handleAddFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.food_name) return
    setIsSubmitting(true)
    try {
      await api.post("/admin/nutrition/foods", {
        food_name: addForm.food_name,
        category: addForm.category,
        serving_size: addForm.serving_size,
        calories_kcal: Number(addForm.calories_kcal) || 0,
        protein_g: Number(addForm.protein_g) || 0,
        carbohydrates_g: Number(addForm.carbohydrates_g) || 0,
        fat_g: Number(addForm.fat_g) || 0,
        fiber_g: Number(addForm.fiber_g) || 0,
      })
      setShowAddModal(false)
      setAddForm({
        food_name: "",
        category: "General",
        serving_size: "100g",
        calories_kcal: "",
        protein_g: "",
        carbohydrates_g: "",
        fat_g: "",
        fiber_g: "",
      })
      fetchFoods()
    } catch (err) {
      console.error("Failed to create food:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-500" />
              Food &amp; Water
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track meals, calories, macros, and daily water intake
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Segmented Tab Switch */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "analytics"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("meals")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "meals"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Meal Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("foods")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === "foods"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Food Database
            </button>
          </div>

          {activeTab === "foods" && (
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Food</span>
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: NUTRITION & HYDRATION ANALYTICS (PREMIER DASHBOARD) */}
      {activeTab === "analytics" && (
        <div className="space-y-5 sm:space-y-6">
          {/* 1. Athlete Selector & Range Filter Bar */}
          <NutritionFilterBar
            athletes={analyticsData?.athletes || []}
            selectedUserId={selectedUserId}
            selectedUserMeta={analyticsData?.meta.selectedUser || null}
            targets={analyticsData?.meta.targets}
            range={range}
            timezone={analyticsData?.meta.timezone}
            onSelectUser={(uid) => setSelectedUserId(uid)}
            onChangeRange={(r) => setRange(r)}
            onRefresh={() => fetchNutritionAnalytics(selectedUserId, range)}
            isLoading={analyticsLoading}
            lastUpdated={analyticsData?.meta.generatedAt}
          />

          {analyticsLoading && !analyticsData ? (
            <div className="py-20 text-center space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-mono text-muted-foreground">
                Loading food &amp; water data...
              </p>
            </div>
          ) : analyticsData ? (
            <>
              {/* 2. Top Hero KPI Ribbon (6 Primary Headline Cards) */}
              <NutritionHeroRibbon
                kpis={analyticsData.kpis}
                targets={analyticsData.meta.targets}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 3. Caloric Intake Curve vs Target & Deficit/Surplus Histogram */}
              <CaloricBalanceCard
                timeline={analyticsData.timeline}
                dayOfWeek={analyticsData.dayOfWeek}
                targets={analyticsData.meta.targets}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 4. Macronutrient Progression Curves & Caloric Yield */}
              <MacronutrientProgressionCard
                timeline={analyticsData.timeline}
                kpis={analyticsData.kpis}
                targets={analyticsData.meta.targets}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 5. Hydration & Daily Water Volume Analytics + 24h Rhythm */}
              <HydrationWaterCard
                timeline={analyticsData.timeline}
                circadianWater={analyticsData.circadianWater}
                waterDayPeriods={analyticsData.waterDayPeriods}
                targets={analyticsData.meta.targets}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 6. Micronutrient & Cardiovascular Health Guardrails */}
              <MicronutrientHealthCard
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 7. Circadian Meal Timing & Feeding Windows */}
              <CircadianMealTimingCard
                circadianMeals={analyticsData.circadianMeals}
                mealTypes={analyticsData.mealTypes}
                kpis={analyticsData.kpis}
                isAthleteMode={Boolean(selectedUserId)}
              />

              {/* 8. Recent Logged Meals Square Visual Grid & Food Items Ranking */}
              <RecentMealsSquareGrid
                userId={selectedUserId}
                timezone={analyticsData.meta.timezone}
                topFoods={analyticsData.topFoods}
              />
            </>
          ) : null}
        </div>
      )}

      {/* TAB 1: FOOD DATABASE */}
      {activeTab === "foods" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search food item..."
                value={foodsSearch}
                onChange={(e) => setFoodsSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-secondary/40 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "Protein", "Carb", "Fat", "Vegetables", "Snacks"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat)
                    setFoodsPage(1)
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium shrink-0 transition-all ${
                    selectedCategory === cat
                      ? "bg-foreground text-background font-semibold"
                      : "border border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Foods Table / Grid (Mobile Responsive) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {foodsLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Loading food database...
              </div>
            ) : foods.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No food items match the search or category filter.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
                        <th className="px-4 py-2.5">Food Name</th>
                        <th className="px-3 py-2.5">Category</th>
                        <th className="px-3 py-2.5">Serving</th>
                        <th className="px-3 py-2.5">Calories</th>
                        <th className="px-3 py-2.5">Protein</th>
                        <th className="px-3 py-2.5">Carbs</th>
                        <th className="px-3 py-2.5">Fat</th>
                        <th className="px-3 py-2.5">Fiber</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {foods.map((food) => (
                        <tr key={food.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-2.5 font-sans font-medium text-foreground">
                            {food.food_name}
                          </td>
                          <td className="px-3 py-2.5 font-sans">
                            <span className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {food.category || "General"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {food.serving_size || "100g"}
                          </td>
                          <td className="px-3 py-2.5 text-foreground font-semibold">
                            {Math.round(food.calories_kcal || 0)} kcal
                          </td>
                          <td className="px-3 py-2.5 text-sky-500">
                            {food.protein_g ? Number(food.protein_g).toFixed(1) : 0}g
                          </td>
                          <td className="px-3 py-2.5 text-amber-500">
                            {food.carbohydrates_g ? Number(food.carbohydrates_g).toFixed(1) : 0}g
                          </td>
                          <td className="px-3 py-2.5 text-rose-500">
                            {food.fat_g ? Number(food.fat_g).toFixed(1) : 0}g
                          </td>
                          <td className="px-3 py-2.5 text-emerald-500">
                            {food.fiber_g ? Number(food.fiber_g).toFixed(1) : 0}g
                          </td>
                          <td className="px-4 py-2.5 text-right font-sans">
                            <button
                              type="button"
                              onClick={() => handleDeleteFood(food.id)}
                              className="rounded p-1 text-muted-foreground hover:text-rose-500 hover:bg-secondary transition-colors"
                              title="Delete food item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards Stack */}
                <div className="md:hidden divide-y divide-border/40">
                  {foods.map((food) => (
                    <div key={food.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xs font-semibold text-foreground">
                            {food.food_name}
                          </h2>
                          <span className="text-[10px] text-muted-foreground">
                            {food.category || "General"} · {food.serving_size || "100g"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFood(food.id)}
                          className="rounded p-1 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1 rounded-lg border border-border/50 bg-secondary/20 p-2 text-center text-[10px] font-mono">
                        <div>
                          <span className="text-muted-foreground uppercase text-[9px]">Calories</span>
                          <div className="font-semibold text-foreground">
                            {Math.round(food.calories_kcal || 0)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase text-[9px]">Protein</span>
                          <div className="font-semibold text-sky-500">
                            {food.protein_g ? Number(food.protein_g).toFixed(0) : 0}g
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase text-[9px]">Carbs</span>
                          <div className="font-semibold text-amber-500">
                            {food.carbohydrates_g ? Number(food.carbohydrates_g).toFixed(0) : 0}g
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase text-[9px]">Fat</span>
                          <div className="font-semibold text-rose-500">
                            {food.fat_g ? Number(food.fat_g).toFixed(0) : 0}g
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
            <span>
              Page {foodsPage} of {Math.max(1, Math.ceil(foodsTotal / 25))} ({foodsTotal} items)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFoodsPage((p) => Math.max(1, p - 1))}
                disabled={foodsPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFoodsPage((p) => p + 1)}
                disabled={foodsPage * 25 >= foodsTotal}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER LOGGED MEALS */}
      {activeTab === "meals" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {mealsLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Loading logged meals stream...
              </div>
            ) : meals.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No user meals logged yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {meals.map((meal) => {
                  const dateStr = new Date(meal.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <div
                      key={meal.id}
                      className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
                    >
                      {/* User & Meal Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {meal.photo_url ? (
                          <div
                            onClick={() => setPreviewImage(meal.photo_url)}
                            className="relative group cursor-zoom-in shrink-0"
                            title="Click to view full image"
                          >
                            <img
                              src={meal.photo_url}
                              alt="Meal"
                              className="h-14 w-14 rounded-lg object-cover border border-border group-hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity text-white">
                              <Maximize2 className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-lg border border-border bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                            <Utensils className="h-5 w-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <UserAvatar
                              src={meal.profile_pic_url}
                              name={meal.full_name}
                              size="xs"
                            />
                            <Link
                              href={`/dashboard/users/${meal.user_id}`}
                              className="text-xs font-semibold text-foreground hover:underline"
                            >
                              {meal.full_name || "Anonymous User"}
                            </Link>
                            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono capitalize text-muted-foreground">
                              {meal.meal_type || "Meal"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {meal.email || `User #${meal.user_id}`}
                          </p>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {dateStr}
                          </span>

                          {/* Individual Food Items breakdown if available */}
                          {meal.items && meal.items.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {meal.items.map((item, idx) => (
                                <span
                                  key={item.id || idx}
                                  className="inline-flex items-center gap-1 rounded border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                                >
                                  <span className="text-foreground font-medium">{item.name}</span>
                                  {item.quantity && <span className="opacity-70 font-sans">({item.quantity})</span>}
                                  {item.calories ? (
                                    <span className="text-foreground/80 font-semibold">
                                      · {Math.round(item.calories)} kcal
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Macros Breakdown */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 text-center text-xs font-mono shrink-0 lg:w-96">
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Calories</span>
                          <div className="font-semibold text-foreground">
                            {Math.round(meal.calories || 0)}
                          </div>
                        </div>
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Protein</span>
                          <div className="font-semibold text-sky-500">
                            {meal.protein ? Number(meal.protein).toFixed(0) : 0}g
                          </div>
                        </div>
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Carbs</span>
                          <div className="font-semibold text-amber-500">
                            {meal.carbs ? Number(meal.carbs).toFixed(0) : 0}g
                          </div>
                        </div>
                        <div className="rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Fat</span>
                          <div className="font-semibold text-rose-500">
                            {meal.fats ? Number(meal.fats).toFixed(0) : 0}g
                          </div>
                        </div>
                        <div className="hidden sm:block rounded border border-border/50 bg-secondary/30 p-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase">Fiber</span>
                          <div className="font-semibold text-emerald-500">
                            {meal.fiber ? Number(meal.fiber).toFixed(0) : 0}g
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Meals Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
            <span>
              Page {mealsPage} of {Math.max(1, Math.ceil(mealsTotal / 25))} ({mealsTotal} logged meals)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMealsPage((p) => Math.max(1, p - 1))}
                disabled={mealsPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMealsPage((p) => p + 1)}
                disabled={mealsPage * 25 >= mealsTotal}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Food Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Add Custom Food Item</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddFoodSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grilled Chicken Breast"
                  value={addForm.food_name}
                  onChange={(e) => setAddForm({ ...addForm, food_name: e.target.value })}
                  className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Protein"
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Serving Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 100g or 1 cup"
                    value={addForm.serving_size}
                    onChange={(e) => setAddForm({ ...addForm, serving_size: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-muted-foreground mb-1 font-sans">Calories (kcal)</label>
                  <input
                    type="number"
                    placeholder="165"
                    value={addForm.calories_kcal}
                    onChange={(e) => setAddForm({ ...addForm, calories_kcal: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-sans">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="31"
                    value={addForm.protein_g}
                    onChange={(e) => setAddForm({ ...addForm, protein_g: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="block text-muted-foreground mb-1 font-sans">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={addForm.carbohydrates_g}
                    onChange={(e) => setAddForm({ ...addForm, carbohydrates_g: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-sans">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="3.6"
                    value={addForm.fat_g}
                    onChange={(e) => setAddForm({ ...addForm, fat_g: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-sans">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={addForm.fiber_g}
                    onChange={(e) => setAddForm({ ...addForm, fiber_g: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-secondary/40 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                >
                  {isSubmitting ? "Saving..." : "Create Food"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] rounded-xl overflow-hidden border border-border bg-card shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-1.5 text-white/80 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewImage}
              alt="Meal High-Res Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
