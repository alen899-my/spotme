"use client"

import React, { useEffect, useState } from "react"
import {
  Bell,
  Send,
  Users,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Campaign {
  id: number
  title: string
  body: string
  data: string | object
  created_at: string
  recipients_count?: number
}

export default function NotificationsBroadcastPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [screen, setScreen] = useState("home")
  const [targetAudience, setTargetAudience] = useState<"all" | "inactive_3d">("all")
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(true)

  const fetchCampaigns = async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get("/admin/notifications/campaigns", {
        params: { page, limit: 20 },
      })
      setCampaigns(res.data.campaigns || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to fetch campaigns:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [page])

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    if (!confirm(`Dispatch this push notification to: ${targetAudience === "all" ? "All Active Users" : "Inactive Users (>3 Days)"}?`)) {
      return
    }

    setIsSending(true)
    setSendResult(null)
    try {
      const res = await api.post("/admin/notifications/broadcast", {
        title,
        body,
        screen,
        targetAudience,
      })
      setSendResult({
        success: true,
        message: res.data.message || `Dispatched to ${res.data.sentCount} devices`,
      })
      setTitle("")
      setBody("")
      fetchCampaigns()
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.response?.data?.message || "Failed to dispatch push notification",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Push Notifications & Broadcasts
            </h1>
            <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium font-mono text-muted-foreground">
              Expo Push Service
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Broadcast push announcements, workout reminders, and targeted re-engagement campaigns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Broadcast Composer Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Send className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Compose Broadcast Campaign
              </h2>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ready for today's workout? 💪"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">
                  Message Body *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Your Push-Pull split is waiting. Log your sets and keep your 5-day streak alive!"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary/40 p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="h-9 w-full rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Active App Devices (Broadcast)</option>
                    <option value="inactive_3d">Inactive Users (&gt; 3 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">
                    Tap Destination Screen
                  </label>
                  <select
                    value={screen}
                    onChange={(e) => setScreen(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="home">Home Dashboard</option>
                    <option value="workout">Workout / Daily Session</option>
                    <option value="meals">Nutrition &amp; Meal Tracker</option>
                    <option value="physique">Physique Progress</option>
                    <option value="calendar">Calendar &amp; Streaks</option>
                  </select>
                </div>
              </div>

              {sendResult && (
                <div
                  className={`rounded-lg border p-3 flex items-center gap-2 text-xs ${
                    sendResult.success
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                  }`}
                >
                  {sendResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{sendResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSending || !title.trim() || !body.trim()}
                  className="h-9 gap-2 text-xs font-medium"
                >
                  <Send className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
                  {isSending ? "Dispatching..." : "Send Broadcast Now"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* 2. Interactive Mobile Lock-Screen Preview */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Smartphone className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Mobile Lock-Screen Preview
              </h2>
            </div>

            <div className="my-6 rounded-2xl border border-border/80 bg-secondary/30 p-4 shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pb-3 border-b border-border/30">
                <span>9:41 AM</span>
                <span>5G · 100%</span>
              </div>

              {/* iOS / Android Style Notification Bubble */}
              <div className="mt-3 rounded-xl border border-border/60 bg-background/90 p-3 shadow-md backdrop-blur-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-md bg-foreground flex items-center justify-center text-[9px] font-bold text-background">
                      S
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">
                      SPOTME
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    now
                  </span>
                </div>

                <div className="pt-1">
                  <h3 className="text-xs font-semibold text-foreground">
                    {title.trim() || "Your Workout Awaits"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {body.trim() || "Consistency is key to results. Open SpotMe and complete today's session."}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono text-center">
              Target destination: <span className="font-semibold text-foreground">/{screen}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Campaign History Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Sent Broadcast History ({total})
          </h2>
        </div>

        {loadingHistory ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Loading broadcast history...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No broadcast notifications sent yet.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {campaigns.map((camp) => {
              const dateStr = new Date(camp.created_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })

              return (
                <div
                  key={camp.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{camp.title}</span>
                      <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        Broadcast
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-1">{camp.body}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dateStr}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / 20))}
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
    </div>
  )
}
