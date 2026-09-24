"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Users,
  Calendar,
  RefreshCw,
  Search,
  Check,
  X,
  Globe,
  Share2,
  ChevronDown,
  Sparkles,
  Flame,
  Clock,
} from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { AnalyticsRange, AthleteSummary, SelectedUserMeta } from "./types"

interface AnalyticsFilterBarProps {
  athletes: AthleteSummary[]
  selectedUserId: number | null
  selectedUserMeta: SelectedUserMeta | null
  range: AnalyticsRange
  timezone?: string
  onSelectUser: (userId: number | null) => void
  onChangeRange: (range: AnalyticsRange) => void
  onRefresh: () => void
  isLoading: boolean
  lastUpdated?: string
}

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "ALL TIME" },
]

export function AnalyticsFilterBar({
  athletes,
  selectedUserId,
  selectedUserMeta,
  range,
  timezone,
  onSelectUser,
  onChangeRange,
  onRefresh,
  isLoading,
  lastUpdated,
}: AnalyticsFilterBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredAthletes = athletes.filter((a) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (a.full_name && a.full_name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      a.id.toString() === q
    )
  })

  const handleCopySummary = () => {
    const text = selectedUserMeta
      ? `SpotME Athlete Workout Report: ${selectedUserMeta.full_name} (${selectedUserMeta.email}) | Timeframe: ${range.toUpperCase()}`
      : `SpotME Global Workout Intelligence Platform Report | Timeframe: ${range.toUpperCase()}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3 shadow-xs">
      {/* Top Row: User Selector & Range Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Athlete Selector Combobox */}
        <div className="relative min-w-0 flex-1 max-w-lg" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedUserId && selectedUserMeta ? (
                <>
                  <UserAvatar
                    src={selectedUserMeta.profile_pic_url}
                    name={selectedUserMeta.full_name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      {selectedUserMeta.full_name}
                      <span className="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-mono">
                        User #{selectedUserMeta.id}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {selectedUserMeta.email}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Globe className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                      All Users (Overview)
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Combined stats for all users
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              {selectedUserId && (
                <button
                  type="button"
                  title="Clear athlete selection"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectUser(null)
                  }}
                  className="p-1 hover:text-foreground hover:bg-secondary rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-xl border border-border bg-popover shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Search input */}
              <div className="p-2 border-b border-border bg-secondary/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search athlete by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                </div>
              </div>

              {/* Option: Global Platform */}
              <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
                <button
                  type="button"
                  onClick={() => {
                    onSelectUser(null)
                    setDropdownOpen(false)
                  }}
                  className={`w-full p-2.5 flex items-center justify-between text-left text-xs transition-colors hover:bg-secondary/40 ${
                    !selectedUserId ? "bg-secondary/70 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Globe className="h-3 w-3 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-foreground font-medium">All Athletes (Global Macro Mode)</div>
                      <div className="text-[10px] text-muted-foreground">
                        Aggregate all logged sessions and PR records
                      </div>
                    </div>
                  </div>
                  {!selectedUserId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>

                {/* Athlete items */}
                {filteredAthletes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No athletes match "{searchQuery}"
                  </div>
                ) : (
                  filteredAthletes.map((ath) => {
                    const isSelected = selectedUserId === ath.id
                    return (
                      <button
                        key={ath.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(ath.id)
                          setDropdownOpen(false)
                        }}
                        className={`w-full p-2.5 flex items-center justify-between text-left text-xs transition-colors hover:bg-secondary/40 ${
                          isSelected ? "bg-secondary/70 font-semibold" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar src={ath.profile_pic_url} name={ath.full_name} size="sm" />
                          <div className="min-w-0">
                            <div className="text-foreground font-medium truncate flex items-center gap-1.5">
                              {ath.full_name || "Athlete"}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                #{ath.id}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {ath.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {ath.workouts_count || 0} workouts
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Range Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Time Range Pills */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            {RANGES.map((r) => {
              const active = range === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onChangeRange(r.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-all ${
                    active
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>

          {/* Quick Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Copy Report Summary */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="h-8 gap-1.5 text-xs font-mono"
            title="Copy Report Header to Clipboard"
          >
            <Share2 className="h-3 w-3" />
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
          </Button>
        </div>
      </div>

      {/* Bottom Sub-Bar: Active Mode Details & Athlete Bio Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          {selectedUserMeta ? (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-primary font-medium">
                User: {selectedUserMeta.full_name}
              </span>
              {selectedUserMeta.weight_kg && (
                <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50">
                  Weight: {selectedUserMeta.weight_kg} kg
                </span>
              )}
              {selectedUserMeta.fitness_goal && (
                <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50">
                  Goal: {selectedUserMeta.fitness_goal}
                </span>
              )}
              {selectedUserMeta.experience_level && (
                <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50">
                  Level: {selectedUserMeta.experience_level}
                </span>
              )}
              {selectedUserMeta.current_streak !== null && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/20">
                  <Flame className="h-2.5 w-2.5" />
                  {selectedUserMeta.current_streak}d streak
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
              <Globe className="h-3 w-3 text-amber-500" />
              Viewing combined stats for all users
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border/50 text-foreground font-mono text-[10px]">
            <Clock className="h-2.5 w-2.5 text-sky-400" />
            Local Time: {timezone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Local")}
          </span>
          {lastUpdated && (
            <div className="text-[10px] text-muted-foreground">
              Synced: {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
