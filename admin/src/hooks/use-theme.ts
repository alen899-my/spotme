"use client"

import { useState, useEffect, useCallback } from "react"

export type Theme = "light" | "dark"

const THEME_CHANGE_EVENT = "spotme-theme-change"

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [])

  useEffect(() => {
    // Determine initial theme
    const stored = localStorage.getItem("theme") as Theme | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme: Theme = stored ? stored : prefersDark ? "dark" : "light"

    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)

    // Sync across components / tabs
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>
      if (customEvent.detail) {
        setThemeState(customEvent.detail)
        applyTheme(customEvent.detail)
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeState(e.newValue)
        applyTheme(e.newValue)
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [applyTheme])

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      applyTheme(newTheme)
      localStorage.setItem("theme", newTheme)
      window.dispatchEvent(
        new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: newTheme })
      )
    },
    [applyTheme]
  )

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }, [theme, setTheme])

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
    mounted,
  }
}
