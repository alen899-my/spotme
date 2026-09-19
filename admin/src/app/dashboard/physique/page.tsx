"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import api from "@/lib/api"

interface PhysiqueItem {
  id: number
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  photo_url: string
  overall_score: number
  body_fat_estimate: string
  muscle_symmetry: number
  posture_score: number
  strengths: string[] | string
  improvements: string[] | string
  muscle_groups: Record<string, number> | string
  coach_message: string
  status: string
  created_at: string
}

export default function PhysiqueModerationPage() {
  const [items, setItems] = useState<PhysiqueItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedItem, setSelectedItem] = useState<PhysiqueItem | null>(null)

  const fetchPhysique = async () => {
    setLoading(true)
    try {
      const res = await api.get("/admin/physique", {
        params: {
          page,
          limit: 20,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        },
      })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to fetch physique analyses:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPhysique()
  }, [page, statusFilter])

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/admin/physique/${id}/status`, { status })
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status } : null))
      }
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this physique photo from storage and database?")) return
    try {
      await api.delete(`/admin/physique/${id}`)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (err) {
      console.error("Failed to delete physique item:", err)
    }
  }

  const parseArray = (data: any): string[] => {
    if (Array.isArray(data)) return data
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return [data]
      }
    }
    return []
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Physique Photos & AI Moderation
            </h1>
            <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium font-mono text-muted-foreground">
              {total} Uploads
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit user progress photos, inspect AI scoring accuracy, and moderate content
          </p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          {["ALL", "completed", "flagged"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st)
                setPage(1)
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? "bg-foreground text-background font-semibold"
                  : "border border-border bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Photos */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center text-xs text-muted-foreground">
          Loading physique moderation queue...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center text-xs text-muted-foreground">
          No physique photos found for filter: <span className="font-mono">{statusFilter}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const dateStr = new Date(item.created_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })

            return (
              <div
                key={item.id}
                className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col justify-between hover:border-border/80 transition-all"
              >
                {/* Photo Header with Image */}
                <div className="relative aspect-3/4 w-full bg-secondary overflow-hidden">
                  <img
                    src={item.photo_url}
                    alt="Physique"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                  />
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium border ${
                        item.status === "flagged"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      }`}
                    >
                      {item.status === "flagged" ? "Flagged" : "Approved"}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-mono font-bold text-white">
                      Score: {item.overall_score || 0}
                    </span>
                  </div>
                </div>

                {/* User & AI Stats Summary */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        src={item.profile_pic_url}
                        name={item.full_name}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users/${item.user_id}`}
                          className="text-xs font-semibold text-foreground hover:underline truncate block"
                        >
                          {item.full_name || "User"}
                        </Link>
                        <span className="text-[10px] text-muted-foreground font-mono block truncate">
                          {dateStr} · {item.body_fat_estimate || "Est. BF: —"}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedItem(item)}
                      className="h-7 text-[11px] px-2 gap-1 border-border"
                    >
                      <span>Inspect</span>
                    </Button>
                  </div>

                  {/* Moderation Actions Bar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      {item.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "completed")}
                          className="rounded p-1 text-muted-foreground hover:text-emerald-500 hover:bg-secondary"
                          title="Mark Approved"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {item.status !== "flagged" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, "flagged")}
                          className="rounded p-1 text-muted-foreground hover:text-amber-500 hover:bg-secondary"
                          title="Flag Content"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-muted-foreground hover:text-rose-500 hover:bg-secondary"
                      title="Remove Photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / 20))} ({total} photos)
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* AI Analysis Inspector Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <h2 className="text-sm font-semibold text-foreground">
                  Physique AI Diagnostic Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={selectedItem.photo_url}
                  alt="Physique"
                  className="w-full sm:w-48 aspect-3/4 object-cover rounded-lg border border-border"
                />

                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={selectedItem.profile_pic_url}
                      name={selectedItem.full_name}
                      size="md"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/users/${selectedItem.user_id}`}
                        className="text-sm font-semibold text-foreground hover:underline block truncate"
                      >
                        {selectedItem.full_name || "User"}
                      </Link>
                      <span className="text-muted-foreground font-mono text-[11px] block truncate">
                        {selectedItem.email || `User #${selectedItem.user_id}`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase">Overall Score</span>
                      <div className="text-lg font-bold text-foreground">{selectedItem.overall_score}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase">Body Fat Est.</span>
                      <div className="text-lg font-bold text-foreground">{selectedItem.body_fat_estimate || "—"}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase">Symmetry</span>
                      <div className="text-base font-bold text-foreground">{selectedItem.muscle_symmetry}/100</div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2">
                      <span className="text-[10px] text-muted-foreground uppercase">Posture</span>
                      <div className="text-base font-bold text-foreground">{selectedItem.posture_score}/100</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Identified Strengths:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {parseArray(selectedItem.strengths).map((s, i) => (
                      <span key={i} className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-500 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium block mb-1">Target Improvements:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {parseArray(selectedItem.improvements).map((s, i) => (
                      <span key={i} className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-500 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Coach Message */}
              {selectedItem.coach_message && (
                <div className="rounded-lg border border-border bg-secondary/20 p-3">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">
                    AI Coach Personalized Feedback
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedItem.coach_message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(selectedItem.id)}
                  className="h-8 text-xs text-rose-500 hover:text-rose-600 border-rose-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove Photo
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedItem.id, "flagged")}
                    className="h-8 text-xs text-amber-500 border-amber-500/30"
                  >
                    Flag
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedItem.id, "completed")}
                    className="h-8 text-xs"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
