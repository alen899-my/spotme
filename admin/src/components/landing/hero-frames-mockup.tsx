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

const FRAMES: FrameConfig[] = [
  {
    id: 1,
    src: "/images/frame1.png",
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
    src: "/images/frame2.png",
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
    src: "/images/frame3.png",
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
    src: "/images/frame4.png",
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
    src: "/images/frame5.png",
    alt: "SpotMe Community Leaderboard & XP Ranks",
    targetX: "135%",
    targetY: 34,
    targetRotate: 7.5,
    targetScale: 0.86,
    zIndex: 10,
    delay: 0.62, // Alternating Right (Step 4)
  },
]

const R2_SEED_BASE =
  "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/site-images";

const FRAME_DEFAULTS = [
  `${R2_SEED_BASE}/seed-hero-frame-1.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-2.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-3.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-4.webp`,
  `${R2_SEED_BASE}/seed-hero-frame-5.webp`,
];

export function HeroFramesMockup({ srcMap }: { srcMap?: Record<string, string> }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [isFanned, setIsFanned] = useState(false)
  const frames = FRAMES.map((f, i) => ({
    ...f,
    src: srcMap?.[`hero-frame-${f.id}`] || FRAME_DEFAULTS[i] || f.src,
  }));

  // Only fan out on scroll, stay stacked in center on initial page load
  useEffect(() => {
    const handleScroll = () => {
      // Fan out when user initiates scroll (> 30px), collapse back when at top
      setIsFanned(window.scrollY > 30)
    }

    // Check current scroll position in case of page refresh while scrolled
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

      {/* Responsive Scaling Wrapper */}
      <div className="flex items-center justify-center scale-[0.62] xs:scale-[0.70] sm:scale-[0.82] md:scale-[0.92] lg:scale-100 origin-top transition-transform duration-300">
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
