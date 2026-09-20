"use client"

import { useTheme } from "@/hooks/use-theme"
import { Sun, Moon } from "lucide-react"

interface ThemeToggleProps {
  className?: string
  size?: "sm" | "md"
}

export function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme()

  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9"
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-full border border-neutral-200/80 bg-white/80 text-neutral-700 shadow-sm transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white ${buttonSize} ${className}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Icon with smooth rotation transition */}
      <span className="relative flex items-center justify-center">
        {mounted && isDark ? (
          <Sun className={`${iconSize} text-amber-400 transition-transform duration-300 rotate-0`} />
        ) : (
          <Moon className={`${iconSize} text-neutral-600 dark:text-neutral-300 transition-transform duration-300 -rotate-12`} />
        )}
      </span>
    </button>
  )
}
