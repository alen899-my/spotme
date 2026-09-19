"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Trophy,
  Award,
  Zap,
  TrendingUp,
  Flame,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import api from "@/lib/api"

interface ReasonBreakdown {
  reason: string
  count: number
  total_awarded: number
}

interface TierBreakdown {
  tier: string
  count: number
}

interface LeaderboardUser {
  id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  total_xp: number
  league_tier: string
  current_streak: number
}

interface XpTransaction {
  id: number
  user_id: number
  full_name: string
  email: string
  profile_pic_url: string | null
  amount: number
  reason: string
  created_at: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface GamificationData {
  metrics: {
    totalXpAwarded: number
    todayXpAwarded: number
    transactionsCount: number
  }
  reasons: ReasonBreakdown[]
  tiers: TierBreakdown[]
  leaderboard: LeaderboardUser[]
  recentTransactions: XpTransaction[]
  pagination?: PaginationMeta
}

export default function GamificationPage() {
  const [data, setData] = useState<GamificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchGamificationData = useCallback(async (pageNum = page) => {
    setLoading(true)
    try {
      const res = await api.get<GamificationData>("/admin/gamification/analytics", {
        params: { page: pageNum, limit: 20 },
      })
      setData(res.data)
    } catch (err) {
      console.error("Failed to fetch gamification data:", err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchGamificationData(page)
  }, [fetchGamificationData, page])

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
          Loading gamification economy metrics...
        </div>
      </div>
    )
  }

  const metrics = data?.metrics || {
    totalXpAwarded: 0,
    todayXpAwarded: 0,
    transactionsCount: 0,
  }
  const reasons = data?.reasons || []
  const tiers = data?.tiers || []
  const leaderboard = data?.leaderboard || []
  const recentTransactions = data?.recentTransactions || []
  const pagination = data?.pagination || {
    page,
    limit: 20,
    total: metrics.transactionsCount,
    totalPages: Math.max(1, Math.ceil(metrics.transactionsCount / 20)),
  }

  const totalUsersInTiers = tiers.reduce((acc, t) => acc + Number(t.count), 0) || 1

  return (
    <div className="space-y-6 pb-12 min-w-0 max-w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-secondary text-foreground">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Gamification & XP Economy
          </h1>
          <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Athlete Progression
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Audit global XP velocity, monitor tier distribution, and track real-time gamification transactions with athlete attribution.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Total XP</span>
            <Award className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            {metrics.totalXpAwarded.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">All-time circulation</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Today&apos;s XP</span>
            <Zap className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-sky-500">
            +{metrics.todayXpAwarded.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Earned today</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">XP Events</span>
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            {metrics.transactionsCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Rewarded actions</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase font-mono tracking-wider">Active Tiers</span>
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-foreground">
            {tiers.length}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Rank divisions</span>
        </div>
      </div>

      {/* Row 1: Tiers & Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* League Tier Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-foreground">
                League Tier Distribution
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {totalUsersInTiers} Athletes Ranked
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {tiers.map((t, idx) => {
              const pct = Math.round((t.count / totalUsersInTiers) * 100)
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="capitalize font-medium text-foreground">{t.tier} Tier</span>
                    <span className="text-muted-foreground">
                      {t.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/80 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* XP Award Reasons */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-foreground">
                Top XP Velocity Triggers
              </h2>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              Activity breakdown
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {reasons.map((r, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-secondary/20 text-xs"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-foreground truncate">{r.reason}</div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {r.count} times triggered
                  </span>
                </div>
                <span className="rounded border border-border bg-secondary px-2 py-1 text-xs font-mono font-bold text-amber-500 shrink-0">
                  +{r.total_awarded.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Global Leaderboard with User Avatars */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 min-w-0 max-w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-semibold text-foreground">
              Global Athlete Leaderboard (Top 10)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            Ranked by Total XP
          </span>
        </div>

        {/* Horizontal scroll wrapper */}
        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[10px] font-mono text-muted-foreground uppercase">
                <th className="py-2.5 px-3 font-medium w-12 text-center">Rank</th>
                <th className="py-2.5 px-3 font-medium">Athlete</th>
                <th className="py-2.5 px-3 font-medium">League Tier</th>
                <th className="py-2.5 px-3 font-medium text-center">Streak</th>
                <th className="py-2.5 px-3 font-medium text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {leaderboard.map((user, idx) => (
                <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        src={user.profile_pic_url}
                        name={user.full_name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          className="font-sans font-semibold text-foreground hover:underline truncate block"
                        >
                          {user.full_name || "Anonymous Athlete"}
                        </Link>
                        <span className="text-[11px] text-muted-foreground truncate block font-sans">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] capitalize text-foreground font-medium">
                      {user.league_tier}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-bold">
                      <Flame className="h-3 w-3" />
                      {user.current_streak}d
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">
                    {user.total_xp.toLocaleString()} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Live XP Transactions Stream with User Avatars & Pagination */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 min-w-0 max-w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-foreground">
              XP Transactions Ledger ({pagination.total})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            Audit log
          </span>
        </div>

        {/* Horizontal scroll wrapper */}
        <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[10px] text-muted-foreground uppercase">
                <th className="py-2.5 px-3 font-medium">Athlete</th>
                <th className="py-2.5 px-3 font-medium">Reward Reason</th>
                <th className="py-2.5 px-3 font-medium text-right">XP Amount</th>
                <th className="py-2.5 px-3 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        src={tx.profile_pic_url}
                        name={tx.full_name}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/users/${tx.user_id}`}
                          className="font-sans font-medium text-foreground hover:underline block truncate"
                        >
                          {tx.full_name || `User #${tx.user_id}`}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block truncate font-sans">
                          {tx.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground font-sans">
                    {tx.reason}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-500">
                    +{tx.amount} XP
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transactions Pagination Controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} transactions)
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
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
