"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface SmartFeature {
  id: string
  step: string
  title: string
  desc: string
  image: string
  screenLabel: string
  cardBg: string
  titleColor: string
  descColor: string
  stepColor: string
  previewWrapper: string
  captionColor: string
}

const SMART_FEATURES: SmartFeature[] = [
  {
    id: "food-scan",
    step: "01",
    title: "Photo Meal Scanner",
    desc: "Point your camera at your plate. SpotMe identifies ingredients, estimates portion weights, and logs macros in 2 seconds.",
    image: "/images/foodscaning.png",
    screenLabel: "Food Scanner",
    cardBg: "bg-red-600 dark:bg-red-700 border-red-500 dark:border-red-600 hover:bg-red-700 dark:hover:bg-red-800 shadow-xl",
    titleColor: "text-white",
    descColor: "text-red-100",
    stepColor: "text-red-200",
    previewWrapper: "bg-black/25 border-white/20",
    captionColor: "text-white",
  },
  {
    id: "workout-split",
    step: "02",
    title: "Smart Routine Splits",
    desc: "Build balanced workout splits tailored to your weekly availability, muscle recovery rate, and available gym equipment.",
    image: "/images/split.png",
    screenLabel: "Weekly Splits",
    cardBg: "bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800 shadow-xl",
    titleColor: "text-white",
    descColor: "text-blue-100",
    stepColor: "text-blue-200",
    previewWrapper: "bg-black/25 border-white/20",
    captionColor: "text-white",
  },
  {
    id: "ai-chat",
    step: "03",
    title: "Instant Workout Advice",
    desc: "Gym equipment taken during peak hours? Ask your AI coach for immediate machine swaps, form advice, or meal tweaks.",
    image: "/images/chat.png",
    screenLabel: "AI Assistant",
    cardBg: "bg-[#F7CB16] dark:bg-[#F7CB16] border-amber-400 dark:border-amber-300 hover:bg-[#e5bc14] dark:hover:bg-[#e5bc14] shadow-xl",
    titleColor: "text-neutral-950",
    descColor: "text-neutral-800",
    stepColor: "text-neutral-900 font-bold",
    previewWrapper: "bg-black/10 border-black/15",
    captionColor: "text-neutral-900 font-bold",
  },
  {
    id: "physique-scan",
    step: "04",
    title: "Physique & Symmetry",
    desc: "Store encrypted check-in photos to track muscle definition, balance ratios, and posture improvements side-by-side.",
    image: "/images/pysicq.png",
    screenLabel: "Body Vault",
    cardBg: "bg-emerald-600 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-800 shadow-xl",
    titleColor: "text-white",
    descColor: "text-emerald-100",
    stepColor: "text-emerald-200",
    previewWrapper: "bg-black/25 border-white/20",
    captionColor: "text-white",
  },
]

export function SmartFeaturesSection({ srcMap }: { srcMap?: Record<string, string> }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeCardIdx, setActiveCardIdx] = useState(0)

  // Track active card index during mobile swipe
  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 300
    const newIdx = Math.round(el.scrollLeft / cardWidth)
    setActiveCardIdx(Math.max(0, Math.min(newIdx, SMART_FEATURES.length - 1)))
  }

  const scrollToCard = (index: number) => {
    const el = scrollContainerRef.current
    if (!el) return
    const targetChild = el.children[index] as HTMLElement | undefined
    if (targetChild) {
      targetChild.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      setActiveCardIdx(index)
    }
  }

  const scrollPrev = () => {
    scrollToCard(Math.max(0, activeCardIdx - 1))
  }

  const scrollNext = () => {
    scrollToCard(Math.min(SMART_FEATURES.length - 1, activeCardIdx + 1))
  }

  return (
    <section
      id="smart-tools"
      className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 border-t border-neutral-200/80 dark:border-neutral-800"
    >
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 sm:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.12]">
            Cool AI Features You Will Get Excited Daily.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
            From analyzing what you eat with a quick photo to finding open machines when the gym is packed—see how SpotMe handles everyday fitness challenges.
          </p>
        </motion.div>

        {/* Mobile / Tablet Swipe Navigation Controls */}
        <div className="flex lg:hidden items-center justify-between sm:justify-end gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            {SMART_FEATURES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToCard(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeCardIdx === idx
                    ? "w-5 bg-neutral-900 dark:bg-white"
                    : "w-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={activeCardIdx === 0}
              aria-label="Previous card"
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={activeCardIdx === SMART_FEATURES.length - 1}
              aria-label="Next card"
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-2xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 CARDS: 1 Row on Desktop, Swipeable on Mobile (Solid Olympic Plate Colors) ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto lg:overflow-visible pb-4 pt-1 px-4 -mx-4 sm:px-6 sm:-mx-6 lg:px-0 lg:mx-0 snap-x snap-mandatory no-scrollbar scroll-smooth"
      >
        {SMART_FEATURES.map((feature, idx) => {
          const displayImage = feature.image

          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative flex flex-col justify-between rounded-3xl p-5 transition-all duration-200 hover:-translate-y-1 select-none w-[84vw] max-w-[320px] sm:w-[320px] lg:w-auto shrink-0 snap-center lg:shrink border ${feature.cardBg}`}
            >
              {/* ── CARD TOP: Step + Title + Description ── */}
              <div className="relative z-10 flex flex-col mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-xs font-bold ${feature.stepColor}`}>
                    {feature.step}
                  </span>
                </div>

                <h3 className={`text-base sm:text-[18px] font-black tracking-tight leading-snug ${feature.titleColor}`}>
                  {feature.title}
                </h3>

                <p className={`mt-2 text-xs sm:text-[13px] leading-relaxed line-clamp-3 font-medium ${feature.descColor}`}>
                  {feature.desc}
                </p>
              </div>

              {/* ── CARD BOTTOM: Device Screen Showcase ── */}
              <div className="relative z-10 mt-auto pt-2">
                <div className={`rounded-2xl p-2 sm:p-2.5 transition-colors border shadow-inner ${feature.previewWrapper}`}>
                  <div className="relative aspect-[9/15] w-full rounded-xl overflow-hidden bg-white dark:bg-neutral-950 shadow-md">
                    <Image
                      src={displayImage}
                      alt={feature.title}
                      fill
                      className="object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 85vw, (max-width: 1024px) 320px, 25vw"
                      priority={idx < 2}
                    />
                  </div>

                  {/* Screen Caption */}
                  <div className={`flex items-center justify-between mt-2 px-1 text-[11px] font-mono ${feature.captionColor}`}>
                    <span className="font-bold">
                      {feature.screenLabel}
                    </span>
                    <span className="text-[10px] opacity-80">
                      SpotMe Screen
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
