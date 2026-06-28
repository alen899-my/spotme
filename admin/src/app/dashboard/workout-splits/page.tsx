"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import type { WorkoutSplit } from "@/types"
import api from "@/lib/api"

export default function WorkoutSplitsPage() {
  const router = useRouter()
  const [splits, setSplits] = useState<WorkoutSplit[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const fetchSplits = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder }
      if (search) params.search = search
      const res = await api.get("/admin/splits", { params })
      setSplits(res.data.splits ?? [])
      setTotal(res.data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder])

  useEffect(() => {
    fetchSplits()
  }, [fetchSplits])

  const handleDelete = async (split: WorkoutSplit) => {
    try {
      await api.delete(`/admin/splits/${split.id}`)
      fetchSplits()
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workout Splits</h1>
          <p className="text-sm text-muted-foreground">Admin workout templates</p>
        </div>
        <Link href="/dashboard/workout-splits/new">
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            New Split
          </Button>
        </Link>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "ID", sortable: true, render: (e) => (
            <span className="text-sm text-muted-foreground">#{e.id}</span>
          )},
          { key: "name", label: "Name", sortable: true, render: (e) => (
            <span className="text-sm font-medium">{e.name}</span>
          )},
          { key: "session_count", label: "Days", render: (e) => (
            <span className="text-sm text-muted-foreground">{e.session_count ?? 0}</span>
          ), hideOnMobile: true },
          { key: "template_goal", label: "Goal", render: (e) => (
            <span className="text-sm capitalize text-muted-foreground">{e.template_goal || "\u2014"}</span>
          ), hideOnMobile: true },
          { key: "template_level", label: "Level", render: (e) => (
            <span className="text-sm capitalize text-muted-foreground">{e.template_level || "\u2014"}</span>
          ), hideOnMobile: true },
          { key: "template_days", label: "Days/Week", render: (e) => (
            <span className="text-sm text-muted-foreground">{e.template_days || "\u2014"}</span>
          ), hideOnMobile: true },
          { key: "created_at", label: "Created", sortable: true, render: (e) => (
            <span className="text-sm text-muted-foreground">
              {new Date(e.created_at).toLocaleDateString()}
            </span>
          ), hideOnMobile: true },
        ]}
        data={splits}
        loading={loading}
        emptyMessage={search ? "No splits match your search." : "No workout splits found."}
        onEdit={(e) => router.push(`/dashboard/workout-splits/${e.id}/edit`)}
        onDelete={handleDelete}
        deleteTitle="Delete workout split"
        deleteDescription="Are you sure you want to delete this split? This will remove all its days and exercises."
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
    </div>
  )
}
