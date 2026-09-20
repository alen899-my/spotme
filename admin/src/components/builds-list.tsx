"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Download, Star, Copy, Check, Upload } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AppBuild } from "@/types"
import api from "@/lib/api"

function CopyLinkButton({ url, label = "Copy Link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono transition-colors",
        copied
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-semibold"
          : "border-border bg-secondary/60 text-foreground hover:bg-secondary"
      )}
      title="Copy direct download URL"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "—"
  const mb = bytes / (1024 * 1024)
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`
}

function ChannelBadge({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    production: "bg-green-500/10 text-green-600 border-green-500/30",
    preview: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    development: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${styles[channel] ?? styles.development}`}>
      {channel}
    </span>
  )
}

export function BuildsList() {
  const router = useRouter()
  const [items, setItems] = useState<AppBuild[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [viewTarget, setViewTarget] = useState<AppBuild | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder }
      if (search) params.search = search
      const res = await api.get("/admin/builds", { params })
      setItems(res.data.builds ?? [])
      setTotal(res.data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleDelete = async (item: AppBuild) => {
    try {
      await api.delete(`/admin/builds/${item.id}`)
      fetchItems()
    } catch {}
  }

  const handleSortChange = (key: string) => {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortOrder(key === "created_at" ? "desc" : "asc")
    }
    setPage(1)
  }

  const viewFields: DetailField<AppBuild>[] = [
    { key: "id", label: "ID", render: (v) => <span>#{v}</span> },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "build_channel", label: "Channel", render: (v) => <ChannelBadge channel={v} /> },
    { key: "file_type", label: "File Type", render: (v) => <span className="uppercase">{v}</span> },
    { key: "version", label: "Version" },
    { key: "version_code", label: "Version Code" },
    { key: "file_size", label: "Size", render: (v) => <span>{formatSize(v)}</span> },
    { key: "is_latest", label: "Latest", render: (v) => <span>{v ? "Yes" : "No"}</span> },
    { key: "force_update", label: "Force Update", render: (v) => <span>{v ? "Required" : "Optional"}</span> },
    { key: "file_url", label: "Download", render: (v) => (
      v ? (
        <div className="flex items-center gap-2">
          <a
            href={v}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium shadow-xs hover:bg-accent text-primary underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download file
          </a>
          <CopyLinkButton url={v} />
        </div>
      ) : "—"
    )},
    { key: "created_at", label: "Uploaded At", render: (v) => (
      <span>{v ? new Date(v).toLocaleString() : "—"}</span>
    )},
  ]

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">App Builds</h1>
          <p className="text-sm text-muted-foreground">Upload production, preview and development builds</p>
        </div>
        <Link href="/dashboard/builds/new" className="w-full sm:w-auto shrink-0">
          <Button className="w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm">
            <Upload className="h-4 w-4" />
            Upload Build
          </Button>
        </Link>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "ID", sortable: true, render: (b) => (
            <span className="text-sm text-muted-foreground">#{b.id}</span>
          )},
          { key: "title", label: "Build", sortable: true, render: (b) => (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {b.version ? `v${b.version}` : "no version"}
                  {b.version_code != null ? ` (${b.version_code})` : ""}
                </p>
              </div>
              {b.is_latest && (
                <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600">
                  <Star className="h-3 w-3" /> LATEST
                </span>
              )}
              {b.force_update && (
                <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                  FORCED
                </span>
              )}
            </div>
          )},
          { key: "build_channel", label: "Channel", render: (b) => (
            <ChannelBadge channel={b.build_channel} />
          ), hideOnMobile: true },
          { key: "file_type", label: "Type", render: (b) => (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold uppercase text-muted-foreground">
              {b.file_type}
            </span>
          ), hideOnMobile: true },
          { key: "file_size", label: "Size", sortable: true, render: (b) => (
            <span className="text-sm text-muted-foreground">{formatSize(b.file_size)}</span>
          ), hideOnMobile: true },
          { key: "file_url", label: "File", render: (b) => (
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1.5">
                <a
                  href={b.file_url}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-xs hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <CopyLinkButton url={b.file_url} label="Copy" />
              </div>
              {b.file_type === "aab" && (
                <span className="text-[10px] leading-tight text-muted-foreground">Play Store only — not installable</span>
              )}
            </div>
          )},
          { key: "created_at", label: "Uploaded", render: (b) => (
            <span className="text-sm text-muted-foreground">
              {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
            </span>
          ), hideOnMobile: true },
        ]}
        data={items}
        loading={loading}
        emptyMessage={search ? "No builds match your search." : "No builds uploaded yet."}
        onView={(b) => setViewTarget(b)}
        onEdit={(b) => router.push(`/dashboard/builds/${b.id}/edit`)}
        onDelete={handleDelete}
        deleteTitle="Delete build"
        deleteDescription="Are you sure? This removes the database row AND the file from Cloudflare R2. This action cannot be undone."
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
        title="Build Details"
        data={viewTarget}
        fields={viewFields}
      />

      {/* Mobile Floating Upload Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-40">
        <Link href="/dashboard/builds/new">
          <Button size="lg" className="rounded-full shadow-2xl flex items-center gap-2 px-4 py-3 h-auto bg-primary text-primary-foreground font-semibold border border-primary/20">
            <Upload className="h-4 w-4" />
            <span>Upload Build</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
