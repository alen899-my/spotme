"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormSelectProps {
  label: string
  items: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function FormSelect({
  label,
  items,
  value,
  onChange,
  placeholder,
}: FormSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = items.filter((i) =>
    i.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-8 w-full items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
          value
            ? "border-ring bg-ring/10 text-foreground"
            : "border-input bg-secondary text-muted-foreground hover:border-ring/50"
        )}
      >
        <span className="flex-1 truncate text-left">
          {value || placeholder || label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-56 rounded-lg border bg-card p-1.5 shadow-lg">
          <div className="relative mb-1">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full rounded-md border bg-secondary pl-2.5 pr-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setSearch("") }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-secondary",
                !value && "bg-secondary font-medium"
              )}
            >
              {!value && <Check className="h-3 w-3 shrink-0" />}
              <span className={cn(!value && "flex-1", value && "ml-5 flex-1")}>None</span>
            </button>
            {filtered.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { onChange(item); setOpen(false); setSearch("") }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs capitalize transition-colors hover:bg-secondary",
                  value === item && "bg-secondary font-medium"
                )}
              >
                {value === item && <Check className="h-3 w-3 shrink-0" />}
                <span className={cn(value === item ? "flex-1" : "ml-5 flex-1")}>{item}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
