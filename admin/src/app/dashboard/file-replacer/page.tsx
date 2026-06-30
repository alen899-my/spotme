"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Settings, Check, Loader2, AlertCircle, Upload, Clock, History } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { ExerciseFilters } from "@/components/exercise-filters"
import { GifEngine } from "@/components/gif-engine"
import { PromptBuilder } from "@/components/prompt-builder"
import { UploadFramesModal } from "@/components/upload-frames-modal"
import { Button } from "@/components/ui/button"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import { cn } from "@/lib/utils"
import type { Exercise, ReplacerStatus } from "@/types"
import api from "@/lib/api"

interface ReplacerRowState {
  status: ReplacerStatus
  referenceFile?: File
  referencePreview?: string
  referenceProgress: number
  referenceUrl?: string
  frames: {
    file?: File
    preview?: string
    progress: number
    url?: string
  }[]
  gifBlob?: Blob
  error?: string
}

function createEmptyRowState(): ReplacerRowState {
  return {
    status: "pending",
    referenceProgress: 0,
    frames: [
      { progress: 0 },
      { progress: 0 },
      { progress: 0 },
    ],
  }
}

export default function FileReplacerPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [viewTarget, setViewTarget] = useState<Exercise | null>(null)

  const [rowStates, setRowStates] = useState<Record<string, ReplacerRowState>>({})
  const [replacerStatuses, setReplacerStatuses] = useState<Record<string, { status: string }>>({})
  const triggeredRef = useRef<Set<string>>(new Set())
  const [gifEngineOpen, setGifEngineOpen] = useState(false)
  const [uploadModalExercise, setUploadModalExercise] = useState<Exercise | null>(null)
  const [tab, setTab] = useState<"pending" | "history">("pending")

  const getRow = (id: string) => rowStates[id] ?? createEmptyRowState()
  const updateRow = (id: string, upd: Partial<ReplacerRowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? createEmptyRowState()), ...upd },
    }))
  }

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
      const data: Exercise[] = res.data.data ?? []
      setExercises(data)
      setTotal(res.data.pagination?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder, filters])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  useEffect(() => {
    if (exercises.length === 0) return
    const ids = exercises.map(e => e.id).join(',')
    api.get(`/admin/file-replacer/status?ids=${ids}`).then((res) => {
      setReplacerStatuses(res.data)
    }).catch(() => {})
  }, [exercises])

  const filteredExercises = exercises.filter((e) => {
    const s = replacerStatuses[e.id]?.status ?? "pending"
    return tab === "pending" ? s !== "replaced" : s === "replaced"
  })

  const handlePipelineComplete = (exerciseId: string, result: { framePreviews: string[] }) => {
    triggeredRef.current.add(exerciseId)
    updateRow(exerciseId, {
      status: "replaced",
      referenceProgress: 100,
      frames: result.framePreviews.map((preview) => ({ preview, progress: 100 })),
    })
    fetchExercises()
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
    { key: "category", label: "Category" },
    { key: "body_part", label: "Body Part" },
    { key: "equipment", label: "Equipment" },
    { key: "target", label: "Target Muscle" },
    { key: "image_url", label: "Current Image", render: (v) => v ? <img src={v} alt="" className="max-h-40 rounded object-contain" /> : "\u2014" },
    { key: "gif_url", label: "Current GIF", render: (v) => v ? <img src={v} alt="" className="max-h-40 rounded object-contain" /> : "\u2014" },
    { key: "instructions_en", label: "Instructions", className: "col-span-full", render: (v) => <p className="whitespace-pre-wrap text-sm text-muted-foreground">{v ?? "\u2014"}</p> },
  ]

  const statusBadge = (status: ReplacerStatus) => {
    const styles = {
      pending: "bg-muted text-muted-foreground",
      uploading: "bg-blue-500/10 text-blue-500",
      frames_ready: "bg-yellow-500/10 text-yellow-600",
      generating_gif: "bg-purple-500/10 text-purple-600",
      replaced: "bg-green-500/10 text-green-600",
      failed: "bg-destructive/10 text-destructive",
    }
    const labels = {
      pending: "Pending",
      uploading: "Uploading",
      frames_ready: "Frames Ready",
      generating_gif: "Generating GIF",
      replaced: "Replaced",
      failed: "Failed",
    }
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", styles[status])}>
        {status === "generating_gif" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
        {status === "replaced" && <Check className="h-2.5 w-2.5" />}
        {status === "failed" && <AlertCircle className="h-2.5 w-2.5" />}
        {labels[status]}
      </span>
    )
  }

  const progressBar = (value: number) => {
    if (value === -1) return <span className="text-[10px] text-destructive">Failed</span>
    if (value === 0) return null
    if (value === 100) return <Check className="h-3 w-3 text-green-500" />
    return (
      <div className="flex items-center gap-1">
        <div className="h-1 w-10 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${value}%` }} />
        </div>
        <span className="text-[9px] text-muted-foreground">{value}%</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">File Replacer</h1>
          <p className="text-sm text-muted-foreground">Replace exercise GIFs and thumbnails with AI-generated media</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setGifEngineOpen(true)}>
            <Settings className="mr-1 h-3.5 w-3.5" />
            GIF Settings
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <ExerciseFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-secondary/30 p-1">
        <button
          onClick={() => { setTab("pending"); setPage(1) }}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "pending" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending
        </button>
        <button
          onClick={() => { setTab("history"); setPage(1) }}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "history" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="h-3.5 w-3.5" />
          My Copy V1
        </button>
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
              <div className="min-w-0">
                <span className="text-sm font-medium">{e.name}</span>
                <div className="mt-0.5">
                  <PromptBuilder exercise={e} compact />
                </div>
              </div>
            </div>
          )},
          { key: "category", label: "Category", sortable: true, render: (e) => (
            <span className="text-sm capitalize">{e.category}</span>
          ), hideOnMobile: true },
          { key: "gif_url", label: tab === "history" ? "GIF (V1)" : "GIF", render: (e) => {
            const url = tab === "history"
              ? (replacerStatuses[e.id] as any)?.mycopyv1_gif_url || e.gif_url
              : e.gif_url
            return url
              ? <img src={url} alt="" className="h-8 w-8 rounded object-contain" />
              : <span className="text-[10px] text-muted-foreground">—</span>
          }, className: "w-14" },
          { key: "preview", label: "New", render: (ex) => {
            const row = getRow(ex.id)
            if (row.status === "replaced" && row.frames.some((f) => f.preview)) {
              return (
                <div className="flex items-center gap-0.5">
                  {row.frames.filter((f) => f.preview).slice(0, 3).map((f, i) => (
                    <img key={i} src={f.preview} alt={`F${i + 1}`} className="h-6 w-6 rounded object-cover ring-1 ring-green-500/50" />
                  ))}
                </div>
              )
            }
            if (row.status === "replaced" && row.referencePreview) {
              return <img src={row.referencePreview} alt="" className="h-6 w-6 rounded object-cover ring-1 ring-ring" />
            }
            return <span className="text-[10px] text-muted-foreground">—</span>
          }, className: "w-14" },
          { key: "status", label: "Status", render: (e) => {
            const row = getRow(e.id)
            return (
              <div className="flex flex-col items-start gap-1">
                {statusBadge(row.status)}
                {row.error && <span className="text-[9px] text-destructive">{row.error}</span>}
              </div>
            )
          }, className: "w-20" },
          { key: "actions", label: "", render: (e) => {
            const row = getRow(e.id)
            const isReplaced = row.status === "replaced"
            return (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUploadModalExercise(e)}
                  disabled={isReplaced}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                    isReplaced
                      ? "bg-green-500/10 text-green-600 cursor-default"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  {isReplaced ? (
                    <><Check className="h-3 w-3" /> Done</>
                  ) : (
                    <><Upload className="h-3 w-3" /> Upload</>
                  )}
                </button>
              </div>
            )
          }, className: "w-16" },
        ]}
        data={filteredExercises}
        loading={loading}
        emptyMessage={
          tab === "history"
            ? "No completed replacements yet."
            : (search ? "No exercises match your search." : "No exercises found.")
        }
        onView={(e) => setViewTarget(e)}
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

      <UploadFramesModal
        open={!!uploadModalExercise}
        onClose={() => setUploadModalExercise(null)}
        exercise={uploadModalExercise!}
        onPipelineComplete={handlePipelineComplete}
      />

      <GifEngine
        open={gifEngineOpen}
        onClose={() => setGifEngineOpen(false)}
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
