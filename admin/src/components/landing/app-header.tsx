"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Menu, X, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { scroller } from "react-scroll"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_LINKS = [
  { label: "Product", href: "#product", count: "01", desc: "Core mobile & web ecosystem" },
  { label: "Platforms", href: "#platforms", count: "02", desc: "Android APK & Web companion" },
  { label: "Features", href: "#features", count: "03", desc: "Workouts & Macro Engine" },
  { label: "Community", href: "#community", count: "04", desc: "Leaderboards & social ranks" },
  { label: "Smart Tools", href: "#smart-tools", count: "05", desc: "Photo meals & quick swaps" },
  { label: "Contact", href: "#contact", count: "06", desc: "Meet the team & feedback" },
]

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 35)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Lock body scroll and listen for Escape key when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden"
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMenuOpen(false)
      }
      window.addEventListener("keydown", handleKeyDown)
      return () => {
        document.body.style.overflow = ""
        window.removeEventListener("keydown", handleKeyDown)
      }
    } else {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const target = href.replace("#", "")
      scroller.scrollTo(target, {
        duration: 750,
        delay: 0,
        smooth: "easeInOutCubic",
        offset: -90,
      })
    }
    setMenuOpen(false)
  }

  return (
    <>
      {/* Floating Centered Container */}
      <div className="fixed top-3 sm:top-5 inset-x-0 z-50 mx-auto flex justify-center pointer-events-none px-4">
        {/* Continuous Butter-Smooth Morphing Capsule */}
        <motion.header
          initial={false}
          animate={{
            maxWidth: scrolled ? 208 : 1024,
            boxShadow: scrolled
              ? "0 12px 30px -4px rgba(0,0,0,0.12), 0 6px 14px -4px rgba(0,0,0,0.06)"
              : "0 8px 24px -2px rgba(0,0,0,0.04), 0 4px 8px -2px rgba(0,0,0,0.02)",
          }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1], // Apple-grade ultra-smooth cubic-bezier
          }}
          style={{ width: "100%" }}
          className="pointer-events-auto relative flex items-center justify-between rounded-full border border-neutral-200/80 bg-white/80 backdrop-blur-2xl dark:border-neutral-800/80 dark:bg-neutral-950/85 px-4 py-2 sm:px-5 sm:py-2.5 overflow-hidden will-change-transform"
        >
          {/* Brand Logo (Always stays pinned smoothly on the left) */}
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, "#product")}
            className="group flex items-center gap-1 transition-transform active:scale-95 shrink-0"
          >
            <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              spot
            </span>
            <span
              className="text-xl font-black tracking-tight sm:text-2xl"
              style={{ color: "#F7CB16" }}
            >
              ME
            </span>
            
          </Link>

          {/* Desktop Navigation Links (Smoothly contracts width and fades out) */}
          <motion.nav
            animate={{
              opacity: scrolled ? 0 : 1,
              width: scrolled ? 0 : "auto",
              scale: scrolled ? 0.9 : 1,
            }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{ pointerEvents: scrolled ? "none" : "auto" }}
            className="hidden md:flex items-center gap-1 overflow-hidden whitespace-nowrap"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition-all duration-200 hover:bg-neutral-100/80 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800/80 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Full Desktop Actions (ThemeToggle, Login, Get Started) */}
            <motion.div
              animate={{
                opacity: scrolled ? 0 : 1,
                width: scrolled ? 0 : "auto",
                scale: scrolled ? 0.88 : 1,
              }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: scrolled ? "none" : "auto" }}
              className="hidden sm:flex items-center gap-2 overflow-hidden whitespace-nowrap"
            >
              <ThemeToggle size="sm" />

              <a
                href="https://spotme-gym.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-neutral-950 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:shadow-md active:scale-95 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </motion.div>

            {/* Mobile Controls when at the top */}
            <motion.div
              animate={{
                opacity: scrolled ? 0 : 1,
                width: scrolled ? 0 : "auto",
              }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: scrolled ? "none" : "auto" }}
              className="flex sm:hidden items-center gap-2 overflow-hidden whitespace-nowrap"
            >
              <ThemeToggle size="sm" />
              <a
                href="https://spotme-gym.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-white dark:text-neutral-950"
              >
                Get Started
              </a>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/80 bg-white/80 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4 shrink-0" />
              </button>
            </motion.div>

            {/* Scrolled Compact Hamburger Button (Smoothly glides into view) */}
            <motion.button
              type="button"
              onClick={() => setMenuOpen(true)}
              animate={{
                opacity: scrolled ? 1 : 0,
                width: scrolled ? 34 : 0,
                scale: scrolled ? 1 : 0.5,
              }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: scrolled ? "auto" : "none" }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-100/90 text-neutral-800 transition-colors hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 overflow-hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4 shrink-0" />
            </motion.button>
          </div>
        </motion.header>
      </div>

      {/* Smooth Full-Screen Side Navigation Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop Blur Fade In / Out */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Slide-In Full Panel */}
            <motion.div
              initial={{ x: "100%", opacity: 0.6 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={{ x: "100%", opacity: 0.4 }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 280,
                mass: 0.9,
              }}
              className="relative z-10 w-full sm:max-w-md md:max-w-lg h-full bg-white/95 dark:bg-neutral-950/95 border-l border-neutral-200/80 dark:border-neutral-800 shadow-2xl backdrop-blur-3xl flex flex-col justify-between p-6 sm:p-10 overflow-y-auto no-scrollbar scrollbar-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* Drawer Header */}
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-neutral-100 dark:border-neutral-900">
                  <Link
                    href="/"
                    onClick={(e) => handleNavClick(e, "#product")}
                    className="flex items-center gap-1 group"
                  >
                    <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                      spot
                    </span>
                    <span
                      className="text-2xl font-black tracking-tight"
                      style={{ color: "#F7CB16" }}
                    >
                      ME
                    </span>
                 
                  </Link>

                  <div className="flex items-center gap-3">
                    <ThemeToggle size="md" />

                    <motion.button
                      type="button"
                      whileHover={{ rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMenuOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-neutral-100/80 text-neutral-700 transition-colors hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Staggered Navigation Items with react-scroll */}
                <nav className="mt-8 flex flex-col space-y-2">
                  {NAV_LINKS.map((link, idx) => (
                    <motion.div
                      key={link.label}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{
                        delay: 0.06 * idx,
                        duration: 0.28,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <a
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href)}
                        className="cursor-pointer group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-900/80"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-semibold text-neutral-400 dark:text-neutral-600 group-hover:text-amber-500 transition-colors">
                              {link.count}
                            </span>
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:translate-x-1.5 transition-transform duration-200">
                              {link.label}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 pl-8 pt-0.5">
                            {link.desc}
                          </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-neutral-400 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      </a>
                    </motion.div>
                  ))}
                </nav>
              </div>

              {/* Drawer Bottom Actions & Footer */}
              <div className="pt-8 border-t border-neutral-100 dark:border-neutral-900 mt-8 space-y-3.5">
                <a
                  href="https://spotme-gym.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-neutral-950 dark:bg-white py-4 text-center text-base font-bold text-white dark:text-neutral-950 shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition active:scale-98"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 pt-2">
                  SpotMe &bull; A Healthier, Stronger You
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
