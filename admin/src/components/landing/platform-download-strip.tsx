"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Download, ArrowRight } from "lucide-react"
import { FALLBACK_APK_URL } from "@/lib/builds"

const WEB_APP_URL = "https://spotme-gym.vercel.app"

interface PlatformDownloadStripProps {
  apkUrl?: string
  apkVersion?: string
}

export function PlatformDownloadStrip({ apkUrl: initialApkUrl, apkVersion: initialApkVersion }: PlatformDownloadStripProps) {
  const [downloadUrl, setDownloadUrl] = useState<string>(initialApkUrl || FALLBACK_APK_URL)
  const [version, setVersion] = useState<string | undefined>(initialApkVersion)

  useEffect(() => {
    if (initialApkUrl) {
      setDownloadUrl(initialApkUrl)
    }
    if (initialApkVersion) {
      setVersion(initialApkVersion)
    }

    // Refresh client-side to ensure always up-to-date with admin uploads
    let isMounted = true
    fetch("/api/updates/latest?channel=production")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.build) return
        if (data.build.file_url) {
          setDownloadUrl(data.build.file_url)
        }
        if (data.build.version) {
          setVersion(data.build.version)
        }
      })
      .catch((err) => {
        console.warn("Client updates check fallback:", err)
      })

    return () => {
      isMounted = false
    }
  }, [initialApkUrl, initialApkVersion])

  const downloadFilename = version ? `spotme-v${version}.apk` : "spotme-latest.apk"

  return (
    <section id="platforms" className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 scroll-mt-24">
      {/* Connected Dual-Platform Card with Olympic Plate Spinners */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl bg-neutral-950 dark:bg-black text-white border border-neutral-800/90 overflow-hidden shadow-2xl backdrop-blur-xl"
      >
        {/* Ambient Corner Atmosphere */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-52 w-52 rounded-full bg-[#F7CB16]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-52 w-52 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800/90">
          
          {/* ── Side 1: Android Native App with Yellow Olympic Plate Spinner ── */}
          <div className="group p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-neutral-900/35 transition-colors duration-200">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Interactive Olympic Yellow Bumper Plate Spinner */}
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex items-center justify-center select-none">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, ease: "linear", repeat: Infinity }}
                  whileHover={{ rotate: 720, transition: { duration: 1.2, ease: "easeOut" } }}
                  className="relative h-full w-full rounded-full drop-shadow-[0_4px_14px_rgba(247,203,22,0.25)] cursor-pointer"
                >
                  <Image
                    src="/images/plate.png"
                    alt="Olympic Yellow Plate Spinner"
                    fill
                    sizes="64px"
                    className="object-contain pointer-events-none"
                  />
                </motion.div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Android App</h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    APK {version ? `v${version}` : ""}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Native build for your phone</p>
              </div>
            </div>

            <a
              href={downloadUrl}
              download={downloadFilename}
              className="group/btn inline-flex items-center justify-center gap-2 rounded-full bg-[#F7CB16] hover:bg-[#E5BC14] text-neutral-950 font-bold text-xs sm:text-sm px-6 py-3 transition-all duration-200 active:scale-95 cursor-pointer shadow-md shrink-0 w-full sm:w-auto"
            >
              <span>Download APK</span>
              <Download className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-y-0.5" />
            </a>
          </div>

          {/* ── Side 2: Web Companion with Cast-Iron Olympic Plate Spinner ── */}
          <div className="group p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-neutral-900/35 transition-colors duration-200">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Interactive Olympic Matte Black Plate Spinner */}
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex items-center justify-center select-none">
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 24, ease: "linear", repeat: Infinity }}
                  whileHover={{ rotate: -720, transition: { duration: 1.2, ease: "easeOut" } }}
                  className="relative h-full w-full rounded-full drop-shadow-[0_4px_14px_rgba(255,255,255,0.12)] cursor-pointer"
                >
                  <Image
                    src="/images/plate.png"
                    alt="Olympic Black Plate Spinner"
                    fill
                    sizes="64px"
                    className="object-contain grayscale brightness-50 contrast-125 pointer-events-none"
                  />
                </motion.div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Web Companion</h3>
                  <span className="inline-flex items-center rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                    Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">Access in any browser</p>
              </div>
            </div>

            <a
              href={WEB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-3 transition-all duration-200 active:scale-95 cursor-pointer shadow-md shrink-0 w-full sm:w-auto"
            >
              <span>Open Web App</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </a>
          </div>

        </div>
      </motion.div>
    </section>
  )
}
