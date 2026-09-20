"use client"

import Image from "next/image"
import { scroller } from "react-scroll"
import { ArrowUp, Dumbbell } from "lucide-react"

const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Platforms", href: "#platforms" },
  { label: "Features", href: "#features" },
  { label: "Community", href: "#community" },
  { label: "Smart Tools", href: "#smart-tools" },
  { label: "Contact", href: "#contact" },
]

export function AppFooter() {
  const scrollToSection = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const target = href.replace("#", "")
      scroller.scrollTo(target, {
        duration: 750,
        delay: 0,
        smooth: "easeInOutCubic",
        offset: -80,
      })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="relative isolate w-full overflow-hidden border-t border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white transition-colors duration-300">
      {/* Background Image Layer — Clearly Visible in Both Light & Dark Modes (z-0, no -z-10) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/images/footer-bg.png"
          alt="SpotMe Fitness Background"
          fill
          className="object-cover object-center opacity-45 dark:opacity-55 transition-opacity duration-300"
          sizes="100vw"
          priority={false}
        />
        {/* Dual-Theme Atmospheric Tint */}
        <div className="absolute inset-0 bg-white/70 dark:bg-neutral-950/80 backdrop-blur-[0.5px] transition-colors duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-white/80 dark:from-black dark:via-black/60 dark:to-neutral-950/85 transition-colors duration-300" />
      </div>

      {/* Main Minimal Content Layer — Elevated at z-10 for Perfect Readability */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-neutral-300/80 dark:border-neutral-800/80">
          
          {/* Brand & 1-line Mission */}
          <div className="max-w-md">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7CB16] text-neutral-950 shadow-md">
                <Dumbbell className="h-4 w-4" />
              </div>
              <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                Spot<span className="text-[#F7CB16]">Me</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal">
              A healthier, stronger you. Track workouts, log meals from photos, and build consistency—100% free.
            </p>
          </div>

          {/* Minimal Quick Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className="hover:text-amber-600 dark:hover:text-[#F7CB16] transition-colors cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Minimal Copyright & Back to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-neutral-600 dark:text-neutral-400">
          <p>
            © {new Date().getFullYear()} SpotMe. Open Source & Free for all lifters.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer group font-medium"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  )
}
