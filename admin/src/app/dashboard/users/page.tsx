"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import type { User } from "@/types"
import api from "@/lib/api"

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("joinedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit, sortBy, sortOrder }
      if (search) params.search = search
      const res = await api.get("/admin/users", { params })
      setUsers(res.data.users ?? [])
      setTotal(res.data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, sortBy, sortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async (user: User) => {
    try {
      await api.delete(`/admin/users/${user.id}`)
      fetchUsers()
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

  const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
    active: "success",
    suspended: "warning",
    inactive: "destructive",
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage platform users</p>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Name", sortable: true, render: (u) => (
            <div className="flex items-center gap-2.5">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {u.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium">{u.name}</span>
            </div>
          )},
          { key: "email", label: "Email", sortable: true, render: (u) => (
            <span className="text-sm text-muted-foreground">{u.email}</span>
          ), hideOnMobile: true },
          { key: "role", label: "Role", sortable: true, render: (u) => (
            <span className="text-sm capitalize">{u.role}</span>
          ), hideOnMobile: true },
          { key: "status", label: "Status", sortable: true, render: (u) => (
            <Badge variant={statusVariant[u.status] ?? "secondary"}>
              {u.status}
            </Badge>
          ), hideOnMobile: true },
          { key: "plan", label: "Plan", sortable: true, render: (u) => (
            <span className="text-sm">{u.plan ?? "\u2014"}</span>
          ), hideOnMobile: true },
          { key: "joinedAt", label: "Joined", sortable: true, render: (u) => (
            <span className="text-sm text-muted-foreground">
              {new Date(u.joinedAt).toLocaleDateString()}
            </span>
          ), hideOnMobile: true },
        ]}
        data={users}
        loading={loading}
        emptyMessage={search ? "No users match your search." : "No users found."}
        onView={(user) => router.push(`/dashboard/users/${user.id}`)}
        onEdit={(user) => router.push(`/dashboard/users/${user.id}/edit`)}
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
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
    </div>
  )
}
