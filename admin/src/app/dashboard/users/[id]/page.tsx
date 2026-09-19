"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  User as UserIcon,
  Flame,
  Utensils,
  Camera,
  Scale,
  Calendar,
  Clock,
  Trash2,
  Edit,
  Mail,
  Phone,
  Shield,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface WorkoutItem {
  id: number
  scheduled_date: string
  status: string
  completed_at: string | null
  duration_seconds: number | null
  exercises_count: number
  total_volume_kg: number
}

interface MealItem {
  id: number
  meal_type: string
  photo_url: string | null
  calories: number
  protein: number
  carbs: number
  fats: number
  created_at: string
}

interface WeightItem {
  id: number
  weight_kg: number
  logged_date: string
  created_at: string
}

interface PhysiqueItem {
  id: number
  photo_url: string
  overall_score: number
  body_fat_estimate: string
  status: string
  created_at: string
}

export default function User360Page() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"bio" | "workouts" | "meals" | "progress">("bio")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{
    user: any
    workouts: WorkoutItem[]
    meals: MealItem[]
    weights: WeightItem[]
    physique: PhysiqueItem[]
  } | null>(null)

  useEffect(() => {
    api
      .get(`/admin/users/${id}/full-profile`)
      .then((res) => setProfile(res.data))
      .catch((err) => {
        console.error("Failed to load user 360:", err)
        // Fallback to basic user endpoint
        api.get(`/admin/users/${id}`).then((basicRes) => {
          setProfile({
            user: basicRes.data.user || basicRes.data,
            workouts: [],
            meals: [],
            weights: [],
            physique: [],
          })
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground font-mono">
        Loading User 360 profile...
      </div>
    )
  }

  const user = profile?.user
  if (!user) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        User not found.
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete user ${user.full_name || user.email}?`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      router.push("/dashboard/users")
    } catch (err) {
      console.error("Failed to delete user:", err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard/users")}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Users
      </button>

      {/* Hero Profile Card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {user.profile_pic_url ? (
              <img
                src={user.profile_pic_url}
                alt="Avatar"
                className="h-14 w-14 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-lg text-foreground">
                {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  {user.full_name || "Athlete"}
                </h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-500">
                  Active
                </span>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono capitalize text-muted-foreground">
                  {user.role || "user"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>XP: {user.total_xp?.toLocaleString() || 0}</span>
                <span>•</span>
                <span className="capitalize">Tier: {user.league_tier || "Bronze"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              className="h-8 text-xs text-rose-500 hover:text-rose-600 border-rose-500/30"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* 4 Micro Stat Cards */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/40 text-xs font-mono">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Fitness Goal</span>
            <div className="text-sm font-semibold text-foreground mt-0.5 capitalize truncate font-sans">
              {user.fitness_goal || "General"}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Experience</span>
            <div className="text-sm font-semibold text-foreground mt-0.5 capitalize truncate font-sans">
              {user.experience_level || "Beginner"}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Height / Weight</span>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {user.height || "—"} cm · {user.weight || "—"} kg
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Workouts Completed</span>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {profile?.workouts?.length || 0} sessions
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 overflow-x-auto">
        {[
          { id: "bio" as const, label: "Account & Health Bio", icon: UserIcon },
          { id: "workouts" as const, label: `Workouts (${profile?.workouts?.length || 0})`, icon: Flame },
          { id: "meals" as const, label: `Logged Meals (${profile?.meals?.length || 0})`, icon: Utensils },
          { id: "progress" as const, label: `Weight & Photos (${profile?.weights?.length || 0})`, icon: Scale },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: BIO & HEALTH */}
      {activeTab === "bio" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pb-2 border-b border-border">
              Personal &amp; Demographics
            </h2>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-sans">Gender</span>
                <span className="text-foreground capitalize">{user.gender || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-sans">Date of Birth</span>
                <span className="text-foreground">{user.dob ? new Date(user.dob).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-sans">Age</span>
                <span className="text-foreground">{user.age || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-sans">Phone</span>
                <span className="text-foreground">{user.phone_number || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground font-sans">Diet Preference</span>
                <span className="text-foreground capitalize">{user.diet_type || "Standard"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pb-2 border-b border-border">
              Body Measurements (cm/in)
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Chest</span>
                <div className="font-semibold text-foreground mt-0.5">{user.chest || "—"}</div>
              </div>
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Waist</span>
                <div className="font-semibold text-foreground mt-0.5">{user.waist || "—"}</div>
              </div>
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Arms</span>
                <div className="font-semibold text-foreground mt-0.5">{user.arm || "—"}</div>
              </div>
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Thigh</span>
                <div className="font-semibold text-foreground mt-0.5">{user.thigh || "—"}</div>
              </div>
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Hips</span>
                <div className="font-semibold text-foreground mt-0.5">{user.hip || "—"}</div>
              </div>
              <div className="rounded border border-border/40 bg-secondary/30 p-2">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">Body Fat</span>
                <div className="font-semibold text-foreground mt-0.5">{user.body_fat ? `${user.body_fat}%` : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKOUTS */}
      {activeTab === "workouts" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {(profile?.workouts || []).length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              No workout sessions logged for this user yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40 text-xs">
              {(profile?.workouts || []).map((w) => (
                <div key={w.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Flame className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground block">
                        Workout Session #{w.id}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {w.completed_at ? new Date(w.completed_at).toLocaleDateString() : w.scheduled_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs">
                    <span>{w.exercises_count || 0} exercises</span>
                    <span>{w.duration_seconds ? `${Math.floor(w.duration_seconds / 60)}m` : "—"}</span>
                    <span className="font-bold text-foreground">{Math.round(w.total_volume_kg || 0)} kg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEALS */}
      {activeTab === "meals" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {(profile?.meals || []).length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              No meals logged for this user yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40 text-xs">
              {(profile?.meals || []).map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt="Meal" className="h-10 w-10 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                        <Utensils className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-foreground capitalize block">{m.meal_type || "Meal"}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="font-bold text-foreground">{Math.round(m.calories || 0)} kcal</span>
                    <span className="text-sky-500">{m.protein || 0}g P</span>
                    <span className="text-amber-500">{m.carbs || 0}g C</span>
                    <span className="text-rose-500">{m.fats || 0}g F</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROGRESS & PHOTOS */}
      {activeTab === "progress" && (
        <div className="space-y-4">
          {/* Physique Photos */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pb-3 border-b border-border">
              Progress Photos ({profile?.physique?.length || 0})
            </h2>
            {(profile?.physique || []).length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No progress photos uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {(profile?.physique || []).map((p) => (
                  <div key={p.id} className="aspect-3/4 rounded-lg border border-border bg-secondary overflow-hidden relative">
                    <img src={p.photo_url} alt="Physique" className="h-full w-full object-cover" />
                    <div className="absolute top-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white">
                      Score: {p.overall_score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weight Logs */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pb-3 border-b border-border">
              Body Weight History ({profile?.weights?.length || 0} entries)
            </h2>
            {(profile?.weights || []).length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No body weight entries recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40 text-xs font-mono mt-2">
                {(profile?.weights || []).map((w) => (
                  <div key={w.id} className="py-2 flex justify-between">
                    <span className="text-muted-foreground">{new Date(w.logged_date).toLocaleDateString()}</span>
                    <span className="font-bold text-foreground">{w.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
