"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import { ExerciseFilters } from "@/components/exercise-filters"
import { Button } from "@/components/ui/button"
import type { Exercise } from "@/types"
import api from "@/lib/api"

export default function ExercisesPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [viewTarget, setViewTarget] = useState<Exercise | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page, limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      }
      if (search) params.q = search
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params[key] = val
      })
      const res = await api.get("/exercises", { params })
      setExercises(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder, filters])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const handleDelete = async (exercise: Exercise) => {
    try {
      await api.delete(`/exercises/${exercise.id}`)
      fetchExercises()
    } catch {}
  }

  const handleSortChange = (key: string) => {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortOrder("asc")
    }
    setPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const viewFields: DetailField<Exercise>[] = [
    { key: "id", label: "ID", render: (v) => <span>#{v}</span> },
    { key: "name", label: "Name" },
    { key: "category", label: "Category", render: (v, item) => (
      <div className="flex items-center gap-2">
        {item?.category_image_url && <img src={item.category_image_url} alt="" className="h-6 w-6 rounded object-cover" />}
        <span className="capitalize">{v}</span>
      </div>
    )},
    { key: "body_part", label: "Body Part", render: (v, item) => (
      <div className="flex items-center gap-2">
        {item?.body_part_image_url && <img src={item.body_part_image_url} alt="" className="h-6 w-6 rounded object-cover" />}
        <span className="capitalize">{v}</span>
      </div>
    )},
    { key: "equipment", label: "Equipment", render: (v, item) => (
      <div className="flex items-center gap-2">
        {item?.equipment_image_url && <img src={item.equipment_image_url} alt="" className="h-6 w-6 rounded object-cover" />}
        <span className="capitalize">{v}</span>
      </div>
    )},
    { key: "target", label: "Target Muscle", render: (v, item) => (
      <div className="flex items-center gap-2">
        {item?.target_image_url && <img src={item.target_image_url} alt="" className="h-6 w-6 rounded object-cover" />}
        <span>{v ?? "\u2014"}</span>
      </div>
    )},
    { key: "muscle_group", label: "Muscle Group", render: (v, item) => (
      <div className="flex items-center gap-2">
        {item?.muscle_group_image_url && <img src={item.muscle_group_image_url} alt="" className="h-6 w-6 rounded object-cover" />}
        <span>{v ?? "\u2014"}</span>
      </div>
    )},
    { key: "secondary_muscles", label: "Secondary Muscles", render: (v) => (
      <span>{(Array.isArray(v) ? v : []).join(", ") || "\u2014"}</span>
    )},
    { key: "avg_rating", label: "Avg Rating", render: (v) => (
      <span>{v != null ? `${Number(v).toFixed(1)} / 5` : "\u2014"}</span>
    )},
    { key: "rating_count", label: "Rating Count" },
    { key: "image_url", label: "Image", render: (v) => (
      v ? <img src={v} alt="" className="max-h-40 rounded object-contain" /> : "\u2014"
    )},
    { key: "gif_url", label: "GIF", render: (v) => (
      v ? <img src={v} alt="" className="max-h-40 rounded object-contain" /> : "\u2014"
    )},
    { key: "instructions_en", label: "Instructions", className: "col-span-full", render: (v) => (
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{v ?? "\u2014"}</p>
    )},
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Exercises</h1>
          <p className="text-sm text-muted-foreground">Exercise library</p>
        </div>
        <Link href="/dashboard/exercises/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            New Exercise
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <ExerciseFilters filters={filters} onChange={handleFilterChange} />
      </div>

      <DataTable
        columns={[
          { key: "id", label: "ID", sortable: true, render: (e) => (
            <span className="text-sm text-muted-foreground">#{e.id}</span>
          )},
          { key: "name", label: "Name", sortable: true, render: (e) => (
            <div className="flex items-center gap-2.5">
              {e.image_url ? (
                <img src={e.image_url} alt="" className="h-7 w-7 rounded object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary text-[10px] font-bold text-muted-foreground">
                  {e.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium">{e.name}</span>
            </div>
          )},
          { key: "category", label: "Category", sortable: true, render: (e) => (
            <div className="flex items-center gap-1.5">
              {e.category_image_url && <img src={e.category_image_url} alt="" className="h-5 w-5 rounded object-cover" />}
              <span className="text-sm capitalize">{e.category}</span>
            </div>
          ), hideOnMobile: true },
          { key: "body_part", label: "Body Part", sortable: true, render: (e) => (
            <div className="flex items-center gap-1.5">
              {e.body_part_image_url && <img src={e.body_part_image_url} alt="" className="h-5 w-5 rounded object-cover" />}
              <span className="text-sm capitalize">{e.body_part}</span>
            </div>
          ), hideOnMobile: true },
          { key: "equipment", label: "Equipment", render: (e) => (
            <div className="flex items-center gap-1.5">
              {e.equipment_image_url && <img src={e.equipment_image_url} alt="" className="h-5 w-5 rounded object-cover" />}
              <span className="text-sm capitalize">{e.equipment}</span>
            </div>
          ), hideOnMobile: true },
          { key: "target", label: "Target", render: (e) => (
            <div className="flex items-center gap-1.5">
              {e.target_image_url && <img src={e.target_image_url} alt="" className="h-5 w-5 rounded object-cover" />}
              <span className="text-sm">{e.target ?? "\u2014"}</span>
            </div>
          ), hideOnMobile: true },
          { key: "avg_rating", label: "Rating", sortable: true, render: (e) => (
            <span className="text-sm text-muted-foreground">
              {e.avg_rating != null ? Number(e.avg_rating).toFixed(1) : "\u2014"}
            </span>
          ), hideOnMobile: true },
        ]}
        data={exercises}
        loading={loading}
        emptyMessage={search ? "No exercises match your search." : "No exercises found."}
        onView={(e) => setViewTarget(e)}
        onEdit={(e) => router.push(`/dashboard/exercises/${e.id}/edit`)}
        onDelete={handleDelete}
        deleteTitle="Delete exercise"
        deleteDescription="Are you sure you want to delete this exercise? This action cannot be undone."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1) }}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={(n) => { setLimit(n); setPage(1) }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      <DetailModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Exercise Details"
        data={viewTarget}
        fields={viewFields}
      />
    </div>
  )
}
