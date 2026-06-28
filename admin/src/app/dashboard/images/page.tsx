"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Trash2, CheckSquare, Square, ChevronDown, ChevronRight, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import api from "@/lib/api"

interface ImageItem {
  key: string
  url: string
  folder: string
  lastModified: string
  size: number
}

interface FolderData {
  name: string
  displayName: string
  count: number
  images: ImageItem[]
}

interface ImageResponse {
  folders: FolderData[]
  allFolders: { name: string; displayName: string; count: number }[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export default function ImageVaultPage() {
  const [data, setData] = useState<ImageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(60)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/images", { params: { page, limit } })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const allKeys = useMemo(() => {
    if (!data) return []
    return data.folders.flatMap((f) => f.images.map((img) => img.key))
  }, [data])

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleFolder = (folder: string) => {
    setSelected((prev) => {
      const folderKeys = data?.folders.find((f) => f.name === folder)?.images.map((i) => i.key) ?? []
      const allSelected = folderKeys.every((k) => prev.has(k))
      const next = new Set(prev)
      for (const k of folderKeys) {
        if (allSelected) next.delete(k)
        else next.add(k)
      }
      return next
    })
  }

  const toggleCollapse = (folder: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === allKeys.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allKeys))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete("/images", { data: { keys: Array.from(selected) } })
      setSelected(new Set())
      setDeleteOpen(false)
      fetchImages()
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Image Vault</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.pagination.total} images across ${data.allFolders.length} folders` : "Manage uploaded images"}
          </p>
        </div>
        {allKeys.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {selected.size === allKeys.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selected.size === allKeys.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.folders.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-10 w-10" />
          <p>No images uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data!.folders.map((folder) => {
            const folderKeys = folder.images.map((i) => i.key)
            const folderSelected = folderKeys.every((k) => selected.has(k))
            const isCollapsed = collapsed.has(folder.name)

            return (
              <div key={folder.name} className="rounded-lg border">
                <div
                  className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-secondary/50"
                  onClick={() => toggleCollapse(folder.name)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(folder.name) }}
                    className="text-muted-foreground"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <span className="text-sm font-medium">{folder.displayName}</span>
                  <span className="text-xs text-muted-foreground">({folder.count})</span>
                  <div className="ml-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFolder(folder.name) }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {folderSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {folderSelected ? "Deselect" : "Select"}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="grid grid-cols-3 gap-3 border-t p-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {folder.images.map((img) => {
                      const isSelected = selected.has(img.key)
                      return (
                        <div
                          key={img.key}
                          className={`group relative cursor-pointer rounded-md border-2 transition-colors ${
                            isSelected ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => toggleSelect(img.key)}
                        >
                          <div className={`absolute left-1.5 top-1.5 z-10 ${isSelected ? "text-primary" : "text-white opacity-0 group-hover:opacity-100"}`}>
                            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </div>
                          <div className="aspect-square overflow-hidden rounded-md bg-secondary">
                            <img
                              src={img.url}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="px-1 pt-1">
                            <p className="truncate text-[10px] text-muted-foreground">{formatDate(img.lastModified)}</p>
                            <p className="text-[10px] text-muted-foreground">{formatSize(img.size)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <Pagination
            page={page}
            limit={limit}
            total={data!.pagination.total}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border bg-card px-5 py-2.5 shadow-lg">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogContent onClose={() => !deleting && setDeleteOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} image{selected.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selected.size} image{selected.size !== 1 ? "s" : ""} from Cloudflare R2. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selected.size} image${selected.size !== 1 ? "s" : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
