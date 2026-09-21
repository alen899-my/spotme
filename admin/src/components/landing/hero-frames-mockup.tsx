"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

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
  "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/site-images"

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
    delay: 0.38,
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
    delay: 0.18,
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
    delay: 0.05,
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
    delay: 0.26,
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
    delay: 0.46,
  },
]

const FRAME_DEFAULTS = [
  `${R2_SEED_BASE}/seed-hero-frame-1.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-2.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-3.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-4.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-5.webp`,
]

export function HeroFramesMockup({ srcMap }: { srcMap?: Record<string, string> }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [isFanned, setIsFanned] = useState(false)

  const frames = FRAMES.map((f, i) => ({
    ...f,
    src: srcMap?.[`hero-frame-${f.id}`] || FRAME_DEFAULTS[i] || f.src,
  }))

  // Blossom into the fanned-out stacked formation on mount or scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFanned(true)
    }, 120)

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsFanned(true)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-7xl overflow-x-clip pt-2 sm:pt-6 pb-2 h-[340px] min-[360px]:h-[370px] min-[420px]:h-[420px] min-[520px]:h-[500px] sm:h-[580px] md:h-[660px] lg:h-[730px] flex items-start justify-center">
      {/* Soft Ambient Radial Backdrop Glow */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 h-72 w-full max-w-4xl -translate-x-1/2 rounded-full opacity-60 blur-3xl transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(247,203,22,0.18) 0%, rgba(37,150,190,0.12) 45%, transparent 75%)",
          opacity: isFanned ? 0.7 : 0.4,
        }}
      />

      {/* ── Unified Responsive Stack & Fan-Out Showcase (Mobile & Desktop) ── */}
      <div className="flex items-center justify-center scale-[0.44] min-[360px]:scale-[0.50] min-[420px]:scale-[0.58] min-[520px]:scale-[0.70] sm:scale-[0.80] md:scale-[0.92] lg:scale-100 origin-top transition-transform duration-300">
        <div className="relative h-[660px] lg:h-[700px] w-[310px] md:w-[330px] lg:w-[350px]">
          {frames.map((frame) => {
            const isHovered = hoveredId === frame.id
            const isActive = activeId === frame.id
            const isElevated = isHovered || isActive

            // Organic tilt when resting stacked in center
            const stackedRotate = (frame.id - 3) * 2.2

            return (
              <motion.div
                key={frame.id}
                className="absolute inset-0 cursor-pointer will-change-transform select-none"
                style={{
                  zIndex: isElevated ? 50 : frame.zIndex,
                }}
                initial={{
                  x: "0%",
                  y: 0,
                  rotate: stackedRotate,
                  scale: 0.96,
                  opacity: 0.8,
                }}
                animate={{
                  x: isFanned ? (isActive ? "0%" : frame.targetX) : "0%",
                  y: isFanned
                    ? (isElevated ? frame.targetY - 14 : frame.targetY)
                    : (isElevated ? -10 : 0),
                  rotate: isFanned
                    ? (isElevated ? 0 : frame.targetRotate)
                    : (isElevated ? 0 : stackedRotate),
                  scale: isFanned
                    ? (isElevated ? frame.targetScale * 1.06 : frame.targetScale)
                    : (isElevated ? 1.02 : 0.96),
                  opacity: 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 64,
                  damping: 16,
                  mass: 0.85,
                  delay: isFanned ? frame.delay : 0,
                }}
                onMouseEnter={() => setHoveredId(frame.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setActiveId(activeId === frame.id ? null : frame.id)}
              >
                <div
                  className={`relative h-full w-full transition-all duration-300 ${
                    isElevated
                      ? "drop-shadow-[0_28px_45px_rgba(0,0,0,0.25)]"
                      : isFanned
                      ? "drop-shadow-[0_16px_30px_rgba(0,0,0,0.14)]"
                      : "drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    width={1024}
                    height={1536}
                    priority={frame.id === 3}
                    className="h-full w-full object-contain pointer-events-none"
                    sizes="(max-width: 640px) 260px, (max-width: 1024px) 320px, 350px"
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

