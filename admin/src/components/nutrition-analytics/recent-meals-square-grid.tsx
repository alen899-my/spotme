"use client"

import React, { useState, useEffect } from "react"
import {
  Utensils,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import api from "@/lib/api"
import { RecentLoggedMeal, RecentMealsResponse, TopFoodItem } from "./types"

interface RecentMealsSquareGridProps {
  userId: number | null
  timezone?: string
  topFoods: TopFoodItem[]
}

export function RecentMealsSquareGrid({
  userId,
  timezone,
  topFoods,
}: RecentMealsSquareGridProps) {
  const [meals, setMeals] = useState<RecentLoggedMeal[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedMealType, setSelectedMealType] = useState<string>("ALL")
  const [nutrientFilter, setNutrientFilter] = useState<"all" | "high-protein" | "low-cal">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // View All Modal State
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const [modalPage, setModalPage] = useState(1)
  const [modalMeals, setModalMeals] = useState<RecentLoggedMeal[]>([])
  const [modalTotal, setModalTotal] = useState(0)
  const [modalLoading, setModalLoading] = useState(false)

  // Image Preview Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Fetch recent meals for grid (first 8)
  const fetchGridMeals = async () => {
    setLoading(true)
    try {
      const minProtein = nutrientFilter === "high-protein" ? 30 : undefined
      const maxCalories = nutrientFilter === "low-cal" ? 400 : undefined

      const res = await api.get<RecentMealsResponse>("/admin/nutrition/recent-meals", {
        params: {
          userId: userId || undefined,
          limit: 8,
          page: 1,
          mealType: selectedMealType !== "ALL" ? selectedMealType : undefined,
          minProtein,
          maxCalories,
          search: searchQuery.trim() || undefined,
          tz: timezone,
        },
      })
      setMeals(res.data.meals || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load recent meals:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch modal meals with pagination
  const fetchModalMeals = async (page: number) => {
    setModalLoading(true)
    try {
      const minProtein = nutrientFilter === "high-protein" ? 30 : undefined
      const maxCalories = nutrientFilter === "low-cal" ? 400 : undefined

      const res = await api.get<RecentMealsResponse>("/admin/nutrition/recent-meals", {
        params: {
          userId: userId || undefined,
          limit: 12,
          page,
          mealType: selectedMealType !== "ALL" ? selectedMealType : undefined,
          minProtein,
          maxCalories,
          search: searchQuery.trim() || undefined,
          tz: timezone,
        },
      })
      setModalMeals(res.data.meals || [])
      setModalTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load modal meals:", err)
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    fetchGridMeals()
  }, [userId, selectedMealType, nutrientFilter, timezone])

  useEffect(() => {
    if (viewAllOpen) {
      fetchModalMeals(modalPage)
    }
  }, [viewAllOpen, modalPage, selectedMealType, nutrientFilter, userId])

  const handleOpenViewAll = () => {
    setModalPage(1)
    setViewAllOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* ── Section Header & Filter Toolbar (Mobile-First) ── */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-500" />
                Recent Meals
              </h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
                {total} logged
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest logged meals, calories, and macros
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenViewAll}
            className="h-8 gap-1.5 text-xs self-start sm:self-auto"
          >
            <span>View All ({total})</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          {/* Meal Type Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {["ALL", "Breakfast", "Lunch", "Dinner", "Snack"].map((type) => {
              const active = selectedMealType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedMealType(type)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
                    active
                      ? "bg-foreground text-background font-semibold"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {type === "ALL" ? "All Types" : type}
                </button>
              )
            })}
          </div>

          {/* Preset Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setNutrientFilter("all")}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  nutrientFilter === "all"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setNutrientFilter("high-protein")}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  nutrientFilter === "high-protein"
                    ? "bg-emerald-500 text-black font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                High Protein (30g+)
              </button>
              <button
                type="button"
                onClick={() => setNutrientFilter("low-cal")}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  nutrientFilter === "low-cal"
                    ? "bg-sky-500 text-black font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Under 400 kcal
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search food..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchGridMeals()}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Neat Square Cards Grid (Mobile-First 1 col -> sm 2 cols -> lg 4 cols) ── */}
      {loading ? (
        <div className="py-16 text-center space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading meals...</p>
        </div>
      ) : meals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center space-y-2">
          <Utensils className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground">No Meals Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No logged meals match your current filters. Try selecting "All Types" or clearing the search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="group rounded-xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between hover:border-foreground/30 hover:shadow-md transition-all duration-200"
            >
              {/* Image Container with Badges */}
              <div className="relative aspect-4/3 sm:aspect-square w-full bg-secondary/40 overflow-hidden">
                {meal.imageUrl ? (
                  <img
                    src={meal.imageUrl}
                    alt={meal.mealType}
                    onClick={() => setPreviewImage(meal.imageUrl)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-muted-foreground/50 p-4">
                    <Utensils className="h-8 w-8 mb-1.5 opacity-40" />
                    <span className="text-[11px]">No photo</span>
                  </div>
                )}

                {/* Meal Type Tag (Top Left) */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white border border-white/10 shadow-xs">
                    {meal.mealType}
                  </span>
                </div>

                {/* Calorie Tag (Top Right) */}
                <div className="absolute top-2.5 right-2.5">
                  <span className="rounded-full bg-amber-500 text-black px-2.5 py-0.5 text-xs font-bold shadow-xs">
                    {meal.calories} kcal
                  </span>
                </div>

                {/* Athlete & Date Footer Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserAvatar src={meal.athleteAvatar} name={meal.athleteName} size="xs" className="h-4 w-4" />
                    <span className="truncate font-medium text-[11px]">{meal.athleteName}</span>
                  </div>
                  <span className="text-[10px] text-zinc-300 shrink-0">
                    {meal.formattedDate}
                  </span>
                </div>
              </div>

              {/* Card Body & Nutrients */}
              <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                {/* 3 Macro Badges */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 py-1 px-1">
                    <span className="text-[9px] text-muted-foreground block uppercase font-medium">Protein</span>
                    <span className="font-bold text-emerald-400 text-xs font-mono">{meal.protein}g</span>
                  </div>
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/20 py-1 px-1">
                    <span className="text-[9px] text-muted-foreground block uppercase font-medium">Carbs</span>
                    <span className="font-bold text-amber-400 text-xs font-mono">{meal.carbs}g</span>
                  </div>
                  <div className="rounded-md bg-rose-500/10 border border-rose-500/20 py-1 px-1">
                    <span className="text-[9px] text-muted-foreground block uppercase font-medium">Fat</span>
                    <span className="font-bold text-rose-400 text-xs font-mono">{meal.fat}g</span>
                  </div>
                </div>

                {/* Ingredients / Food Items list */}
                {meal.items && meal.items.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-medium">
                      <span>Foods ({meal.items.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {meal.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="rounded-md bg-secondary/60 border border-border/50 px-1.5 py-0.5 text-[11px] text-foreground truncate max-w-full"
                          title={`${item.name} ${item.quantity ? `(${item.quantity})` : ""} - ${item.calories || 0} kcal`}
                        >
                          {item.name}
                        </span>
                      ))}
                      {meal.items.length > 3 && (
                        <span className="rounded-md bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{meal.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic">
                    Single log meal
                  </div>
                )}

                {/* Card Footer: Local Time & Micronutrients */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-1 text-foreground/80">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {meal.formattedTime}
                  </span>
                  <span>Fiber: {meal.fiber}g · Sodium: {meal.sodium}mg</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Top Logged Foods ── */}
      {topFoods && topFoods.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Top Logged Foods
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Most frequently eaten
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {topFoods.slice(0, 10).map((f) => (
              <div
                key={f.name}
                className="p-2.5 rounded-lg border border-border/50 bg-secondary/20 space-y-1 hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">#{f.rank}</span>
                  <span className="font-semibold text-emerald-400 text-[11px]">{f.loggedCount}x</span>
                </div>
                <div className="font-medium text-foreground truncate" title={f.name}>
                  {f.name}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{f.avgCalories} kcal</span>
                  <span>{f.avgProtein}g P</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View All Logged Meals Modal ── */}
      {viewAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border bg-card p-4 sm:p-6 overflow-hidden flex flex-col space-y-3 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-amber-500" />
                  All Logged Meals ({modalTotal})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete list of logged meals and macros
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewAllOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Scrollable Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {modalLoading ? (
                <div className="py-20 text-center space-y-2">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs text-muted-foreground">Loading meals...</p>
                </div>
              ) : modalMeals.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No meals found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modalMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="rounded-xl border border-border/80 bg-background/60 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative aspect-video w-full bg-secondary/30">
                        {meal.imageUrl ? (
                          <img
                            src={meal.imageUrl}
                            alt={meal.mealType}
                            onClick={() => setPreviewImage(meal.imageUrl)}
                            className="w-full h-full object-cover cursor-pointer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <Utensils className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white font-medium">
                          {meal.mealType}
                        </span>
                        <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-black px-2 py-0.5 text-xs font-bold">
                          {meal.calories} kcal
                        </span>
                      </div>

                      <div className="p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground font-medium truncate">{meal.athleteName}</span>
                          <span className="text-muted-foreground shrink-0">{meal.formattedDate}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-mono">
                          <div className="rounded bg-emerald-500/10 p-1 font-bold text-emerald-400">
                            {meal.protein}g P
                          </div>
                          <div className="rounded bg-amber-500/10 p-1 font-bold text-amber-400">
                            {meal.carbs}g C
                          </div>
                          <div className="rounded bg-rose-500/10 p-1 font-bold text-rose-400">
                            {meal.fat}g F
                          </div>
                        </div>

                        {meal.items && meal.items.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-border/40">
                            {meal.items.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="truncate max-w-[160px]">{item.name}</span>
                                <span>{item.calories} kcal</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Pagination Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {modalPage} of {Math.ceil(modalTotal / 12) || 1}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={modalPage <= 1 || modalLoading}
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={modalPage >= Math.ceil(modalTotal / 12) || modalLoading}
                  onClick={() => setModalPage((p) => p + 1)}
                  className="h-8 gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Zoom Lightbox ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Meal preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 rounded-full bg-black/80 border border-white/20 p-2 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
