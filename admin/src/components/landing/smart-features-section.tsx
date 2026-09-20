"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { SITE_IMAGE_FALLBACKS } from "@/lib/site-images"
import {
  Utensils,
  Shuffle,
  Calendar,
  Layers,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Timer,
  Scan,
} from "lucide-react"

export function SmartFeaturesSection({ srcMap }: { srcMap?: Record<string, string> }) {
  // Card 1: Meal Analysis state
  const [activeMealPreset, setActiveMealPreset] = useState<0 | 1>(0)

  // Card 2: Equipment Swaps state
  const [activeSwapIdx, setActiveSwapIdx] = useState<0 | 1 | 2>(0)

  // Card 3: Routine Days state
  const [activeDays, setActiveDays] = useState<"3-day" | "4-day" | "5-day">("4-day")

  // Card 4: Progress Vault state
  const [activeAngle, setActiveAngle] = useState<"front" | "back" | "posture">("front")

  const MEAL_DATA = [
    {
      title: "Grilled Chicken & Quinoa Bowl",
      cal: "564 kcal",
      p: "52g protein",
      c: "44g carbs",
      f: "16g fat",
      items: [
        { name: "Chicken Breast", weight: "180g", stat: "48g protein" },
        { name: "Organic Quinoa", weight: "120g", stat: "26g carbs" },
        { name: "Avocado & Greens", weight: "60g", stat: "9g healthy fats" },
      ],
    },
    {
      title: "Protein Oatmeal & Berries",
      cal: "480 kcal",
      p: "42g protein",
      c: "58g carbs",
      f: "8g fat",
      items: [
        { name: "Rolled Oats & Whey", weight: "80g", stat: "34g protein" },
        { name: "Fresh Blueberries", weight: "100g", stat: "24g carbs" },
        { name: "Almond Butter", weight: "15g", stat: "7g healthy fats" },
      ],
    },
  ]

  const SWAP_DATA = [
    {
      original: "Barbell Bench Press",
      status: "All Flat Benches Taken",
      substitute: "Dumbbell Flat Chest Press",
      muscle: "Chest & Front Delts",
      benefit: "Equal muscle activation, zero waiting",
      gear: "Dumbbells Available",
    },
    {
      original: "Squat Rack",
      status: "3 People in Rotation",
      substitute: "Heavy 45° Leg Press",
      muscle: "Quads & Glutes",
      benefit: "Full leg overload with quick setup",
      gear: "Leg Press Open",
    },
    {
      original: "Lat Pulldown Machine",
      status: "Cable Stack Occupied",
      substitute: "Assisted Wide Pull-Up",
      muscle: "Lats & Upper Back",
      benefit: "Full lat stretch & grip strength",
      gear: "Pull-Up Bar Ready",
    },
  ]

  return (
    <section
      id="smart-tools"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-t border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
    >
      {/* Editorial Header — Conversational & Action-Oriented */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mb-12 sm:mb-16"
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          You have gym goals. Here is the easiest way to reach them.
        </h2>
        <p className="mt-3.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
          From analyzing what you eat with a quick photo to finding open machines when the gym is packed—see how SpotMe handles everyday fitness challenges.
        </p>
      </motion.div>

      {/* Asymmetric Alternating Grid: Row 1 (7 cols / 5 cols) & Row 2 (5 cols / 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7">
        
        {/* CARD 1: "Want to track your meal and analyze what you eat?" — Solid Amber (7 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 group rounded-3xl bg-amber-600 dark:bg-amber-950 p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            {/* Badge & Step Tag */}
            <div className="flex items-center justify-between border-b border-amber-400/30 dark:border-amber-800/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-200" />
                <span className="text-xs font-bold tracking-wider uppercase text-amber-100">
                  Way 01 • Photo Nutrition
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Snap & Count
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Question & Solution Description */}
              <div className="md:col-span-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Want to track your meal and analyze what you eat?
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-amber-100 leading-relaxed">
                    Just point your camera at your plate. SpotMe identifies each ingredient, estimates portion weights, and breaks down your calories, protein, carbs, and fats in 2 seconds.
                  </p>
                </div>

                {/* Interactive Meal Presets Switcher */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMealPreset(0)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeMealPreset === 0
                          ? "bg-white text-amber-950 shadow-xs"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      Chicken Bowl
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMealPreset(1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeMealPreset === 1
                          ? "bg-white text-amber-950 shadow-xs"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      Protein Oats
                    </button>
                  </div>

                  {/* Detected Foods Pill List */}
                  <div className="space-y-1.5">
                    {MEAL_DATA[activeMealPreset].items.map((food) => (
                      <div
                        key={food.name}
                        className="flex items-center justify-between rounded-xl bg-black/30 backdrop-blur-xs px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                          <span className="font-semibold text-white truncate">{food.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
                          <span className="text-amber-200">{food.weight}</span>
                          <span className="bg-white/20 px-1.5 py-0.5 rounded font-bold text-white">
                            {food.stat}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo with Mobbin-style Pin Tags and HUD */}
              <div className="md:col-span-6">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40 shadow-lg">
                  <Image
                    src={srcMap?.["smart-meal-scan"] || SITE_IMAGE_FALLBACKS["smart-meal-scan"]}
                    alt="Analyze what you eat with SpotMe"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  {/* Pinpoint Annotations on Image */}
                  <div className="absolute top-[28%] left-[30%] -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-950/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>180g Chicken</span>
                    </div>
                  </div>

                  <div className="absolute bottom-[38%] right-[25%] translate-x-1/2 translate-y-1/2">
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-950/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>120g Quinoa</span>
                    </div>
                  </div>

                  {/* Floating Live Nutrition HUD Bar */}
                  <div className="absolute inset-x-3 bottom-3 rounded-xl bg-neutral-950/85 backdrop-blur-md p-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Scan className="h-3.5 w-3.5" />
                        <span>Logged in 2 seconds</span>
                      </div>
                      <span className="font-mono font-bold text-white text-sm">
                        {MEAL_DATA[activeMealPreset].cal}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="rounded-lg bg-white/10 p-1.5">
                        <span className="text-neutral-400 block">Protein</span>
                        <span className="font-bold text-white text-xs">
                          {MEAL_DATA[activeMealPreset].p}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/10 p-1.5">
                        <span className="text-neutral-400 block">Carbs</span>
                        <span className="font-bold text-white text-xs">
                          {MEAL_DATA[activeMealPreset].c}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/10 p-1.5">
                        <span className="text-neutral-400 block">Fats</span>
                        <span className="font-bold text-white text-xs">
                          {MEAL_DATA[activeMealPreset].f}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-400/30 dark:border-amber-800/60 text-xs text-amber-200 flex items-center justify-between">
            <span>Automatic portion estimation</span>
            <span className="font-bold text-white">Saves directly to daily target</span>
          </div>
        </motion.div>

        {/* CARD 2: "Gym equipment taken during peak hours?" — Solid Emerald (5 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 group rounded-3xl bg-emerald-600 dark:bg-emerald-950 p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-emerald-400/30 dark:border-emerald-800/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-emerald-200" />
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-100">
                  Way 02 • Busy Gym Swaps
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Zero Waiting
              </span>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
              Stuck waiting when your gym equipment is taken?
            </h3>
            <p className="mt-2.5 text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Never stand around waiting during peak hours. Tap to instantly swap occupied machines for dumbbell or cable movements that hit the exact same muscle.
            </p>

            {/* Interactive Machine Switcher */}
            <div className="mt-5 space-y-3">
              <div className="flex gap-2 text-xs">
                {SWAP_DATA.map((sw, idx) => (
                  <button
                    key={sw.original}
                    type="button"
                    onClick={() => setActiveSwapIdx(idx as 0 | 1 | 2)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                      activeSwapIdx === idx
                        ? "bg-white text-emerald-950 shadow-xs"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    {sw.original.split(" ")[0]}
                  </button>
                ))}
              </div>

              {/* Swap Demonstration Box */}
              <div className="rounded-2xl bg-black/40 p-4 space-y-3 text-xs shadow-md">
                <div className="flex items-center justify-between text-[11px] text-emerald-200 border-b border-emerald-500/30 pb-2">
                  <span>Target: <strong className="text-white">{SWAP_DATA[activeSwapIdx].muscle}</strong></span>
                  <span className="text-rose-300 font-semibold">{SWAP_DATA[activeSwapIdx].status}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="line-through text-neutral-400 font-medium truncate">
                    {SWAP_DATA[activeSwapIdx].original}
                  </div>
                  <ArrowRight className="h-4 w-4 text-emerald-300 shrink-0" />
                  <div className="font-bold text-white text-sm truncate text-emerald-200">
                    {SWAP_DATA[activeSwapIdx].substitute}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                    <span>{SWAP_DATA[activeSwapIdx].benefit}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    {SWAP_DATA[activeSwapIdx].gear}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-400/30 dark:border-emerald-800/60 text-xs text-emerald-200 flex items-center justify-between">
            <span>Keeps workout volume & tempo</span>
            <span className="font-bold text-white">1-tap swap anytime</span>
          </div>
        </motion.div>

        {/* CARD 3: "Need a workout plan that fits your schedule?" — Solid Violet (5 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 group rounded-3xl bg-violet-600 dark:bg-violet-950 p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-violet-400/30 dark:border-violet-800/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-200" />
                <span className="text-xs font-bold tracking-wider uppercase text-violet-100">
                  Way 03 • Routine Architect
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Weekly Splits
              </span>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
              Need a workout plan that fits your actual schedule?
            </h3>
            <p className="mt-2.5 text-xs sm:text-sm text-violet-100 leading-relaxed">
              Pick how many days a week you want to train. SpotMe builds a balanced routine with exercise orders, warmups, and built-in rest timers.
            </p>

            {/* Interactive Split Selector */}
            <div className="mt-5 space-y-3">
              <div className="flex gap-2 text-xs">
                {(["3-day", "4-day", "5-day"] as const).map((split) => (
                  <button
                    key={split}
                    type="button"
                    onClick={() => setActiveDays(split)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                      activeDays === split
                        ? "bg-white text-violet-950 shadow-xs"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    {split === "3-day" ? "3-Day Full Body" : split === "4-day" ? "4-Day Upper/Lower" : "5-Day Push/Pull"}
                  </button>
                ))}
              </div>

              {/* Day Breakdown Preview */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                  <span className="font-bold text-white">Day 1 — Upper Power</span>
                  <span className="text-violet-200 text-[11px]">Chest, Back, Delts</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                  <span className="font-bold text-white">Day 2 — Lower Quad Focus</span>
                  <span className="text-violet-200 text-[11px]">Quads, Calves, Core</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 opacity-80">
                  <span className="font-bold text-white">Day 3 — Active Rest</span>
                  <span className="text-violet-300 text-[11px]">Mobility & Walk</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2">
                  <span className="font-bold text-white">Day 4 — Upper Hypertrophy</span>
                  <span className="text-violet-200 text-[11px]">Arms, Traps, Chest</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-violet-400/30 dark:border-violet-800/60 text-xs text-violet-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              <span>Auto rest countdown between sets</span>
            </div>
            <span className="font-bold text-white">1,300+ exercises</span>
          </div>
        </motion.div>

        {/* CARD 4: "Want to see if your effort is changing your physique?" — Solid Cyan (7 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 group rounded-3xl bg-cyan-700 dark:bg-cyan-950 p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-2xl"
        >
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/30 dark:border-cyan-800/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-200" />
                <span className="text-xs font-bold tracking-wider uppercase text-cyan-100">
                  Way 04 • Private Progress Vault
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 text-white">
                Symmetry & Posture
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    Want to know if your hard work is showing in the mirror?
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-cyan-100 leading-relaxed">
                    Store check-in photos in one encrypted vault. Compare weeks side by side to see muscle definition, shoulder width, and posture improvements over months.
                  </p>
                </div>

                {/* Angle Controls */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveAngle("front")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeAngle === "front"
                          ? "bg-white text-cyan-950 shadow-xs"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      Front Symmetry
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAngle("back")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeAngle === "back"
                          ? "bg-white text-cyan-950 shadow-xs"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      Back & Lats
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAngle("posture")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeAngle === "posture"
                          ? "bg-white text-cyan-950 shadow-xs"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      Side Posture
                    </button>
                  </div>

                  {/* Symmetry Metrics Breakdown */}
                  <div className="rounded-2xl bg-black/30 backdrop-blur-xs p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-cyan-200">
                      <span>Shoulder & Torso Symmetry</span>
                      <span className="font-bold text-white">84% Balanced</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-2">
                      <div className="bg-cyan-300 h-2 rounded-full w-[84%]" />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-cyan-100 pt-1">
                      <span>Month 2 Check-in</span>
                      <span className="text-emerald-300 font-bold">+6% Balanced Width</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Image with Privacy Lock Tag */}
              <div className="md:col-span-6">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40 shadow-lg">
                  <Image
                    src={srcMap?.["smart-physique-scan"] || SITE_IMAGE_FALLBACKS["smart-physique-scan"]}
                    alt="Track your body progress with SpotMe"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                

                  <div className="absolute inset-x-3 bottom-3 rounded-xl bg-neutral-950/85 backdrop-blur-md p-2.5 shadow-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-neutral-400 text-[10px] block font-medium">Progress Vault</span>
                      <span className="font-bold text-white">Week 8 vs Week 1</span>
                    </div>
                    <span className="text-[11px] font-bold bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded-md">
                      Side-by-Side
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-cyan-500/30 dark:border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between">
            <span>Stored on device only</span>
            <span className="font-bold text-white">Never shared with anyone</span>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
