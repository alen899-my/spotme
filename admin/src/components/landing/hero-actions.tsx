"use client"

import Link from "next/link"
import { ArrowRight, Play, Check } from "lucide-react"

export function HeroActions() {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
        <a
          href="https://spotme-gym.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 rounded-full bg-neutral-950 px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-neutral-800 hover:shadow-lg active:scale-98 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          Get Started Free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("features")
            if (el) el.scrollIntoView({ behavior: "smooth" })
          }}
          className="inline-flex items-center gap-2.5 rounded-full border border-neutral-200/90 bg-white/90 px-6 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-neutral-50 hover:shadow active:scale-98 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
          </span>
          Watch Video
        </button>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <div className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
          <span>Free to start</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
          <span>No credit card required</span>
        </div>
      </div>
    </div>
  )
}
