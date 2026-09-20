"use client"

import { useState } from "react"
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
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex flex-col items-center gap-2 rounded-full bg-neutral-950/95 dark:bg-black/95 text-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl border border-neutral-800"
          >
            {/* Direct APK Download Button - Circular */}
            <a
              href={LATEST_APK_URL}
              download="spotme-v2.apk"
              className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#F7CB16] hover:bg-[#E5BC14] text-neutral-950 font-black text-xs tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Download Android APK"
            >
              APK
            </a>

            {/* Web Companion Link Button - Circular */}
            <a
              href={WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 font-bold text-xs tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Open Web App"
            >
              Web
            </a>

            {/* Subtle Dismiss Close Button */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
