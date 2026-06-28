"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, X, GripVertical, Search, Filter, RotateCcw } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { FormSelect } from "@/components/ui/form-select"
import type { Exercise } from "@/types"

interface ExerciseRow {
  exercise_id: string
  name: string
  image_url?: string
  sets: number
  reps: string
  rest_time: string
  weight: string
}

interface SessionRow {
  name: string
  exercises: ExerciseRow[]
}

interface SplitFormProps {
  editId?: string
}

const GOALS = ["Build Muscle", "Lose Fat", "Strength", "Endurance", "General Fitness"]
const LEVELS = ["Beginner", "Intermediate", "Advanced"]

export default function SplitForm({ editId }: SplitFormProps) {
  const router = useRouter()
  const isEdit = !!editId

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [templateGoal, setTemplateGoal] = useState("")
  const [templateLevel, setTemplateLevel] = useState("")
  const [templateDays, setTemplateDays] = useState("")
  const [sessions, setSessions] = useState<SessionRow[]>([{ name: "", exercises: [] }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([])
  const [exerciseSearch, setExerciseSearch] = useState("")
  const [exerciseFilters, setExerciseFilters] = useState<Record<string, string>>({})
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({})
  const [showExercisePicker, setShowExercisePicker] = useState<{
    sessionIdx: number
  } | null>(null)

  const filterConfig = [
    { key: "category", label: "Category", optionsKey: "categories" },
    { key: "body_part", label: "Body Part", optionsKey: "body_parts" },
    { key: "equipment", label: "Equipment", optionsKey: "equipment" },
    { key: "target", label: "Target", optionsKey: "targets" },
    { key: "muscle_group", label: "Muscle Group", optionsKey: "muscle_groups" },
  ]

  useEffect(() => {
    Promise.all([
      api.get("/exercises", { params: { limit: 500 } }),
      api.get("/exercises/meta/filters"),
    ]).then(([exRes, filterRes]) => {
      setExerciseOptions(exRes.data.data ?? [])
      setFilterOptions({
        categories: filterRes.data.categories ?? [],
        body_parts: filterRes.data.body_parts ?? [],
        equipment: filterRes.data.equipment ?? [],
        targets: filterRes.data.targets ?? [],
        muscle_groups: filterRes.data.muscle_groups ?? [],
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (editId) {
      api.get(`/admin/splits/${editId}`).then((res) => {
        const d = res.data
        setName(d.name ?? "")
        setDescription(d.description ?? "")
        setTemplateGoal(d.template_goal ?? "")
        setTemplateLevel(d.template_level ?? "")
        setTemplateDays(d.template_days ?? "")
        if (d.sessions?.length > 0) {
          setSessions(d.sessions.map((s: any) => ({
            name: s.name ?? "",
            exercises: (s.exercises ?? []).map((e: any) => ({
              exercise_id: e.exercise_id,
              name: e.name ?? "",
              image_url: e.image_url ?? undefined,
              sets: e.sets ?? 3,
              reps: e.reps ?? "8-12",
              rest_time: e.rest_time ?? "60s",
              weight: e.weight ?? "0",
            })),
          })))
        }
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [editId])

  const filteredExercises = exerciseOptions.filter((ex) => {
    if (exerciseSearch && !ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false
    for (const [key, val] of Object.entries(exerciseFilters)) {
      if (!val) continue
      if ((ex as any)[key] !== val) return false
    }
    return true
  })

  const activeFilterCount = Object.values(exerciseFilters).filter(Boolean).length

  const updateSession = (idx: number, val: string) => {
    setSessions((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], name: val }
      return next
    })
  }

  const addSession = () => {
    setSessions((prev) => [...prev, { name: "", exercises: [] }])
  }

  const removeSession = (idx: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== idx))
  }

  const addExercise = (sessionIdx: number, ex: Exercise) => {
    setSessions((prev) => {
      const next = [...prev]
      next[sessionIdx] = {
        ...next[sessionIdx],
        exercises: [
          ...next[sessionIdx].exercises,
          {
            exercise_id: ex.id,
            name: ex.name,
            image_url: ex.image_url || undefined,
            sets: 3,
            reps: "8-12",
            rest_time: "60s",
            weight: "0",
          },
        ],
      }
      return next
    })
    setShowExercisePicker(null)
    setExerciseSearch("")
  }

  const updateExercise = (
    sessionIdx: number,
    exIdx: number,
    field: keyof ExerciseRow,
    value: string | number
  ) => {
    setSessions((prev) => {
      const next = [...prev]
      const exercises = [...next[sessionIdx].exercises]
      exercises[exIdx] = { ...exercises[exIdx], [field]: value }
      next[sessionIdx] = { ...next[sessionIdx], exercises }
      return next
    })
  }

  const removeExercise = (sessionIdx: number, exIdx: number) => {
    setSessions((prev) => {
      const next = [...prev]
      next[sessionIdx] = {
        ...next[sessionIdx],
        exercises: next[sessionIdx].exercises.filter((_, i) => i !== exIdx),
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!name.trim()) {
      setErrors({ name: "Name is required" })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        template_goal: templateGoal || null,
        template_level: templateLevel || null,
        template_days: templateDays || null,
        sessions: sessions
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            exercises: s.exercises.map((ex) => ({
              exercise_id: ex.exercise_id,
              sets: ex.sets,
              reps: ex.reps,
              rest_time: ex.rest_time,
              weight: ex.weight,
            })),
          })),
      }

      if (isEdit) {
        await api.put(`/admin/splits/${editId}`, payload)
      } else {
        await api.post("/admin/splits", payload)
      }
      router.push("/dashboard/workout-splits")
    } catch {
      setErrors({ name: "Failed to save split. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  const pickExercise = (sessionIdx: number) => {
    setShowExercisePicker({ sessionIdx })
    setExerciseSearch("")
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/workout-splits"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit" : "New"} Workout Split</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Update #${editId}` : "Create a new workout template"}
            {errors.name?.includes("Failed") && (
              <span className="ml-2 text-destructive">{errors.name}</span>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Metadata */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">
              Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push Pull Legs"
              className="mt-1"
            />
            {errors.name && !errors.name.includes("Failed") && (
              <p className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div>
            <Label>Goal</Label>
            <div className="mt-1">
              <select
                value={templateGoal}
                onChange={(e) => setTemplateGoal(e.target.value)}
                className="h-8 w-full rounded-md border bg-secondary px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Level</Label>
            <div className="mt-1">
              <select
                value={templateLevel}
                onChange={(e) => setTemplateLevel(e.target.value)}
                className="h-8 w-full rounded-md border bg-secondary px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Days / Week</Label>
            <Input
              value={templateDays}
              onChange={(e) => setTemplateDays(e.target.value)}
              placeholder="e.g. 3 days"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the split, goals, and structure..."
            rows={3}
            className="mt-1 w-full rounded-md border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Sessions / Days */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-base">Days</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSession}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Day
            </Button>
          </div>

          <div className="space-y-4">
            {sessions.map((session, sIdx) => (
              <div key={sIdx} className="rounded-lg border bg-card">
                <div className="flex items-center gap-2 border-b px-4 py-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <span className="text-xs font-medium text-muted-foreground">Day {sIdx + 1}</span>
                  <Input
                    value={session.name}
                    onChange={(e) => updateSession(sIdx, e.target.value)}
                    placeholder="e.g. Push Day"
                    className="h-7 flex-1 text-sm"
                  />
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSession(sIdx)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Exercises within session */}
                <div className="p-4">
                  {session.exercises.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No exercises yet
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <div className="col-span-4">Exercise</div>
                        <div className="col-span-2 text-center">Sets</div>
                        <div className="col-span-2 text-center">Reps</div>
                        <div className="col-span-2 text-center">Rest</div>
                        <div className="col-span-2 text-center">Weight</div>
                      </div>
                      {session.exercises.map((ex, eIdx) => (
                        <div key={eIdx} className="grid grid-cols-12 items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
                          <div className="col-span-4 flex items-center gap-1.5">
                            {ex.image_url && (
                              <img src={ex.image_url} alt="" className="h-5 w-5 rounded object-cover" />
                            )}
                            <span className="truncate text-sm">{ex.name}</span>
                            <button
                              type="button"
                              onClick={() => removeExercise(sIdx, eIdx)}
                              className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExercise(sIdx, eIdx, "sets", Number(e.target.value))}
                              className="h-7 w-14 rounded-md border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              min={1}
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input
                              value={ex.reps}
                              onChange={(e) => updateExercise(sIdx, eIdx, "reps", e.target.value)}
                              className="h-7 w-14 rounded-md border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input
                              value={ex.rest_time}
                              onChange={(e) => updateExercise(sIdx, eIdx, "rest_time", e.target.value)}
                              className="h-7 w-14 rounded-md border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input
                              value={ex.weight}
                              onChange={(e) => updateExercise(sIdx, eIdx, "weight", e.target.value)}
                              className="h-7 w-14 rounded-md border bg-background px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pickExercise(sIdx)}
                    className="mt-3"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Exercise
                  </Button>
                </div>

                {/* Exercise picker modal */}
                {showExercisePicker?.sessionIdx === sIdx && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowExercisePicker(null)}>
                    <div
                      className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl flex-col rounded-lg border bg-card shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b px-5 py-3">
                        <h2 className="text-base font-semibold">Add Exercise</h2>
                        <button
                          type="button"
                          onClick={() => { setShowExercisePicker(null); setExerciseFilters({}); setExerciseSearch("") }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Search + Filters */}
                      <div className="border-b px-5 py-3">
                        <div className="relative mb-3">
                          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search exercises..."
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            autoFocus
                            className="h-8 w-full rounded-md border bg-secondary pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                          {filterConfig.map((cfg) => (
                            <div key={cfg.key} className="w-36">
                              <FormSelect
                                label={cfg.label}
                                items={filterOptions[cfg.optionsKey] ?? []}
                                value={exerciseFilters[cfg.key] ?? ""}
                                onChange={(v) => setExerciseFilters((prev) => ({ ...prev, [cfg.key]: v }))}
                              />
                            </div>
                          ))}
                          {activeFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setExerciseFilters({})}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Exercise list */}
                      <div className="flex-1 overflow-y-auto px-5 py-3">
                        {filteredExercises.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">No exercises match</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {filteredExercises.map((ex) => (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => addExercise(sIdx, ex)}
                                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                              >
                                {ex.image_url ? (
                                  <img src={ex.image_url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-secondary text-xs font-bold text-muted-foreground">
                                    {ex.name.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{ex.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {[ex.target, ex.category, ex.body_part].filter(Boolean).join(" \u00B7 ") || ""}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Split"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/workout-splits")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
