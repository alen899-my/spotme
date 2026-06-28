"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import { Button } from "@/components/ui/button"
import type { LibraryEntity, EntityType } from "@/types"
import api from "@/lib/api"

interface LibraryListProps {
  entityType: EntityType
  label: string
  slug: string
}

export function LibraryList({ entityType, label, slug }: LibraryListProps) {
  const router = useRouter()
  const [items, setItems] = useState<LibraryEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [viewTarget, setViewTarget] = useState<LibraryEntity | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder }
      if (search) params.search = search
      const res = await api.get(`/admin/${slug}`, { params })
      setItems(res.data[entityType] ?? [])
      setTotal(res.data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder, entityType, slug])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async (item: LibraryEntity) => {
    try {
      await api.delete(`/admin/${slug}/${item.id}`)
      fetchItems()
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

  const viewFields: DetailField<LibraryEntity>[] = [
    { key: "id", label: "ID", render: (v) => <span>#{v}</span> },
    { key: "name", label: "Name", render: (v) => <span className="capitalize">{v}</span> },
    { key: "image_url", label: "Image", render: (v) => (
      v ? <img src={v} alt="" className="max-h-40 rounded object-contain" /> : "\u2014"
    )},
    { key: "created_at", label: "Created At", render: (v) => (
      <span>{v ? new Date(v).toLocaleDateString() : "\u2014"}</span>
    )},
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{label}</h1>
          <p className="text-sm text-muted-foreground">{label.toLowerCase()} library</p>
        </div>
        <Link href={`/dashboard/${slug}/new`}>
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            New {label.slice(0, -1)}
          </Button>
        </Link>
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
              <span className="text-sm font-medium capitalize">{e.name}</span>
            </div>
          )},
          { key: "created_at", label: "Created", render: (e) => (
            <span className="text-sm text-muted-foreground">
              {e.created_at ? new Date(e.created_at).toLocaleDateString() : "\u2014"}
            </span>
          ), hideOnMobile: true },
        ]}
        data={items}
        loading={loading}
        emptyMessage={search ? `No ${label.toLowerCase()} match your search.` : `No ${label.toLowerCase()} found.`}
        onView={(e) => setViewTarget(e)}
        onEdit={(e) => router.push(`/dashboard/${slug}/${e.id}/edit`)}
        onDelete={handleDelete}
        deleteTitle={`Delete ${label.slice(0, -1).toLowerCase()}`}
        deleteDescription={`Are you sure you want to delete this ${label.slice(0, -1).toLowerCase()}? This action cannot be undone.`}
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
        title={`${label.slice(0, -1)} Details`}
        data={viewTarget}
        fields={viewFields}
      />
    </div>
  )
}
