"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import {
  Users,
  Dumbbell,
  Utensils,
  Activity,
  ArrowUpRight,
  Droplets,
} from "lucide-react"

interface Stats {
  totalUsers: number
  totalWorkouts: number
  totalMeals: number
  activeUsers: number
  totalWaterLogs: number
  activeWorkoutsNow: number
}

const statCards = [
  {
    key: "totalUsers" as const,
    label: "Total Users",
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "totalWorkouts" as const,
    label: "Workouts Completed",
    icon: Dumbbell,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "totalMeals" as const,
    label: "Meals Logged",
    icon: Utensils,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    key: "activeUsers" as const,
    label: "Active (7d)",
    icon: Activity,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    key: "totalWaterLogs" as const,
    label: "Water Logs",
    icon: Droplets,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    key: "activeWorkoutsNow" as const,
    label: "Active Now",
    icon: Activity,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get("/admin/dashboard").then((res) => setStats(res.data)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your platform
          </p>
        </div>
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-emerald-500/40 hover:bg-secondary hover:text-foreground hover:shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
          System Telemetry & APM
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const value = stats?.[card.key]
          const Icon = card.icon
          return (
            <div
              key={card.key}
              className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-start justify-between">
                <div className={cn("rounded-lg p-2", card.bg)}>
                  <Icon className={cn("h-4 w-4", card.color)} />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {value?.toLocaleString() ?? "\u2014"}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {card.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
