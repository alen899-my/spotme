"use client"

import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/components/data-table"
import { DetailModal, type DetailField } from "@/components/detail-modal"
import { Users, Activity, Calendar, Clock } from "lucide-react"
import api from "@/lib/api"

interface ActiveUser {
  id: string
  name: string
  email: string
  status: string
  last_active_at: string | null
  created_at: string
  total_workouts: number
}

interface DailyStat {
  date: string
  count: number
}

interface ActiveUsersResponse {
  online: number
  activeToday: number
  activeWeek: number
  dailyStats: DailyStat[]
  users: ActiveUser[]
  total: number
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ActiveUsersPage() {
  const [data, setData] = useState<ActiveUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [viewTarget, setViewTarget] = useState<ActiveUser | null>(null)
  const [onlineCount, setOnlineCount] = useState(0)

  const fetchData = useCallback(async (isPoll = false) => {
    if (!isPoll) setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit }
      if (search) params.search = search
      const res = await api.get("/admin/active-users", { params })
      setData(res.data)
      setTotal(res.data.total ?? 0)
      setOnlineCount(res.data.online ?? 0)
    } finally {
      if (!isPoll) setLoading(false)
    }
  }, [page, limit, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch online count only when page/tab is actively viewed
  const refreshOnline = useCallback(() => {
    api.get("/admin/active-users", { params: { page: 1, limit: 1 } }).then((res) => {
      setOnlineCount(res.data.online ?? 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshOnline() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", refreshOnline)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", refreshOnline)
    }
  }, [refreshOnline])

  const handleDelete = async (user: ActiveUser) => {
    try {
      await api.delete(`/admin/users/${user.id}`)
      fetchData()
    } catch {}
  }

  const viewFields: DetailField<ActiveUser>[] = [
    { key: "id", label: "ID", render: (v) => <span>#{v}</span> },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status", render: (v) => (
      <span className="capitalize">{v ?? "\u2014"}</span>
    )},
    { key: "last_active_at", label: "Last Active", render: (v) => (
      <span>{v ? new Date(v).toLocaleString() : "Never"}</span>
    )},
    { key: "total_workouts", label: "Total Workouts" },
    { key: "created_at", label: "Joined", render: (v) => (
      <span>{new Date(v).toLocaleDateString()}</span>
    )},
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Active Users</h1>
          <p className="text-sm text-muted-foreground">Real-time user activity tracking</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Updates when tab is active
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online Now</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.activeToday ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Today</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.activeWeek ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active This Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* User Table */}
        <div className="lg:col-span-3">
          <DataTable
            columns={[
              { key: "id", label: "ID", render: (e) => (
                <span className="text-sm text-muted-foreground">#{e.id}</span>
              )},
              { key: "name", label: "Name", render: (e) => (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                    {e.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.email}</p>
                  </div>
                </div>
              )},
              { key: "last_active_at", label: "Last Active", render: (e) => (
                <div className="flex items-center gap-2">
                  {e.last_active_at && new Date(e.last_active_at).getTime() > Date.now() - 300000 ? (
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  )}
                  <span className="text-sm text-muted-foreground">{relativeTime(e.last_active_at)}</span>
                </div>
              )},
              { key: "status", label: "Status", render: (e) => (
                <span className="text-sm capitalize text-muted-foreground">{e.status}</span>
              ), hideOnMobile: true },
              { key: "total_workouts", label: "Workouts", render: (e) => (
                <span className="text-sm text-muted-foreground">{e.total_workouts}</span>
              ), hideOnMobile: true },
            ]}
            data={data?.users ?? []}
            loading={loading}
            emptyMessage="No users found."
            onView={(e) => setViewTarget(e)}
            onDelete={handleDelete}
            deleteTitle="Delete user"
            deleteDescription="Are you sure you want to delete this user? This action cannot be undone."
            searchValue={search}
            onSearchChange={(val) => { setSearch(val); setPage(1) }}
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1) }}
          />
        </div>

        {/* Daily Usage Sidebar */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Daily Usage (30 days)</span>
            </div>
          </div>
          <div className="max-h-[calc(100vh-22rem)] space-y-0 overflow-y-auto">
            {data?.dailyStats.map((stat) => {
              const maxCount = Math.max(...(data?.dailyStats.map((s) => s.count) ?? [1]), 1)
              const pct = (stat.count / maxCount) * 100
              return (
                <div key={stat.date} className="flex items-center gap-3 px-4 py-1.5 text-sm hover:bg-secondary/50">
                  <span className="w-8 text-right text-xs text-muted-foreground">
                    {new Date(stat.date).getDate()}
                  </span>
                  <div className="flex-1">
                    <div className="h-4 overflow-hidden rounded-sm bg-secondary">
                      <div
                        className="h-full rounded-sm bg-primary/60 transition-all"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                    {stat.count}
                  </span>
                </div>
              )
            })}
            {(!data?.dailyStats || data.dailyStats.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No data yet</p>
            )}
          </div>
        </div>
      </div>

      <DetailModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="User Details"
        data={viewTarget}
        fields={viewFields}
      />
    </div>
  )
}
