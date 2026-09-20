"use client"

import { Dumbbell, Zap, ShieldCheck, HeartHandshake, Bot } from "lucide-react"

const PROOF_POINTS = [
  {
    icon: Dumbbell,
    title: "1,300+ Exercises",
    desc: "Anatomy & muscle models",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/40",
  },
  {
    icon: Zap,
    title: "Sub-100ms Native",
    desc: "Hermes & React 19 architecture",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40",
  },
  {
    icon: ShieldCheck,
    title: "100% Open Source",
    desc: "Self-hostable with Postgres",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40",
  },
  {
    icon: HeartHandshake,
    title: "$0 Paywalls",
    desc: "Core tracking free forever",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40",
  },
  {
    icon: Bot,
    title: "AI Strength Scientist",
    desc: "Telemetry & recovery analysis",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-900/40",
  },
]

export function ProofStrip() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Editorial Header */}
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
          ENGINEERED FOR ATHLETES, TRAINERS & GYM CREATORS
        </p>
      </div>

      {/* Grid of Metric Badges: Mobile friendly, wraps cleanly */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {PROOF_POINTS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className={`group flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${item.bg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 dark:bg-neutral-900/90 shadow-xs ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 group-hover:scale-150 transition-transform" />
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  {item.title}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
