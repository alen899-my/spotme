"use client"

import { useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const LATEST_APK_URL = "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/builds/1789875707389_g09z6.apk"
const WEB_APP_URL = "https://spotme-gym.vercel.app"

export function FloatingDownloadBar() {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <aside
      aria-label="Quick download and access bar"
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-none"
    >
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex flex-col items-center gap-2.5 rounded-full bg-neutral-950/90 dark:bg-black/92 p-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl border border-neutral-800/90"
          >
            {/* ── Olympic Plate 1: Yellow Bumper Plate (Android APK) ── */}
            <motion.a
              href={LATEST_APK_URL}
              download="spotme-v2.apk"
              title="Download Android APK"
              whileHover="hover"
              whileTap={{ scale: 0.92 }}
              className="group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F7CB16]/60 select-none"
            >
              {/* Outer Rotating Olympic Plate */}
              <motion.div
                variants={{
                  hover: { rotate: 180, scale: 1.05 },
                }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="absolute inset-0 rounded-full overflow-hidden drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              >
                <Image
                  src="/images/plate.png"
                  alt="Olympic Plate APK"
                  fill
                  sizes="56px"
                  className="object-contain pointer-events-none"
                />
              </motion.div>

              {/* Machined Precision Hub (Stationary Center Cap) */}
              <div className="relative z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-neutral-950/92 border border-neutral-600/80 shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]">
                <span className="text-[10px] sm:text-[11px] font-black leading-none text-[#F7CB16] tracking-tight">
                  APK
                </span>
              </div>
            </motion.a>

            {/* ── Olympic Plate 2: Matte Black Rubber Bumper Plate (Web Companion) ── */}
            <motion.a
              href={WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Web App"
              whileHover="hover"
              whileTap={{ scale: 0.92 }}
              className="group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 select-none"
            >
              {/* Outer Rotating Olympic Plate (Matte Iron / Black Bumper Spec) */}
              <motion.div
                variants={{
                  hover: { rotate: 180, scale: 1.05 },
                }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="absolute inset-0 rounded-full overflow-hidden drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              >
                <Image
                  src="/images/plate.png"
                  alt="Olympic Plate Web"
                  fill
                  sizes="56px"
                  className="object-contain grayscale brightness-50 contrast-125 pointer-events-none"
                />
              </motion.div>

              {/* Machined Precision Hub (Stationary Center Cap) */}
              <div className="relative z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-neutral-950/92 border border-neutral-600/80 shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]">
                <span className="text-[10px] sm:text-[11px] font-black leading-none text-white tracking-tight">
                  WEB
                </span>
              </div>
            </motion.a>

            {/* Subtle Dismiss Close Button */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 hover:text-white transition-colors cursor-pointer focus:outline-none"
              aria-label="Dismiss quick access bar"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}

