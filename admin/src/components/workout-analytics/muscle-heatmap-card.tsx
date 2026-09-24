"use client"

import React, { useState, useMemo } from "react"
import { Flame, Layers, Dumbbell, Calendar, Info, Check, Sparkles, ChevronRight } from "lucide-react"
import { MuscleHeatMapItem, SelectedUserMeta } from "./types"
import { BodyHighlighter, SLUG_LABELS, INTENSITY_DESC, HEAT_ALPHA } from "./body-highlighter/body-highlighter"

interface MuscleHeatMapCardProps {
  muscleHeatMap: MuscleHeatMapItem[]
  selectedUserMeta: SelectedUserMeta | null
  isAthleteMode: boolean
}

export function MuscleHeatMapCard({
  muscleHeatMap,
  selectedUserMeta,
  isAthleteMode,
}: MuscleHeatMapCardProps) {
  const [side, setSide] = useState<"front" | "back">("front")
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)

  // Derive gender automatically from athlete's saved profile (users.gender)
  const savedGenderRaw = (selectedUserMeta?.gender || "").trim().toLowerCase()
  const isFemale = savedGenderRaw === "female" || savedGenderRaw === "f" || savedGenderRaw === "woman"
  const gender: "male" | "female" = isFemale ? "female" : "male"

  const genderDisplayLabel = selectedUserMeta?.gender
    ? selectedUserMeta.gender.charAt(0).toUpperCase() + selectedUserMeta.gender.slice(1).toLowerCase()
    : isAthleteMode
    ? "Male (Default)"
    : "Standard"

  // Map muscles by slug
  const muscleMap = useMemo(() => {
    const map = new Map<string, MuscleHeatMapItem>()
    muscleHeatMap.forEach((m) => {
      map.set(m.slug, m)
    })
    return map
  }, [muscleHeatMap])

  // Top trained muscle by default
  const defaultSlug = useMemo(() => {
    return muscleHeatMap.length > 0 ? muscleHeatMap[0].slug : "chest"
  }, [muscleHeatMap])

  const activeSlug = selectedSlug || defaultSlug
  const activeMuscle = useMemo(() => {
    return (
      muscleMap.get(activeSlug) || {
        slug: activeSlug,
        label: SLUG_LABELS[activeSlug] || activeSlug,
        intensity: 0,
        score: 0,
        daysTrained: 0,
        totalSets: 0,
        totalVolumeKg: 0,
        lastTrainedDate: null,
      }
    )
  }, [muscleMap, activeSlug])

  // Intensity tier (1 to 10) for description
  const tierIndex = Math.min(
    10,
    Math.max(0, Math.ceil(activeMuscle.intensity / 5))
  )
  const intensityDescription = INTENSITY_DESC[tierIndex] || "Keep training!"

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" />
              Body Part Heat Map &amp; Intensity
            </h2>
            
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual heat map of muscle training volume and recovery status — matching the mobile app.
          </p>
        </div>

        {/* View Controls: Saved Gender Badge & Front/Back Toggle */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
        

          {/* Front / Back Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSide("front")}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                side === "front"
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setSide("back")}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                side === "back"
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Heat Map Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COL: SVG Body Model with interactive clicks (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border/60 bg-muted/10 p-4 flex flex-col justify-between items-center space-y-3">
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="capitalize font-semibold text-foreground">
              {gender} Anatomy • {side === "front" ? "Anterior (Front)" : "Posterior (Back)"}
            </span>
            <span className="text-[10px] text-muted-foreground">Click muscle to inspect</span>
          </div>

          {/* SVG Vector Body Model */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] py-2 flex items-center justify-center">
            <BodyHighlighter
              side={side}
              gender={gender}
              muscleActivity={muscleHeatMap}
              selectedSlug={activeSlug}
              onSelectSlug={(s) => setSelectedSlug(s)}
              hoveredSlug={hoveredSlug}
              onHoverSlug={(s) => setHoveredSlug(s)}
              scale={1}
              className="w-full"
            />
          </div>

          {/* 50-Step Heat Intensity Legend Scale Bar */}
          <div className="w-full pt-2 border-t border-border/40 space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Heat Scale (Intensity 1 to 50):</span>
              <span className="text-foreground font-semibold">
                {activeMuscle.intensity > 0 ? `Level ${activeMuscle.intensity}` : "Untrained"}
              </span>
            </div>

            {/* Gradient bar with 50 segments */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-zinc-900 border border-border/40">
              {Array.from({ length: 50 }, (_, idx) => idx + 1).map((lvl) => (
                <div
                  key={lvl}
                  style={{ backgroundColor: `#FF4B4B${HEAT_ALPHA[lvl]}` }}
                  className="flex-1 h-full"
                  title={`Level ${lvl}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>1 (Low)</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50 (Peak)</span>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Muscle Spotlight & Ranked Groups List (7 cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          {/* 1. Active Selected Muscle Spotlight Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {activeMuscle.label}
                  </h3>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor:
                        activeMuscle.intensity > 0
                          ? `#FF4B4B${HEAT_ALPHA[Math.min(50, activeMuscle.intensity)] || "40"}`
                          : "rgba(255,255,255,0.06)",
                      color: activeMuscle.intensity > 15 ? "#ffffff" : "#f43f5e",
                    }}
                  >
                    Level {activeMuscle.intensity} / 50
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {intensityDescription}
                </p>
              </div>

              {/* Intensity numeric badge */}
              <div className="text-right font-mono shrink-0">
                <span className="text-2xl font-black text-rose-500">
                  {activeMuscle.intensity}
                </span>
                <span className="text-xs text-muted-foreground"> /50</span>
              </div>
            </div>

            {/* 50-Segment Mini Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Training Volume Envelope</span>
                <span>{activeMuscle.score} pts (Decayed)</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted/40 gap-[1px]">
                {Array.from({ length: 50 }, (_, idx) => idx + 1).map((lvl) => (
                  <div
                    key={lvl}
                    style={{
                      backgroundColor:
                        lvl <= activeMuscle.intensity
                          ? `#FF4B4B${HEAT_ALPHA[lvl]}`
                          : "rgba(255,255,255,0.06)",
                    }}
                    className="flex-1 h-full"
                  />
                ))}
              </div>
            </div>

            {/* 4 Stat KPIs for this Muscle */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase block">Days Trained</span>
                <span className="text-sm font-bold text-foreground">
                  {activeMuscle.daysTrained} days
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase block">Total Sets</span>
                <span className="text-sm font-bold text-amber-500">
                  {activeMuscle.totalSets} sets
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase block">Total Volume</span>
                <span className="text-sm font-bold text-sky-400">
                  {activeMuscle.totalVolumeKg.toLocaleString()} kg
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase block">Last Trained</span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  {activeMuscle.lastTrainedDate
                    ? new Date(`${activeMuscle.lastTrainedDate}T12:00:00`).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : "Not logged"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Ranked Muscles List & Quick Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Ranked Muscle Intensity ({muscleHeatMap.filter((m) => m.intensity > 0).length} active)
              </span>
              <span>Click to spotlight</span>
            </div>

            <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {muscleHeatMap.map((m, idx) => {
                const isSelected = activeSlug === m.slug
                const alphaHex = HEAT_ALPHA[Math.min(50, Math.max(1, m.intensity))] || "30"
                const swatchColor = m.intensity > 0 ? `#FF4B4B${alphaHex}` : "#27272a"

                return (
                  <div
                    key={m.slug}
                    onClick={() => setSelectedSlug(m.slug)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/40 bg-card/60 hover:bg-muted/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono text-muted-foreground w-4">
                        #{idx + 1}
                      </span>
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: swatchColor }}
                      />
                      <span className="font-medium text-foreground">
                        {m.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-muted-foreground text-[10px]">
                        {m.totalSets > 0 ? `${m.totalSets} sets` : "0 sets"}
                      </span>
                      <span className="text-muted-foreground text-[10px] hidden sm:inline">
                        {m.totalVolumeKg > 0 ? `${m.totalVolumeKg.toLocaleString()} kg` : "—"}
                      </span>
                      <span
                        className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor:
                            m.intensity > 0 ? `#FF4B4B20` : "rgba(255,255,255,0.05)",
                          color: m.intensity > 0 ? "#FF4B4B" : "#71717a",
                        }}
                      >
                        {m.intensity}/50
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
