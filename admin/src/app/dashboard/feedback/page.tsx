"use client"

import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import type { Feedback } from "@/types"
import api from "@/lib/api"

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewTarget, setViewTarget] = useState<Feedback | null>(null)

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder }
      if (search) params.search = search
      const res = await api.get("/admin/feedback", { params })
      setFeedbacks(res.data.feedbacks ?? [])
      setTotal(res.data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const handleDelete = async (feedback: Feedback) => {
    try {
      await api.delete(`/admin/feedback/${feedback.id}`)
      fetchFeedbacks()
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

  const viewFields: DetailField<Feedback>[] = [
    { key: "id", label: "ID", render: (v) => <span>#{v}</span> },
    { key: "title", label: "Title" },
    { key: "category", label: "Category", render: (v) => <span className="capitalize">{v}</span> },
    { key: "userName", label: "User" },
    { key: "userEmail", label: "Email" },
    { key: "created_at", label: "Date", render: (v) => <span>{new Date(v).toLocaleString()}</span> },
    { key: "description", label: "Description", className: "col-span-full" },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Feedback</h1>
          <p className="text-sm text-muted-foreground">User submitted feedback</p>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "ID", sortable: true, render: (f) => (
            <span className="text-sm text-muted-foreground">#{f.id}</span>
          )},
          { key: "title", label: "Title", sortable: true, render: (f) => (
            <span className="text-sm font-medium">{f.title}</span>
          )},
          { key: "category", label: "Category", sortable: true, render: (f) => (
            <span className="text-sm capitalize">{f.category}</span>
          ), hideOnMobile: true },
          { key: "userName", label: "User", sortable: true, render: (f) => (
            <span className="text-sm">{f.userName ?? "\u2014"}</span>
          )},
          { key: "userEmail", label: "Email", render: (f) => (
            <span className="text-sm text-muted-foreground">{f.userEmail ?? "\u2014"}</span>
          ), hideOnMobile: true },
          { key: "created_at", label: "Date", sortable: true, render: (f) => (
            <span className="text-sm text-muted-foreground">
              {new Date(f.created_at).toLocaleDateString()}
            </span>
          ), hideOnMobile: true },
        ]}
        data={feedbacks}
        loading={loading}
        emptyMessage={search ? "No feedbacks match your search." : "No feedbacks found."}
        onView={(f) => setViewTarget(f)}
        onDelete={handleDelete}
        deleteTitle="Delete feedback"
        deleteDescription="Are you sure you want to delete this feedback? This action cannot be undone."
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
        title="Feedback Details"
        data={viewTarget}
        fields={viewFields}
      />
    </div>
  )
}
