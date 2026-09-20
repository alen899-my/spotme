"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { SITE_IMAGE_FALLBACKS } from "@/lib/site-images"

export function BentoGrid({ srcMap }: { srcMap?: Record<string, string> }) {
  // Local public/ files were removed — fall back to seeded R2 URLs.
  const src = (slug: string, _legacyFallback: string) =>
    srcMap?.[slug] || SITE_IMAGE_FALLBACKS[slug] || _legacyFallback;
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

      {/* 12-Column Magazine Bento Grid with Full Solid Colors & No Unnecessary Borders */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-7">
        {/* CARD 1: Exercises — Full Solid Indigo (8 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-8 group relative overflow-hidden rounded-3xl bg-indigo-600 dark:bg-indigo-950 p-6 sm:p-9 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-indigo-400/30 dark:border-indigo-800/60 pb-4 mb-6">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-100">
              Exercise Library
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
              1,300+ Exercises
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="md:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Learn how to do every lift with proper form.
                </h3>
                <p className="mt-3 text-sm text-indigo-100 leading-relaxed">
                  Tap any muscle to find the right exercises. Easily filter by
                  barbell, dumbbell, machines, or bodyweight to match the equipment you have.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-indigo-400/30 dark:border-indigo-800/60">
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="rounded-xl bg-white/15 dark:bg-white/10 p-2.5">
                    <span className="block text-[11px] text-indigo-200">Muscles</span>
                    <span className="text-xs font-bold text-white">Full Body</span>
                  </div>
                  <div className="rounded-xl bg-white/15 dark:bg-white/10 p-2.5">
                    <span className="block text-[11px] text-indigo-200">Guides</span>
                    <span className="text-xs font-bold text-white">Step by Step</span>
                  </div>
                  <div className="rounded-xl bg-white/15 dark:bg-white/10 p-2.5">
                    <span className="block text-[11px] text-indigo-200">Equipment</span>
                    <span className="text-xs font-bold text-white">All Gear</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["Barbell", "Dumbbell", "Cables", "Machines", "Bodyweight"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/20 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2.5 sm:p-3.5 shadow-md flex items-center justify-center backdrop-blur-xs">
                <div className="relative h-full w-full">
                  <Image
                    src={src("bento-exercises", "/images/app-assets/exercises.png")}
                    alt="SpotMe Exercise Library and Muscle Map"
                    fill
                    className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              </div>
              <p className="mt-2.5 text-center text-xs text-indigo-200">
                Tap muscles to see recommended exercises
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: Workout Splits — Full Solid Emerald (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-emerald-600 dark:bg-emerald-950 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-emerald-400/30 dark:border-emerald-800/60 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-100">
                Workout Routines
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
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
                  className="rounded-md bg-white/20 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3 shadow-md flex items-center justify-center backdrop-blur-xs">
              <div className="relative h-full w-full">
                <Image
                  src={src("bento-splits", "/images/app-assets/splits.png")}
                  alt="SpotMe Workout Splits"
                  fill
                  className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
            <p className="mt-2.5 text-center text-xs text-emerald-200">
              Pre-made plans ready for you to follow
            </p>
          </div>
        </motion.div>

        {/* CARD 3: Active Workout Logger — Full Solid Onyx & Gold (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-6 lg:col-span-4 group relative overflow-hidden rounded-3xl bg-neutral-950 dark:bg-black p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl flex flex-col justify-between"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-[#F7CB16]">
                In The Gym
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-950/70 text-[#F7CB16]">
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
                  className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-[#F7CB16]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mt-6 z-10">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black p-2 sm:p-3 flex items-center justify-center shadow-md">
              <div className="relative h-full w-full">
                <Image
                  src={src("bento-workoutlog", "/images/app-assets/workoutlog.jpg")}
                  alt="SpotMe In-Gym Workout Logger"
                  fill
                  className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
            <p className="mt-2.5 text-center text-xs text-neutral-400">
              Clean buttons and automatic rest timers
            </p>
          </div>
        </motion.div>

        {/* CARD 4: Meals & Nutrition — Full Solid Warm Amber (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-6 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-amber-600 dark:bg-amber-950 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-amber-400/30 dark:border-amber-800/60 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-100">
                Daily Nutrition
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Food Log
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Track calories and protein easily.
            </h3>
            <p className="mt-2 text-sm text-amber-100 leading-relaxed">
              Log your meals through the day. Keep an eye on your daily calories, protein, and carbs to fuel your goals.
            </p>

            {/* Solid Food Breakdown Rows */}
            <div className="mt-4 space-y-1.5 rounded-xl bg-white/15 dark:bg-white/10 p-3 text-xs">
              <div className="flex justify-between text-amber-100">
                <span>Protein</span>
                <span className="font-bold text-white">Build & recover</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Calories</span>
                <span className="font-bold text-white">Stay on budget</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Meals</span>
                <span className="font-bold text-white">Quick daily entry</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3 shadow-md flex items-center justify-center backdrop-blur-xs">
              <div className="relative h-full w-full">
                <Image
                  src={src("bento-foodlog", "/images/app-assets/foodlog.jpg")}
                  alt="SpotMe Meal and Food Tracker"
                  fill
                  className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
            <p className="mt-2.5 text-center text-xs text-amber-200">
              Simple meal logging for breakfast, lunch, and dinner
            </p>
          </div>
        </motion.div>

        {/* CARD 5: Body Weight & Progress — Full Solid Sky Cyan (4 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-4 group flex flex-col justify-between rounded-3xl bg-sky-600 dark:bg-sky-950 p-6 sm:p-7 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-sky-400/30 dark:border-sky-800/60 pb-3 mb-4">
              <span className="text-xs font-bold tracking-wider uppercase text-sky-100">
                Body Progress
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Weight Tracking
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Watch your progress over time.
            </h3>
            <p className="mt-2 text-sm text-sky-100 leading-relaxed">
              Weigh in regularly and see a clean graph of your journey toward your goal weight, without confusing numbers.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Daily Weigh-In", "Progress Graph", "Goal Milestones"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/20 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3 shadow-md flex items-center justify-center backdrop-blur-xs">
              <div className="relative h-full w-full">
                <Image
                  src={src("bento-weight", "/images/app-assets/weight.png")}
                  alt="SpotMe Body Weight Progress Tracker"
                  fill
                  className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>
            <p className="mt-2.5 text-center text-xs text-sky-200">
              Clear chart showing your progress toward your goal
            </p>
          </div>
        </motion.div>

        {/* CARD 6: Workout Reports — Full Solid Crimson / Rose (6 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-6 group rounded-3xl bg-rose-600 dark:bg-rose-950 p-6 sm:p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-rose-400/30 dark:border-rose-800/60 pb-3 mb-5">
            <span className="text-xs font-bold tracking-wider uppercase text-rose-100">
              Weekly Summary
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
              Reports
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  See how much you lifted this week.
                </h3>
                <p className="mt-2 text-sm text-rose-100 leading-relaxed">
                  SpotMe automatically adds up your total weight lifted, number of workouts completed, and time spent training.
                </p>
              </div>

              <div className="mt-5 space-y-2 border-t border-rose-400/30 dark:border-rose-800/60 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-200">Total Weight Lifted:</span>
                  <span className="font-bold text-white">Added up for you</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-200">Workouts Finished:</span>
                  <span className="font-bold text-white">Tracked weekly</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative aspect-[3/4] w-full max-h-[380px] overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3 shadow-md flex items-center justify-center backdrop-blur-xs">
                <div className="relative h-full w-full">
                  <Image
                    src={src("bento-reports", "/images/app-assets/reports.png")}
                    alt="SpotMe Training Reports"
                    fill
                    className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              <p className="mt-2.5 text-center text-xs text-rose-200">
                A clean summary of your hard work
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 7: Calendar Heatmap — Full Solid Teal (6 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 lg:col-span-6 group rounded-3xl bg-teal-700 dark:bg-teal-950 p-6 sm:p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-teal-500/30 dark:border-teal-800/60 pb-3 mb-5">
            <span className="text-xs font-bold tracking-wider uppercase text-teal-100">
              Workout Calendar
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
              Stay Consistent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Keep your gym streak going.
                </h3>
                <p className="mt-2 text-sm text-teal-100 leading-relaxed">
                  Every day you work out shows up on your monthly calendar. Build consistency and remember to plan rest days when you need them.
                </p>
              </div>

              <div className="mt-5 space-y-2 border-t border-teal-500/30 dark:border-teal-800/60 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-teal-200">Workout Days:</span>
                  <span className="font-bold text-white">Marked on calendar</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-teal-200">Past Sessions:</span>
                  <span className="font-bold text-white">Tap any day to view</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative aspect-square w-full max-h-[380px] overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3 shadow-md flex items-center justify-center backdrop-blur-xs">
                <div className="relative h-full w-full">
                  <Image
                    src={src("bento-calendar", "/images/app-assets/calendar.png")}
                    alt="SpotMe Calendar Heatmap"
                    fill
                    className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              <p className="mt-2.5 text-center text-xs text-teal-200">
                See every workout you completed this month
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 8: Community & Following — Full Solid Deep Purple (12 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-12 group rounded-3xl bg-purple-700 dark:bg-purple-950 p-6 sm:p-9 text-white shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-purple-400/30 dark:border-purple-800/60 pb-4 mb-6">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-100">
              Community
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
              Workout Together
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  Follow friends and stay accountable.
                </h3>
                <p className="mt-3 text-sm text-purple-100 leading-relaxed">
                  Working out is better with a partner. See what your friends trained today, cheer their progress, and keep each other motivated to show up.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-purple-700 text-xs font-extrabold shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Real Workouts Only
                    </h4>
                    <p className="text-xs text-purple-200">
                      See the exercises, weights, and sets your friends completed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-purple-700 text-xs font-extrabold shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Friendly Motivation
                    </h4>
                    <p className="text-xs text-purple-200">
                      Stay inspired knowing your gym partner didn't skip their session.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[1402/1122] w-full overflow-hidden rounded-2xl bg-white/10 dark:bg-black/40 p-2 sm:p-3.5 shadow-md flex items-center justify-center backdrop-blur-xs">
                <div className="relative h-full w-full">
                  <Image
                    src={src("bento-following", "/images/app-assets/following.png")}
                    alt="SpotMe Athlete Following Feed"
                    fill
                    className="object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>
              </div>
              <p className="mt-2.5 text-center text-xs text-purple-200">
                Find friends and follow each other's workout logs
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
