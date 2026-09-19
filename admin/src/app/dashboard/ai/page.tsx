"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Bot,
  MessageSquare,
  Sparkles,
  Zap,
  DollarSign,
  FileText,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  ArrowRight,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Cpu,
  Gauge,
  Sliders,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import api from "@/lib/api"

interface AiModel {
  provider: string
  model: string
  tier: string
  context_tokens_in: number
  max_tokens_out: number
  input_cost_per_m: number
  output_cost_per_m: number
  cached_cost_per_m?: number
  speed_tps: number
  rpm: number
  rpd: number
  status: string
}

interface AiSession {
  id: string
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface AiMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  actions?: Record<string, unknown>
  created_at: string
}

interface WorkoutReport {
  id: number
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  daily_workout_id: number
  summary: string
  good_things: string
  areas_to_improve: string
  recommendations: string
  progress_pct: number
  current_phase: string
  created_at: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AiAnalyticsData {
  metrics: {
    totalSessions: number
    totalMessages: number
    workoutReportsCount: number
    physiqueAssessmentsCount: number
    estimatedTokensIn?: number
    estimatedTokensOut?: number
    totalTokensBurned?: number
    avgPromptTokensIn?: number
    avgCompletionTokensOut?: number
    estimatedTokenCostUsd: number
  }
  models: AiModel[]
  sessions: AiSession[]
  sessionsPagination?: PaginationMeta
  reports: WorkoutReport[]
  reportsPagination?: PaginationMeta
}

export default function AiIntelligencePage() {
  const [data, setData] = useState<AiAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"sessions" | "reports">("sessions")

  // Pagination states
  const [sessionPage, setSessionPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)

  // Thread Inspector Modal State
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionMessages, setSessionMessages] = useState<AiMessage[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [selectedSessionMeta, setSelectedSessionMeta] = useState<AiSession | null>(null)

  // Report Modal State
  const [selectedReport, setSelectedReport] = useState<WorkoutReport | null>(null)

  const fetchAiAnalytics = useCallback(async (sPage = sessionPage, rPage = reportPage) => {
    setLoading(true)
    try {
      const res = await api.get<AiAnalyticsData>("/admin/ai/analytics", {
        params: {
          sessionPage: sPage,
          sessionLimit: 15,
          reportPage: rPage,
          reportLimit: 10,
        },
      })
      setData(res.data)
    } catch (err) {
      console.error("Failed to fetch AI analytics:", err)
    } finally {
      setLoading(false)
    }
  }, [sessionPage, reportPage])

  useEffect(() => {
    fetchAiAnalytics(sessionPage, reportPage)
  }, [fetchAiAnalytics, sessionPage, reportPage])

  const handleOpenThread = async (session: AiSession) => {
    setSelectedSessionMeta(session)
    setSelectedSessionId(session.id)
    setSessionLoading(true)
    try {
      const res = await api.get<{ session: AiSession; messages: AiMessage[] }>(
        `/admin/ai/sessions/${session.id}`
      )
      setSessionMessages(res.data.messages || [])
    } catch (err) {
      console.error("Failed to fetch session messages:", err)
    } finally {
      setSessionLoading(false)
    }
  }

  const formatTokens = (tokens?: number) => {
    if (!tokens) return "0"
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
    return tokens.toLocaleString()
  }

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
          Loading AI intelligence telemetry...
        </div>
      </div>
    )
  }

  const metrics = data?.metrics || {
    totalSessions: 0,
    totalMessages: 0,
    workoutReportsCount: 0,
    physiqueAssessmentsCount: 0,
    estimatedTokensIn: 0,
    estimatedTokensOut: 0,
    totalTokensBurned: 0,
    avgPromptTokensIn: 1420,
    avgCompletionTokensOut: 385,
    estimatedTokenCostUsd: 0,
  }

  const sessionsPagination = data?.sessionsPagination || {
    page: sessionPage,
    limit: 15,
    total: metrics.totalSessions,
    totalPages: Math.max(1, Math.ceil(metrics.totalSessions / 15)),
  }

  const reportsPagination = data?.reportsPagination || {
    page: reportPage,
    limit: 10,
    total: metrics.workoutReportsCount,
    totalPages: Math.max(1, Math.ceil(metrics.workoutReportsCount / 10)),
  }

  return (
    <div className="space-y-6 pb-12 min-w-0 max-w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-secondary text-foreground">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            AI Intelligence & Audit
          </h1>
          <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            LLM Gateway
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Monitor multi-provider LLMs, pricing, context window limits, token usage telemetry, and audit coaching threads.
        </p>
      </div>

      {/* KPI Stat Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">AI Sessions</span>
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            {metrics.totalSessions.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Chat conversations</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Prompts & Replies</span>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            {metrics.totalMessages.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Total interactions</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Tokens In (Est)</span>
            <ArrowDownRight className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-sky-500">
            {formatTokens(metrics.estimatedTokensIn)}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            ~{metrics.avgPromptTokensIn || 1420} tok / prompt
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Tokens Out (Est)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-500">
            {formatTokens(metrics.estimatedTokensOut)}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            ~{metrics.avgCompletionTokensOut || 385} tok / reply
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Est. LLM Spend</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            ${metrics.estimatedTokenCostUsd.toFixed(3)}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatTokens(metrics.totalTokensBurned)} total tokens
          </span>
        </div>
      </div>

      {/* Model Specifications & Pricing Matrix Table */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-foreground">
              Active AI Models, Context Windows & Live Pricing Matrix
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {data?.models.length || 5} Engine Fallbacks
            </span>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-500">
              Gateway Online
            </span>
          </div>
        </div>

        {/* Responsive internal scrolling table wrapper */}
        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[840px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[10px] text-muted-foreground uppercase">
                <th className="py-2.5 px-3 font-medium">Provider & Model</th>
                <th className="py-2.5 px-3 font-medium">Routing Role</th>
                <th className="py-2.5 px-3 font-medium text-center">Context In</th>
                <th className="py-2.5 px-3 font-medium text-center">Max Out</th>
                <th className="py-2.5 px-3 font-medium text-right">Input $/1M</th>
                <th className="py-2.5 px-3 font-medium text-right">Output $/1M</th>
                <th className="py-2.5 px-3 font-medium text-center">Throughput</th>
                <th className="py-2.5 px-3 font-medium text-right">Quota / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data?.models.map((m, idx) => {
                const contextInFormatted =
                  m.context_tokens_in >= 1_000_000
                    ? `${(m.context_tokens_in / 1_000_000).toFixed(0)}M`
                    : `${Math.round(m.context_tokens_in / 1024)}k`

                const maxOutFormatted = `${Math.round(m.max_tokens_out / 1024)}k`

                return (
                  <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-medium text-foreground">{m.model}</div>
                      <span className="text-[10px] text-muted-foreground">{m.provider}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-secondary/80 px-2 py-0.5 text-[10px] text-foreground font-sans">
                        {m.tier}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-bold text-foreground">
                        {contextInFormatted}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-bold text-foreground">
                        {maxOutFormatted}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {m.input_cost_per_m === 0 ? (
                        <span className="text-emerald-500 font-bold">$0.00 (Free)</span>
                      ) : (
                        <span className="text-foreground">${m.input_cost_per_m.toFixed(3)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {m.output_cost_per_m === 0 ? (
                        <span className="text-emerald-500 font-bold">$0.00 (Free)</span>
                      ) : (
                        <span className="text-foreground">${m.output_cost_per_m.toFixed(3)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground">
                      ~{m.speed_tps} t/s
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            m.status.includes("Active")
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                              : "bg-secondary border-border text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              m.status.includes("Active") ? "bg-emerald-500" : "bg-muted-foreground"
                            }`}
                          />
                          {m.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.rpm} RPM · {m.rpd.toLocaleString()} RPD
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "sessions"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Athlete Chat Sessions ({metrics.totalSessions})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "reports"
              ? "bg-secondary text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          AI Workout Reports ({metrics.workoutReportsCount})
        </button>
      </div>

      {/* TAB 1: SESSIONS WITH USER AVATARS & PAGINATION */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {data?.sessions.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground font-mono">
                No AI sessions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {data?.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar
                        src={s.profile_pic_url}
                        name={s.full_name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/users/${s.user_id}`}
                            className="text-xs font-semibold text-foreground hover:underline truncate"
                          >
                            {s.full_name || "Anonymous User"}
                          </Link>
                          <span className="rounded border border-border bg-secondary px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground shrink-0">
                            {s.message_count} messages
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {s.title || "Coach Consultation"}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(s.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenThread(s)}
                      className="h-7 text-xs font-mono shrink-0 self-end sm:self-auto gap-1 border-border"
                    >
                      Inspect Thread
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sessions Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
            <span>
              Page {sessionsPagination.page} of {sessionsPagination.totalPages} ({sessionsPagination.total} total sessions)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                disabled={sessionPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSessionPage((p) => Math.min(sessionsPagination.totalPages, p + 1))}
                disabled={sessionPage >= sessionsPagination.totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKOUT REPORTS WITH USER AVATARS & PAGINATION */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.reports.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-xs text-muted-foreground border border-border rounded-xl bg-card font-mono">
                No workout reports generated yet.
              </div>
            ) : (
              data?.reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-foreground/30 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={report.profile_pic_url}
                        name={report.full_name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users/${report.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-foreground hover:underline block truncate"
                        >
                          {report.full_name || `User #${report.user_id}`}
                        </Link>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          Session #{report.daily_workout_id} · Phase: {report.current_phase || "Hypertrophy"}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-mono font-semibold text-sky-500 shrink-0">
                      {report.progress_pct || 100}% Complete
                    </span>
                  </div>

                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                    {report.summary}
                  </p>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span className="text-foreground hover:underline flex items-center gap-1">
                      View Full Audit <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reports Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
            <span>
              Page {reportsPagination.page} of {reportsPagination.totalPages} ({reportsPagination.total} workout audits)
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                disabled={reportPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReportPage((p) => Math.min(reportsPagination.totalPages, p + 1))}
                disabled={reportPage >= reportsPagination.totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Inspector Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={selectedSessionMeta?.profile_pic_url}
                  name={selectedSessionMeta?.full_name}
                  size="sm"
                />
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {selectedSessionMeta?.title || "AI Session Conversation"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Athlete: {selectedSessionMeta?.full_name} ({selectedSessionMeta?.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body - Conversation Stream */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {sessionLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground font-mono">
                  Loading message thread...
                </div>
              ) : sessionMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground font-mono">
                  No messages found in this session.
                </div>
              ) : (
                sessionMessages.map((m) => {
                  const isUser = m.role === "user"
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-muted-foreground">
                        <span>{isUser ? "Athlete" : "SpotMe AI Coach"}</span>
                        <span>·</span>
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? "bg-secondary text-foreground font-medium"
                            : "border border-border bg-secondary/30 text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedSessionId(null)}
                className="h-8 text-xs font-mono border-border"
              >
                Close Thread
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={selectedReport.profile_pic_url}
                  name={selectedReport.full_name}
                  size="md"
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    AI Workout Audit Report
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedReport.full_name} · Session #{selectedReport.daily_workout_id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider block mb-1">
                  Executive Summary
                </label>
                <div className="p-3 rounded-lg border border-border bg-secondary/20 text-foreground leading-relaxed">
                  {selectedReport.summary}
                </div>
              </div>

              {selectedReport.good_things && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-emerald-500 tracking-wider block mb-1">
                    Strengths & Execution Highlights
                  </label>
                  <div className="p-3 rounded-lg border border-border bg-secondary/20 text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedReport.good_things}
                  </div>
                </div>
              )}

              {selectedReport.areas_to_improve && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-amber-500 tracking-wider block mb-1">
                    Technique & Volume Observations
                  </label>
                  <div className="p-3 rounded-lg border border-border bg-secondary/20 text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedReport.areas_to_improve}
                  </div>
                </div>
              )}

              {selectedReport.recommendations && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-sky-500 tracking-wider block mb-1">
                    Coach Recommendations
                  </label>
                  <div className="p-3 rounded-lg border border-border bg-secondary/20 text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedReport.recommendations}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedReport(null)}
                className="h-8 text-xs font-mono border-border"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
