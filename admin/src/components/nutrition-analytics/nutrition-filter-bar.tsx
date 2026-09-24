"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Calendar,
  RefreshCw,
  Search,
  Check,
  Globe,
  Share2,
  ChevronDown,
  Clock,
} from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import {
  NutritionRange,
  AthleteNutritionSummary,
  SelectedNutritionUserMeta,
  NutritionTargets,
} from "./types"

interface NutritionFilterBarProps {
  athletes: AthleteNutritionSummary[]
  selectedUserId: number | null
  selectedUserMeta: SelectedNutritionUserMeta | null
  targets?: NutritionTargets
  range: NutritionRange
  timezone?: string
  onSelectUser: (userId: number | null) => void
  onChangeRange: (range: NutritionRange) => void
  onRefresh: () => void
  isLoading: boolean
  lastUpdated?: string
}

const RANGES: { key: NutritionRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "ALL" },
]

export function NutritionFilterBar({
  athletes,
  selectedUserId,
  selectedUserMeta,
  targets,
  range,
  timezone,
  onSelectUser,
  onChangeRange,
  onRefresh,
  isLoading,
  lastUpdated,
}: NutritionFilterBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const selectedAthlete = athletes.find((a) => a.id === selectedUserId)

  const handleCopySummary = () => {
    const text = selectedUserMeta
      ? `SpotME Nutrition: ${selectedUserMeta.full_name} (${selectedUserMeta.email}) | ${range.toUpperCase()}`
      : `SpotME Nutrition Report | ${range.toUpperCase()}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
      {/* Top Row: User Selector & Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Athlete Selector Combobox */}
        <div className="relative min-w-0 flex-1 max-w-lg" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedAthlete ? (
                <>
                  <UserAvatar
                    src={selectedAthlete.profile_pic_url}
                    name={selectedAthlete.full_name}
                    size="sm"
                  />
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-foreground truncate block">
                      {selectedAthlete.full_name || "Athlete"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block font-mono">
                      {selectedAthlete.email} · {selectedAthlete.meals_count} meals · {selectedAthlete.water_logs_count} water logs
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">
                      All Users
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Combined stats across {athletes.length} users
                    </span>
                  </div>
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {/* Combobox Dropdown */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-md">
              <div className="p-2 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search athlete by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-border/20">
                {/* Option 1: Global Platform Stats */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectUser(null)
                    setDropdownOpen(false)
                  }}
                  className={`w-full p-2.5 flex items-center justify-between text-left text-xs transition-colors hover:bg-secondary/40 ${
                    selectedUserId === null ? "bg-secondary/70 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-foreground font-medium">All Users</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Combined stats across all logged users
                      </div>
                    </div>
                  </div>
                  {selectedUserId === null && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>

                {/* Athlete items */}
                {filteredAthletes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No athletes found
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

                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                          <span className="rounded-md bg-secondary border border-border px-2 py-0.5">
                            {ath.meals_count} meals
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
          <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
            {RANGES.map((r) => {
              const active = range === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onChangeRange(r.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
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
            title="Copy Report Header"
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
                {selectedUserMeta.full_name}
              </span>
              {selectedUserMeta.weight_kg && (
                <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50">
                  {selectedUserMeta.weight_kg} kg
                </span>
              )}
              {selectedUserMeta.gender && (
                <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50 capitalize">
                  {selectedUserMeta.gender}
                </span>
              )}
              {targets && (
                <>
                  <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50 text-foreground font-semibold">
                    Goal: {targets.caloriesTarget} kcal
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50 text-emerald-400 font-semibold">
                    Protein: {targets.proteinTarget}g
                  </span>
                  {targets.dietType && (
                    <span className="rounded bg-secondary px-1.5 py-0.5 border border-border/50 text-muted-foreground">
                      Diet: {targets.dietType}
                    </span>
                  )}
                </>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
              <Globe className="h-3 w-3 text-emerald-400" />
              All users overview
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 border border-border/50 text-foreground font-mono text-[10px]">
            <Clock className="h-2.5 w-2.5 text-sky-400" />
            Timezone: {timezone || "Local"}
          </span>
          {lastUpdated && (
            <div className="text-[10px] text-muted-foreground">
              Synced: {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
