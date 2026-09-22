"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { SITE_IMAGE_FALLBACKS } from "@/lib/site-images"

export function BentoGrid({ srcMap }: { srcMap?: Record<string, string> }) {
  // All images resolve to Cloudflare R2 (live map → seeded fallback). No local files.
  const src = (slug: string) => srcMap?.[slug] || SITE_IMAGE_FALLBACKS[slug] || "";
  return (
    <section
      id="features"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      {/* Editorial Header */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-neutral-200/80 dark:border-neutral-800 pb-8 mb-12 sm:mb-16"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Inside the App
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              All your fitness tools in one place.
            </h2>
          </div>
          <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
            Track workouts, log meals, and stay consistent every day.
            Here is a look inside the actual SpotMe mobile app.
          </p>
        </div>
      </motion.div>

      {/* 12-Column Magazine Bento Grid with Solid Olympic Plate Colors */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-7">
        {/* CARD 1: Exercises — Solid Olympic Blue (8 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-8 group relative overflow-hidden rounded-3xl bg-blue-600 dark:bg-blue-600 border border-blue-500 p-6 sm:p-9 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-blue-400/40 pb-4 mb-6">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-100">
              Exercise Library
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              1,300+ Exercises
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="md:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Learn how to do every lift with proper form.
                </h3>
                <p className="mt-3 text-sm text-blue-100 leading-relaxed">
                  Tap any muscle to find the right exercises. Easily filter by
                  barbell, dumbbell, machines, or bodyweight to match the equipment you have.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-400/40">
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="rounded-xl bg-white/15 p-2.5">
                    <span className="block text-[11px] text-blue-200">Muscles</span>
                    <span className="text-xs font-bold text-white">Full Body</span>
                  </div>
                  <div className="rounded-xl bg-white/15 p-2.5">
                    <span className="block text-[11px] text-blue-200">Guides</span>
                    <span className="text-xs font-bold text-white">Step by Step</span>
                  </div>
                  <div className="rounded-xl bg-white/15 p-2.5">
                    <span className="block text-[11px] text-blue-200">Equipment</span>
                    <span className="text-xs font-bold text-white">All Gear</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["Barbell", "Dumbbell", "Cables", "Machines", "Bodyweight"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="relative aspect-square w-full flex items-center justify-center">
                <Image
                  src={src("bento-exercises")}
                  alt="SpotMe Exercise Library and Muscle Map"
                  fill
                  className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              <p className="mt-2.5 text-center text-xs text-blue-200">
                Tap muscles to see recommended exercises
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: Workout Splits — Solid Olympic Green (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-emerald-600 dark:bg-emerald-600 border border-emerald-500 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-emerald-400/40 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-100">
                Workout Routines
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                Weekly Plans
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Pick a plan and stick to it.
            </h3>
            <p className="mt-2 text-sm text-emerald-100 leading-relaxed">
              Choose popular routines like Push-Pull-Legs or Upper-Lower, or build your own custom schedule day by day.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Push / Pull / Legs", "Upper / Lower", "Full Body"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative aspect-[3/2] w-full flex items-center justify-center">
              <Image
                src={src("bento-splits")}
                alt="SpotMe Workout Splits"
                fill
                className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="mt-2.5 text-center text-xs text-emerald-200">
              Pre-made plans ready for you to follow
            </p>
          </div>
        </motion.div>

        {/* CARD 3: Active Workout Logger — Solid Olympic Black Bumper (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-6 lg:col-span-4 group relative overflow-hidden rounded-3xl bg-neutral-950 dark:bg-neutral-950 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl flex flex-col justify-between border-2 border-neutral-800"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-[#F7CB16]">
                In The Gym
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F7CB16]/20 text-[#F7CB16]">
                Live Logger
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Log sets, reps, and weights.
            </h3>
            <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
              Simple and fast tracking while you lift. Check off sets as you finish, and let the rest timer tell you when to go again.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Rest Timers", "Quick Logging", "Set History"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs font-medium text-[#F7CB16]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mt-6 z-10">
            <div className="relative aspect-square w-full flex items-center justify-center">
              <Image
                src={src("bento-workoutlog")}
                alt="SpotMe In-Gym Workout Logger"
                fill
                className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="mt-2.5 text-center text-xs text-neutral-400">
              Clean buttons and automatic rest timers
            </p>
          </div>
        </motion.div>

        {/* CARD 4: Meals & Nutrition — Solid Olympic Yellow (Hero Plate Color) (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-6 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-[#F7CB16] dark:bg-[#F7CB16] border border-amber-400 p-6 sm:p-7 text-neutral-950 shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-black/15 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-neutral-900">
                Daily Nutrition
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/15 text-neutral-950">
                Food Log
              </span>
            </div>

            <h3 className="text-xl font-black tracking-tight text-neutral-950">
              Track calories and protein easily.
            </h3>
            <p className="mt-2 text-sm text-neutral-900 leading-relaxed font-medium">
              Log your meals through the day. Keep an eye on your daily calories, protein, and carbs to fuel your goals.
            </p>

            {/* Solid Food Breakdown Rows */}
            <div className="mt-4 space-y-1.5 rounded-xl bg-black/10 p-3 text-xs">
              <div className="flex justify-between text-neutral-900 font-medium">
                <span>Protein</span>
                <span className="font-black text-neutral-950">Build & recover</span>
              </div>
              <div className="flex justify-between text-neutral-900 font-medium">
                <span>Calories</span>
                <span className="font-black text-neutral-950">Stay on budget</span>
              </div>
              <div className="flex justify-between text-neutral-900 font-medium">
                <span>Meals</span>
                <span className="font-black text-neutral-950">Quick daily entry</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="relative aspect-square w-full flex items-center justify-center">
              <Image
                src={src("bento-foodlog")}
                alt="SpotMe Meal and Food Tracker"
                fill
                className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="mt-2.5 text-center text-xs text-neutral-900 font-medium">
              Simple meal logging for breakfast, lunch, and dinner
            </p>
          </div>
        </motion.div>

        {/* CARD 5: Body Weight & Progress — Solid Olympic Red (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-red-600 dark:bg-red-600 border border-red-500 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-red-400/40 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-red-100">
                Body Progress
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                Weight Tracking
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Watch your progress over time.
            </h3>
            <p className="mt-2 text-sm text-red-100 leading-relaxed">
              Weigh in regularly and see a clean graph of your journey toward your goal weight, without confusing numbers.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Daily Weigh-In", "Progress Graph", "Goal Milestones"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative aspect-square w-full flex items-center justify-center">
              <Image
                src={src("bento-weight")}
                alt="SpotMe Body Weight Progress Tracker"
                fill
                className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="mt-2.5 text-center text-xs text-red-200">
              Clear chart showing your progress toward your goal
            </p>
          </div>
        </motion.div>

        {/* CARD 6: Workout Reports — Solid Olympic White / Silver (6 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-6 group rounded-3xl bg-slate-100 dark:bg-slate-200 border border-slate-300 p-6 sm:p-8 text-neutral-950 dark:text-neutral-950 shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-5">
            <span className="text-xs font-bold tracking-wider uppercase text-neutral-700">
              Weekly Summary
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/10 text-neutral-950">
              Reports
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                  See how much you lifted this week.
                </h3>
                <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
                  SpotMe automatically adds up your total weight lifted, number of workouts completed, and time spent training.
                </p>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-300 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700">Total Weight Lifted:</span>
                  <span className="font-bold text-neutral-950">Added up for you</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-700">Workouts Finished:</span>
                  <span className="font-bold text-neutral-950">Tracked weekly</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative aspect-[3/4] w-full max-h-[380px] flex items-center justify-center">
                <Image
                  src={src("bento-reports")}
                  alt="SpotMe Training Reports"
                  fill
                  className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <p className="mt-2.5 text-center text-xs text-neutral-700">
                A clean summary of your hard work
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 7: Calendar Heatmap — Solid Olympic Red (6 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-6 group rounded-3xl bg-red-600 dark:bg-red-600 border border-red-500 p-6 sm:p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-red-400/40 pb-3 mb-5">
            <span className="text-xs font-bold tracking-wider uppercase text-red-100">
              Workout Calendar
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              Stay Consistent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Keep your gym streak going.
                </h3>
                <p className="mt-2 text-sm text-red-100 leading-relaxed">
                  Every day you work out shows up on your monthly calendar. Build consistency and remember to plan rest days when you need them.
                </p>
              </div>

              <div className="mt-5 space-y-2 border-t border-red-400/40 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-200">Workout Days:</span>
                  <span className="font-bold text-white">Marked on calendar</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-200">Past Sessions:</span>
                  <span className="font-bold text-white">Tap any day to view</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative aspect-square w-full max-h-[380px] flex items-center justify-center">
                <Image
                  src={src("bento-calendar")}
                  alt="SpotMe Calendar Heatmap"
                  fill
                  className="object-contain drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <p className="mt-2.5 text-center text-xs text-red-200">
                See every workout you completed this month
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 8: Community & Following — Solid Olympic Championship Black & Gold Bumper (12 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 group rounded-3xl bg-neutral-950 dark:bg-neutral-950 p-6 sm:p-9 text-white shadow-xl transition-all duration-300 hover:shadow-2xl border-2 border-neutral-800"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
            <span className="text-xs font-bold tracking-wider uppercase text-[#F7CB16]">
              Community
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F7CB16]/20 text-[#F7CB16]">
              Workout Together
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  Follow friends and stay accountable.
                </h3>
                <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
                  Working out is better with a partner. See what your friends trained today, cheer their progress, and keep each other motivated to show up.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7CB16] text-neutral-950 text-xs font-extrabold shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Real Workouts Only
                    </h4>
                    <p className="text-xs text-neutral-400">
                      See the exercises, weights, and sets your friends completed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7CB16] text-neutral-950 text-xs font-extrabold shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Friendly Motivation
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Stay inspired knowing your gym partner didn't skip their session.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[1402/1122] w-full flex items-center justify-center">
                <Image
                  src={src("bento-following")}
                  alt="SpotMe Athlete Following Feed"
                  fill
                  className="object-contain drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </div>
              <p className="mt-2.5 text-center text-xs text-neutral-400">
                Find friends and follow each other's workout logs
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
