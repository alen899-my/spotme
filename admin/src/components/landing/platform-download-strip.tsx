"use client"

import { motion } from "framer-motion"

const LATEST_APK_URL = "https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/builds/1789875707389_g09z6.apk"
const WEB_APP_URL = "https://spotme-gym.vercel.app"

export function PlatformDownloadStrip() {
  return (
    <section id="platforms" className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 scroll-mt-24">
      {/* Single Connected Card with Smooth Scroll Reveal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-neutral-950 dark:bg-black text-white border border-neutral-800 overflow-hidden shadow-xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          
          {/* Side 1: Android App */}
          <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/40 transition-colors duration-200">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Android App</h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Native build for your phone</p>
            </div>

            <a
              href={LATEST_APK_URL}
              download="spotme-v2.apk"
              className="inline-flex items-center justify-center rounded-full bg-[#F7CB16] hover:bg-[#E5BC14] text-neutral-950 font-bold text-xs sm:text-sm px-6 py-2.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm shrink-0 w-full sm:w-auto"
            >
              Download APK
            </a>
          </div>

          {/* Side 2: Web Companion */}
          <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-900/40 transition-colors duration-200">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Web Companion</h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Access in any browser</p>
            </div>

            <a
              href={WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-2.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm shrink-0 w-full sm:w-auto"
            >
              Open Web App
            </a>
          </div>

        </div>
      </motion.div>
    </section>
  )
}
