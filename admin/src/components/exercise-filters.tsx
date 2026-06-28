"use client"

import { useEffect, useState } from "react"
import { Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FormSelect } from "@/components/ui/form-select"
import api from "@/lib/api"

interface FilterOptions {
  categories: string[]
  body_parts: string[]
  equipment: string[]
  targets: string[]
}

interface ExerciseFiltersProps {
  filters: Record<string, string>
  onChange: (key: string, value: string) => void
}

const filterConfig = [
  { key: "category", label: "Category", optionsKey: "categories" as const },
  { key: "body_part", label: "Body Part", optionsKey: "body_parts" as const },
  { key: "equipment", label: "Equipment", optionsKey: "equipment" as const },
  { key: "target", label: "Target", optionsKey: "targets" as const },
]

export function ExerciseFilters({ filters, onChange }: ExerciseFiltersProps) {
  const [show, setShow] = useState(false)
  const [options, setOptions] = useState<FilterOptions>({
    categories: [],
    body_parts: [],
    equipment: [],
    targets: [],
  })

  useEffect(() => {
    api.get("/exercises/meta/filters").then((res) => {
      setOptions({
        categories: res.data.categories ?? [],
        body_parts: res.data.body_parts ?? [],
        equipment: res.data.equipment ?? [],
        targets: res.data.targets ?? [],
      })
    }).catch(() => {})
  }, [])

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShow(!show)}
          className={cn(show && "border-ring bg-ring/10")}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <button
            onClick={() => filterConfig.forEach((cfg) => onChange(cfg.key, ""))}
            className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {show && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {filterConfig.map((cfg) => (
            <div key={cfg.key} className="w-40">
              <FormSelect
                label={cfg.label}
                items={options[cfg.optionsKey]}
                value={filters[cfg.key] ?? ""}
                onChange={(v) => onChange(cfg.key, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
