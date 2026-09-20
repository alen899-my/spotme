"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"

interface FrameConfig {
  id: number
  src: string
  alt: string
  targetX: string
  targetY: number
  targetRotate: number
  targetScale: number
  zIndex: number
  delay: number
}

const R2_SEED_BASE =
  "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/site-images";

const FRAMES: FrameConfig[] = [
  {
    id: 1,
    src: `${R2_SEED_BASE}/seed-hero-frame-1.webp`,
    alt: "SpotMe Body Status & Muscle Highlighter",
    targetX: "-135%",
    targetY: 34,
    targetRotate: -7.5,
    targetScale: 0.86,
    zIndex: 10,
    delay: 0.48, // Alternating Left (Step 3)
  },
  {
    id: 2,
    src: `${R2_SEED_BASE}/seed-hero-frame-2.webp`,
    alt: "SpotMe Explore Tools & Workouts",
    targetX: "-68%",
    targetY: 16,
    targetRotate: -4,
    targetScale: 0.93,
    zIndex: 20,
    delay: 0.22, // Alternating Left (Step 1)
  },
  {
    id: 3,
    src: `${R2_SEED_BASE}/seed-hero-frame-3.webp`,
    alt: "SpotMe Main Dashboard & Daily Tracking",
    targetX: "0%",
    targetY: 0,
    targetRotate: 0,
    targetScale: 1.04,
    zIndex: 30,
    delay: 0.08, // Center Anchor (Step 0)
  },
  {
    id: 4,
    src: `${R2_SEED_BASE}/seed-hero-frame-4.webp`,
    alt: "SpotMe Meals & Macro Tracking",
    targetX: "68%",
    targetY: 16,
    targetRotate: 4,
    targetScale: 0.93,
    zIndex: 20,
    delay: 0.35, // Alternating Right (Step 2)
  },
  {
    id: 5,
    src: `${R2_SEED_BASE}/seed-hero-frame-5.webp`,
    alt: "SpotMe Community Leaderboard & XP Ranks",
    targetX: "135%",
    targetY: 34,
    targetRotate: 7.5,
    targetScale: 0.86,
    zIndex: 10,
    delay: 0.62, // Alternating Right (Step 4)
  },
]

const FRAME_DEFAULTS = [
  `${R2_SEED_BASE}/seed-hero-frame-1.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-2.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-3.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-4.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-5.webp`,
];

const AUTOPLAY_MS = 3200
const RESUME_MS = 5000

export function HeroFramesMockup({ srcMap }: { srcMap?: Record<string, string> }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [isFanned, setIsFanned] = useState(false)
  const hasOpened = useRef(false)
  const frames = FRAMES.map((f, i) => ({
    ...f,
    src: srcMap?.[`hero-frame-${f.id}`] || FRAME_DEFAULTS[i] || f.src,
  }));

  // Desktop fan-out: one-way latch — plays ONCE on first scroll past 30px,
  // never collapses or replays when scrolling back up/down.
  useEffect(() => {
    const handleScroll = () => {
      if (!hasOpened.current && window.scrollY > 30) {
        hasOpened.current = true
        setIsFanned(true)
      }
    }

    // Check current scroll position in case of page refresh while scrolled
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // ── Mobile carousel state ──────────────────────────────────────────────
  const [index, setIndex] = useState(2) // start on dashboard frame (LCP visual)
  const [autoplayPaused, setAutoplayPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()

  const go = useCallback(
    (dir: number) => {
      setIndex((prev) => (prev + dir + frames.length) % frames.length)
    },
    [frames.length]
  )

  const pauseAutoplay = useCallback(() => {
    setAutoplayPaused(true)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setAutoplayPaused(false), RESUME_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  // Autoplay loop (mobile carousel only). Skipped for reduced-motion users.
  useEffect(() => {
    if (autoplayPaused || reduceMotion) return
    const id = setInterval(() => {
      if (document.hidden) return
      setIndex((prev) => (prev + 1) % frames.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [autoplayPaused, reduceMotion, frames.length])

  return (
    <div className="relative mx-auto w-full max-w-7xl px-2 sm:px-4 overflow-x-clip py-4 sm:py-8">
      {/* Soft Ambient Radial Backdrop Glow */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 h-80 w-full max-w-5xl -translate-x-1/2 rounded-full opacity-65 blur-3xl transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(247,203,22,0.18) 0%, rgba(37,150,190,0.14) 45%, transparent 75%)",
          opacity: isFanned ? 0.75 : 0.45,
        }}
      />

      {/* ── Mobile: full-size swipeable looping carousel (below md) ── */}
      <div
        className="md:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="SpotMe app screenshots"
      >
        <div className="overflow-hidden">
          <motion.div
            className="flex"
            initial={false}
            // Each slide is w-full (= track's own width), so -100% = exactly one slide.
            animate={{ x: `-${index * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            dragMomentum={false}
            onDragStart={pauseAutoplay}
            onDragEnd={(_, info) => {
              const { offset, velocity } = info
              if (offset.x < -80 || velocity.x < -500) go(1)
              else if (offset.x > 80 || velocity.x > 500) go(-1)
            }}
          >
            {frames.map((frame, i) => (
              <div
                key={frame.id}
                className="w-full min-w-full shrink-0"
                aria-hidden={i !== index}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${frames.length}: ${frame.alt}`}
              >
                {/* Scales with screen width AND caps to viewport height
                    so the full frame is always visible on small phones. */}
                <div className="mx-auto aspect-[2/3] w-[72vw] max-w-[300px] max-h-[58svh]">
                  <div className="relative h-full w-full drop-shadow-[0_20px_36px_rgba(0,0,0,0.18)]">
                    <Image
                      src={frame.src}
                      alt={frame.alt}
                      width={1024}
                      height={1536}
                      priority={i === index}
                      draggable={false}
                      className="h-full w-full object-contain select-none"
                      sizes="72vw"
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {frames.map((frame, i) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => {
                pauseAutoplay()
                setIndex(i)
              }}
              aria-label={`Go to slide ${i + 1}: ${frame.alt}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6" : "w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400"
              }`}
              style={i === index ? { background: "#F7CB16" } : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── Desktop: fan-out stack (md and up, unchanged behavior) ── */}
      <div className="hidden md:flex items-center justify-center scale-[0.82] md:scale-[0.92] lg:scale-100 origin-top transition-transform duration-300">
        <div className="relative h-[560px] sm:h-[620px] md:h-[660px] lg:h-[700px] w-[260px] sm:w-[300px] md:w-[330px] lg:w-[350px]">
          {frames.map((frame) => {
            const isHovered = hoveredId === frame.id

            // Subtle organic tilt when stacked in center
            const stackedRotate = (frame.id - 3) * 2.2

            return (
              <motion.div
                key={frame.id}
                className="absolute inset-0 cursor-pointer will-change-transform"
                style={{
                  zIndex: isHovered ? 50 : frame.zIndex,
                }}
                initial={false}
                animate={{
                  // When scrolled down: fan out to targetX. When at top: stay stacked at 0%
                  x: isFanned ? frame.targetX : "0%",
                  y: isFanned
                    ? (isHovered ? frame.targetY - 14 : frame.targetY)
                    : (isHovered ? -10 : 0),
                  rotate: isFanned
                    ? (isHovered ? 0 : frame.targetRotate)
                    : (isHovered ? 0 : stackedRotate),
                  scale: isFanned
                    ? (isHovered ? frame.targetScale * 1.05 : frame.targetScale)
                    : (isHovered ? 1.02 : 0.96),
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 64,
                  damping: 16,
                  mass: 0.85,
                  delay: isFanned ? frame.delay : (5 - frame.id) * 0.04,
                }}
                onMouseEnter={() => setHoveredId(frame.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className={`relative h-full w-full transition-all duration-300 ${
                    isHovered
                      ? "drop-shadow-[0_28px_45px_rgba(0,0,0,0.22)]"
                      : isFanned
                      ? "drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
                      : "drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    width={1024}
                    height={1536}
                    priority={frame.id === 3}
                    className="h-full w-full object-contain select-none"
                    sizes="(max-width: 640px) 240px, (max-width: 1024px) 320px, 350px"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
