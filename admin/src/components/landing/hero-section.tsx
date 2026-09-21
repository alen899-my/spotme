"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { HeroActions } from "./hero-actions"
import { HeroFramesMockup } from "./hero-frames-mockup"

export function HeroSection({ srcMap }: { srcMap?: Record<string, string> }) {
  const containerRef = useRef<HTMLElement>(null)

  // Smooth mouse-follow parallax for 3D plate depth
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 120 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6])
  const plateX = useTransform(smoothX, [-0.5, 0.5], [-14, 14])
  const plateY = useTransform(smoothY, [-0.5, 0.5], [-10, 10])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section
      id="product"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative isolate overflow-hidden bg-gradient-to-b from-white via-neutral-50/50 to-white pt-28 pb-16 transition-colors duration-300 dark:from-black dark:via-neutral-950 dark:to-black sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32"
    >
      {/* ── Olympic Barbell Plate Centerpiece with 3D Parallax & Continuous Roll ── */}
      <div
        className="pointer-events-none absolute left-1/2 top-[36%] z-0 flex -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center [perspective:1200px]"
        aria-hidden="true"
      >
        <motion.div
          style={{
            x: plateX,
            y: plateY,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative flex items-center justify-center"
        >
          {/* Majestic Olympic Barbell Plate (Rotating Smoothly) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 150, ease: "linear", repeat: Infinity }}
            className="relative h-[650px] w-[650px] opacity-85 transition-opacity duration-500 dark:opacity-90 sm:h-[880px] sm:w-[880px] lg:h-[1150px] lg:w-[1150px]"
          >
            <Image
              src="/images/plate.png"
              alt="SpotMe Olympic Barbell Plate Background"
              fill
              priority
              className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_30px_90px_rgba(0,0,0,0.85)]"
              sizes="(max-width: 768px) 650px, (max-width: 1200px) 880px, 1150px"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Seamless Frosted Glass Vignette Aura Behind Content (Pure diffusion, zero box borders) ── */}
      <div
        className="pointer-events-none absolute left-1/2 top-[34%] z-[5] h-[520px] w-[90%] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-white/60 blur-[45px] dark:bg-black/55 dark:blur-[65px] sm:h-[580px]"
        aria-hidden="true"
      />

      {/* ── Hero Foreground Content Layer ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center pt-2 sm:pt-4">
         
          {/* Main Hero Headline with High-Impact Typography */}
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)] dark:text-white dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] sm:text-6xl lg:text-7xl">
            A healthier,
            <br />
            <span className="font-black text-neutral-950 dark:text-neutral-100">stronger </span>
            <span className="font-black bg-gradient-to-r from-[#F7CB16] via-amber-400 to-[#E5B80B] bg-clip-text text-transparent drop-shadow-none">
              you.
            </span>
          </h1>

          {/* Subtitle with Premium Font Weight and Contrast */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-700 font-medium dark:text-neutral-300 sm:text-lg md:text-xl drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)] dark:drop-shadow-none">
            SpotMe is your complete fitness companion. Track workouts, log
            meals, monitor body metrics, and build consistency — all in one place.
          </p>

          {/* CTA Action Buttons and Trust Checks */}
          <div className="mt-8 sm:mt-10">
            <HeroActions />
          </div>

       
        </div>

        {/* 5-Frame Stacking and Alternating Fan-Out Showcase */}
        <div className="relative mt-14 sm:mt-20 lg:mt-24">
          <HeroFramesMockup srcMap={srcMap} />
        </div>
      </div>
    </section>
  )
}
