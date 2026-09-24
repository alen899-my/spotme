"use client"

import React, { useMemo } from "react"
import bodyDataJson from "./body-data.json"

export interface MuscleActivityProp {
  slug: string
  intensity: number
}

interface BodyHighlighterProps {
  side: "front" | "back"
  gender?: "male" | "female"
  muscleActivity: MuscleActivityProp[]
  selectedSlug: string | null
  onSelectSlug: (slug: string) => void
  hoveredSlug?: string | null
  onHoverSlug?: (slug: string | null) => void
  scale?: number
  className?: string
}

// 50-step alpha map from 10 to FF matching the Expo mobile app
export const HEAT_ALPHA: Record<number, string> = (() => {
  const map: Record<number, string> = {}
  for (let i = 1; i <= 50; i++) {
    const alphaDecimal = Math.round(10 + (220 * (i - 1)) / 49)
    map[i] = alphaDecimal.toString(16).padStart(2, "0").toUpperCase()
  }
  return map
})()

export const SLUG_LABELS: Record<string, string> = {
  chest: "Chest",
  "upper-back": "Upper Back",
  "lower-back": "Lower Back",
  deltoids: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearm: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  gluteal: "Glutes",
  quadriceps: "Quads",
  hamstring: "Hamstrings",
  calves: "Calves",
  trapezius: "Traps",
  neck: "Neck",
  adductors: "Adductors",
  abductors: "Abductors",
  ankles: "Ankles",
  hands: "Hands",
  tibialis: "Tibialis",
  knees: "Knees",
  feet: "Feet",
}

export const INTENSITY_DESC = [
  "Untrained — no completed sessions on record.",
  "Barely trained — just getting started.",
  "A few isolated sessions on record.",
  "Light training — a couple of weeks in.",
  "Building momentum — consistent for a few weeks.",
  "Moderate effort — about a month of work.",
  "Solid training — 6–8 weeks of consistent volume.",
  "Well-developed — 2–3 months of dedication.",
  "Strong base — 3–4 months of consistent hard work.",
  "Elite level — 5–6 months of sustained training.",
  "Peak conditioning — 6+ months of elite volume.",
]

export function BodyHighlighter({
  side,
  gender = "male",
  muscleActivity,
  selectedSlug,
  onSelectSlug,
  hoveredSlug,
  onHoverSlug,
  scale = 1,
  className = "",
}: BodyHighlighterProps) {
  // Map activity by slug for O(1) lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, number>()
    muscleActivity.forEach((m) => {
      map.set(m.slug, m.intensity)
    })
    return map
  }, [muscleActivity])

  // Get raw body parts and outline from pre-compiled JSON
  const bodyData = (bodyDataJson as any)[gender] || (bodyDataJson as any).male
  const partsList: any[] = bodyData[side] || []
  const outlinePath: string = (bodyDataJson as any).outlines?.[gender]?.[side] || ""

  // ViewBox based on gender and side (matching Expo app)
  const viewBox = useMemo(() => {
    if (gender === "female") {
      return side === "front" ? "-50 -40 734 1538" : "756 0 774 1448"
    }
    return side === "front" ? "0 0 724 1448" : "724 0 724 1448"
  }, [gender, side])

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox={viewBox}
        className="w-full h-auto max-h-[460px] drop-shadow-md transition-all duration-300"
        style={{ transform: `scale(${scale})` }}
      >
        <defs>
          <filter id="muscleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#F7CB16" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outline border */}
        {outlinePath && (
          <path
            d={outlinePath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth={2}
            strokeLinecap="butt"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Muscle parts */}
        {partsList.map((part: any, pIdx: number) => {
          const slug = part.slug
          const isSelected = selectedSlug === slug
          const isHovered = hoveredSlug === slug
          const intensity = activityMap.get(slug) || 0

          // Color calculation matching Expo mobile app: #FF4B4B + alpha
          let fill = "#1c2633" // Default untrained dark slate
          if (intensity > 0) {
            const alphaHex = HEAT_ALPHA[Math.min(50, Math.max(1, intensity))] || "40"
            fill = `#FF4B4B${alphaHex}`
          }

          let stroke = "rgba(255, 255, 255, 0.08)"
          let strokeWidth = 0.6
          let filter = undefined

          if (isSelected) {
            stroke = "#F7CB16"
            strokeWidth = 2.5
            filter = "url(#muscleGlow)"
          } else if (isHovered) {
            stroke = "#2596BE"
            strokeWidth = 1.8
          }

          // Gather all path strings for this part
          const paths: string[] = []
          if (part.path) {
            if (Array.isArray(part.path.left)) paths.push(...part.path.left)
            if (Array.isArray(part.path.right)) paths.push(...part.path.right)
            if (Array.isArray(part.path.common)) paths.push(...part.path.common)
          }

          return (
            <g
              key={`${slug}-${pIdx}`}
              id={`muscle-${slug}`}
              className="cursor-pointer transition-all duration-150"
              onClick={() => onSelectSlug(slug)}
              onMouseEnter={() => onHoverSlug && onHoverSlug(slug)}
              onMouseLeave={() => onHoverSlug && onHoverSlug(null)}
            >
              <title>{`${SLUG_LABELS[slug] || slug}: ${intensity > 0 ? `Intensity ${intensity}/50` : "Untrained"}`}</title>
              {paths.map((dStr, dIdx) => (
                <path
                  key={dIdx}
                  d={dStr}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  className="transition-colors duration-200 hover:brightness-125"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
