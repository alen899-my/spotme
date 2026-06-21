"use client"

import { useState, useEffect } from "react"
import { Search, Menu, Sun, Moon } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export function AdminHeader({ onMenuClick, title }: HeaderProps) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = !stored
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : stored === "dark"
    setDark(prefersDark)
    document.documentElement.classList.toggle("dark", prefersDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="h-8 w-full rounded-md border bg-secondary pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline-block">
          CmdK
        </kbd>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
          A
        </div>
      </div>
    </header>
  )
}
